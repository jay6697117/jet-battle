import { CONFIG } from '../utils/Config.js';

/**
 * HUD 更新系统
 * 每帧更新所有 HUD 元素的显示内容
 */
export class HUDSystem {
  constructor(player) {
    this.player = player;

    // 缓存 DOM 元素
    this.els = {
      speed: document.getElementById('hud-speed'),
      altitude: document.getElementById('hud-altitude'),
      throttle: document.getElementById('hud-throttle'),
      missiles: document.getElementById('hud-missiles'),
      flares: document.getElementById('hud-flares'),
      healthBar: document.getElementById('hud-health-bar'),
      healthValue: document.getElementById('hud-health-value'),
      heatBar: document.getElementById('hud-heat-bar'),
      heatValue: document.getElementById('hud-heat-value'),
      boostBar: document.getElementById('hud-boost-bar'),
      boostValue: document.getElementById('hud-boost-value'),
    };
  }

  /**
   * 每帧更新
   */
  update(dt) {
    const p = this.player;
    const els = this.els;

    // 速度 (显示为 km/h 的概念数值)
    if (els.speed) {
      els.speed.textContent = Math.round(p.speed * 10);
    }

    // 海拔
    if (els.altitude) {
      els.altitude.textContent = Math.round(p.mesh.position.y);
    }

    // 油门百分比
    if (els.throttle) {
      const percent = CONFIG.flight.throttleLevels[p.throttleIndex] * 100;
      els.throttle.textContent = Math.round(percent) + '%';
    }

    // 导弹数
    if (els.missiles) {
      els.missiles.textContent = p.missiles;
    }

    // 干扰弹数
    if (els.flares) {
      els.flares.textContent = p.flares;
    }

    // 血量条
    if (els.healthBar) {
      const hp = (p.health / CONFIG.player.maxHealth) * 100;
      els.healthBar.style.width = hp + '%';

      // 低血量变红
      if (hp < 30) {
        els.healthBar.style.background = 'linear-gradient(90deg, #ff4444, #ff0000)';
      } else {
        els.healthBar.style.background = 'linear-gradient(90deg, #00ff88, #00cc66)';
      }
    }
    if (els.healthValue) {
      els.healthValue.textContent = Math.round(p.health) + '%';
    }

    // 热度条
    if (els.heatBar) {
      els.heatBar.style.width = p.heat + '%';
      // 过热闪烁
      if (p.isOverheated) {
        els.heatBar.classList.add('overheated');
      } else {
        els.heatBar.classList.remove('overheated');
      }
    }
    if (els.heatValue) {
      els.heatValue.textContent = Math.round(p.heat) + '%';
    }

    // Boost 条
    if (els.boostBar) {
      els.boostBar.style.width = p.boostEnergy + '%';
    }
    if (els.boostValue) {
      els.boostValue.textContent = Math.round(p.boostEnergy) + '%';
    }
  }
}
