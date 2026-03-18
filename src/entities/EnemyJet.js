import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';
import { randFloat } from '../utils/MathUtils.js';

/**
 * AI 敌机实体
 * 低多边形红色涂装战斗机
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

    // 巡逻路径点
    this._waypoints = this._generateWaypoints(position);

    this._buildModel();

    // 设置初始位置
    this.mesh.position.copy(position);
    // 随机朝向
    this.mesh.rotation.y = Math.random() * Math.PI * 2;
  }

  /**
   * 构建低多边形敌机模型（红色涂装）
   */
  _buildModel() {
    const bodyColor = 0x8b2500;   // 深红机身
    const wingColor = 0xa03020;   // 暗红机翼
    const darkColor = 0x4a1a10;   // 深色细节

    // 机身
    const bodyGeo = new THREE.CylinderGeometry(0, 0.6, 6, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor, roughness: 0.4, metalness: 0.6, flatShading: true,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.z = 0.5;
    this.mesh.add(body);

    // 机身后段
    const rearGeo = new THREE.CylinderGeometry(0.6, 0.5, 3, 6);
    rearGeo.rotateX(Math.PI / 2);
    const rear = new THREE.Mesh(rearGeo, bodyMat.clone());
    rear.position.z = -2.5;
    this.mesh.add(rear);

    // 主翼
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(4, -0.8);
    wingShape.lineTo(0.8, -2.5);
    wingShape.lineTo(0, -1.5);
    wingShape.lineTo(0, 0);

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.06, bevelEnabled: false });
    const wingMat = new THREE.MeshStandardMaterial({
      color: wingColor, roughness: 0.5, metalness: 0.5, flatShading: true,
    });

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(0.2, -0.05, -0.5);
    rightWing.rotation.x = Math.PI / 2;
    this.mesh.add(rightWing);

    const leftWing = new THREE.Mesh(wingGeo, wingMat.clone());
    leftWing.position.set(-0.2, -0.05, -0.5);
    leftWing.rotation.x = Math.PI / 2;
    leftWing.scale.x = -1;
    this.mesh.add(leftWing);

    // 垂直尾翼
    const tailShape = new THREE.Shape();
    tailShape.moveTo(0, 0);
    tailShape.lineTo(0, 2);
    tailShape.lineTo(-1.2, 0);
    tailShape.lineTo(0, 0);

    const tailGeo = new THREE.ExtrudeGeometry(tailShape, { depth: 0.05, bevelEnabled: false });
    const tailMat = new THREE.MeshStandardMaterial({
      color: darkColor, roughness: 0.5, metalness: 0.4, flatShading: true,
    });
    const tail = new THREE.Mesh(tailGeo, tailMat);
    tail.position.set(-0.025, 0.2, -3.8);
    this.mesh.add(tail);

    // 引擎喷口
    const nozzleGeo = new THREE.CylinderGeometry(0.35, 0.3, 0.5, 8);
    nozzleGeo.rotateX(Math.PI / 2);
    const nozzleMat = new THREE.MeshStandardMaterial({
      color: darkColor, roughness: 0.3, metalness: 0.8,
      emissive: 0xff4400, emissiveIntensity: 0.4,
    });
    const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzle.position.set(0, 0, -4.2);
    this.mesh.add(nozzle);

    // 整体缩放
    this.mesh.scale.set(1.3, 1.3, 1.3);

    // 阴影
    this.mesh.traverse((child) => {
      if (child.isMesh) child.castShadow = true;
    });
  }

  /**
   * 生成巡逻路径点
   */
  _generateWaypoints(center) {
    const points = [];
    const radius = 300;
    const numPoints = 4;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      points.push(new THREE.Vector3(
        center.x + Math.cos(angle) * radius + randFloat(-50, 50),
        randFloat(150, 500),
        center.z + Math.sin(angle) * radius + randFloat(-50, 50)
      ));
    }
    return points;
  }

  /**
   * 获取前方方向
   */
  getForward() {
    const fwd = new THREE.Vector3(0, 0, 1);
    fwd.applyQuaternion(this.mesh.quaternion);
    return fwd;
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
