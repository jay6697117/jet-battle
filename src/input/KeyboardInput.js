/**
 * 键盘输入系统
 * 监听按键状态，提供 isPressed / isJustPressed 接口
 */
export class KeyboardInput {
  constructor() {
    // 当前按住的键
    this._pressed = new Set();
    // 这一帧刚按下的键
    this._justPressed = new Set();
    // 上一帧按住的键（用于检测 justPressed）
    this._prevPressed = new Set();

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  _onKeyDown(e) {
    // 防止浏览器默认行为（如 Space 滚动、Tab 切焦点）
    if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    this._pressed.add(e.code);
  }

  _onKeyUp(e) {
    this._pressed.delete(e.code);
  }

  /**
   * 当前键是否按住
   */
  isPressed(code) {
    return this._pressed.has(code);
  }

  /**
   * 这一帧是否刚按下（用于油门档位切换等单次触发）
   */
  isJustPressed(code) {
    return this._justPressed.has(code);
  }

  /**
   * 每帧开始时调用，更新 justPressed 状态
   */
  update() {
    this._justPressed.clear();
    for (const code of this._pressed) {
      if (!this._prevPressed.has(code)) {
        this._justPressed.add(code);
      }
    }
    this._prevPressed = new Set(this._pressed);
  }

  /**
   * 销毁
   */
  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }
}
