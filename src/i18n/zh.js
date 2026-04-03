/**
 * 中文语言包
 */
export default {
  // === 页面标题 ===
  page_title: '德黑兰的反击 — 现代喷气机空战',
  page_desc: '德黑兰的反击 - 一款基于 Three.js 的现代喷气机 3D 空战游戏，支持桌面和移动端',

  // === 主菜单 ===
  menu_title: '德黑兰的',
  menu_title_br: '反击',
  menu_subtitle: '[ SYSTEM ONLINE / 现代空战 ]',
  btn_solo: '单人任务',
  btn_solo_desc: '对战 AI 敌机',
  menu_footer_desktop: 'WASD 飞行 | ←→ 滚转 | ↑↓ 油门 | Space 射击 | E 导弹',
  menu_footer_mobile: '摇杆飞行 | 滑杆油门 | 点击射击和发射导弹',

  // === 语言切换按钮 ===
  lang_btn: '中文',

  // === 操控说明 ===
  instructions_title: '德黑兰的反击',
  instructions_subtitle: '操控指南',
  ctrl_flight: '飞行操控',
  ctrl_climb: '爬升',
  ctrl_dive: '俯冲',
  ctrl_left: '左转',
  ctrl_right: '右转',
  ctrl_roll_left: '左滚转',
  ctrl_roll_right: '右滚转',
  ctrl_throttle: '油门控制',
  ctrl_accel: '加速（油门+1档）',
  ctrl_decel: '减速（油门-1档）',
  ctrl_boost: '增强加速',
  ctrl_combat: '战斗操作',
  ctrl_gun: '机枪射击',
  ctrl_missile: '发射导弹',
  ctrl_flare: '释放干扰弹',
  ctrl_assist: '辅助功能',
  ctrl_autonav: '自动导航',
  ctrl_stabilize: '自动稳定',
  ctrl_spawn: '生成敌机',
  ctrl_respawn: '重生',
  ctrl_leaderboard: '排行榜',
  ctrl_settings: '设置菜单',
  ctrl_debug: '调试面板',
  ctrl_close_hint_desktop: '按任意键开始战斗',
  // 移动端操控
  ctrl_joystick: '摇杆方向控制',
  ctrl_tilt: '倾斜手机滚转',
  ctrl_throttle_slider: '油门滑杆加减速',
  ctrl_throttle_boost: '油门>90% Boost',
  ctrl_fire_btn: '开火按钮 机枪',
  ctrl_missile_btn: '导弹按钮 发射',
  ctrl_flare_btn: '黄星按钮 干扰弹',
  ctrl_radar_dbl: '双击雷达 导航',
  ctrl_joystick_hold: '长按摇杆 稳定',
  ctrl_swipe_up: '底部上滑 排行榜',
  ctrl_settings_btn: '左上角 设置菜单',
  ctrl_close_hint_mobile: '点击屏幕开始战斗',

  // === HUD ===
  hud_speed: '速度',
  hud_altitude: '高度',
  hud_throttle: '油门',
  hud_wave: '关卡',
  hud_missiles: '导弹',
  hud_flares: '干扰弹',
  hud_enemies: '敌机',
  hud_kills_label: '击杀',
  hud_health: '生命值',
  hud_heat: '热量',
  hud_boost: '加速槽',
  hud_stat_kills: '击杀',
  hud_stat_deaths: '阵亡',
  hud_stat_kd: '战损比',
  hud_lock_none: '无目标',
  hud_lock_locked: '已锁定 ✓',
  hud_lock_locking: '锁定中 {0}s',
  hud_autonav: '自动导航',

  // === 排行榜 ===
  lb_title: '排行榜',
  lb_rank: '排名',
  lb_pilot: '飞行员',
  lb_kills: '击杀',
  lb_deaths: '阵亡',
  lb_kd: '战损比',
  lb_time: '存活时间',
  lb_close: '关闭排行榜',

  // === 设置 ===
  settings_title: '设置',
  settings_quality: '画质',
  settings_quality_low: '低',
  settings_quality_medium: '中',
  settings_quality_high: '高',
  settings_invert_y: 'Y 轴反转',
  settings_sound: '音效',
  settings_on: '开启',
  settings_off: '关闭',
  settings_help: '操控说明 (H)',
  settings_restart: '重新开始比赛',
  settings_close: '关闭设置 (ESC)',

  // === 调试面板 ===
  debug_title: '性能调试面板',
  debug_hint: 'F3 切换显示',

  // === 音频 ===
  audio_enable: '点击启用音频',

  // === 移动端 ===
  mobile_throttle: '油门',
  mobile_fire: '开火',
  mobile_death: '已阵亡',
  mobile_respawn: '点击重生',

  // === 屏幕效果 ===
  death_title: '战机被毁',
  death_subtitle: '按 R 键重试本关',
  kill_popup: '击杀 #{0}',
  wave_n: '第 {0} 关',
  next_wave: '下一关: {0}s',
  level_start: '第 {0} 关',
  level_start_detail: '{0} 架敌机 · 至少击杀 {1} 架',
  level_complete: '✓ 第 {0} 关通过！',
  level_failed: '✗ 关卡失败',
  level_failed_reason: '击杀不足！需要 {0} 个，你击杀了 {1} 个',
  level_retry_hint: '按 R 键重试',

  // === 通知文本 ===
  notif_no_lock: '未锁定目标！',
  notif_enemy_down: '击落敌机！',
  notif_player_killed: '你被击落了！按 R 重试本关',
  notif_player_crash: '坠机了！按 R 重试本关',
  notif_respawned: '已重生',
  notif_autonav_on: '🧭 自动导航已开启',
  notif_autonav_off: '自动导航已关闭',
  notif_autonav_no_target: '⚠ 无可用目标',
  notif_enemy_incoming: '+{0} 架敌机来袭！',
  notif_level_reward: '关卡 {0} 奖励',
  notif_buff_expired: '{0} {1} 已过期',

  // === 道具名称 ===
  powerup_heal: '急救包',
  powerup_flare_refill: '干扰弹补给',
  powerup_cooldown_boost: '冷却强化',
  powerup_missile_refill: '导弹补给',
  powerup_no_overheat: '无限火力',
  powerup_infinite_boost: '无限加力',
  powerup_double_damage: '双倍伤害',
  powerup_speed_boost: '极速模式',
  powerup_scatter_shot: '散射弹幕',
  powerup_invincible: '无敌护甲',
  powerup_time_slow: '时间减速',
  powerup_full_restore: '全满补给',
  powerup_night_vision: '军用夜视仪',

  // === 道具描述 ===
  powerup_desc_heal: '+30 HP',
  powerup_desc_flare_refill: '+2 干扰弹',
  powerup_desc_cooldown_boost: '冷却速率×3',
  powerup_desc_missile_refill: '+{0} 导弹',
  powerup_desc_no_overheat: '机枪不过热',
  powerup_desc_infinite_boost: 'Boost 不消耗',
  powerup_desc_double_damage: '伤害×2',
  powerup_desc_speed_boost: '最高速度×1.8',
  powerup_desc_scatter_shot: '三发散射',
  powerup_desc_invincible: '免疫伤害',
  powerup_desc_time_slow: '敌机减速50%',
  powerup_desc_full_restore: '全部回满',
  powerup_desc_night_vision: '突破黑夜，锁定猎物',

  // === 排行榜数据 ===
  pilot_you: '你',
  pilot_prefix: '飞行员',

  // === 关闭按钮 title ===
  close: '关闭',
};
