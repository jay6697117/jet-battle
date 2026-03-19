# 盲盒道具系统设计文档

## 概述

为"德黑兰的反击"喷气机空战游戏增加**盲盒（Mystery Box）道具系统**，玩家可以通过地图拾取、击杀掉落、关卡奖励等多种方式获得随机道具，道具分为四个稀有度等级，拾取时有酷炫的视觉效果。

---

## 一、获取方式（混合模式）

| 方式 | 触发条件 | 频率 |
|------|---------|------|
| 🌍 地图刷新 | 战斗区域随机位置生成漂浮盲盒 | 每 15-25 秒刷新一个，地图上最多同时 3 个 |
| 💀 击杀掉落 | 玩家击杀敌机后有概率掉落 | 40% 概率在敌机残骸位置生成 |
| 🏆 关卡奖励 | 每过一关自动获得 | 100%，且稀有度随关卡提升 |

---

## 二、稀有度体系

| 等级 | 颜色 | 概率 | 道具持续时间 | 光效 |
|------|------|------|-------------|------|
| 🟢 普通 (Common) | 绿色 `#00ff88` | 50% | 5-8 秒 | 微弱绿光 |
| 🔵 稀有 (Rare) | 蓝色 `#4488ff` | 30% | 8-12 秒 | 蓝色光柱 |
| 🟣 史诗 (Epic) | 紫色 `#aa44ff` | 15% | 12-15 秒 | 紫色光柱 + 粒子环绕 |
| 🟠 传说 (Legendary) | 金色 `#ffaa00` | 5% | 15-20 秒 | 金色光柱 + 旋转粒子 + 脉冲波 |

> 关卡奖励的稀有度加成：每升一关 +5% 获得更高稀有度的概率。

---

## 三、道具池

### 🟢 普通 (Common) — 50%

| 道具名称 | 效果 | 图标提示 |
|---------|------|---------|
| 急救包 | 恢复 30 点生命值（即时） | ❤️ +30 HP |
| 干扰弹补给 | 补充 2 枚干扰弹（即时） | 🎆 +2 干扰弹 |
| 冷却强化 | 机枪冷却速率 ×3，持续时间内 | ❄️ 冷却强化 |

### 🔵 稀有 (Rare) — 30%

| 道具名称 | 效果 | 图标提示 |
|---------|------|---------|
| 导弹补给 | 补充 2-4 枚随机数量的导弹（即时） | 🚀 +N 导弹 |
| 机枪不过热 | 机枪完全不过热，持续时间内 | 🔥 无限火力 |
| 加力无限 | Boost 能量不消耗，持续时间内 | ⚡ 无限加力 |

### 🟣 史诗 (Epic) — 15%

| 道具名称 | 效果 | 图标提示 |
|---------|------|---------|
| 双倍伤害 | 所有武器伤害 ×2，持续时间内 | 💥 双倍伤害 |
| 高速飞行 | 最大速度 ×1.8，持续时间内 | 🏎️ 极速模式 |
| 散射子弹 | 每次射击发出 3 发扇形子弹，持续时间内 | 🌟 散射弹幕 |

### 🟠 传说 (Legendary) — 5%

| 道具名称 | 效果 | 图标提示 |
|---------|------|---------|
| 无敌护甲 | 完全免疫所有伤害，持续时间内 | 🛡️ 无敌护甲 |
| 时间减速 | 所有敌机速度和射速降低 50%，持续时间内 | ⏳ 时间减速 |
| 全弹药满载 | 生命值满 + 导弹满 + 干扰弹满 + 冷却清零（即时） | 🎁 全满补给 |

---

## 四、架构设计

采用**独立系统架构**（方案 A），新增两个核心文件：

### 4.1 文件结构

```
src/
├── entities/
│   └── PowerUpBox.js    [NEW]  — 盲盒实体（3D 旋转立方体 + 光效）
├── systems/
│   └── PowerUpSystem.js [NEW]  — 盲盒系统（生成、碰撞、效果管理）
├── utils/
│   └── Config.js        [MODIFY] — 新增 powerUp 配置块
├── main.js              [MODIFY] — 接入 PowerUpSystem
├── systems/
│   ├── HUDSystem.js     [MODIFY] — 新增 buff 图标 + 倒计时条
│   ├── CollisionSystem.js [MODIFY] — 无敌护甲时跳过伤害
│   ├── WeaponSystem.js  [MODIFY] — 支持双倍伤害/散射/不过热
│   └── FlightPhysics.js [MODIFY] — 支持高速飞行 buff
│   └── ParticleSystem.js [MODIFY] — 新增盲盒粒子特效
└── style.css            [MODIFY] — 盲盒 HUD 相关样式
index.html               [MODIFY] — 新增 buff 状态 HUD 容器
```

### 4.2 PowerUpBox.js — 盲盒实体

```
职责：
- 3D 旋转立方体 mesh（带发光材质）
- 上下浮动动画（sin 波）
- 光柱效果（PointLight + 柱形 mesh）
- 稀有度决定颜色和光效强度
- 碰撞检测半径 = 20 单位
- 存在时间 30 秒后自动消失

属性：
- mesh: THREE.Group
- rarity: 'common' | 'rare' | 'epic' | 'legendary'
- isCollected: boolean
- lifetime / maxLifetime
- pickupRadius: 20
```

