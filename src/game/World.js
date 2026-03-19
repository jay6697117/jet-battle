import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';
import { randFloat } from '../utils/MathUtils.js';
import { Terrain } from './Terrain.js';

/**
 * 世界/场景管理
 * 负责创建天空、地面、光照、云层、雾效、地形
 */
export class World {
  constructor(scene) {
    this.scene = scene;
    this.clouds = [];

    this._createSky();
    this._createOcean();
    this._createLighting();
    this._createFog();
    this._createClouds();

    // 丰富地形（沙漠、山地、森林、草地、湖泊、建筑）
    this.terrain = new Terrain(scene);
  }

  /**
   * 创建渐变天空背景
   */
  _createSky() {
    // 使用大球体创建渐变天空
    const skyGeo = new THREE.SphereGeometry(CONFIG.world.fogFar * 0.9, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0a1628) },    // 深蓝色顶部
        bottomColor: { value: new THREE.Color(0x4a90c2) }, // 浅蓝色地平线
        offset: { value: 20 },
        exponent: { value: 0.4 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
    this.sky = sky;
  }

  /**
   * 创建海面 — 使用 GPU Shader 实现波浪动画，零 JS 开销
   */
  _createOcean() {
    const size = CONFIG.world.groundSize;
    const oceanGeo = new THREE.PlaneGeometry(size, size, 64, 64);

    // 使用 ShaderMaterial 实现 GPU 端波浪
    const oceanMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x006994) },
        uOpacity: { value: 0.85 },
        // 光照相关 uniforms
        uAmbientColor: { value: new THREE.Color(0x8899bb) },
        uSunDir: { value: new THREE.Vector3(200, 400, 300).normalize() },
        uSunColor: { value: new THREE.Color(0xffffee) },
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vWorldPos;

        void main() {
          vec3 pos = position;
          // 与原来相同的波浪公式，但在 GPU 执行
          pos.z = sin(pos.x * 0.01 + uTime * 0.5) * 1.5 +
                  cos(pos.y * 0.015 + uTime * 0.3) * 1.0;

          // 近似法线计算
          float dx = cos(pos.x * 0.01 + uTime * 0.5) * 0.015;
          float dz = -sin(pos.y * 0.015 + uTime * 0.3) * 0.015;
          vNormal = normalize(vec3(-dx, 1.0, -dz));

          vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform vec3 uAmbientColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        varying vec3 vNormal;
        varying vec3 vWorldPos;

        void main() {
          // 简单的漫反射光照
          float diffuse = max(dot(vNormal, uSunDir), 0.0);
          vec3 light = uAmbientColor * 0.5 + uSunColor * diffuse * 0.6;
          vec3 finalColor = uColor * light;

          gl_FragColor = vec4(finalColor, uOpacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });

    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = 0;
    ocean.receiveShadow = true;
    this.scene.add(ocean);
    this.ocean = ocean;
    this._oceanMat = oceanMat;
  }

  /**
   * 创建光照
   */
  _createLighting() {
    // 环境光
    const ambient = new THREE.AmbientLight(0x8899bb, 0.5);
    this.scene.add(ambient);

    // 方向光（太阳）
    const sunLight = new THREE.DirectionalLight(0xffffee, 1.2);
    sunLight.position.set(200, 400, 300);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 2000;
    sunLight.shadow.camera.left = -500;
    sunLight.shadow.camera.right = 500;
    sunLight.shadow.camera.top = 500;
    sunLight.shadow.camera.bottom = -500;
    this.scene.add(sunLight);
    this.sunLight = sunLight;

    // 半球光（天空-地面颜色过渡）
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x2d5016, 0.4);
    this.scene.add(hemiLight);
  }

  /**
   * 创建雾效
   */
  _createFog() {
    this.scene.fog = new THREE.Fog(
      0x8faabe,
      CONFIG.world.fogNear,
      CONFIG.world.fogFar
    );
  }

  /**
   * 创建体积云 — 所有 puff 共享同一材质实例
   */
  _createClouds() {
    const cloudGeo = new THREE.SphereGeometry(1, 8, 6);
    // 共享材质（不再每个 puff clone）
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      opacity: 0.7,  // 统一透明度（取中间值，视觉差异不明显）
      flatShading: true,
    });

    for (let i = 0; i < CONFIG.world.cloudCount; i++) {
      const cloudGroup = new THREE.Group();

      // 每朵云由多个球体组成
      const puffs = randFloat(3, 7);
      for (let j = 0; j < puffs; j++) {
        // 所有 puff 共享同一材质实例
        const puff = new THREE.Mesh(cloudGeo, cloudMat);
        const scale = randFloat(20, 60);
        puff.scale.set(scale, scale * 0.5, scale * 0.7);
        puff.position.set(
          randFloat(-40, 40),
          randFloat(-10, 10),
          randFloat(-40, 40)
        );
        cloudGroup.add(puff);
      }

      cloudGroup.position.set(
        randFloat(-CONFIG.world.cloudSpread, CONFIG.world.cloudSpread),
        randFloat(CONFIG.world.cloudHeight[0], CONFIG.world.cloudHeight[1]),
        randFloat(-CONFIG.world.cloudSpread, CONFIG.world.cloudSpread)
      );

      this.scene.add(cloudGroup);
      this.clouds.push(cloudGroup);
    }
  }

  /**
   * 每帧更新
   */
  update(dt, elapsed) {
    // 海面波浪 — 只需更新 uniform，GPU 自动计算
    if (this._oceanMat) {
      this._oceanMat.uniforms.uTime.value = elapsed;
    }

    // 地形更新
    if (this.terrain) {
      this.terrain.update(dt, elapsed);
    }
  }
}
