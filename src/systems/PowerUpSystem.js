import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';
import { PowerUpBox } from '../entities/PowerUpBox.js';

/**
 * 盲盒道具系统
 * 管理盲盒的生成、碰撞拾取、道具效果施加、buff 计时
 */
export class PowerUpSystem {
  constructor(player, scene, particleSystem, gameState, screenEffects) {
    this.player = player;
    this.scene = scene;
    this.particleSystem = particleSystem;
    this.gameState = gameState;
    this.screenEffects = screenEffects;

    // 场景中所有盲盒
    this._boxes = [];
    // 玩家当前激活的 buff
    this._activeBuffs = [];

    // 地图刷新计时
    this._spawnTimer = 0;
    this._nextSpawnInterval = this._randomInterval();

    // === 道具池 ===
    this._powerUpPool = {
      common: [
        { id: 'heal', name: '急救包', icon: '❤️', desc: '+30 HP', instant: true },
        { id: 'flare_refill', name: '干扰弹补给', icon: '🎆', desc: '+2 干扰弹', instant: true },
        { id: 'cooldown_boost', name: '冷却强化', icon: '❄️', desc: '冷却速率×3', instant: false, buffKey: '_buffCooldown' },
      ],
      rare: [
        { id: 'missile_refill', name: '导弹补给', icon: '🚀', desc: '+N 导弹', instant: true },
        { id: 'no_overheat', name: '无限火力', icon: '🔥', desc: '机枪不过热', instant: false, buffKey: '_buffNoOverheat' },
        { id: 'infinite_boost', name: '无限加力', icon: '⚡', desc: 'Boost 不消耗', instant: false, buffKey: '_buffInfiniteBoost' },
      ],
      epic: [
        { id: 'double_damage', name: '双倍伤害', icon: '💥', desc: '伤害×2', instant: false, buffKey: '_buffDoubleDamage' },
        { id: 'speed_boost', name: '极速模式', icon: '🏎️', desc: '最高速度×1.8', instant: false, buffKey: '_buffSpeedBoost' },
        { id: 'scatter_shot', name: '散射弹幕', icon: '🌟', desc: '三发散射', instant: false, buffKey: '_buffScatterShot' },
      ],
      legendary: [
        { id: 'invincible', name: '无敌护甲', icon: '🛡️', desc: '免疫伤害', instant: false, buffKey: '_buffInvincible' },
        { id: 'time_slow', name: '时间减速', icon: '⏳', desc: '敌机减速50%', instant: false, buffKey: '_buffTimeSlow' },
        { id: 'full_restore', name: '全满补给', icon: '🎁', desc: '全部回满', instant: true },
      ],
    };
  }

  /**
   * 每帧更新
   */
  update(dt) {
    if (this.player.isDestroyed) return;

    // 1. 地图定时刷新盲盒
    this._updateMapSpawn(dt);

    // 2. 更新所有盲盒（动画 + 寿命）
    this._updateBoxes(dt);

    // 3. 碰撞检测（玩家 vs 盲盒）
    this._checkPickup();

    // 4. 更新 buff 计时
    this._removeExpiredBuffs(dt);
  }

  /**
   * 击杀掉落：在指定位置尝试生成盲盒
   */
  tryKillDrop(position) {
    if (Math.random() < CONFIG.powerUp.killDrop.chance) {
      this._spawnBox(position);
    }
  }

  /**
   * 关卡奖励：直接抽取道具并施加（不生成 3D 盲盒）
   */
  grantLevelReward(level) {
    const rarityBonus = level * CONFIG.powerUp.levelReward.rarityBonus;
    const rarity = this._rollRarity(rarityBonus);
    const powerUp = this._rollPowerUp(rarity);
    this._applyPowerUp(powerUp, rarity);

    // 显示关卡奖励通知
    const rarityName = CONFIG.powerUp.rarityNames[rarity];
    this._showPowerUpNotification(powerUp, rarity, `关卡 ${level} 奖励`);
  }

  /**
   * 获取当前所有活跃 buff（供 HUD 读取）
   */
  getActiveBuffs() {
    return this._activeBuffs;
  }

