import * as THREE from 'three';
import { lerp } from '../utils/MathUtils.js';

// 定义每个阶段的光影参数
const PHASES = {
  day: {
    skyTop: new THREE.Color(0x2a5ca8),
    skyBottom: new THREE.Color(0x8ab6e6),
    sunColor: new THREE.Color(0xffffff),
    sunIntensity: 2.0,
    ambientColor: new THREE.Color(0xaaccff),
    hemiSky: new THREE.Color(0xaaccff),
    hemiGround: new THREE.Color(0x446688),
    fogColor: new THREE.Color(0x8ab6e6),
    fogFar: 8000
  },
  dusk: {
    skyTop: new THREE.Color(0x2a3e59),
    skyBottom: new THREE.Color(0xff7b54),
    sunColor: new THREE.Color(0xffaa50),
    sunIntensity: 2.5,
    ambientColor: new THREE.Color(0x404050),
    hemiSky: new THREE.Color(0xff8866),
    hemiGround: new THREE.Color(0x112233),
    fogColor: new THREE.Color(0xdc705e),
    fogFar: 6000
  },
  night: {
    skyTop: new THREE.Color(0x050814),
    skyBottom: new THREE.Color(0x121833),
    sunColor: new THREE.Color(0x445588),
    sunIntensity: 0.3,
    ambientColor: new THREE.Color(0x111122),
    hemiSky: new THREE.Color(0x111122),
    hemiGround: new THREE.Color(0x050511),
    fogColor: new THREE.Color(0x121833),
    fogFar: 5000
  },
  rain: {
    skyTop: new THREE.Color(0x424a52),
    skyBottom: new THREE.Color(0x5a6875),
    sunColor: new THREE.Color(0x8899aa),
    sunIntensity: 0.8,
    ambientColor: new THREE.Color(0x556677),
    hemiSky: new THREE.Color(0x5a6875),
    hemiGround: new THREE.Color(0x334455),
    fogColor: new THREE.Color(0x5a6875),
    fogFar: 3000 // Error: visibility decreases
  }
};

/**
 * 时间与天气动态系统
 */
export class TimeWeatherSystem {
  constructor(world) {
    this.world = world;

    // 尝试从浏览器本地存储读取上次的时间
    const savedTime = localStorage.getItem('jetBattle_gameHour');
    this.gameHour = savedTime !== null ? parseFloat(savedTime) : 14; // Default starts at 2 PM

    // 一天 = 现实中 6 分钟 (24 小时 / 6 分钟 = 4 游戏小时/每现实分钟 => 4/60 = 1/15)
    this.timeSpeed = 1 / 15;

    this.weather = 'clear'; // 'clear' | 'rain'
    this.weatherTimer = 60 + Math.random() * 60; // Random seconds until potential weather change
    this.rainDuration = 0;

    // Internal state for interpolation
    this.currentPhaseTarget = PHASES.day;
    this.lerpSpeed = 0.5; // per second

    // Current blended parameters
    this.currentParams = {
      skyTop: new THREE.Color(),
      skyBottom: new THREE.Color(),
      sunColor: new THREE.Color(),
      sunIntensity: 1.0,
      ambientColor: new THREE.Color(),
      hemiSky: new THREE.Color(),
      hemiGround: new THREE.Color(),
      fogColor: new THREE.Color(),
      fogFar: 8000
    };

    // 预分配颜色对象，避免每帧 GC 垃圾回收（避免 new THREE.Color()）
    this._oceanRainColor = new THREE.Color(0x2a3e4a);
    this._oceanDuskColor = new THREE.Color(0x004466);
    this._oceanDayColor = new THREE.Color(0x006994);
    this._cloudWhiteColor = new THREE.Color(0xffffff);
    this._tmpCloudColor = new THREE.Color();

    // Copy initial setup directly
    this._copyPhaseToCurrent(PHASES.day);
    this._applyToWorld();
  }

  _copyPhaseToCurrent(phase) {
    this.currentParams.skyTop.copy(phase.skyTop);
    this.currentParams.skyBottom.copy(phase.skyBottom);
    this.currentParams.sunColor.copy(phase.sunColor);
    this.currentParams.sunIntensity = phase.sunIntensity;
    this.currentParams.ambientColor.copy(phase.ambientColor);
    this.currentParams.hemiSky.copy(phase.hemiSky);
    this.currentParams.hemiGround.copy(phase.hemiGround);
    this.currentParams.fogColor.copy(phase.fogColor);
    this.currentParams.fogFar = phase.fogFar;
  }

  _lerpPhase(dt, targetPhase) {
    const t = Math.min(dt * this.lerpSpeed, 1.0);
    this.currentParams.skyTop.lerp(targetPhase.skyTop, t);
    this.currentParams.skyBottom.lerp(targetPhase.skyBottom, t);
    this.currentParams.sunColor.lerp(targetPhase.sunColor, t);
    this.currentParams.sunIntensity = lerp(this.currentParams.sunIntensity, targetPhase.sunIntensity, t);
    this.currentParams.ambientColor.lerp(targetPhase.ambientColor, t);
    this.currentParams.hemiSky.lerp(targetPhase.hemiSky, t);
    this.currentParams.hemiGround.lerp(targetPhase.hemiGround, t);
    this.currentParams.fogColor.lerp(targetPhase.fogColor, t);
    this.currentParams.fogFar = lerp(this.currentParams.fogFar, targetPhase.fogFar, t);
  }

