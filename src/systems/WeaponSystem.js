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
  constructor(player, keyboard, scene) {
    this.player = player;
    this.keyboard = keyboard;
    this.scene = scene;

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

    // 音频回调（后续 Task 实现）
    this.onGunFire = null;
    this.onMissileLaunch = null;
    this.onFlareRelease = null;
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
      // 自然冷却
      p.heat = clamp(p.heat - gc.cooldownRate * dt, 0, 100);
    }

    // === 机枪射击 ===
    this._gunTimer -= dt;
    if (kb.isPressed('Space') && !p.isOverheated && this._gunTimer <= 0) {
      this._fireGun();
      this._gunTimer = this._gunInterval;
    }

    // === 导弹发射 ===
    if (kb.isJustPressed('KeyE') && p.missiles > 0) {
      this._fireMissile();
    }

    // === 干扰弹 ===
    if (kb.isJustPressed('KeyQ') && p.flares > 0) {
      this._releaseFlare();
    }

    // === 更新所有弹药 ===
    this._updateProjectiles(dt);
  }

  /**
   * 发射机枪
   */
  _fireGun() {
    const p = this.player;
    const gc = CONFIG.weapons.gun;

    // 增加热度
    p.heat = clamp(p.heat + gc.heatPerShot, 0, 100);

    // 过热检测
    if (p.heat >= 100) {
      p.isOverheated = true;
      p.overheatTimer = gc.overheatLockTime;
      return;
    }

    // 计算发射位置（机头前方）
    const forward = p.getForward();
    const spawnPos = p.mesh.position.clone().add(forward.clone().multiplyScalar(10));

    // 添加轻微随机散布
    const spread = 0.02;
    const dir = forward.clone();
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread;
    dir.z += (Math.random() - 0.5) * spread;
    dir.normalize();

    const bullet = new Bullet(spawnPos, dir, 'player');
    this.bullets.push(bullet);
    this.scene.add(bullet.mesh);

    // 音频回调
    if (this.onGunFire) this.onGunFire();
  }

  /**
   * 发射导弹
   */
  _fireMissile() {
    const p = this.player;
    p.missiles--;

    const forward = p.getForward();
    const spawnPos = p.mesh.position.clone().add(forward.clone().multiplyScalar(8));

    // 导弹指向当前锁定目标（如果有的话）
    const missile = new Missile(spawnPos, forward, this.lockTarget, 'player');
    this.missiles.push(missile);
    this.scene.add(missile.mesh);

    // 音频回调
    if (this.onMissileLaunch) this.onMissileLaunch();
  }

  /**
   * 释放干扰弹
   */
  _releaseFlare() {
    const p = this.player;
    p.flares--;

    // 从飞机后方释放
    const backward = p.getForward().multiplyScalar(-5);
    const spawnPos = p.mesh.position.clone().add(backward);

    const flare = new Flare(spawnPos);
    this.flares.push(flare);
    this.scene.add(flare.mesh);

    // 吸引附近的敌方导弹
    this._divertNearbyMissiles(flare);

    // 音频回调
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
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(dt);
      if (b.isDestroyed) {
        this.scene.remove(b.mesh);
        this.bullets.splice(i, 1);
      }
    }

    // 更新导弹
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      m.update(dt);
      if (m.isDestroyed) {
        this.scene.remove(m.mesh);
        this.missiles.splice(i, 1);
      }
    }

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
    return this.bullets.filter(b => b.owner === 'player' && !b.isDestroyed);
  }

  /**
   * 获取所有活跃的玩家导弹（供碰撞检测用）
   */
  getPlayerMissiles() {
    return this.missiles.filter(m => m.owner === 'player' && !m.isDestroyed);
  }
}
