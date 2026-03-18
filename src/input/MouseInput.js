/**
 * 鼠标输入系统
 * 处理相机旋转和目标锁定
 */
export class MouseInput {
  constructor() {
    this.deltaX = 0;
    this.deltaY = 0;
    this.isRightDown = false;
    this._isPointerLocked = false;

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onContextMenu = this._onContextMenu.bind(this);

    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('contextmenu', this._onContextMenu);
  }

  _onMouseMove(e) {
    this.deltaX += e.movementX || 0;
    this.deltaY += e.movementY || 0;
  }

  _onMouseDown(e) {
    if (e.button === 2) {
      this.isRightDown = true;
    }
  }

  _onMouseUp(e) {
    if (e.button === 2) {
      this.isRightDown = false;
    }
  }

  _onContextMenu(e) {
    e.preventDefault();
  }

  /**
   * 每帧结束时重置 delta
   */
  update() {
    this.deltaX = 0;
    this.deltaY = 0;
  }

  dispose() {
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('contextmenu', this._onContextMenu);
  }
}
