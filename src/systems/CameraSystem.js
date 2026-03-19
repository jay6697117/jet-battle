import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';
import { lerp } from '../utils/MathUtils.js';

/**
 * 第三人称相机跟随系统
 * 平滑追踪战斗机，支持 Boost 时 FOV 变化
 * 性能优化：预分配所有临时向量/四元数
 */
export class CameraSystem {
  constructor(camera, player, game) {
    this.camera = camera;
    this.player = player;
    this.game = game;

    // 相机偏移参数
    this._followDistance = CONFIG.camera.followDistance;
    this._followHeight = CONFIG.camera.followHeight;
    this._followLerp = CONFIG.camera.followLerp;

    // 鼠标旋转偏移角度
    this._yawOffset = 0;
    this._pitchOffset = 0;

    // 预分配复用向量/四元数，避免每帧 new
    this._idealOffset = new THREE.Vector3();
    this._idealPosition = new THREE.Vector3();
    this._lookAhead = new THREE.Vector3();
    this._rotQ = new THREE.Quaternion();
    this._rotAxis = new THREE.Vector3(0, 1, 0);
    this._tmpUp = new THREE.Vector3();
    this._tmpForward = new THREE.Vector3();
  }

  /**
   * 处理鼠标旋转输入
   */
  handleMouseInput(mouseInput) {
    const sensitivity = 0.002;
    this._yawOffset += mouseInput.deltaX * sensitivity;
    this._pitchOffset -= mouseInput.deltaY * sensitivity;

    // 限制俯仰角范围
    this._pitchOffset = Math.max(-0.5, Math.min(0.8, this._pitchOffset));
  }

  /**
   * 每帧更新（零内存分配）
   */
  update(dt) {
    const player = this.player;
    const cam = this.camera;
    const cfg = CONFIG.camera;

    // 获取飞机的前方和上方方向
    this._tmpForward.set(0, 0, 1).applyQuaternion(player.mesh.quaternion);
    this._tmpUp.set(0, 1, 0).applyQuaternion(player.mesh.quaternion);

    // 计算理想相机位置：飞机后方 + 上方偏移
    this._idealOffset.copy(this._tmpForward).multiplyScalar(-this._followDistance);
    this._idealOffset.addScaledVector(this._tmpUp, this._followHeight);

    // 应用鼠标旋转偏移
    this._rotQ.setFromAxisAngle(this._rotAxis, this._yawOffset);
    this._idealOffset.applyQuaternion(this._rotQ);

    this._idealPosition.copy(player.mesh.position).add(this._idealOffset);

    // 平滑插值到理想位置
    cam.position.lerp(this._idealPosition, this._followLerp);

    // 限制相机最低高度
    if (cam.position.y < 3) cam.position.y = 3;

    // 计算看向点
    this._lookAhead.copy(player.mesh.position);
    this._lookAhead.addScaledVector(this._tmpForward, 40);
    this._lookAhead.y += this._pitchOffset * 10;

    cam.lookAt(this._lookAhead);

    // Boost 时改变 FOV
    if (player.isBoosting) {
      this.game.targetFov = cfg.boostFov;
    } else {
      this.game.targetFov = cfg.fov;
    }
  }
}
