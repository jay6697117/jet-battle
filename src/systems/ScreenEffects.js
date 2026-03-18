/**
 * 屏幕效果系统
 * 管理受伤闪红、死亡黑屏等全屏效果
 */
export class ScreenEffects {
  constructor() {
    this._overlay = null;
    this._createOverlay();
  }

  /**
   * 创建全屏遮罩
   */
  _createOverlay() {
    this._overlay = document.createElement('div');
    this._overlay.id = 'screen-effect-overlay';
    this._overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      pointer-events: none;
      z-index: 50;
      transition: background 0.1s ease;
      background: transparent;
    `;
    document.body.appendChild(this._overlay);
  }

  /**
   * 受击闪红
   */
  flashDamage() {
    this._overlay.style.background = 'rgba(255, 0, 0, 0.3)';
    setTimeout(() => {
      this._overlay.style.background = 'rgba(255, 0, 0, 0.15)';
    }, 60);
    setTimeout(() => {
      this._overlay.style.background = 'transparent';
    }, 200);
  }

  /**
   * 死亡效果
   */
  showDeath() {
    this._overlay.style.transition = 'background 0.5s ease';
    this._overlay.style.background = 'rgba(139, 0, 0, 0.6)';
    setTimeout(() => {
      this._overlay.style.transition = 'background 1.5s ease';
      this._overlay.style.background = 'transparent';
    }, 1500);
  }

  /**
   * 击杀确认闪光
   */
  flashKill() {
    this._overlay.style.background = 'rgba(0, 255, 136, 0.15)';
    setTimeout(() => {
      this._overlay.style.background = 'transparent';
    }, 150);
  }
}
