import { CONFIG } from '../utils/Config.js';

/**
 * HUD 更新系统
 * 每帧更新所有 HUD 元素的显示内容
 * 支持波次显示、敌机计数、速度百分比
 */
export class HUDSystem {
  constructor(player, weaponSystem = null) {
    this.player = player;
    this.weaponSystem = weaponSystem;
    this.flightPhysics = null; // 由外部设置

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
      levelKills: document.getElementById('hud-level-kills'),
      autoNav: document.getElementById('hud-autonav'),
      autoNavDist: document.getElementById('hud-autonav-dist'),
      lockStatus: document.getElementById('hud-lock-status'),
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

    // 波次（关卡号）
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

    // 关卡击杀进度
    if (els.levelKills && waveSystem) {
      const info = waveSystem.getInfo();
      els.levelKills.textContent = `${info.levelKills}/${info.requiredKills}`;
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

    // 锁定状态
    if (els.lockStatus && this.weaponSystem) {
      const ws = this.weaponSystem;
      if (ws.isLocked && ws.lockTarget) {
        // 已锁定
        els.lockStatus.textContent = '已锁定 ✓';
        els.lockStatus.className = 'hud-lock-status locked';
      } else if (ws.lockTarget && ws.lockProgress > 0) {
        // 锁定中（显示剩余倒计时）
        const remaining = ((1 - ws.lockProgress) * CONFIG.weapons.missile.lockTime).toFixed(1);
        els.lockStatus.textContent = `锁定中 ${remaining}s`;
        els.lockStatus.className = 'hud-lock-status locking';
      } else {
        // 无目标
        els.lockStatus.textContent = '无目标';
        els.lockStatus.className = 'hud-lock-status no-target';
      }
    }

    // 自动导航状态
    if (els.autoNav && this.flightPhysics) {
      if (this.flightPhysics.autoNavEnabled) {
        els.autoNav.style.display = 'flex';
        // 显示距离
        if (els.autoNavDist && this.flightPhysics.autoNavTarget) {
          const dist = p.mesh.position.distanceTo(
            this.flightPhysics.autoNavTarget.mesh.position
          );
          els.autoNavDist.textContent = Math.round(dist) + 'm';
        }
      } else {
        els.autoNav.style.display = 'none';
      }
    }
  }
}
