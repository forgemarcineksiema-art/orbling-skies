'use strict';
/* Battle VFX: a distinct animation for every move family (fireballs, splashes, rock falls, lightning…),
 * element impacts, status bursts, buffs, screen shake & flash. Particles are <i class="fxp"> elements in
 * the #fx layer animated with WAAPI through U.anim, so they finish even in throttled/hidden tabs. */

const MOVE_FX = {
  // fire
  ember: 'fireball', fireball: 'fireball', blaze_wave: 'firewave', inferno: 'inferno', flame_dash: 'dash', wisp_burn: 'wisp', heat_up: 'buff',
  stellar_ram: 'dash', solar_roar: 'beam', meteor_arrow: 'meteor',
  // water & ice
  bubble: 'bubbles', aqua_jet: 'dash', water_blast: 'waterball', frost_shard: 'ice', tidal_wave: 'wave', blizzard: 'blizzard', soothing_rain: 'rain',
  moon_tide: 'wave', night_sting: 'toxic', dream_current: 'dream',
  // earth & nature
  pebble_toss: 'pebbles', vine_whip: 'vine', mud_shot: 'mud', rock_slide: 'rockfall', leaf_storm: 'leaves', earthquake: 'quake', sleep_spores: 'spores',
  barkskin: 'buff', stampede: 'quake', harvest_bloom: 'leaves', summit_crash: 'rockfall',
  // air & storm
  gust: 'wind', spark: 'spark', air_slash: 'slash', thunderbolt: 'bolt', tempest: 'storm', tailwind: 'buff', static_field: 'bolt',
  twin_tempest: 'wind', equinox: 'beam', starfall_surge: 'starfall',
  // physical
  tackle: 'lunge', quick_dash: 'lunge', headbutt: 'lunge', ram_charge: 'lunge', horn_rush: 'lunge', double_hit: 'lunge',
  body_slam: 'slam', mega_strike: 'slam', scratch: 'claw', pinch: 'claw', bite: 'chomp', peck: 'peck', venom_sting: 'sting', arrow_shot: 'arrow',
  pounce: 'claw', twin_sparks: 'spark', scale_gale: 'slash', rain_pour: 'storm',
  // support
  growl: 'shout', roar: 'shout', glare: 'glare', lullaby: 'notes', focus: 'buff', guard_up: 'buff', recharge: 'charge', star_heal: 'heal',
};
/* impact flavour per animation family */
const FX_IMPACT = {
  fireball: 'fire', firewave: 'fire', inferno: 'fire', dash: null, beam: null, meteor: 'fire', wisp: 'fire',
  bubbles: 'water', waterball: 'water', ice: 'ice', wave: 'water', blizzard: 'ice', toxic: 'poison', dream: 'dream',
  pebbles: 'rock', vine: 'leaf', mud: 'mud', rockfall: 'rock', leaves: 'leaf', quake: 'rock', spores: 'leaf',
  wind: 'air', spark: 'bolt', slash: 'air', bolt: 'bolt', storm: 'bolt', starfall: 'star',
  lunge: 'pow', slam: 'pow', claw: 'claw', chomp: 'pow', peck: 'pow', sting: 'poison', arrow: 'pow',
};
const FX_COL = {
  fire: ['#fff6a0', '#ffb13b', '#ff4a26'], water: ['#ffffff', '#a8e6ff', '#36a3ff'], ice: ['#ffffff', '#d8f6ff', '#7fd6ff'],
  rock: ['#e8d0a0', '#a0764e', '#6b4a2e'], mud: ['#c9955e', '#8a6440', '#5a3f28'], leaf: ['#d8ffb0', '#7cd65a', '#3a9f2b'],
  air: ['#ffffff', '#e0d4ff', '#a07cff'], bolt: ['#ffffff', '#fff39a', '#ffd23f'], poison: ['#f0d0ff', '#c07cff', '#8a3ae8'],
  dream: ['#ffffff', '#ffc8ec', '#c9b0ff'], star: ['#ffffff', '#fff3a0', '#ffd23f'], pow: ['#ffffff', '#fff3a0', '#ffd0a0'], claw: ['#ffffff', '#ffe066', '#ffffff'],
};
const ST_FX = { burn: 'fire', poison: 'poison', shock: 'bolt', sleep: 'dream', freeze: 'ice' };

