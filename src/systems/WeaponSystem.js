import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';
import { clamp } from '../utils/MathUtils.js';
import { Bullet } from '../entities/Bullet.js';
import { Missile } from '../entities/Missile.js';
import { Flare } from '../entities/Flare.js';

/**
 * 武器系统
 * 管理机枪射击、导弹发射、干扰弹释放
 */
export class WeaponSystem {
  constructor(player, keyboard, scene, touchInput) {
    this.player = player;
    this.keyboard = keyboard;
    this.scene = scene;
    this.touchInput = touchInput;
    this.aiSystem = null; // 由 main.js 设置，用于自动锁定敌机

    // 子弹池
    this.bullets = [];
    // 导弹池
    this.missiles = [];
    // 干扰弹池
    this.flares = [];

    // 机枪射击节流
    this._gunTimer = 0;
    this._gunInterval = 1 / CONFIG.weapons.gun.fireRate;

    // 导弹锁定状态
    this.lockTarget = null;
    this.lockProgress = 0; // 0-1
    this.isLocked = false;

    // 音频回调
    this.onGunFire = null;
    this.onMissileLaunch = null;
    this.onFlareRelease = null;
    this.onMissileLockFail = null;

    // 预分配复用向量，避免 _fireGun 中的 clone
    this._tmpForward = new THREE.Vector3();
    this._tmpSpawnPos = new THREE.Vector3();
    this._tmpDir = new THREE.Vector3();
    this._tmpUp = new THREE.Vector3();
    this._tmpScatterDir = new THREE.Vector3();
    this._tmpBackward = new THREE.Vector3();

    // 锁定检测复用向量
    this._tmpToEnemy = new THREE.Vector3();

    // 缓存列表（避免每帧 filter）
    this._cachedPlayerBullets = [];
    this._cachedPlayerBulletsDirty = true;
    this._cachedPlayerMissiles = [];
    this._cachedPlayerMissilesDirty = true;
  }

  /**
   * 每帧更新
   */
  update(dt) {
    const p = this.player;
    const kb = this.keyboard;
    const gc = CONFIG.weapons.gun;

    // === 机枪冷却 ===
    if (p.isOverheated) {
      p.overheatTimer -= dt;
      if (p.overheatTimer <= 0) {
        p.isOverheated = false;
        p.heat = 50; // 过热恢复后热度降到 50%
      }
    } else {
      // 自然冷却（冷却强化 buff 时速率 ×3）
      const coolRate = p._buffCooldown ? gc.cooldownRate * 3 : gc.cooldownRate;
      p.heat = clamp(p.heat - coolRate * dt, 0, 100);
    }

    // === 机枪射击（键盘 Space 或触摸射击按钮） ===
    this._gunTimer -= dt;
    const wantFire = kb.isPressed('Space') || (this.touchInput && this.touchInput.isFiring);
    if (wantFire && !p.isOverheated && this._gunTimer <= 0) {
      this._fireGun();
      this._gunTimer = this._gunInterval;
    }

    // === 更新自动锁定 ===
    this._updateAutoLock(dt);

    // === 导弹发射（必须先锁定目标） ===
    if (kb.isJustPressed('KeyE')) {
      if (p.missiles <= 0) {
        // 没导弹了，不做任何操作
      } else if (!this.isLocked || !this.lockTarget) {
        // 未锁定目标，触发失败提示
        if (this.onMissileLockFail) this.onMissileLockFail();
      } else {
        // 已锁定，发射导弹
        this._fireMissile();
      }
    }

    // === 干扰弹 ===
    if (kb.isJustPressed('KeyQ') && p.flares > 0) {
      this._releaseFlare();
    }

    // === 更新所有弹药 ===
    this._updateProjectiles(dt);
  }

  /**
   * 自动锁定最近敌机（现代导弹火控雷达模拟）
   */
  _updateAutoLock(dt) {
    if (!this.aiSystem) return;

    const mc = CONFIG.weapons.missile;
    const playerPos = this.player.mesh.position;
    const playerForward = this.player.getForward();
    const enemies = this.aiSystem.getAliveEnemies();

    let bestTarget = null;
    let bestScore = -1;

    for (const enemy of enemies) {
      const toEnemy = this._tmpToEnemy.subVectors(enemy.mesh.position, playerPos);
      const dist = toEnemy.length();

      // 距离过远跳过
      if (dist > mc.lockRange) continue;

      // 计算与玩家前方的角度
      toEnemy.normalize();
      const angle = Math.acos(clamp(playerForward.dot(toEnemy), -1, 1));

      // 锁定角度范围内
      if (angle > mc.lockAngle) continue;

      // 评分：距离越近 + 角度越小 = 分数越高
      const distScore = 1 - (dist / mc.lockRange);
      const angleScore = 1 - (angle / mc.lockAngle);
      const score = distScore * 0.3 + angleScore * 0.7;

      if (score > bestScore) {
        bestScore = score;
        bestTarget = enemy;
      }
    }

    // 更新锁定状态
    if (bestTarget) {
      if (this.lockTarget === bestTarget) {
        // 继续锁定同一目标
        this.lockProgress = Math.min(this.lockProgress + dt / mc.lockTime, 1);
      } else {
        // 切换目标，重置进度
        this.lockTarget = bestTarget;
        this.lockProgress = 0;
      }
      this.isLocked = this.lockProgress >= 1;
    } else {
      this.lockTarget = null;
      this.lockProgress = 0;
      this.isLocked = false;
    }
  }

