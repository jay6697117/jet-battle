/**
 * 屏幕效果系统（增强版）
 * 管理受击闪红、击杀闪绿、死亡全屏、重生动画等
 */
export class ScreenEffects {
  constructor() {
    this._createOverlays();
  }

  /**
   * 创建模板 DOM 元素
   */
  _createOverlays() {
    // 受击红色边框
    this._damageOverlay = document.createElement('div');
    this._damageOverlay.className = 'screen-effect damage-flash';
    document.body.appendChild(this._damageOverlay);

    // 击杀绿色闪光
    this._killOverlay = document.createElement('div');
    this._killOverlay.className = 'screen-effect kill-flash';
    document.body.appendChild(this._killOverlay);

    // 死亡全屏
    this._deathOverlay = document.createElement('div');
    this._deathOverlay.className = 'screen-effect death-overlay';
    this._deathOverlay.innerHTML = `
      <div class="death-content">
        <div class="death-title">DESTROYED</div>
        <div class="death-subtitle">按 R 键重试本关</div>
      </div>
    `;
    document.body.appendChild(this._deathOverlay);

    // 关卡结果提示（过关/失败）
    this._levelResultOverlay = document.createElement('div');
    this._levelResultOverlay.className = 'screen-effect wave-overlay';
    this._levelResultOverlay.innerHTML = `<div class="wave-text"></div>`;
    document.body.appendChild(this._levelResultOverlay);

    // 重生闪白效果
    this._respawnOverlay = document.createElement('div');
    this._respawnOverlay.className = 'screen-effect respawn-flash';
    document.body.appendChild(this._respawnOverlay);

    // 波次提示
    this._waveOverlay = document.createElement('div');
    this._waveOverlay.className = 'screen-effect wave-overlay';
    this._waveOverlay.innerHTML = `<div class="wave-text"></div>`;
    document.body.appendChild(this._waveOverlay);

    // 击杀弹出数字
    this._killPopup = document.createElement('div');
    this._killPopup.className = 'screen-effect kill-popup';
    document.body.appendChild(this._killPopup);
  }

  /**
   * 受击闪红
   */
  flashDamage() {
    this._damageOverlay.classList.add('active');
    setTimeout(() => this._damageOverlay.classList.remove('active'), 200);
  }

  /**
   * 击杀闪绿 + 弹出击杀数
   */
  flashKill(killCount) {
    this._killOverlay.classList.add('active');
    setTimeout(() => this._killOverlay.classList.remove('active'), 300);

    // 击杀弹出
    if (killCount !== undefined) {
      this._killPopup.textContent = `KILL #${killCount}`;
      this._killPopup.classList.add('active');
      setTimeout(() => this._killPopup.classList.remove('active'), 1500);
    }
  }

  /**
   * 显示死亡效果
   */
  showDeath() {
    this._deathOverlay.classList.add('active');
  }

  /**
   * 隐藏死亡效果 + 重生闪白
   */
  showRespawn() {
    this._deathOverlay.classList.remove('active');
    this._respawnOverlay.classList.add('active');
    setTimeout(() => this._respawnOverlay.classList.remove('active'), 500);
  }

  /**
   * 显示波次提示
   */
  showWave(waveNum) {
    const textEl = this._waveOverlay.querySelector('.wave-text');
    textEl.textContent = `WAVE ${waveNum}`;
    this._waveOverlay.classList.add('active');
    setTimeout(() => this._waveOverlay.classList.remove('active'), 2500);
  }

  /**
   * 显示倒计时
   */
  showCountdown(seconds) {
    const textEl = this._waveOverlay.querySelector('.wave-text');
    textEl.textContent = `下一关: ${seconds}s`;
    this._waveOverlay.classList.add('active');
    setTimeout(() => this._waveOverlay.classList.remove('active'), 1000);
  }

  /**
   * 显示关卡开始信息
   */
  showLevelStart(level, enemyCount, requiredKills) {
    const textEl = this._waveOverlay.querySelector('.wave-text');
    textEl.innerHTML = `第 ${level} 关<br><span style="font-size:0.5em;opacity:0.8">${enemyCount} 架敌机 · 至少击杀 ${requiredKills} 架</span>`;
    this._waveOverlay.classList.add('active');
    setTimeout(() => this._waveOverlay.classList.remove('active'), 3000);
  }

  /**
   * 显示过关提示
   */
  showLevelComplete(level) {
    const textEl = this._levelResultOverlay.querySelector('.wave-text');
    textEl.innerHTML = `<span style="color:#00ff88">✓ 第 ${level} 关通过！</span>`;
    this._levelResultOverlay.classList.add('active');
    setTimeout(() => this._levelResultOverlay.classList.remove('active'), 3000);
  }

  /**
   * 显示失败提示
   */
  showLevelFailed(reason) {
    const textEl = this._levelResultOverlay.querySelector('.wave-text');
    textEl.innerHTML = `<span style="color:#ff4444">✗ 关卡失败</span><br><span style="font-size:0.5em;opacity:0.8">${reason}<br>按 R 键重试</span>`;
    this._levelResultOverlay.classList.add('active');
    // 失败提示不自动消失，等重试时手动隐藏
  }

  /**
   * 隐藏关卡结果提示
   */
  hideLevelResult() {
    this._levelResultOverlay.classList.remove('active');
  }
}
