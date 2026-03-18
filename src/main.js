import './style.css';
import { Game } from './game/Game.js';
import { GameState } from './game/GameState.js';
import { PlayerJet } from './entities/PlayerJet.js';
import { KeyboardInput } from './input/KeyboardInput.js';
import { MouseInput } from './input/MouseInput.js';
import { FlightPhysics } from './systems/FlightPhysics.js';
import { CameraSystem } from './systems/CameraSystem.js';
import { HUDSystem } from './systems/HUDSystem.js';

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

/**
 * 初始化游戏
 */
function init() {
  // 创建游戏实例（会自动搭建场景）
  game = new Game();
  gameState = new GameState();

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

  // 注册更新循环
  // 使用自定义系统包装器，按正确顺序更新
  game.addSystem({
    update(dt, elapsed) {
      // 1. 更新输入状态
      keyboard.update();

      // 2. 飞行物理
      flightPhysics.update(dt);

      // 3. 玩家自身更新（喷口发光等）
      player.update(dt, elapsed);

      // 4. 相机跟随
      cameraSystem.handleMouseInput(mouse);
      cameraSystem.update(dt);

      // 5. HUD 更新
      hudSystem.update(dt);

      // 6. 游戏状态更新
      gameState.update(dt);

      // 7. 重置鼠标 delta
      mouse.update();

      // 8. 快捷键处理
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

  // N 键生成敌机（后续 Task 实现）
  if (keyboard.isJustPressed('KeyN')) {
    console.log('[Jet Battle] 生成敌机功能将在 Task 9-10 实现');
  }
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', init);
