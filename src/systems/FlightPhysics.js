import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';
import { clamp, lerp } from '../utils/MathUtils.js';

/**
 * 飞行物理系统
 * 根据输入更新战斗机姿态和位置
 */
export class FlightPhysics {
  constructor(player, keyboard) {
    this.player = player;
    this.keyboard = keyboard;

    // 内部旋转状态（欧拉角不直接用于输入，用四元数）
    this._pitchInput = 0;
    this._yawInput = 0;
    this._rollAmount = 0;

    // Boost 冷却计时
    this._boostCooldown = 0;

    // 失速警告
    this.isStalling = false;
  }

  /**
   * 每帧更新
   */
  update(dt) {
    const player = this.player;
    const kb = this.keyboard;
    const fc = CONFIG.flight;
    const bc = CONFIG.boost;

    // === 1. 油门控制 ===
    if (kb.isJustPressed('ArrowUp')) {
      player.throttleIndex = clamp(player.throttleIndex + 1, 0, 4);
    }
    if (kb.isJustPressed('ArrowDown')) {
      player.throttleIndex = clamp(player.throttleIndex - 1, 0, 4);
    }

    // Boost
    const wantBoost = kb.isPressed('ShiftLeft') || kb.isPressed('ShiftRight');
    if (wantBoost && player.boostEnergy > 0) {
      player.isBoosting = true;
      player.boostEnergy = clamp(player.boostEnergy - bc.consumeRate * dt, 0, 100);
      this._boostCooldown = bc.rechargeDelay;
    } else {
      player.isBoosting = false;
      // Boost 恢复
      if (this._boostCooldown > 0) {
        this._boostCooldown -= dt;
      } else {
        player.boostEnergy = clamp(player.boostEnergy + bc.rechargeRate * dt, 0, 100);
      }
    }

    // === 2. 目标速度计算 ===
    const throttlePercent = fc.throttleLevels[player.throttleIndex];
    let targetSpeed = fc.minSpeed + (fc.maxSpeed - fc.minSpeed) * throttlePercent;

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

    // === 4. 姿态控制（俯仰 + 偏航） ===
    this._pitchInput = 0;
    this._yawInput = 0;

    if (kb.isPressed('KeyW')) this._pitchInput = 1;   // 抬头（爬升）
    if (kb.isPressed('KeyS')) this._pitchInput = -1;  // 低头（俯冲）
    if (kb.isPressed('KeyA')) this._yawInput = 1;     // 左转
    if (kb.isPressed('KeyD')) this._yawInput = -1;    // 右转

    // 自动稳定（F 键）
    if (kb.isPressed('KeyF')) {
      this._autoStabilize(dt);
    }

    // 失速时强制俯冲
    if (this.isStalling && !kb.isPressed('KeyF')) {
      this._pitchInput -= fc.stallPitchRate;
    }

    // 应用旋转 — 使用四元数防止万向锁
    const pitchQ = new THREE.Quaternion();
    const yawQ = new THREE.Quaternion();
    const localRight = player.getRight();
    const localUp = player.getUp();

    pitchQ.setFromAxisAngle(localRight, this._pitchInput * fc.pitchSpeed * dt);
    yawQ.setFromAxisAngle(localUp, this._yawInput * fc.yawSpeed * dt);

    player.mesh.quaternion.premultiply(pitchQ);
    player.mesh.quaternion.premultiply(yawQ);
    player.mesh.quaternion.normalize();

    // === 5. 自动倾斜（视觉效果） ===
    // 转弯时飞机自动倾斜，松手回正
    const targetRoll = -this._yawInput * fc.maxRollAngle;
    this._rollAmount = lerp(this._rollAmount, targetRoll, fc.rollSpeed * dt);

    // 将倾斜角应用为绕前方轴的旋转
    const rollQ = new THREE.Quaternion();
    const forwardDir = player.getForward();
    rollQ.setFromAxisAngle(forwardDir, this._rollAmount);

    // 先移除旧 roll，应用新 roll（简化方式：直接覆盖）
    // 实际使用中，roll 作为额外视觉层叠加

    // === 6. 位移 ===
    const moveForward = player.getForward();
    moveForward.multiplyScalar(player.speed * dt);
    player.mesh.position.add(moveForward);

    // 防止飞到地下
    if (player.mesh.position.y < 5) {
      player.mesh.position.y = 5;
      // 如果朝下飞到地面附近，强制拉起
      if (forward.y < 0) {
        this._pitchInput = 0.5;
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

    // 获取当前欧拉角
    const euler = new THREE.Euler().setFromQuaternion(player.mesh.quaternion, 'YXZ');

    // 缓慢将 pitch 和 roll 归零
    euler.x = lerp(euler.x, 0, stab * dt);
    euler.z = lerp(euler.z, 0, stab * dt);

    player.mesh.quaternion.setFromEuler(euler);
  }
}
