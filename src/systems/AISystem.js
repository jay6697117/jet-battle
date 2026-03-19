import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';
import { clamp, lerp, randFloat } from '../utils/MathUtils.js';
import { EnemyJet } from '../entities/EnemyJet.js';
import { Bullet } from '../entities/Bullet.js';

/**
 * AI 行为系统
 * 管理所有 AI 敌机的行为状态和射击
 * 支持敌机之间互相攻击（混战模式）
 */
export class AISystem {
  constructor(scene, player, weaponSystem, terrain) {
    this.scene = scene;
    this.player = player;
    this.weaponSystem = weaponSystem;
    this.terrain = terrain;
    this.enemies = [];
    this._enemyBullets = [];

    // 边界回收距离
    this._maxDistFromPlayer = 1500;
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

      // 边界回收：飞太远就拉回来
      this._boundaryCheck(enemy);

      // 找到最近的目标（玩家或其他敌机）
      const target = this._findNearestTarget(enemy);
      if (!target) {
        // 没有目标就巡逻
        this._doPatrol(enemy, dt);
        continue;
      }

      const toTarget = new THREE.Vector3();
      toTarget.subVectors(target.mesh.position, enemy.mesh.position);
      const distToTarget = toTarget.length();

      // 状态转换逻辑
      this._updateState(enemy, distToTarget, dt);

      // 执行当前状态行为
      switch (enemy.state) {
        case 'patrol':
          this._doPatrol(enemy, dt);
          break;
        case 'chase':
          this._doChase(enemy, target, dt);
          break;
        case 'attack':
          this._doAttack(enemy, target, distToTarget, dt);
          break;
        case 'evade':
          this._doEvade(enemy, target, dt);
          break;
      }
    }

    // 更新敌机子弹
    this._updateEnemyBullets(dt);
  }

  /**
   * 边界检查 — 飞太远自动重置巡逻路径回到玩家附近
   */
  _boundaryCheck(enemy) {
    const dist = enemy.mesh.position.distanceTo(this.player.mesh.position);
    if (dist > this._maxDistFromPlayer) {
      // 重设巡逻路径到玩家附近
      const pPos = this.player.mesh.position;
      const angle = Math.random() * Math.PI * 2;
      const newCenter = new THREE.Vector3(
        pPos.x + Math.cos(angle) * 200,
        randFloat(200, 500),
        pPos.z + Math.sin(angle) * 200
      );
      enemy.recenterWaypoints(newCenter);
      enemy.state = 'patrol';
      enemy._stateTimer = 0;
    }
  }

  /**
   * 找到最近的攻击目标（玩家或其他敌机）
   */
  _findNearestTarget(enemy) {
    let nearest = null;
    let nearestDist = Infinity;

    // 检查玩家
    if (!this.player.isDestroyed) {
      const distToPlayer = enemy.mesh.position.distanceTo(this.player.mesh.position);
      if (distToPlayer < nearestDist) {
        nearestDist = distToPlayer;
        nearest = this.player;
      }
    }

    // 检查其他敌机
    for (const other of this.enemies) {
      if (other === enemy || other.isDestroyed) continue;
      const dist = enemy.mesh.position.distanceTo(other.mesh.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = other;
      }
    }

    return nearest;
  }

  /**
   * AI 状态转换
   */
  _updateState(enemy, distToTarget, dt) {
    enemy._stateTimer += dt;
    const ec = CONFIG.enemy;

    switch (enemy.state) {
      case 'patrol':
        if (distToTarget < ec.detectionRange) {
          enemy.state = 'chase';
          enemy._stateTimer = 0;
        }
        break;
      case 'chase':
        if (distToTarget < ec.attackRange) {
          enemy.state = 'attack';
          enemy._stateTimer = 0;
        } else if (distToTarget > ec.detectionRange * 1.5) {
          enemy.state = 'patrol';
          enemy._stateTimer = 0;
        }
        break;
      case 'attack':
        if (distToTarget > ec.attackRange * 1.3) {
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
   * 追击行为 — 朝目标飞行
   */
  _doChase(enemy, target, dt) {
    this._flyTowards(enemy, target.mesh.position, dt, enemy.speed * 1.2);
  }

  /**
   * 攻击行为 — 保持瞄准并射击
   */
  _doAttack(enemy, target, distToTarget, dt) {
    // 朝目标飞但保持一定距离
    const targetPos = target.mesh.position.clone();
    this._flyTowards(enemy, targetPos, dt, enemy.speed * 0.8);

    // 射击
    enemy._fireTimer -= dt;
    if (enemy._fireTimer <= 0) {
      this._enemyFireAtTarget(enemy, target);
      enemy._fireTimer = 1 / CONFIG.enemy.fireRate;
      // 时间减速 buff 时射速减半
      if (this.player._buffTimeSlow) {
        enemy._fireTimer *= 2;
      }
    }
  }

  /**
   * 回避行为 — 远离目标
   */
  _doEvade(enemy, target, dt) {
    // 飞向远离目标的方向
    const away = new THREE.Vector3();
    away.subVectors(enemy.mesh.position, target.mesh.position).normalize();
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

    // 移动（时间减速 buff 时速度减半）
    let actualSpeed = speed;
    if (this.player._buffTimeSlow) {
      actualSpeed *= 0.5;
    }
    enemy.mesh.position.add(currentForward.multiplyScalar(actualSpeed * dt));

    // 获取地表精确高度
    let groundHeight = 10;
    if (this.terrain) {
      groundHeight = Math.max(10, this.terrain.getSurfaceHeight(enemy.mesh.position.x, enemy.mesh.position.z));
    }

    // 地面/山体碰撞坠毁
    if (enemy.mesh.position.y < groundHeight + 2 && !enemy.isDestroyed) {
      enemy.mesh.position.y = groundHeight;
      enemy.takeDamage(9999); // 直接击杀
      if (this.onEnemyGroundCrash) {
        this.onEnemyGroundCrash(enemy.mesh.position.clone());
      }
    }
  }

  /**
   * 敌机射击 — 通用版，可以朝任何目标射击
   */
  _enemyFireAtTarget(enemy, target) {
    const forward = enemy.getForward();
    const spawnPos = enemy.mesh.position.clone().add(forward.clone().multiplyScalar(6));

    // 给子弹一点偏移（AI 不完全精确）
    const toTarget = new THREE.Vector3();
    toTarget.subVectors(target.mesh.position, spawnPos).normalize();

    // 混合前方和指向目标的方向（模拟瞄准误差）
    const dir = forward.clone().lerp(toTarget, 0.6); // 降低瞄准精度
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
