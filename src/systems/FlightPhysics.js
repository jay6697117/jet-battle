import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';
import { clamp, lerp } from '../utils/MathUtils.js';

/**
 * 飞行物理系统
 * 根据输入更新战斗机姿态和位置
 * 支持滚转控制 + 触摸输入 + Y 轴反转
 */
export class FlightPhysics {
  constructor(player, keyboard, touchInput, settingsManager, terrain) {
    this.player = player;
    this.keyboard = keyboard;
    this.touchInput = touchInput;
    this.settingsManager = settingsManager;
    this.terrain = terrain;

    // 内部旋转状态
    this._pitchInput = 0;
    this._yawInput = 0;
    this._rollInput = 0;
    this._rollAmount = 0;

    // Boost 冷却计时
    this._boostCooldown = 0;

    // 失速警告
    this.isStalling = false;

    // 自动导航模式
    this.autoNavEnabled = false;
    this.autoNavTarget = null;
    this._autoNavCloseDistance = 150;
    this._autoNavTurnSpeed = 2.0;

    // 预分配复用向量/四元数，避免每帧 new
    this._pitchQ = new THREE.Quaternion();
    this._yawQ = new THREE.Quaternion();
    this._rollQ = new THREE.Quaternion();
    this._moveForward = new THREE.Vector3();
    this._localRight = new THREE.Vector3();
    this._localUp = new THREE.Vector3();
    this._localForward = new THREE.Vector3();
    this._tmpEuler = new THREE.Euler();
    this._tmpToTarget = new THREE.Vector3();
    this._tmpTargetDir = new THREE.Vector3();
    this._tmpTargetQuat = new THREE.Quaternion();
    this._tmpLookMat = new THREE.Matrix4();
    this._tmpEye = new THREE.Vector3();
    this._tmpCenter = new THREE.Vector3();
    this._tmpUpVec = new THREE.Vector3(0, 1, 0);
    this._tmpFlipQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0), Math.PI
    );
  }

  /**
   * 每帧更新
   */
  update(dt) {
    const player = this.player;
    const kb = this.keyboard;
    const fc = CONFIG.flight;
    const bc = CONFIG.boost;
    const touch = this.touchInput;
    const invertY = this.settingsManager?.settings?.invertY || false;

    // === 1. 油门控制 ===
    if (kb.isJustPressed('ArrowUp')) {
      player.throttleIndex = clamp(player.throttleIndex + 1, 0, 4);
    }
    if (kb.isJustPressed('ArrowDown')) {
      player.throttleIndex = clamp(player.throttleIndex - 1, 0, 4);
    }

    // 移动端油门
    if (touch && touch.isMobile) {
      player.throttleIndex = Math.round(touch.throttle * 4);
    }

    // Boost
    const wantBoost = kb.isPressed('ShiftLeft') || kb.isPressed('ShiftRight') ||
                      (touch && touch.isBoosting);
    if (wantBoost && player.boostEnergy > 0) {
      player.isBoosting = true;
      // 无限加力 buff 时不消耗能量
      if (!player._buffInfiniteBoost) {
        player.boostEnergy = clamp(player.boostEnergy - bc.consumeRate * dt, 0, 100);
      }
      this._boostCooldown = bc.rechargeDelay;
    } else {
      player.isBoosting = false;
      if (this._boostCooldown > 0) {
        this._boostCooldown -= dt;
      } else {
        player.boostEnergy = clamp(player.boostEnergy + bc.rechargeRate * dt, 0, 100);
      }
    }

    // === 2. 目标速度计算 ===
    const throttlePercent = fc.throttleLevels[player.throttleIndex];
    let targetSpeed = fc.minSpeed + (fc.maxSpeed - fc.minSpeed) * throttlePercent;

    // 高速飞行 buff
    if (player._buffSpeedBoost) {
      targetSpeed *= 1.8;
    }

    if (player.isBoosting) {
      targetSpeed *= bc.multiplier;
    }

    // 爬升减速 / 俯冲加速
    const forward = player.getForward();
    const pitchAngle = Math.asin(clamp(forward.y, -1, 1));
    targetSpeed -= pitchAngle * fc.gravityEffect * targetSpeed;

    // 平滑过渡到目标速度
    player.speed = lerp(player.speed, targetSpeed, fc.accelerationLerp);

    // === 3. 失速检测 ===
    this.isStalling = player.speed < fc.stallSpeed;

    // === 4. 姿态控制（俯仰 + 偏航 + 滚转） ===
    this._pitchInput = 0;
    this._yawInput = 0;
    this._rollInput = 0;

    // 键盘输入
    if (kb.isPressed('KeyW')) this._pitchInput = invertY ? -1 : 1;
    if (kb.isPressed('KeyS')) this._pitchInput = invertY ? 1 : -1;
    if (kb.isPressed('KeyA')) this._yawInput = 1;
    if (kb.isPressed('KeyD')) this._yawInput = -1;

    // ← → 滚转控制
    if (kb.isPressed('ArrowLeft')) this._rollInput = 1;
    if (kb.isPressed('ArrowRight')) this._rollInput = -1;

    // 移动端触摸输入
    if (touch && touch.isMobile) {
      this._yawInput = -touch.stickX;
      this._pitchInput = invertY ? -touch.stickY : touch.stickY;
    }

    // 自动稳定（F 键）
    if (kb.isPressed('KeyF')) {
      this._autoStabilize(dt);
    }

    // 自动导航模式 — 覆盖玩家输入，朝目标自动转向
    if (this.autoNavEnabled) {
      this._autoNavigate(dt);
    }

    // 失速时强制俯冲
    if (this.isStalling && !kb.isPressed('KeyF')) {
      this._pitchInput -= fc.stallPitchRate;
    }

    // 应用旋转 — 使用四元数防止万向锁（复用预分配的四元数）
    this._localRight.set(1, 0, 0).applyQuaternion(player.mesh.quaternion);
    this._localUp.set(0, 1, 0).applyQuaternion(player.mesh.quaternion);
    this._localForward.set(0, 0, 1).applyQuaternion(player.mesh.quaternion);

    this._pitchQ.setFromAxisAngle(this._localRight, this._pitchInput * fc.pitchSpeed * dt);
    this._yawQ.setFromAxisAngle(this._localUp, this._yawInput * fc.yawSpeed * dt);
    this._rollQ.setFromAxisAngle(this._localForward, this._rollInput * fc.rollSpeed * dt);

    player.mesh.quaternion.premultiply(this._pitchQ);
    player.mesh.quaternion.premultiply(this._yawQ);
    player.mesh.quaternion.premultiply(this._rollQ);
    player.mesh.quaternion.normalize();

    // === 5. 自动倾斜（视觉效果） ===
    const targetRoll = -this._yawInput * fc.maxRollAngle;
    this._rollAmount = lerp(this._rollAmount, targetRoll, fc.rollSpeed * dt);

    // === 6. 位移（复用向量） ===
    this._moveForward.set(0, 0, 1).applyQuaternion(player.mesh.quaternion);
    this._moveForward.multiplyScalar(player.speed * dt);
    player.mesh.position.add(this._moveForward);

    // 地面/山体碰撞坠毁（使用快速近似高度）
    let groundHeight = 5;
    if (this.terrain) {
      groundHeight = Math.max(5, this.terrain.getApproxHeight(player.mesh.position.x, player.mesh.position.z));
    }

    if (player.mesh.position.y < groundHeight + 2 && !player.isDestroyed) {
      player.mesh.position.y = groundHeight; 
      player.takeDamage(9999); // 直接击杀
      if (this.onGroundCrash) {
        this.onGroundCrash(player.mesh.position.clone());
      }
    }

    // 防止飞太高
    if (player.mesh.position.y > 2000) {
      player.mesh.position.y = 2000;
    }
  }

  /**
   * 自动稳定 — 缓慢恢复到水平飞行
   */
  _autoStabilize(dt) {
    const player = this.player;
    const stab = CONFIG.flight.stabilizationSpeed;
    this._tmpEuler.setFromQuaternion(player.mesh.quaternion, 'YXZ');
    this._tmpEuler.x = lerp(this._tmpEuler.x, 0, stab * dt);
    this._tmpEuler.z = lerp(this._tmpEuler.z, 0, stab * dt);
    player.mesh.quaternion.setFromEuler(this._tmpEuler);
  }

  /**
   * 切换自动导航模式
   * @param {AISystem} aiSystem — 用于获取存活敌机列表
   * @returns {string} 状态文字，用于通知玩家
   */
  toggleAutoNav(aiSystem) {
    if (this.autoNavEnabled) {
      // 关闭导航
      this.autoNavEnabled = false;
      this.autoNavTarget = null;
      return 'off';
    }

    // 尝试找到最近的敌机
    const target = this._findNearestEnemy(aiSystem);
    if (!target) {
      return 'no_target';
    }

    this.autoNavEnabled = true;
    this.autoNavTarget = target;
    return 'on';
  }

  /**
   * 自动导航 — 平滑转向朝目标飞行
   */
  _autoNavigate(dt) {
    const player = this.player;
    const target = this.autoNavTarget;

    // 目标不存在或已被摧毁 → 尝试寻找下一个
    if (!target || target.isDestroyed) {
      this.autoNavTarget = this._findNearestEnemy(this._cachedAISystem);
      if (!this.autoNavTarget) {
        this.autoNavEnabled = false;
        return;
      }
    }

    // 计算到目标的方向和距离（复用向量）
    this._tmpToTarget.subVectors(this.autoNavTarget.mesh.position, player.mesh.position);
    const distance = this._tmpToTarget.length();

    // 到达近距离 → 自动关闭导航
    if (distance <= this._autoNavCloseDistance) {
      this.autoNavEnabled = false;
      this.autoNavTarget = null;
      return;
    }

    // 用球面插值平滑转向目标（复用预分配的对象）
    this._tmpTargetDir.copy(this._tmpToTarget).normalize();
    this._tmpEye.copy(player.mesh.position);
    this._tmpCenter.copy(player.mesh.position).add(this._tmpTargetDir);
    this._tmpUpVec.set(0, 1, 0);
    this._tmpLookMat.lookAt(this._tmpEye, this._tmpCenter, this._tmpUpVec);
    this._tmpTargetQuat.setFromRotationMatrix(this._tmpLookMat);

    // 旋转 180°修正
    this._tmpTargetQuat.multiply(this._tmpFlipQuat);

    // 平滑插值
    const t = clamp(this._autoNavTurnSpeed * dt, 0, 1);
    player.mesh.quaternion.slerp(this._tmpTargetQuat, t);
    player.mesh.quaternion.normalize();
  }

  /**
   * 从 AISystem 获取最近存活敌机
   */
  _findNearestEnemy(aiSystem) {
    if (!aiSystem) return null;
    // 缓存 aiSystem 引用，以便目标被摧毁时自动寻找下一个
    this._cachedAISystem = aiSystem;

    const enemies = aiSystem.getAliveEnemies();
    if (enemies.length === 0) return null;

    let nearest = null;
    let nearestDist = Infinity;
    const pPos = this.player.mesh.position;

    for (const enemy of enemies) {
      const dist = pPos.distanceTo(enemy.mesh.position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }

    return nearest;
  }
}
