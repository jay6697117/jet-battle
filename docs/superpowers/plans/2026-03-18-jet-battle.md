# Jet Battle 实现计划

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 Three.js 的现代喷气机 3D 空战游戏 MVP

**Architecture:** Vite + Three.js 单页应用，模块化架构（entities/systems/ui/input 分层），自定义简化飞行力学，HTML overlay 实现 HUD

**Tech Stack:** Three.js, Vite, JavaScript ES Modules, Web Audio API

**Spec:** [设计规格文档](file:///Users/zhangjinhui/Desktop/jet-battle/docs/superpowers/specs/2026-03-18-jet-battle-design.md)

---

## Chunk 1: 项目脚手架与 3D 场景

### Task 1: 项目初始化

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `style.css`

- [ ] **Step 1: 用 Vite 初始化项目**

```bash
cd /Users/zhangjinhui/Desktop/jet-battle
npm create vite@latest ./ -- --template vanilla
```

- [ ] **Step 2: 安装 Three.js**

```bash
npm install three
```

- [ ] **Step 3: 清理 Vite 模板默认文件，编写 `index.html` 入口**

保留基本 HTML 结构，引入 `src/main.js`，添加 `<canvas id="game-canvas">` 和 HUD overlay 容器。

- [ ] **Step 4: 编写 `style.css` 全局样式**

全屏 canvas、HUD overlay 定位、军事风格字体（Google Fonts: Teko + Black Ops One）。

- [ ] **Step 5: 启动开发服务器验证**

```bash
npm run dev
```
预期：浏览器打开显示空白画布，无控制台错误。

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "feat: 初始化 Vite + Three.js 项目"
```

---

### Task 2: Three.js 场景搭建

**Files:**
- Create: `src/main.js`
- Create: `src/game/Game.js`
- Create: `src/game/World.js`
- Create: `src/utils/Config.js`

- [ ] **Step 1: 编写 `src/utils/Config.js`**

导出游戏常量配置：速度范围、油门档位、武器参数、画质设置等。

- [ ] **Step 2: 编写 `src/game/World.js`**

创建 Three.js 场景：
- 渐变天空（顶部深蓝 → 底部浅蓝）或天空盒
- 地面网格（简化海面/平原）
- 方向光（太阳）+ 环境光
- 雾效（远景淡出）

- [ ] **Step 3: 编写 `src/game/Game.js`**

游戏主循环类：
- 初始化 renderer、camera、scene
- `requestAnimationFrame` 循环
- deltaTime 计算
- 响应式 resize

- [ ] **Step 4: 编写 `src/main.js` 入口**

实例化 Game，启动游戏循环。

- [ ] **Step 5: 验证场景**

```bash
npm run dev
```
预期：浏览器显示天空 + 地面 + 光照的 3D 场景，可以看到地平线。

- [ ] **Step 6: 提交**

```bash
git add -A && git commit -m "feat: 搭建 Three.js 3D 场景（天空+地面+光照）"
```

---

## Chunk 2: 玩家战斗机与飞行控制

### Task 3: 战斗机模型

**Files:**
- Create: `src/entities/PlayerJet.js`
- Create: `src/utils/MathUtils.js`

- [ ] **Step 1: 编写 `src/utils/MathUtils.js`**

通用数学工具：`clamp`、`lerp`、`degToRad`、角度归一化等。

- [ ] **Step 2: 编写 `src/entities/PlayerJet.js`**

用 Three.js BufferGeometry 构建低多边形战斗机模型：
- 机身（锥体/长方体组合）
- 机翼（两侧三角面）
- 尾翼（垂直 + 水平）
- 座舱（半透明几何体）
- 尾焰占位（后续粒子系统填充）

整体约 100-200 个三角面，带基础材质颜色（深灰机身 + 浅灰机翼）。

- [ ] **Step 3: 将 PlayerJet 加入场景验证**

在 Game.js 中实例化 PlayerJet，放置到场景中央。

预期：浏览器显示低多边形战斗机悬浮在场景中。

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: 创建低多边形战斗机模型"
```

---

### Task 4: 输入系统

**Files:**
- Create: `src/input/KeyboardInput.js`
- Create: `src/input/MouseInput.js`
- Create: `src/input/TouchInput.js`

- [ ] **Step 1: 编写 `src/input/KeyboardInput.js`**

监听 keydown/keyup，维护按键状态 Map。提供 `isPressed(key)` 和 `isJustPressed(key)` 方法。映射：WASD=方向、ArrowUp/Down=油门、Shift=Boost、Space=射击、E=导弹、Q=干扰弹、F=稳定。

- [ ] **Step 2: 编写 `src/input/MouseInput.js`**

监听 mousemove（相机旋转 delta）、mousedown/up（右键锁定目标）。

- [ ] **Step 3: 编写 `src/input/TouchInput.js`**

实现虚拟摇杆（左侧触摸区域）、开火按钮、导弹/干扰弹按钮、油门滑杆。创建对应 DOM 元素，通过 touch 事件映射为与键盘相同的输入状态。

- [ ] **Step 4: 验证输入**

在 Game.js 中接入输入系统，按 W/S/A/D 在控制台打印输入状态。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 实现键盘/鼠标/触摸输入系统"
```

---

### Task 5: 飞行物理

**Files:**
- Create: `src/systems/FlightPhysics.js`
- Create: `src/systems/EnergySystem.js`

- [ ] **Step 1: 编写 `src/systems/FlightPhysics.js`**

简化飞行力学：
- 油门 5 档（0/25/50/75/100%），↑↓ 方向键切换
- 飞机自动加减速到目标速度（lerp）
- W/S 控制俯仰旋转（pitch）
- A/D 控制偏航旋转（yaw）+ 自动倾斜（roll 视觉效果）
- 松手后 roll 自动回正
- F 键一键回到水平姿态
- 位置 = 位置 + 前方向 × 速度 × dt

- [ ] **Step 2: 编写 `src/systems/EnergySystem.js`**

- Boost 能量条（0-100%），Shift 按住每秒消耗 33%
- 松开 Shift 后每秒恢复 20%
- Boost 激活时速度 ×1.5
- 爬升消耗额外速度，俯冲增加速度
- 低速失速检测（速度 < 最低速度时自动俯冲）

- [ ] **Step 3: 在 Game.js 中接入飞行物理**

每帧调用 `FlightPhysics.update(dt, input)` 和 `EnergySystem.update(dt)`，更新 PlayerJet 的 position 和 rotation。

- [ ] **Step 4: 验证飞行**

```bash
npm run dev
```
预期：WASD 控制飞机俯仰/转弯，↑↓ 控制速度档位，Shift 加速，F 自动稳定。飞机在 3D 场景中自由飞行。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 实现简化飞行物理和能量系统"
```

---

### Task 6: 相机系统

**Files:**
- Modify: `src/game/Game.js`

- [ ] **Step 1: 实现第三人称跟随相机**

相机位于飞机后上方，平滑跟随（lerp），鼠标拖拽旋转视角（轨道相机效果）。Boost 时 FOV 从 60° 渐变到 80°（速度感）。

- [ ] **Step 2: 验证相机**

预期：相机流畅跟随飞机飞行，鼠标可旋转视角，Boost 时可感受到 FOV 变化。

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: 实现第三人称跟随相机"
```

---

## Chunk 3: 武器系统

### Task 7: 机枪与子弹

**Files:**
- Create: `src/entities/Bullet.js`
- Create: `src/systems/WeaponSystem.js`

- [ ] **Step 1: 编写 `src/entities/Bullet.js`**

子弹实体：小球体/短圆柱几何体，黄色发光材质。`update(dt)` 沿发射方向移动，超出最大距离后销毁。

- [ ] **Step 2: 编写 `src/systems/WeaponSystem.js`**

机枪逻辑：
- Space 按住连射，射速 10 发/秒
- 热度系统：射击 +8%/秒，冷却 -5%/秒
- 过热（≥100%）锁定 3 秒
- 管理子弹对象池（复用已销毁子弹）

- [ ] **Step 3: 接入 Game.js 并验证**

预期：按 Space 射出子弹，HUD 热度值变化，过热后无法射击。

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: 实现机枪射击和热度系统"
```

---

### Task 8: 导弹锁定与发射

**Files:**
- Create: `src/entities/Missile.js`
- Create: `src/entities/Flare.js`
- Create: `src/systems/LockOnSystem.js`

- [ ] **Step 1: 编写 `src/systems/LockOnSystem.js`**

- 检测前方 60° 锥角内最近敌机
- 右键按住开始锁定（2 秒进度条）
- 锁定完成后标记目标

- [ ] **Step 2: 编写 `src/entities/Missile.js`**

导弹实体：圆柱体 + 锥形弹头，带烟雾尾迹。`update(dt)` 追踪锁定目标（比例导引法），命中或超时销毁。

- [ ] **Step 3: 编写 `src/entities/Flare.js`**

干扰弹实体：小发光球体向后方散射，吸引来袭导弹偏离。

- [ ] **Step 4: 接入 Game.js 并验证**

预期：右键锁定 → E 发射导弹追踪目标，Q 释放干扰弹。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 实现导弹锁定、发射和干扰弹"
```

---

## Chunk 4: AI 敌机与伤害

### Task 9: AI 敌机

**Files:**
- Create: `src/entities/EnemyJet.js`
- Create: `src/ai/EnemyAI.js`

- [ ] **Step 1: 编写 `src/entities/EnemyJet.js`**

复用 PlayerJet 模型（不同颜色：红色），增加血量属性。

- [ ] **Step 2: 编写 `src/ai/EnemyAI.js`**

简单状态机 AI：
- **巡逻**：沿随机航点飞行
- **追踪**：发现玩家后朝玩家方向转弯
- **攻击**：进入射程后开火
- **规避**：被锁定或血量低时随机转向规避

- [ ] **Step 3: 在 Game.js 中接入敌机生成**

按 `N` 键生成 5 架敌机（随机位置/方向），加入场景。

- [ ] **Step 4: 验证**

预期：敌机在场景中巡逻，发现玩家后追踪并攻击。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 实现 AI 敌机（巡逻/追踪/攻击/规避）"
```

---

### Task 10: 伤害与碰撞系统

**Files:**
- Create: `src/systems/DamageSystem.js`
- Modify: `src/game/Game.js`
- Create: `src/game/GameState.js`

- [ ] **Step 1: 编写 `src/systems/DamageSystem.js`**

- 子弹 vs 敌机：球体碰撞检测，命中扣血
- 导弹 vs 敌机：爆炸半径范围伤害
- 敌机子弹 vs 玩家：玩家扣血
- 血量归零 → 触发死亡/爆炸

- [ ] **Step 2: 编写 `src/game/GameState.js`**

管理游戏状态：kills、deaths、K/D、存活时间、得分。死亡后按 R 重生。

- [ ] **Step 3: 验证**

预期：子弹和导弹命中敌机扣血，敌机血量归零爆炸，统计数据更新。

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: 实现伤害碰撞系统和游戏状态管理"
```

---

## Chunk 5: HUD 界面

### Task 11: 核心 HUD

**Files:**
- Create: `src/ui/HUD.js`
- Create: `src/ui/Crosshair.js`
- Create: `src/ui/HealthBar.js`
- Create: `src/ui/HeatGauge.js`
- Create: `src/ui/BoostGauge.js`
- Modify: `index.html`（添加 HUD DOM 容器）

- [ ] **Step 1: 在 `index.html` 中添加 HUD overlay DOM 结构**

```html
<div id="hud-overlay">
  <div id="hud-top-left"><!-- 速度/高度/FPS --></div>
  <div id="hud-crosshair"><!-- 准星 --></div>
  <div id="hud-bottom-left"><!-- 血量/热度/Boost --></div>
  <div id="hud-top-right"><!-- 导弹/干扰弹余量 --></div>
  <div id="hud-bottom-center"><!-- 击杀统计 --></div>
</div>
```

- [ ] **Step 2: 编写 HUD 组件**

- `Crosshair.js`：中心准星 SVG/CSS
- `HealthBar.js`：血量条，绿→黄→红渐变
- `HeatGauge.js`：热度条，过热闪烁动画
- `BoostGauge.js`：Boost 能量条，蓝色

- [ ] **Step 3: 编写 `src/ui/HUD.js`**

HUD 总管理器：每帧从 GameState 读取数据，更新所有 HUD 组件 DOM。显示速度、高度、FPS、导弹余量、干扰弹余量、击杀统计。

- [ ] **Step 4: 验证**

预期：画面上显示完整 HUD，数据随游戏状态实时变化。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 实现 HUD 界面（血量/热度/Boost/弹药/统计）"
```

---

### Task 12: 雷达与锁定指示器

**Files:**
- Create: `src/ui/Radar.js`
- Create: `src/ui/LockIndicator.js`

- [ ] **Step 1: 编写 `src/ui/Radar.js`**

小地图雷达（CSS + Canvas 2D）：圆形，显示玩家前方扇形，敌机为红点。

- [ ] **Step 2: 编写 `src/ui/LockIndicator.js`**

锁定指示器：菱形框跟随目标在屏幕上的投影位置，锁定中收缩动画，锁定完成变红。

导弹预警：来袭导弹方向箭头在屏幕边缘闪烁。

- [ ] **Step 3: 验证**

预期：雷达显示敌机位置，锁定时菱形框动画可见。

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: 实现雷达小地图和锁定指示器"
```

---

### Task 13: 移动端虚拟控件 UI

**Files:**
- Create: `src/ui/MobileControls.js`

- [ ] **Step 1: 编写 `src/ui/MobileControls.js`**

响应式检测移动端，显示：
- 左侧虚拟摇杆（CSS 圆形 + 触摸拖拽）
- 右侧 FIRE 按钮
- 右上导弹/干扰弹按钮
- 底部油门滑杆
- 左下 BOOST 按钮

桌面端自动隐藏这些元素。

- [ ] **Step 2: 在移动模拟器中验证**

浏览器 DevTools 开启移动模拟，验证虚拟控件显示和交互。

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: 实现移动端虚拟操控界面"
```

---

## Chunk 6: 视觉效果与音效

### Task 14: 粒子效果

**Files:**
- Create: `src/effects/ParticleSystem.js`
- Create: `src/effects/Explosion.js`
- Create: `src/effects/Trail.js`

- [ ] **Step 1: 编写 `src/effects/ParticleSystem.js`**

通用粒子系统：基于 Three.js Points + BufferGeometry，支持粒子发射、生命周期、颜色/大小渐变。

- [ ] **Step 2: 编写 `src/effects/Trail.js`**

尾迹效果：飞机尾焰（橙黄色粒子流）、导弹烟雾尾迹（白灰色）。Boost 时尾焰增大增亮。

- [ ] **Step 3: 编写 `src/effects/Explosion.js`**

爆炸效果：火球粒子（橙→红→黑）+ 碎片散射 + 冲击波圆环。击杀时短暂慢动作（0.5秒游戏时间缩放）。

- [ ] **Step 4: 验证**

预期：击中和击杀时有明显爆炸效果，飞机有尾焰，导弹有烟雾。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 实现粒子效果（尾焰/爆炸/烟雾）"
```

---

### Task 15: 音效系统

**Files:**
- Create: `src/audio/AudioManager.js`

- [ ] **Step 1: 编写 `src/audio/AudioManager.js`**

Web Audio API 封装：
- 程序化生成音效（不依赖外部文件）：引擎声（白噪声滤波）、机枪声（短脉冲）、导弹声（滑音）、爆炸声（低频隆隆声）、锁定提示音（滴滴声）
- 引擎声随油门实时变调
- 音效开关（M 键）
- 首次点击后启用 AudioContext

- [ ] **Step 2: 验证**

预期：飞行有引擎声，射击/爆炸有对应音效，M 键可关闭。

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: 实现程序化音效系统"
```

---

## Chunk 7: 游戏菜单与设置

### Task 16: 主菜单与设置

**Files:**
- Modify: `index.html`
- Create: `src/ui/MainMenu.js`
- Create: `src/ui/Leaderboard.js`

- [ ] **Step 1: 编写主菜单界面**

美观的主菜单 DOM overlay：标题「JET BATTLE」、Solo Mission 按钮、画质设置（Low/Medium/High）、操控说明面板。

- [ ] **Step 2: 编写 `src/ui/Leaderboard.js`**

排行榜 DOM 面板（Tab 键切换显示），显示 Rank/Kills/Deaths/K/D/Time。

- [ ] **Step 3: 画质设置实现**

根据画质预设调整：阴影开关、抗锯齿、粒子数量、雾效距离、像素比。

- [ ] **Step 4: 验证**

预期：进入游戏先看到主菜单，点击 Solo Mission 进入游戏，Tab 显示排行榜，Esc 打开设置。

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: 实现主菜单、排行榜和画质设置"
```

---

## Chunk 8: 打磨与验证

### Task 17: 视觉打磨

- [ ] **Step 1: 被击中屏幕效果**

被击中时屏幕边缘闪红 + 轻微画面震动（相机抖动）。

- [ ] **Step 2: 击杀特写**

击杀敌机时 0.5 秒慢动作 + 相机短暂拉近。

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: 视觉打磨（击中反馈/击杀特写）"
```

---

### Task 18: 全面验证

- [ ] **Step 1: 桌面端功能验证**

```bash
npm run dev
```

验证清单：
1. 主菜单显示正常，点击 Solo Mission 进入游戏
2. WASD 控制飞行方向，↑↓ 控制油门
3. Shift Boost 加速，F 自动稳定
4. Space 机枪射击，热度正常
5. 右键锁定 → E 导弹发射 → 导弹追踪
6. Q 释放干扰弹
7. N 生成敌机，AI 行为正常
8. 击中/击杀效果正常
9. HUD 数据实时更新
10. 排行榜和设置菜单正常

- [ ] **Step 2: 移动端功能验证**

浏览器 DevTools 切换移动端模拟，验证虚拟控件可用。

- [ ] **Step 3: 构建生产版本**

```bash
npm run build
npm run preview
```

预期：构建成功，预览可正常运行。

- [ ] **Step 4: 最终提交**

```bash
git add -A && git commit -m "feat: Jet Battle MVP 完成"
```

---

## 验证计划

### 自动验证
- `npm run build` 确保无编译错误

### 浏览器验证（每个 Task 完成后）
1. 打开 `npm run dev`
2. 按上述每个 Task 的验证步骤在浏览器中操作确认
3. 打开 DevTools Console 确认无 JS 错误

### 最终手动验证（Task 18）
- 完整走一遍游戏流程：主菜单 → 进入游戏 → 飞行 → 战斗 → 击杀 → 死亡重生
- 桌面端和移动端模拟各验证一遍
