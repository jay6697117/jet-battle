import * as THREE from 'three';
import { loadModel } from '../utils/ModelLoader.js';

/**
 * 玩家战斗机
 * 使用 GLB 模型
 */
export class PlayerJet {
  constructor() {
    this.mesh = new THREE.Group();
    this.isDestroyed = false;
    this.modelLoaded = false;

    // 飞行状态
    this.speed = 0;
    this.throttleIndex = 2; // 默认 50%
    this.health = 100;
    this.isBoosting = false;
    this.boostEnergy = 100;

    // 武器状态
    this.heat = 0;
    this.isOverheated = false;
    this.overheatTimer = 0;
    this.missiles = 6;
    this.flares = 4;

    // 引擎喷口引用（用于发光效果）
    this.nozzle = null;

    // 加载 GLB 模型
    this._loadModel();

    // 整体缩放（缩小模型，避免挡住视野）
    this.mesh.scale.set(0.8, 0.8, 0.8);

    // 初始位置
    this.mesh.position.set(0, 300, 0);
  }

  /**
   * 异步加载 GLB 模型
   */
  async _loadModel() {
    try {
      const model = await loadModel('/models/Jet.glb');

      // 玩家涂装：“尊贵土豪金”顶级奢华皮肤 (Luxurious Royal Gold)
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          // 克隆材质避免影响其他实例
          child.material = child.material.clone();
          
          const name = child.name.toLowerCase();
          
          if (name.includes('glass') || name.includes('canopy') || name.includes('window')) {
            // 座舱盖：总裁专属黑曜石防窥玻璃
            child.material.color.set(0x050505);
            child.material.transparent = true;
            child.material.opacity = 0.85;
            child.material.metalness = 0.9;
            child.material.roughness = 0.1;
            child.material.emissive.set(0x000000);
            child.material.emissiveIntensity = 0;
          } else {
            // 机壳：24K 纯正土豪金（降低物理金属度以适应当前的光照环境，防止变黑）
            child.material.color.set(0xffc500); // 更鲜亮的黄金色
            child.material.metalness = 0.3;     // 放弃纯反射金属，回归漫反射为主，这样颜色才出得来
            child.material.roughness = 0.4;     // 增加一点粗糙度，让高光稍微散开
            // 微微的自体发光，确保背光面依然金灿灿
            child.material.emissive.set(0x553300);
            child.material.emissiveIntensity = 0.6;
          }
        }
      });

      this.mesh.add(model);
      this.modelLoaded = true;

      // 尝试找到引擎喷口用于发光效果
      model.traverse((child) => {
        if (child.isMesh && child.name.toLowerCase().includes('engine')) {
          this.nozzle = child;
          // 引擎喷口使用炽热的红橙色尾焰
          this.nozzle.material.emissive.set(0xff4400);
        }
      });
    } catch (err) {
      console.warn('[PlayerJet] 加载模型失败，使用备用几何体', err);
      this._buildFallbackModel();
    }
  }

  /**
   * 备用模型（加载失败时使用简单几何体）
   */
  _buildFallbackModel() {
    const bodyGeo = new THREE.CylinderGeometry(0, 0.8, 8, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffc500,          // 更鲜亮的土豪金
      metalness: 0.3,           // 降低金属度防止没贴图时死黑
      roughness: 0.4,           // 适当的高光
      emissive: 0x553300,       // 暖金背光补偿
      emissiveIntensity: 0.6,
      flatShading: true,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.mesh.add(body);

    this.mesh.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
  }

  /**
   * 获取前方方向向量
   */
  getForward() {
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(this.mesh.quaternion);
    return forward;
  }

  /**
   * 获取右方方向向量
   */
  getRight() {
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(this.mesh.quaternion);
    return right;
  }

  /**
   * 获取上方方向向量
   */
  getUp() {
    const up = new THREE.Vector3(0, 1, 0);
    up.applyQuaternion(this.mesh.quaternion);
    return up;
  }

  /**
   * 每帧更新（由 FlightPhysics 系统调用后执行）
   */
  update(dt, elapsed) {
    // 引擎喷口发光随油门变化
    if (this.nozzle) {
      const throttle = this.isBoosting ? 1.0 : (this.throttleIndex / 4);
      this.nozzle.material.emissiveIntensity = 0.2 + throttle * 0.8;
    }
  }

  /**
   * 受到伤害
   */
  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isDestroyed = true;
    }
  }

  /**
   * 重生
   */
  respawn() {
    this.health = 100;
    this.isDestroyed = false;
    this.heat = 0;
    this.isOverheated = false;
    this.missiles = 6;
    this.flares = 4;
    this.boostEnergy = 100;
    this.throttleIndex = 2;
    this.speed = 0;
    this.mesh.position.set(0, 300, 0);
    this.mesh.rotation.set(0, 0, 0);
  }
}
