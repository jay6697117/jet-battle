import * as THREE from 'three';

/**
 * 碰撞检测系统
 * 检测子弹/导弹命中目标，处理伤害
 * 支持敌机之间的子弹碰撞和飞机碰撞
 * 
 * 性能优化：使用 distanceToSquared 避免 sqrt，缓存列表避免重复 filter
 */
export class CollisionSystem {
  constructor(player, aiSystem, weaponSystem, gameState) {
    this.player = player;
    this.aiSystem = aiSystem;
    this.weaponSystem = weaponSystem;
    this.gameState = gameState;

    // 碰撞半径（预计算平方值，避免每帧 sqrt）
    this._bulletHitRadius = 10;
    this._bulletHitRadiusSq = 10 * 10;
    this._missileHitRadius = 15;
    this._missileHitRadiusSq = 15 * 15;
    this._jetCollisionRadius = 15;
    this._jetCollisionRadiusSq = 15 * 15;

    // 击杀回调
    this.onEnemyKilled = null;
    this.onEnemyKilledByEnemy = null;
    this.onPlayerHit = null;
    this.onPlayerKilled = null;

    // 缓存列表，避免每个子方法重复获取
    this._cachedEnemies = [];
    this._cachedPlayerBullets = [];
    this._cachedPlayerMissiles = [];
    this._cachedEnemyBullets = [];
  }

  /**
   * 每帧更新 — 进行所有碰撞检测
   */
  update(dt) {
    // 一次性获取所有列表，内部共用
    this._cachedEnemies = this.aiSystem.getAliveEnemies();
    this._cachedPlayerBullets = this.weaponSystem.getPlayerBullets();
    this._cachedPlayerMissiles = this.weaponSystem.getPlayerMissiles();
    this._cachedEnemyBullets = this.aiSystem.getEnemyBullets();

    this._checkPlayerBulletsVsEnemies();
    this._checkPlayerMissilesVsEnemies();
    this._checkEnemyBulletsVsPlayer();
    this._checkEnemyBulletsVsEnemies();
    this._checkJetCollisions();
    this._checkEnemyJetCollisions();
  }

  /**
   * 玩家子弹 vs 敌机
   */
  _checkPlayerBulletsVsEnemies() {
    const bullets = this._cachedPlayerBullets;
    const enemies = this._cachedEnemies;

    for (const bullet of bullets) {
      if (bullet.isDestroyed) continue;
      for (const enemy of enemies) {
        if (enemy.isDestroyed) continue;
        const distSq = bullet.mesh.position.distanceToSquared(enemy.mesh.position);
        if (distSq < this._bulletHitRadiusSq) {
          enemy.takeDamage(bullet.damage);
          bullet.destroy();

          if (enemy.isDestroyed) {
            this.gameState.addKill();
            if (this.onEnemyKilled) {
              this.onEnemyKilled(enemy.mesh.position.clone());
            }
          }
          break;
        }
      }
    }
  }

  /**
   * 玩家导弹 vs 敌机
   */
  _checkPlayerMissilesVsEnemies() {
    const missiles = this._cachedPlayerMissiles;
    const enemies = this._cachedEnemies;

    for (const missile of missiles) {
      if (missile.isDestroyed) continue;
      for (const enemy of enemies) {
        if (enemy.isDestroyed) continue;
        const distSq = missile.mesh.position.distanceToSquared(enemy.mesh.position);
        if (distSq < this._missileHitRadiusSq) {
          enemy.takeDamage(missile.damage);
          missile.destroy();

          if (enemy.isDestroyed) {
            this.gameState.addKill();
            if (this.onEnemyKilled) {
              this.onEnemyKilled(enemy.mesh.position.clone());
            }
          }
          break;
        }
      }
    }
  }

  /**
   * 敌机子弹 vs 玩家
   */
  _checkEnemyBulletsVsPlayer() {
    if (this.player.isDestroyed || this.player._buffInvincible) return;

    const bullets = this._cachedEnemyBullets;

    for (const bullet of bullets) {
      if (bullet.isDestroyed) continue;
      const distSq = bullet.mesh.position.distanceToSquared(this.player.mesh.position);
      if (distSq < this._bulletHitRadiusSq) {
        this.player.takeDamage(bullet.damage);
        bullet.destroy();

        if (this.onPlayerHit) {
          this.onPlayerHit();
        }

        if (this.player.isDestroyed) {
          this.gameState.addDeath();
          if (this.onPlayerKilled) {
            this.onPlayerKilled(this.player.mesh.position.clone());
          }
        }
      }
    }
  }

  /**
   * 敌机子弹 vs 其他敌机（混战互杀）
   */
  _checkEnemyBulletsVsEnemies() {
    const bullets = this._cachedEnemyBullets;
    const enemies = this._cachedEnemies;

    for (const bullet of bullets) {
      if (bullet.isDestroyed) continue;
      for (const enemy of enemies) {
        if (enemy.isDestroyed) continue;
        const distSq = bullet.mesh.position.distanceToSquared(enemy.mesh.position);
        if (distSq < this._bulletHitRadiusSq) {
          enemy.takeDamage(bullet.damage);
          bullet.destroy();

          if (enemy.isDestroyed) {
            if (this.onEnemyKilledByEnemy) {
              this.onEnemyKilledByEnemy(enemy.mesh.position.clone());
            }
          }
          break;
        }
      }
    }
  }

  /**
   * 飞机间碰撞（玩家 vs 敌机）
   */
  _checkJetCollisions() {
    if (this.player.isDestroyed) return;

    const enemies = this._cachedEnemies;

    for (const enemy of enemies) {
      if (enemy.isDestroyed) continue;
      const distSq = this.player.mesh.position.distanceToSquared(enemy.mesh.position);
      if (distSq < this._jetCollisionRadiusSq) {
        if (!this.player._buffInvincible) {
          this.player.takeDamage(30);
        }
        enemy.takeDamage(30);

        if (this.onPlayerHit) this.onPlayerHit();

        if (enemy.isDestroyed) {
          this.gameState.addKill();
          if (this.onEnemyKilled) {
            this.onEnemyKilled(enemy.mesh.position.clone());
          }
        }

        if (this.player.isDestroyed) {
          this.gameState.addDeath();
          if (this.onPlayerKilled) {
            this.onPlayerKilled(this.player.mesh.position.clone());
          }
        }
      }
    }
  }

  /**
   * 敌机之间碰撞（混战互撞）
   */
  _checkEnemyJetCollisions() {
    const enemies = this._cachedEnemies;

    for (let i = 0; i < enemies.length; i++) {
      const a = enemies[i];
      if (a.isDestroyed) continue;
      for (let j = i + 1; j < enemies.length; j++) {
        const b = enemies[j];
        if (b.isDestroyed) continue;
        const distSq = a.mesh.position.distanceToSquared(b.mesh.position);
        if (distSq < this._jetCollisionRadiusSq) {
          a.takeDamage(15);
          b.takeDamage(15);

          if (a.isDestroyed && this.onEnemyKilledByEnemy) {
            this.onEnemyKilledByEnemy(a.mesh.position.clone());
          }
          if (b.isDestroyed && this.onEnemyKilledByEnemy) {
            this.onEnemyKilledByEnemy(b.mesh.position.clone());
          }
        }
      }
    }
  }
}
