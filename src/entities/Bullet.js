import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';

/**
 * 子弹实体（对象池优化版）
 * 机枪发射的单个子弹
 * 使用共享的静态 Geometry 和 Material，避免每颗子弹独立创建/销毁
 */

// 共享几何体（全局唯一）
let _sharedGeo = null;
// 共享材质（玩家/敌机各一个）
let _playerMat = null;
let _enemyMat = null;

function _getSharedGeo() {
  if (!_sharedGeo) {
    _sharedGeo = new THREE.CylinderGeometry(0.15, 0.15, 3.0, 6);
    _sharedGeo.rotateX(Math.PI / 2);
  }
  return _sharedGeo;
}

function _getMaterial(owner) {
  if (owner === 'player') {
    if (!_playerMat) {
      _playerMat = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.9,
      });
    }
    return _playerMat;
  } else {
    if (!_enemyMat) {
      _enemyMat = new THREE.MeshBasicMaterial({
        color: 0xff4444,
        transparent: true,
        opacity: 0.9,
      });
    }
    return _enemyMat;
  }
}

export class Bullet {
  constructor(position, direction, owner = 'player') {
    this.isDestroyed = false;
    this.owner = owner;
    this.damage = CONFIG.weapons.gun.damage;
    this._distanceTraveled = 0;
    this._maxDistance = CONFIG.weapons.gun.bulletMaxDistance;
    this._speed = CONFIG.weapons.gun.bulletSpeed;
    this._direction = direction.clone().normalize();

    // 使用共享 Geometry 和 Material（不再每颗子弹独立创建）
    this.mesh = new THREE.Mesh(_getSharedGeo(), _getMaterial(owner));
    this.mesh.position.copy(position);

    // 让子弹朝向飞行方向
    this._tmpLookAt = position.clone().add(this._direction);
    this.mesh.lookAt(this._tmpLookAt);

    // 预分配移动向量
    this._tmpMove = new THREE.Vector3();
  }

  /**
   * 每帧更新
   */
  update(dt) {
    if (this.isDestroyed) return;

    // 复用临时向量，避免每帧 clone
    this._tmpMove.copy(this._direction).multiplyScalar(this._speed * dt);
    this.mesh.position.add(this._tmpMove);
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
   * 销毁（不再 dispose 共享的 Geometry/Material）
   */
  destroy() {
    this.isDestroyed = true;
    // 注意：不 dispose geometry/material，因为它们是共享的
  }
}
