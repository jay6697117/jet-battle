import { CONFIG } from '../utils/Config.js';

/**
 * 波次系统
 * 自动生成敌机波次，难度递进
 */
export class WaveSystem {
  constructor(aiSystem, screenEffects) {
    this.aiSystem = aiSystem;
    this.screenEffects = screenEffects;

    this.currentWave = 0;
    this.isActive = false;
    this._countdownTimer = 0;
    this._betweenWaves = false;
    this._waveDelay = 5.0; // 波次间隔秒数
    this._checkTimer = 0;
  }

  /**
   * 开始波次系统
   */
  start() {
    this.isActive = true;
    this._startWave();
  }

  /**
   * 开始下一波
   */
  _startWave() {
    this.currentWave++;
    this._betweenWaves = false;

    // 难度递进
    const baseCount = 3;
    const extraPerWave = 2;
    const count = Math.min(baseCount + (this.currentWave - 1) * extraPerWave, 20);

    // 调整 AI 难度参数
    this._adjustDifficulty();

    // 生成敌机
    this.aiSystem.spawnWave(count);

    // 显示波次提示
    if (this.screenEffects) {
      this.screenEffects.showWave(this.currentWave);
    }
  }

  /**
   * 根据波次调整难度（平缓递进）
   */
  _adjustDifficulty() {
    const wave = this.currentWave;
    // 缓慢递增敌机速度和射速
    CONFIG.enemy.speed = 40 + wave * 3;
    CONFIG.enemy.fireRate = Math.min(1.5 + wave * 0.3, 5);
    CONFIG.enemy.detectionRange = 250 + wave * 15;
    CONFIG.enemy.attackRange = 150 + wave * 10;
  }

  /**
   * 每帧更新
   */
  update(dt) {
    if (!this.isActive) return;

    // 波次间歇期
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
        this._startWave();
      }
      return;
    }

    // 检查是否全部敌机被消灭
    this._checkTimer += dt;
    if (this._checkTimer >= 0.5) {
      this._checkTimer = 0;
      const aliveCount = this.aiSystem.getAliveEnemies().length;
      if (aliveCount === 0) {
        // 开始倒计时
        this._betweenWaves = true;
        this._countdownTimer = this._waveDelay;
      }
    }
  }

  /**
   * 获取当前波次信息
   */
  getInfo() {
    return {
      wave: this.currentWave,
      enemiesAlive: this.aiSystem.getAliveEnemies().length,
      isBetweenWaves: this._betweenWaves,
    };
  }
}
