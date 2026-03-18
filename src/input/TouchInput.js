/**
 * 触摸输入系统
 * 移动端虚拟摇杆 + 油门 + 射击按钮
 */
export class TouchInput {
  constructor() {
    // 虚拟摇杆状态
    this.stickX = 0;  // -1 到 1（偏航）
    this.stickY = 0;  // -1 到 1（俯仰）

    // 油门
    this.throttle = 0.5; // 0-1
    this.isBoosting = false;

    // 射击
    this.isFiring = false;

    // 是否是移动端
    this.isMobile = this._detectMobile();

    if (this.isMobile) {
      this._setupControls();
    }
  }

  /**
   * 检测是否移动端
   */
  _detectMobile() {
    return ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (window.innerWidth <= 768);
  }

  /**
   * 初始化触摸控制
   */
  _setupControls() {
    this._showMobileUI();
    this._setupJoystick();
    this._setupThrottle();
    this._setupFireButton();
  }

  /**
   * 显示移动端 UI
   */
  _showMobileUI() {
    const els = ['mobile-joystick', 'mobile-throttle', 'mobile-fire'];
    for (const id of els) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'block';
    }
  }

  /**
   * 设置虚拟摇杆
   */
  _setupJoystick() {
    const joystick = document.getElementById('mobile-joystick');
    if (!joystick) return;

    const handle = joystick.querySelector('.joystick-handle');
    let touchID = null;
    const rect = { cx: 0, cy: 0, radius: 50 };

    const updateRect = () => {
      const box = joystick.getBoundingClientRect();
      rect.cx = box.left + box.width / 2;
      rect.cy = box.top + box.height / 2;
      rect.radius = box.width / 2 - 20;
    };

    joystick.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      touchID = touch.identifier;
      updateRect();
      this._updateStick(touch.clientX, touch.clientY, rect, handle);
    });

    joystick.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier === touchID) {
          this._updateStick(touch.clientX, touch.clientY, rect, handle);
        }
      }
    });

    const resetStick = () => {
      touchID = null;
      this.stickX = 0;
      this.stickY = 0;
      if (handle) {
        handle.style.transform = 'translate(-50%, -50%)';
      }
    };

    joystick.addEventListener('touchend', resetStick);
    joystick.addEventListener('touchcancel', resetStick);
  }

  /**
   * 更新摇杆位置
   */
  _updateStick(touchX, touchY, rect, handle) {
    let dx = touchX - rect.cx;
    let dy = touchY - rect.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > rect.radius) {
      dx = (dx / dist) * rect.radius;
      dy = (dy / dist) * rect.radius;
    }

    this.stickX = dx / rect.radius;
    this.stickY = -dy / rect.radius; // Y 轴反转

    if (handle) {
      handle.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
  }

  /**
   * 设置油门滑杆
   */
  _setupThrottle() {
    const throttle = document.getElementById('mobile-throttle');
    if (!throttle) return;

    const handle = throttle.querySelector('.throttle-handle');
    let touchID = null;
    let trackTop = 0;
    let trackHeight = 0;

    throttle.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      touchID = touch.identifier;
      const box = throttle.getBoundingClientRect();
      trackTop = box.top;
      trackHeight = box.height;
      this._updateThrottle(touch.clientY, trackTop, trackHeight, handle);
    });

    throttle.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier === touchID) {
          this._updateThrottle(touch.clientY, trackTop, trackHeight, handle);
        }
      }
    });

    const resetThrottle = () => {
      touchID = null;
      this.isBoosting = false;
    };

    throttle.addEventListener('touchend', resetThrottle);
    throttle.addEventListener('touchcancel', resetThrottle);
  }

  /**
   * 更新油门值
   */
  _updateThrottle(touchY, trackTop, trackHeight, handle) {
    let progress = 1 - (touchY - trackTop) / trackHeight;
    progress = Math.max(0, Math.min(1, progress));

    this.throttle = progress;
    this.isBoosting = progress > 0.9;

    if (handle) {
      handle.style.bottom = `${progress * 100}%`;
    }
  }

  /**
   * 设置射击按钮
   */
  _setupFireButton() {
    const fireBtn = document.getElementById('mobile-fire');
    if (!fireBtn) return;

    fireBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.isFiring = true;
      fireBtn.classList.add('active');
    });

    fireBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.isFiring = false;
      fireBtn.classList.remove('active');
    });

    fireBtn.addEventListener('touchcancel', () => {
      this.isFiring = false;
      fireBtn.classList.remove('active');
    });
  }

  /**
   * 每帧更新（重置不需要）
   */
  update() {
    // 触摸输入是事件驱动，不需要每帧更新
  }
}