  /**
   * 清除所有 buff（重生时调用）
   */
  clearAllBuffs() {
    for (const buff of this._activeBuffs) {
      this.player[buff.buffKey] = false;
    }
    this._activeBuffs = [];
  }

  // ===================== 内部方法 =====================

  /**
   * 地图定时刷新盲盒
   */
  _updateMapSpawn(dt) {
    this._spawnTimer += dt;
    if (this._spawnTimer >= this._nextSpawnInterval) {
      this._spawnTimer = 0;
      this._nextSpawnInterval = this._randomInterval();

      // 检查地图上的盲盒数量上限
      const aliveBoxes = this._boxes.filter(b => !b.isCollected);
      if (aliveBoxes.length < CONFIG.powerUp.mapSpawn.maxOnMap) {
        const pos = this._randomSpawnPosition();
        this._spawnBox(pos);
      }
    }
  }

  /**
   * 在指定位置生成一个盲盒
   */
  _spawnBox(position) {
    const rarity = this._rollRarity();
    const box = new PowerUpBox(position, rarity);
    this._boxes.push(box);
    this.scene.add(box.mesh);
  }

  /**
   * 更新所有盲盒（动画 + 清理过期的）
   */
  _updateBoxes(dt) {
    for (let i = this._boxes.length - 1; i >= 0; i--) {
      const box = this._boxes[i];
      box.update(dt);

      // 收集动画结束 或 到期消失 → 从场景移除
      if (box.isReadyToRemove() || (box.isCollected && box._collectAnim >= 1)) {
        this.scene.remove(box.mesh);
        box.dispose();
        this._boxes.splice(i, 1);
      }
    }
  }

  /**
   * 碰撞检测：玩家是否飞过盲盒
   */
  _checkPickup() {
    const playerPos = this.player.mesh.position;
    const pickupR = CONFIG.powerUp.pickupRadius;

    for (const box of this._boxes) {
      if (box.isCollected) continue;

      const dist = playerPos.distanceTo(box.mesh.position);
      if (dist < pickupR) {
        this._pickupBox(box);
      }
    }
  }

  /**
   * 拾取盲盒 → 抽取道具 → 施加效果
   */
  _pickupBox(box) {
    box.collect();

    const rarity = box.rarity;
    const powerUp = this._rollPowerUp(rarity);
    const color = CONFIG.powerUp.rarityColors[rarity];

    // 施加效果
    this._applyPowerUp(powerUp, rarity);

    // 拾取粒子特效
    if (this.particleSystem) {
      this.particleSystem.createPowerUpPickup(box.mesh.position.clone(), color);
    }

    // 屏幕闪光
    if (this.screenEffects) {
      const hexColor = '#' + new THREE.Color(color).getHexString();
      this.screenEffects.flashPowerUp(hexColor);
    }

    // 通知
    this._showPowerUpNotification(powerUp, rarity);
  }

  /**
   * 施加道具效果
   */
  _applyPowerUp(powerUpDef, rarity) {
    const p = this.player;

    if (powerUpDef.instant) {
      // 即时效果
      switch (powerUpDef.id) {
        case 'heal':
          p.health = Math.min(p.health + 30, CONFIG.player.maxHealth);
          break;
        case 'flare_refill':
          p.flares = Math.min(p.flares + 2, CONFIG.weapons.flare.maxCount + 2);
          break;
        case 'missile_refill': {
          const count = 2 + Math.floor(Math.random() * 3); // 2-4 枚
          p.missiles = Math.min(p.missiles + count, CONFIG.weapons.missile.maxCount + 4);
          // 更新描述
          powerUpDef.desc = `+${count} 导弹`;
          break;
        }
        case 'full_restore':
          p.health = CONFIG.player.maxHealth;
          p.missiles = CONFIG.weapons.missile.maxCount;
          p.flares = CONFIG.weapons.flare.maxCount;
          p.heat = 0;
          p.isOverheated = false;
          p.boostEnergy = 100;
          break;
      }
    } else {
      // 持续效果 → 加入 buff 列表
      const durationRange = CONFIG.powerUp.durationByRarity[rarity];
      const duration = durationRange[0] + Math.random() * (durationRange[1] - durationRange[0]);

      // 如果已有同类 buff，刷新时间
      const existing = this._activeBuffs.find(b => b.id === powerUpDef.id);
      if (existing) {
        existing.remaining = duration;
        existing.duration = duration;
      } else {
        // 激活 buff
        p[powerUpDef.buffKey] = true;

        const color = '#' + new THREE.Color(CONFIG.powerUp.rarityColors[rarity]).getHexString();
        this._activeBuffs.push({
          id: powerUpDef.id,
          name: powerUpDef.name,
          icon: powerUpDef.icon,
          buffKey: powerUpDef.buffKey,
          duration: duration,
          remaining: duration,
          color: color,
        });
      }
    }
  }

