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
      player.boostEnergy = clamp(player.boostEnergy - bc.consumeRate * dt, 0, 100);
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

    // 失速时强制俯冲
    if (this.isStalling && !kb.isPressed('KeyF')) {
      this._pitchInput -= fc.stallPitchRate;
    }

    // 应用旋转 — 使用四元数防止万向锁
    const pitchQ = new THREE.Quaternion();
    const yawQ = new THREE.Quaternion();
    const rollQ = new THREE.Quaternion();
    const localRight = player.getRight();
    const localUp = player.getUp();
    const localForward = player.getForward();

    pitchQ.setFromAxisAngle(localRight, this._pitchInput * fc.pitchSpeed * dt);
    yawQ.setFromAxisAngle(localUp, this._yawInput * fc.yawSpeed * dt);
    rollQ.setFromAxisAngle(localForward, this._rollInput * fc.rollSpeed * dt);

    player.mesh.quaternion.premultiply(pitchQ);
    player.mesh.quaternion.premultiply(yawQ);
    player.mesh.quaternion.premultiply(rollQ);
    player.mesh.quaternion.normalize();

    // === 5. 自动倾斜（视觉效果） ===
    const targetRoll = -this._yawInput * fc.maxRollAngle;
    this._rollAmount = lerp(this._rollAmount, targetRoll, fc.rollSpeed * dt);

    // === 6. 位移 ===
    const moveForward = player.getForward();
    moveForward.multiplyScalar(player.speed * dt);
    player.mesh.position.add(moveForward);

    // 地面/山体碰撞坠毁
    let groundHeight = 5;
    if (this.terrain) {
      // 射线检测地形高度，加上少许偏移防止穿模过深
      groundHeight = Math.max(5, this.terrain.getSurfaceHeight(player.mesh.position.x, player.mesh.position.z));
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
    const euler = new THREE.Euler().setFromQuaternion(player.mesh.quaternion, 'YXZ');
    euler.x = lerp(euler.x, 0, stab * dt);
    euler.z = lerp(euler.z, 0, stab * dt);
    player.mesh.quaternion.setFromEuler(euler);
  }
}