  /**
   * 发射机枪
   */
  _fireGun() {
    const p = this.player;
    const gc = CONFIG.weapons.gun;

    // 不过热 buff：跳过热度累积
    if (!p._buffNoOverheat) {
      p.heat = clamp(p.heat + gc.heatPerShot, 0, 100);
      if (p.heat >= 100) {
        p.isOverheated = true;
        p.overheatTimer = gc.overheatLockTime;
        return;
      }
    }

    // 计算发射位置（复用向量）
    this._tmpForward.set(0, 0, 1).applyQuaternion(p.mesh.quaternion);
    this._tmpSpawnPos.copy(p.mesh.position).addScaledVector(this._tmpForward, 10);

    // 添加轻微随机散布
    const spread = 0.02;
    this._tmpDir.copy(this._tmpForward);
    this._tmpDir.x += (Math.random() - 0.5) * spread;
    this._tmpDir.y += (Math.random() - 0.5) * spread;
    this._tmpDir.z += (Math.random() - 0.5) * spread;
    this._tmpDir.normalize();

    const bullet = new Bullet(this._tmpSpawnPos.clone(), this._tmpDir.clone(), 'player');
    if (p._buffDoubleDamage) bullet.damage *= 2;
    this.bullets.push(bullet);
    this.scene.add(bullet.mesh);
    this._cachedPlayerBulletsDirty = true;

    // 散射子弹 buff
    if (p._buffScatterShot) {
      this._tmpUp.set(0, 1, 0).applyQuaternion(p.mesh.quaternion);
      for (const angle of [-0.087, 0.087]) {
        this._tmpScatterDir.copy(this._tmpDir);
        this._tmpScatterDir.applyAxisAngle(this._tmpUp, angle);
        const extraBullet = new Bullet(this._tmpSpawnPos.clone(), this._tmpScatterDir.clone(), 'player');
        if (p._buffDoubleDamage) extraBullet.damage *= 2;
        this.bullets.push(extraBullet);
        this.scene.add(extraBullet.mesh);
      }
    }

    if (this.onGunFire) this.onGunFire();
  }

  /**
   * 发射导弹 — 必须先锁定目标
   */
  _fireMissile() {
    const p = this.player;
    p.missiles--;

    this._tmpForward.set(0, 0, 1).applyQuaternion(p.mesh.quaternion);
    this._tmpSpawnPos.copy(p.mesh.position).addScaledVector(this._tmpForward, 8);

    const target = this.lockTarget;
    const missile = new Missile(this._tmpSpawnPos.clone(), this._tmpForward.clone(), target, 'player');
    this.missiles.push(missile);
    this.scene.add(missile.mesh);
    this._cachedPlayerMissilesDirty = true;

    this.lockTarget = null;
    this.lockProgress = 0;
    this.isLocked = false;

    if (this.onMissileLaunch) this.onMissileLaunch();
  }

  /**
   * 释放干扰弹
   */
  _releaseFlare() {
    const p = this.player;
    p.flares--;

    this._tmpBackward.set(0, 0, 1).applyQuaternion(p.mesh.quaternion).multiplyScalar(-5);
    this._tmpSpawnPos.copy(p.mesh.position).add(this._tmpBackward);

    const flare = new Flare(this._tmpSpawnPos.clone());
    this.flares.push(flare);
    this.scene.add(flare.mesh);

    this._divertNearbyMissiles(flare);
    if (this.onFlareRelease) this.onFlareRelease();
  }

  /**
   * 干扰弹吸引附近的敌方导弹
   */
  _divertNearbyMissiles(flare) {
    for (const missile of this.missiles) {
      if (missile.isDestroyed || missile.owner === 'player') continue;
      const dist = missile.mesh.position.distanceTo(flare.mesh.position);
      if (dist < flare.attractRadius) {
        missile.divertToFlare(flare.mesh.position);
      }
    }
  }

  /**
   * 更新所有弹药实体
   */
  _updateProjectiles(dt) {
    // 更新子弹
    let bulletChanged = false;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(dt);
      if (b.isDestroyed) {
        this.scene.remove(b.mesh);
        this.bullets.splice(i, 1);
        bulletChanged = true;
      }
    }
    if (bulletChanged) this._cachedPlayerBulletsDirty = true;

    // 更新导弹
    let missileChanged = false;
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.update(dt);
      if (m.isDestroyed) {
        this.scene.remove(m.mesh);
        this.missiles.splice(i, 1);
        missileChanged = true;
      }
    }
    if (missileChanged) this._cachedPlayerMissilesDirty = true;

    // 更新干扰弹
    for (let i = this.flares.length - 1; i >= 0; i--) {
      const f = this.flares[i];
      f.update(dt);
      if (f.isDestroyed) {
        this.scene.remove(f.mesh);
        this.flares.splice(i, 1);
      }
    }
  }

  /**
   * 获取所有活跃的玩家子弹（供碰撞检测用）
   */
  getPlayerBullets() {
    if (this._cachedPlayerBulletsDirty) {
      this._cachedPlayerBullets = [];
      for (const b of this.bullets) {
        if (b.owner === 'player' && !b.isDestroyed) this._cachedPlayerBullets.push(b);
      }
      this._cachedPlayerBulletsDirty = false;
    }
    return this._cachedPlayerBullets;
  }

  /**
   * 获取所有活跃的玩家导弹（缓存版本）
   */
  getPlayerMissiles() {
    if (this._cachedPlayerMissilesDirty) {
      this._cachedPlayerMissiles = [];
      for (const m of this.missiles) {
        if (m.owner === 'player' && !m.isDestroyed) this._cachedPlayerMissiles.push(m);
      }
      this._cachedPlayerMissilesDirty = false;
    }
    return this._cachedPlayerMissiles;
  }
}