  /**
   * 更新 buff 计时，移除过期的
   */
  _removeExpiredBuffs(dt) {
    for (let i = this._activeBuffs.length - 1; i >= 0; i--) {
      const buff = this._activeBuffs[i];
      buff.remaining -= dt;

      if (buff.remaining <= 0) {
        // 移除 buff
        this.player[buff.buffKey] = false;
        this._activeBuffs.splice(i, 1);

        // 通知 buff 过期
        this.gameState.showNotification(`${buff.icon} ${buff.name} 已过期`);
      }
    }
  }

  /**
   * 按权重随机选择稀有度
   */
  _rollRarity(bonusWeight = 0) {
    const weights = { ...CONFIG.powerUp.rarityWeights };

    // 加成：提高高稀有度权重
    if (bonusWeight > 0) {
      weights.rare += bonusWeight * 100;
      weights.epic += bonusWeight * 60;
      weights.legendary += bonusWeight * 30;
    }

    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let rand = Math.random() * total;

    for (const [rarity, weight] of Object.entries(weights)) {
      rand -= weight;
      if (rand <= 0) return rarity;
    }

    return 'common'; // 保底
  }

  /**
   * 从指定稀有度的道具池中随机选一个
   */
  _rollPowerUp(rarity) {
    const pool = this._powerUpPool[rarity];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * 显示道具获取通知（屏幕中央大字提示）
   */
  _showPowerUpNotification(powerUp, rarity, prefix = '') {
    const rarityName = CONFIG.powerUp.rarityNames[rarity];
    const color = '#' + new THREE.Color(CONFIG.powerUp.rarityColors[rarity]).getHexString();

    const container = document.getElementById('notifications-container');
    if (!container) return;

    const notif = document.createElement('div');
    notif.className = 'powerup-notification';
    notif.style.color = color;
    notif.style.borderColor = color;
    notif.style.background = `rgba(0,0,0,0.7)`;
    notif.style.border = `2px solid ${color}`;

    const prefixText = prefix ? `${prefix} · ` : '';
    notif.innerHTML = `
      <div style="font-size:28px;margin-bottom:4px">${powerUp.icon}</div>
      <div>${prefixText}${rarityName}</div>
      <div style="font-size:14px;opacity:0.8;margin-top:2px">${powerUp.name} — ${powerUp.desc}</div>
    `;

    document.body.appendChild(notif);

    // 2 秒后自动移除
    setTimeout(() => {
      if (notif.parentNode) notif.remove();
    }, 2000);
  }

  /**
   * 随机生成位置（玩家附近）
   */
  _randomSpawnPosition() {
    const mc = CONFIG.powerUp.mapSpawn;
    const pPos = this.player.mesh.position;
    const angle = Math.random() * Math.PI * 2;
    const dist = mc.spawnRadius * 0.3 + Math.random() * mc.spawnRadius * 0.7;

    return new THREE.Vector3(
      pPos.x + Math.cos(angle) * dist,
      mc.spawnHeightMin + Math.random() * (mc.spawnHeightMax - mc.spawnHeightMin),
      pPos.z + Math.sin(angle) * dist
    );
  }

  /**
   * 随机刷新间隔
   */
  _randomInterval() {
    const mc = CONFIG.powerUp.mapSpawn;
    return mc.intervalMin + Math.random() * (mc.intervalMax - mc.intervalMin);
  }
}
