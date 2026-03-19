import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';

/**
 * 干扰弹实体
 * 释放后吸引敌方导弹
 */
export class Flare {
  constructor(position) {
    this.isDestroyed = false;
    this._lifetime = 0;
    this._maxLifetime = CONFIG.weapons.flare.lifetime;
    this.attractRadius = CONFIG.weapons.flare.attractRadius;

    // 干扰弹网格 — 发光的小球
    const geo = new THREE.SphereGeometry(0.3, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.9,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(position);

    // 初始速度（向后下方抛出）
    this._velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      -5,
      -20
    );

    // 预分配移动向量，避免每帧 clone
    this._tmpMove = new THREE.Vector3();
  }

  /**
   * 每帧更新
   */
  update(dt) {
    if (this.isDestroyed) return;

    this._lifetime += dt;
    if (this._lifetime >= this._maxLifetime) {
      this.destroy();
      return;
    }

    // 减速 + 重力
    this._velocity.y -= 5 * dt;
    this._velocity.multiplyScalar(0.98);

    // 复用临时向量，避免每帧 clone
    this._tmpMove.copy(this._velocity).multiplyScalar(dt);
    this.mesh.position.add(this._tmpMove);

    // 闪烁效果
    const flicker = 0.4 + Math.random() * 0.6;
    this.mesh.material.opacity = flicker;
    this.mesh.material.color.setHex(
      Math.random() > 0.5 ? 0xff4400 : 0xffaa00
    );

    // 缩放随时间缩小
    const scale = 1.0 - (this._lifetime / this._maxLifetime) * 0.6;
    this.mesh.scale.setScalar(scale);

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
