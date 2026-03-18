import './style.css';
import { Game } from './game/Game.js';
import { GameState } from './game/GameState.js';
import { PlayerJet } from './entities/PlayerJet.js';
import { KeyboardInput } from './input/KeyboardInput.js';
import { MouseInput } from './input/MouseInput.js';
import { FlightPhysics } from './systems/FlightPhysics.js';
import { CameraSystem } from './systems/CameraSystem.js';
import { HUDSystem } from './systems/HUDSystem.js';
import { WeaponSystem } from './systems/WeaponSystem.js';
import { AISystem } from './systems/AISystem.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { RadarSystem } from './systems/RadarSystem.js';
import { ParticleSystem } from './systems/ParticleSystem.js';
import { ScreenEffects } from './systems/ScreenEffects.js';
import { AudioManager } from './audio/AudioManager.js';
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
let flightPhysics = null;
let cameraSystem = null;
let hudSystem = null;
let weaponSystem = null;
let aiSystem = null;
let collisionSystem = null;
let radarSystem = null;
let particleSystem = null;
let screenEffects = null;
let audioManager = null;

// 尾迹计时器
let _trailTimer = 0;

/**
 * 初始化游戏
 */
function init() {
  // 创建游戏实例（会自动搭建场景）
  game = new Game();
  gameState = new GameState();

  // 创建音效管理器（在游戏启动前就绑定按钮）
  audioManager = new AudioManager();

  // 先启动渲染循环显示背景场景
  game.start();

  // 绑定主菜单事件
  setupMainMenu();
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

      // 显示音频按钮
      document.getElementById('audio-enabler').style.display = 'block';
      document.getElementById('sound-toggle').style.display = 'block';

      // 开始游戏逻辑
      startGame();
    });
  }

  // 点击操控说明面板关闭
  if (instructionsPanel) {
    instructionsPanel.addEventListener('click', () => {
      instructionsPanel.style.display = 'none';
    });
  }
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

  // 创建飞行物理系统
  flightPhysics = new FlightPhysics(player, keyboard);

  // 创建相机跟随系统
  cameraSystem = new CameraSystem(game.camera, player, game);

  // 创建 HUD 系统
  hudSystem = new HUDSystem(player);

  // 创建武器系统
  weaponSystem = new WeaponSystem(player, keyboard, game.scene);

  // 创建 AI 系统
  aiSystem = new AISystem(game.scene, player, weaponSystem);

  // 创建碰撞检测系统
  collisionSystem = new CollisionSystem(player, aiSystem, weaponSystem, gameState);

  // 创建雷达系统
  radarSystem = new RadarSystem(player, aiSystem);

  // 创建粒子系统
  particleSystem = new ParticleSystem(game.scene);

  // 创建屏幕效果
  screenEffects = new ScreenEffects();

  // === 事件回调绑定 ===

  // 武器音效
  weaponSystem.onGunFire = () => audioManager.playGunFire();
  weaponSystem.onMissileLaunch = () => audioManager.playMissileLaunch();
  weaponSystem.onFlareRelease = () => audioManager.playFlare();

  // 敌机被击杀 → 爆炸特效 + 音效 + 屏幕闪绿
  collisionSystem.onEnemyKilled = (pos) => {
    particleSystem.createExplosion(pos, 1.5);
    audioManager.playExplosion();
    screenEffects.flashKill();
    gameState.showNotification('击落敌机！');
  };

  // 玩家被击中 → 受击火花 + 音效 + 屏幕闪红
  collisionSystem.onPlayerHit = () => {
    particleSystem.createHitSpark(player.mesh.position.clone());
    audioManager.playHit();
    screenEffects.flashDamage();
  };

  // 玩家被击杀 → 爆炸 + 死亡效果
  collisionSystem.onPlayerKilled = (pos) => {
    particleSystem.createExplosion(pos, 2.0);
    audioManager.playExplosion();
    screenEffects.showDeath();
    gameState.showNotification('你被击落了！按 R 重生');
  };

  // 开局生成一波敌机
  aiSystem.spawnWave(3);

  // 启动引擎音效
  audioManager.startEngineLoop();

  // 注册更新循环
  game.addSystem({
    update(dt, elapsed) {
      // 1. 更新输入状态
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

      // 7. 粒子特效更新
      particleSystem.update(dt);

      // 8. 引擎尾迹（每 0.05 秒生成一个）
      _trailTimer += dt;
      if (_trailTimer > 0.05 && !player.isDestroyed) {
        _trailTimer = 0;
        const backward = player.getForward().multiplyScalar(-1);
        const trailPos = player.mesh.position.clone().add(backward.clone().multiplyScalar(7));
        particleSystem.createTrail(trailPos, backward);
      }

      // 9. 相机跟随
      cameraSystem.handleMouseInput(mouse);
      cameraSystem.update(dt);

      // 10. HUD 更新
      hudSystem.update(dt);

      // 11. 雷达更新
      radarSystem.update(dt);

      // 12. 引擎音效更新
      const throttle = CONFIG.flight.throttleLevels[player.throttleIndex];
      audioManager.updateEngine(player.isBoosting ? 1.0 : throttle);

      // 13. 游戏状态更新
      gameState.update(dt);

      // 14. 重置鼠标 delta
      mouse.update();

      // 15. 快捷键处理
      handleHotkeys();
    }
  });

  console.log('[Jet Battle] 游戏启动！按 WASD 控制飞行。');
}

/**
 * 处理快捷键
 */
function handleHotkeys() {
  // R 键重生
  if (keyboard.isJustPressed('KeyR') && player) {
    player.respawn();
    gameState.respawn();
  }

  // N 键生成敌机
  if (keyboard.isJustPressed('KeyN') && aiSystem) {
    const count = aiSystem.spawnWave();
    console.log(`[Jet Battle] 生成 ${count} 架敌机！`);
    gameState.showNotification(`+${count} 架敌机来袭！`);
  }
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', init);
