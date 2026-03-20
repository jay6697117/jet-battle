/**
 * 触摸输入系统
 * 移动端虚拟摇杆 + 油门 + 射击按钮 + 导弹按钮
 * 手势操作：双指点击(干扰弹)、双击雷达(自动导航)、长按摇杆(自动稳定)
 * 底部上滑(排行榜)、点击左上角(设置)、陀螺仪(滚转)
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

    // === 新增操作状态 ===
    // 导弹（单次触发）
    this.isMissileFiring = false;
    // 干扰弹（单次触发）
    this.isFlareReleasing = false;
    // 自动导航切换（单次触发）
    this.isAutoNavToggled = false;
    // 自动稳定（持续按住）
    this.isAutoStabilizing = false;
    // 重生（单次触发）
    this.isRespawning = false;
    // 排行榜切换（单次触发）
    this.isLeaderboardToggled = false;
    // 设置菜单切换（单次触发）
    this.isSettingsToggled = false;
    // 陀螺仪滚转 -1 到 1
    this.gyroRoll = 0;

    // 是否是移动端
    this.isMobile = this._detectMobile();

    // 长按摇杆计时器
    this._longPressTimer = null;
    this._longPressDuration = 800; // 毫秒

    // 双击雷达检测
    this._radarLastTap = 0;
    this._radarDoubleTapDelay = 400; // 毫秒

    // 底部上滑检测
    this._swipeStartY = 0;
    this._swipeThreshold = 60; // 像素

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
    this._setupMissileButton();
    this._setupFlareGesture();
    this._setupRadarDoubleTap();
    this._setupSwipeUpGesture();
    this._setupSettingsTap();
    this._setupGyroscope();
    this._setupRespawnButton();
    this._setupMobileInstructions();
  }

  /**
   * 显示移动端 UI
   */
  _showMobileUI() {
    const els = ['mobile-joystick', 'mobile-throttle', 'mobile-fire', 'mobile-missile'];
    for (const id of els) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'block';
    }

    // 添加移动端标识到 body，用于 CSS 控制显隐
    document.body.classList.add('is-mobile');
  }

  /**
   * 设置虚拟摇杆（含长按自动稳定检测）
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

      // 启动长按检测（自动稳定）
      this._longPressTimer = setTimeout(() => {
        // 只在摇杆没有明显偏移时触发
        if (Math.abs(this.stickX) < 0.15 && Math.abs(this.stickY) < 0.15) {
          this.isAutoStabilizing = true;
          // 视觉反馈：摇杆变蓝
          if (handle) handle.classList.add('stabilizing');
        }
      }, this._longPressDuration);
    });

    joystick.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier === touchID) {
          this._updateStick(touch.clientX, touch.clientY, rect, handle);
          // 如果摇杆移动了，取消长按检测
          if (Math.abs(this.stickX) > 0.15 || Math.abs(this.stickY) > 0.15) {
            clearTimeout(this._longPressTimer);
            this.isAutoStabilizing = false;
            if (handle) handle.classList.remove('stabilizing');
          }
        }
      }
    });

    const resetStick = () => {
      touchID = null;
      this.stickX = 0;
      this.stickY = 0;
      clearTimeout(this._longPressTimer);
      this.isAutoStabilizing = false;
      if (handle) {
        handle.style.transform = 'translate(-50%, -50%)';
        handle.classList.remove('stabilizing');
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
   * 设置导弹按钮（单次触发）
   */
  _setupMissileButton() {
    const missileBtn = document.getElementById('mobile-missile');
    if (!missileBtn) return;

    missileBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.isMissileFiring = true;
      missileBtn.classList.add('active');
    });

    missileBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      missileBtn.classList.remove('active');
    });

    missileBtn.addEventListener('touchcancel', () => {
      missileBtn.classList.remove('active');
    });
  }

  /**
   * 双指同时点击 → 释放干扰弹
   */
  _setupFlareGesture() {
    const flash = document.getElementById('mobile-flare-flash');

    document.addEventListener('touchstart', (e) => {
      // 双指同时触摸（非按钮区域）
      if (e.touches.length >= 2) {
        // 排除在按钮、摇杆、油门上的触摸
        const target = e.target;
        if (target.closest('#mobile-joystick') ||
            target.closest('#mobile-throttle') ||
            target.closest('#mobile-fire') ||
            target.closest('#mobile-missile')) {
          return;
        }
        this.isFlareReleasing = true;
        // 闪光视觉反馈
        if (flash) {
          flash.classList.add('active');
          setTimeout(() => flash.classList.remove('active'), 300);
        }
      }
    }, { passive: true });
  }

  /**
   * 双击雷达 → 切换自动导航
   */
  _setupRadarDoubleTap() {
    const radar = document.getElementById('hud-radar');
    if (!radar) return;

    radar.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now - this._radarLastTap < this._radarDoubleTapDelay) {
        this.isAutoNavToggled = true;
        // 视觉反馈
        radar.classList.add('nav-active');
        setTimeout(() => radar.classList.remove('nav-active'), 500);
      }
      this._radarLastTap = now;
    });
  }

  /**
   * 底部上滑 → 排行榜
   */
  _setupSwipeUpGesture() {
    const bottomBar = document.getElementById('hud-bottom-center');
    if (!bottomBar) return;

    bottomBar.addEventListener('touchstart', (e) => {
      this._swipeStartY = e.changedTouches[0].clientY;
    }, { passive: true });

    bottomBar.addEventListener('touchend', (e) => {
      const dy = this._swipeStartY - e.changedTouches[0].clientY;
      if (dy > this._swipeThreshold) {
        this.isLeaderboardToggled = true;
      }
    }, { passive: true });
  }

  /**
   * 点击左上角 → 设置菜单
   */
  _setupSettingsTap() {
    const topLeft = document.getElementById('hud-top-left');
    if (!topLeft) return;

    topLeft.addEventListener('touchstart', (e) => {
      // 只在普通点击（非拖动）时触发
      e.preventDefault();
      this.isSettingsToggled = true;
    });
  }

  /**
   * 陀螺仪 → 滚转控制
   */
  _setupGyroscope() {
    // iOS 13+ 需要请求权限
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      // 在用户第一次触摸时请求权限
      const requestGyro = () => {
        DeviceOrientationEvent.requestPermission()
          .then(state => {
            if (state === 'granted') {
              this._bindGyroscope();
            }
          })
          .catch(console.error);
        document.removeEventListener('touchstart', requestGyro);
      };
      document.addEventListener('touchstart', requestGyro, { once: true });
    } else if ('DeviceOrientationEvent' in window) {
      this._bindGyroscope();
    }
  }

  /**
   * 绑定陀螺仪事件
   */
  _bindGyroscope() {
    window.addEventListener('deviceorientation', (e) => {
      // gamma: 左右倾斜 -90 到 90
      if (e.gamma !== null) {
        // 将 -45 到 45 度映射到 -1 到 1
        this.gyroRoll = Math.max(-1, Math.min(1, e.gamma / 45));
      }
    }, { passive: true });
  }

  /**
   * 设置死亡重生按钮
   */
  _setupRespawnButton() {
    const respawnBtn = document.querySelector('#mobile-respawn .respawn-btn');
    if (!respawnBtn) return;

    respawnBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.isRespawning = true;
    });
  }

  /**
   * 显示/隐藏死亡重生按钮
   */
  showRespawn(show) {
    const el = document.getElementById('mobile-respawn');
    if (el) {
      el.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * 移动端关闭操控指南（触摸即关闭）
   */
  _setupMobileInstructions() {
    const panel = document.getElementById('instructions-panel');
    if (!panel) return;

    panel.addEventListener('touchstart', (e) => {
      // 不拦截关闭按钮
      if (e.target.id === 'instructions-close') return;
      panel.style.display = 'none';
    });
  }

  /**
   * 每帧更新 — 重置单次触发标志
   */
  update() {
    this.isMissileFiring = false;
    this.isFlareReleasing = false;
    this.isAutoNavToggled = false;
    this.isRespawning = false;
    this.isLeaderboardToggled = false;
    this.isSettingsToggled = false;
  }
}