  _determineTargetPhase() {
    if (this.weather === 'rain') return PHASES.rain;
    if (this.gameHour >= 6 && this.gameHour < 17) return PHASES.day;
    if (this.gameHour >= 17 && this.gameHour < 19.5) return PHASES.dusk;
    return PHASES.night;
  }

  _applyToWorld() {
    const w = this.world;
    if (!w) return;

    // Sky gradient
    if (w.sky && w.sky.material.uniforms) {
      w.sky.material.uniforms.topColor.value.copy(this.currentParams.skyTop);
      w.sky.material.uniforms.bottomColor.value.copy(this.currentParams.skyBottom);
    }

    // Ocean shading
    if (w._oceanMat && w._oceanMat.uniforms) {
      w._oceanMat.uniforms.uAmbientColor.value.copy(this.currentParams.ambientColor);
      w._oceanMat.uniforms.uSunColor.value.copy(this.currentParams.sunColor);
      // Determine ocean base color based on sky/weather
      if (this.weather === 'rain') {
        w._oceanMat.uniforms.uColor.value.lerp(this._oceanRainColor, 0.05); // dark grey-blue
      } else if (this.gameHour >= 17 && this.gameHour < 19.5) {
        w._oceanMat.uniforms.uColor.value.lerp(this._oceanDuskColor, 0.05); // sunset deep blue
      } else {
        w._oceanMat.uniforms.uColor.value.lerp(this._oceanDayColor, 0.05); // day vibrant blue
      }
    }

    // Lights
    if (w.sunLight) {
      w.sunLight.color.copy(this.currentParams.sunColor);
      w.sunLight.intensity = this.currentParams.sunIntensity;

      // Calculate sun position based on hour (simple circular path)
      const sunAngle = ((this.gameHour - 6) / 24) * Math.PI * 2; // 6 AM is sun angle 0
      const sunRadius = 4000;
      w.sunLight.position.x = Math.cos(sunAngle) * sunRadius;
      w.sunLight.position.y = Math.max(Math.sin(sunAngle) * sunRadius, -500); // don't go too far below ground
      w.sunLight.position.z = Math.cos(sunAngle) * sunRadius * 0.5; // Slight offset
      if (w._oceanMat) {
        w._oceanMat.uniforms.uSunDir.value.copy(w.sunLight.position).normalize();
      }
    }

    if (w.ambientLight) {
      w.ambientLight.color.copy(this.currentParams.ambientColor);
    }

    if (w.hemiLight) {
      w.hemiLight.color.copy(this.currentParams.hemiSky);
      w.hemiLight.groundColor.copy(this.currentParams.hemiGround);
    }

    // Fog
    if (w.scene && w.scene.fog) {
      w.scene.fog.color.copy(this.currentParams.fogColor);
      w.scene.fog.far = this.currentParams.fogFar;
    }

    // Clouds tint
    this._tmpCloudColor.copy(this.currentParams.sunColor).lerp(this._cloudWhiteColor, 0.5);
    w.clouds.forEach(group => {
      group.children.forEach(mesh => {
        if (mesh.material && mesh.material.color) {
          mesh.material.color.copy(this._tmpCloudColor);
        }
      });
    });
  }

  update(dt, elapsed) {
    // 1. Update Game Time
    // 如果处于夜晚 (19:30 ~ 06:00)，让时间流速加快 3 倍，缩短夜晚的持续时间
    const isNight = this.gameHour >= 19.5 || this.gameHour < 6;
    const currentSpeed = isNight ? this.timeSpeed * 3 : this.timeSpeed;
    this.gameHour += (dt / 60) * currentSpeed * 60;

    if (this.gameHour >= 24) {
      this.gameHour -= 24;
    }

    // 2. Weather Engine
    if (this.weather === 'rain') {
      this.rainDuration -= dt;
      if (this.rainDuration <= 0) {
        this.weather = 'clear';
        // 降低两次天气系统判定的间隔时间（从 1~3 分钟降至 0.5~1.5 分钟）
        this.weatherTimer = 30 + Math.random() * 60;
      }
    } else {
      this.weatherTimer -= dt;
      if (this.weatherTimer <= 0) {
        // 提高降雨概率：从 30% 提高到 70%
        if (Math.random() < 0.7) {
          this.weather = 'rain';
          // 降雨持续时间：1 ~ 2.5 分钟
          this.rainDuration = 60 + Math.random() * 90;
        } else {
          // 如果没下雨，等待再次判定的时间也缩短到 15~40 秒
          this.weatherTimer = 15 + Math.random() * 25;
        }
      }
    }

    // 3. Interpolate Colors
    const targetPhase = this._determineTargetPhase();
    this._lerpPhase(dt, targetPhase);

    // 4. Apply to World
    this._applyToWorld();

    // 5. 每隔 1 真实秒保存一次时间到本地存储
    this._saveTimer = (this._saveTimer || 0) + dt;
    if (this._saveTimer >= 1.0) {
      this._saveTimer = 0;
      localStorage.setItem('jetBattle_gameHour', this.gameHour.toString());
    }
  }
}
