/**
 * 音效管理器
 * 使用 Web Audio API 生成合成音效（无需外部音频文件）
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.masterVolume = 0.3;

    // 直接初始化音频
    this._initAudio();

    // 浏览器策略：需要用户交互才能恢复 AudioContext
    this._setupAutoResume();

    // 绑定静音切换按钮
    this._setupSoundToggle();
  }

  /**
   * 监听首次用户交互，自动恢复被浏览器暂停的 AudioContext
   */
  _setupAutoResume() {
    const resumeAudio = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          console.log('[Audio] AudioContext 已恢复');
        });
      }
      // 恢复后移除监听
      ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(evt => {
        document.removeEventListener(evt, resumeAudio);
      });
    };
    ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(evt => {
      document.addEventListener(evt, resumeAudio, { once: false });
    });
  }

  /**
   * 绑定静音切换按钮
   */
  _setupSoundToggle() {
    const toggleBtn = document.getElementById('sound-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.enabled = !this.enabled;
        toggleBtn.textContent = this.enabled ? '🔊' : '🔇';
      });
    }
  }

  /**
   * 初始化 Web Audio
   */
  _initAudio() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.enabled = true;

      // 更新静音按钮
      const toggleBtn = document.getElementById('sound-toggle');
      if (toggleBtn) toggleBtn.textContent = '🔊';

      console.log('[Audio] 音频已启用');
    } catch (e) {
      console.warn('[Audio] 无法初始化 Web Audio:', e);
    }
  }

  /**
   * 播放机枪射击音效
   */
  playGunFire() {
    if (!this.enabled || !this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 噪声生成器模拟枪声
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // 滤波器让声音更低沉
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.masterVolume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
  }

  /**
   * 播放导弹发射音效
   */
  playMissileLaunch() {
    if (!this.enabled || !this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 低频嗡嗡 + 升调
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.masterVolume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  /**
   * 播放爆炸音效
   */
  playExplosion() {
    if (!this.enabled || !this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 大噪声爆炸
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.masterVolume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
  }

  /**
   * 播放受击音效
   */
  playHit() {
    if (!this.enabled || !this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 短促金属撞击声
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.masterVolume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * 播放干扰弹释放音效
   */
  playFlare() {
    if (!this.enabled || !this.ctx) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 嘶嘶声
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5 * Math.exp(-i / (bufferSize * 0.5));
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this.masterVolume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
  }

  /**
   * 播放引擎循环（背景引擎声）
   */
  startEngineLoop() {
    if (!this.enabled || !this.ctx || this._engineOsc) return;

    const ctx = this.ctx;

    this._engineOsc = ctx.createOscillator();
    this._engineOsc.type = 'sawtooth';
    this._engineOsc.frequency.value = 60;

    this._engineGain = ctx.createGain();
    this._engineGain.gain.value = this.masterVolume * 0.05;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    this._engineOsc.connect(filter);
    filter.connect(this._engineGain);
    this._engineGain.connect(ctx.destination);
    this._engineOsc.start();
  }

  /**
   * 根据油门更新引擎音调
   */
  updateEngine(throttlePercent) {
    if (!this._engineOsc) return;
    this._engineOsc.frequency.value = 40 + throttlePercent * 120;
    this._engineGain.gain.value = this.masterVolume * (0.03 + throttlePercent * 0.04);
  }
}
