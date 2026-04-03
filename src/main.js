import * as THREE from 'three';
import './style.css';
import { Game } from './game/Game.js';
import { GameState } from './game/GameState.js';
import { PlayerJet } from './entities/PlayerJet.js';
import { KeyboardInput } from './input/KeyboardInput.js';
import { MouseInput } from './input/MouseInput.js';
import { TouchInput } from './input/TouchInput.js';
import { FlightPhysics } from './systems/FlightPhysics.js';
import { CameraSystem } from './systems/CameraSystem.js';
import { HUDSystem } from './systems/HUDSystem.js';
import { WeaponSystem } from './systems/WeaponSystem.js';
import { AISystem } from './systems/AISystem.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { RadarSystem } from './systems/RadarSystem.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { ScreenEffects } from './systems/ScreenEffects.js';
import { WaveSystem } from './systems/WaveSystem.js';
import { PowerUpSystem } from './systems/PowerUpSystem.js';
import { DebugPanel } from './systems/DebugPanel.js';
import { AudioManager } from './audio/AudioManager.js';
import { SettingsManager } from './game/SettingsManager.js';
import { CONFIG } from './utils/Config.js';

/**
 * Jet Battle — 主入口
 */

// 全局游戏实例
let game = null;
let gameState = null;
let player = null;
let keyboard = null;
let mouse = null;
let touchInput = null;
let flightPhysics = null;
let cameraSystem = null;
let hudSystem = null;
let weaponSystem = null;
let aiSystem = null;
let collisionSystem = null;
let radarSystem = null;
let particleSystem = null;
let screenEffects = null;
let waveSystem = null;
let debugPanel = null;
let audioManager = null;
let settingsManager = null;
let powerUpSystem = null;

// 尾迹计时器
let _trailTimer = 0;
// 预分配尾迹复用向量，避免每次 clone
const _trailBackward = null; // 延迟初始化（需要 THREE）
let _trailPos = null;

/**
 * 初始化游戏
 */
function init() {
  // 创建游戏实例（会自动搭建场景）
  game = new Game();
  gameState = new GameState();

  // 创建音效管理器（在游戏启动前就绑定按钮）
  audioManager = new AudioManager();

  // 创建设置管理器
  settingsManager = new SettingsManager(game, audioManager);
  settingsManager.onRestart = performRespawn;

  // 先启动渲染循环显示背景场景
  game.start();

  // 绑定主菜单事件
  setupMainMenu();

  // 绑定全局快捷键
  setupGlobalKeys();
}

/**
 * 设置主菜单交互
 */
function setupMainMenu() {
  const mainMenu = document.getElementById('main-menu');
  const btnSolo = document.getElementById('btn-solo');
  const instructionsPanel = document.getElementById('instructions-panel');
  const hudOverlay = document.getElementById('hud-overlay');

  if (btnSolo) {
    btnSolo.addEventListener('click', () => {
      // 隐藏主菜单
      mainMenu.style.display = 'none';

      // 显示操控说明
      instructionsPanel.style.display = 'block';

      // 显示 HUD
      hudOverlay.style.display = 'block';

      // 显示静音切换按钮（音频已默认开启，不需要 enabler 按钮）
      document.getElementById('sound-toggle').style.display = 'block';

      // 开始游戏逻辑
      startGame();
    });
  }

  // 关闭操控说明面板（关闭按钮 + 任意键盘按键）
  if (instructionsPanel) {
    const closePanel = () => {
      instructionsPanel.style.display = 'none';
    };
    // 关闭按钮
    const closeBtn = document.getElementById('instructions-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closePanel();
      });
    }
    // 任意键关闭
    const onKeyClose = (e) => {
      if (instructionsPanel.style.display !== 'none') {
        closePanel();
      }
    };
    window.addEventListener('keydown', onKeyClose);
  }
}

/**
 * 设置全局快捷键（ESC 设置菜单等）
 */
function setupGlobalKeys() {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && settingsManager) {
      settingsManager.toggle();
    }
    // TAB 键排行榜
    if (e.code === 'Tab' && gameState) {
      e.preventDefault();
      gameState.toggleLeaderboard();
    }
  });
}

/**
 * 开始游戏
 */
