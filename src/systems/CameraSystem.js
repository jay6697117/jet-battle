import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';
import { lerp } from '../utils/MathUtils.js';

/**
 * 第三人称相机跟随系统
 * 平滑追踪战斗机，支持 Boost 时 FOV 变化
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
   * 每帧更新
   */
  update(dt) {
    const player = this.player;
    const cam = this.camera;
    const cfg = CONFIG.camera;

    // 获取飞机的前方和上方方向
    const forward = player.getForward();
    const up = player.getUp();

    // 计算理想相机位置：飞机后方 + 上方偏移
    const idealOffset = new THREE.Vector3();
    idealOffset.copy(forward).multiplyScalar(-this._followDistance);
    idealOffset.add(up.clone().multiplyScalar(this._followHeight));

    // 应用鼠标旋转偏移
    const rotQ = new THREE.Quaternion();
    rotQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this._yawOffset);
    idealOffset.applyQuaternion(rotQ);

    const idealPosition = new THREE.Vector3();
    idealPosition.copy(player.mesh.position).add(idealOffset);

    // 平滑插值到理想位置
    cam.position.lerp(idealPosition, this._followLerp);

    // 限制相机最低高度
    if (cam.position.y < 3) cam.position.y = 3;

    // 计算看向点（飞机位置 + 前方偏移，让玩家能看到前方）
    const lookAhead = new THREE.Vector3();
    lookAhead.copy(player.mesh.position);
    lookAhead.add(forward.clone().multiplyScalar(20));
    lookAhead.y += this._pitchOffset * 10;

    cam.lookAt(lookAhead);

    // Boost 时改变 FOV
    if (player.isBoosting) {
      this.game.targetFov = cfg.boostFov;
    } else {
      this.game.targetFov = cfg.fov;
    }
  }
}
