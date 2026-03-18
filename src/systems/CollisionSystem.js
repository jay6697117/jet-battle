import * as THREE from 'three';

/**
 * 碰撞检测系统
 * 检测子弹/导弹命中目标，处理伤害
 */
export class CollisionSystem {
  constructor(player, aiSystem, weaponSystem, gameState) {
    this.player = player;
    this.aiSystem = aiSystem;
    this.weaponSystem = weaponSystem;
    this.gameState = gameState;

    // 碰撞半径
    this._bulletHitRadius = 5;    // 子弹命中判定半径
    this._missileHitRadius = 10;  // 导弹命中判定半径
    this._jetCollisionRadius = 8; // 飞机碰撞判定半径

    // 击杀回调（用于触发爆炸特效等）
    this.onEnemyKilled = null;
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
    this._checkJetCollisions();
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
    if (this.player.isDestroyed) return;

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
   * 飞机间碰撞
   */
  _checkJetCollisions() {
    if (this.player.isDestroyed) return;

    const enemies = this.aiSystem.getAliveEnemies();

    for (const enemy of enemies) {
      const dist = this.player.mesh.position.distanceTo(enemy.mesh.position);
      if (dist < this._jetCollisionRadius) {
        // 双方都受伤
        this.player.takeDamage(30);
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
}