function startGame() {
  // 创建玩家战斗机
  player = new PlayerJet();
  game.scene.add(player.mesh);

  // 创建输入系统
  keyboard = new KeyboardInput();
  mouse = new MouseInput();
  touchInput = new TouchInput();

  // 创建飞行物理系统
  flightPhysics = new FlightPhysics(player, keyboard, touchInput, settingsManager, game.terrain);

  // 创建相机跟随系统
  cameraSystem = new CameraSystem(game.camera, player, game);

  // 创建 HUD 系统（会在 weaponSystem 创建后设置）
  hudSystem = new HUDSystem(player);
  hudSystem.flightPhysics = flightPhysics;

  // 创建武器系统
  weaponSystem = new WeaponSystem(player, keyboard, game.scene, touchInput);

  // 创建 AI 系统
  aiSystem = new AISystem(game.scene, player, weaponSystem, game.terrain);

  // 绑定 AI 系统到武器系统（用于导弹自动锁定）
  weaponSystem.aiSystem = aiSystem;

  // 创建碰撞检测系统
  collisionSystem = new CollisionSystem(player, aiSystem, weaponSystem, gameState);

  // 创建雷达系统（传入 weaponSystem 用于锁定标记显示）
  radarSystem = new RadarSystem(player, aiSystem, weaponSystem);

  // 绑定 weaponSystem 到 HUD 系统
  hudSystem.weaponSystem = weaponSystem;

  // 创建粒子系统
  particleSystem = new ParticleSystem(game.scene);

  // 创建屏幕效果（增强版）
  screenEffects = new ScreenEffects();

  // 创建波次系统
  waveSystem = new WaveSystem(aiSystem, screenEffects);

  // 创建盲盒道具系统
  powerUpSystem = new PowerUpSystem(player, game.scene, particleSystem, gameState, screenEffects);
  window.powerUpSystem = powerUpSystem; // 暴露给控制台调试

  // 创建调试面板
  debugPanel = new DebugPanel(game, aiSystem, waveSystem);

  // === 事件回调绑定 ===

  // 武器音效
  weaponSystem.onGunFire = () => audioManager.playGunFire();
  weaponSystem.onMissileLaunch = () => audioManager.playMissileLaunch();
  weaponSystem.onFlareRelease = () => audioManager.playFlare();
  weaponSystem.onMissileLockFail = () => gameState.showNotification('未锁定目标！');

  // 敌机被玩家击杀 → 爆炸特效 + 音效 + 屏幕闪绿 + 击杀计数 + 关卡计数
  collisionSystem.onEnemyKilled = (pos) => {
    particleSystem.createExplosion(pos, 1.5);
    audioManager.playExplosion();
    screenEffects.flashKill(gameState.kills);
    gameState.showNotification('击落敌机！');
    waveSystem.addPlayerKill(); // 通知关卡系统
    // 击杀掉落盲盒
    if (powerUpSystem) powerUpSystem.tryKillDrop(pos);
  };

  // 敌机被敌机击杀 → 爆炸特效 + 音效（不计分）
  collisionSystem.onEnemyKilledByEnemy = (pos) => {
    particleSystem.createExplosion(pos, 1.2);
    audioManager.playExplosion();
  };

  // 玩家被击中 → 受击火花 + 音效 + 屏幕闪红
  collisionSystem.onPlayerHit = () => {
    particleSystem.createHitSpark(player.mesh.position);
    audioManager.playHit();
    screenEffects.flashDamage();
  };

  // 玩家被击杀 → 爆炸 + 慢动作 + 死亡屏幕
  collisionSystem.onPlayerKilled = (pos) => {
    particleSystem.createExplosion(pos, 2.0);
    audioManager.playExplosion();
    screenEffects.showDeath();
    game.timeScale = 0.3; // 慢动作效果
    gameState.showNotification('你被击落了！按 R 重试本关');
    // 移动端显示重生按钮
    if (touchInput && touchInput.isMobile) {
      touchInput.showRespawn(true);
    }
  };

  // 玩家撞地面坠毁 → 爆炸 + 慢动作 + 死亡屏幕
  flightPhysics.onGroundCrash = (pos) => {
    particleSystem.createExplosion(pos, 2.5);
    audioManager.playExplosion();
    screenEffects.showDeath();
    game.timeScale = 0.3;
    gameState.addDeath();
    gameState.showNotification('坠机了！按 R 重试本关');
    // 移动端显示重生按钮
    if (touchInput && touchInput.isMobile) {
      touchInput.showRespawn(true);
    }
  };

  // 敌机撞地面坠毁 → 爆炸特效 + 音效
  aiSystem.onEnemyGroundCrash = (pos) => {
    particleSystem.createExplosion(pos, 1.5);
    audioManager.playExplosion();
  };

  // 关卡完成 → 盲盒关卡奖励
  waveSystem.onLevelComplete = (level) => {
    if (powerUpSystem) powerUpSystem.grantLevelReward(level);
  };

  // 启动波次系统（替代手动 spawnWave）
  waveSystem.start();

  // 启动引擎音效
  audioManager.startEngineLoop();

  // 注册更新循环
  game.addSystem({
    update(dt, elapsed) {
      // 1. 更新输入状态（注意：touchInput.update() 移至帧末尾，避免提前重置单次触发标志）
      keyboard.update();

      // 2. 飞行物理
      flightPhysics.update(dt);

      // 3. 武器系统
      weaponSystem.update(dt);

      // 4. 玩家自身更新（喷口发光等）
      player.update(dt, elapsed);

      // 5. AI 敌机更新
      aiSystem.update(dt);

      // 6. 碰撞检测
      collisionSystem.update(dt);

      // 6.5 道具盲盒系统更新
      powerUpSystem.update(dt);

      // 7. 粒子特效更新
      particleSystem.update(dt);

      // 8. 引擎尾迹（每 0.05 秒生成一个）
      _trailTimer += dt;
      if (_trailTimer > 0.05 && !player.isDestroyed) {
        _trailTimer = 0;
        // 复用预分配向量，避免每次 clone
        if (!_trailPos) {
          _trailPos = new THREE.Vector3();
        }
        const fwd = player.getForward();
        _trailPos.copy(player.mesh.position).addScaledVector(fwd, -7);
        fwd.negate(); // 反转为 backward
        particleSystem.createTrail(_trailPos, fwd);
      }

      // 9. 相机跟随
      cameraSystem.handleMouseInput(mouse);
      cameraSystem.update(dt);

      // 10. HUD 更新
      hudSystem.update(dt, waveSystem, powerUpSystem);

      // 11. 雷达更新
      radarSystem.update(dt);

      // 12. 引擎音效更新
      const throttle = CONFIG.flight.throttleLevels[player.throttleIndex];
      audioManager.updateEngine(player.isBoosting ? 1.0 : throttle);

      // 13. 游戏状态更新
      gameState.update(dt);

      // 14. 波次系统更新
      waveSystem.update(dt);

      // 15. 调试面板更新
      debugPanel.update(dt);

      // 16. 重置鼠标 delta
      mouse.update();

      // 17. 快捷键处理
      handleHotkeys();

      // 18. 重置触摸单次触发标志（必须在所有消费者之后）
      if (touchInput) touchInput.update();
    }
  });

  console.log('[Jet Battle] 游戏启动！按 WASD 控制飞行。');
}

