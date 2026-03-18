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
      fireRate: 10, // 每秒射速
      bulletSpeed: 300, // 子弹速度
      bulletMaxDistance: 800, // 子弹最大距离
      damage: 8, // 每发伤害
      heatPerShot: 0.8, // 每发增加热度百分比
      cooldownRate: 5, // 每秒冷却百分比
      overheatLockTime: 3.0, // 过热锁定时间（秒）
    },
    // 导弹
    missile: {
      maxCount: 6, // 每局最大数量
      speed: 180, // 导弹速度
      turnRate: 3.0, // 导弹转向速率
      damage: 50, // 命中伤害
      lockTime: 2.0, // 锁定所需时间（秒）
      lockAngle: Math.PI / 3, // 锁定锥角 (60°)
      lockRange: 2000, // 锁定最大距离
      maxLifetime: 8.0, // 导弹最大生命时间
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

  // AI 敌机
  enemy: {
    maxHealth: 60,
    speed: 50,
    fireRate: 3, // 每秒射速
    detectionRange: 500, // 检测玩家的距离
    attackRange: 300, // 开火距离
    spawnCount: 5, // 按 N 一次生成的数量
    spawnRadius: 400, // 生成半径
  },

  // 相机
  camera: {
    fov: 60,
    nearClip: 0.1,
    farClip: 10000,
    followDistance: 15, // 跟随距离
    followHeight: 5, // 跟随高度
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
};