### 4.3 PowerUpSystem.js — 盲盒系统

```
职责：
- 管理盲盒的生成（地图随机 + 击杀掉落 + 关卡奖励）
- 检测玩家与盲盒的碰撞
- 随机选择道具（根据稀有度概率）
- 施加道具效果到玩家
- 管理所有活跃 buff 的计时和过期清除
- 提供 HUD 所需的 buff 数据

核心方法：
- update(dt)           — 每帧更新（生成计时、碰撞检测、buff 计时）
- spawnAtPosition(pos)  — 在指定位置生成盲盒（击杀掉落）
- grantLevelReward(level) — 关卡奖励
- _rollPowerUp(rarity)  — 按概率抽取道具
- _applyEffect(powerUp) — 施加效果
- _removeEffect(buffId) — 移除过期效果
- getActiveBuffs()      — 返回活跃 buff 列表（供 HUD）

与现有系统的交互方式：
- 构造函数接收 player, scene, particleSystem, gameState
- 通过引用 player 直接修改属性（health, missiles, flares 等）
- 通过公开的 buff 标记让其他系统查询状态：
  - player._buffInvincible = true/false  （CollisionSystem 检查）
  - player._buffDoubleDamage = true/false（WeaponSystem 检查）
  - player._buffScatterShot = true/false （WeaponSystem 检查）
  - player._buffNoOverheat = true/false  （WeaponSystem 检查）
  - player._buffSpeedBoost = true/false  （FlightPhysics 检查）
  - player._buffInfiniteBoost = true/false（FlightPhysics 检查）
  - player._buffCooldown = true/false    （WeaponSystem 检查）
  - player._buffTimeSlow = true/false    （AISystem 检查）
```

### 4.4 现有系统改动

**CollisionSystem.js**：在 `_checkEnemyBulletsVsPlayer()` 和 `_checkJetCollisions()` 开头检查 `player._buffInvincible`，若为 true 则跳过伤害。

**WeaponSystem.js**：
- `_fireGun()`：检查 `_buffNoOverheat` 跳过热度累积，检查 `_buffDoubleDamage` 使伤害 ×2，检查 `_buffScatterShot` 发出 3 发子弹
- 检查 `_buffCooldown` 使冷却速率 ×3

**FlightPhysics.js**：
- 速度计算时检查 `_buffSpeedBoost`，将 maxSpeed ×1.8
- boost 能量消耗时检查 `_buffInfiniteBoost`，为 true 时不消耗

**AISystem.js**：检查被攻击的 player 的 `_buffTimeSlow`，若 true 则敌机速度和射速 ×0.5

**ParticleSystem.js**：新增 `createPowerUpPickup(position, color)` 方法，拾取时发出彩色粒子爆发

---

## 五、视觉效果设计

### 5.1 盲盒外观
- 旋转立方体（每秒旋转 90°）
- 上下浮动（sin 波振幅 2 单位，频率 1Hz）
- 稀有度对应颜色的发光材质 (emissive)
- 底部光柱（稀有以上才有，柱形半透明 mesh）
- 传说级额外有旋转粒子光环

### 5.2 拾取效果
- 盲盒缩放到 0 并消失（0.3 秒 tween）
- 彩色粒子向外爆发（用 ParticleSystem）
- 短暂 0.2 秒慢动作（game.timeScale = 0.5 然后恢复）
- 屏幕闪烁对应稀有度颜色
- 传说级全屏金色光波

### 5.3 HUD Buff 显示
- 屏幕右侧竖排显示活跃 buff 图标
- 每个 buff 有圆形图标 + 倒计时环形进度条
- 临近过期时闪烁警告（剩余 3 秒）
- 即时效果只显示短暂飘字通知

---

## 六、配置参数（Config.js 新增）

```js
powerUp: {
  // 地图刷新
  mapSpawn: {
    interval: [15, 25],    // 随机间隔（秒）
    maxOnMap: 3,           // 地图上最大同时存在数
    spawnRadius: 500,      // 生成范围半径
    spawnHeight: [100, 400], // 生成高度范围
    lifetime: 30,          // 盲盒存在时间（秒）
  },
  // 击杀掉落
  killDrop: {
    chance: 0.4,           // 40% 掉落概率
  },
  // 关卡奖励
  levelReward: {
    rarityBonus: 0.05,     // 每关 +5% 高稀有度概率
  },
  // 碰撞检测
  pickupRadius: 20,
  // 稀有度概率
  rarityWeights: {
    common: 50,
    rare: 30,
    epic: 15,
    legendary: 5,
  },
  // 稀有度颜色
  rarityColors: {
    common: 0x00ff88,
    rare: 0x4488ff,
    epic: 0xaa44ff,
    legendary: 0xffaa00,
  },
}
```

---

## 七、游戏循环集成

在 `main.js` 的 update 循环中，在步骤 6（碰撞检测）之后、步骤 7（粒子特效）之前插入：

```
// 6.5 道具盲盒系统更新
powerUpSystem.update(dt);
```

事件绑定：
- `collisionSystem.onEnemyKilled` 回调中增加 → `powerUpSystem.spawnAtPosition(pos)`
- `waveSystem` 关卡完成时 → `powerUpSystem.grantLevelReward(level)`
