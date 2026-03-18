import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';
import { clamp, lerp, randFloat } from '../utils/MathUtils.js';
import { EnemyJet } from '../entities/EnemyJet.js';
import { Bullet } from '../entities/Bullet.js';

/**
 * AI 行为系统
 * 管理所有 AI 敌机的行为状态和射击
 */
export class AISystem {
  constructor(scene, player, weaponSystem) {
    this.scene = scene;
    this.player = player;
    this.weaponSystem = weaponSystem;
    this.enemies = [];
    this._enemyBullets = [];
  }

  /**
   * 生成一批敌机
   */
  spawnWave(count = CONFIG.enemy.spawnCount) {
    const spawnRadius = CONFIG.enemy.spawnRadius;
    const pPos = this.player.mesh.position;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = randFloat(spawnRadius * 0.5, spawnRadius);
      const pos = new THREE.Vector3(
        pPos.x + Math.cos(angle) * dist,
        randFloat(200, 500),
        pPos.z + Math.sin(angle) * dist
      );

      const enemy = new EnemyJet(pos);
      this.enemies.push(enemy);
      this.scene.add(enemy.mesh);
    }

    return count;
  }

  /**
   * 每帧更新所有敌机
   */
  update(dt) {
    const player = this.player;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.isDestroyed) {
        this.scene.remove(enemy.mesh);
        this.enemies.splice(i, 1);
        continue;
      }

      // 计算到玩家的距离
      const toPlayer = new THREE.Vector3();
      toPlayer.subVectors(player.mesh.position, enemy.mesh.position);
      const distToPlayer = toPlayer.length();

      // 状态转换逻辑
      this._updateState(enemy, distToPlayer, dt);

      // 执行当前状态行为
      switch (enemy.state) {
        case 'patrol':
          this._doPatrol(enemy, dt);
          break;
        case 'chase':
          this._doChase(enemy, player, dt);
          break;
        case 'attack':
          this._doAttack(enemy, player, distToPlayer, dt);
          break;
        case 'evade':
          this._doEvade(enemy, player, dt);
          break;
      }
    }

    // 更新敌机子弹
    this._updateEnemyBullets(dt);
  }

  /**
   * AI 状态转换
   */
  _updateState(enemy, distToPlayer, dt) {
    enemy._stateTimer += dt;
    const ec = CONFIG.enemy;

    switch (enemy.state) {
      case 'patrol':
        if (distToPlayer < ec.detectionRange) {
          enemy.state = 'chase';
          enemy._stateTimer = 0;
        }
        break;
      case 'chase':
        if (distToPlayer < ec.attackRange) {
          enemy.state = 'attack';
          enemy._stateTimer = 0;
        } else if (distToPlayer > ec.detectionRange * 1.5) {
          enemy.state = 'patrol';
          enemy._stateTimer = 0;
        }
        break;
      case 'attack':
        if (distToPlayer > ec.attackRange * 1.3) {
          enemy.state = 'chase';
          enemy._stateTimer = 0;
        }
        // 如果被打到血量低，切换到回避
        if (enemy.health < ec.maxHealth * 0.3) {
          enemy.state = 'evade';
          enemy._stateTimer = 0;
        }
        break;
      case 'evade':
        // 回避 3 秒后恢复追击
        if (enemy._stateTimer > 3.0) {
          enemy.state = 'chase';
          enemy._stateTimer = 0;
        }
        break;
    }
  }

  /**
   * 巡逻行为 — 沿路径点飞行
   */
  _doPatrol(enemy, dt) {
    const wp = enemy._waypoints[enemy._waypointIndex];
    this._flyTowards(enemy, wp, dt, enemy.speed);

    // 到达路径点附近时切换到下一个
    const dist = enemy.mesh.position.distanceTo(wp);
    if (dist < 30) {
      enemy._waypointIndex = (enemy._waypointIndex + 1) % enemy._waypoints.length;
    }
  }

  /**
   * 追击行为 — 朝玩家飞行
   */
  _doChase(enemy, player, dt) {
    this._flyTowards(enemy, player.mesh.position, dt, enemy.speed * 1.2);
  }

  /**
   * 攻击行为 — 保持瞄准并射击
   */
  _doAttack(enemy, player, distToPlayer, dt) {
    // 朝玩家飞但保持一定距离
    const targetPos = player.mesh.position.clone();
    this._flyTowards(enemy, targetPos, dt, enemy.speed * 0.8);

    // 射击
    enemy._fireTimer -= dt;
    if (enemy._fireTimer <= 0) {
      this._enemyFire(enemy, player);
      enemy._fireTimer = 1 / CONFIG.enemy.fireRate;
    }
  }

  /**
   * 回避行为 — 远离玩家
   */
  _doEvade(enemy, player, dt) {
    // 飞向远离玩家的方向
    const away = new THREE.Vector3();
    away.subVectors(enemy.mesh.position, player.mesh.position).normalize();
    const evadeTarget = enemy.mesh.position.clone().add(away.multiplyScalar(200));
    evadeTarget.y = clamp(evadeTarget.y + randFloat(-50, 100), 100, 600);

    this._flyTowards(enemy, evadeTarget, dt, enemy.speed * 1.3);
  }

  /**
   * 通用飞向目标逻辑
   */
  _flyTowards(enemy, target, dt, speed) {
    const dir = new THREE.Vector3();
    dir.subVectors(target, enemy.mesh.position).normalize();

    // 平滑转向
    const currentForward = enemy.getForward();
    currentForward.lerp(dir, 2.0 * dt);
    currentForward.normalize();

    // 朝向目标
    const lookTarget = enemy.mesh.position.clone().add(currentForward);
    enemy.mesh.lookAt(lookTarget);

    // 移动
    enemy.mesh.position.add(currentForward.multiplyScalar(speed * dt));

    // 限制最低高度
    if (enemy.mesh.position.y < 20) {
      enemy.mesh.position.y = 20;
    }
  }

  /**
   * 敌机射击
   */
  _enemyFire(enemy, player) {
    const forward = enemy.getForward();
    const spawnPos = enemy.mesh.position.clone().add(forward.clone().multiplyScalar(6));

    // 给子弹一点偏移（AI 不完全精确）
    const toPlayer = new THREE.Vector3();
    toPlayer.subVectors(player.mesh.position, spawnPos).normalize();

    // 混合前方和指向玩家的方向（模拟瞄准误差）
    const dir = forward.clone().lerp(toPlayer, 0.6); // 降低瞄准精度
    const spread = CONFIG.enemy.accuracy || 0.08;
    dir.x += (Math.random() - 0.5) * spread;
    dir.y += (Math.random() - 0.5) * spread;
    dir.z += (Math.random() - 0.5) * spread;
    dir.normalize();

    const bullet = new Bullet(spawnPos, dir, 'enemy');
    this._enemyBullets.push(bullet);
    this.scene.add(bullet.mesh);
  }

  /**
   * 更新敌机子弹
   */
  _updateEnemyBullets(dt) {
    for (let i = this._enemyBullets.length - 1; i >= 0; i--) {
      const b = this._enemyBullets[i];
      b.update(dt);
      if (b.isDestroyed) {
        this.scene.remove(b.mesh);
        this._enemyBullets.splice(i, 1);
      }
    }
  }

  /**
   * 获取所有敌机子弹（供碰撞检测用）
   */
  getEnemyBullets() {
    return this._enemyBullets.filter(b => !b.isDestroyed);
  }

  /**
   * 获取存活敌机列表
   */
  getAliveEnemies() {
    return this.enemies.filter(e => !e.isDestroyed);
  }
}
