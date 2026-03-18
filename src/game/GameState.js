/**
 * 游戏状态管理
 * 管理 kills、deaths、得分等
 */
export class GameState {
  constructor() {
    this.kills = 0;
    this.deaths = 0;
    this.survivalTime = 0;
    this.isAlive = true;
    this.respawnTimer = 0;
  }

  /**
   * 记录一次击杀
   */
  addKill() {
    this.kills++;
    this._updateHUD();
    this._showNotification('ENEMY DOWN!');
  }

  /**
   * 记录一次死亡
   */
  addDeath() {
    this.deaths++;
    this.isAlive = false;
    this._updateHUD();
    this._showNotification('YOU WERE DESTROYED - Press R to respawn');
  }

  /**
   * 重生
   */
  respawn() {
    this.isAlive = true;
    this.respawnTimer = 0;
    this._showNotification('RESPAWNED');
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
   * 公开的通知方法（供外部调用）
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

    // 3 秒后移除
    setTimeout(() => {
      notif.style.opacity = '0';
      notif.style.transition = 'opacity 0.5s';
      setTimeout(() => notif.remove(), 500);
    }, 3000);
  }
}
