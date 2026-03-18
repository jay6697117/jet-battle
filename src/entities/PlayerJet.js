import * as THREE from 'three';

/**
 * 玩家战斗机
 * 低多边形现代战斗机模型（F-16 风格）
 */
export class PlayerJet {
  constructor() {
    this.mesh = new THREE.Group();
    this.isDestroyed = false;

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

    this._buildModel();
  }

  /**
   * 构建低多边形战斗机
   */
  _buildModel() {
    const bodyColor = 0x4a5568;   // 深灰机身
    const wingColor = 0x718096;   // 浅灰机翼
    const cockpitColor = 0x63b3ed; // 蓝色座舱
    const engineColor = 0xff6b00;  // 橙色引擎口
    const darkColor = 0x2d3748;   // 深色细节

    // === 机身 (拉长的锥体) ===
    const bodyGeo = new THREE.CylinderGeometry(0, 0.8, 8, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.4,
      metalness: 0.6,
      flatShading: true,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.z = 1;
    this.mesh.add(body);

    // === 机身后段 (圆柱) ===
    const rearGeo = new THREE.CylinderGeometry(0.8, 0.7, 4, 6);
    rearGeo.rotateX(Math.PI / 2);
    const rear = new THREE.Mesh(rearGeo, bodyMat.clone());
    rear.position.z = -3;
    this.mesh.add(rear);

    // === 座舱 (半透明泡罩) ===
    const cockpitGeo = new THREE.SphereGeometry(0.5, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: cockpitColor,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.7,
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.6, 2);
    cockpit.scale.set(0.8, 0.6, 1.5);
    this.mesh.add(cockpit);

    // === 主翼 (左右对称三角形) ===
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(5, -1);
    wingShape.lineTo(1, -3);
    wingShape.lineTo(0, -2);
    wingShape.lineTo(0, 0);

    const wingExtrudeSettings = { depth: 0.08, bevelEnabled: false };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, wingExtrudeSettings);
    const wingMat = new THREE.MeshStandardMaterial({
      color: wingColor,
      roughness: 0.5,
      metalness: 0.5,
      flatShading: true,
    });

    // 右翼
    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(0.3, -0.1, 0);
    rightWing.rotation.x = Math.PI / 2;
    this.mesh.add(rightWing);

    // 左翼（镜像）
    const leftWing = new THREE.Mesh(wingGeo, wingMat.clone());
    leftWing.position.set(-0.3, -0.1, 0);
    leftWing.rotation.x = Math.PI / 2;
    leftWing.scale.x = -1;
    this.mesh.add(leftWing);

    // === 尾翼 (垂直) ===
    const tailShape = new THREE.Shape();
    tailShape.moveTo(0, 0);
    tailShape.lineTo(0, 2.5);
    tailShape.lineTo(-1.5, 0);
    tailShape.lineTo(0, 0);

    const tailGeo = new THREE.ExtrudeGeometry(tailShape, { depth: 0.06, bevelEnabled: false });
    const tailMat = new THREE.MeshStandardMaterial({
      color: darkColor,
      roughness: 0.5,
      metalness: 0.4,
      flatShading: true,
    });

    const vertTail = new THREE.Mesh(tailGeo, tailMat);
    vertTail.position.set(-0.03, 0.3, -4.5);
    this.mesh.add(vertTail);

    // === 水平尾翼 (左右) ===
    const hTailShape = new THREE.Shape();
    hTailShape.moveTo(0, 0);
    hTailShape.lineTo(2.2, -0.5);
    hTailShape.lineTo(0.5, -1.5);
    hTailShape.lineTo(0, -1);
    hTailShape.lineTo(0, 0);

    const hTailGeo = new THREE.ExtrudeGeometry(hTailShape, { depth: 0.05, bevelEnabled: false });

    const rightHTail = new THREE.Mesh(hTailGeo, wingMat.clone());
    rightHTail.position.set(0.2, 0, -3.8);
    rightHTail.rotation.x = Math.PI / 2;
    this.mesh.add(rightHTail);

    const leftHTail = new THREE.Mesh(hTailGeo, wingMat.clone());
    leftHTail.position.set(-0.2, 0, -3.8);
    leftHTail.rotation.x = Math.PI / 2;
    leftHTail.scale.x = -1;
    this.mesh.add(leftHTail);

    // === 引擎喷口 ===
    const nozzleGeo = new THREE.CylinderGeometry(0.5, 0.4, 0.6, 8);
    nozzleGeo.rotateX(Math.PI / 2);
    const nozzleMat = new THREE.MeshStandardMaterial({
      color: darkColor,
      roughness: 0.3,
      metalness: 0.8,
      emissive: engineColor,
      emissiveIntensity: 0.3,
    });
    const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzle.position.set(0, 0, -5.3);
    this.mesh.add(nozzle);
    this.nozzle = nozzle;

    // === 进气口 (机身两侧) ===
    const intakeGeo = new THREE.BoxGeometry(0.15, 0.3, 1.2);
    const intakeMat = new THREE.MeshStandardMaterial({
      color: darkColor,
      roughness: 0.3,
      metalness: 0.7,
    });
    const rightIntake = new THREE.Mesh(intakeGeo, intakeMat);
    rightIntake.position.set(0.7, -0.1, 1);
    this.mesh.add(rightIntake);

    const leftIntake = new THREE.Mesh(intakeGeo, intakeMat.clone());
    leftIntake.position.set(-0.7, -0.1, 1);
    this.mesh.add(leftIntake);

    // 整体缩放
    this.mesh.scale.set(1.5, 1.5, 1.5);

    // 初始位置
    this.mesh.position.set(0, 300, 0);

    // 启用阴影
    this.mesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
      }
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
