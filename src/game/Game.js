import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';
import { World } from './World.js';
import { lerp } from '../utils/MathUtils.js';

/**
 * 游戏主循环
 * 管理 renderer、camera、scene 和游戏循环
 */
export class Game {
  constructor() {
    // 使用 performance.now() 替代已废弃的 THREE.Clock
    this._lastTime = 0;
    this._elapsed = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.timeScale = 1.0; // 用于慢动作效果

    // FPS 计算
    this._frameCount = 0;
    this._fpsTime = 0;
    this.fps = 60;

    // 可更新的系统列表
    this.systems = [];
    // 可更新的实体列表
    this.entities = [];

    this._initRenderer();
    this._initCamera();
    this._initScene();
    this._initWorld();
    this._initResize();
  }

  /**
   * 初始化 WebGL 渲染器
   */
  _initRenderer() {
    const quality = CONFIG.quality.high; // 默认高画质

    this.renderer = new THREE.WebGLRenderer({
      antialias: quality.antialias,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true, // 对数深度缓冲，解决远距离 Z-fighting
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(quality.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    if (quality.shadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // 插入到 body 最前面（在 UI 元素之前）
    document.body.insertBefore(this.renderer.domElement, document.body.firstChild);
  }

  /**
   * 初始化相机
   */
  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      CONFIG.camera.fov,
      window.innerWidth / window.innerHeight,
      CONFIG.camera.nearClip,
      CONFIG.camera.farClip
    );
    this.camera.position.set(0, 300, -30);
    this.camera.lookAt(0, 300, 0);

    // 目标 FOV（用于 Boost 效果平滑过渡）
    this.targetFov = CONFIG.camera.fov;
  }

  /**
   * 初始化场景
   */
  _initScene() {
    this.scene = new THREE.Scene();
  }

  /**
   * 初始化世界（天空、地面、光照等）
   */
  _initWorld() {
    this.world = new World(this.scene);
  }

  /**
   * 监听窗口大小变化
   */
  _initResize() {
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height);
    });
  }

  /**
   * 注册可更新的系统
   */
  addSystem(system) {
    this.systems.push(system);
  }

  /**
   * 注册可更新的实体
   */
  addEntity(entity) {
    this.entities.push(entity);
    if (entity.mesh) {
      this.scene.add(entity.mesh);
    }
  }

  /**
   * 移除实体
   */
  removeEntity(entity) {
    const idx = this.entities.indexOf(entity);
    if (idx !== -1) {
      this.entities.splice(idx, 1);
      if (entity.mesh) {
        this.scene.remove(entity.mesh);
      }
    }
  }

  /**
   * 启动游戏循环
   */
  start() {
    this.isRunning = true;
    this._lastTime = performance.now() / 1000;
    this._animate();
  }

  /**
   * 游戏暂停/恢复
   */
  togglePause() {
    this.isPaused = !this.isPaused;
  }

  /**
   * 主动画循环
   */
  _animate() {
    if (!this.isRunning) return;
    requestAnimationFrame(() => this._animate());

    if (this.isPaused) return;

    // 计算 deltaTime
    const now = performance.now() / 1000;
    let dt = now - this._lastTime;
    this._lastTime = now;
    dt = Math.min(dt, 0.05); // 最大 50ms (20 FPS)
    dt *= this.timeScale;

    this._elapsed += dt;

    // 更新 FPS
    this._updateFPS(dt);

    // 更新所有系统
    for (const system of this.systems) {
      system.update(dt, this._elapsed);
    }

    // 更新所有实体
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      if (entity.isDestroyed) {
        this.removeEntity(entity);
        continue;
      }
      entity.update(dt, this._elapsed);
    }

    // 更新世界（海面波浪等）
    this.world.update(dt, this._elapsed);

    // 平滑 FOV 过渡（Boost 效果）
    if (this.camera.fov !== this.targetFov) {
      this.camera.fov = lerp(this.camera.fov, this.targetFov, CONFIG.camera.fovLerp);
      this.camera.updateProjectionMatrix();
    }

    // 渲染
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 计算 FPS
   */
  _updateFPS(dt) {
    this._frameCount++;
    this._fpsTime += dt / this.timeScale; // 使用真实时间
    if (this._fpsTime >= 0.5) {
      this.fps = Math.round(this._frameCount / this._fpsTime);
      this._frameCount = 0;
      this._fpsTime = 0;

      // 更新 HUD FPS 显示
      const fpsEl = document.getElementById('hud-fps-value');
      if (fpsEl) fpsEl.textContent = this.fps;
    }
  }

  /**
   * 设置画质
   */
  setQuality(preset) {
    const quality = CONFIG.quality[preset];
    if (!quality) return;

    this.renderer.setPixelRatio(quality.pixelRatio);

    if (quality.shadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } else {
      this.renderer.shadowMap.enabled = false;
    }

    if (this.scene.fog) {
      this.scene.fog.far = quality.fogFar;
    }
  }
}
