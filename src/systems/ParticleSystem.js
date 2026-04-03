import * as THREE from 'three';

/**
 * 粒子特效系统（对象池优化版）
 * 使用预分配的 Mesh 池，避免频繁创建/销毁 Geometry 和 Material
 * 所有粒子共享同一 Geometry，通过颜色和缩放实现差异化
 */
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this._effects = [];

    // === 对象池 ===
    this._pool = [];
    this._poolSize = 1000;  // 增加池大小以容纳雨滴
    this._activeCount = 0;

    // 共享几何体（小球）
    this._sharedGeo = new THREE.SphereGeometry(1, 4, 4);

    // 预分配粒子池
    this._initPool();

    // 复用临时向量，避免每帧 new
    this._tmpVec = new THREE.Vector3();

    // 预创建固定雨滴特效容器，避免每帧都向数组 push 新对象
    this._rainEffect = { particles: [], type: 'rain' };
    this._effects.push(this._rainEffect);
  }

  /**
   * 初始化对象池 — 预创建所有粒子 Mesh
   */
  _initPool() {
    for (let i = 0; i < this._poolSize; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0,
      });
      const mesh = new THREE.Mesh(this._sharedGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this._pool.push({
        mesh,
        velocity: new THREE.Vector3(), // 预分配速度向量
        life: 0,
        maxLife: 0,
        isFlash: false,
        isTrail: false,
        isPowerUp: false,
        isRain: false,
        active: false,
      });
    }
  }

  /**
   * 从池中获取一个可用粒子
   */
  _acquire() {
    for (let i = 0; i < this._poolSize; i++) {
      const p = this._pool[i];
      if (!p.active) {
        p.active = true;
        p.mesh.visible = true;
        p.life = 0;
        p.isFlash = false;
        p.isTrail = false;
        p.isPowerUp = false;
        p.isRain = false;
        this._activeCount++;
        return p;
      }
    }
    return null; // 池耗尽，跳过
  }

  /**
   * 归还粒子到池中
   */
  _release(particle) {
    particle.active = false;
    particle.mesh.visible = false;
    particle.mesh.scale.set(1, 1, 1);
    this._activeCount--;
  }

  /**
   * 创建爆炸效果
   */
  createExplosion(position, scale = 1.0) {
    const particles = [];
    const count = Math.floor(30 * scale);

    for (let i = 0; i < count; i++) {
      const p = this._acquire();
      if (!p) break;

      const s = 0.3 + Math.random() * 0.5;
      p.mesh.scale.set(s, s, s);

      const color = Math.random() > 0.4 ? 0xff6600 : (Math.random() > 0.5 ? 0xff0000 : 0xffaa00);
      p.mesh.material.color.setHex(color);
      p.mesh.material.opacity = 1.0;
      p.mesh.position.copy(position);

      p.velocity.set(
        (Math.random() - 0.5) * 80 * scale,
        (Math.random() - 0.3) * 60 * scale,
        (Math.random() - 0.5) * 80 * scale
      );
      p.maxLife = 0.8 + Math.random() * 0.6;
      particles.push(p);
    }

    // 闪光球
    const flash = this._acquire();
    if (flash) {
      const fs = 3 * scale;
      flash.mesh.scale.set(fs, fs, fs);
      flash.mesh.material.color.setHex(0xffffaa);
      flash.mesh.material.opacity = 0.9;
      flash.mesh.position.copy(position);
      flash.velocity.set(0, 0, 0);
      flash.maxLife = 0.15;
      flash.isFlash = true;
      particles.push(flash);
    }

    this._effects.push({ particles, type: 'explosion' });
  }

  /**
   * 创建引擎尾迹
   */
  createTrail(position, direction) {
    const p = this._acquire();
    if (!p) return;

    p.mesh.scale.set(0.15, 0.15, 0.15);
    p.mesh.material.color.setHex(0x888888);
    p.mesh.material.opacity = 0.4;
    p.mesh.position.copy(position);

    p.velocity.copy(direction).multiplyScalar(-5);
    p.velocity.y += Math.random() * 2;
    p.maxLife = 0.5;
    p.isTrail = true;

    this._effects.push({
      particles: [p],
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
      const p = this._acquire();
      if (!p) break;

      p.mesh.scale.set(0.1, 0.1, 0.1);
      p.mesh.material.color.setHex(0xffff00);
      p.mesh.material.opacity = 0.9;
      p.mesh.position.copy(position);

      p.velocity.set(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30
      );
      p.maxLife = 0.2 + Math.random() * 0.15;
      particles.push(p);
    }

    this._effects.push({ particles, type: 'spark' });
  }

  /**
   * 创建盲盒拾取粒子爆发
   */
  createPowerUpPickup(position, color) {
    const particles = [];
    const count = 25;

    for (let i = 0; i < count; i++) {
      const p = this._acquire();
      if (!p) break;

      const s = 0.2 + Math.random() * 0.3;
      p.mesh.scale.set(s, s, s);
      p.mesh.material.color.setHex(color);
      p.mesh.material.opacity = 1.0;
      p.mesh.position.copy(position);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 30 + Math.random() * 40;
      p.velocity.set(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );
      p.maxLife = 0.6 + Math.random() * 0.4;
      p.isPowerUp = true;
      particles.push(p);
    }

    // 中心闪光球
    const flash = this._acquire();
    if (flash) {
      flash.mesh.scale.set(4, 4, 4);
      flash.mesh.material.color.setHex(color);
      flash.mesh.material.opacity = 0.8;
      flash.mesh.position.copy(position);
      flash.velocity.set(0, 0, 0);
      flash.maxLife = 0.2;
      flash.isFlash = true;
      particles.push(flash);
    }

    this._effects.push({ particles, type: 'powerup' });
  }

  /**
   * 生成雨滴
   */
  createRain(cameraPosition) {
    const particles = [];
    const count = 3; // 由于在每帧执行，适当控制数量

    for (let i = 0; i < count; i++) {
      const p = this._acquire();
      if (!p) break;

      p.mesh.scale.set(0.04, 1.5, 0.04); // 细长雨滴
      p.mesh.material.color.setHex(0x99aabb);
      p.mesh.material.opacity = 0.3;

      // 在相机前方大范围生成
      p.mesh.position.set(
        cameraPosition.x + (Math.random() - 0.5) * 800,
        cameraPosition.y + Math.random() * 200 + 50,
        cameraPosition.z - Math.random() * 600 - 100
      );

      // 受风力影响的快速下落
      p.velocity.set(
        -30 + (Math.random() - 0.5) * 20,
        -500 - Math.random() * 200,
        (Math.random() - 0.5) * 20
      );
      p.maxLife = 1.0;
      p.isRain = true;
      particles.push(p);
    }

    if (particles.length > 0) {
      // 不再凭空制造对象引发 GC，而是直接推送复用的持久对象里面
      for (let i = 0; i < particles.length; i++) {
        this._rainEffect.particles.push(particles[i]);
      }
    }
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
          // 归还到池中（不销毁）
          this._release(particle);
          // O(1) 的删除方法（Swap and Pop），比 splice 速度快，避免元素前移产生的内存消耗
          effect.particles[p] = effect.particles[effect.particles.length - 1];
          effect.particles.pop();
          continue;
        }

        allDead = false;
        const progress = particle.life / particle.maxLife;

        // 移动（复用临时向量避免 clone）
        this._tmpVec.copy(particle.velocity).multiplyScalar(dt);
        particle.mesh.position.add(this._tmpVec);

        // 如果是雨滴且掉落到地平线，立刻消失
        if (particle.isRain && particle.mesh.position.y < 0) {
          particle.life = particle.maxLife;
        }

        // 重力
        if (!particle.isFlash && !particle.isRain) {
          particle.velocity.y -= 30 * dt;
        }

        // 减速
        if (!particle.isRain) {
          particle.velocity.multiplyScalar(1 - 2 * dt);
        }

        // 淡出
        particle.mesh.material.opacity = 1 - progress;

        // 闪光球快速膨胀并消失
        if (particle.isFlash) {
          const s = 1 + progress * 5;
          particle.mesh.scale.set(s, s, s);
        }

        // 尾迹缩小
        if (particle.isTrail) {
          const s = (1 - progress * 0.8) * 0.15;
          particle.mesh.scale.set(s, s, s);
        }
      }

      if (effect.type !== 'rain' && (allDead || effect.particles.length === 0)) {
        this._effects.splice(e, 1);
      }
    }
  }
}
