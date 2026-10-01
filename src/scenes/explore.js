'use strict';
/* Exploration: a 2.5D island zone. Click/tap the ground to walk, click wild Orblings to battle them,
 * talk to tamers & guardians, heal at the Star Pod, open the daily chest, travel via exits or the ship.
 * Nothing is labelled until you point at it. Movement is physical: the tamer
 * accelerates, eases into a stop, turns like a paper cut-out and bobs in step; every Orbling moves in the
 * gait of its body (trot, hop, scuttle, skitter, slither, glide) and lives a little life between walks. */

const WALK = { x0: 50, x1: 1230, y0: 446, y1: 652 };
const depthScale = y => 0.74 + 0.26 * U.clamp((y - 420) / 270, 0, 1);
/** where the creature really is inside its sprite box: [top, bottom] as fractions, measured once per species */
const BOUNDS = {};
function spriteBounds(sp, url) {
  return BOUNDS[sp] || (BOUNDS[sp] = new Promise(res => {
    const im = new Image(), fall = [0.12, 0.95];
    im.onload = () => {
      try {
        const n = 64, c = document.createElement('canvas');
        c.width = c.height = n;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(im, 0, 0, n, n);
        const d = g.getImageData(0, 0, n, n).data, row = y => { for (let x = 0; x < n; x++) if (d[(y * n + x) * 4 + 3] > 90) return true; return false; };
        let a = 0, b = n - 1;
        while (a < n - 1 && !row(a)) a++;
        while (b > a && !row(b)) b--;
        res(b > a ? [a / n, (b + 1) / n] : fall);
      } catch (err) { res(fall); }
    };
    im.onerror = () => res(fall);
    im.src = url;
  }));
}
const GAIT = { quad: 'trot', egg: 'hop', round: 'hop', bird: 'hop', crab: 'scuttle', scorp: 'skitter', serpent: 'slither', fish: 'float', cloud: 'float' };