/**
 * 处理重新开始逻辑
 */
function performRespawn() {
  if (!player) return;
  player.respawn();
  gameState.respawn();
  game.timeScale = 1.0; // 恢复正常速度
  // 清除所有 buff
  if (powerUpSystem) powerUpSystem.clearAllBuffs();
  if (screenEffects) {
    screenEffects.showRespawn();
    screenEffects.hideLevelResult();
  }
  // 隐藏移动端重生按钮
  if (touchInput && touchInput.isMobile) {
    touchInput.showRespawn(false);
  }
  // 重试当前关卡
  if (waveSystem) {
    waveSystem.retryLevel();
  }
}

/**
 * 处理快捷键
 */
function handleHotkeys() {
  // R 键重试本关（键盘或触摸重生按钮）
  const wantRespawn = (keyboard.isJustPressed('KeyR') || (touchInput && touchInput.isRespawning)) && player;
  if (wantRespawn) {
    performRespawn();
  }

  // G 键切换自动导航模式（键盘或双击雷达）
  const wantAutoNav = (keyboard.isJustPressed('KeyG') || (touchInput && touchInput.isAutoNavToggled)) && flightPhysics && aiSystem;
  if (wantAutoNav) {
    const result = flightPhysics.toggleAutoNav(aiSystem);
    if (result === 'on') {
      gameState.showNotification('🧭 自动导航已开启');
    } else if (result === 'off') {
      gameState.showNotification('自动导航已关闭');
    } else if (result === 'no_target') {
      gameState.showNotification('⚠ 无可用目标');
    }
  }

  // N 键生成敌机（调试用）
  if (keyboard.isJustPressed('KeyN') && aiSystem) {
    const count = aiSystem.spawnWave();
    console.log(`[Jet Battle] 生成 ${count} 架敌机！`);
    gameState.showNotification(`+${count} 架敌机来袭！`);
  }

  // 移动端排行榜切换（底部上滑）
  if (touchInput && touchInput.isLeaderboardToggled && gameState) {
    gameState.toggleLeaderboard();
  }

  // 移动端设置菜单（点击左上角）
  if (touchInput && touchInput.isSettingsToggled && settingsManager) {
    settingsManager.toggle();
  }
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', init);
