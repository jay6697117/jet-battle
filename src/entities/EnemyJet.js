import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';
import { randFloat } from '../utils/MathUtils.js';
import { loadModel } from '../utils/ModelLoader.js';

/**
 * AI 敌机实体
 * 使用 GLB 模型（红色涂装）
 */
export class EnemyJet {
  constructor(position) {
    this.mesh = new THREE.Group();
    this.isDestroyed = false;
    this.health = CONFIG.enemy.maxHealth;
    this.speed = CONFIG.enemy.speed;

    // AI 状态机
    this.state = 'patrol'; // patrol | chase | attack | evade
    this._stateTimer = 0;
    this._waypointIndex = 0;
    this._fireTimer = 0;

    // 预分配方向向量，避免 getForward 每次 new
    this._fwd = new THREE.Vector3();

    // 巡逻路径点
    this._waypoints = this._generateWaypoints(position);

    // 加载 GLB 模型
    this._loadModel();

    // 整体缩放
    this.mesh.scale.set(1.5, 1.5, 1.5); // 放大敌机模型，更容易瞄准

    // 设置初始位置
    this.mesh.position.copy(position);
    // 随机朝向
    this.mesh.rotation.y = Math.random() * Math.PI * 2;
  }

  /**
   * 异步加载 GLB 模型
   */
  async _loadModel() {
    try {
      const model = await loadModel('/models/Jet.glb');

      // 敌机涂装：深红色
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.material = child.material.clone();
          child.material.color.set(0x8b2500);
          child.material.metalness = 0.6;
          child.material.roughness = 0.4;
        }
      });

      this.mesh.add(model);
    } catch (err) {
      console.warn('[EnemyJet] 加载模型失败，使用备用几何体', err);
      this._buildFallbackModel();
    }
  }

  /**
   * 备用模型（加载失败时使用简单几何体）
   */
  _buildFallbackModel() {
    const bodyGeo = new THREE.CylinderGeometry(0, 0.6, 6, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x8b2500, roughness: 0.4, metalness: 0.6, flatShading: true,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.mesh.add(body);

    this.mesh.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
  }

  /**
   * 生成巡逻路径点
   */
  _generateWaypoints(center) {
    const points = [];
    const radius = 150; // 缩小巡逻半径，防止飞走
    const numPoints = 4;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      points.push(new THREE.Vector3(
        center.x + Math.cos(angle) * radius + randFloat(-30, 30),
        randFloat(150, 500),
        center.z + Math.sin(angle) * radius + randFloat(-30, 30)
      ));
    }
    return points;
  }

  /**
   * 重设巡逻路径中心点（边界回收时调用）
   */
  recenterWaypoints(newCenter) {
    this._waypoints = this._generateWaypoints(newCenter);
    this._waypointIndex = 0;
  }

  /**
   * 获取前方方向
   */
  getForward() {
    return this._fwd.set(0, 0, 1).applyQuaternion(this.mesh.quaternion);
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
   * 每帧更新（由 AISystem 调用）
   */
  update(dt) {
    // 引擎发光强度
    // (空操作，由 AISystem 控制移动)
  }
}
