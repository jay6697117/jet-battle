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
        <div class="death-subtitle">按 R 键重生</div>
      </div>
    `;
    document.body.appendChild(this._deathOverlay);

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
    textEl.textContent = `下一波: ${seconds}s`;
    this._waveOverlay.classList.add('active');
    setTimeout(() => this._waveOverlay.classList.remove('active'), 1000);
  }
}
