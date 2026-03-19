/**
 * 游戏全局配置
 * 所有可调参数集中管理
 */
export const CONFIG = {
  // 飞行物理
  flight: {
    // 油门档位 (5 档)
    throttleLevels: [0, 0.25, 0.5, 0.75, 1.0],
    defaultThrottleIndex: 2, // 默认 50%
    // 速度范围 (单位：Three.js 场景单位/秒)
    minSpeed: 5,
    maxSpeed: 120,
    // 加减速的 lerp 系数
    accelerationLerp: 0.02,
    // 旋转速度 (弧度/秒)
    pitchSpeed: 1.2,
    yawSpeed: 1.0,
    rollSpeed: 2.0, // 自动倾斜的速度
    maxRollAngle: Math.PI / 4, // 最大自动倾斜角度 (45°)
    rollReturnSpeed: 3.0, // 松手后回正速度
    // 自动稳定
    stabilizationSpeed: 2.0,
    // 失速
    stallSpeed: 8,
    stallPitchRate: 0.3, // 失速时自动下坠的俯冲速率
    // 重力对飞行的影响
    gravityEffect: 0.015, // 爬升减速/俯冲加速的系数
  },

  // Boost 系统
  boost: {
    multiplier: 1.5, // Boost 时的速度倍数
    maxDuration: 3.0, // 最大持续秒数
    consumeRate: 33.3, // 每秒消耗百分比
    rechargeRate: 20.0, // 每秒恢复百分比
    rechargeDelay: 0.5, // 松开 Shift 后开始恢复的延迟
  },

  // 武器系统
  weapons: {
    // 机枪
    gun: {
      fireRate: 18, // 每秒射速（提升火力密度）
      bulletSpeed: 500, // 子弹速度（更快命中）
      bulletMaxDistance: 800, // 子弹最大距离
      damage: 8, // 每发伤害
      heatPerShot: 0.4, // 每发增加热度百分比（适配高射速）
      cooldownRate: 8, // 每秒冷却百分比（更快冷却）
      overheatLockTime: 3.0, // 过热锁定时间（秒）
    },
    // 导弹（制导型，类似现代空空导弹）
    missile: {
      maxCount: 8, // 每局最大数量
      speed: 200, // 导弹速度（比敌机快得多）
      turnRate: 5.0, // 导弹转向速率（高追踪能力）
      damage: 60, // 命中伤害（一发击杀）
      lockTime: 3.0, // 锁定所需时间（3 秒倒计时）
      lockAngle: Math.PI / 2, // 锁定锥角 (90°，更宽广)
      lockRange: 2500, // 锁定最大距离
      maxLifetime: 12.0, // 导弹最大存活时间（更持久追踪）
      leadFactor: 0.8, // 预判拦截系数
    },
    // 干扰弹
    flare: {
      maxCount: 4, // 每局最大数量
      attractRadius: 100, // 吸引导弹半径
      lifetime: 3.0, // 干扰弹存在时间
    },
  },

  // 玩家
  player: {
    maxHealth: 100,
    respawnDelay: 2.0, // 死亡后重生延迟（秒）
  },

  // AI 敌机（已削弱）
  enemy: {
    maxHealth: 30, // 血量降低，更容易击杀
    speed: 40, // 速度降低
    fireRate: 1.5, // 射速大幅降低
    detectionRange: 250, // 检测范围缩小
    attackRange: 150, // 攻击范围缩小
    spawnCount: 3, // 每次生成数量减少
    spawnRadius: 300, // 生成半径（靠近玩家保证能检测到）
    bulletDamage: 3, // 子弹伤害降低
    accuracy: 0.08, // 射击散布增大（准度降低）
  },

  // 相机
  camera: {
    fov: 60,
    nearClip: 0.1,
    farClip: 10000,
    followDistance: 25, // 跟随距离（拉远相机，让飞机不挡视野）
    followHeight: 8, // 跟随高度（稍微抬高，视野更开阔）
    followLerp: 0.05, // 跟随平滑系数
    boostFov: 80, // Boost 时的 FOV
    fovLerp: 0.05, // FOV 变化平滑系数
  },

  // 场景
  world: {
    skyColor: 0x87CEEB,
    groundSize: 20000,
    fogNear: 500,
    fogFar: 8000,
    cloudCount: 30,
    cloudSpread: 3000,
    cloudHeight: [200, 600],
  },

  // 画质预设
  quality: {
    low: {
      shadows: false,
      antialias: false,
      pixelRatio: 1,
      particleMultiplier: 0.3,
      fogFar: 4000,
    },
    medium: {
      shadows: false,
      antialias: true,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      particleMultiplier: 0.7,
      fogFar: 6000,
    },
    high: {
      shadows: true,
      antialias: true,
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      particleMultiplier: 1.0,
      fogFar: 8000,
    },
  },

  // 盲盒道具系统
  powerUp: {
    // 地图刷新
    mapSpawn: {
      intervalMin: 15,       // 最小刷新间隔（秒）
      intervalMax: 25,       // 最大刷新间隔（秒）
      maxOnMap: 3,           // 地图上最多同时存在
      spawnRadius: 500,      // 生成范围半径（以玩家为中心）
      spawnHeightMin: 100,   // 最低生成高度
      spawnHeightMax: 400,   // 最高生成高度
      lifetime: 30,          // 盲盒存在时间（秒）
    },
    // 击杀掉落
    killDrop: {
      chance: 0.4,           // 40% 掉落概率
    },
    // 关卡奖励稀有度加成
    levelReward: {
      rarityBonus: 0.05,     // 每关 +5% 高稀有度概率
    },
    // 拾取半径
    pickupRadius: 25,
    // 稀有度权重
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
    // 稀有度中文名
    rarityNames: {
      common: '普通',
      rare: '稀有',
      epic: '史诗',
      legendary: '传说',
    },
    // 各道具的持续时间范围（秒）[min, max]
    durationByRarity: {
      common: [5, 8],
      rare: [8, 12],
      epic: [12, 15],
      legendary: [15, 20],
    },
  },
};