const FX = {
  /** effect speed: fast battles play animations quicker */
  get k() { return typeof Main !== 'undefined' && Main.settings.fast ? 0.65 : 1; },
  shakeOn() { return !(typeof Main !== 'undefined' && Main.settings.shake === false); },

  /* ---------------- primitives ---------------- */
  T(x, y, s = 1, r = 0) { return `translate(-50%,-50%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${r.toFixed(0)}deg) scale(${s.toFixed(3)})`; },
  spawn(cls, x, y, o = {}) {
    const e = document.createElement('i');
    e.className = 'fxp ' + cls;
    const s = e.style;
    s.left = x + 'px'; s.top = y + 'px';
    if (o.size) s.width = s.height = o.size + 'px';
    if (o.w) s.width = o.w + 'px';
    if (o.h) s.height = o.h + 'px';
    if (o.bg) s.background = o.bg;
    if (o.color) s.color = o.color;
    if (o.text) e.textContent = o.text;
    s.transform = this.T(0, 0, o.s0 != null ? o.s0 : 1, o.r0 || 0);
    UI.fx.appendChild(e);
    return e;
  },
  go(e, frames, opts) { return U.anim(e, frames, opts).then(() => e.remove()); },
  /** quadratic path from s to t bulging up by `arc` px */
  curve(sx, sy, tx, ty, arc = 0, side = 0) {
    const mx = (sx + tx) / 2 + side, my = (sy + ty) / 2 - arc;
    return q => { const u = 1 - q; return [u * u * sx + 2 * u * q * mx + q * q * tx, u * u * sy + 2 * u * q * my + q * q * ty]; };
  },
  /** move a spawned element (placed at from) along path over dur ms */
  fly(e, from, path, dur, o = {}) {
    const kf = [];
    for (let i = 0; i <= 12; i++) {
      const q = i / 12, [x, y] = path(q);
      kf.push({ transform: this.T(x - from[0], y - from[1], o.s ? o.s(q) : 1, o.spin ? o.spin * q : o.rot || 0) });
    }
    return U.anim(e, kf, { duration: dur, easing: o.ease || 'linear', fill: 'forwards' });
  },
  /** call fn(x, y, q) every `every` ms along a path (timer based: works when rAF is throttled) */
  trail(path, dur, every, fn) {
    const t0 = performance.now();
    const iv = setInterval(() => {
      const q = (performance.now() - t0) / dur;
      if (q >= 1) { clearInterval(iv); return; }
      const [x, y] = path(q);
      fn(x, y, q);
    }, every);
    setTimeout(() => clearInterval(iv), dur + 40);
  },
  /** a particle that grows, drifts and fades */
  puff(cls, x, y, size, dur, dx = 0, dy = -40, o = {}) {
    const e = this.spawn(cls, x, y, { size, bg: o.bg, text: o.text, color: o.color, s0: o.s0 != null ? o.s0 : 0.5 });
    return this.go(e, [
      { transform: this.T(0, 0, o.s0 != null ? o.s0 : 0.5, o.r || 0), opacity: o.a0 != null ? o.a0 : 1 },
      { transform: this.T(dx * 0.4, dy * 0.4, 1, o.r || 0), opacity: 1, offset: 0.3 },
      { transform: this.T(dx, dy, o.s1 != null ? o.s1 : 0.3, (o.r || 0) + (o.spin || 0)), opacity: 0 }], { duration: dur * this.k, easing: 'ease-out', delay: o.delay || 0 });
  },
  /** radial burst of n particles */
  burst(x, y, cls, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.dir != null ? o.dir + (Math.random() - 0.5) * (o.spread || 1.2) : Math.random() * Math.PI * 2;
      const d = (o.dist || 110) * (0.35 + Math.random() * 0.65);
      const size = (o.size || 12) * (0.6 + Math.random() * 0.8);
      const e = this.spawn(cls, x, y, { size, bg: o.bg ? o.bg[i % o.bg.length] : null, text: o.text, color: o.color });
      const dx = Math.cos(a) * d, dy = Math.sin(a) * d, g = o.grav || 0, r = o.spin ? U.rf(-o.spin, o.spin) : 0;
      this.go(e, [
        { transform: this.T(0, 0, 0.6, 0), opacity: 1 },
        { transform: this.T(dx * 0.75, dy * 0.75, 1, r * 0.6), opacity: 1, offset: 0.55 },
        { transform: this.T(dx, dy + g, o.s1 != null ? o.s1 : 0.15, r), opacity: 0 }],
        { duration: (o.dur || 620) * (0.7 + Math.random() * 0.6) * this.k, easing: 'cubic-bezier(.2,.8,.3,1)', delay: (o.stagger || 0) * i });
    }
  },
  ring(x, y, color, size = 200, o = {}) {
    const e = this.spawn('fx-ring', x, y, { size });
    e.style.borderColor = color;
    if (o.w) e.style.borderWidth = o.w + 'px';
    return this.go(e, [{ transform: this.T(0, 0, 0.15), opacity: 1 }, { transform: this.T(0, 0, 1), opacity: 0 }], { duration: (o.dur || 480) * this.k, easing: 'cubic-bezier(.2,.8,.3,1)', delay: o.delay || 0 });
  },
  glow(x, y, color, size = 220, dur = 500) {
    const e = this.spawn('fx-glow', x, y, { size, bg: `radial-gradient(circle, ${color}, rgba(255,255,255,0) 68%)` });
    return this.go(e, [{ transform: this.T(0, 0, 0.3), opacity: 0 }, { transform: this.T(0, 0, 1), opacity: 1, offset: 0.35 }, { transform: this.T(0, 0, 1.25), opacity: 0 }], { duration: dur * this.k });
  },
  flash(color = '#ffffff', alpha = 0.6, dur = 260) {
    const e = this.spawn('fx-flash', 0, 0, { bg: color });
    e.style.transform = 'none';
    return this.go(e, [{ opacity: alpha }, { opacity: 0 }], { duration: dur * this.k, easing: 'ease-out' });
  },
  shake(power = 8, dur = 320) {
    if (!this.shakeOn() || !UI.scene) return;
    const kf = [];
    for (let i = 0; i <= 6; i++) { const p = power * (1 - i / 6); kf.push({ transform: i === 6 ? 'translate(0,0)' : `translate(${U.rf(-p, p).toFixed(1)}px,${U.rf(-p, p).toFixed(1)}px)` }); }
    U.anim(UI.scene, kf, { duration: dur });
  },
  /** zig-zag lightning from the sky (or from point s) to t */
  bolt(tx, ty, o = {}) {
    const sx = o.sx != null ? o.sx : tx + U.rf(-90, 90), sy = o.sy != null ? o.sy : -30;
    const n = 7, pts = [];
    for (let i = 0; i <= n; i++) {
      const q = i / n;
      pts.push([(sx + (tx - sx) * q + (i && i < n ? U.rf(-34, 34) : 0)).toFixed(0), (sy + (ty - sy) * q).toFixed(0)]);
    }
    const d = 'M' + pts.map(p => p.join(' ')).join('L');
    const e = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    e.setAttribute('class', 'fx-bolt');
    e.setAttribute('viewBox', '0 0 1280 720');
    const w = o.w || 14, line = (col, sw, x = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${x}/>`;
    e.innerHTML = line('#2b2040', w + 7, ' opacity=".75"') + line(o.color || '#ffe066', w) + line('#ffffff', w * 0.38);
    UI.fx.appendChild(e);
    return this.go(e, [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0.3, offset: 0.35 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: (o.dur || 380) * this.k, delay: o.delay || 0 });
  },

  /* ---------------- public API ---------------- */
  styleOf(id) {
    if (MOVE_FX[id]) return MOVE_FX[id];
    const m = MOVES[id] || {};
    if (m.cat === 'phys') return 'lunge';
    if (m.cat === 'buff') return 'buff';
    if (m.cat === 'heal') return 'heal';
    return { fire: 'fireball', water: 'waterball', earth: 'pebbles', air: 'wind' }[m.el] || 'lunge';
  },
  /** play the travel part of an attack; resolves at the moment of impact.
   *  c = { a:[x,y], d:[x,y], dir:±1, aSlot, dSlot, dGround:[x,y], miss } */
  async attack(id, c) {
    const st = this.styleOf(id);
    const v = typeof VFX !== 'undefined' && VFX.ok() && VFX.ensure() && VFX.moves[st];
    try {
      if (v) await v(c, id);
      else await (this['_' + st] || this._lunge).call(this, c, id);
    } catch (e) { console.warn('fx', st, e); }
  },
  /** impact burst at the defender (non-blocking) */
  impact(id, c, o = {}) {
    const st = this.styleOf(id);
    const kind = FX_IMPACT[st] || ({ fire: 'fire', water: 'water', earth: 'rock', air: 'air' }[(MOVES[id] || {}).el]) || 'pow';
    const [x, y] = c.d, big = o.crit || o.tm > 1 || (MOVES[id] && MOVES[id].pow >= 100);
    try { this.hit(kind, x, y, big); } catch (e) { console.warn('fx impact', e); }
    if (o.crit) { this.shake(12); this.flash('#fff6c8', 0.45); }
    else if (big && this.shakeOn()) this.shake(6, 240);
  },
  hit(kind, x, y, big) {
    if (typeof VFX !== 'undefined' && VFX.ok() && VFX.ensure()) return VFX.hit(kind, x, y, big);
    const C = FX_COL[kind] || FX_COL.pow, n = big ? 1.4 : 1;
    switch (kind) {
      case 'fire':
        this.ring(x, y, '#ffb13b', 200 * n); this.glow(x, y, 'rgba(255,170,60,.85)', 260 * n);
        this.burst(x, y, 'fx-dot', Math.round(14 * n), { bg: C, dist: 130 * n, size: 13, grav: 30 });
        for (let i = 0; i < 4; i++) this.puff('fx-smoke', x + U.rf(-50, 50), y + U.rf(-20, 30), 60, 900, U.rf(-20, 20), -70, { delay: 60 * i });
        break;
      case 'water':
        this.ring(x, y, '#a8e6ff', 190 * n); this.ring(x, y, '#ffffff', 120 * n, { delay: 90 });
        this.burst(x, y, 'fx-drop', Math.round(14 * n), { dist: 140 * n, size: 16, grav: 90, spin: 90 });
        break;
      case 'ice':
        this.glow(x, y, 'rgba(200,245,255,.95)', 240 * n);
        this.burst(x, y, 'fx-ice', Math.round(12 * n), { dist: 130 * n, size: 22, spin: 180 });
        this.burst(x, y, 'fx-flake', 10, { dist: 170 * n, size: 14, grav: 40, spin: 240 });
        break;
      case 'rock':
        this.burst(x, y + 20, 'fx-rock', Math.round(10 * n), { dist: 120 * n, size: 20, grav: 110, spin: 200, dir: -Math.PI / 2, spread: 2.6 });
        for (let i = 0; i < 5; i++) this.puff('fx-dust', x + U.rf(-70, 70), y + U.rf(10, 50), 70, 900, U.rf(-30, 30), -40, { delay: 40 * i });
        break;
      case 'mud':
        this.burst(x, y, 'fx-dot', Math.round(12 * n), { bg: C, dist: 120 * n, size: 16, grav: 80 });
        break;
      case 'leaf':
        this.burst(x, y, 'fx-leaf', Math.round(12 * n), { dist: 140 * n, size: 20, grav: 50, spin: 360 });
        this.ring(x, y, '#9dff7a', 170 * n);
        break;
      case 'air':
        this.ring(x, y, '#ffffff', 200 * n, { w: 4 }); this.ring(x, y, '#d8c8ff', 140 * n, { w: 3, delay: 80 });
        this.burst(x, y, 'fx-wisp', 8, { dist: 150 * n, size: 26, spin: 200 });
        break;
      case 'bolt':
        this.glow(x, y, 'rgba(255,240,120,.9)', 240 * n);
        this.burst(x, y, 'fx-spark', Math.round(16 * n), { dist: 140 * n, size: 8 });
        for (let i = 0; i < 3; i++) this.zap(x + U.rf(-40, 40), y + U.rf(-40, 40), 60);
        break;
      case 'poison':
        this.ring(x, y, '#c07cff', 170 * n);
        for (let i = 0; i < 8; i++) this.puff('fx-bubble poison', x + U.rf(-50, 50), y + U.rf(-10, 40), U.rf(14, 26), 900, U.rf(-20, 20), -90, { delay: 50 * i });
        break;
      case 'dream':
        this.glow(x, y, 'rgba(255,200,236,.9)', 240 * n);
        this.burst(x, y, 'fx-star', 12, { bg: C, dist: 150, size: 18, spin: 180 });
        break;
      case 'star':
        this.glow(x, y, 'rgba(255,246,160,.95)', 260 * n);
        this.burst(x, y, 'fx-star', Math.round(14 * n), { bg: C, dist: 160 * n, size: 22, spin: 220 });
        break;
      case 'claw':
        this.claws(x, y);
        this.burst(x, y, 'fx-dot', 8, { bg: FX_COL.pow, dist: 90, size: 9 });
        break;
      default: // pow
        this.pow(x, y, big ? 150 : 110);
        this.burst(x, y, 'fx-dot', big ? 12 : 8, { bg: C, dist: 110 * n, size: 11 });
    }
  },
  pow(x, y, size = 120) {
    const e = this.spawn('fx-pow', x, y, { size });
    this.go(e, [{ transform: this.T(0, 0, 0.2, 0), opacity: 1 }, { transform: this.T(0, 0, 1.05, 20), opacity: 1, offset: 0.35 }, { transform: this.T(0, 0, 1.2, 30), opacity: 0 }], { duration: 380 * this.k, easing: 'ease-out' });
  },
  zap(x, y, len) {
    const e = this.spawn('fx-zap', x, y, { w: len, h: 6 });
    this.go(e, [{ transform: this.T(0, 0, 1, U.rf(0, 180)), opacity: 1 }, { transform: this.T(0, 0, 1.3, U.rf(0, 180)), opacity: 0 }], { duration: 220 * this.k, delay: U.ri(0, 150) });
  },
  claws(x, y) {
    for (let i = 0; i < 3; i++) {
      const e = this.spawn('fx-slash', x + (i - 1) * 26, y, { w: 190, h: 9 });
      this.go(e, [{ transform: this.T(-40, -40, 0.1, 58), opacity: 1 }, { transform: this.T(0, 0, 1, 58), opacity: 1, offset: 0.45 }, { transform: this.T(20, 20, 1, 58), opacity: 0 }], { duration: 360 * this.k, delay: i * 50 });
    }
  },
  /** status inflicted: a burst in the status' colour */
  status(st, x, y) {
    if (typeof VFX !== 'undefined' && VFX.ok() && VFX.ensure()) return VFX.status(st, x, y);
    switch (st) {
      case 'burn': for (let i = 0; i < 7; i++) this.puff('fx-flame', x + U.rf(-50, 50), y + U.rf(0, 50), U.rf(26, 44), 700, 0, -80, { delay: 50 * i }); break;
      case 'poison': this.hit('poison', x, y); break;
      case 'shock': this.hit('bolt', x, y); break;
      case 'sleep': for (let i = 0; i < 3; i++) this.puff('fx-z', x + 40 + i * 18, y - 30 - i * 16, 34 + i * 8, 1100, 30, -60, { text: 'Z', delay: i * 180 }); break;
      case 'freeze': this.hit('ice', x, y, true); this.flash('#bff0ff', 0.35); break;
      default: this.hit(ST_FX[st] || 'pow', x, y);
    }
  },
  /** stat stage change: arrows rising (up) or falling (down) */
  stage(x, y, up, color) {
    if (typeof VFX !== 'undefined' && VFX.ok() && VFX.ensure()) return VFX.stage(x, y, up);
    const col = color || (up ? '#9dff7a' : '#ff6b7a');
    this.glow(x, y, up ? 'rgba(157,255,122,.55)' : 'rgba(255,90,110,.5)', 240, 600);
    for (let i = 0; i < 6; i++) this.puff('fx-arrow', x + U.rf(-70, 70), y + (up ? 50 : -50), 30, 800, 0, up ? -110 : 110, { text: up ? '▲' : '▼', color: col, s0: 0.8, s1: 0.8, delay: i * 70 });
  },
  healRise(x, y) {
    if (typeof VFX !== 'undefined' && VFX.ok() && VFX.ensure()) return VFX.heal(x, y);
    this.glow(x, y, 'rgba(143,255,200,.8)', 240, 700);
    for (let i = 0; i < 8; i++) this.puff('fx-plus', x + U.rf(-70, 70), y + U.rf(0, 60), 30, 900, 0, -100, { text: '+', s0: 0.6, s1: 0.8, delay: i * 60 });
  },

  /* ---------------- move families (resolve at impact) ---------------- */
  target(c) { return c.miss ? [c.d[0] + c.dir * 60, c.d[1] - 130] : c.d; },
  async shoot(c, cls, size, dur, arc, o = {}) {
    const [sx, sy] = c.a, [tx, ty] = this.target(c);
    const path = this.curve(sx, sy, tx, ty, arc, o.side || 0);
    const e = this.spawn(cls, sx, sy, { size, w: o.w, h: o.h });
    if (o.trail) this.trail(path, dur * this.k, o.every || 30, o.trail);
    await this.fly(e, [sx, sy], path, dur * this.k, { s: o.s || (q => 0.7 + q * 0.4), spin: o.spin, rot: o.rot });
    e.remove();
  },
  async _fireball(c, id) {
    const big = id !== 'ember';
    Snd.play('fire');
    await this.shoot(c, 'fx-ball fire', big ? 64 : 46, big ? 480 : 420, 70, { trail: (x, y) => this.puff('fx-flame', x + U.rf(-6, 6), y + U.rf(-6, 6), U.rf(16, 30), 420, U.rf(-10, 10), -30) });
  },
  async _firewave(c) {
    Snd.play('fire');
    const shots = [0, 1, 2].map(i => U.sleep(i * 110 * this.k).then(() => this.shoot({ ...c, a: [c.a[0], c.a[1] + (i - 1) * 40] }, 'fx-ball fire', 50, 440, 30 + i * 30, { trail: (x, y) => this.puff('fx-flame', x, y, U.rf(14, 26), 380, 0, -26) })));
    await Promise.all(shots);
  },
  async _inferno(c) {
    Snd.play('fire');
    const [x, y] = this.target(c), gy = c.dGround ? c.dGround[1] : y + 90;
    this.flash('#ff8a2e', 0.25, 400);
    for (let i = 0; i < 16; i++) this.puff('fx-flame', x + U.rf(-110, 110), gy - U.rf(0, 20), U.rf(40, 80), 800, U.rf(-10, 10), -U.rf(120, 220), { delay: i * 25 });
    await U.sleep(320 * this.k);
    this.shake(10);
  },
  async _dash(c, id) {
    const el = (MOVES[id] || {}).el || 'none';
    Snd.play(el === 'water' ? 'water' : 'fire');
    const cls = el === 'water' ? 'fx-drop' : 'fx-flame';
    const [sx, sy] = c.a;
    const reach = c.dir * (Math.abs(c.d[0] - sx) - 120), rise = c.d[1] - sy;
    const path = q => { const p = q < 0.5 ? q * 2 : (1 - q) * 2; return [sx + reach * p, sy + rise * p * 0.8]; };
    this.trail(path, 520 * this.k, 22, (x, y, q) => { if (q < 0.5) this.puff(cls, x - c.dir * 30, y + U.rf(-30, 30), U.rf(20, 34), 420, -c.dir * 40, -10); });
    U.anim(c.aSlot.wrap, [{ transform: 'translate(0,0)' }, { transform: `translate(${reach}px, ${rise * 0.8}px)`, offset: 0.5 }, { transform: 'translate(0,0)' }], { duration: 520 * this.k, easing: 'ease-in-out' });
    await U.sleep(250 * this.k);
  },
  async _beam(c, id) {
    const el = (MOVES[id] || {}).el;
    Snd.play(el === 'fire' ? 'fire' : 'air');
    const [sx, sy] = c.a, [tx, ty] = this.target(c);
    const len = Math.hypot(tx - sx, ty - sy), ang = Math.atan2(ty - sy, tx - sx) * 180 / Math.PI;
    this.glow(sx, sy, el === 'fire' ? 'rgba(255,200,80,.9)' : 'rgba(220,210,255,.9)', 200, 500);
    await U.sleep(160 * this.k);
    const e = this.spawn('fx-beam ' + (el || 'none'), sx, sy, { w: len, h: 46 });
    e.style.transformOrigin = '0 50%';
    e.style.marginLeft = '0';
    const tf = s => `translate(0,-50%) rotate(${ang.toFixed(1)}deg) scaleX(${s})`;
    e.style.transform = tf(0);
    this.go(e, [{ transform: tf(0), opacity: 1 }, { transform: tf(1), opacity: 1, offset: 0.35 }, { transform: tf(1), opacity: 1, offset: 0.75 }, { transform: tf(1), opacity: 0 }], { duration: 560 * this.k });
    await U.sleep(200 * this.k);
    this.flash(el === 'fire' ? '#ffe7a0' : '#efe8ff', 0.35);
  },
  async _meteor(c) {
    Snd.play('fire');
    const [tx, ty] = this.target(c);
    const drops = [0, 1, 2].map(i => U.sleep(i * 120 * this.k).then(async () => {
      const x = tx + (i - 1) * 50, sx = x + 260, sy = -60;
      const path = this.curve(sx, sy, x, ty, 0);
      const e = this.spawn('fx-ball fire', sx, sy, { size: 44 });
      this.trail(path, 360 * this.k, 25, (px, py) => this.puff('fx-flame', px, py, U.rf(16, 28), 360, 10, -20));
      await this.fly(e, [sx, sy], path, 360 * this.k, { s: () => 1 });
      e.remove();
      if (i < 2) this.hit('fire', x, ty);
    }));
    await Promise.all(drops);
  },
  async _wisp(c) {
    Snd.play('status');
    await Promise.all([0, 1, 2].map(i => this.shoot(c, 'fx-wispflame', 30, 560, 40, { side: (i - 1) * 80, s: q => 0.8 + Math.sin(q * 12) * 0.15, trail: (x, y) => this.puff('fx-dot', x, y, 8, 300, 0, -10, { bg: '#bfe8ff' }) })));
  },
  async _bubbles(c) {
    Snd.play('water');
    const shots = [];
    for (let i = 0; i < 6; i++) shots.push(U.sleep(i * 60 * this.k).then(() => this.shoot({ ...c, a: [c.a[0] + U.rf(-20, 20), c.a[1] + U.rf(-30, 30)] }, 'fx-bubble', U.rf(22, 36), 520, U.rf(-20, 60), { side: U.rf(-40, 40), s: q => 0.6 + q * 0.6 })));
    await Promise.all(shots);
  },
  async _waterball(c) {
    Snd.play('water');
    await this.shoot(c, 'fx-ball water', 60, 460, 60, { trail: (x, y) => this.puff('fx-drop', x + U.rf(-10, 10), y + U.rf(-10, 10), U.rf(10, 18), 420, U.rf(-20, 20), 30, { r: U.rf(0, 360) }) });
  },
  async _ice(c) {
    Snd.play('ice');
    await Promise.all([0, 1, 2].map(i => U.sleep(i * 70 * this.k).then(() => {
      const ang = Math.atan2(c.d[1] - c.a[1], c.d[0] - c.a[0]) * 180 / Math.PI + 45;
      return this.shoot({ ...c, d: [c.d[0], c.d[1] + (i - 1) * 36] }, 'fx-ice', 38, 300, 10, { rot: ang, s: () => 1, trail: (x, y) => this.puff('fx-flake', x, y, 10, 400, 0, 20) });
    })));
  },
  /** a curling wave (SVG) rolls from the attacker's side over the target */
  async _wave(c) {
    Snd.play('water');
    const [tx, ty] = c.d, sx = c.a[0], gy = (c.dGround ? c.dGround[1] : ty + 100) + 20, ay = (c.aGround ? c.aGround[1] : gy) + 20;
    const e = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    e.setAttribute('class', 'fx-wavesvg');
    e.setAttribute('viewBox', '0 0 360 240');
    e.innerHTML = '<defs><linearGradient id="fxwv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfeaff"/><stop offset=".45" stop-color="#36a3ff"/><stop offset="1" stop-color="#1a6bc4"/></linearGradient></defs>' +
      '<path d="M0 240L0 130C40 70 110 24 186 30C250 36 290 80 280 128C266 100 234 92 212 110C238 118 256 150 246 184L360 184L360 240Z" fill="url(#fxwv)" stroke="#2b2040" stroke-width="7" stroke-linejoin="round"/>' +
      '<path d="M30 118C70 72 124 46 186 48C236 50 268 82 266 112" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" opacity=".9"/>' +
      '<path d="M40 180Q90 160 140 180T240 176" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity=".5"/>';
    UI.fx.appendChild(e);
    const flip = c.dir < 0 ? -1 : 1, W = 360, H = 240, dx = tx - sx;
    // rolls along the ground from the attacker's feet to the target's
    const at = (q, s) => `translate(${(sx + dx * q - W / 2).toFixed(0)}px, ${(ay + (gy - ay) * Math.min(1, q) - H).toFixed(0)}px) scale(${(flip * s).toFixed(2)}, ${s.toFixed(2)})`;
    e.style.transformOrigin = '50% 100%';
    this.go(e, [{ transform: at(-0.08, 0.35), opacity: 0 }, { transform: at(0.45, 0.9), opacity: 1, offset: 0.45 }, { transform: at(1, 1.15), opacity: 1, offset: 0.8 }, { transform: at(1.12, 1.2), opacity: 0 }], { duration: 760 * this.k, easing: 'ease-in' });
    this.trail(q => [sx + dx * q, ay + (gy - ay) * q - 170], 640 * this.k, 40, (x, y) => this.puff('fx-drop', x + U.rf(-60, 60), y, U.rf(12, 20), 500, U.rf(-30, 30), -40, { r: U.rf(0, 360) }));
    await U.sleep(560 * this.k);
  },
  async _blizzard(c) {
    Snd.play('ice');
    const [tx, ty] = c.d;
    this.flash('#d8f6ff', 0.35, 600);
    for (let i = 0; i < 34; i++) {
      const sx = tx + U.rf(-260, 160) + c.dir * -200, sy = ty + U.rf(-260, -120);
      const e = this.spawn(i % 3 ? 'fx-flake' : 'fx-ice', sx, sy, { size: i % 3 ? U.rf(10, 18) : 20 });
      this.go(e, [{ transform: this.T(0, 0, 0.6, 0), opacity: 0 }, { transform: this.T(c.dir * 120, 100, 1, 90), opacity: 1, offset: 0.4 }, { transform: this.T(c.dir * 300, 250, 0.6, 240), opacity: 0 }], { duration: 700 * this.k, delay: i * 14 * this.k, easing: 'linear' });
    }
    await U.sleep(520 * this.k);
  },
  async _rain(c) {
    Snd.play('water');
    const [x, y] = c.a;
    for (let i = 0; i < 22; i++) {
      const e = this.spawn('fx-rain', x + U.rf(-120, 120), y - 220, { w: 5, h: 26 });
      this.go(e, [{ transform: this.T(0, 0), opacity: 0 }, { transform: this.T(0, 80), opacity: 1, offset: 0.3 }, { transform: this.T(0, 260), opacity: 0 }], { duration: 520 * this.k, delay: i * 22 * this.k, easing: 'ease-in' });
    }
    await U.sleep(420 * this.k);
  },
  async _toxic(c) {
    Snd.play('status');
    await this.shoot(c, 'fx-ball poison', 54, 480, 60, { trail: (x, y) => this.puff('fx-bubble poison', x, y, U.rf(10, 18), 420, 0, -20) });
  },
  async _dream(c) {
    Snd.play('heal');
    await Promise.all([0, 1, 2, 3].map(i => this.shoot(c, 'fx-star', 26, 620, 50 + i * 20, { side: (i - 1.5) * 60, spin: 540, s: q => 0.6 + Math.sin(q * Math.PI) * 0.6, trail: (x, y) => this.puff('fx-dot', x, y, 8, 360, 0, 0, { bg: U.pick(FX_COL.dream) }) })));
  },
  async _pebbles(c) {
    Snd.play('earth');
    await Promise.all([0, 1].map(i => U.sleep(i * 90 * this.k).then(() => this.shoot({ ...c, d: [c.d[0] + (i ? 30 : -20), c.d[1] + (i ? 10 : -10)] }, 'fx-rock', 30, 440, 110, { spin: 540, s: () => 1 }))));
  },
  async _mud(c) {
    Snd.play('earth');
    await Promise.all([0, 1, 2].map(i => U.sleep(i * 80 * this.k).then(() => this.shoot({ ...c, d: [c.d[0] + (i - 1) * 30, c.d[1] + (i - 1) * 16] }, 'fx-mud', 30, 420, 90, { s: q => 0.8 + q * 0.4 }))));
  },
  async _vine(c) {
    Snd.play('earth');
    const [sx, sy] = c.a, [tx, ty] = this.target(c);
    const mx = (sx + tx) / 2, my = Math.min(sy, ty) - 120;
    const e = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    e.setAttribute('class', 'fx-svg');
    e.setAttribute('viewBox', '0 0 1280 720');
    const d = `M${sx} ${sy}Q${mx} ${my} ${tx} ${ty}`;
    e.innerHTML = `<path d="${d}" fill="none" stroke="#2b2040" stroke-width="20" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/><path d="${d}" fill="none" stroke="#5cb947" stroke-width="12" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>`;
    UI.fx.appendChild(e);
    const paths = Array.from(e.querySelectorAll('path'));
    await Promise.all(paths.map(p => U.anim(p, [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: 300 * this.k, easing: 'ease-in', fill: 'forwards' })));
    setTimeout(() => { paths.forEach(p => U.anim(p, [{ strokeDashoffset: 0 }, { strokeDashoffset: -100 }], { duration: 260 * this.k, fill: 'forwards' })); setTimeout(() => e.remove(), 300 * this.k); }, 120);
  },
  async _rockfall(c, id) {
    Snd.play('earth');
    const [tx, ty] = this.target(c), n = id === 'summit_crash' ? 3 : 5;
    await Promise.all(Array.from({ length: n }, (_, i) => U.sleep(i * 70 * this.k).then(async () => {
      const x = tx + U.rf(-70, 70), size = id === 'summit_crash' ? U.rf(60, 90) : U.rf(34, 54);
      const e = this.spawn('fx-rock', x, ty - 330, { size });
      await U.anim(e, [{ transform: this.T(0, 0, 1, 0) }, { transform: this.T(0, 300 + U.rf(-20, 20), 1, U.rf(-90, 90)) }], { duration: 300 * this.k, easing: 'cubic-bezier(.5,0,1,.6)', fill: 'forwards' });
      e.remove();
      for (let k = 0; k < 2; k++) this.puff('fx-dust', x + U.rf(-30, 30), ty + 30, 60, 700, U.rf(-40, 40), -30);
    })));
    this.shake(9);
  },
  async _leaves(c) {
    Snd.play('earth');
    const shots = [];
    for (let i = 0; i < 12; i++) shots.push(U.sleep(i * 30 * this.k).then(() => this.shoot({ ...c, a: [c.a[0] + U.rf(-30, 30), c.a[1] + U.rf(-40, 40)] }, 'fx-leaf', U.rf(18, 28), U.rf(460, 560), U.rf(-60, 120), { side: U.rf(-80, 80), spin: U.rf(-720, 720), s: () => 1 })));
    await Promise.all(shots);
  },
  async _quake(c) {
    Snd.play('rumble');
    const [tx] = c.d, gy = c.dGround ? c.dGround[1] : c.d[1] + 100;
    this.shake(16, 700);
    const e = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    e.setAttribute('class', 'fx-svg');
    e.setAttribute('viewBox', '0 0 1280 720');
    const cr = (dx) => `M${tx} ${gy}l${dx * 30} ${U.ri(-6, 6)}l${dx * 26} ${U.ri(-10, 10)}l${dx * 34} ${U.ri(-6, 8)}l${dx * 30} ${U.ri(-8, 8)}`;
    e.innerHTML = `<path d="${cr(1)}" fill="none" stroke="#2b2040" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="${cr(-1)}" fill="none" stroke="#2b2040" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
    UI.fx.appendChild(e);
    this.go(e, [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 1100 * this.k });
    for (let i = 0; i < 8; i++) this.puff('fx-dust', tx + U.rf(-140, 140), gy, U.rf(50, 90), 900, U.rf(-30, 30), -60, { delay: i * 40 });
    this.burst(tx, gy - 10, 'fx-rock', 10, { dist: 150, size: 22, grav: 140, spin: 300, dir: -Math.PI / 2, spread: 1.6 });
    await U.sleep(360 * this.k);
  },
  async _spores(c) {
    Snd.play('status');
    const shots = [];
    for (let i = 0; i < 14; i++) shots.push(U.sleep(i * 25 * this.k).then(() => this.shoot({ ...c, a: [c.a[0] + U.rf(-40, 40), c.a[1] + U.rf(-40, 20)] }, 'fx-spore', U.rf(8, 14), 700, U.rf(0, 90), { side: U.rf(-60, 60), s: () => 1 })));
    await Promise.all(shots);
  },
  async _wind(c, id) {
    Snd.play('air');
    const n = id === 'twin_tempest' ? 5 : 3;
    const ang = Math.atan2(c.d[1] - c.a[1], c.d[0] - c.a[0]) * 180 / Math.PI;
    await Promise.all(Array.from({ length: n }, (_, i) => U.sleep(i * 80 * this.k).then(() => this.shoot({ ...c, d: [c.d[0], c.d[1] + (i - (n - 1) / 2) * 34] }, 'fx-crescent', 64, 380, 20, { rot: ang, s: q => 0.6 + q * 0.7 }))));
  },
  async _spark(c) {
    Snd.play('air');
    await this.shoot(c, 'fx-ball bolt', 40, 380, 40, { trail: (x, y) => { this.puff('fx-spark', x + U.rf(-14, 14), y + U.rf(-14, 14), 7, 260, U.rf(-20, 20), U.rf(-20, 20)); } });
  },
  async _slash(c) {
    Snd.play('air');
    const [x, y] = this.target(c);
    for (let i = 0; i < 2; i++) {
      const e = this.spawn('fx-slash', x, y, { w: 260, h: 12 });
      const r = i ? -40 : 40;
      this.go(e, [{ transform: this.T(-90, i ? 60 : -60, 0.2, r), opacity: 1 }, { transform: this.T(0, 0, 1, r), opacity: 1, offset: 0.4 }, { transform: this.T(40, i ? -20 : 20, 1.1, r), opacity: 0 }], { duration: 340 * this.k, delay: i * 110 * this.k });
    }
    await U.sleep(200 * this.k);
  },
  async _bolt(c) {
    Snd.play('thunder');
    const [x, y] = this.target(c);
    this.flash('#fffbe0', 0.5, 220);
    this.bolt(x, y);
    await U.sleep(110 * this.k);
  },
  async _storm(c) {
    Snd.play('thunder');
    const [x, y] = this.target(c);
    this.flash('#1c1640', 0.45, 700);
    for (let i = 0; i < 3; i++) this.bolt(x + (i - 1) * 60, y, { delay: i * 120 });
    await U.sleep(330 * this.k);
    this.shake(10);
  },
  async _starfall(c) {
    Snd.play('thunder');
    const [tx, ty] = this.target(c);
    this.flash('#1c1640', 0.35, 600);
    await Promise.all(Array.from({ length: 5 }, (_, i) => U.sleep(i * 70 * this.k).then(async () => {
      const x = tx + U.rf(-90, 90), sx = x + U.rf(-80, 80), sy = -50;
      const path = this.curve(sx, sy, x, ty, 0);
      const e = this.spawn('fx-star', sx, sy, { size: 36 });
      this.trail(path, 340 * this.k, 30, (px, py) => this.puff('fx-dot', px, py, 9, 300, 0, 0, { bg: '#fff6a0' }));
      await this.fly(e, [sx, sy], path, 340 * this.k, { spin: 360, s: () => 1 });
      e.remove();
    })));
  },
  async _lunge(c) {
    Snd.play('phys');
    U.anim(c.aSlot.wrap, [{ transform: 'translate(0,0)' }, { transform: `translate(${c.dir * 150}px, ${c.dir * -40}px)`, offset: 0.45 }, { transform: 'translate(0,0)' }], { duration: 420 * this.k, easing: 'ease-in-out' });
    await U.sleep(190 * this.k);
  },
  async _slam(c) {
    Snd.play('phys');
    const dx = c.dir * 200, dy = c.dir * -60;
    U.anim(c.aSlot.wrap, [{ transform: 'translate(0,0)' }, { transform: `translate(${dx * 0.4}px, ${dy - 90}px)`, offset: 0.3 }, { transform: `translate(${dx}px, ${dy}px)`, offset: 0.55 }, { transform: 'translate(0,0)' }], { duration: 560 * this.k, easing: 'ease-in-out' });
    await U.sleep(300 * this.k);
    this.shake(10);
  },
  async _claw(c) {
    Snd.play('phys');
    U.anim(c.aSlot.wrap, [{ transform: 'translate(0,0)' }, { transform: `translate(${c.dir * 110}px, ${c.dir * -30}px)`, offset: 0.45 }, { transform: 'translate(0,0)' }], { duration: 380 * this.k, easing: 'ease-in-out' });
    await U.sleep(170 * this.k);
  },
  async _chomp(c) {
    Snd.play('phys');
    const [x, y] = this.target(c);
    const top = this.spawn('fx-jaw top', x, y - 70, { w: 150, h: 46 }), bot = this.spawn('fx-jaw bot', x, y + 70, { w: 150, h: 46 });
    const k = 260 * this.k;
    this.go(top, [{ transform: this.T(0, -20), opacity: 0 }, { transform: this.T(0, -20), opacity: 1, offset: 0.3 }, { transform: this.T(0, 48), opacity: 1, offset: 0.75 }, { transform: this.T(0, 44), opacity: 0 }], { duration: k * 1.6 });
    this.go(bot, [{ transform: this.T(0, 20), opacity: 0 }, { transform: this.T(0, 20), opacity: 1, offset: 0.3 }, { transform: this.T(0, -48), opacity: 1, offset: 0.75 }, { transform: this.T(0, -44), opacity: 0 }], { duration: k * 1.6 });
    await U.sleep(k * 1.2);
  },
  async _peck(c) {
    Snd.play('phys');
    U.anim(c.aSlot.wrap, [{ transform: 'translate(0,0)' }, { transform: `translate(${c.dir * 130}px, ${c.dir * -36}px)`, offset: 0.4 }, { transform: 'translate(0,0)' }], { duration: 360 * this.k, easing: 'ease-in-out' });
    await U.sleep(160 * this.k);
    const [x, y] = this.target(c);
    for (let i = 0; i < 2; i++) setTimeout(() => this.pow(x + U.rf(-40, 40), y + U.rf(-40, 40), 70), 90 * (i + 1));
  },
  async _sting(c) {
    Snd.play('phys');
    await this._lunge(c);
    this.hit('poison', ...this.target(c));
  },
  async _arrow(c) {
    Snd.play('air');
    const ang = Math.atan2(c.d[1] - c.a[1], c.d[0] - c.a[0]) * 180 / Math.PI;
    await this.shoot(c, 'fx-arrowshot', 0, 260, 12, { w: 90, h: 10, rot: ang, s: () => 1, trail: (x, y) => this.puff('fx-dot', x, y, 7, 260, 0, 0, { bg: '#fff6a0' }) });
  },
  async _shout(c, id) {
    Snd.play('debuff');
    const [sx, sy] = c.a, [tx, ty] = c.d, n = id === 'roar' ? 4 : 3;
    const ang = Math.atan2(ty - sy, tx - sx) * 180 / Math.PI;
    await Promise.all(Array.from({ length: n }, (_, i) => U.sleep(i * 90 * this.k).then(() => this.shoot(c, 'fx-sound', 70, 420, 0, { rot: ang, s: q => 0.5 + q * 1.1 }))));
    if (id === 'roar') this.shake(7);
  },
  async _glare(c) {
    Snd.play('debuff');
    const [sx, sy] = c.a;
    this.glow(sx, sy - 20, 'rgba(255,90,110,.8)', 150, 400);
    await this.shoot(c, 'fx-ball glare', 36, 300, 0);
    this.flash('#ff5d6c', 0.18, 300);
  },
  async _notes(c) {
    Snd.play('heal');
    await Promise.all([0, 1, 2].map(i => U.sleep(i * 120 * this.k).then(() => this.shoot({ ...c, a: [c.a[0], c.a[1] - 40] }, 'fx-note', 40, 700, 60 + i * 30, { side: (i - 1) * 50, s: q => 0.7 + Math.sin(q * 10) * 0.15 }))));
  },

  /* ---------------- self-cast ---------------- */
  async cast(id, c) {
    if (typeof VFX !== 'undefined' && VFX.ok() && VFX.ensure()) { try { return await VFX.cast(id, c); } catch (e) { console.warn('vfx cast', e); } }
    const st = this.styleOf(id), [x, y] = c.a, m = MOVES[id] || {};
    const col = { fire: '#ff8a2e', water: '#36a3ff', earth: '#5cb947', air: '#a07cff' }[m.el] || '#fff3a0';
    if (st === 'heal') { Snd.play('heal'); this.healRise(x, y); await U.sleep(420 * this.k); return; }
    if (st === 'rain') { await this._rain(c); this.healRise(x, y); return; }
    if (st === 'charge') {
      Snd.play('buff');
      this.glow(x, y, 'rgba(255,240,120,.8)', 240, 600);
      for (let i = 0; i < 6; i++) this.puff('fx-arrow', x + U.rf(-70, 70), y + 40, 34, 800, 0, -110, { text: '⚡', color: '#ffe066', s0: 0.7, s1: 0.9, delay: i * 70 });
      for (let i = 0; i < 3; i++) this.zap(x + U.rf(-50, 50), y + U.rf(-50, 50), 70);
      await U.sleep(420 * this.k);
      return;
    }
    Snd.play('buff');
    this.ring(x, y, col, 230, { w: 7 });
    this.glow(x, y, col + 'cc', 260, 600);
    await U.sleep(380 * this.k);
  },
};
