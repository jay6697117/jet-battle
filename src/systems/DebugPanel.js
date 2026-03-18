/**
 * 调试性能面板
 * F3 键切换显示
 * 显示 FPS、帧时、内存、场景物体等信息
 */
export class DebugPanel {
  constructor(game, aiSystem, waveSystem) {
    this.game = game;
    this.aiSystem = aiSystem;
    this.waveSystem = waveSystem;

    this.isVisible = false;
    this._updateTimer = 0;

    this._bindToggle();
  }

  /**
   * 绑定 F3 切换
   */
  _bindToggle() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * 切换显示/隐藏
   */
  toggle() {
    this.isVisible = !this.isVisible;
    const panel = document.getElementById('debug-panel');
    if (panel) {
      panel.style.display = this.isVisible ? 'block' : 'none';
    }
  }

  /**
   * 每帧更新
   */
  update(dt) {
    if (!this.isVisible) return;

    this._updateTimer += dt;
    if (this._updateTimer < 0.25) return; // 每 250ms 更新一次
    this._updateTimer = 0;

    const content = document.getElementById('debug-content');
    if (!content) return;

    const g = this.game;
    const renderer = g ? g.renderer : null;

    // 收集数据
    const fps = g ? g.fps : 0;
    const frameTime = fps > 0 ? (1000 / fps).toFixed(1) : '0';

    // 渲染器信息
    let renderInfo = '';
    if (renderer && renderer.info) {
      const info = renderer.info;
      renderInfo = `
        <div class="debug-row"><span>Draw Calls:</span><span>${info.render.calls}</span></div>
        <div class="debug-row"><span>Triangles:</span><span>${info.render.triangles.toLocaleString()}</span></div>
        <div class="debug-row"><span>Geometries:</span><span>${info.memory.geometries}</span></div>
        <div class="debug-row"><span>Textures:</span><span>${info.memory.textures}</span></div>
      `;
    }

    // 内存信息
    let memoryInfo = '';
    if (performance.memory) {
      const mem = performance.memory;
      const usedMB = (mem.usedJSHeapSize / 1048576).toFixed(1);
      const totalMB = (mem.totalJSHeapSize / 1048576).toFixed(1);
      const limitMB = (mem.jsHeapSizeLimit / 1048576).toFixed(0);
      const usage = ((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100).toFixed(1);
      memoryInfo = `
        <div class="debug-section-title">内存</div>
        <div class="debug-row"><span>Used Heap:</span><span>${usedMB} MB</span></div>
        <div class="debug-row"><span>Total Heap:</span><span>${totalMB} MB</span></div>
        <div class="debug-row"><span>Heap Limit:</span><span>${limitMB} MB</span></div>
        <div class="debug-row"><span>Usage:</span><span>${usage}%</span></div>
      `;
    }

    // 游戏信息
    const enemies = this.aiSystem ? this.aiSystem.getAliveEnemies().length : 0;
    const waveInfo = this.waveSystem ? this.waveSystem.getInfo() : { wave: 0 };

    content.innerHTML = `
      <div class="debug-section-title">渲染性能</div>
      <div class="debug-row"><span>FPS:</span><span class="${fps >= 50 ? 'debug-good' : fps >= 30 ? 'debug-warn' : 'debug-bad'}">${fps}</span></div>
      <div class="debug-row"><span>Frame Time:</span><span>${frameTime} ms</span></div>
      ${renderInfo}
      ${memoryInfo}
      <div class="debug-section-title">游戏状态</div>
      <div class="debug-row"><span>敌机存活:</span><span>${enemies}</span></div>
      <div class="debug-row"><span>当前波次:</span><span>${waveInfo.wave}</span></div>
    `;
  }
}
