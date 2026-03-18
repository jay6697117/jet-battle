import { CONFIG } from '../utils/Config.js';

/**
 * HUD 更新系统
 * 每帧更新所有 HUD 元素的显示内容
 * 支持波次显示、敌机计数、速度百分比
 */
export class HUDSystem {
  constructor(player) {
    this.player = player;

    // 缓存 DOM 元素
    this.els = {
      speed: document.getElementById('hud-speed'),
      altitude: document.getElementById('hud-altitude'),
      throttle: document.getElementById('hud-throttle'),
      wave: document.getElementById('hud-wave'),
      missiles: document.getElementById('hud-missiles'),
      flares: document.getElementById('hud-flares'),
      enemies: document.getElementById('hud-enemies'),
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
  update(dt, waveSystem) {
    const p = this.player;
    const els = this.els;

    // 速度（百分比显示）
    if (els.speed) {
      const maxSpeed = CONFIG.flight.maxSpeed;
      const percent = Math.round((p.speed / maxSpeed) * 100);
      els.speed.textContent = percent;
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

    // 波次
    if (els.wave && waveSystem) {
      els.wave.textContent = waveSystem.currentWave;
    }

    // 导弹数
    if (els.missiles) {
      els.missiles.textContent = p.missiles;
    }

    // 干扰弹数
    if (els.flares) {
      els.flares.textContent = p.flares;
    }

    // 敌机存活数
    if (els.enemies && waveSystem) {
      const info = waveSystem.getInfo();
      els.enemies.textContent = info.enemiesAlive;
    }

    // 血量条
    if (els.healthBar) {
      const hp = (p.health / CONFIG.player.maxHealth) * 100;
      els.healthBar.style.width = hp + '%';
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
