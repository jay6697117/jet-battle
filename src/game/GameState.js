import i18n from '../i18n/I18n.js';

/**
 * 游戏状态管理
 * 管理 kills、deaths、得分、排行榜
 */
export class GameState {
  constructor() {
    this.kills = 0;
    this.deaths = 0;
    this.survivalTime = 0;
    this.isAlive = true;
    this.respawnTimer = 0;
    this._leaderboardVisible = false;

    // 从 localStorage 加载历史记录
    this._history = this._loadHistory();

    // 绑定关闭排行榜按钮
    const closeLeaderboardBtn = document.getElementById('leaderboard-close');
    if (closeLeaderboardBtn) {
      closeLeaderboardBtn.addEventListener('click', () => {
        this._leaderboardVisible = false;
        const overlay = document.getElementById('leaderboard-overlay');
        if (overlay) {
          overlay.style.display = 'none';
        }
      });
    }
  }

  /**
   * 记录一次击杀
   */
  addKill() {
    this.kills++;
    this._updateHUD();
  }

  /**
   * 记录一次死亡
   */
  addDeath() {
    this.deaths++;
    this.isAlive = false;
    this._updateHUD();
  }

  /**
   * 重生
   */
  respawn() {
    this.isAlive = true;
    this.respawnTimer = 0;
    this._showNotification(i18n.t('notif_respawned'));
  }

  /**
   * 获取 K/D 比
   */
  getKD() {
    if (this.deaths === 0) return this.kills.toFixed(1);
    return (this.kills / this.deaths).toFixed(1);
  }

  /**
   * 每帧更新
   */
  update(dt) {
    if (this.isAlive) {
      this.survivalTime += dt;
    }
  }

  /**
   * 切换排行榜显示
   */
  toggleLeaderboard() {
    this._leaderboardVisible = !this._leaderboardVisible;
    const overlay = document.getElementById('leaderboard-overlay');
    if (overlay) {
      overlay.style.display = this._leaderboardVisible ? 'flex' : 'none';
    }
    if (this._leaderboardVisible) {
      this._updateLeaderboard();
    }
  }

  /**
   * 更新排行榜内容
   */
  _updateLeaderboard() {
    const body = document.getElementById('leaderboard-body');
    if (!body) return;

    // 当前游戏数据
    const currentEntry = {
      pilot: i18n.t('pilot_you'),
      kills: this.kills,
      deaths: this.deaths,
      kd: this.getKD(),
      time: this._formatTime(this.survivalTime),
      isCurrent: true,
    };

    // 合并历史记录
    const entries = [...this._history, currentEntry];

    // 按击杀数排序
    entries.sort((a, b) => b.kills - a.kills);

    // 渲染表格
    body.innerHTML = entries.map((entry, idx) => {
      const rowClass = entry.isCurrent ? 'player-row' : '';
      return `
        <tr class="${rowClass}">
          <td>${idx + 1}</td>
          <td>${entry.pilot}</td>
          <td>${entry.kills}</td>
          <td>${entry.deaths}</td>
          <td>${entry.kd}</td>
          <td>${entry.time}</td>
        </tr>
      `;
    }).join('');
  }

  /**
   * 格式化时间（秒 → 分:秒）
   */
  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * 保存当前记录到历史
   */
  saveToHistory() {
    if (this.kills === 0 && this.deaths === 0) return;

    const entry = {
      pilot: `${i18n.t('pilot_prefix')}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
      kills: this.kills,
      deaths: this.deaths,
      kd: this.getKD(),
      time: this._formatTime(this.survivalTime),
    };

    this._history.push(entry);
    // 只保留最近 10 条
    if (this._history.length > 10) {
      this._history = this._history.slice(-10);
    }

    try {
      localStorage.setItem('jet-battle-history', JSON.stringify(this._history));
    } catch (e) { /* 静默失败 */ }
  }

  /**
   * 加载历史记录
   */
  _loadHistory() {
    try {
      const data = localStorage.getItem('jet-battle-history');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * 更新 HUD 统计显示
   */
  _updateHUD() {
    const killsEl = document.getElementById('hud-kills');
    const deathsEl = document.getElementById('hud-deaths');
    const kdEl = document.getElementById('hud-kd');

    if (killsEl) killsEl.textContent = this.kills;
    if (deathsEl) deathsEl.textContent = this.deaths;
    if (kdEl) kdEl.textContent = this.getKD();
  }

  /**
   * 公开的通知方法
   */
  showNotification(text) {
    this._showNotification(text);
  }

  /**
   * 显示通知
   */
  _showNotification(text) {
    const container = document.getElementById('notifications-container');
    if (!container) return;

    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.textContent = text;
    container.appendChild(notif);

    setTimeout(() => {
      notif.style.opacity = '0';
      notif.style.transition = 'opacity 0.5s';
      setTimeout(() => notif.remove(), 500);
    }, 3000);
  }
}
