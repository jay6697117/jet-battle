import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';

/**
 * 导弹实体
 * 追踪目标的制导导弹
 */
export class Missile {
  constructor(position, direction, target = null, owner = 'player') {
    this.isDestroyed = false;
    this.owner = owner;
    this.target = target;
    this.damage = CONFIG.weapons.missile.damage;
    this._speed = CONFIG.weapons.missile.speed;
    this._turnRate = CONFIG.weapons.missile.turnRate;
    this._lifetime = 0;
    this._maxLifetime = CONFIG.weapons.missile.maxLifetime;
    this._direction = direction.clone().normalize();

    // 导弹网格
    const group = new THREE.Group();

    // 弹体
    const bodyGeo = new THREE.CylinderGeometry(0.1, 0.15, 2, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.3,
      metalness: 0.7,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // 弹头（红色锥形）
    const noseGeo = new THREE.ConeGeometry(0.15, 0.5, 6);
    noseGeo.rotateX(-Math.PI / 2);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      roughness: 0.5,
      metalness: 0.3,
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.z = 1.2;
    group.add(nose);

    // 尾焰（发光球）
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.8,
    });
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 6, 4),
      flameMat
    );
    flame.position.z = -1.2;
    group.add(flame);
    this._flame = flame;

    this.mesh = group;
    this.mesh.position.copy(position);
    this.mesh.lookAt(position.clone().add(this._direction));
  }

  /**
   * 每帧更新 — 追踪目标
   */
  update(dt) {
    if (this.isDestroyed) return;

    this._lifetime += dt;
    if (this._lifetime >= this._maxLifetime) {
      this.destroy();
      return;
    }

    // 追踪目标
    if (this.target && !this.target.isDestroyed && this.target.mesh) {
      const toTarget = new THREE.Vector3();
      toTarget.subVectors(this.target.mesh.position, this.mesh.position).normalize();

      // 逐渐转向目标
      this._direction.lerp(toTarget, this._turnRate * dt);
      this._direction.normalize();
    }

    // 移动
    const move = this._direction.clone().multiplyScalar(this._speed * dt);
    this.mesh.position.add(move);
    this.mesh.lookAt(this.mesh.position.clone().add(this._direction));

    // 尾焰闪烁
    if (this._flame) {
      this._flame.material.opacity = 0.5 + Math.random() * 0.5;
      this._flame.scale.setScalar(0.8 + Math.random() * 0.4);
    }

    // 低于地面销毁
    if (this.mesh.position.y < 0) {
      this.destroy();
    }
  }

  /**
   * 被干扰弹吸引时调用
   */
  divertToFlare(flarePosition) {
    this.target = null;
    // 指向干扰弹
    const toFlare = new THREE.Vector3();
    toFlare.subVectors(flarePosition, this.mesh.position).normalize();
    this._direction.copy(toFlare);
  }

  /**
   * 销毁
   */
  destroy() {
    this.isDestroyed = true;
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
    }
  }
}
