/**
 * 游戏设置管理器
 * ESC 键打开/关闭设置菜单
 * 支持画质、音效、Y轴反转等设置
 */
export class SettingsManager {
  constructor(game, audioManager) {
    this.game = game;
    this.audioManager = audioManager;

    // 默认设置
    this.settings = {
      quality: 'high',
      soundEnabled: true,
      invertY: false,
    };

    // 从 localStorage 恢复
    this._loadSettings();

    // 菜单是否打开
    this.isOpen = false;

    this._bindEvents();
    this._updateUI();
  }

  /**
   * 绑定事件
   */
  _bindEvents() {
    const menu = document.getElementById('settings-menu');
    if (!menu) return;

    // 画质按钮
    ['low', 'medium', 'high'].forEach(q => {
      const btn = document.getElementById(`settings-quality-${q}`);
      if (btn) {
        btn.addEventListener('click', () => {
          this.settings.quality = q;
          this._applyQuality(q);
          this._updateUI();
          this._saveSettings();
        });
      }
    });

    // Y 轴反转
    const invertBtn = document.getElementById('settings-invert-y');
    if (invertBtn) {
      invertBtn.addEventListener('click', () => {
        this.settings.invertY = !this.settings.invertY;
        this._updateUI();
        this._saveSettings();
      });
    }

    // 音效开关
    const soundBtn = document.getElementById('settings-sound');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        this.settings.soundEnabled = !this.settings.soundEnabled;
        if (this.audioManager) {
          this.audioManager.setEnabled(this.settings.soundEnabled);
        }
        this._updateUI();
        this._saveSettings();
      });
    }

    // 关闭按钮
    const closeBtn = document.getElementById('settings-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
  }

  /**
   * 切换设置菜单
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * 打开设置菜单
   */
  open() {
    this.isOpen = true;
    const menu = document.getElementById('settings-menu');
    if (menu) menu.style.display = 'flex';
    // 暂停游戏
    if (this.game) this.game.isPaused = true;
  }

  /**
   * 关闭设置菜单
   */
  close() {
    this.isOpen = false;
    const menu = document.getElementById('settings-menu');
    if (menu) menu.style.display = 'none';
    // 恢复游戏
    if (this.game) this.game.isPaused = false;
  }

  /**
   * 应用画质设置
   */
  _applyQuality(preset) {
    if (this.game) {
      this.game.setQuality(preset);
    }
  }

  /**
   * 更新 UI 状态
   */
  _updateUI() {
    // 画质按钮高亮
    ['low', 'medium', 'high'].forEach(q => {
      const btn = document.getElementById(`settings-quality-${q}`);
      if (btn) {
        btn.classList.toggle('active', q === this.settings.quality);
      }
    });

    // Y 轴反转
    const invertBtn = document.getElementById('settings-invert-y');
    if (invertBtn) {
      invertBtn.textContent = this.settings.invertY ? '开启' : '关闭';
      invertBtn.classList.toggle('active', this.settings.invertY);
    }

    // 音效
    const soundBtn = document.getElementById('settings-sound');
    if (soundBtn) {
      soundBtn.textContent = this.settings.soundEnabled ? '开启' : '关闭';
      soundBtn.classList.toggle('active', this.settings.soundEnabled);
    }
  }

  /**
   * 保存到 localStorage
   */
  _saveSettings() {
    try {
      localStorage.setItem('jet-battle-settings', JSON.stringify(this.settings));
    } catch (e) { /* 静默失败 */ }
  }

  /**
   * 从 localStorage 加载
   */
  _loadSettings() {
    try {
      const saved = localStorage.getItem('jet-battle-settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (e) { /* 静默失败 */ }
  }
}
