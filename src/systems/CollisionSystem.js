import * as THREE from 'three';

/**
 * 碰撞检测系统
 * 检测子弹/导弹命中目标，处理伤害
 * 支持敌机之间的子弹碰撞和飞机碰撞
 */
export class CollisionSystem {
  constructor(player, aiSystem, weaponSystem, gameState) {
    this.player = player;
    this.aiSystem = aiSystem;
    this.weaponSystem = weaponSystem;
    this.gameState = gameState;

    // 碰撞半径
    this._bulletHitRadius = 10;   // 子弹命中判定半径（放大，配合更大的敌机模型）
    this._missileHitRadius = 15;  // 导弹命中判定半径（同步放大）
    this._jetCollisionRadius = 15; // 飞机碰撞判定半径（同步放大）

    // 击杀回调
    this.onEnemyKilled = null;       // 玩家击杀敌机
    this.onEnemyKilledByEnemy = null; // 敌机被敌机击杀
    this.onPlayerHit = null;
    this.onPlayerKilled = null;
  }

  /**
   * 每帧更新 — 进行所有碰撞检测
   */
  update(dt) {
    this._checkPlayerBulletsVsEnemies();
    this._checkPlayerMissilesVsEnemies();
    this._checkEnemyBulletsVsPlayer();
    this._checkEnemyBulletsVsEnemies(); // 新增：敌机子弹 vs 敌机
    this._checkJetCollisions();
    this._checkEnemyJetCollisions();    // 新增：敌机之间碰撞
  }

  /**
   * 玩家子弹 vs 敌机
   */
  _checkPlayerBulletsVsEnemies() {
    const bullets = this.weaponSystem.getPlayerBullets();
    const enemies = this.aiSystem.getAliveEnemies();

    for (const bullet of bullets) {
      for (const enemy of enemies) {
        const dist = bullet.mesh.position.distanceTo(enemy.mesh.position);
        if (dist < this._bulletHitRadius) {
          // 命中！
          enemy.takeDamage(bullet.damage);
          bullet.destroy();

          if (enemy.isDestroyed) {
            this.gameState.addKill();
            if (this.onEnemyKilled) {
              this.onEnemyKilled(enemy.mesh.position.clone());
            }
          }
          break; // 一颗子弹只能命中一个目标
        }
      }
    }
  }

  /**
   * 玩家导弹 vs 敌机
   */
  _checkPlayerMissilesVsEnemies() {
    const missiles = this.weaponSystem.getPlayerMissiles();
    const enemies = this.aiSystem.getAliveEnemies();

    for (const missile of missiles) {
      for (const enemy of enemies) {
        const dist = missile.mesh.position.distanceTo(enemy.mesh.position);
        if (dist < this._missileHitRadius) {
          // 导弹命中！
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

    const bullets = this.aiSystem.getEnemyBullets();

    for (const bullet of bullets) {
      const dist = bullet.mesh.position.distanceTo(this.player.mesh.position);
      if (dist < this._bulletHitRadius) {
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
    const bullets = this.aiSystem.getEnemyBullets();
    const enemies = this.aiSystem.getAliveEnemies();

    for (const bullet of bullets) {
      for (const enemy of enemies) {
        // 跳过发射者自己（通过位置近似判断，子弹刚出膛时很近）
        // 子弹不会打自己：刚发射时距离 > 6 单位
        const dist = bullet.mesh.position.distanceTo(enemy.mesh.position);
        if (dist < this._bulletHitRadius) {
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

    const enemies = this.aiSystem.getAliveEnemies();

    for (const enemy of enemies) {
      const dist = this.player.mesh.position.distanceTo(enemy.mesh.position);
      if (dist < this._jetCollisionRadius) {
        // 双方都受伤
        // 无敌护甲 buff 时跳过玩家伤害
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
    const enemies = this.aiSystem.getAliveEnemies();

    for (let i = 0; i < enemies.length; i++) {
      for (let j = i + 1; j < enemies.length; j++) {
        const a = enemies[i];
        const b = enemies[j];
        const dist = a.mesh.position.distanceTo(b.mesh.position);
        if (dist < this._jetCollisionRadius) {
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
