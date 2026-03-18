import './style.css';
import { Game } from './game/Game.js';
import { GameState } from './game/GameState.js';

/**
 * Jet Battle — 主入口
 */

// 全局游戏实例
let game = null;
let gameState = null;

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

      // 开始游戏逻辑（目前只是飞行场景）
      startGame();
    });
  }

  // 点击操控说明面板关闭it
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
  // 将相机移到飞行位置
  game.camera.position.set(0, 300, -30);
  game.camera.lookAt(0, 300, 0);

  // 后续 Task 会在这里实例化 PlayerJet 和输入系统
  console.log('[Jet Battle] 游戏启动！场景已就绪。');
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', init);
