import * as THREE from 'three';

/**
 * 粒子特效系统
 * 管理爆炸、尾迹、受击闪光等效果
 */
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this._effects = [];
  }

  /**
   * 创建爆炸效果
   */
  createExplosion(position, scale = 1.0) {
    const particles = [];
    const count = Math.floor(30 * scale);

    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.3 + Math.random() * 0.5, 4, 4);
      const color = Math.random() > 0.4 ? 0xff6600 : (Math.random() > 0.5 ? 0xff0000 : 0xffaa00);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1.0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      // 随机方向速度
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 80 * scale,
        (Math.random() - 0.3) * 60 * scale,
        (Math.random() - 0.5) * 80 * scale
      );

      this.scene.add(mesh);
      particles.push({ mesh, velocity, life: 0, maxLife: 0.8 + Math.random() * 0.6 });
    }

    // 闪光球
    const flashGeo = new THREE.SphereGeometry(3 * scale, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.9,
    });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.copy(position);
    this.scene.add(flash);
    particles.push({ mesh: flash, velocity: new THREE.Vector3(), life: 0, maxLife: 0.15, isFlash: true });

    this._effects.push({ particles, type: 'explosion' });
  }

  /**
   * 创建引擎尾迹
   */
  createTrail(position, direction) {
    const geo = new THREE.SphereGeometry(0.15, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);

    // 向后偏移的微弱速度
    const velocity = direction.clone().multiplyScalar(-5);
    velocity.y += Math.random() * 2;

    this.scene.add(mesh);
    this._effects.push({
      particles: [{ mesh, velocity, life: 0, maxLife: 0.5, isTrail: true }],
      type: 'trail',
    });
  }

  /**
   * 创建受击火花
   */
  createHitSpark(position) {
    const particles = [];
    const count = 8;

    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.1, 3, 3);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30
      );

      this.scene.add(mesh);
      particles.push({ mesh, velocity, life: 0, maxLife: 0.2 + Math.random() * 0.15 });
    }

    this._effects.push({ particles, type: 'spark' });
  }

  /**
   * 每帧更新所有粒子
   */
  update(dt) {
    for (let e = this._effects.length - 1; e >= 0; e--) {
      const effect = this._effects[e];
      let allDead = true;

      for (let p = effect.particles.length - 1; p >= 0; p--) {
        const particle = effect.particles[p];
        particle.life += dt;

        if (particle.life >= particle.maxLife) {
          // 销毁粒子
          this.scene.remove(particle.mesh);
          particle.mesh.geometry.dispose();
          particle.mesh.material.dispose();
          effect.particles.splice(p, 1);
          continue;
        }

        allDead = false;
        const progress = particle.life / particle.maxLife;

        // 移动
        particle.mesh.position.add(particle.velocity.clone().multiplyScalar(dt));

        // 重力
        if (!particle.isFlash) {
          particle.velocity.y -= 30 * dt;
        }

        // 减速
        particle.velocity.multiplyScalar(1 - 2 * dt);

        // 淡出
        particle.mesh.material.opacity = 1 - progress;

        // 闪光球快速膨胀并消失
        if (particle.isFlash) {
          particle.mesh.scale.setScalar(1 + progress * 5);
        }

        // 尾迹缩小
        if (particle.isTrail) {
          particle.mesh.scale.setScalar(1 - progress * 0.8);
        }
      }

      if (allDead || effect.particles.length === 0) {
        this._effects.splice(e, 1);
      }
    }
  }
}
