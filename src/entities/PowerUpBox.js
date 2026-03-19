import * as THREE from 'three';
import { CONFIG } from '../utils/Config.js';

/**
 * 盲盒道具实体
 * 3D 旋转发光立方体，不同稀有度对应不同颜色和光效
 */
export class PowerUpBox {
  constructor(position, rarity = 'common') {
    this.rarity = rarity;
    this.isCollected = false;
    this.lifetime = 0;
    this.maxLifetime = CONFIG.powerUp.mapSpawn.lifetime;

    // 动画参数
    this._baseY = position.y;
    this._rotSpeed = Math.PI / 2; // 90°/秒
    this._bobSpeed = 2;           // 浮动频率
    this._bobAmplitude = 3;       // 浮动振幅
    this._elapsed = 0;
    this._collectAnim = 0;        // 收集动画进度（0 = 未收集）

    // 获取稀有度颜色
    const color = CONFIG.powerUp.rarityColors[rarity] || 0x00ff88;

    // 根组
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);

    // === 核心立方体 ===
    const boxGeo = new THREE.BoxGeometry(3, 3, 3);
    const boxMat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.6,
      roughness: 0.2,
      emissive: color,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9,
    });
    this._box = new THREE.Mesh(boxGeo, boxMat);
    this.mesh.add(this._box);

    // === 外框线（增强辨识度） ===
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
    });
    this._edges = new THREE.LineSegments(edgesGeo, edgesMat);
    this.mesh.add(this._edges);

    // === 点光源（照亮周围） ===
    const lightIntensity = rarity === 'legendary' ? 3 : rarity === 'epic' ? 2 : rarity === 'rare' ? 1.5 : 1;
    this._light = new THREE.PointLight(color, lightIntensity, 50);
    this.mesh.add(this._light);

    // === 光柱（稀有以上） ===
    if (rarity !== 'common') {
      const pillarHeight = rarity === 'legendary' ? 60 : rarity === 'epic' ? 40 : 25;
      const pillarGeo = new THREE.CylinderGeometry(0.3, 0.8, pillarHeight, 6);
      const pillarMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: rarity === 'legendary' ? 0.4 : 0.25,
      });
      this._pillar = new THREE.Mesh(pillarGeo, pillarMat);
      this._pillar.position.y = -pillarHeight / 2;
      this.mesh.add(this._pillar);
    }

    // === 传说级额外光环 ===
    if (rarity === 'legendary') {
      const ringGeo = new THREE.TorusGeometry(5, 0.15, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.6,
      });
      this._ring = new THREE.Mesh(ringGeo, ringMat);
      this._ring.rotation.x = Math.PI / 2;
      this.mesh.add(this._ring);
    }
  }

  /**
   * 每帧更新（旋转 + 浮动 + 寿命）
   */
  update(dt) {
    if (this.isCollected) {
      // 收集动画：缩小并消失
      this._collectAnim += dt * 4; // 0.25 秒完成
      const scale = Math.max(0, 1 - this._collectAnim);
      this.mesh.scale.setScalar(scale);
      if (this._collectAnim >= 1) {
        this.isCollected = true; // 确保标记
      }
      return;
    }

    this._elapsed += dt;
    this.lifetime += dt;

    // 旋转
    this._box.rotation.y += this._rotSpeed * dt;
    this._box.rotation.x += this._rotSpeed * 0.3 * dt;
    this._edges.rotation.copy(this._box.rotation);

    // 上下浮动
    const bobOffset = Math.sin(this._elapsed * this._bobSpeed) * this._bobAmplitude;
    this.mesh.position.y = this._baseY + bobOffset;

    // 光源脉冲
    const pulse = 0.7 + Math.sin(this._elapsed * 3) * 0.3;
    this._light.intensity = pulse * (this.rarity === 'legendary' ? 3 : this.rarity === 'epic' ? 2 : 1.5);

    // 传说级光环旋转
    if (this._ring) {
      this._ring.rotation.z += dt * 2;
    }

    // 寿命检测（即将过期时闪烁）
    if (this.lifetime > this.maxLifetime - 5) {
      const blink = Math.sin(this._elapsed * 8) > 0;
      this._box.material.opacity = blink ? 0.9 : 0.3;
    }

    // 到期自动消失
    if (this.lifetime >= this.maxLifetime) {
      this.isCollected = true;
    }
  }

  /**
   * 标记为已收集，触发缩小消失
   */
  collect() {
    this.isCollected = true;
    this._collectAnim = 0.01; // 开始动画
  }

  /**
   * 收集动画是否完成（可从场景移除）
   */
  isReadyToRemove() {
    return this.isCollected && this._collectAnim >= 1;
  }

  /**
   * 清理资源
   */
  dispose() {
    this.mesh.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
