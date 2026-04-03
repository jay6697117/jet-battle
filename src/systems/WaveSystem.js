import { CONFIG } from '../utils/Config.js';
import i18n from '../i18n/I18n.js';

/**
 * 关卡系统（原 WaveSystem）
 * 生存淘汰制：所有单位各自为战，存活 + 达到最低击杀数过关
 * 难度逐关递进
 */
export class WaveSystem {
  constructor(aiSystem, screenEffects) {
    this.aiSystem = aiSystem;
    this.screenEffects = screenEffects;

    this.currentWave = 0;        // 当前关卡
    this.isActive = false;
    this._countdownTimer = 0;
    this._betweenWaves = false;
    this._waveDelay = 5.0;       // 关卡间隔秒数
    this._checkTimer = 0;

    // 关卡状态
    this._levelKills = 0;        // 本关玩家击杀数
    this._levelEnemyCount = 0;   // 本关敌机总数
    this._requiredKills = 0;     // 本关所需最低击杀数
    this._levelState = 'idle';   // idle | fighting | complete | failed

    // 回调
    this.onLevelComplete = null;  // 过关回调

    // 关卡配置表
    this._levelConfigs = [
      { enemies: 5,  killPercent: 0.10, health: 20, speed: 35, fireRate: 1.0 },
      { enemies: 8,  killPercent: 0.12, health: 25, speed: 40, fireRate: 1.2 },
      { enemies: 12, killPercent: 0.15, health: 30, speed: 45, fireRate: 1.5 },
      { enemies: 16, killPercent: 0.18, health: 35, speed: 50, fireRate: 1.8 },
      { enemies: 20, killPercent: 0.20, health: 40, speed: 55, fireRate: 2.0 },
    ];
  }

  /**
   * 开始关卡系统
   */
  start() {
    this.isActive = true;
    this._startLevel();
  }

  /**
   * 记录玩家击杀（由外部调用）
   */
  addPlayerKill() {
    this._levelKills++;
  }

  /**
   * 获取当前关卡配置
   */
  _getLevelConfig(level) {
    if (level <= this._levelConfigs.length) {
      return this._levelConfigs[level - 1];
    }
    // 第 6 关以后动态生成
    const extra = level - this._levelConfigs.length;
    return {
      enemies: 20 + extra * 2,
      killPercent: 0.25,
      health: 40 + extra * 5,
      speed: 55 + extra * 5,
      fireRate: Math.min(2.0 + extra * 0.2, 5.0),
    };
  }

  /**
   * 开始下一关
   */
  _startLevel() {
    this.currentWave++;
    this._betweenWaves = false;
    this._levelKills = 0;
    this._levelState = 'fighting';

    const config = this._getLevelConfig(this.currentWave);
    this._levelEnemyCount = config.enemies;
    this._requiredKills = Math.ceil(config.enemies * config.killPercent);

    // 调整 AI 难度参数
    CONFIG.enemy.maxHealth = config.health;
    CONFIG.enemy.speed = config.speed;
    CONFIG.enemy.fireRate = config.fireRate;
    CONFIG.enemy.detectionRange = 250 + (this.currentWave - 1) * 15;
    CONFIG.enemy.attackRange = 150 + (this.currentWave - 1) * 10;

    // 生成敌机
    this.aiSystem.spawnWave(config.enemies);

    // 显示关卡开始信息
    if (this.screenEffects) {
      this.screenEffects.showLevelStart(
        this.currentWave,
        config.enemies,
        this._requiredKills
      );
    }
  }

  /**
   * 每帧更新
   */
  update(dt) {
    if (!this.isActive) return;

    // 关卡间歇期
    if (this._betweenWaves) {
      this._countdownTimer -= dt;

      // 每秒更新倒计时显示
      const seconds = Math.ceil(this._countdownTimer);
      this._checkTimer += dt;
      if (this._checkTimer >= 1.0) {
        this._checkTimer = 0;
        if (this.screenEffects && seconds > 0) {
          this.screenEffects.showCountdown(seconds);
        }
      }

      if (this._countdownTimer <= 0) {
        this._startLevel();
      }
      return;
    }

    // 战斗中：检查关卡结束条件
    if (this._levelState !== 'fighting') return;

    this._checkTimer += dt;
    if (this._checkTimer >= 0.5) {
      this._checkTimer = 0;
      const aliveCount = this.aiSystem.getAliveEnemies().length;

      if (aliveCount === 0) {
        // 所有敌机消灭，检查玩家击杀数
        if (this._levelKills >= this._requiredKills) {
          // 过关！
          this._levelState = 'complete';
          if (this.screenEffects) {
            this.screenEffects.showLevelComplete(this.currentWave);
          }
          // 触发过关回调（用于盲盒关卡奖励）
          if (this.onLevelComplete) {
            this.onLevelComplete(this.currentWave);
          }
          // 进入下一关倒计时
          this._betweenWaves = true;
          this._countdownTimer = this._waveDelay;
        } else {
          // 击杀不足，失败
          this._levelState = 'failed';
          if (this.screenEffects) {
            this.screenEffects.showLevelFailed(
              i18n.t('level_failed_reason', [this._requiredKills, this._levelKills])
            );
          }
        }
      }
    }
  }

  /**
   * 重试当前关卡
   */
  retryLevel() {
    // 清除残留敌机
    const enemies = this.aiSystem.getAliveEnemies();
    for (const enemy of enemies) {
      enemy.isDestroyed = true;
    }
    // 倒退关卡号（_startLevel 会 +1）
    this.currentWave--;
    this._levelState = 'idle';
    this._betweenWaves = false;
    this._startLevel();
  }

  /**
   * 获取当前关卡信息
   */
  getInfo() {
    return {
      wave: this.currentWave,
      enemiesAlive: this.aiSystem.getAliveEnemies().length,
      totalEnemies: this._levelEnemyCount,
      levelKills: this._levelKills,
      requiredKills: this._requiredKills,
      levelState: this._levelState,
      isBetweenWaves: this._betweenWaves,
    };
  }
}
