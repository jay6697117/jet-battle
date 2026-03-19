import { CONFIG } from '../utils/Config.js';

/**
 * 雷达系统
 * 在 Canvas 上绘制迷你地图雷达
 */
export class RadarSystem {
  constructor(player, aiSystem) {
    this.player = player;
    this.aiSystem = aiSystem;

    // 获取雷达 Canvas
    this.canvas = document.getElementById('radar-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    // 雷达参数
    this._range = 2000; // 雷达探测范围（加大以覆盖更远敌机）
    this._size = 0;     // Canvas 实际尺寸（像素）
    this._center = 0;

    if (this.canvas) {
      this._size = this.canvas.width;
      this._center = this._size / 2;
    }
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

    // 清空
    ctx.clearRect(0, 0, size, size);

    // 绘制雷达背景
    this._drawBackground(ctx, center, size);

    // 绘制玩家（中心绿色三角）
    this._drawPlayer(ctx, center);

    // 绘制敌机（红色点）
    const enemies = this.aiSystem.getAliveEnemies();
    const pPos = this.player.mesh.position;
    const pYaw = this.player.mesh.rotation.y;

    for (const enemy of enemies) {
      const dx = enemy.mesh.position.x - pPos.x;
      const dz = enemy.mesh.position.z - pPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > range) continue;

      // 转换为雷达坐标（以玩家为中心，考虑旋转）
      const angle = Math.atan2(dx, dz) - pYaw;
      const r = (dist / range) * (center - 8);
      const rx = center + Math.sin(angle) * r;
      const ry = center - Math.cos(angle) * r;

      // 绘制红色敌机点
      ctx.beginPath();
      ctx.arc(rx, ry, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4444';
      ctx.fill();

      // 敌机正在攻击时画闪烁框
      if (enemy.state === 'attack') {
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx - 5, ry - 5, 10, 10);
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
        const r = (dist / range) * (center - 8);
        const rx = center + Math.sin(angle) * r;
        const ry = center - Math.cos(angle) * r;

        ctx.beginPath();
        ctx.arc(rx, ry, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffff00';
        ctx.fill();
      }
    }
  }

  /**
   * 绘制雷达背景
   */
  _drawBackground(ctx, center, size) {
    // 圆形背景
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 十字线
    ctx.beginPath();
    ctx.moveTo(center, 4);
    ctx.lineTo(center, size - 4);
    ctx.moveTo(4, center);
    ctx.lineTo(size - 4, center);
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // 距离圈
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(center, center, (center - 8) * i / 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.1)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  /**
   * 绘制玩家标记
   */
  _drawPlayer(ctx, center) {
    ctx.beginPath();
    ctx.moveTo(center, center - 5);
    ctx.lineTo(center + 3, center + 3);
    ctx.lineTo(center - 3, center + 3);
    ctx.closePath();
    ctx.fillStyle = '#00ff88';
    ctx.fill();
  }
}
