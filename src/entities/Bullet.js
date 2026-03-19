import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';

/**
 * 子弹实体
 * 机枪发射的单个子弹
 */
export class Bullet {
  constructor(position, direction, owner = 'player') {
    this.isDestroyed = false;
    this.owner = owner;
    this.damage = CONFIG.weapons.gun.damage;
    this._distanceTraveled = 0;
    this._maxDistance = CONFIG.weapons.gun.bulletMaxDistance;
    this._speed = CONFIG.weapons.gun.bulletSpeed;
    this._direction = direction.clone().normalize();

    // 子弹网格 — 发光的小长条
    const geo = new THREE.CylinderGeometry(0.15, 0.15, 3.0, 6);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: owner === 'player' ? 0xffff00 : 0xff4444,
      transparent: true,
      opacity: 0.9,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(position);

    // 让子弹朝向飞行方向
    this.mesh.lookAt(position.clone().add(this._direction));
  }

  /**
   * 每帧更新
   */
  update(dt) {
    if (this.isDestroyed) return;

    const move = this._direction.clone().multiplyScalar(this._speed * dt);
    this.mesh.position.add(move);
    this._distanceTraveled += this._speed * dt;

    // 超出最大距离自动销毁
    if (this._distanceTraveled >= this._maxDistance) {
      this.destroy();
    }

    // 低于地面销毁
    if (this.mesh.position.y < 0) {
      this.destroy();
    }
  }

  /**
   * 销毁
   */
  destroy() {
    this.isDestroyed = true;
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
  }
}
