import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';
import { clamp, lerp, randFloat } from '../utils/MathUtils.js';
import { EnemyJet } from '../entities/EnemyJet.js';
import { Bullet } from '../entities/Bullet.js';

/**
 * AI 行为系统
 * 管理所有 AI 敌机的行为状态和射击
 * 支持敌机之间互相攻击（混战模式）
 *
 * 性能优化：预分配临时向量、缓存列表避免每帧 filter
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

    // 预分配复用向量，避免每帧 new
    this._tmpVec = new THREE.Vector3();
    this._tmpDir = new THREE.Vector3();
    this._tmpToTarget = new THREE.Vector3();
    this._tmpAway = new THREE.Vector3();
    this._tmpEvadeTarget = new THREE.Vector3();
    this._tmpLookTarget = new THREE.Vector3();
    this._tmpForward = new THREE.Vector3();
    this._tmpSpawnPos = new THREE.Vector3();
    this._tmpBulletDir = new THREE.Vector3();
    this._tmpToTargetNorm = new THREE.Vector3();

    // 射击用的位置/方向向量（Bullet 构造函数会直接存引用，所以需要每次 copy 到专用向量）
    this._tmpFirePos = new THREE.Vector3();
    this._tmpFireDir = new THREE.Vector3();
    // 坠毁回调复用向量
    this._tmpCrashPos = new THREE.Vector3();

    // 缓存的存活敌机列表（避免每帧 filter）
    this._cachedAliveEnemies = [];
    this._cachedAliveEnemiesDirty = true;

    // 缓存的存活子弹列表
    this._cachedAliveBullets = [];
    this._cachedAliveBulletsDirty = true;
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

    this._cachedAliveEnemiesDirty = true;
    return count;
  }

  /**
   * 每帧更新所有敌机
   */
  update(dt) {
    const player = this.player;
    let listChanged = false;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.isDestroyed) {
        this.scene.remove(enemy.mesh);
        this.enemies.splice(i, 1);
        listChanged = true;
        continue;
      }

      // 边界回收：飞太远就拉回来
      this._boundaryCheck(enemy);

      // 找到最近的目标（玩家或其他敌机）
      const target = this._findNearestTarget(enemy);
      if (!target) {
        this._doPatrol(enemy, dt);
        continue;
      }

      this._tmpToTarget.subVectors(target.mesh.position, enemy.mesh.position);
      const distToTarget = this._tmpToTarget.length();

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

    if (listChanged) {
      this._cachedAliveEnemiesDirty = true;
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
      const pPos = this.player.mesh.position;
      const angle = Math.random() * Math.PI * 2;
      const newCenter = this._tmpVec.set(
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
    let nearestDistSq = Infinity;

    // 检查玩家（使用 distanceToSquared 避免 sqrt）
    if (!this.player.isDestroyed) {
      const distSq = enemy.mesh.position.distanceToSquared(this.player.mesh.position);
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearest = this.player;
      }
    }

    // 检查其他敌机
    for (const other of this.enemies) {
      if (other === enemy || other.isDestroyed) continue;
      const distSq = enemy.mesh.position.distanceToSquared(other.mesh.position);
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
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
        if (enemy.health < ec.maxHealth * 0.3) {
          enemy.state = 'evade';
          enemy._stateTimer = 0;
        }
        break;
      case 'evade':
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
    this._flyTowards(enemy, target.mesh.position, dt, enemy.speed * 0.8);

    // 射击
    enemy._fireTimer -= dt;
    if (enemy._fireTimer <= 0) {
      this._enemyFireAtTarget(enemy, target);
      enemy._fireTimer = 1 / CONFIG.enemy.fireRate;
      if (this.player._buffTimeSlow) {
        enemy._fireTimer *= 2;
      }
    }
  }

  /**
   * 回避行为 — 远离目标
   */
  _doEvade(enemy, target, dt) {
    this._tmpAway.subVectors(enemy.mesh.position, target.mesh.position).normalize();
    this._tmpEvadeTarget.copy(enemy.mesh.position).add(this._tmpAway.multiplyScalar(200));
    this._tmpEvadeTarget.y = clamp(this._tmpEvadeTarget.y + randFloat(-50, 100), 100, 600);

    this._flyTowards(enemy, this._tmpEvadeTarget, dt, enemy.speed * 1.3);
  }

  /**
   * 通用飞向目标逻辑（复用预分配向量）
   */
  _flyTowards(enemy, target, dt, speed) {
    this._tmpDir.subVectors(target, enemy.mesh.position).normalize();

    // 平滑转向（就地修改 forward）
    this._tmpForward.copy(enemy.getForward());
    this._tmpForward.lerp(this._tmpDir, 2.0 * dt);
    this._tmpForward.normalize();

    // 朝向目标
    this._tmpLookTarget.copy(enemy.mesh.position).add(this._tmpForward);
    enemy.mesh.lookAt(this._tmpLookTarget);

    // 移动（时间减速 buff 时速度减半）
    let actualSpeed = speed;
    if (this.player._buffTimeSlow) {
      actualSpeed *= 0.5;
    }
    // 就地缩放并移动
    this._tmpDir.copy(this._tmpForward).multiplyScalar(actualSpeed * dt);
    enemy.mesh.position.add(this._tmpDir);

    // 获取地表高度 — 使用数学函数代替 Raycaster
    let groundHeight = 10;
    if (this.terrain) {
      groundHeight = Math.max(10, this.terrain.getApproxHeight(enemy.mesh.position.x, enemy.mesh.position.z));
    }

    // 地面/山体碰撞坠毁
    if (enemy.mesh.position.y < groundHeight + 2 && !enemy.isDestroyed) {
      enemy.mesh.position.y = groundHeight;
      enemy.takeDamage(9999);
      this._cachedAliveEnemiesDirty = true;
      if (this.onEnemyGroundCrash) {
        this.onEnemyGroundCrash(this._tmpCrashPos.copy(enemy.mesh.position));
      }
    }
  }

  /**
   * 敌机射击（复用向量）
   */
  _enemyFireAtTarget(enemy, target) {
    this._tmpForward.copy(enemy.getForward());
    this._tmpSpawnPos.copy(enemy.mesh.position).add(
      this._tmpDir.copy(this._tmpForward).multiplyScalar(6)
    );

    // 瞄准方向
    this._tmpToTargetNorm.subVectors(target.mesh.position, this._tmpSpawnPos).normalize();

    // 混合前方和指向目标的方向
    this._tmpBulletDir.copy(this._tmpForward).lerp(this._tmpToTargetNorm, 0.6);
    const spread = CONFIG.enemy.accuracy || 0.08;
    this._tmpBulletDir.x += (Math.random() - 0.5) * spread;
    this._tmpBulletDir.y += (Math.random() - 0.5) * spread;
    this._tmpBulletDir.z += (Math.random() - 0.5) * spread;
    this._tmpBulletDir.normalize();

    const bullet = new Bullet(this._tmpSpawnPos.clone(), this._tmpBulletDir.clone(), 'enemy');
    this._enemyBullets.push(bullet);
    this.scene.add(bullet.mesh);
    this._cachedAliveBulletsDirty = true;
  }

  /**
   * 更新敌机子弹
   */
  _updateEnemyBullets(dt) {
    let changed = false;
    for (let i = this._enemyBullets.length - 1; i >= 0; i--) {
      const b = this._enemyBullets[i];
      b.update(dt);
      if (b.isDestroyed) {
        this.scene.remove(b.mesh);
        this._enemyBullets.splice(i, 1);
        changed = true;
      }
    }
    if (changed) {
      this._cachedAliveBulletsDirty = true;
    }
  }

  /**
   * 获取所有敌机子弹（缓存版本）
   */
  getEnemyBullets() {
    if (this._cachedAliveBulletsDirty) {
      this._cachedAliveBullets = [];
      for (const b of this._enemyBullets) {
        if (!b.isDestroyed) this._cachedAliveBullets.push(b);
      }
      this._cachedAliveBulletsDirty = false;
    }
    return this._cachedAliveBullets;
  }

  /**
   * 获取存活敌机列表（缓存版本）
   */
  getAliveEnemies() {
    if (this._cachedAliveEnemiesDirty) {
      this._cachedAliveEnemies = [];
      for (const e of this.enemies) {
        if (!e.isDestroyed) this._cachedAliveEnemies.push(e);
      }
      this._cachedAliveEnemiesDirty = false;
    }
    return this._cachedAliveEnemies;
  }
}
