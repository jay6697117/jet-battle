import { CONFIG } from '../utils/Config.js';
import i18n from '../i18n/I18n.js';

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
      timeValue: document.getElementById('hud-time'),
      weatherIcon: document.getElementById('hud-weather'),
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
      buffs: document.getElementById('hud-buffs'),
    };

    // 脏标记缓存：只在值变化时更新 DOM
    this._cache = {
      speed: -1,
      altitude: -1,
      throttle: -1,
      wave: -1,
      timeStr: '',
      weatherIcon: '',
      missiles: -1,
      flares: -1,
      enemies: -1,
      healthPct: -1,
      healthLow: false,
      healthVal: -1,
      heat: -1,
      overheated: false,
      heatVal: -1,
      boost: -1,
      boostVal: -1,
      levelKills: '',
      lockText: '',
      lockClass: '',
      autoNavVisible: false,
      autoNavDist: -1,
      buffCount: -1,
    };
  }

  /**
   * 每帧更新
   */
  update(dt, waveSystem, powerUpSystem, timeWeatherSystem) {
    const p = this.player;
    const els = this.els;
    const c = this._cache;

    // 速度（百分比显示）
    if (els.speed) {
      const maxSpeed = CONFIG.flight.maxSpeed;
      const percent = Math.round((p.speed / maxSpeed) * 100);
      if (c.speed !== percent) {
        c.speed = percent;
        els.speed.textContent = percent;
      }
    }

    // 海拔
    if (els.altitude) {
      const alt = Math.round(p.mesh.position.y);
      if (c.altitude !== alt) {
        c.altitude = alt;
        els.altitude.textContent = alt;
      }
    }

    // 油门百分比
    if (els.throttle) {
      const tIdx = p.throttleIndex;
      if (c.throttle !== tIdx) {
        c.throttle = tIdx;
        const percent = CONFIG.flight.throttleLevels[tIdx] * 100;
        els.throttle.textContent = Math.round(percent) + '%';
      }
    }

    // 波次（关卡号）
    if (els.wave && waveSystem) {
      const w = waveSystem.currentWave;
      if (c.wave !== w) {
        c.wave = w;
        els.wave.textContent = w;
      }
    }

    // 时间与天气
    if (els.timeValue && timeWeatherSystem) {
      const h = Math.floor(timeWeatherSystem.gameHour);
      const m = Math.floor((timeWeatherSystem.gameHour - h) * 60);
      const tStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      if (c.timeStr !== tStr) {
        c.timeStr = tStr;
        els.timeValue.textContent = tStr;
      }

      let wIcon = '☀️';
      if (timeWeatherSystem.weather === 'rain') {
        wIcon = '🌧️';
      } else if (timeWeatherSystem.gameHour >= 17 && timeWeatherSystem.gameHour < 19.5) {
        wIcon = '🌅';
      } else if (timeWeatherSystem.gameHour >= 19.5 || timeWeatherSystem.gameHour < 6) {
        wIcon = '🌙';
      }
      if (c.weatherIcon !== wIcon) {
        c.weatherIcon = wIcon;
        els.weatherIcon.textContent = wIcon;
      }
    }

    // 导弹数
    if (els.missiles) {
      if (c.missiles !== p.missiles) {
        c.missiles = p.missiles;
        els.missiles.textContent = p.missiles;
      }
    }

    // 干扰弹数
    if (els.flares) {
      if (c.flares !== p.flares) {
        c.flares = p.flares;
        els.flares.textContent = p.flares;
      }
    }

    // 敌机存活数
    if (els.enemies && waveSystem) {
      const info = waveSystem.getInfo();
      if (c.enemies !== info.enemiesAlive) {
        c.enemies = info.enemiesAlive;
        els.enemies.textContent = info.enemiesAlive;
      }
    }

    // 关卡击杀进度
    if (els.levelKills && waveSystem) {
      const info = waveSystem.getInfo();
      const text = `${info.levelKills}/${info.requiredKills}`;
      if (c.levelKills !== text) {
        c.levelKills = text;
        els.levelKills.textContent = text;
      }
    }

    // 血量条
    if (els.healthBar) {
      const hp = Math.round((p.health / CONFIG.player.maxHealth) * 100);
      if (c.healthPct !== hp) {
        c.healthPct = hp;
        els.healthBar.style.width = hp + '%';
        const isLow = hp < 30;
        if (c.healthLow !== isLow) {
          c.healthLow = isLow;
          els.healthBar.style.background = isLow
            ? 'linear-gradient(90deg, #ff4444, #ff0000)'
            : 'linear-gradient(90deg, #00ff88, #00cc66)';
        }
      }
    }
    if (els.healthValue) {
      const hv = Math.round(p.health);
      if (c.healthVal !== hv) {
        c.healthVal = hv;
        els.healthValue.textContent = hv + '%';
      }
    }

    // 热度条
    if (els.heatBar) {
      const heat = Math.round(p.heat);
      if (c.heat !== heat) {
        c.heat = heat;
        els.heatBar.style.width = p.heat + '%';
      }
      if (c.overheated !== p.isOverheated) {
        c.overheated = p.isOverheated;
        if (p.isOverheated) {
          els.heatBar.classList.add('overheated');
        } else {
          els.heatBar.classList.remove('overheated');
        }
      }
    }
    if (els.heatValue) {
      const hv = Math.round(p.heat);
      if (c.heatVal !== hv) {
        c.heatVal = hv;
        els.heatValue.textContent = hv + '%';
      }
    }

    // Boost 条
    if (els.boostBar) {
      const b = Math.round(p.boostEnergy);
      if (c.boost !== b) {
        c.boost = b;
        els.boostBar.style.width = p.boostEnergy + '%';
      }
    }
    if (els.boostValue) {
      const bv = Math.round(p.boostEnergy);
      if (c.boostVal !== bv) {
        c.boostVal = bv;
        els.boostValue.textContent = bv + '%';
      }
    }

    // 锁定状态
    if (els.lockStatus && this.weaponSystem) {
      const ws = this.weaponSystem;
      let text, cls;
      if (ws.isLocked && ws.lockTarget) {
        text = i18n.t('hud_lock_locked');
        cls = 'hud-lock-status locked';
      } else if (ws.lockTarget && ws.lockProgress > 0) {
        const remaining = ((1 - ws.lockProgress) * CONFIG.weapons.missile.lockTime).toFixed(1);
        text = i18n.t('hud_lock_locking', [remaining]);
        cls = 'hud-lock-status locking';
      } else {
        text = i18n.t('hud_lock_none');
        cls = 'hud-lock-status no-target';
      }
      if (c.lockText !== text) {
        c.lockText = text;
        els.lockStatus.textContent = text;
      }
      if (c.lockClass !== cls) {
        c.lockClass = cls;
        els.lockStatus.className = cls;
      }
    }

    // 自动导航状态
    if (els.autoNav && this.flightPhysics) {
      const visible = this.flightPhysics.autoNavEnabled;
      if (c.autoNavVisible !== visible) {
        c.autoNavVisible = visible;
        els.autoNav.style.display = visible ? 'flex' : 'none';
      }
      if (visible && els.autoNavDist && this.flightPhysics.autoNavTarget) {
        const dist = Math.round(p.mesh.position.distanceTo(
          this.flightPhysics.autoNavTarget.mesh.position
        ));
        if (c.autoNavDist !== dist) {
          c.autoNavDist = dist;
          els.autoNavDist.textContent = dist + 'm';
        }
      }
    }

    // Buff 道具状态
    this._updateBuffs(powerUpSystem);
  }

  /**
   * 更新 Buff 道具的 HUD 显示（增量更新，避免每帧重建 DOM）
   */
  _updateBuffs(powerUpSystem) {
    if (!this.els.buffs || !powerUpSystem) return;
    const buffs = powerUpSystem.getActiveBuffs();
    const container = this.els.buffs;

    // 只在 buff 数量变化时重建 DOM
    if (this._cache.buffCount !== buffs.length) {
      this._cache.buffCount = buffs.length;
      container.innerHTML = '';

      for (const buff of buffs) {
        const item = document.createElement('div');
        item.className = 'buff-item';
        item.dataset.buffId = buff.id;
        item.innerHTML = `
          <span>${buff.icon}</span>
          <div class="buff-timer">
            <svg viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" stroke="${buff.color}" />
            </svg>
          </div>
        `;
        container.appendChild(item);
      }
    }

    // 更新各 buff 的进度和状态（只修改属性，不重建）
    const items = container.children;
    for (let i = 0; i < buffs.length && i < items.length; i++) {
      const buff = buffs[i];
      const item = items[i];

      // 过期闪烁样式
      if (buff.remaining <= 3) {
        item.classList.add('expiring');
      } else {
        item.classList.remove('expiring');
      }

      // 更新进度环
      const circle = item.querySelector('circle');
      if (circle) {
        const progress = buff.remaining / buff.duration;
        const circumference = 2 * Math.PI * 20;
        const offset = circumference * (1 - progress);
        circle.setAttribute('stroke-dasharray', String(circumference));
        circle.setAttribute('stroke-dashoffset', String(offset));
      }

      item.title = `${buff.name} — ${Math.ceil(buff.remaining)}s`;
    }
  }
}
