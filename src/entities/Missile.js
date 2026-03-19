import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';

/**
 * 导弹实体 — 现代制导空空导弹
 * 使用比例导航法（Proportional Navigation）追踪目标
 * 具备预判拦截能力，像真正的现代导弹一样追踪敌机
 */

// 共享几何体和材质（全局唯一，避免每颗导弹独立创建）
let _bodyGeo = null;
let _bodyMat = null;
let _noseGeo = null;
let _noseMat = null;
let _flameGeo = null;
let _flameMat = null;

function _getBodyGeo() {
  if (!_bodyGeo) {
    _bodyGeo = new THREE.CylinderGeometry(0.1, 0.15, 2, 6);
    _bodyGeo.rotateX(Math.PI / 2);
  }
  return _bodyGeo;
}
function _getBodyMat() {
  if (!_bodyMat) {
    _bodyMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc, roughness: 0.3, metalness: 0.7,
    });
  }
  return _bodyMat;
}
function _getNoseGeo() {
  if (!_noseGeo) {
    _noseGeo = new THREE.ConeGeometry(0.15, 0.5, 6);
    _noseGeo.rotateX(-Math.PI / 2);
  }
  return _noseGeo;
}
function _getNoseMat() {
  if (!_noseMat) {
    _noseMat = new THREE.MeshStandardMaterial({
      color: 0xff3333, roughness: 0.5, metalness: 0.3,
    });
  }
  return _noseMat;
}
function _getFlameGeo() {
  if (!_flameGeo) {
    _flameGeo = new THREE.SphereGeometry(0.2, 6, 4);
  }
  return _flameGeo;
}
function _getFlameMat() {
  if (!_flameMat) {
    _flameMat = new THREE.MeshBasicMaterial({
      color: 0xff8800, transparent: true, opacity: 0.8,
    });
  }
  return _flameMat;
}

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
    this._leadFactor = CONFIG.weapons.missile.leadFactor || 0.8;

    // 上一帧目标方位（用于计算视线角速度）
    this._lastLOS = null;

    // 预分配临时向量，避免每帧 new/clone
    this._tmpMove = new THREE.Vector3();
    this._tmpLookAt = new THREE.Vector3();
    this._tmpToTarget = new THREE.Vector3();
    this._tmpTargetVelocity = new THREE.Vector3();
    this._tmpPredictedPos = new THREE.Vector3();
    this._tmpToFlare = new THREE.Vector3();

    // 导弹网格（使用共享 Geometry/Material）
    const group = new THREE.Group();

    const body = new THREE.Mesh(_getBodyGeo(), _getBodyMat());
    group.add(body);

    const nose = new THREE.Mesh(_getNoseGeo(), _getNoseMat());
    nose.position.z = 1.2;
    group.add(nose);

    // 尾焰需要独立材质实例（因为每颗导弹独立修改 opacity）
    this._flameMat = _getFlameMat().clone();
    const flame = new THREE.Mesh(_getFlameGeo(), this._flameMat);
    flame.position.z = -1.2;
    group.add(flame);
    this._flame = flame;

    this.mesh = group;
    this.mesh.position.copy(position);
    this.mesh.lookAt(position.clone().add(this._direction));
  }

  /**
   * 每帧更新 — 比例导航制导
   */
  update(dt) {
    if (this.isDestroyed) return;

    this._lifetime += dt;
    if (this._lifetime >= this._maxLifetime) {
      this.destroy();
      return;
    }

    // 制导追踪
    if (this.target && !this.target.isDestroyed && this.target.mesh) {
      this._guidanceUpdate(dt);
    }

    // 移动（复用临时向量）
    this._tmpMove.copy(this._direction).multiplyScalar(this._speed * dt);
    this.mesh.position.add(this._tmpMove);
    this._tmpLookAt.copy(this.mesh.position).add(this._direction);
    this.mesh.lookAt(this._tmpLookAt);

    // 尾焰闪烁
    if (this._flame) {
      this._flameMat.opacity = 0.5 + Math.random() * 0.5;
      this._flame.scale.setScalar(0.8 + Math.random() * 0.4);
    }

    // 低于地面销毁
    if (this.mesh.position.y < 0) {
      this.destroy();
    }
  }

  /**
   * 现代导弹制导系统 — 比例导航法 + 预判拦截
   * 模拟真实空空导弹的追踪方式：
   * 1. 计算目标的运动方向和速度
   * 2. 预测目标未来位置（拦截点）
   * 3. 使用比例导航法转向拦截点
   */
  _guidanceUpdate(dt) {
    const targetPos = this.target.mesh.position;
    const missilePos = this.mesh.position;

    // 计算到目标的距离
    const distToTarget = missilePos.distanceTo(targetPos);

    // —— 预判拦截点计算 ——
    // 估算目标速度向量（复用临时向量）
    this._tmpTargetVelocity.set(0, 0, 0);
    if (this.target.getForward) {
      const targetSpeed = this.target.speed || CONFIG.enemy.speed;
      this._tmpTargetVelocity.copy(this.target.getForward()).multiplyScalar(targetSpeed);
    }

    // 预估飞行时间 = 距离 / 导弹速度
    const timeToIntercept = distToTarget / this._speed;

    // 目标预判位置（复用临时向量）
    this._tmpPredictedPos.copy(targetPos).add(
      this._tmpTargetVelocity.multiplyScalar(timeToIntercept * this._leadFactor)
    );

    // —— 比例导航制导 ——
    this._tmpToTarget.subVectors(this._tmpPredictedPos, missilePos).normalize();

    // 根据距离调整追踪力度 — 越近追踪越强
    let trackingMultiplier = 1.0;
    if (distToTarget < 100) {
      trackingMultiplier = 2.5;
    } else if (distToTarget < 300) {
      trackingMultiplier = 1.8;
    }

    // 转向目标
    const turnAmount = this._turnRate * trackingMultiplier * dt;
    this._direction.lerp(this._tmpToTarget, Math.min(turnAmount, 1.0));
    this._direction.normalize();
  }

  /**
   * 被干扰弹吸引时调用
   */
  divertToFlare(flarePosition) {
    this.target = null; // 丢失原目标
    // 指向干扰弹（复用临时向量）
    this._tmpToFlare.subVectors(flarePosition, this.mesh.position).normalize();
    this._direction.copy(this._tmpToFlare);
  }

  /**
   * 销毁
   */
  destroy() {
    this.isDestroyed = true;
    // 只 dispose 独立的尾焰材质，共享的 geometry/material 不销毁
    if (this._flameMat) {
      this._flameMat.dispose();
    }
  }
}
