'use strict';
/* Audio: every sound effect is synthesized with WebAudio and the music is a tiny step sequencer
 * playing hand-written chiptune loops — no audio files, so the build stays tiny. */

const Snd = {
  ctx: null, master: null, musicBus: null, sfxBus: null, noiseBuf: null,
  musicOn: true, sfxOn: true, suspended: false, adMute: false,
  cur: null, _timer: null, _step: 0, _next: 0,

  /** must be called from a user gesture (autoplay policy) */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && !this.suspended) this.ctx.resume().then(() => this._start()).catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      // the music runs through a low-pass that duck() closes while an orb wobbles (muffled, quieter: suspense)
      this.musicLP = this.ctx.createBiquadFilter(); this.musicLP.type = 'lowpass'; this.musicLP.frequency.value = 20000; this.musicLP.Q.value = 0.5;
      this.musicLP.connect(this.master);
      this.musicBus = this.ctx.createGain(); this.musicBus.connect(this.musicLP);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applySettings();
      // made outside a tap (the opening tries at once) it waits suspended; the first tap resumes it. An interruption
      // (a call on iOS) that ends by itself brings the context back to 'running' without us: start what was asked for
      this.ctx.onstatechange = () => this._start();
      if (this.ctx.state === 'suspended') this.ctx.resume().then(() => this._start()).catch(() => {});
      this._start();
    } catch (e) { console.warn('audio init failed', e); this.ctx = null; }
  },
  /** is sound actually playing (created from a gesture, or allowed by the page that embeds the game)? */
  live() { return !!this.ctx && this.ctx.state === 'running'; },
  applySettings() {
    if (!this.ctx) return;
    const muted = this.adMute || this.suspended || Platform.forcedMute();
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(muted ? 0 : 0.9, t, 0.02);
    this.musicBus.gain.setTargetAtTime(this.musicOn ? 0.55 * this.duckK : 0, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.sfxOn ? 0.9 : 0, t, 0.02);
  },
  duckK: 1,
  /** k < 1 lowers and muffles the music (1 = normal); lp: the low-pass cut-off meanwhile */
  duck(k = 1, lp = 20000) {
    this.duckK = k;
    if (!this.ctx) return;
    const t = this.ctx.currentTime, tc = k < 1 ? 0.12 : 0.3;
    this.musicBus.gain.setTargetAtTime(this.musicOn ? 0.55 * k : 0, t, tc);
    if (this.musicLP) this.musicLP.frequency.setTargetAtTime(k < 1 ? lp : 20000, t, tc);
  },
  /** one short pitched tone (the ticking of the catch ring, the stars of a constellation) */
  blip(freq, dur = 0.05, vol = 0.05, type = 'triangle') {
    if (!this.sfx()) return;
    this._tone(freq, dur, { type, vol });
  },
  setMusic(on) { this.musicOn = on; this.applySettings(); },
  setSfx(on) { this.sfxOn = on; this.applySettings(); },
  pauseAll(reason) {
    if (reason === 'ad') this.adMute = true; else this.suspended = true;
    this.applySettings();
    if (this.ctx && reason !== 'ad') this.ctx.suspend().catch(() => {});
  },
  resumeAll(reason) {
    if (reason === 'ad') this.adMute = false; else this.suspended = false;
    if (this.ctx && !this.suspended) this.ctx.resume().then(() => this._start()).catch(() => {});
    this.applySettings();
  },

  /* ---------- primitives ---------- */
  _tone(freq, dur, o = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    const g = c.createGain();
    const v = o.vol == null ? 0.15 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; osc.connect(fl); node = fl; }
    node.connect(g).connect(o.bus || this.sfxBus);
    osc.start(t); osc.stop(t + dur + 0.03);
  },
  _noise(dur, o = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + (o.delay || 0);
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const fl = c.createBiquadFilter(); fl.type = o.filter || 'lowpass'; fl.frequency.setValueAtTime(o.freq || 1200, t); fl.Q.value = o.q || 0.8;
    if (o.slide) fl.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    const g = c.createGain(); const v = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl).connect(g).connect(o.bus || this.sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  },
  _arp(freqs, step, o = {}) { freqs.forEach((f, i) => this._tone(f, o.dur || step * 1.6, Object.assign({}, o, { delay: (o.delay || 0) + i * step }))); },

  /* ---------- sound effects ---------- */
  /** sound effects only when sound really plays: on a paused context (before the first tap, a hidden tab) they would
   *  all be scheduled at its frozen clock and burst out together when it resumes */
  sfx() { return !!this.ctx && this.sfxOn && !this.suspended && this.ctx.state === 'running'; },
  play(name) {
    if (!this.sfx()) return;
    const T = (f, d, o) => this._tone(f, d, o), N = (d, o) => this._noise(d, o);
    switch (name) {
      case 'click': T(900, 0.06, { type: 'triangle', vol: 0.12, slide: 1300 }); break;
      case 'tick': T(1800, 0.025, { type: 'square', vol: 0.04 }); break;
      case 'open': T(520, 0.09, { type: 'sine', vol: 0.14, slide: 800 }); T(780, 0.1, { type: 'sine', vol: 0.1, slide: 1100, delay: 0.05 }); break;
      case 'close': T(780, 0.09, { type: 'sine', vol: 0.12, slide: 480 }); break;
      case 'error': T(220, 0.16, { type: 'square', vol: 0.08, slide: 150, lp: 1400 }); break;
      case 'coin': T(1320, 0.07, { type: 'square', vol: 0.06, lp: 4000 }); T(1760, 0.14, { type: 'square', vol: 0.06, lp: 4000, delay: 0.06 }); break;
      case 'select': T(660, 0.05, { type: 'triangle', vol: 0.1 }); T(990, 0.08, { type: 'triangle', vol: 0.1, delay: 0.04 }); break;
      case 'hit': N(0.14, { freq: 1000, vol: 0.32, slide: 300 }); T(170, 0.1, { type: 'square', vol: 0.12, slide: 60, lp: 900 }); break;
      case 'crit': N(0.22, { freq: 2400, vol: 0.34, slide: 300 }); T(420, 0.2, { type: 'square', vol: 0.12, slide: 70, lp: 1600 }); break;
      case 'super': this._arp([660, 880, 1320], 0.05, { type: 'triangle', vol: 0.1 }); break;
      case 'weak': T(300, 0.2, { type: 'triangle', vol: 0.1, slide: 190 }); break;
      case 'miss': N(0.25, { filter: 'bandpass', freq: 600, slide: 3000, vol: 0.14 }); break;
      case 'heal': this._arp([523, 659, 784, 1046, 1318], 0.06, { type: 'sine', vol: 0.12 }); break;
      case 'buff': T(440, 0.25, { type: 'triangle', vol: 0.11, slide: 990 }); T(660, 0.22, { type: 'sine', vol: 0.07, slide: 1320, delay: 0.06 }); break;
      case 'debuff': T(880, 0.28, { type: 'triangle', vol: 0.1, slide: 300 }); break;
      case 'status': T(300, 0.3, { type: 'sawtooth', vol: 0.06, slide: 600, lp: 1200 }); T(450, 0.3, { type: 'sawtooth', vol: 0.05, slide: 200, lp: 1200, delay: 0.1 }); break;
      case 'levelup': this._arp([523, 659, 784, 1046], 0.07, { type: 'square', vol: 0.07, lp: 3500 }); this._arp([1046, 1318, 1568], 0.001, { type: 'triangle', vol: 0.06, dur: 0.5, delay: 0.3 }); break;
      case 'throw': N(0.3, { filter: 'bandpass', freq: 400, slide: 2500, vol: 0.12 }); T(300, 0.28, { type: 'sine', vol: 0.08, slide: 900 }); break;
      case 'wobble': T(320, 0.12, { type: 'sine', vol: 0.2, slide: 120 }); N(0.05, { freq: 3000, vol: 0.08 }); break;
      case 'absorb': T(1200, 0.35, { type: 'sine', vol: 0.12, slide: 200 }); N(0.3, { filter: 'bandpass', freq: 3000, slide: 500, vol: 0.08 }); break;
      case 'catch': this._arp([784, 988, 1175, 1568], 0.08, { type: 'square', vol: 0.07, lp: 4000 }); this._arp([1568, 1976, 2350], 0.001, { type: 'triangle', vol: 0.06, dur: 0.6, delay: 0.34 }); break;
      case 'break': N(0.25, { freq: 3000, vol: 0.25, slide: 400 }); T(600, 0.25, { type: 'square', vol: 0.08, slide: 180, lp: 2000 }); break;
      case 'faint': T(440, 0.55, { type: 'triangle', vol: 0.13, slide: 90 }); break;
      case 'evolve': T(200, 1.6, { type: 'sawtooth', vol: 0.05, slide: 1600, lp: 2400 }); this._arp([523, 659, 784, 1046, 1318, 1568], 0.12, { type: 'sine', vol: 0.07, delay: 0.4 }); break;
      case 'fire': N(0.4, { freq: 700, vol: 0.28, slide: 200 }); N(0.3, { filter: 'highpass', freq: 3000, vol: 0.06, delay: 0.05 }); break;
      case 'water': for (let i = 0; i < 4; i++) T(500 + Math.random() * 700, 0.08, { type: 'sine', vol: 0.12, slide: 1500 + Math.random() * 500, delay: i * 0.06 }); break;
      case 'earth': T(100, 0.32, { type: 'sine', vol: 0.32, slide: 40 }); N(0.3, { freq: 400, vol: 0.2 }); break;
      case 'air': N(0.3, { filter: 'bandpass', freq: 500, slide: 3500, vol: 0.14 }); T(1400, 0.16, { type: 'square', vol: 0.05, slide: 180, lp: 3000, delay: 0.08 }); break;
      case 'phys': N(0.12, { filter: 'bandpass', freq: 900, slide: 2200, vol: 0.12 }); break;
      case 'chest': this._arp([660, 880, 1100, 1320], 0.05, { type: 'triangle', vol: 0.1 }); break;
      case 'quest': this._arp([784, 1046, 1318], 0.09, { type: 'square', vol: 0.06, lp: 3500 }); break;
      case 'win': this._arp([523, 659, 784, 1046], 0.1, { type: 'square', vol: 0.07, lp: 3500 }); this._arp([523, 659, 784, 1046], 0.002, { type: 'triangle', vol: 0.06, dur: 0.9, delay: 0.42 }); break;
      case 'lose': this._arp([523, 466, 415, 349], 0.16, { type: 'triangle', vol: 0.1, dur: 0.3 }); break;
      case 'pop': T(500, 0.08, { type: 'sine', vol: 0.14, slide: 1100 }); break;
      case 'warp': T(150, 0.9, { type: 'sawtooth', vol: 0.05, slide: 1400, lp: 1800 }); N(0.8, { filter: 'bandpass', freq: 300, slide: 3000, vol: 0.08 }); break;
      case 'vs': N(0.45, { freq: 1600, vol: 0.28, slide: 200 }); T(120, 0.55, { type: 'sawtooth', vol: 0.11, slide: 50, lp: 900 }); this._arp([392, 523, 659, 784], 0.035, { type: 'square', vol: 0.06, lp: 3000, delay: 0.12, dur: 0.3 }); break;
      case 'whoosh': N(0.36, { filter: 'bandpass', freq: 280, slide: 2800, vol: 0.16 }); break;
      case 'shard': this._arp([1568, 2093, 2637], 0.045, { type: 'triangle', vol: 0.08 }); T(3136, 0.25, { type: 'sine', vol: 0.04, delay: 0.14 }); break;
      case 'notice': T(880, 0.08, { type: 'square', vol: 0.05, lp: 3000 }); T(1320, 0.12, { type: 'square', vol: 0.05, lp: 3000, delay: 0.07 }); break;
      case 'medal': this._arp([784, 988, 1175, 1568], 0.07, { type: 'square', vol: 0.06, lp: 3800 }); this._arp([1175, 1568, 1976], 0.001, { type: 'triangle', vol: 0.05, dur: 0.7, delay: 0.3 }); break;
      case 'crack': N(0.08, { filter: 'highpass', freq: 2500, vol: 0.28 }); T(240, 0.09, { type: 'square', vol: 0.06, slide: 110, lp: 1500 }); break;
      case 'hatch': N(0.25, { filter: 'bandpass', freq: 3000, vol: 0.12 }); this._arp([523, 659, 784, 1046, 1318, 1568], 0.06, { type: 'square', vol: 0.065, lp: 3800 }); break;
      case 'ice': T(2400, 0.25, { type: 'sine', vol: 0.08, slide: 1200 }); N(0.22, { filter: 'highpass', freq: 5000, vol: 0.1 }); T(3200, 0.15, { type: 'triangle', vol: 0.05, delay: 0.06 }); break;
      case 'thunder': N(0.9, { freq: 900, vol: 0.42, slide: 90 }); N(0.14, { filter: 'highpass', freq: 3000, vol: 0.3 }); break;
      case 'rumble': T(62, 0.8, { type: 'sine', vol: 0.4, slide: 34 }); N(0.8, { freq: 320, vol: 0.34, slide: 120 }); break;
      // the opening (3.1): a deep cinematic impact, a rising sweep, a blade of light, a roar and a falling star
      case 'boom': T(58, 1.1, { type: 'sine', vol: 0.5, slide: 28 }); N(1.0, { freq: 700, vol: 0.42, slide: 70 }); N(0.16, { filter: 'highpass', freq: 2200, vol: 0.2 }); T(116, 0.5, { type: 'triangle', vol: 0.12, slide: 50, delay: 0.02 }); break;
      case 'riser': N(1.3, { filter: 'bandpass', freq: 180, slide: 5200, vol: 0.13, attack: 1.1, q: 2.5 }); T(110, 1.3, { type: 'sawtooth', vol: 0.03, slide: 880, lp: 1600, attack: 1.1 }); break;
      case 'slash': N(0.22, { filter: 'highpass', freq: 3200, vol: 0.26, slide: 9000 }); T(2400, 0.2, { type: 'sine', vol: 0.06, slide: 500 }); break;
      case 'roar': N(0.9, { freq: 520, vol: 0.34, slide: 160, attack: 0.08 }); T(118, 0.85, { type: 'sawtooth', vol: 0.09, slide: 72, lp: 800, attack: 0.06 }); T(177, 0.7, { type: 'square', vol: 0.04, slide: 96, lp: 700, attack: 0.06 }); break;
      case 'growl': N(0.7, { freq: 260, vol: 0.3, slide: 90, attack: 0.1 }); T(72, 0.75, { type: 'sawtooth', vol: 0.09, slide: 50, lp: 420, attack: 0.1 }); break;
      case 'meteor': N(0.9, { filter: 'bandpass', freq: 4200, slide: 300, vol: 0.16, attack: 0.5 }); T(1800, 0.8, { type: 'sine', vol: 0.05, slide: 160, attack: 0.4 }); break;
      case 'sparkle': this._arp([1568, 2093, 2637, 3136], 0.035, { type: 'sine', vol: 0.06 }); break;
      // the catch (3.2): timing grades, the orb striking, the ring lassoing the Orbling, the snap shut, the bounces,
      // the rattle of a wobble, the lock of a catch and the burst of an escape
      case 'aim_nice': T(880, 0.12, { type: 'triangle', vol: 0.11 }); T(1320, 0.1, { type: 'sine', vol: 0.05, delay: 0.03 }); break;
      case 'aim_great': this._arp([880, 1320], 0.06, { type: 'triangle', vol: 0.11, dur: 0.16 }); T(1760, 0.2, { type: 'sine', vol: 0.05, delay: 0.1 }); break;
      case 'aim_exc': this._arp([1047, 1319, 1568, 2093], 0.045, { type: 'square', vol: 0.055, lp: 4200, dur: 0.14 }); T(2637, 0.45, { type: 'sine', vol: 0.06, delay: 0.18 }); N(0.4, { filter: 'highpass', freq: 6500, vol: 0.07, attack: 0.05 }); break;
      case 'orb_hit': T(760, 0.07, { type: 'square', vol: 0.09, slide: 420, lp: 2600 }); N(0.07, { filter: 'bandpass', freq: 1900, vol: 0.2 }); T(190, 0.1, { type: 'sine', vol: 0.22, slide: 90 }); break;
      case 'orb_open': N(0.34, { filter: 'bandpass', freq: 500, slide: 5200, vol: 0.12, q: 3 }); T(660, 0.3, { type: 'sine', vol: 0.08, slide: 1760 }); T(1320, 0.26, { type: 'triangle', vol: 0.04, slide: 2640, delay: 0.05 }); break;
      case 'orb_suck': T(1760, 0.42, { type: 'sine', vol: 0.1, slide: 170 }); N(0.42, { filter: 'bandpass', freq: 3600, slide: 260, vol: 0.1 }); T(880, 0.38, { type: 'triangle', vol: 0.05, slide: 110, delay: 0.03 }); break;
      case 'orb_clack': N(0.035, { filter: 'highpass', freq: 2600, vol: 0.32 }); T(1250, 0.05, { type: 'square', vol: 0.08, slide: 640, lp: 4200 }); T(170, 0.14, { type: 'sine', vol: 0.28, slide: 64 }); break;
      case 'orb_lock': N(0.03, { filter: 'highpass', freq: 4000, vol: 0.36 }); T(2093, 0.5, { type: 'triangle', vol: 0.08 }); T(3136, 0.36, { type: 'sine', vol: 0.05, delay: 0.02 }); T(104, 0.28, { type: 'sine', vol: 0.32, slide: 52 }); break;
      case 'orb_burst': N(0.32, { freq: 3600, vol: 0.3, slide: 280 }); T(720, 0.26, { type: 'square', vol: 0.08, slide: 150, lp: 2600 }); T(1440, 0.12, { type: 'triangle', vol: 0.06, slide: 320 }); T(90, 0.3, { type: 'sine', vol: 0.26, slide: 45 }); break;
      case 'orb_shake': for (let i = 0; i < 7; i++) { N(0.025, { filter: 'highpass', freq: 2400 + i * 260, vol: 0.13, delay: i * 0.045 }); T(300 + i * 40, 0.03, { type: 'square', vol: 0.035, lp: 2400, delay: i * 0.045 }); } break;
      case 'heartbeat': T(58, 0.13, { type: 'sine', vol: 0.3, slide: 40 }); T(58, 0.12, { type: 'sine', vol: 0.2, slide: 40, delay: 0.17 }); break;
    }
  },
  /** a bounce of the orb on the ground (v: 1 = the first, loudest one) */
  bounce(v = 1) {
    if (!this.sfx()) return;
    this._tone(250 + 30 * (1 - v), 0.1, { type: 'sine', vol: 0.24 * v, slide: 118 });
    this._noise(0.045, { freq: 2200, vol: 0.09 * v });
  },
  /** the tick-tock of a wobbling orb; i = 0, 1, 2 climbs a little each time */
  rattle(i = 0) {
    if (!this.sfx()) return;
    const T = (f, d, o) => this._tone(f, d, o), N = (d, o) => this._noise(d, o);
    N(0.035, { filter: 'highpass', freq: 3000, vol: 0.15 }); T(430 + i * 45, 0.05, { type: 'square', vol: 0.05, lp: 2600 });
    N(0.035, { filter: 'highpass', freq: 2600, vol: 0.13, delay: 0.14 }); T(360 + i * 45, 0.06, { type: 'square', vol: 0.045, lp: 2400, delay: 0.14 });
    T(92, 0.13, { type: 'sine', vol: 0.2, slide: 60, delay: 0.14 });
  },
  /** one bell-like note for scripted scenes (the zodiac wheel lighting up sign by sign) */
  note(freq, dur = 0.7, vol = 0.07) {
    if (!this.sfx()) return;
    this._tone(freq, dur, { type: 'sine', vol });
    this._tone(freq * 2.005, dur * 0.6, { type: 'sine', vol: vol * 0.35 });
    this._tone(freq * 3.01, dur * 0.3, { type: 'triangle', vol: vol * 0.12 });
  },

  /** species cry: pitch from the species, timbre from its element, deeper for later stages */
  cry(id) {
    if (!this.sfx() || !SPECIES[id]) return;
    const sp = SPECIES[id], h = U.hash(id);
    const type = { fire: 'sawtooth', water: 'sine', earth: 'triangle', air: 'square' }[sp.el] || 'triangle';
    const f0 = (320 + (h % 460)) / (1 + (Math.min(sp.stage, 3) - 1) * 0.38) * (sp.legend ? 0.7 : 1);
    this._tone(f0, 0.14, { type, vol: 0.07, slide: f0 * 1.6, lp: 2600 });
    this._tone(f0 * 1.3, 0.2, { type, vol: 0.06, slide: f0 * (h % 2 ? 0.7 : 1.9), delay: 0.11, lp: 2600 });
    if (sp.stage >= 3) this._tone(f0 * 0.5, 0.35, { type: 'triangle', vol: 0.08, slide: f0 * 0.4, delay: 0.05 });
  },

  /* ---------- music ---------- */
  /** o.since: when the track started (performance.now()); a one-shot track (tr.once) that only gets sound later — the
   *  player's first tap — joins where the scene is by then instead of starting over */
  music(name, o = {}) {
    if (this.cur === name && this._timer) return;
    this.stopMusic();
    this.cur = name; this._want = true;
    this._since = o.since != null ? o.since : performance.now();
    this._start();
  },
  /** start the current track once sound can really play (a one-shot track joins at its place in time) */
  _start() {
    const tr = TRACKS[this.cur];
    if (!this._want || !this.ctx || !tr || this._timer || this.ctx.state !== 'running') return;
    if (!tr._parsed) tr._parsed = parseTrack(tr);
    this._step = tr.once ? Math.floor((performance.now() - this._since) / 1000 / (60 / tr.bpm / 2)) : 0;
    if (tr.once && this._step >= tr._parsed.len) return;
    this._next = this.ctx.currentTime + 0.08;
    this._timer = setInterval(() => this._tick(), 40);
  },
  /** stops the track for good (a resume or an unlock does not bring it back; Snd.cur still names it) */
  stopMusic() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    this._want = false;
  },
  _tick() {
    const c = this.ctx; if (!c || this.suspended) return;
    const tr = TRACKS[this.cur]; if (!tr) return;
    const P = tr._parsed, sd = 60 / tr.bpm / 2, bus = tr.sfx ? this.sfxBus : this.musicBus, k = tr.sfx ? 0.6 : 1;
    if (this._next < c.currentTime - 0.5) this._next = c.currentTime + 0.05; // tab was asleep
    while (this._next < c.currentTime + 0.18) {
      if (tr.once && this._step >= P.len) { this.stopMusic(); return; }
      const i = this._step % P.len;
      for (const ch of P.chans) {
        const ev = ch.ev[i];
        if (!ev) continue;
        if (ch.drum) this._drum(ev, this._next, bus, k);
        else this._inst(ch.inst, ev.f, ev.n * sd, this._next, bus, k);
      }
      this._step++;
      this._next += sd;
    }
  },
  _inst(inst, freq, dur, t, bus = this.musicBus, k = 1) {
    const c = this.ctx;
    const I = INSTR[inst], vol = I.vol * k;
    const osc = c.createOscillator(); osc.type = I.type; osc.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(vol * 0.55, t + Math.min(0.15, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.95 + 0.05);
    let n = osc;
    if (I.lp) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = I.lp; osc.connect(fl); n = fl; }
    n.connect(g).connect(bus);
    osc.start(t); osc.stop(t + dur + 0.1);
  },
  _drum(d, t, bus = this.musicBus, k = 1) {
    const c = this.ctx;
    if (d === 'k' || d === 'x') {
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      const g = c.createGain(); g.gain.setValueAtTime(0.5 * k, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(bus); o.start(t); o.stop(t + 0.2);
    }
    if (d === 's') {
      const src = c.createBufferSource(); src.buffer = this.noiseBuf;
      const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 1800;
      const g = c.createGain(); g.gain.setValueAtTime(0.22 * k, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      src.connect(fl).connect(g).connect(bus); src.start(t, Math.random() * 0.5); src.stop(t + 0.14);
    }
    if (d === 'h' || d === 'x') {
      const src = c.createBufferSource(); src.buffer = this.noiseBuf;
      const fl = c.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = 7500;
      const g = c.createGain(); g.gain.setValueAtTime(0.07 * k, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
      src.connect(fl).connect(g).connect(bus); src.start(t, Math.random() * 0.5); src.stop(t + 0.05);
    }
  },
};

const INSTR = {
  lead: { type: 'square', vol: 0.05, lp: 2600 },
  lead2: { type: 'triangle', vol: 0.09 },
  bass: { type: 'triangle', vol: 0.14 },
  arp: { type: 'triangle', vol: 0.035 },
  pad: { type: 'sine', vol: 0.05 },
};

function noteFreq(tok) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(tok);
  if (!m) return 0;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = 12 * (+m[3] + 1) + base;
  return 440 * Math.pow(2, (midi - 69) / 12);
}
function parseTrack(tr) {
  const chans = [];
  let len = 0;
  for (const [key, bars] of Object.entries(tr.ch)) {
    const toks = bars.join(' ').split(/\s+/).filter(Boolean);
    len = Math.max(len, toks.length);
    const drum = key === 'drums';
    const ev = new Array(toks.length).fill(null);
    let last = -1;
    toks.forEach((tk, i) => {
      if (drum) { ev[i] = tk === '.' ? null : tk; return; }
      if (tk === '-') { if (last >= 0) ev[last].n++; return; }
      if (tk === '.') { last = -1; return; }
      ev[i] = { f: noteFreq(tk), n: 1 }; last = i;
    });
    chans.push({ inst: tr.inst[key] || key, ev, drum });
  }
  return { chans, len };
}

/* 8 steps per bar (eighth notes). '.' rest, '-' hold. */
const TRACKS = {
  title: {
    bpm: 100, inst: { lead: 'lead', bass: 'bass', arp: 'arp' },
    ch: {
      lead: ['G4 . C5 . E5 . G5 .', 'A5 - G5 . E5 . C5 .', 'F5 . A5 . C6 . A5 .', 'G5 - - . D5 . B4 .',
             'C5 . E5 . G5 . C6 .', 'B5 . A5 . E5 . A5 .', 'A5 . G5 . F5 . D5 .', 'D5 . E5 . C5 - - .'],
      bass: ['C3 . . . G2 . . .', 'A2 . . . E2 . . .', 'F2 . . . C3 . . .', 'G2 . . . D3 . . .',
             'C3 . . . G2 . . .', 'A2 . . . E2 . . .', 'F2 . . . C3 . . .', 'G2 . . . G2 . . .'],
      arp: ['C4 E4 G4 E4 C4 E4 G4 E4', 'A3 C4 E4 C4 A3 C4 E4 C4', 'A3 C4 F4 C4 A3 C4 F4 C4', 'B3 D4 G4 D4 B3 D4 G4 D4',
            'C4 E4 G4 E4 C4 E4 G4 E4', 'A3 C4 E4 C4 A3 C4 E4 C4', 'A3 C4 F4 C4 A3 C4 F4 C4', 'B3 D4 G4 D4 B3 D4 G4 D4'],
      drums: ['k . . . s . . .', 'k . . . s . . h', 'k . . . s . . .', 'k . . . s . h h', 'k . . . s . . .', 'k . . . s . . h', 'k . . . s . . .', 'k . k . s . s s'],
    },
  },
  explore: {
    bpm: 112, inst: { lead: 'lead', bass: 'bass', arp: 'arp' },
    ch: {
      lead: ['E5 . G5 . A5 G5 E5 .', 'D5 . G5 - - . . .', 'C5 . E5 . A5 G5 E5 .', 'F5 - E5 - D5 - . .',
             'E5 . G5 . C6 . B5 A5', 'G5 - D5 . G5 . B5 .', 'A5 . C6 . B5 A5 G5 E5', 'F5 . A5 . G5 - - .'],
      bass: ['C3 . G2 . C3 . G2 .', 'G2 . D3 . G2 . D3 .', 'A2 . E3 . A2 . E3 .', 'F2 . C3 . F2 . C3 .',
             'C3 . G2 . C3 . G2 .', 'G2 . D3 . G2 . D3 .', 'A2 . E3 . A2 . E3 .', 'F2 . C3 . G2 . D3 .'],
      arp: ['C4 E4 G4 E4 C4 E4 G4 E4', 'B3 D4 G4 D4 B3 D4 G4 D4', 'A3 C4 E4 C4 A3 C4 E4 C4', 'A3 C4 F4 C4 A3 C4 F4 C4',
            'C4 E4 G4 E4 C4 E4 G4 E4', 'B3 D4 G4 D4 B3 D4 G4 D4', 'A3 C4 E4 C4 A3 C4 E4 C4', 'A3 C4 F4 C4 B3 D4 G4 D4'],
      drums: ['k . h . s . h .', 'k . h . s . h .', 'k . h . s . h .', 'k . h k s . h .', 'k . h . s . h .', 'k . h . s . h .', 'k . h . s . h .', 'k . h k s . s s'],
    },
  },
  battle: {
    bpm: 148, inst: { lead: 'lead', bass: 'bass', arp: 'arp' },
    ch: {
      lead: ['A4 . C5 . E5 . A5 G5', 'F5 . E5 . C5 . A4 .', 'G4 . B4 . D5 . G5 F5', 'E5 - - . G#4 . B4 .',
             'A4 . C5 E5 A5 . C6 B5', 'A5 . F5 . C5 . F5 .', 'G5 . D5 . B4 . D5 G5', 'E5 . D5 . C5 . B4 G#4'],
      bass: ['A2 A2 A3 A2 A2 A2 A3 A2', 'F2 F2 F3 F2 F2 F2 F3 F2', 'G2 G2 G3 G2 G2 G2 G3 G2', 'E2 E2 E3 E2 E2 E2 E3 G#2',
             'A2 A2 A3 A2 A2 A2 A3 A2', 'F2 F2 F3 F2 F2 F2 F3 F2', 'G2 G2 G3 G2 G2 G2 G3 G2', 'E2 E2 E3 E2 E2 E2 E3 E2'],
      arp: ['E4 A4 C5 A4 E4 A4 C5 A4', 'F4 A4 C5 A4 F4 A4 C5 A4', 'G4 B4 D5 B4 G4 B4 D5 B4', 'E4 G#4 B4 G#4 E4 G#4 B4 G#4',
            'E4 A4 C5 A4 E4 A4 C5 A4', 'F4 A4 C5 A4 F4 A4 C5 A4', 'G4 B4 D5 B4 G4 B4 D5 B4', 'E4 G#4 B4 G#4 E4 G#4 B4 G#4'],
      drums: ['k h s h k k s h', 'k h s h k k s h', 'k h s h k k s h', 'k h s h k s s s', 'k h s h k k s h', 'k h s h k k s h', 'k h s h k k s h', 'k s k s k s s s'],
    },
  },
  boss: {
    bpm: 158, inst: { lead: 'lead', bass: 'bass', arp: 'arp' },
    ch: {
      lead: ['D5 . F5 . A5 . D6 C6', 'Bb5 . A5 . F5 . D5 .', 'C5 . E5 . G5 . C6 Bb5', 'A5 - - . C#5 . E5 .',
             'D5 F5 A5 . D6 . F6 E6', 'D6 . Bb5 . F5 . Bb5 .', 'C6 . G5 . E5 . G5 C6', 'A5 . G5 . F5 . E5 C#5'],
      bass: ['D2 D2 D3 D2 D2 D2 D3 D2', 'Bb1 Bb1 Bb2 Bb1 Bb1 Bb1 Bb2 Bb1', 'C2 C2 C3 C2 C2 C2 C3 C2', 'A1 A1 A2 A1 A1 A1 A2 C#2',
             'D2 D2 D3 D2 D2 D2 D3 D2', 'Bb1 Bb1 Bb2 Bb1 Bb1 Bb1 Bb2 Bb1', 'C2 C2 C3 C2 C2 C2 C3 C2', 'A1 A1 A2 A1 A1 A1 A2 A1'],
      arp: ['D4 F4 A4 F4 D4 F4 A4 F4', 'D4 F4 Bb4 F4 D4 F4 Bb4 F4', 'E4 G4 C5 G4 E4 G4 C5 G4', 'E4 A4 C#5 A4 E4 A4 C#5 A4',
            'D4 F4 A4 F4 D4 F4 A4 F4', 'D4 F4 Bb4 F4 D4 F4 Bb4 F4', 'E4 G4 C5 G4 E4 G4 C5 G4', 'E4 A4 C#5 A4 E4 A4 C#5 A4'],
      drums: ['x h s h k k s h', 'k h s h k k s h', 'x h s h k k s h', 'k h s h s s s s', 'x h s h k k s h', 'k h s h k k s h', 'x h s h k k s h', 'k s k s s s s s'],
    },
  },
  galaxy: {
    bpm: 84, inst: { lead: 'lead2', bass: 'bass', arp: 'pad' },
    ch: {
      lead: ['C6 - - . A5 - G5 -', 'E5 - - - . . . .', 'F5 - - . D5 - C5 -', 'E5 - - - . . . .',
             'C6 - - . D6 - E6 -', 'D6 - - - B5 . G5 .', 'A5 - - . G5 - F5 -', 'E5 - - - - - . .'],
      bass: ['F2 - - - - - - -', 'E2 - - - - - - -', 'D2 - - - - - - -', 'C2 - - - - - - -', 'F2 - - - - - - -', 'G2 - - - - - - -', 'D2 - - - - - - -', 'C2 - - - - - - -'],
      arp: ['F4 A4 C5 E5 C5 A4 F4 A4', 'E4 G4 B4 D5 B4 G4 E4 G4', 'D4 F4 A4 C5 A4 F4 D4 F4', 'C4 E4 G4 B4 G4 E4 C4 E4',
            'F4 A4 C5 E5 C5 A4 F4 A4', 'G4 B4 D5 F5 D5 B4 G4 B4', 'D4 F4 A4 C5 A4 F4 D4 F4', 'C4 E4 G4 B4 G4 E4 C4 E4'],
      drums: ['k . . . . . h .', 'k . . . . . h .', 'k . . . . . h .', 'k . . . . . h h', 'k . . . . . h .', 'k . . . . . h .', 'k . . . . . h .', 'k . . . . . . .'],
    },
  },
  arena: {
    bpm: 138, inst: { lead: 'lead', bass: 'bass', arp: 'arp' },
    ch: {
      lead: ['G4 . B4 . D5 . G5 F#5', 'E5 . D5 . B4 . G4 .', 'A4 . C5 . E5 . A5 G5', 'F#5 - - . D5 . A4 .',
             'G4 B4 D5 G5 . B5 A5 G5', 'E5 . C5 . G4 . C5 E5', 'D5 . F#5 . A5 . D6 C6', 'B5 . A5 . G5 - - .'],
      bass: ['G2 G2 G3 G2 G2 G2 G3 G2', 'E2 E2 E3 E2 E2 E2 E3 E2', 'A2 A2 A3 A2 A2 A2 A3 A2', 'D2 D2 D3 D2 D2 D2 D3 D2',
             'G2 G2 G3 G2 G2 G2 G3 G2', 'C2 C2 C3 C2 C2 C2 C3 C2', 'D2 D2 D3 D2 D2 D2 D3 D2', 'G2 G2 G3 G2 D2 D2 D3 D2'],
      arp: ['G4 B4 D5 B4 G4 B4 D5 B4', 'E4 G4 B4 G4 E4 G4 B4 G4', 'A4 C5 E5 C5 A4 C5 E5 C5', 'D4 F#4 A4 F#4 D4 F#4 A4 F#4',
            'G4 B4 D5 B4 G4 B4 D5 B4', 'C4 E4 G4 E4 C4 E4 G4 E4', 'D4 F#4 A4 F#4 D4 F#4 A4 F#4', 'G4 B4 D5 B4 D4 F#4 A4 F#4'],
      drums: ['k h s h k h s h', 'k h s h k k s h', 'k h s h k h s h', 'k h s h k s s h', 'k h s h k h s h', 'k h s h k k s h', 'k h s h k h s h', 'k s k s s s s s'],
    },
  },
  home: {
    bpm: 92, inst: { lead: 'lead2', bass: 'bass', arp: 'arp' },
    ch: {
      lead: ['F5 . A5 . C6 . A5 .', 'G5 - F5 . E5 . C5 .', 'D5 . F5 . A5 . G5 .', 'F5 - - . . . C5 .',
             'F5 . A5 . C6 . D6 .', 'C6 - A5 . F5 . G5 .', 'A5 . G5 . F5 . E5 .', 'F5 - - - . . . .'],
      bass: ['F2 . . . C3 . . .', 'C3 . . . G2 . . .', 'D3 . . . A2 . . .', 'Bb2 . . . F2 . . .',
             'F2 . . . C3 . . .', 'A2 . . . E2 . . .', 'Bb2 . . . C3 . . .', 'F2 . . . C3 . F2 .'],
      arp: ['F4 A4 C5 A4 F4 A4 C5 A4', 'C4 E4 G4 E4 C4 E4 G4 E4', 'D4 F4 A4 F4 D4 F4 A4 F4', 'Bb3 D4 F4 D4 Bb3 D4 F4 D4',
            'F4 A4 C5 A4 F4 A4 C5 A4', 'A3 C4 E4 C4 A3 C4 E4 C4', 'Bb3 D4 F4 D4 C4 E4 G4 E4', 'F4 A4 C5 A4 F4 . . .'],
      drums: ['k . . h . . h .', 'k . . h . . h .', 'k . . h . . h .', 'k . . h . h h .', 'k . . h . . h .', 'k . . h . . h .', 'k . . h . . h .', 'k . . . . . . .'],
    },
  },
  night: {
    bpm: 96, inst: { lead: 'lead2', bass: 'bass', arp: 'arp' },
    ch: {
      lead: ['E5 . . G5 . . B5 .', 'A5 - - - G5 . . .', 'F5 . . A5 . . C6 .', 'B5 - - - . . . .',
             'E5 . G5 . B5 . E6 .', 'D6 - C6 . B5 . A5 .', 'G5 . F5 . E5 . D5 .', 'E5 - - - - - . .'],
      bass: ['E2 . . . B2 . . .', 'A2 . . . E2 . . .', 'F2 . . . C3 . . .', 'B2 . . . F#2 . . .', 'E2 . . . B2 . . .', 'A2 . . . E2 . . .', 'D2 . . . A2 . . .', 'E2 . . . B2 . . .'],
      arp: ['E4 G4 B4 G4 E4 G4 B4 G4', 'A3 C4 E4 C4 A3 C4 E4 C4', 'F4 A4 C5 A4 F4 A4 C5 A4', 'B3 D#4 F#4 D#4 B3 D#4 F#4 D#4',
            'E4 G4 B4 G4 E4 G4 B4 G4', 'A3 C4 E4 C4 A3 C4 E4 C4', 'D4 F4 A4 F4 D4 F4 A4 F4', 'E4 G4 B4 G4 E4 G4 B4 G4'],
      drums: ['k . . h . . h .', 'k . . h . . h .', 'k . . h . . h .', 'k . . h . h h .', 'k . . h . . h .', 'k . . h . . h .', 'k . . h . . h .', 'k . . h s . s .'],
    },
  },
  /* the opening (3.1; 3.4: three quicker bars): one pass in time with the prologue — the twelve signs and the Eclipse,
   * the clash (drums) and the capture (a run up into C major, where the title theme takes over at the logo) */
  prologue: {
    bpm: 140, once: true, inst: { lead: 'lead', bass: 'bass', arp: 'arp', pad: 'pad' },
    ch: {
      lead: ['. . . . . . . .', 'D5 . F5 . E5 . G#5 B5', 'C5 D5 E5 F5 G5 A5 B5 C6'],
      bass: ['A2 - - - - F2 - E2', 'D2 D2 D3 D2 E2 E2 E3 E2', 'F2 . G2 . A2 . B2 .'],
      arp: ['A4 C5 E5 A5 B5 A5 E5 C5', 'D4 F4 A4 D5 E4 G#4 B4 E5', 'F4 A4 C5 F5 G4 B4 D5 G5'],
      pad: ['A3 - - - - F3 - E3', 'D3 - - - E3 - - -', 'F3 - - - G3 - - -'],
      drums: ['. . . . . k . k', 'k h s h k k s s', 'k h s h k s s x'],
    },
  },
  /* a catch (3.2): one short triumphant fanfare instead of the battle loop — "da-da-da-DAAH, da-DAAH, DAAAH" in C.
   * It plays on the sound-effects bus (like the victory jingle), so it is heard with the music switched off too */
  caught: {
    bpm: 168, once: true, sfx: true, inst: { lead: 'lead', harm: 'arp', spark: 'arp', bass: 'bass' },
    ch: {
      lead: ['G4 C5 E5 G5 - E5 G5 -', 'C6 - - - - - . .'],
      harm: ['E4 G4 C5 E5 - C5 E5 -', 'E5 - - - - - . .'],
      spark: ['. . . . . . . .', 'C6 E6 G6 C7 G6 E6 . .'],
      bass: ['C3 . C3 . G2 . G2 .', 'C3 - - - - - . .'],
      drums: ['k . s . k k s s', 'x . . . . . . .'],
    },
  },
  /* the Star Altar: a music box under the night sky while the player meets the starters */
  altar: {
    bpm: 84, inst: { lead: 'lead2', bass: 'bass', arp: 'arp', pad: 'pad' },
    ch: {
      lead: ['F#5 . A5 . D6 - C#6 .', 'B5 - - - A5 . . .', 'G5 . B5 . D6 - E6 .', 'F#6 - - - . . . .',
             'F#5 . A5 . D6 - C#6 .', 'B5 - - - A5 . G5 .', 'E5 . G5 . B5 - A5 .', 'D5 - - - . . . .'],
      bass: ['D3 - - - A2 - - -', 'G2 - - - D3 - - -', 'E3 - - - B2 - - -', 'A2 - - - C#3 - - -', 'D3 - - - A2 - - -', 'G2 - - - D3 - - -', 'A2 - - - E3 - - -', 'D3 - - - A2 - - -'],
      arp: ['D4 F#4 A4 D5 A4 F#4 D4 A4', 'G4 B4 D5 G5 D5 B4 G4 D5', 'E4 G4 B4 E5 B4 G4 E4 B4', 'A4 C#5 E5 A5 E5 C#5 A4 E5',
            'D4 F#4 A4 D5 A4 F#4 D4 A4', 'G4 B4 D5 G5 D5 B4 G4 D5', 'A4 C#5 E5 A5 E5 C#5 A4 C#5', 'D4 F#4 A4 D5 A4 F#4 D4 .'],
      pad: ['D4 - - - - - - -', 'G3 - - - - - - -', 'E4 - - - - - - -', 'A3 - - - - - - -', 'D4 - - - - - - -', 'G3 - - - - - - -', 'A3 - - - - - - -', 'D4 - - - - - - -'],
      drums: ['k . . . h . . .', 'k . . . h . . h', 'k . . . h . . .', 'k . . . h . h h', 'k . . . h . . .', 'k . . . h . . h', 'k . . . h . . .', 'k . . . . . . .'],
    },
  },
};
