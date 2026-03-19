import { CONFIG } from '../utils/Config.js';

/**
 * 雷达系统
 * 在 Canvas 上绘制迷你地图雷达，带 FOV 视野锥形显示飞行朝向
 */
export class RadarSystem {
  constructor(player, aiSystem, weaponSystem = null) {
    this.player = player;
    this.aiSystem = aiSystem;
    this.weaponSystem = weaponSystem;

    // 获取雷达 Canvas
    this.canvas = document.getElementById('radar-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    // 雷达参数
    this._range = 2000; // 雷达探测范围
    this._size = 0;     // Canvas 实际尺寸（像素）
    this._center = 0;

    if (this.canvas) {
      this._size = this.canvas.width;
      this._center = this._size / 2;
    }

    // 扫描线动画角度
    this._sweepAngle = 0;
    // 锁定闪烁计时
    this._lockBlinkTimer = 0;
  }

  /**
   * 每帧更新
   */
  update(dt) {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const size = this._size;
    const center = this._center;
    const range = this._range;
    const radius = center - 4; // 可用绘制半径

    // 更新扫描线角度
    this._sweepAngle += dt * 1.5;
    if (this._sweepAngle > Math.PI * 2) this._sweepAngle -= Math.PI * 2;

    // 更新锁定闪烁计时
    this._lockBlinkTimer += dt;

    // 清空
    ctx.clearRect(0, 0, size, size);

    // 绘制雷达背景
    this._drawBackground(ctx, center, size, radius);

    // 绘制 FOV 视野锥形（玩家前方朝向）
    this._drawFOVCone(ctx, center, radius);

    // 绘制扫描线
    this._drawSweepLine(ctx, center, radius);

    // 获取玩家数据
    const pPos = this.player.mesh.position;
    const pYaw = this.player.mesh.rotation.y;

    // 获取锁定目标信息
    const ws = this.weaponSystem;
    const lockTarget = ws ? ws.lockTarget : null;
    const lockProgress = ws ? ws.lockProgress : 0;
    const isLocked = ws ? ws.isLocked : false;

    // 绘制敌机（红色点）
    const enemies = this.aiSystem.getAliveEnemies();
    for (const enemy of enemies) {
      const dx = enemy.mesh.position.x - pPos.x;
      const dz = enemy.mesh.position.z - pPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > range) continue;

      // 转换为雷达坐标（以玩家为中心，考虑旋转）
      const angle = Math.atan2(dx, dz) - pYaw;
      const r = (dist / range) * radius;
      const rx = center + Math.sin(angle) * r;
      const ry = center - Math.cos(angle) * r;

      // 判断是否为锁定目标
      const isThisLockTarget = (enemy === lockTarget);

      if (isThisLockTarget) {
        // === 锁定目标特殊标记 ===
        if (isLocked) {
          // 已锁定：红色实心方框 + "LOCK" 文字
          ctx.strokeStyle = '#ff2222';
          ctx.lineWidth = 2;
          ctx.strokeRect(rx - 10, ry - 10, 20, 20);
          ctx.fillStyle = '#ff2222';
          ctx.fillRect(rx - 3, ry - 3, 6, 6);
          ctx.font = 'bold 9px Orbitron, monospace';
          ctx.fillStyle = '#ff2222';
          ctx.textAlign = 'center';
          ctx.fillText('LOCK', rx, ry + 18);
        } else {
          // 锁定中：黄色闪烁方框 + 进度弧线
          const blink = Math.sin(this._lockBlinkTimer * 8) > 0;
          const color = blink ? 'rgba(255, 220, 0, 0.9)' : 'rgba(255, 220, 0, 0.4)';
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(rx - 10, ry - 10, 20, 20);

          // 进度弧线
          ctx.beginPath();
          ctx.arc(rx, ry, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lockProgress);
          ctx.strokeStyle = '#ffdd00';
          ctx.lineWidth = 2;
          ctx.stroke();

          // 锁定中文字
          ctx.font = '8px Orbitron, monospace';
          ctx.fillStyle = '#ffdd00';
          ctx.textAlign = 'center';
          ctx.fillText('TGT', rx, ry + 18);
        }
      } else {
        // 普通敌机：红色点 + 外发光
        ctx.beginPath();
        ctx.arc(rx, ry, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 68, 68, 0.3)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(rx, ry, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4444';
        ctx.fill();
      }

      // 敌机正在攻击时画闪烁红色外圈
      if (enemy.state === 'attack' && !isThisLockTarget) {
        ctx.beginPath();
        ctx.arc(rx, ry, 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // 绘制导弹（黄色点）
    if (this.aiSystem.weaponSystem) {
      const missiles = this.aiSystem.weaponSystem.missiles;
      for (const m of missiles) {
        if (m.isDestroyed) continue;
        const dx = m.mesh.position.x - pPos.x;
        const dz = m.mesh.position.z - pPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > range) continue;

        const angle = Math.atan2(dx, dz) - pYaw;
        const r = (dist / range) * radius;
        const rx = center + Math.sin(angle) * r;
        const ry = center - Math.cos(angle) * r;

        // 导弹外发光
        ctx.beginPath();
        ctx.arc(rx, ry, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 0, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(rx, ry, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffff00';
        ctx.fill();
      }
    }

    // 玩家标记绘制在最上层
    this._drawPlayer(ctx, center);
  }

  /**
   * 绘制雷达背景
   */
  _drawBackground(ctx, center, size, radius) {
    // 半透明暗色填充
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 8, 16, 0.75)';
    ctx.fill();

    // 外圈
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 距离圈（3 个）
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(center, center, radius * i / 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // 十字线
    ctx.beginPath();
    ctx.moveTo(center, center - radius);
    ctx.lineTo(center, center + radius);
    ctx.moveTo(center - radius, center);
    ctx.lineTo(center + radius, center);
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  /**
   * 绘制 FOV 视野锥形 — 显示玩家前方朝向的扇形区域
   */
  _drawFOVCone(ctx, center, radius) {
    const fovAngle = Math.PI / 4; // 45° 视野扇形（左右各 22.5°）
    const coneLength = radius * 0.85; // 锥形长度

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(center, center);
    // FOV 锥形向上（因为雷达中"上"就是"前方"）
    ctx.arc(center, center, coneLength, -Math.PI / 2 - fovAngle / 2, -Math.PI / 2 + fovAngle / 2);
    ctx.closePath();

    // 半透明绿色填充
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, coneLength);
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0.03)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // 锥形边线
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.25)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * 绘制旋转扫描线
   */
  _drawSweepLine(ctx, center, radius) {
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(this._sweepAngle);

    // 扫描线
    const gradient = ctx.createLinearGradient(0, 0, 0, -radius);
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -radius);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1;
    ctx.stroke();

    // 扫描尾迹（扇形拖尾）
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -Math.PI / 2 - 0.3, -Math.PI / 2);
    ctx.closePath();
    const sweepGrad = ctx.createConicGradient(-Math.PI / 2 - 0.3, 0, 0);
    sweepGrad.addColorStop(0, 'rgba(0, 255, 136, 0)');
    sweepGrad.addColorStop(1, 'rgba(0, 255, 136, 0.06)');
    ctx.fillStyle = sweepGrad;
    ctx.fill();

    ctx.restore();
  }

  /**
   * 绘制玩家标记 — 更大更清晰的三角形 + 朝向线
   */
  _drawPlayer(ctx, center) {
    // 朝向线（从中心向上延伸）
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center, center - 18);
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 外发光
    ctx.beginPath();
    ctx.arc(center, center, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 136, 0.1)';
    ctx.fill();

    // 三角形（更大，朝上表示前方）
    ctx.beginPath();
    ctx.moveTo(center, center - 8);      // 顶点（前方）
    ctx.lineTo(center + 5, center + 5);  // 右下
    ctx.lineTo(center - 5, center + 5);  // 左下
    ctx.closePath();
    ctx.fillStyle = '#00ff88';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