const ExploreScene = {
  saved: null,

  async enter(p) {
    const s = Game.s;
    const home = this.home = !!p.home;
    this.area = home ? (p.home === 'yard' ? 'yard' : 'glade') : null; // the Base: the glade or the Workshop Yard
    const zid = home ? (this.area === 'yard' ? 'yard' : 'home') : (p.zone || s.loc.zone || 'clover');
    const z = this.zone = home ? (this.area === 'yard' ? YARD : HOME) : ZONES[zid];
    this.walk = z.walk || WALK;
    const prevZone = s.loc.zone;
    let firstVisit;
    if (home) firstVisit = this.area === 'yard' ? !s.flags.yardIntro : !s.flags.homeIntro;
    else {
      s.loc.zone = zid;
      firstVisit = !s.visited.includes(zid);
      if (firstVisit) s.visited.push(zid);
    }
    this.busy = false; this.chase = null; this.keys = {}; this.ents = []; this.byId = {}; this.wilds = []; this.spawnT = 2.5; this.uid = 0;
    // the first minute on the meadow: until the first catch only the tutorial Orbling calls for attention
    // (no orange exit arrows, no "!"/"?" over the tamers, no glinting chest, nothing that looks like it next to it)
    this.tut = !home && zid === 'clover' && !s.flags.tutCatch; this.tutIdle = 0;
    this.shards = []; this.shardT = U.rf(6, 14); this.emoteT = 3; this.time = 0; this.pending = [];
    this.phase = U.dayPhase();
    this.night = this.phase === 'night';
    // the local time of day: the backdrop is painted for the hour (moon and stars, a sunset, a misty morning) and the
    // sprites take a light grade in CSS (.tod-*) — never a dark sheet over the whole scene (3.4.1)
    this.tod = zoneTod(z, this.phase); this.meteorT = U.rf(4, 10);
    await WArt.bake(z.biome, z.seed, this.tod);
    const root = UI.scene;
    root.className = 'explore b-' + z.biome + (this.tod ? ' tod-' + this.tod : '');
    // portrait: the same art, softly blurred, fills the screen around the world's window
    root.appendChild(WArt.bgImg(z.biome, z.seed, 'ex-back', this.tod));
    const stage = this.stageEl = U.el('div', { class: 'stage16' });
    root.appendChild(stage);
    stage.appendChild(WArt.bgImg(z.biome, z.seed, 'ex-bg', this.tod));
    this.amb = U.el('div', { class: 'amb' });
    stage.appendChild(this.amb);
    this.ambient();
    this.world = U.el('div', { class: 'world' });
    stage.appendChild(this.world);
    this.marker = U.el('div', { class: 'tapmark' });
    this.world.appendChild(this.marker);

    this.buildInteractables();
    this.buildNpcs();
    this.buildProps();
    if (home) this.buildBase();

    // player position
    const restore = !home && p.returning && this.saved && this.saved.zone === zid;
    let px, py;
    if (restore) { px = this.saved.px; py = this.saved.py; }
    else if (p.from) {
      const ex = z.exits.find(e => e[0] === p.from);
      if (ex) { px = ex[1] + (ex[3] ? 110 : -110); py = ex[2] + 10; } else [px, py] = z.start;
    } else if (!home && !p.fresh && prevZone === zid && s.loc.x) { px = s.loc.x; py = s.loc.y; }
    else [px, py] = z.start;
    if (p.result === 'lost' && z.pod) { px = z.pod[0] + 90; py = Math.max(this.walk.y0 + 10, z.pod[1]); }
    this.player = this.addEnt({ type: 'player', x: px, y: py, w: 120, h: 170, src: WArt.person(s.look), dyn: true, sw: 70 });
    this.player.face = 1; this.player.turn = 1; this.player.vx = 0; this.player.vy = 0; this.player.ph = 0; this.player.cyc = 0;
    this.loadSprites(this.player, 'person', s.look, true);
    this.pipEl = U.el('div', { class: 'pipfly' }, U.img(WArt.pip(), 'pip-img'));
    this.world.appendChild(this.pipEl);
    this.pip = { x: px - 70, y: py - 120, vx: 0 };
    this.cam = null; this.camFocus = null;
    this.layout();

    // wild orblings
    if (restore) {
      for (const w of this.saved.wilds) {
        if (w.id === this.saved.fighting && (p.result === 'won' || p.result === 'caught')) continue;
        const e = this.addWild(w.sp, w.lv, w.shiny, w.x, w.y, false, w.alpha);
        e.base = w.base;
        if (!w.alpha && w.sp === zoneRare(zid) && !this.tut) e.el.classList.add('rarew');
        if (w.tutorial && this.tut) this.markTut(e);
        if (w.id === this.saved.fighting) { e.state = 'idle'; e.t = 2; e.tx = U.clamp(e.x + 200 * (e.x > px ? 1 : -1), this.walk.x0 + 60, this.walk.x1 - 60); }
      }
    } else if (home) { if (this.area === 'yard') this.spawnYard(); else this.spawnOwn(); }
    else if (this.tut) this.tutorialWild();
    else for (let i = 0; i < z.max; i++) this.spawnWild(false);
    this.saved = null;
    if (this.camFocus) this.applyCam(0, true);

    root.addEventListener('pointerdown', this._down = e => this.onDown(e));
    root.addEventListener('pointermove', this._move = e => this.onHover(e));
    window.addEventListener('keydown', this._kd = e => this.onKey(e, true));
    window.addEventListener('keyup', this._ku = e => this.onKey(e, false));

    UI.hudBuild();
    UI.hudShow(true);
    if (!p.returning) UI.zoneBanner(z, this.night);
    Platform.context({ zone: zid, isle: z.isle || 'home' });
    if ((firstVisit || p.arrive) && !home && ISLE[z.isle].zones[0] === zid) Platform.track('isle', z.isle, 'start'); // arrive: from the first battle
    if (home && firstVisit) Platform.track('base', this.area, 'start');
    Snd.music(home ? 'home' : ISLE[z.isle].music);
    Platform.gameplayStart();
    this.running = true;
    this.last = performance.now();
    this.rafT = performance.now();
    const loop = t => {
      if (!this.running) return;
      this.rafT = t;
      this.update(Math.min(0.05, Math.max(0, (t - this.last) / 1000)));
      this.last = t;
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    // watchdog: some embedded/throttled views stop rAF while still visible; keep the world ticking
    clearInterval(this.wd);
    this.wd = setInterval(() => {
      if (!this.running || document.hidden) return;
      const now = performance.now();
      if (now - this.rafT > 250) { this.update(Math.min(0.1, (now - this.last) / 1000)); this.last = now; }
    }, 60);
    for (const e of this.ents) this.place(e, true);
    if (this.pending) { await Promise.race([Promise.all(this.pending), U.sleep(2200)]); this.pending = null; }
    // the Orblings that can still appear on this isle get their frames painted in idle time
    if (!home) for (const zid2 of ISLE[z.isle].zones) for (const [sp] of ZONES[zid2].spawns) MonArt.prefetchSet(sp, true);
    setTimeout(() => this.afterEnter(p, firstVisit), 380);
  },

  /* ---------------- camera (portrait): the world window follows the player ---------------- */
  layout() {
    if (!this.stageEl) return;
    this.closeHomeCard();
    if (!UI.portrait) { this.cam = null; this.stageEl.style.transform = ''; UI.stageXform(''); return; }
    const topHud = 186, botHud = 118;
    const s = U.clamp((UI.H - topHud - botHud) / 720, 0.86, 1.18);
    const top = Math.round(U.clamp((UI.H - 720 * s) / 2 + 24, topHud - 120, UI.H - botHud - 720 * s));
    this.cam = { s, top, vw: UI.W / s, x: this.cam ? this.cam.x : null };
    this.applyCam(0, true);
  },
  applyCam(dt, snap) {
    const c = this.cam;
    if (!c || !this.player) return;
    // the camera follows you; while the tutorial points at the first wild Orbling it frames the two of you
    const f = this.camFocus && this.wilds.includes(this.camFocus) ? this.camFocus : null;
    let want = (f ? (this.player.x + f.x) / 2 : this.player.x) - c.vw / 2;
    if (f) want = U.clamp(want, this.player.x + 60 - c.vw, this.player.x - 60); // ...but you never leave the picture
    want = U.clamp(want, 0, 1280 - c.vw);
    c.x = snap || c.x == null ? want : c.x + (want - c.x) * Math.min(1, dt * 4.5);
    const t = `translate(${(-c.x * c.s).toFixed(1)}px, ${c.top}px) scale(${c.s})`;
    this.stageEl.style.transform = t;
    UI.stageXform(t);
  },
  /** stage (root) coordinates ↔ world coordinates */
  toWorld(gx, gy) { const c = this.cam; return c ? [gx / c.s + c.x, (gy - c.top) / c.s] : [gx, gy]; },
  toScreen(wx, wy) { const c = this.cam; return c ? [(wx - c.x) * c.s, c.top + wy * c.s] : [wx, wy]; },

  exit() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    clearInterval(this.wd);
    UI.scene.removeEventListener('pointerdown', this._down);
    UI.scene.removeEventListener('pointermove', this._move);
    window.removeEventListener('keydown', this._kd);
    window.removeEventListener('keyup', this._ku);
    if (this.player && !this.home) { Game.s.loc.x = Math.round(this.player.x); Game.s.loc.y = Math.round(this.player.y); }
    this.closeHomeCard();
    UI.hudShow(false);
  },

  async afterEnter(p, firstVisit) {
    if (UI.cur !== this) return;
    this.busy = true;
    const z = this.zone, isle = z.isle ? ISLE[z.isle] : null, f = Game.s.flags;
    try {
      if (this.tut && this.wilds.some(w => w.tutorial)) this.pipSay(t('tut.go'), 9000);
      else if (this.home && firstVisit && this.area === 'yard') {
        f.yardIntro = 1;
        await UI.talk([{ who: 'bruno', text: t('yard.intro1') }, { who: 'bruno', text: t('yard.intro2') }, { who: 'pip', text: t('yard.intro3') }]);
      } else if (this.home && firstVisit) {
        f.homeIntro = 1;
        await UI.talk([{ who: 'pip', text: t('home.intro1') }, { who: 'pip', text: t('home.intro2') }, { who: 'pip', text: t('home.intro3') }]);
      } else if (!this.home && firstVisit && isle.zones[0] === z.id && z.isle !== 'sunny') {
        await UI.talk([{ who: 'pip', text: t('pip.isle.' + z.isle) }]);
      } else if (firstVisit && z.id === 'citadel') {
        await UI.talk([{ who: 'pip', text: t('pip.citadel') }]);
      }
      if (p.result === 'lost') UI.toast(WArt.icon('heal', 26) + ' ' + t('ex.rescued'), 'good');
      const done = Quests.check();
      if (done.length) await UI.questDone(done);
      if (f.tutCatch && !f.tutDone) {
        f.tutDone = 1;
        Platform.track('tutorial', 'catch', 'complete');
        this.pipSay(t('tut.after'), 6500); // 3.4: one line in Pip's bubble instead of a dialogue to tap through
      }
      // Pip introduces the new places once they matter (the camp only when there is an egg to put in it)
      if (f.tutDone && !f.introCamp && (Camp.eggsInBag() > 0 || Game.s.camp.eggs.length)) {
        f.introCamp = 1;
        await UI.talk([{ who: 'pip', text: t('pip.camp1') }, { who: 'pip', text: t('pip.camp2') }]);
      }
      if (!f.introArena && Arena.anyUnlocked()) {
        f.introArena = 1;
        await UI.talk([{ who: 'pip', text: t('pip.arena1') }, { who: 'pip', text: t('pip.arena2') }]);
      }
      // a returning player, once a day (never mid-tutorial): a welcome-back gift is simply handed over, the daily
      // reward is one small popup claimed with one tap (3.4; the full daily panel stays behind the HUD's calendar)
      if (f.tutDone && f.returning && (Login.due() || Game.s.base.welcome) && f.todayDay !== U.today()) {
        f.todayDay = U.today();
        if (Game.s.base.welcome) { const r = Base.claimWelcome(); Game.save(); UI.hudUpdate(); if (r) UI.cheer(t('day.welcome_t'), r, { color: 'gold', sound: 'coin' }); }
        if (Login.due()) await Menus.dailyGift();
      }
      if (this.home && this.area === 'yard' && this.visitorEnt && !this.visitorEnt.greeted) {
        this.visitorEnt.greeted = true;
        Snd.play('notice');
        UI.toast(WArt.icon('heart', 22) + ' ' + t('yard.visit_toast', { name: SPECIES[this.visitorEnt.sp].name }), 'good');
      }
      await UI.medalToasts();
    } catch (e) { console.error(e); }
    this.busy = false;
    UI.hudUpdate();
    Game.save();
  },

  /* ---------------- building ---------------- */
  addEnt(o) {
    const e = Object.assign({ id: 'e' + (this.uid++), dyn: false, face: 1, turn: 1 }, o);
    e.turn = e.face;
    const el = U.el('div', { class: 'ent ent-' + e.type + (e.interact ? ' clickable' : ''), 'data-id': e.id });
    if (e.shadow !== false) {
      const sw = e.sw || e.w * 0.62;
      e.shadowEl = U.el('div', { class: 'shadow', style: { width: sw + 'px', left: -sw / 2 + 'px' } });
      el.appendChild(e.shadowEl);
    }
    const inner = U.el('div', { class: 'ent-in' });
    inner.style.width = e.w + 'px'; inner.style.height = e.h + 'px';
    inner.style.left = -e.w / 2 + 'px'; inner.style.top = (-e.h + (e.foot || 0)) + 'px';
    const img = U.img(e.src, 'ent-img');
    inner.appendChild(img);
    el.appendChild(inner);
    e.el = el; e.inner = inner; e.imgEl = img;
    this.world.appendChild(el);
    this.ents.push(e);
    this.byId[e.id] = e;
    this.place(e, true); // (things rebuilt later — a workshop, a decoration — must not wait for enter())
    return e;
  },
  /**
   * painted sprite sets: idle, a blink frame and (for walkers) a walk cycle. Bakes land progressively; each
   * frame is decoded up front so switching frames never flickers. `this.pending` collects the idle bakes so
   * the scene can wait for them behind the fade.
   */
  loadSprites(e, kind, look, walks) {
    e.spr = { idle: e.src, blink: null, move: null, loop: null, keep: [] };
    const alive = () => this.ents.includes(e);
    const dec = u => { const im = new Image(); im.src = u; e.spr.keep.push(im); return (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => u); };
    const all = ps => Promise.all(ps).then(us => Promise.all(us.map(dec)));
    if (kind === 'person') {
      const idleP = WArt.painted(look, { urgent: true }).then(dec).then(u => { e.spr.idle = u; e._src = null; });
      if (this.pending) this.pending.push(idleP);
      WArt.painted(look, { blink: true }).then(dec).then(u => { e.spr.blink = u; });
      if (walks) { const fr = []; for (let i = 0; i < 8; i += MonArt.walkStep()) fr.push(WArt.painted(look, { frame: i })); all(fr).then(us => { if (alive()) e.spr.move = us; }); }
      return;
    }
    // an Orbling: an idle loop (secondary motion), a blink, and a move cycle in the gait of its body
    // requested in order of importance: the rest pose, then the move cycle (no sliding), the idle loop, the blink
    const n = MonArt.frames(), o = { shiny: e.shiny }, loop = [], mv = [];
    const first = MonArt.painted(e.sp, Object.assign({ t: 0, urgent: true }, o));
    const idleP = first.then(dec).then(u => { e.spr.idle = u; e._src = null; });
    if (this.pending) this.pending.push(idleP);
    first.then(u => spriteBounds(e.sp, u)).then(b => { if (alive()) this.fitSprite(e, b); });
    for (let i = 0; i < n; i++) mv.push(MonArt.painted(e.sp, Object.assign({ mv: i / n }, o)));
    all(mv).then(us => { if (alive()) e.spr.move = us; });
    loop.push(first);
    for (let i = 1; i < n; i++) loop.push(MonArt.painted(e.sp, Object.assign({ t: i / n }, o)));
    all(loop).then(us => { if (alive()) e.spr.loop = us; });
    MonArt.painted(e.sp, Object.assign({ blink: true }, o)).then(dec).then(u => { e.spr.blink = u; });
  },
  /**
   * the image for this frame: the move cycle while moving (hoppers: the hop frame for the hop phase, also for a
   * startled hop), closed eyes while asleep, otherwise the idle loop at ~5 fps with a blink as it passes frame 0
   */
  spriteFrame(e, dt) {
    const S = e.spr;
    if (!S) return;
    let src = S.idle;
    const hop = e.gait === 'hop';
    if (S.move && (e.moving || (hop && e.act === 'hop'))) {
      let i;
      if (hop) {
        const p = e.moving ? (e.hopP || 0) : 0.12 + 0.68 * Math.min(0.999, (e.actT || 0) / 0.42);
        i = p < 0.12 ? 0 : p < 0.24 ? 1 : p < 0.44 ? 2 : p < 0.58 ? 3 : p < 0.8 ? 4 : 5;
        i = Math.floor(i * S.move.length / MonArt.FRAMES); // lite mode has every other picture
      } else i = Math.floor((((e.cyc || 0) % 1) + 1) % 1 * S.move.length);
      src = S.move[Math.min(i, S.move.length - 1)];
      e.blinked = false;
    } else if (e.state === 'sleep' && S.blink) src = S.blink;
    else {
      let k = 0;
      if (S.loop) {
        e.it = (e.it == null ? Math.random() * S.loop.length : e.it) + dt * 5 * S.loop.length / MonArt.FRAMES;
        k = Math.floor(e.it) % S.loop.length;
        src = S.loop[k];
      }
      if (S.blink) {
        e.blinkT = (e.blinkT == null ? U.rf(1, 4) : e.blinkT) - dt;
        if (e.blinkT < 0) {
          if (!S.loop) { src = S.blink; if (e.blinkT < -0.13) e.blinkT = U.rf(2.2, 5.5); }
          else if (k === 0 && (e.it % 1) < 0.7) { src = S.blink; e.blinked = true; }
          else if (e.blinked) { e.blinked = false; e.blinkT = U.rf(2.4, 5.5); }
        }
      }
    }
    if (e._src !== src) { e.imgEl.src = src; e._src = src; }
  },
  removeEnt(e) {
    e.el.remove();
    this.ents = this.ents.filter(x => x !== e);
    delete this.byId[e.id];
    this.wilds = this.wilds.filter(x => x !== e);
  },
  /** the measured creature: speech bubbles and the name label sit just over its head; swimmers sink to the waterline */
  fitSprite(e, [top, bot]) {
    e.top = top;
    if (e.pond) { e.foot = Math.round(e.h * (1 - (top + (bot - top) * 0.6))); e.inner.style.top = (e.h + e.foot) + 'px'; }
    if (e.labelEl) e.labelEl.style.bottom = this.headY(e, 6) + 'px';
    if (e.tutEl) e.tutEl.style.bottom = this.headY(e, 4) + 'px';
  },
  /** how far the top of the creature's head is above its foot point (plus a margin) */
  headY(e, m = 0) { return Math.round((e.top != null ? (1 - e.top) * e.h : e.h) - (e.foot || 0) + (e.lift || 0) + m); },
  /** the nearest point of the pond's open water (`k` < 1 keeps away from the banks) */
  inPond(x, y, k = 1) {
    const [cx, cy, rx, ry] = this.zone.pond, dx = (x - cx) / rx, dy = (y - cy) / ry, d = Math.hypot(dx, dy);
    return d <= k ? [x, y] : [cx + dx / d * k * rx, cy + dy / d * k * ry];
  },
  /** where the tamer stands to reach a swimmer: on the bank on their side (only the upper banks are walkable) */
  pondBank(x, y) {
    const [cx, cy, rx, ry] = this.zone.noGo[0];
    let a = Math.atan2((y - cy) / ry, (x - cx) / rx);
    if (a > 0) a = a > Math.PI / 2 ? -Math.PI : -1;
    a = U.clamp(a, -Math.PI, -1);
    return [cx + Math.cos(a) * rx * 1.06, cy + Math.sin(a) * ry * 1.06];
  },
  /** a little splash where a swimmer breaks the surface */
  splash(w) {
    const s = depthScale(w.y);
    for (let i = 0; i < 2; i++) {
      const d = U.el('i', { class: 'splash' + (i ? ' b' : '') });
      d.style.left = w.x.toFixed(1) + 'px'; d.style.top = w.y.toFixed(1) + 'px'; d.style.transform = `scale(${(s * (0.8 + w.w / 300)).toFixed(3)})`;
      d.style.zIndex = Math.round(w.y) + 1;
      this.world.appendChild(d);
      setTimeout(() => d.remove(), 700);
    }
  },
  /** name label that only shows while the pointer is over the thing */
  tag(e, html, cls) {
    const t2 = U.el('div', { class: 'hlabel ' + (cls || ''), html });
    t2.style.bottom = (e.h - (e.foot || 0) + 10) + 'px';
    e.el.appendChild(t2);
    return t2;
  },
  /** a comic mark floating over an NPC: "!" wants to battle, "?" has advice, a padlock for a sealed guardian */
  mark(e, html, cls) {
    if (e.markEl) e.markEl.remove();
    if (!html) { e.markEl = null; return null; }
    const b = U.el('div', { class: 'cmark ' + (cls || ''), html });
    b.style.bottom = (e.h * (e.scale || 1) - (e.foot || 0) + 4) + 'px';
    e.el.appendChild(b);
    e.markEl = b;
    return b;
  },
  exclusions() {
    const z = this.zone, pts = [];
    for (const [, x, y] of z.npcs) pts.push([x, y]);
    for (const k of ['ship', 'pod', 'chest', 'obs', 'start', 'treehouse', 'hatch', 'dojo', 'bush']) if (z[k]) pts.push(z[k]);
    for (const ex of z.exits) pts.push([ex[1], ex[2]]);
    if (z.block) pts.push(...z.block);
    return pts;
  },
  /** is (x, y) inside an ellipse nobody may enter (the pond)? → the nearest point on its rim, else null */
  noGo(x, y) {
    for (const [cx, cy, rx, ry] of this.zone.noGo || []) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, d = Math.hypot(dx, dy);
      if (d < 1) { const k = 1 / Math.max(d, 0.001); return [cx + dx * k * rx, cy + dy * k * ry]; }
    }
    return null;
  },
  buildProps() {
    const z = this.zone, R = U.rng(z.seed * 7 + 3), set = BIOME_PROPS[z.biome];
    if (z.props) { for (const [type, v, x, y, sc] of z.props) this.addProp(type, v, x, y, sc || 0.9); return; }
    const ex = this.exclusions();
    const free = (x, y, r) => ex.every(([a, b]) => Math.abs(a - x) > r || Math.abs(b - y) > r * 0.9);
    // back row of big props
    let x = 40 + R() * 60;
    while (x < 1260) {
      const [type, v] = set.big[Math.floor(R() * set.big.length)];
      const y = 424 + R() * 22;
      if (free(x, y, 120)) this.addProp(type, v, x, y, 1);
      x += 150 + R() * 130;
    }
    // side & scattered small props
    const spots = [[26, 520], [1254, 500], [22, 660], [1258, 668], [470, 690], [860, 700], [300, 470], [960, 470], [640, 520]];
    for (const [sx, sy] of spots) {
      if (R() < 0.3) continue;
      const px2 = sx + (R() - 0.5) * 40, py2 = sy + (R() - 0.5) * 20;
      if (!free(px2, py2, 110)) continue;
      const [type, v] = set.small[Math.floor(R() * set.small.length)];
      this.addProp(type, v, px2, py2, 0.9);
    }
  },
  addProp(type, v, x, y, sc) {
    const pr = WArt.prop(type, v);
    return this.addEnt({ type: 'prop', x, y, w: pr.w * sc, h: pr.h * sc, src: pr.url, foot: 4, shadow: !['fence', 'sign', 'coral', 'shell_big', 'lava_vent'].includes(type), sw: pr.w * sc * 0.7 });
  },
  buildInteractables() {
    const z = this.zone;
    if (z.ship) {
      const pr = WArt.prop('ship');
      const e = this.addEnt({ type: 'ship', x: z.ship[0], y: z.ship[1], w: pr.w * 0.72, h: pr.h * 0.72, src: pr.url, foot: 4, sw: 150, interact: () => this.openGalaxy(), ap: [z.ship[0] + 110, z.ship[1] + 30] });
      this.tag(e, WArt.icon('ship', 18) + ' ' + t('ex.ship'));
    }
    if (z.pod) {
      const pr = WArt.prop('pod');
      const e = this.addEnt({ type: 'pod', x: z.pod[0], y: z.pod[1], w: pr.w * 0.8, h: pr.h * 0.8, src: pr.url, foot: 4, sw: 90, interact: () => this.usePod(), ap: [z.pod[0] + 80, z.pod[1] + 12] });
      this.tag(e, WArt.icon('heal', 18) + ' ' + t('ex.pod'));
    }
    if (z.chest) {
      const avail = Date.now() - (Game.s.chests[z.id] || 0) > 4 * 3600e3;
      const pr = WArt.prop('chest', avail ? 0 : 1);
      const e = this.addEnt({ type: 'chest', x: z.chest[0], y: z.chest[1], w: pr.w * 0.85, h: pr.h * 0.85, src: pr.url, foot: 4, sw: 60, interact: () => this.openChest(e), ap: [z.chest[0] + 70, z.chest[1]] });
      if (avail && !this.tut) e.el.classList.add('glint');
      this.tag(e, t('ex.chest'));
      this.chestEnt = e;
    }
    if (z.obs) {
      const pr = WArt.prop('observatory');
      const e = this.addEnt({ type: 'obs', x: z.obs[0], y: z.obs[1], w: pr.w * 0.8, h: pr.h * 0.8, src: pr.url, foot: 4, sw: 170, interact: () => this.useObservatory(), ap: [z.obs[0] + 120, z.obs[1] + 30] });
      this.tag(e, WArt.icon('telescope', 18) + ' ' + t('ex.obs'));
    }
    const place = (key, type, sc, label, fn, apx, apy, sw, v) => {
      if (!z[key]) return null;
      const pr = WArt.prop(type, v || 0), [x, y] = z[key];
      const e = this.addEnt({ type: 'obj', x, y, w: pr.w * sc, h: pr.h * sc, src: pr.url, foot: 4, sw: sw || pr.w * sc * 0.6, interact: fn, ap: [x + apx, y + apy] });
      this.tag(e, label);
      return e;
    };
    place('treehouse', 'treehouse', 0.92, WArt.icon('team', 18) + ' ' + t('home.tree'), () => Menus.team(), -150, 26, 220);
    // the living Hatchery and Dojo: the real eggs lie in the nest, trainees spar on the mat (see buildBase)
    this.hatchEnt = place('hatch', 'hatchery', 0.8, WArt.icon('egg', 18) + ' ' + t('camp.hatch'), () => this.useHatchery(), 96, 18, 0, 1);
    this.dojoEnt = place('dojo', 'dojo', 0.82, WArt.icon('dojo', 18) + ' ' + t('camp.dojo'), () => this.useDojo(), 0, 40, 150);
    if (z.spring) {
      const [x, y] = z.spring;
      const e = this.addEnt({ type: 'obj', x, y, w: 90, h: 60, src: WArt.item('shard'), foot: 20, shadow: false, interact: () => this.usePod(), ap: [x - 150, y - 20] });
      e.imgEl.style.opacity = '0';
      e.el.classList.add('spring');
      this.tag(e, WArt.icon('heal', 18) + ' ' + t('home.spring'));
    }
    for (const [to, x, y, dir] of z.exits) {
      const pr = WArt.prop('sign', dir);
      const e = this.addEnt({ type: 'exit', x, y, w: pr.w * 0.8, h: pr.h * 0.8, src: pr.url, foot: 4, shadow: false, interact: () => this.useExit(to), ap: [x + (dir ? 60 : -60), y + 10] });
      const name = to === '__back' ? t('home.back', { zone: t('zone.' + Game.s.loc.zone) }) : to === '__yard' ? t('zone.yard') : to === '__glade' ? t('home.glade') : t('zone.' + to);
      this.tag(e, (dir ? '◀ ' : '') + name + (dir ? '' : ' ▶'));
      // the orange "leave this way" arrow, pointing off-screen (not before the first catch: then the one
      // arrow on the meadow is the pointer over the tutorial Orbling)
      if (this.tut) continue;
      const ar = U.el('div', { class: 'exit-arrow ' + (dir ? 'l' : 'r') }, U.img(HudArt.arrow()));
      ar.style.left = (dir ? 64 : -150) + 'px'; ar.style.bottom = '-4px';
      e.el.appendChild(ar);
    }
  },
  buildNpcs() {
    for (const [id, x, y] of this.zone.npcs) {
      const T = TAMERS[id];
      const e = this.addEnt({ type: 'npc', x, y, w: 120, h: 170, src: WArt.person(tamerLook(id)), sw: 70, interact: () => this.talkNpc(id), npc: id, ap: [x + (x > 640 ? -95 : 95), y + 6], dyn: true });
      this.loadSprites(e, 'person', tamerLook(id), false);
      e.face = e.home = x > 640 ? -1 : 1; e.turn = e.face;
      e.lookT = U.rf(6, 12);
      if (T.guardian) e.scale = 1.12;
      this.tag(e, UI.whoName(id), T.guardian ? 'alpha' : '');
      this.npcMarker(e);
    }
  },
  npcMarker(e) {
    const id = e.npc, T = TAMERS[id];
    if (this.tut) { this.mark(e, null); return; } // the first catch comes first
    if (T.npc) { this.mark(e, '?', 'q'); return; }
    const beat = Base.storyBeat(id);
    if (beat === 'start' || beat === 'end') { this.mark(e, '?', 'q'); return; }
    if (T.guardian) {
      if (Game.beaten(id)) this.mark(e, null);
      else if (!Game.guardianOpen(T.guardian)) this.mark(e, `<img src="${HudArt.padlock()}">`, 'lock');
      else this.mark(e, '!', 'boss');
      return;
    }
    this.mark(e, Game.beaten(id) ? null : '!');
  },

  /* ---------------- wild orblings ---------------- */
  pickSpecies() {
    const asc = Game.ascendant();
    const here = sp => this.wilds.filter(w => (w.base || w.sp) === sp).length;
    const pool = this.zone.spawns.map(([sp, w]) => [sp, (SPECIES[sp].sign === asc ? w * 1.5 : w) / Math.pow(4, here(sp))]);
    return U.weighted(pool);
  },
  spawnWild(pop) {
    const z = this.zone;
    // rare Alpha: a tougher, higher-level Orbling with great potential (never before the first catch)
    const alpha = Game.s.flags.tutCatch && Math.random() < 0.04;
    const tw = this.tut ? this.wilds.find(w => w.tutorial) : null; // before the first catch: nothing like it next to it
    let base = this.pickSpecies();
    for (let i = 0; i < 8 && tw && base === (tw.base || tw.sp); i++) base = this.pickSpecies();
    const [sp, lv] = Game.wildForm(base, alpha ? z.lv[1] + 2 : U.ri(z.lv[0], z.lv[1]), alpha);
    const shiny = Math.random() < (this.night ? 2 : 1) / SHINY_ODDS;
    let x, y, tries = 0;
    const px = this.player ? this.player.x : z.start[0], py = this.player ? this.player.y : z.start[1];
    const bad = (x, y) => U.dist(x, y, px, py) < 220 || this.exclusions().some(([a, b]) => U.dist(a, b, x, y) < 110) || this.wilds.some(o => U.dist(o.x, o.y, x, y) < 120) || (tw && U.dist(x, y, tw.x, tw.y) < 340);
    do {
      x = U.rf(this.walk.x0 + 80, this.walk.x1 - 80); y = U.rf(this.walk.y0 + 20, this.walk.y1 - 30); tries++;
    } while (tries < 30 && bad(x, y));
    if (tw && bad(x, y)) return null; // before the first catch: better one Orbling fewer than one next to it or in your way
    const e = this.addWild(sp, lv, shiny, x, y, pop, alpha);
    e.base = base;
    if (alpha && pop) { Snd.play('notice'); UI.toast(WArt.icon('crown', 24) + ' ' + t('ex.alpha', { name: SPECIES[sp].name }), 'good'); }
    else if (sp === zoneRare(z.id) && !z.home && !this.tut) {
      e.el.classList.add('rarew');
      if (pop && !Game.caught(sp) && Game.s.flags.tutCatch) { Snd.play('notice'); UI.toast(`<i class="rdot r-${SPECIES[sp].rarity}"></i>` + t('ex.rare', { name: SPECIES[sp].name }), 'good'); }
    }
    return e;
  },
  addWild(sp, lv, shiny, x, y, pop, alpha, own, swim, k = 1) {
    const S = SPECIES[sp];
    const size = 150 * S.size * (alpha ? 1.15 : 1) * k, fl = MonArt.floats(sp) && !swim;
    const gait = swim ? 'swim' : MonArt.gait(sp);
    const base = { trot: [48, 72], hop: [55, 80], scuttle: [60, 90], skitter: [80, 110], slither: [36, 52], float: [34, 52], swim: [30, 44] }[gait];
    const e = this.addEnt({ type: 'wild', x, y, w: size, h: size, src: MonArt.url(sp, { shiny }), dyn: true, foot: swim ? Math.round(size * 0.4) : fl ? -18 : Math.round(size * 0.05), sw: size * 0.5, shadow: !swim, sp, lv, shiny, alpha: !!alpha, gait,
      tx: x, ty: y, state: 'idle', t: U.rf(0.4, 2.6), speed: U.rf(base[0], base[1]) * (alpha ? 0.85 : 1), ph: Math.random(), bob: 0, rot: 0, sx: 1, sy: 1, lift: fl ? 14 : 0 });
    if (swim) {
      // in the pond: the body is cut by the waterline (a still clip box around the moving sprite) and rings spread around it
      e.pond = true;
      e.el.classList.add('inpond');
      const clip = U.el('div', { class: 'wclip', style: { left: -size + 'px', top: -size * 2 + 'px', width: size * 2 + 'px', height: size * 2 + 'px' } });
      e.inner.style.left = size / 2 + 'px'; e.inner.style.top = (size + e.foot) + 'px';
      e.el.insertBefore(clip, e.inner); clip.appendChild(e.inner);
      const rw = size * 0.78;
      e.el.insertBefore(U.el('div', { class: 'ripples', style: { left: -rw / 2 + 'px', width: rw + 'px', top: -rw * 0.13 + 'px', height: rw * 0.26 + 'px' } }, U.el('i'), U.el('i'), U.el('b')), clip);
    }
    e.face = e.turn = Math.random() < 0.5 ? -1 : 1;
    e.interact = () => {
      if (this.busy) return;
      if (this.tut && !e.tutorial && !own && this.wilds.some(w => w.tutorial)) { Snd.play('select'); this.tutNudge('tut.first'); return; }
      this.chase = e; this.player.target = null;
    };
    e.el.classList.add('clickable');
    if (own) { e.own = own.id; e.team = Game.s.team.includes(own.id); e.el.classList.add('ownw'); }
    this.loadSprites(e, 'wild');
    e.labelEl = this.tag(e, (alpha ? WArt.icon('crown', 18) : signIcon(S.sign, 18)) + S.name + ` <small>${alpha ? t('b.alpha') + ' · ' : ''}${t('ui.lv')} ${lv}</small>` + (own && Game.s.team.includes(own.id) ? ` <i class="hl-team">★</i>` : ''), alpha ? 'alpha' : '');
    if (alpha) e.el.classList.add('alphaw');
    if (shiny) e.el.classList.add('shinyw');
    if (pop) {
      e.pop = 0.5;
      U.anim(e.imgEl, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)' }], { duration: 450 });
      Snd.play('pop');
    }
    this.wilds.push(e);
    return e;
  },
  /** your Orblings roam the glade: the team, then favourites, then the strongest in storage (Base.glade — workers
   *  stay in the yard, trainees spar on the Dojo mat) */
  spawnOwn() {
    const list = Base.glade();
    const W0 = this.walk, taken = [], ex = this.exclusions(), pond = this.zone.pond, fish = [];
    for (const m of list) {
      if (pond && SPECIES[m.sp].art.body === 'fish' && fish.length < 4) {
        let x, y, tries = 0;
        do { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.8; x = pond[0] + Math.cos(a) * r * pond[2]; y = pond[1] + Math.sin(a) * r * pond[3]; tries++; }
        while (tries < 30 && fish.some(([a, b]) => U.dist(a, b, x, y) < 70));
        fish.push([x, y]);
        const e = this.addWild(m.sp, m.lv, m.shiny, x, y, false, false, m, true);
        e.t = U.rf(0.5, 3);
        if (m.hp <= 0) { e.state = 'sleep'; e.t = 1e9; e.zT = U.rf(0, 1.5); }
        continue;
      }
      let x, y, tries = 0;
      do { x = U.rf(W0.x0 + 90, W0.x1 - 90); y = U.rf(W0.y0 + 40, W0.y1 - 40); tries++; }
      while (tries < 40 && (ex.some(([a, b]) => U.dist(a, b, x, y) < 130) || taken.some(([a, b]) => U.dist(a, b, x, y) < 110) || this.noGo(x, y) || U.dist(x, y, 1112, 652) < 190));
      taken.push([x, y]);
      const e = this.addWild(m.sp, m.lv, m.shiny, x, y, false, false, m);
      e.t = U.rf(0.5, 3);
      if (m.hp <= 0) { e.state = 'sleep'; e.t = 1e9; e.zT = U.rf(0, 1.5); }
    }
    this.spawnTrainees();
  },
  /** click one of your Orblings: it runs up happy; once a day petting gives it a little XP; a card offers more */
  petOwn(w) {
    const m = Game.mon(w.own);
    if (!m) return;
    if (m.hp <= 0) { this.emote(w, 'z', 'zz'); this.homeCard(w, m); return; } // fainted: sleeping until the spring heals it
    w.face = this.player.x > w.x ? 1 : -1;
    this.act(w, 'hop'); w.state = 'stare'; w.t = 2.5;
    this.emote(w, '♥', 'soft');
    Snd.play('pop');
    if (VFX.ok()) VFX.stars(w.x, w.y - this.headY(w) * depthScale(w.y) * 0.7, 8, ['#ff9ac8', '#ffd0e8', '#ffffff'], { spd: [60, 160] }); else UI.burst(w.x, w.y - 60, ['#ff9ac8', '#ffffff'], 10, 80);
    const r = Base.pet(m);
    if (r) {
      const y0 = w.y - this.headY(w, 30) * depthScale(w.y);
      if (r.xp) UI.float(w.x, y0, '+' + r.xp + ' XP', 'lvl');
      UI.float(w.x + 44, y0 - 30, '+♥', 'heart');
      if (r.r && r.r.levels.length) {
        Snd.play('levelup');
        UI.toast(t('b.lvl_bench', { name: SPECIES[m.sp].name, lv: m.lv }), 'good');
        if (Game.canEvolve(m)) UI.toast(WArt.icon('evolve', 22) + ' ' + t('home.can_evolve', { name: SPECIES[m.sp].name }), 'good');
      }
      if (r.up) UI.heartToast(m, r.up);
      Game.save();
    }
    this.homeCard(w, m);
  },
  homeCard(w, m) {
    this.closeHomeCard();
    const sp = SPECIES[m.sp], inTeam = Game.s.team.includes(m.id), mx = Game.maxHp(m), fr = U.clamp(m.hp / mx, 0, 1);
    const petted = Base.petted(m);
    const card = U.el('div', { class: 'home-card' },
      U.el('div', { class: 'hc-top' }, U.el('span', { html: signIcon(sp.sign, 26) + elIcon(sp.el, 26) }), U.el('b', { text: sp.name }), U.el('em', { text: t('ui.lv') + ' ' + m.lv }),
        U.el('button', { class: 'hc-fav snd' + (m.fav ? ' on' : ''), title: t('home.fav'), html: WArt.icon('star', 22), onclick: () => { m.fav = !m.fav; Game.save(); this.homeCard(w, m); } })),
      UI.bar(fr, UI.hpClass(fr)),
      U.el('div', { class: 'hc-hearts', html: UI.hearts(m) }),
      U.el('small', { text: (inTeam ? t('home.in_team') : t('home.in_box')) + ' · ' + (m.hp <= 0 ? t('home.fainted') : petted ? t('home.petted') : t('home.pet_hint')) }),
      U.el('div', { class: 'row tight' },
        U.el('button', { class: 'btn sm blue', text: t('home.details'), onclick: () => { this.closeHomeCard(); Menus.monDetail(m.id, () => this.refreshOwn()); } }),
        inTeam ? U.el('button', { class: 'btn sm' + (Game.s.team.length <= 1 ? ' off' : ''), text: t('md.tobox'), onclick: () => { if (Game.toBox(m.id)) { Snd.play('select'); Game.save(); UI.hudUpdate(); this.homeCard(w, m); } } })
          : U.el('button', { class: 'btn sm green', text: t('md.toteam'), onclick: () => Menus.toTeam(m, () => { Game.save(); UI.hudUpdate(); this.homeCard(w, m); }) })));
    const [x, y] = this.toScreen(w.x, w.y - this.headY(w) * depthScale(w.y) - 20);
    card.style.left = U.clamp(x - 150, 10, UI.W - 310) + 'px';
    card.style.top = U.clamp(y - 150, 70, UI.H - 200) + 'px';
    UI.scene.appendChild(card);
    this.hcard = card;
  },
  closeHomeCard() { if (this.hcard) { this.hcard.remove(); this.hcard = null; } },
  /** after the team changes elsewhere (details, release) the glade is re-populated */
  refreshOwn() {
    if (!this.home || UI.cur !== this) return;
    for (const w of this.wilds.slice()) if (!Game.mon(w.own)) this.removeEnt(w);
  },
  tutorialWild() {
    for (const w of this.wilds.slice()) this.removeEnt(w);
    const z = this.zone, P = this.player, [sx, sy] = P ? [P.x, P.y] : z.start, dir = sx < 640 ? 1 : -1, W0 = this.walk;
    // the first catch complements the starter (the same Orbling the Star Altar's falling star brings)
    const pick = tutorialWildFor(Game.team()[0].sp);
    // a clear spot near you, toward the middle of the meadow, never hidden behind the chest, an NPC or a small prop
    const ex = this.exclusions().filter(([a, b]) => a !== z.start[0] || b !== z.start[1]);
    const props = this.ents.filter(p => p.type === 'prop' && p.y > 460);
    const spots = [[sx + dir * 300, sy - 50], [sx + dir * 220, sy - 40], [sx + dir * 330, sy + 30], [sx + dir * 400, sy + 40], [sx + dir * 250, sy + 45], [sx + dir * 270, sy - 60]]
      .map(([x, y]) => [U.clamp(x, W0.x0 + 80, W0.x1 - 80), U.clamp(y, W0.y0 + 20, W0.y1 - 30)]);
    if (UI.portrait) spots.sort((a, b) => Math.abs(a[0] - sx) - Math.abs(b[0] - sx)); // the narrow screen shows you and it together only when it is close
    const [wx, wy] = spots.find(([x, y]) => ex.every(([a, b]) => U.dist(a, b, x, y) >= 120) && props.every(p => U.dist(p.x, p.y, x, y) >= 100)) || spots[0];
    this.markTut(this.addWild(pick, 2, false, wx, wy, false));
    // a couple of others keep the meadow alive: farther off and never its twin (see spawnWild)
    for (let i = 0; i < Math.min(2, this.zone.max - 1); i++) this.spawnWild(false);
  },

  /* ---------------- loop ---------------- */
  update(dt) {
    if (Platform.adActive) return;
    this.time += dt;
    const P = this.player;
    const kx = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0), ky = (this.keys.down ? 1 : 0) - (this.keys.up ? 1 : 0);
    const locked = this.busy || UI.anyModal() || UI.busyGo;
    let goal = null;
    if ((kx || ky) && !locked) {
      P.target = null; this.chase = null; this.onArrive = null;
      const l = Math.hypot(kx, ky);
      goal = [P.x + kx / l * 120, P.y + ky / l * 90];
    } else if (this.chase && !locked) {
      const w = this.chase;
      if (!this.wilds.includes(w)) this.chase = null;
      else {
        const side = P.x < w.x ? -1 : 1;
        goal = w.pond ? this.pondBank(P.x, P.y) : [U.clamp(w.x + side * 85, this.walk.x0, this.walk.x1), w.y + 4];
        if (U.dist(P.x, P.y, goal[0], goal[1]) < 14 || U.dist(P.x, P.y, w.x, w.y) < 96) { this.chase = null; goal = null; P.vx *= 0.3; P.vy *= 0.3; P.face = w.x > P.x ? 1 : -1; if (w.own) this.petOwn(w); else this.startWild(w); }
      }
    } else if (P.target && !locked) {
      const [tx, ty] = P.target;
      if (U.dist(P.x, P.y, tx, ty) < 5 && Math.hypot(P.vx, P.vy) < 40) {
        P.target = null;
        const cb = this.onArrive; this.onArrive = null;
        if (cb) cb();
      } else goal = P.target;
    }
    const x0 = P.x, y0 = P.y;
    this.steer(P, goal, dt, 270);
    this.applyCam(dt);
    const sp = Math.hypot(P.vx, P.vy);
    P.moving = sp > 26;
    if (P.moving) {
      const prev = P.cyc, stride = 100 * depthScale(P.y);
      P.cyc += Math.hypot(P.x - x0, (P.y - y0) * 1.25) / stride;
      // a puff of dust at each footfall (contact at 0 and ½ of the cycle)
      if (Math.floor(P.cyc * 2) !== Math.floor(prev * 2) && sp > 150) this.dust(P.x + P.face * 12, P.y);
      const k = Math.min(1, sp / 270);
      if (!P.spr || !P.spr.move) { P.ph += dt / 0.36; P.bob = -Math.abs(Math.sin(P.ph * Math.PI)) * 5 * k; } else P.bob = 0;
      P.rot = P.face * 1.5 * k;
    } else {
      P.bob *= 0.8; P.rot *= 0.8; if (P.cyc % 0.5 > 0.02) P.cyc = Math.round(P.cyc * 2) / 2;
      // standing: a slow breath
      const b = Math.sin(this.time * 2.1);
      P.sy = 1 + b * 0.012; P.sx = 1 - b * 0.008;
    }
    if (P.moving) { P.sx = 1; P.sy = 1; }

    for (const w of this.wilds) this.wildLife(w, dt, P, locked);
    if (this.home && (this.baseT = (this.baseT || 0) - dt) <= 0) { this.baseT = 3; this.refreshBase(); }
    if (this.wilds.length < (this.tut ? Math.min(3, this.zone.max) : this.zone.max) && !locked) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.spawnWild(true); this.spawnT = U.rf(3, 6); }
    }
    // the first catch: when the player just stands there for a while, Pip points again and the Orbling hops
    if (this.tut && !locked) {
      this.tutIdle = P.moving || this.chase ? 0 : this.tutIdle + dt;
      if (this.tutIdle > 12) this.tutNudge('tut.nudge');
    }
    // tamers keep an eye on you when you come close
    for (const e of this.ents) {
      if (e.type !== 'npc') continue;
      const d = U.dist(e.x, e.y, P.x, P.y);
      if (d < 260) e.face = P.x > e.x ? 1 : -1;
      else if ((e.lookT -= dt) <= 0) { e.lookT = U.rf(7, 14); e.face = e.face === e.home ? -e.home : e.home; }
    }
    if (!locked && !this.busy) { // re-check: the chase above may have just started a battle
      this.updateShards(dt);
      this.updateEmotes(dt);
      this.updateSky(dt);
    }
    // Pip drifts after the tamer and leans into the motion
    const pt = [P.x - P.face * 66, P.y - 124];
    const k = Math.min(1, dt * 3.2);
    const nx = this.pip.x + (pt[0] - this.pip.x) * k;
    this.pip.vx = (nx - this.pip.x) / Math.max(dt, 0.001);
    this.pip.x = nx; this.pip.y += (pt[1] - this.pip.y) * k;
    for (const e of this.ents) if (e.dyn) { this.spriteFrame(e, dt); this.place(e, false, dt); }
    this.pipEl.style.transform = `translate3d(${this.pip.x}px, ${this.pip.y}px, 0) scale(${depthScale(P.y)}) rotate(${U.clamp(this.pip.vx * 0.05, -14, 14)}deg)`;
    if (this.pipBub) this.placeBub();
    this.pipEl.style.zIndex = Math.round(P.y) + 1;
    this.pipEl.firstChild.style.transform = P.face < 0 ? 'scaleX(-1)' : '';
  },
  /** smooth, physical steering: accelerate toward the goal, ease into a stop (arrive), depth moves slower */
  steer(o, goal, dt, maxSp) {
    let wx = 0, wy = 0;
    if (goal) {
      const dx = goal[0] - o.x, dy = goal[1] - o.y, d = Math.hypot(dx, dy);
      if (d > 0.5) { const want = Math.min(maxSp, d * 5.5); wx = dx / d * want; wy = dy / d * want * 0.78; }
    }
    const k = Math.min(1, dt * (goal ? 9 : 12));
    o.vx += (wx - o.vx) * k; o.vy += (wy - o.vy) * k;
    if (!goal && Math.hypot(o.vx, o.vy) < 6) { o.vx = 0; o.vy = 0; }
    o.x = U.clamp(o.x + o.vx * dt, this.walk.x0, this.walk.x1); o.y = U.clamp(o.y + o.vy * dt, this.walk.y0, this.walk.y1);
    const out = this.noGo(o.x, o.y);
    if (out) { o.x = out[0]; o.y = out[1]; }
    if (Math.abs(o.vx) > 22) o.face = o.vx > 0 ? 1 : -1;
  },

  /* ---------------- the life of a wild Orbling ---------------- */
  wildLife(w, dt, P, locked) {
    if (w.pop > 0) { w.pop -= dt; return; }
    if (w.post) { // a trainee sparring on the Dojo mat or a worker at a workshop: busy at its post
      w.face = w.post.face; this.gaitIdle(w, dt); w.t -= dt;
      if (w.t <= 0 && !w.act) { this.act(w, w.post.act); w.t = w.post.spar ? U.rf(0.6, 1.3) : U.rf(1.8, 3.4); }
      this.doAct(w, dt);
      return;
    }
    const d = U.dist(P.x, P.y, w.x, w.y);
    if (this.chase === w) {
      if (w.pond) {
        const b = this.pondBank(P.x, P.y), [gx, gy] = this.inPond(b[0], b[1], 0.8), dx = gx - w.x, dy = gy - w.y, dd = Math.hypot(dx, dy);
        if (dd > 6) { const st = Math.min(dd, w.speed * 1.6 * dt); w.x += dx / dd * st; w.y += dy / dd * st; if (Math.abs(dx) > 3) w.face = dx > 0 ? 1 : -1; w.state = 'idle'; w.t = 1; this.gaitMove(w, dt); this.doAct(w, dt); return; }
      }
      w.state = 'idle'; w.t = 1; w.face = P.x > w.x ? 1 : -1; this.gaitIdle(w, dt); return;
    }
    if (w.hold) { w.face = P.x > w.x ? 1 : -1; this.gaitIdle(w, dt); if (Math.random() < dt * 0.25) this.act(w, 'hop'); this.doAct(w, dt); return; }
    // notice the tamer: turn, a startled hop, "!" — then a curious stare
    if (!locked && d < 170 && !w.noticed && w.state !== 'sleep') {
      w.noticed = true; w.face = P.x > w.x ? 1 : -1;
      if (w.own) { if (Math.random() < 0.6) { this.emote(w, U.pick(['♥', '♪']), 'soft'); this.act(w, 'hop'); } }
      else { this.emote(w, '!', 'red'); this.act(w, 'hop'); }
      w.state = 'stare'; w.t = U.rf(1.2, 2.2);
    } else if (d > 260) w.noticed = false;
    w.t -= dt;
    switch (w.state) {
      case 'walk': {
        const dx = w.tx - w.x, dy = w.ty - w.y, dd = Math.hypot(dx, dy);
        if (dd < 4) {
          w.state = 'idle'; w.t = U.rf(1, 3.5);
          const b = w.buddy; w.buddy = null;
          if (b && this.wilds.includes(b) && U.dist(b.x, b.y, w.x, w.y) < 140) {
            w.face = b.x > w.x ? 1 : -1; b.face = -w.face; b.state = 'idle'; b.t = Math.max(b.t, 1.5); w.t = U.rf(2, 3.5);
            const ch = U.pick(['♥', '♪', '♥', '…']);
            this.emote(w, ch, 'soft'); setTimeout(() => { if (this.wilds.includes(b)) { this.emote(b, U.pick(['♥', '♪']), 'soft'); this.act(b, 'hop'); } }, 450);
          }
          break;
        }
        let v = w.speed;
        if (w.gait === 'hop') { const p = w.ph % 1; v *= p >= 0.12 && p < 0.8 ? 1.5 : 0; } // moves only while airborne
        const step = Math.min(dd, v * dt);
        w.x += dx / dd * step; w.y += dy / dd * step * 0.8;
        if (!w.pond) { const out = this.noGo(w.x, w.y); if (out) { w.x = out[0]; w.y = out[1]; w.t = Math.min(w.t, 1.2); } }
        if (w.t <= 0) { w.state = 'idle'; w.t = U.rf(1, 2); w.buddy = null; break; }
        if (Math.abs(dx) > 3 && w.gait !== 'scuttle') w.face = dx > 0 ? 1 : -1;
        this.gaitMove(w, dt);
        break;
      }
      case 'stare':
        w.face = P.x > w.x ? 1 : -1;
        this.gaitIdle(w, dt);
        if (w.t <= 0) {
          // curious ones step a little closer, shy ones wander off
          if (Math.random() < 0.5 && d > 150) this.walkTo2(w, w.x + (P.x - w.x) * 0.3, w.y + (P.y - w.y) * 0.3);
          else this.wander(w, P);
        }
        break;
      case 'sleep':
        this.gaitIdle(w, dt, 0.35);
        if ((w.zT = (w.zT || 0) - dt) <= 0) { w.zT = 1.6; this.emote(w, 'z', 'zz'); }
        if (w.t <= 0 || (d < 120 && w.t < 1e8)) { w.state = 'idle'; w.t = 0.6; if (d < 120) this.act(w, 'hop'); }
        break;
      default: // idle
        this.gaitIdle(w, dt);
        if (w.t <= 0 && !w.act) {
          const r = Math.random();
          if (r < 0.46) this.wander(w, P);
          else if (r < 0.58) { this.act(w, 'look'); w.t = U.rf(1, 2); }
          else if (r < 0.68 && w.gait !== 'float') { this.act(w, 'hop'); w.t = U.rf(0.8, 1.6); }
          else if (r < 0.78 && w.gait !== 'float' && w.gait !== 'swim') { this.act(w, 'sit'); w.t = U.rf(1.8, 3); }
          else if (r < 0.88) { this.act(w, 'sniff'); w.t = U.rf(1, 1.8); }
          else if (r < 0.96 || w.tutorial) { this.act(w, 'wiggle'); w.t = U.rf(0.8, 1.4); }
          else if (d > 300) { w.state = 'sleep'; w.t = U.rf(6, 10); w.zT = 0.3; }
          else w.t = 1;
        }
    }
    this.doAct(w, dt);
  },
  wander(w, P) {
    if (w.pond) {
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()), [cx, cy, rx, ry] = this.zone.pond;
        const tx = cx + Math.cos(a) * r * rx, ty = cy + Math.sin(a) * r * ry;
        if (U.dist(tx, ty, w.x, w.y) < 40 || this.wilds.some(o => o !== w && o.pond && U.dist(o.tx, o.ty, tx, ty) < 60)) continue;
        this.walkTo2(w, tx, ty);
        return;
      }
      w.state = 'idle'; w.t = U.rf(1, 2);
      return;
    }
    const ex = this.exclusions(), tw = this.tut ? this.wilds.find(o => o.tutorial && o !== w) : null;
    const pals = w.own ? this.wilds.filter(o => o !== w && o.own && o.state !== 'sleep' && !o.pond) : [];
    const buddy = pals.length && Math.random() < 0.35 ? U.pick(pals) : null;
    for (let i = 0; i < 8; i++) {
      let tx = w.x + U.rf(-220, 220), ty = w.y + U.rf(-90, 90);
      if (buddy) { tx = buddy.x + (buddy.x > w.x ? -1 : 1) * U.rf(70, 100); ty = buddy.y + U.rf(-15, 15); }
      tx = U.clamp(tx, this.walk.x0 + 60, this.walk.x1 - 60); ty = U.clamp(ty, this.walk.y0 + 15, this.walk.y1 - 20);
      if (this.noGo(tx, ty) || ex.some(([a, b]) => U.dist(a, b, tx, ty) < 95) || (!buddy && this.wilds.some(o => o !== w && U.dist(o.tx, o.ty, tx, ty) < 110)) || U.dist(tx, ty, P.x, P.y) < 110 || (tw && U.dist(tx, ty, tw.x, tw.y) < 260)) continue;
      w.buddy = buddy;
      this.walkTo2(w, tx, ty);
      return;
    }
    w.state = 'idle'; w.t = U.rf(1, 2);
  },
  walkTo2(w, tx, ty) {
    if (w.pond) [w.tx, w.ty] = this.inPond(tx, ty);
    else { w.tx = U.clamp(tx, this.walk.x0 + 60, this.walk.x1 - 60); w.ty = U.clamp(ty, this.walk.y0 + 15, this.walk.y1 - 20); }
    if (w.gait === 'hop' && w.state !== 'walk') w.ph = Math.ceil(w.ph); // every trip starts with a crouch
    w.state = 'walk'; w.t = 8;
  },
  /** gait while travelling: the body bobs, tilts and squashes in the rhythm of its kind */
  gaitMove(w, dt) {
    const T = Math.PI * 2;
    switch (w.gait) {
      case 'hop': {
        w.ph += dt / 0.62;
        const p = w.ph % 1;
        w.hopP = p;
        if (p < 0.12) { const q = Math.sin(p / 0.12 * Math.PI / 2); w.bob = 0; w.sy = 1 - 0.14 * q; w.sx = 1 + 0.1 * q; w.rot = 0; }            // crouch (anticipation)
        else if (p < 0.8) { const q = (p - 0.12) / 0.68, st = Math.max(0, 1 - q * 3); w.bob = -Math.sin(q * Math.PI) * (16 + w.w * 0.06); w.sy = 1 + 0.12 * st; w.sx = 1 - 0.08 * st; w.rot = w.face * -5 * Math.cos(q * Math.PI); } // airborne: stretch at take-off
        else { const q = Math.sin((p - 0.8) / 0.2 * Math.PI); w.bob = 0; w.sy = 1 - 0.16 * q; w.sx = 1 + 0.12 * q; w.rot = 0; }                   // landing squash
        break;
      }
      case 'trot': w.ph += dt * 3.1; w.bob = -Math.abs(Math.sin(w.ph * Math.PI)) * 3.5; w.rot = Math.sin(w.ph * T * 0.5) * 2; w.sx = 1; w.sy = 1 + Math.abs(Math.sin(w.ph * Math.PI)) * 0.03; w.cyc = w.ph * 0.5; break;
      case 'scuttle': w.ph += dt * 6; w.bob = -Math.abs(Math.sin(w.ph * Math.PI)) * 2.5; w.rot = Math.sin(w.ph * Math.PI) * 4; w.sx = 1; w.sy = 1; w.cyc = w.ph * 0.5; break;
      case 'skitter': w.ph += dt * 7; w.bob = -Math.abs(Math.sin(w.ph * Math.PI)) * 2; w.rot = Math.sin(w.ph * T) * 1.5; w.sx = 1.02; w.sy = 0.98; w.cyc = w.ph * 0.5; break;
      case 'slither': w.ph += dt * 1.8; w.cyc = w.ph * 0.9; w.sx = 1 + 0.04 * Math.sin(w.ph * T); w.sy = 1 - 0.03 * Math.sin(w.ph * T); w.rot = Math.sin(w.ph * T + 1) * 1.5; w.bob = 0; break;
      case 'swim': w.ph += dt * 0.8; w.cyc = (w.cyc || 0) + dt * 1.8; w.bob = Math.sin(w.ph * T) * 2.5; w.rot = w.face * 3 + Math.sin(w.ph * T * 0.5) * 2; w.sx = 1; w.sy = 1; break;
      case 'float': w.ph += dt * 0.42; w.cyc = (w.cyc || 0) + dt * 1.6; w.bob = -w.lift - Math.sin(w.ph * T) * 7; w.rot = w.face * 7; w.sx = 1; w.sy = 1; break;
    }
    w.moving = true;
  },
  /** at rest: breathing (slow squash), floating things keep hovering; `k` slows it for sleep */
  gaitIdle(w, dt, k = 1) {
    w.ph += dt * 0.42 * k;
    const b = Math.sin(w.ph * Math.PI * 2);
    const ease = Math.min(1, dt * 8);
    if (w.gait === 'swim') { w.bob += (b * 3 - w.bob) * ease; w.rot += (Math.cos(w.ph * Math.PI) * 2.5 - w.rot) * ease; w.sx = 1; w.sy = 1; }
    else if (w.gait === 'float') { w.bob += (-w.lift - b * 7 - w.bob) * ease; w.rot += (b * 2 - w.rot) * ease; w.sx = 1; w.sy = 1; }
    else { w.bob += (0 - w.bob) * ease; w.rot += (0 - w.rot) * ease; w.sy = 1 + b * 0.025 * k; w.sx = 1 - b * 0.018 * k; }
    w.moving = false;
  },
  /** little idle acts layered over the base pose */
  act(w, kind) { w.act = kind; w.actT = 0; if (kind === 'look') w.face = -w.face; if (w.pond && kind === 'hop') { this.splash(w); setTimeout(() => { if (this.wilds.includes(w)) this.splash(w); }, 520); } },
  /** the act's offsets are computed fresh every frame on top of the gait's base pose (never accumulated) */
  doAct(w, dt) {
    w.ab = 0; w.ar = 0; w.ax = 1; w.ay = 1;
    if (!w.act) return;
    w.actT += dt;
    const t2 = w.actT;
    switch (w.act) {
      case 'hop': { const dur = w.pond ? 0.56 : 0.42; if (t2 >= dur) { w.act = null; break; } const q = Math.sin(t2 / dur * Math.PI); w.ab = -q * (w.pond ? 40 : 22); if (w.pond) w.ar = w.face * (t2 / dur - 0.5) * 30; w.ay = 1 + 0.12 * q; w.ax = 1 - 0.08 * q; break; }
      case 'sit': { const dur = 2.2; if (t2 >= dur) { w.act = null; break; } const q = Math.max(0, Math.min(1, t2 / 0.2, (dur - t2) / 0.25)); w.ay = 1 - 0.1 * q; w.ax = 1 + 0.06 * q; break; }
      case 'sniff': { const dur = 1.1; if (t2 >= dur) { w.act = null; break; } const env = Math.sin(t2 / dur * Math.PI); w.ar = Math.sin(t2 * 22) * 4 * env + w.face * 8 * env; break; }
      case 'wiggle': { const dur = 0.9; if (t2 >= dur) { w.act = null; break; } w.ar = Math.sin(t2 * 26) * 7 * (1 - t2 / dur); break; }
      case 'look': if (t2 >= 0.3) w.act = null; break;
      default: w.act = null;
    }
  },
  /** a puff of dust kicked up by a footstep */
  dust(x, y) {
    const d = U.el('i', { class: 'dust' });
    d.style.left = x.toFixed(1) + 'px'; d.style.top = y.toFixed(1) + 'px'; // (not a transform: the puff's own scale would scale the position too)
    d.style.zIndex = Math.round(y) - 1;
    this.world.appendChild(d);
    setTimeout(() => d.remove(), 520);
  },

  /* ---------------- star shards: sparkling pickups that respawn around the zone ---------------- */
  updateShards(dt) {
    if (!Game.s.flags.tutCatch || this.home) return;
    if (this.shards.length < 2) {
      this.shardT -= dt;
      if (this.shardT <= 0) { this.spawnShard(); this.shardT = U.rf(22, 45); }
    }
    const P = this.player;
    for (const s of this.shards.slice()) if (U.dist(P.x, P.y, s.x, s.y) < 48) this.collectShard(s);
  },
  spawnShard() {
    let x, y, tries = 0;
    const P = this.player;
    do { x = U.rf(this.walk.x0 + 60, this.walk.x1 - 60); y = U.rf(this.walk.y0 + 20, this.walk.y1 - 20); tries++; }
    while (tries < 30 && (U.dist(x, y, P.x, P.y) < 180 || this.exclusions().some(([a, b]) => U.dist(a, b, x, y) < 100) || this.shards.some(o => U.dist(o.x, o.y, x, y) < 200)));
    const e = this.addEnt({ type: 'shard', x, y, w: 46, h: 46, src: WArt.item('shard'), foot: -14, sw: 30, interact: () => {}, ap: [x, y] });
    this.place(e);
    U.anim(e.inner, [{ transform: 'scale(0) rotate(-90deg)', opacity: 0 }, { transform: 'scale(1.2) rotate(10deg)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)' }], { duration: 500 });
    this.shards.push(e);
  },
  collectShard(s) {
    this.shards = this.shards.filter(x => x !== s);
    this.removeEnt(s);
    const coins = 4 + Math.round(this.zone.lv[1] * 0.6) + U.ri(0, 4);
    Game.addCoins(coins);
    Game.s.stats.shards++;
    const orb = Math.random() < 0.08;
    if (orb) Game.addItem('orb', 1);
    Snd.play('shard');
    UI.burst(s.x, s.y - 30, ['#fff6a0', '#ffffff', '#ffd23f'], 12, 90);
    UI.float(s.x, s.y - 60, '+' + coins, 'info');
    UI.flyTo(s.x, s.y - 30, '.r-coins', WArt.item('coin'), 4);
    if (orb) UI.toast(`<img src="${WArt.item('orb')}"> +1 ${t('it.orb')}`, 'good');
    UI.hudUpdate();
    // quests like "collect 5 shards" and medals complete right away (unless a battle is starting)
    if (!this.busy && !UI.busyGo) UI.checkQuests();
  },
  /* ---------------- wild Orblings chat among themselves now and then ---------------- */
  updateEmotes(dt) {
    this.emoteT -= dt;
    if (this.emoteT <= 0 && this.wilds.length) {
      this.emoteT = U.rf(3.5, 7);
      const w = U.pick(this.wilds);
      if (!w.noticed && !w.tutorial && w.state !== 'sleep') this.emote(w, U.pick(['…', '♪', '♥', '?', '…']), 'soft');
    }
  },
  /* ---------------- a shooting star now and then, where a night sky is open overhead ---------------- */
  updateSky(dt) {
    if (this.tod !== 'night' || !NIGHT_SKY.includes(this.zone.biome) || (this.meteorT -= dt) > 0) return;
    this.meteorT = U.rf(12, 26);
    const m = U.el('i', { class: 'shoot' });
    m.style.left = U.rf(80, 900) + 'px'; m.style.top = U.rf(24, 150) + 'px';
    this.amb.appendChild(m);
    setTimeout(() => m.remove(), 1300);
  },
  emote(e, ch, cls) {
    if (e.emoteEl) e.emoteEl.remove();
    const b = U.el('div', { class: 'emote ' + cls, text: ch });
    b.style.bottom = this.headY(e, 12) + 'px';
    b.style.left = (e.w * 0.18) + 'px';
    e.el.appendChild(b);
    e.emoteEl = b;
    setTimeout(() => { if (e.emoteEl === b) { b.remove(); e.emoteEl = null; } }, 1300);
  },
  place(e, init, dt = 0) {
    // paper-cut-out turn: the sprite narrows to a sliver and widens facing the other way
    if (init) e.turn = e.face;
    else if (e.turn !== e.face) { const s = Math.sign(e.face - e.turn); e.turn += s * dt * (e.type === 'wild' ? 16 : 11); if (Math.sign(e.face - e.turn) !== s) e.turn = e.face; }
    const s = depthScale(e.y) * (e.scale || 1);
    e.el.style.transform = `translate3d(${e.x.toFixed(1)}px, ${e.y.toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
    e.el.style.zIndex = Math.round(e.y);
    const tx = Math.abs(e.turn) < 0.06 ? 0.06 * Math.sign(e.turn || 1) : e.turn;
    if (e.type === 'wild' || e.type === 'player') {
      const bob = (e.bob || 0) + (e.ab || 0), rot = (e.rot || 0) + (e.ar || 0), sx = (e.sx || 1) * (e.ax || 1), sy = (e.sy || 1) * (e.ay || 1);
      e.inner.style.transform = `translateY(${bob.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
      if (e.tutEl) e.tutEl.style.translate = '0 ' + Math.min(0, e.ab || 0).toFixed(1) + 'px'; // the pointer rides its hops
      if (e.shadowEl) { const h = Math.max(0, -bob - (e.lift || 0)); e.shadowEl.style.transform = `scale(${(1 - Math.min(0.45, h / 60)).toFixed(3)})`; e.shadowEl.style.opacity = (1 - Math.min(0.5, h / 70)).toFixed(2); }
    }
    const f = `scaleX(${tx.toFixed(3)})`;
    if (e._f !== f) { e.imgEl.style.transform = f; e._f = f; }
  },

  /* ---------------- input ---------------- */
  onDown(e) {
    if (this.busy || UI.anyModal() || UI.busyGo || Platform.adActive) return;
    if (e.target.closest('#hud .hud-el')) return;
    const entEl = e.target.closest('.ent.clickable');
    if (entEl) {
      const ent = this.byId[entEl.dataset.id];
      if (ent && ent.interact) {
        this.chase = null;
        if (ent.type === 'wild') { ent.interact(); return; }
        const [ax, ay] = ent.ap || [ent.x, ent.y + 20];
        this.walkTo(U.clamp(ax, this.walk.x0, this.walk.x1), U.clamp(ay, this.walk.y0, this.walk.y1), () => { this.player.face = ent.x > this.player.x ? 1 : -1; ent.interact(); });
        return;
      }
    }
    if (e.target.closest('.home-card')) return;
    this.closeHomeCard();
    const [gx, gy] = this.toWorld(...UI.toGame(e.clientX, e.clientY));
    if (gy < this.walk.y0 - 40) return;
    let tx = U.clamp(gx, this.walk.x0, this.walk.x1), ty = U.clamp(gy, this.walk.y0, this.walk.y1);
    const rim = this.noGo(tx, ty);
    if (rim) [tx, ty] = rim;
    this.walkTo(tx, ty, null);
    this.marker.style.left = tx + 'px'; this.marker.style.top = ty + 'px';
    this.marker.classList.remove('go'); void this.marker.offsetWidth; this.marker.classList.add('go');
  },
  onHover(e) {
    const entEl = e.target.closest && e.target.closest('.ent.clickable');
    if (this._hov && this._hov !== entEl) this._hov.classList.remove('hov');
    if (entEl) entEl.classList.add('hov');
    this._hov = entEl;
  },
  walkTo(x, y, cb) { this.chase = null; this.player.target = [x, y]; this.onArrive = cb; },
  /** walk over to a tamer and talk (from the portraits on the left) */
  goTalk(id) {
    if (this.busy || UI.anyModal()) return;
    const e = this.ents.find(x => x.npc === id);
    if (!e) return;
    const [ax, ay] = e.ap;
    this.walkTo(U.clamp(ax, this.walk.x0, this.walk.x1), U.clamp(ay, this.walk.y0, this.walk.y1), () => { this.player.face = e.x > this.player.x ? 1 : -1; e.interact(); });
  },
  onKey(e, down) {
    const map = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down' };
    const tag = e.target && e.target.tagName;
    if (down && (tag === 'INPUT' || tag === 'TEXTAREA' || UI.stack.length)) { this.keys = {}; return; } // a menu or a text field has the keyboard
    if (map[e.key]) { this.keys[map[e.key]] = down; e.preventDefault(); }
    if (down && [' ', 'Enter', 'e', 'E'].includes(e.key) && !e.repeat) {
      e.preventDefault();
      if (this.busy || UI.anyModal() || Platform.adActive) return;
      let best = null, bd = 150;
      for (const en of this.ents) {
        if (!en.interact) continue;
        const d = U.dist(en.x, en.y, this.player.x, this.player.y);
        if (d < bd) { bd = d; best = en; }
      }
      if (best) best.interact();
    }
  },

  /* ---------------- interactions ---------------- */
  saveState(fightW) {
    this.saved = {
      zone: this.zone.id, px: this.player.x, py: this.player.y, fighting: fightW ? fightW.id : null,
      wilds: this.wilds.map(w => ({ id: w.id, sp: w.sp, base: w.base, lv: w.lv, shiny: w.shiny, alpha: w.alpha, x: w.x, y: w.y, tutorial: !!w.tutorial })),
    };
  },
  async startWild(w) {
    if (this.busy) return;
    if (!Game.teamAlive()) { this.busy = true; await UI.talk([{ who: 'pip', text: t('pip.needheal') }]); this.busy = false; return; }
    this.busy = true;
    const mon = Game.makeMon(w.sp, w.lv, { shiny: w.shiny, potMin: w.alpha ? 1.02 : 0 });
    this.saveState(w);
    if (w.tutEl) w.tutEl.classList.add('out');
    Snd.play('pop');
    await this.encounterFx(w);
    UI.go(BattleScene, { kind: 'wild', enemies: [mon], zone: this.zone.id, tutorial: !!w.tutorial, alpha: w.alpha, visitor: !!w.visitor }, { trans: 'battle' });
  },
  async encounterFx(w) {
    const fl = U.el('div', { class: 'encounter' });
    fl.style.left = w.x + 'px'; fl.style.top = (w.y - 60) + 'px';
    UI.fx.appendChild(fl);
    this.emote(w, '!', 'red');
    U.anim(w.imgEl, [{ transform: w._f || 'none' }, { transform: (w._f || '') + ' scale(1.25) translateY(-14px)' }, { transform: w._f || 'none' }], { duration: 380 });
    await U.sleep(420);
    fl.remove();
  },
  async talkNpc(id) {
    if (this.busy) return;
    this.busy = true;
    try {
      if (this.tut && this.wilds.some(w => w.tutorial)) { await UI.talk([{ who: id, text: t(id === 'prof' ? 'tut.prof' : 'tut.later') }]); this.tutNudge(); return; }
      if (id === 'prof') { await this.profTalk(); return; }
      const T = TAMERS[id], beat = Base.storyBeat(id);
      if (beat === 'start' || beat === 'end') { await this.storyTalk(id, beat); return; }
      if (T.guardian && !Game.guardianOpen(T.guardian)) {
        const [a, b] = Game.isleTamersBeaten(T.guardian);
        await UI.talk([{ who: id, text: t('g.locked', { a, b }) }]);
        return;
      }
      if (!Game.teamAlive()) { await UI.talk([{ who: 'pip', text: t('pip.needheal') }]); return; }
      const beaten = Game.beaten(id);
      if (beaten) {
        if (beat === 'wait') await UI.talk([{ who: id, text: t('st.' + Base.storyOf(id).id + '.w') }]);
        const ok = await UI.confirm(t('tm.rematch', { name: UI.whoName(id) }), t('ui.battle'), t('ui.later'));
        if (!ok) return;
      } else await UI.talk(this.tamerLines(id, 'i'));
      this.saveState();
      const bonus = beaten ? 2 + Math.min(6, Game.s.beaten[id]) : 0;
      const enemies = T.team.map(([sp, lv]) => Game.makeMon(sp, lv + bonus, { noShiny: true }));
      this.busy = true;
      UI.go(BattleScene, { kind: T.guardian ? 'guardian' : 'tamer', tamer: id, enemies, zone: this.zone.id, rematch: beaten }, { trans: 'battle' });
      return;
    } finally {
      if (UI.cur === this && !UI.busyGo) this.busy = false;
    }
  },
  tamerLines(id, kind) {
    const T = TAMERS[id];
    if (T.guardian) return [{ who: id, text: t('g.' + T.guardian + '.' + kind) }];
    if (T.champ) return [{ who: id, text: t('arc.' + T.arena + '.' + kind) }];
    if (T.arena) return [{ who: id, text: t('arl.' + kind + (U.hash(id + kind) % 4)) }];
    if (T.cls === 'grunt' || T.cls === 'admin') return [{ who: id, text: t('tl.grunt.' + kind + (U.hash(id) % 3)) }];
    return [{ who: id, text: t('tl.' + kind + (U.hash(id + kind) % 8)) }];
  },
  async profTalk() {
    const tips = ['prof.tip1', 'prof.tip2', 'prof.tip3', 'prof.tip4', 'prof.tip5'];
    await UI.talk([{ who: 'prof', text: t(U.pick(tips)) }]);
    const ok = await UI.confirm(t('prof.chart'), t('ui.show'), t('ui.later'));
    if (ok) Menus.typeChart();
  },
  async usePod() {
    if (this.busy) return;
    this.busy = true;
    Game.healAll();
    if (this.home) for (const w of this.wilds) if (w.state === 'sleep' && w.t > 1e8) { w.state = 'idle'; w.t = U.rf(0.3, 1.2); this.act(w, 'hop'); this.emote(w, '♥', 'soft'); }
    Snd.play('heal');
    const pod = this.ents.find(e => e.type === 'pod');
    if (pod) {
      U.anim(pod.inner, [{ filter: 'brightness(1)' }, { filter: 'brightness(1.6) drop-shadow(0 0 20px #8fffc8)' }, { filter: 'brightness(1)' }], { duration: 900 });
      UI.burst(pod.x, pod.y - 80, ['#8fffc8', '#ffffff', '#4cd98a'], 16, 120);
    }
    UI.hudUpdate();
    UI.toast(WArt.icon('heal', 24) + ' ' + t('ex.healed'), 'good');
    Game.save();
    await U.sleep(400);
    this.busy = false;
  },
  async openChest(e) {
    if (this.busy) return;
    const last = Game.s.chests[this.zone.id] || 0;
    const wait = 4 * 3600e3 - (Date.now() - last);
    if (wait > 0) { UI.toast(t('ex.chest_empty', { time: U.fmtTime(wait) })); return; }
    this.busy = true;
    Game.s.chests[this.zone.id] = Date.now();
    e.imgEl.src = WArt.prop('chest', 1).url;
    e.el.classList.remove('glint');
    Snd.play('chest');
    UI.burst(e.x, e.y - 40, ['#ffe066', '#ffffff', '#ffb13b'], 18, 130);
    const lv = this.zone.lv[1];
    const r = { coins: 20 + lv * 5 + U.ri(0, 15), orb: U.ri(1, 2) };
    if (Math.random() < 0.35) r.potion = 1;
    if (Math.random() < 0.15) r.candy = 1;
    else if (Math.random() < 0.07) r['egg_' + U.pick(EL_ORDER)] = 1;
    Game.grant(r);
    UI.hudUpdate();
    await UI.rewards(t('ex.chest'), r);
    Game.save();
    this.busy = false;
  },
  useExit(to) {
    if (this.busy) return;
    this.busy = true;
    this.saved = null;
    if (to === '__back') { UI.go(ExploreScene, { zone: Game.s.loc.zone }); return; }
    if (to === '__yard' || to === '__glade') { UI.go(ExploreScene, { home: to === '__yard' ? 'yard' : 'glade', from: to === '__yard' ? '__glade' : '__yard' }); return; }
    UI.go(ExploreScene, { zone: to, from: this.zone.id });
  },
  openGalaxy() {
    if (this.busy && UI.cur === this) return;
    this.busy = true;
    if (!this.home) this.saveState();
    UI.go(GalaxyScene, { isle: this.home ? ZONES[Game.s.loc.zone].isle : this.zone.isle });
  },
  /** the base: from anywhere (explore, the map) */
  goHome() {
    if (UI.busyGo) return;
    if (UI.cur === ExploreScene) { if (this.busy) return; if (this.home) { Menus.camp(null, () => this.refreshBase()); return; } this.busy = true; this.saveState(); }
    Snd.play('warp');
    UI.go(ExploreScene, { home: true });
  },
  async useObservatory() {
    if (this.busy) return;
    if (!Game.finished()) { this.busy = true; await UI.talk([{ who: 'pip', text: t('obs.locked') }]); this.busy = false; return; }
    Menus.observatory();
  },

  /* ---------------- the Base (3.0) ---------------- */
  /** the Base's furniture: decorations on their spots (both areas); the workshops and Bruno's stall (the yard);
   *  the real eggs on the Hatchery's nest (the glade) */
  buildBase() {
    Camp.cleanup(); Base.cleanup();
    this.decoEnts = []; this.eggEls = []; this.wsEnts = {};
    this.buildDecor();
    if (this.area === 'yard') {
      for (const W of WORKSHOPS) this.buildWorkshop(W);
      const [sx, sy] = this.zone.stall, pr = WArt.prop('stall');
      const st = this.addEnt({ type: 'obj', x: sx, y: sy, w: pr.w * 0.8, h: pr.h * 0.8, src: pr.url, foot: 4, sw: 150, interact: () => this.talkBruno(), ap: [sx + 70, sy + 74] });
      this.tag(st, WArt.icon('hammer', 18) + ' ' + t('yard.stall'));
      const [bx, by] = this.zone.bruno, look = tamerLook('bruno');
      const e = this.addEnt({ type: 'npc', x: bx, y: by, w: 120, h: 170, src: WArt.person(look), sw: 70, interact: () => this.talkBruno(), npc: 'bruno', ap: [bx + 90, by + 8], dyn: true });
      this.loadSprites(e, 'person', look, false);
      e.face = e.home = 1; e.turn = 1; e.lookT = U.rf(6, 12);
      this.tag(e, UI.whoName('bruno'));
    }
    this.refreshBase();
  },
  buildDecor() {
    for (const e of this.decoEnts) this.removeEnt(e);
    this.decoEnts = [];
    (DECOR_SPOTS[this.area] || []).forEach(([x, y], i) => {
      const id = Base.at(this.area, i), ap = [x + (x > 640 ? -84 : 84), y + 16];
      let e;
      if (id) {
        const [type, v, sc] = DECOR_ART[id] || [id, 0, 1], pr = WArt.prop(type, v), k = (sc || 1) * 0.9;
        e = this.addEnt({ type: 'deco', x, y, w: pr.w * k, h: pr.h * k, src: pr.url, foot: 4, sw: pr.w * k * 0.6, interact: () => this.useSpot(i), ap });
        this.tag(e, t('dc.' + id));
        if (id === 'balloon') e.el.classList.add('bob');
        if (id === 'pinwheel') e.el.classList.add('sway');
      } else {
        e = this.addEnt({ type: 'deco', x, y, w: 92, h: 46, src: WArt.spotMark(), foot: 22, shadow: false, interact: () => this.useSpot(i), ap });
        e.el.classList.add('deco-spot');
        this.tag(e, WArt.icon('hammer', 16) + ' ' + t('dc.spot'));
      }
      this.decoEnts.push(e);
    });
  },
  useSpot(i) { if (!this.busy) Menus.decorSpot(this.area, i, () => this.buildDecor()); },
  /** a workshop: built (its art, the worker at its post and a bubble with what is ready) or a building site */
  buildWorkshop(W) {
    const old = this.wsEnts[W.id];
    if (old) for (const e of [old.e, old.w]) if (e) this.removeEnt(e);
    const [x, y] = W.pos, built = Base.built(W.id), pr = WArt.prop(built ? W.id : 'site'), k = 0.85;
    const e = this.addEnt({ type: 'obj', x, y, w: pr.w * k, h: pr.h * k, src: pr.url, foot: 4, sw: pr.w * k * 0.6, interact: () => this.useWorkshop(W), ap: [W.wp[0] + (W.wp[0] > x ? 64 : -64), W.wp[1] + 12] });
    this.tag(e, WArt.icon(built ? 'star' : 'hammer', 18) + ' ' + t('ws.' + W.id));
    if (built && W.id === 'mill') { // the sails turn on their own layer, pinned to the cap of the tower
      const sp = WArt.prop('mill_sails'), sw = sp.w * k * 0.92;
      e.inner.appendChild(U.img(sp.url, 'mill-sails', { style: { width: sw + 'px', height: sw + 'px', left: (75 * k - sw / 2) + 'px', top: (60 * k - sw / 2) + 'px' } }));
    }
    const bub = U.el('div', { class: 'ws-bub' });
    bub.style.bottom = (e.h - (e.foot || 0) + 6) + 'px';
    e.el.appendChild(bub);
    let w = null;
    const m = built && Base.worker(W.id);
    if (m) {
      w = this.addWild(m.sp, m.lv, m.shiny, W.wp[0], W.wp[1], false, false, m, false, 0.72);
      w.post = { face: x > W.wp[0] ? 1 : -1, act: W.id === 'garden' ? 'sniff' : 'hop' };
      w.worker = true;
      w.interact = () => this.useWorkshop(W);
    }
    this.wsEnts[W.id] = { e, w, bub, built };
  },
  /** trainees spar on the Dojo mat (up to three), facing each other */
  spawnTrainees() {
    for (const w of this.wilds.filter(x => x.trainee)) this.removeEnt(w);
    const [dx, dy] = this.zone.dojo, mat = [[dx - 44, dy + 8, 1], [dx + 36, dy + 10, -1], [dx - 4, dy + 30, 1]];
    Game.s.camp.dojo.slice(0, 3).forEach((d, i) => {
      const m = Game.mon(d.id);
      if (!m) return;
      const w = this.addWild(m.sp, m.lv, m.shiny, mat[i][0], mat[i][1], false, false, m, false, 0.68);
      w.post = { face: mat[i][2], act: 'hop', spar: true };
      w.trainee = true;
      w.interact = () => this.useDojo();
    });
  },
  /** the yard: the visitor of this 8-hour window, if one came */
  spawnYard() {
    this.visitorEnt = null;
    const v = Base.visitor();
    if (!v) return;
    const w = this.addWild(v.sp, v.lv, v.shiny, U.rf(560, 900), U.rf(580, 640), false, false);
    w.visitor = true;
    w.el.classList.add('visitw');
    w.labelEl.innerHTML = WArt.icon('heart', 16) + ' ' + t('yard.visitor') + ': ' + SPECIES[v.sp].name + ` <small>${t('ui.lv')} ${v.lv}</small>`;
    this.visitorEnt = w;
  },
  /** the bubbles over the workshops and the Dojo, the eggs on the nest, the glints */
  refreshBase() {
    if (!this.home || UI.cur !== this) return;
    Camp.cleanup(); Base.cleanup();
    // the scene follows jobs changed elsewhere (the team menu, a details card, the camp window)
    if (this.area === 'yard') {
      for (const W of WORKSHOPS) {
        const o = this.wsEnts[W.id], m = Base.built(W.id) ? Base.worker(W.id) : null;
        if (!o || o.built !== Base.built(W.id) || (m ? m.id : null) !== (o.w ? o.w.own : null)) this.buildWorkshop(W);
      }
    } else {
      const want = Game.s.camp.dojo.slice(0, 3).map(d => d.id).join(','), have = this.wilds.filter(w => w.trainee).map(w => w.own).join(',');
      if (want !== have) this.spawnTrainees();
      for (const w of this.wilds.slice()) if (w.own && !w.trainee && (!Game.mon(w.own) || Base.busy(w.own))) this.removeEnt(w);
    }
    if (this.area === 'yard') {
      for (const W of WORKSHOPS) {
        const o = this.wsEnts[W.id];
        if (!o) continue;
        const built = Base.built(W.id), m = built && Base.worker(W.id), n = m ? Base.units(W.id) : 0;
        let html = '';
        if (!built) html = `<img src="${WArt.item('coin')}">${U.fmt(W.cost)}`;
        else if (!m) html = '<b>+</b>';
        else if (n > 0) html = `<img src="${UI.rewardIcon(W.out === 'coins' ? 'coins' : W.out)}">${W.out === 'coins' ? U.fmt(n * W.amt) : '×' + n}`;
        o.bub.innerHTML = html;
        o.bub.className = 'ws-bub' + (!html ? ' off' : !built ? ' price' : !m ? ' hire' : Base.full(W.id) ? ' full' : '');
        o.e.el.classList.toggle('glint', !!m && Base.full(W.id));
      }
      return;
    }
    this.refreshHatchery();
    const d = this.dojoEnt;
    if (d) {
      if (!d.bub) { d.bub = U.el('div', { class: 'ws-bub' }); d.bub.style.bottom = (d.h - (d.foot || 0) + 6) + 'px'; d.el.appendChild(d.bub); }
      const xp = Game.s.camp.dojo.reduce((n, x) => n + Camp.pending(x), 0), full = Game.s.camp.dojo.some(x => Camp.full(x));
      d.bub.innerHTML = xp >= 1 ? `<img src="${WArt.item('xp')}">+${U.fmt(xp)}` : Camp.dojoSlots() > Game.s.camp.dojo.length && Game.boxMons().some(m => !Base.busy(m.id)) ? '<b>+</b>' : '';
      d.bub.className = 'ws-bub' + (!d.bub.innerHTML ? ' off' : full ? ' full' : xp >= 1 ? '' : ' hire');
      d.el.classList.toggle('glint', full);
    }
  },
  refreshHatchery() {
    const e = this.hatchEnt;
    if (!e) return;
    for (const el of this.eggEls) el.remove();
    this.eggEls = [];
    const spots = [[0.39, 0.52], [0.61, 0.51], [0.5, 0.45]];
    Game.s.camp.eggs.slice(0, 3).forEach((egg, i) => {
      const img = U.img(WArt.item(egg.egg), 'nest-egg' + (Camp.ready(egg) ? ' ready' : ''));
      img.style.left = (spots[i][0] * 100) + '%'; img.style.top = (spots[i][1] * 100) + '%';
      e.inner.appendChild(img);
      this.eggEls.push(img);
    });
    e.el.classList.toggle('glint', Camp.attention() && (Game.s.camp.eggs.some(x => Camp.ready(x)) || (Game.s.camp.eggs.length < Camp.eggSlots() && Camp.eggsInBag() > 0)));
  },
  /** tap the Hatchery: a ready egg hatches right here; otherwise the incubators open */
  async useHatchery() {
    if (this.busy) return;
    const egg = Game.s.camp.eggs.find(x => Camp.ready(x));
    if (!egg) { Menus.camp('hatch', () => this.refreshBase()); return; }
    this.busy = true;
    try {
      const m = Camp.hatch(egg.id);
      if (m) {
        const isNew = !Game.caught(m.sp);
        Game.catchReg(m.sp);
        const where = Game.addMon(m);
        Game.save();
        Platform.track('base', 'hatch', 'complete');
        await Menus.hatchAnim(egg.egg, m, isNew, where);
        UI.hudUpdate();
      }
    } finally { this.busy = false; this.refreshBase(); }
  },
  /** tap the Dojo: the trainees' XP is collected (after half an hour or more); otherwise the mats open */
  async useDojo() {
    if (this.busy) return;
    const ready = Game.s.camp.dojo.filter(d => Camp.hours(d) >= 0.5 && Camp.pending(d) >= 1);
    if (!ready.length) { Menus.camp('dojo', () => this.refreshBase()); return; }
    this.busy = true;
    try {
      Snd.play('levelup');
      for (const d of ready) {
        const r = Camp.claim(d.id, 1);
        if (!r) continue;
        const sp = SPECIES[r.m.sp];
        UI.toast(t('camp.got', { name: sp.name, n: U.fmt(r.xp) }) + (r.r.levels.length ? ' · ' + t('ui.lv') + ' ' + r.m.lv : ''), 'good');
        for (const id of r.r.learned) UI.toast(t('b.learn', { name: sp.name, move: t('mv.' + id) }));
        const up = Base.befriend(r.m, 1);
        if (up) UI.heartToast(r.m, up);
        if (Game.canEvolve(r.m)) await Menus.evolve(r.m);
      }
      Game.save(); UI.hudUpdate();
    } finally { this.busy = false; this.refreshBase(); }
  },
  /** tap a workshop: build it, hire a worker, collect what is ready — or look at it */
  useWorkshop(W) {
    if (this.busy) return;
    const done = () => { this.buildWorkshop(W); this.refreshBase(); UI.hudUpdate(); };
    if (!Base.built(W.id)) { Menus.buildWorkshop(W, done); return; }
    if (!Base.worker(W.id)) { Menus.pickWorker(W, done); return; }
    if (Base.units(W.id) >= 1) { this.collectWorkshop(W); return; }
    Menus.workshop(W, done);
  },
  collectWorkshop(W) {
    const c = Base.collect(W.id);
    if (!c) return;
    Snd.play('coin');
    const [x, y] = W.pos;
    let i = 0;
    for (const k in c.r) UI.float(x, y - 130 - (i++) * 28, '+' + U.fmt(c.r[k]) + ' ' + (k === 'coins' ? t('ui.coins') : t('it.' + k)), 'info');
    if (c.dust) UI.float(x, y - 130 - i * 28, '+' + c.dust + ' ' + t('it.dust'), 'lvl');
    UI.burst(x, y - 70, ['#ffe066', '#ffffff', '#9dff7a'], 14, 120);
    if (c.up) UI.heartToast(c.m, c.up);
    const o = this.wsEnts[W.id];
    if (o && o.w) this.act(o.w, 'hop');
    Game.save(); UI.hudUpdate(); this.refreshBase();
  },
  talkBruno() {
    if (this.busy) return;
    Menus.bruno(() => { for (const W of WORKSHOPS) this.buildWorkshop(W); this.buildDecor(); this.refreshBase(); UI.hudUpdate(); });
  },
  /** a character's mini-story: the request, or the thanks and a one-of-a-kind decoration */
  async storyTalk(id, beat) {
    const S = Base.storyOf(id), k = 'st.' + S.id;
    if (beat === 'start') {
      await UI.talk([{ who: id, text: t(k + '.a1') }, { who: id, text: t(k + '.a2') }]);
      Base.startStory(S);
      Snd.play('notice');
      UI.toast(WArt.icon('quests', 22) + ' ' + t('st.new', { name: TAMERS[id].name }), 'good');
    } else {
      await UI.talk([{ who: id, text: t(k + '.b1') }, { who: id, text: t(k + '.b2') }]);
      const { r, decor } = Base.endStory(S);
      Game.save();
      await Menus.decorGift(decor, r);
    }
    Game.save();
    UI.hudUpdate();
    const e = this.ents.find(x => x.npc === id);
    if (e) this.npcMarker(e);
  },

  /* ---------------- tutorial ---------------- */
  /* The first battle starts at the Star Altar (IntroScene). This one-goal meadow is the fallback when the first catch
   * did not happen there (the page was reloaded mid-battle): the pointer over the first wild Orbling and Pip's bubble. */
  /** the tutorial Orbling: a big bouncing pointer over its head and a pulsing ring on the ground — the one thing to do */
  markTut(e) {
    e.tutorial = true; e.hold = true; this.camFocus = e;
    const rw = Math.round(e.w * 0.95), rh = Math.round(rw * 0.34);
    const ring = U.el('div', { class: 'tut-ring', style: { left: -rw / 2 + 'px', top: -rh / 2 + 'px', width: rw + 'px', height: rh + 'px' } }, U.el('i'), U.el('i'));
    e.el.insertBefore(ring, e.shadowEl ? e.shadowEl.nextSibling : e.el.firstChild);
    e.tutEl = U.el('div', { class: 'tut-ptr' }, U.el('i', { class: 'tut-hit' }), U.el('b', null, U.img(HudArt.pointer()))); // tapping the arrow or the ring battles it too
    e.tutEl.style.bottom = this.headY(e, 4) + 'px';
    e.el.appendChild(e.tutEl);
  },
  /** nothing happened for a while, or something else was tapped: Pip says it again, the Orbling hops, the pointer pings */
  tutNudge(key) {
    const w = this.wilds.find(x => x.tutorial);
    if (!w) return;
    this.tutIdle = 0;
    if (key) this.pipSay(t(key), 5000);
    this.act(w, 'hop');
    setTimeout(() => { if (this.wilds.includes(w) && !w.act) this.act(w, 'hop'); }, 520);
    if (w.tutEl) { w.tutEl.classList.remove('ping'); void w.tutEl.offsetWidth; w.tutEl.classList.add('ping'); }
  },
  /** a speech bubble over Pip that needs no click (it fades by itself) */
  pipSay(html, ms = 5000) {
    if (!this.pipEl) return;
    if (this.pipBub) this.pipBub.remove();
    const b = this.pipBub = U.el('div', { class: 'pip-say', html });
    this.world.appendChild(b);
    this.pipBubW = b.offsetWidth; this.pipBubSh = null;
    this.placeBub();
    setTimeout(() => { if (this.pipBub === b) { b.classList.add('out'); setTimeout(() => b.remove(), 400); } }, ms);
  },

  /** Pip's bubble follows Pip; near the edge of the picture it slides back in and its tail still points at Pip
   *  (`translate`, so the pop-in animation's scale never moves it to the corner of the world) */
  placeBub() {
    const b = this.pipBub, c = this.cam, bw = this.pipBubW || 0, L = this.pip.x - 40;
    const vx0 = c ? c.x : 0, vx1 = c ? c.x + c.vw : 1280;
    const sh = Math.round(Math.max(vx0 + 8 - L, Math.min(0, vx1 - 8 - (L + bw))));
    b.style.translate = `${(this.pip.x + sh).toFixed(1)}px ${this.pip.y.toFixed(1)}px`;
    if (sh !== this.pipBubSh) { this.pipBubSh = sh; b.style.setProperty('--tail', U.clamp(30 - sh, 14, Math.max(14, bw - 34)) + 'px'); }
  },

  /* ---------------- ambience ---------------- */
  ambient() {
    let kind = BIOME_PARTICLES[this.zone.biome] || 'petal';
    if (this.tod === 'night' && kind === 'petal') kind = 'firefly'; // (petals drift by day, fireflies come out at night)
    for (let i = 0; i < 16; i++) {
      const p = U.el('i', { class: 'ap ap-' + kind });
      p.style.left = U.rf(0, 1280) + 'px';
      p.style.top = U.rf(kind === 'snow' || kind === 'petal' ? -40 : 80, 700) + 'px';
      p.style.animationDelay = (-U.rf(0, 9)) + 's';
      p.style.animationDuration = U.rf(6, 12) + 's';
      this.amb.appendChild(p);
    }
  },
};
