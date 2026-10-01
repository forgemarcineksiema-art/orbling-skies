'use strict';
/* The catch (3.2): a staged, readable and juicy sequence in five beats.
 *  1. Aim — a spotlight falls on the wild Orbling and a ring of light shrinks towards a golden zodiac lock, ticking
 *     higher as it closes (the timing can be heard too). The tap grades the throw (Nice / Great / Excellent) and the
 *     ring shatters where it stood.
 *  2. Throw — the orb leaves the CATCH dial itself and arcs onto the Orbling with a trail in the grade's colour; a
 *     hit-stop at contact.
 *  3. Capture — the orb bounces up, its ring flies off as a halo round the Orbling's feet, climbs it while the Orbling
 *     turns to light, then tightens back into the orb (clack). The orb drops with two bounces onto its own shadow.
 *  4. Suspense — the music goes muffled, the spotlight narrows, the camera leans in; three wobbles, each lighting a star.
 *  5. The verdict — a click and the Orbling's constellation drawing itself over the orb with a fanfare, or cracks of
 *     light, the orb bursts and the Orbling hops out.
 * Stage coordinates (1280×720) as in battle.js. Every wait is a timer scaled by the battle speed (FX.k), so hidden or
 * throttled tabs never stall a battle; the timing ring itself keeps one speed (timing is a skill). */

const Capture = {
  ORB: 76,          // the orb's size during the catch (px)
  LOCK: 62,         // radius of the golden lock: a tap while the ring is inside it is Excellent (×1.7)
  GREAT: 95,        // inside the dotted guide it is Great (×1.35)
  PERIOD: 1150,     // one shrink of the timing ring (ms)
  R0: 155, R1: 35,  // the ring's radius at the start and at the end of a shrink
  TRAIL: [null, ['#ffffff', '#e6f2ff', '#9fd0ff'], ['#ffffff', '#c8f6ff', '#6fe3ff'], ['#ffffff', '#fffbd0', '#ffe066', '#ffb13b']],
  HALO: ['#ffffff', '#fff3a0', '#ffd23f', '#ffb13b'],

  wait(ms) { return U.sleep(ms * FX.k); },
  fx() { return VFX.ok() && VFX.ensure(); },
  /** WAAPI move that keeps its last frame as the element's own style */
  async go(el, kf, ms, o = {}) {
    const a = await U.anim(el, kf, Object.assign({ duration: ms * FX.k, fill: 'forwards' }, o));
    const last = kf[kf.length - 1];
    for (const k in last) if (k !== 'offset' && k !== 'easing' && k !== 'composite') el.style[k] = last[k];
    try { if (a && a.cancel) a.cancel(); } catch (e) { /* gone */ }
  },
  at(x, y) { return `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; },
  /** cancel the script animations of an element (its CSS idle loops keep running) */
  clear(el) { if (el) el.getAnimations().forEach(a => { if (!(window.CSSAnimation && a instanceof CSSAnimation)) a.cancel(); }); },
  /** the foe's plate steps aside while the orb is out (and comes back if the Orbling breaks free) */
  plate(B, show) {
    if (!B.cardE) return;
    this.clear(B.cardE);
    if (show) U.anim(B.cardE, [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 260 * FX.k });
    else U.anim(B.cardE, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-12px)' }], { duration: 240 * FX.k, fill: 'forwards' });
  },
  /** fade an element out from wherever its CSS animation has got to, then drop it */
  fadeOut(el, ms = 200) {
    if (!el || !el.isConnected) return;
    const cs = getComputedStyle(el), op = +cs.opacity;
    if (!(op > 0.02)) { el.remove(); return; }
    el.style.animation = 'none'; el.style.opacity = op; el.style.transform = cs.transform === 'none' ? '' : cs.transform;
    U.anim(el, [{ opacity: op }, { opacity: 0 }], { duration: ms * FX.k, fill: 'forwards' }).then(() => el.remove());
  },
  star4(s = 11) { return `<svg viewBox="-12 -12 24 24"><path d="M0 -${s}Q2 -2 ${s} 0Q2 2 0 ${s}Q-2 2 -${s} 0Q-2 -2 0 -${s}Z"/></svg>`; },

  /** where everything happens, from the foe's slot and the visible arena */
  geo(B) {
    const s = B.monE.size || 262, V = B.view();
    const x = EX, top = EY - s * 0.9;
    return {
      s, V, x, ey: EY, top,
      cy: EY - s * 0.46,                                // the Orbling's centre
      hitY: EY - s * 0.5,                               // where the orb strikes
      hy: Math.max(V.y0 + 120, EY - s * 0.9 - 40),      // the orb hovers above its head
      gy: EY - this.ORB * 0.4,                          // the orb's centre when it rests on the ground
      rx: Math.max(64, s * 0.36),                       // the halo round its feet
    };
  },

  /* ---------------- the stage around the catch: spotlight, camera, music ---------------- */
  /** a pool of light on (x, y) — the rest of the arena dims (it sits in the arena, so the panel and the plates stay
   *  lit and it zooms with the camera); k narrows it */
  spot(B, x, y, k = 1, ms = 380) {
    if (!B.arenaEl) return;
    if (!this.spotBox) {
      const V = B.view();
      this.spotBox = U.el('div', { class: 'cp-spotbox' });
      Object.assign(this.spotBox.style, { left: (V.x0 - 500) + 'px', top: (V.y0 - 500) + 'px', width: (V.x1 - V.x0 + 1000) + 'px', height: (V.y1 - V.y0 + 500) + 'px' });
      this.spotEl = U.el('div', { class: 'cp-spot' });
      this.spotBox.appendChild(this.spotEl);
      this.spotBox.dataset.x0 = V.x0 - 500; this.spotBox.dataset.y0 = V.y0 - 500;
      B.arenaEl.appendChild(this.spotBox);
      this.spotEl.style.transform = this.at(x - (V.x0 - 500), y - (V.y0 - 500)) + ` scale(${k * 1.6})`;
      void this.spotEl.offsetWidth;
    }
    const tr = this.at(x - +this.spotBox.dataset.x0, y - +this.spotBox.dataset.y0) + ` scale(${k})`;
    this.spotEl.style.transition = `transform ${Math.round(ms * FX.k)}ms cubic-bezier(.3,.7,.3,1), opacity .35s`;
    this.spotEl.style.transform = tr;
    this.spotEl.classList.add('on');
  },
  spotOff() {
    const box = this.spotBox;
    if (!box) return;
    this.spotBox = this.spotEl = null;
    box.firstChild.classList.remove('on');
    setTimeout(() => box.remove(), 450);
  },
  /** the camera leans in on (ox, oy): the arena and the effects layer zoom together, the plates and panel stay */
  cam(B, z, ox, oy, ms, ease = 'ease-in-out') {
    if (!FX.shakeOn() || !B.arenaEl) return;
    if (!this.camEls) { this.camEls = [B.arenaEl, UI.fx].map(el => ({ el, base: el.style.transform || '', origin: el.style.transformOrigin, a: null })); this.camO = [ox, oy]; }
    const [px, py] = this.camO, from = this.camZ || 1;
    this.camZ = z;
    for (const c of this.camEls) {
      const T = k => `${c.base} translate(${px}px, ${py}px) scale(${k.toFixed(4)}) translate(${-px}px, ${-py}px)`;
      c.el.style.transformOrigin = '0 0';
      const now = c.a ? getComputedStyle(c.el).transform : 'none';
      const a = c.el.animate([{ transform: now && now !== 'none' ? now : T(from) }, { transform: T(z) }], { duration: Math.max(1, ms * FX.k), easing: ease, fill: 'forwards' });
      if (c.a) c.a.cancel();
      c.a = a;
    }
  },
  camReset() {
    for (const c of this.camEls || []) { if (c.a) c.a.cancel(); c.el.style.transformOrigin = c.origin; }
    this.camEls = null; this.camZ = 1; this.camO = null;
  },
  /** everything back to normal (after a catch, a break-out, an error or leaving the battle) */
  settle(B) {
    this.spotOff();
    this.camReset();
    Snd.duck(1);
    if (B && B.dial) B.dial.classList.remove('aiming');
  },

  /* ---------------- 1. aim ---------------- */
  lockSvg() {
    const L = this.LOCK, f = v => v.toFixed(1);
    let s = `<circle class="crl-fill" r="${L}"/><circle class="crl-g" r="${L}"/><circle class="crl-c" r="${L}"/><circle class="crl-o" r="${L + 7}"/>`;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 + Math.PI / 12, r1 = L + 11, r2 = L + (i % 3 === 1 ? 20 : 15);
      s += `<line class="crl-t" x1="${f(Math.cos(a) * r1)}" y1="${f(Math.sin(a) * r1)}" x2="${f(Math.cos(a) * r2)}" y2="${f(Math.sin(a) * r2)}"/>`;
    }
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 - Math.PI / 2, x = Math.cos(a) * L, y = Math.sin(a) * L, k = 10;
      s += `<path class="crl-s" d="M${f(x)} ${f(y - k)}Q${f(x + 2)} ${f(y - 2)} ${f(x + k)} ${f(y)}Q${f(x + 2)} ${f(y + 2)} ${f(x)} ${f(y + k)}Q${f(x - 2)} ${f(y + 2)} ${f(x - k)} ${f(y)}Q${f(x - 2)} ${f(y - 2)} ${f(x)} ${f(y - k)}Z"/>`;
    }
    return s;
  },
  /** the timing mini-game → Promise<bonus> (1, 1.35 or 1.7) */
  aim(B, orb) {
    return new Promise(res => {
      const [cx, cy] = B.center(B.e), V = B.view();
      const hard = B.e.sp.rate < 0.3 || B.alpha;
      this.spot(B, cx, cy, 1);
      this.plate(B, false);
      Snd.duck(0.5, 2600);
      const wrap = U.el('div', { class: 'cr z1' + (hard ? ' hard' : ''), html: `<svg viewBox="-200 -200 400 400" width="400" height="400"><circle class="cr-guide" r="${this.GREAT}"/><g class="cr-lock">${this.lockSvg()}</g><circle class="cr-glow" r="${this.R0}"/><circle class="cr-ring" r="${this.R0}"/><circle class="cr-comet" r="${this.R0}" pathLength="100"/></svg>` });
      wrap.style.left = cx + 'px'; wrap.style.top = cy + 'px';
      const chance = k => Math.min(100, Math.round(BL.catchChance(B.e, orb || 'orb', k) * 100));
      const chip = U.el('div', { class: 'cr-chip', html: t('b.chance', { n: chance(1) }) });
      const hint = B.p0.tutorial || Game.s.stats.catches < 3 ? U.el('div', { class: 'cr-hint', text: t('b.tap') }) : null;
      // the labels go above the reticle when there is room, else below it — never over the battle log
      const above = cy - this.R0 - (hint ? 86 : 44) > V.y0 + 8;
      const ly = above ? cy - this.R0 - 22 : Math.min(cy + this.R0 + 26, V.y1 - (hint ? 70 : 26));
      UI.fx.append(wrap, chip);
      if (hint) UI.fx.appendChild(hint);
      const half = Math.max(chip.offsetWidth, hint ? hint.offsetWidth : 0) / 2 + 12, lx = U.clamp(cx, V.x0 + half, V.x1 - half);
      chip.style.left = lx + 'px'; chip.style.top = ly + 'px';
      if (hint) { hint.style.left = lx + 'px'; hint.style.top = (above ? ly - 40 : ly + 40) + 'px'; }
      B.msg.innerHTML = t('b.tap');
      B.dial.classList.add('aiming');
      const ring = wrap.querySelector('.cr-ring'), glow = wrap.querySelector('.cr-glow'), comet = wrap.querySelector('.cr-comet');
      const t0 = performance.now();
      let raf = 0, done = false, zone = 1, tick = -1;
      const rAt = () => this.R0 - (this.R0 - this.R1) * (((performance.now() - t0) % this.PERIOD) / this.PERIOD);
      const zoneOf = r => (r < this.LOCK ? 3 : r < this.GREAT ? 2 : 1);
      const setR = r => { for (const c of [ring, glow, comet]) c.setAttribute('r', r.toFixed(1)); };
      const frame = () => {
        const r = rAt(), z = zoneOf(r);
        setR(r);
        comet.setAttribute('transform', `rotate(${(((performance.now() - t0) * 0.42) % 360).toFixed(1)})`);
        if (z !== zone) {
          wrap.classList.remove('z' + zone); wrap.classList.add('z' + z);
          if (z > zone) Snd.blip(z === 3 ? 1760 : 1320, 0.1, 0.05, 'sine');
          zone = z;
          const k = [1, 1, 1.35, 1.7][z];
          chip.innerHTML = t('b.chance', { n: chance(k) }) + (k > 1 ? ` <b>+${Math.round((k - 1) * 100)}%</b>` : '');
          chip.classList.toggle('up', k > 1);
        }
        const st = Math.floor((this.R0 - r) / 12); // the ticking climbs as the ring closes in
        if (st !== tick) { tick = st; Snd.blip(520 + st * 88, 0.03, 0.03); }
        raf = requestAnimationFrame(frame);
      };
      frame();
      const fin = timedOut => {
        if (done) return; done = true;
        cancelAnimationFrame(raf);
        document.removeEventListener('pointerdown', fin, true);
        window.removeEventListener('keydown', kd, true);
        clearTimeout(auto);
        const r = rAt(), g = timedOut === true ? 1 : zoneOf(r), bonus = [1, 1, 1.35, 1.7][g]; // waiting it out earns no bonus
        setTimeout(() => res(bonus), g === 3 ? 180 : 90); // a beat of hit-stop, longer for an Excellent tap
        setTimeout(() => { for (const e of [wrap, chip, hint]) if (e) e.classList.add('out'); }, 80);
        setTimeout(() => { for (const e of [wrap, chip, hint]) if (e) e.remove(); }, 420);
        B.dial.classList.remove('aiming');
        try {
          const rr = g === 3 ? this.LOCK : r; // an Excellent tap snaps the ring onto the lock
          setR(rr);
          wrap.classList.remove('z1', 'z2', 'z3'); wrap.classList.add('z' + g, 'fire');
          Snd.play(['', 'aim_nice', 'aim_great', 'aim_exc'][g]);
          if (this.fx()) VFX.aimBurst(cx, cy, rr, g);
          if (g === 3) FX.shake(4, 220);
          if (timedOut !== true) this.grade(cx, above ? cy - this.R0 - 8 : cy + this.R0 * 0.6, g, V);
        } catch (e) { console.error('catch ring', e); }
      };
      const kd = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); fin(); } };
      const auto = setTimeout(() => fin(true), 4500);
      setTimeout(() => { if (!done) { document.addEventListener('pointerdown', fin, true); window.addEventListener('keydown', kd, true); } }, 120);
    });
  },
  /** "Nice!" / "Great!" / "Excellent!" pops over the reticle */
  grade(x, y, g, V) {
    const e = U.el('div', { class: 'cp-grade g' + g, text: t(['', 'b.nice', 'b.great', 'b.excellent'][g]) });
    e.style.animationDuration = Math.round(950 * FX.k) + 'ms';
    UI.fx.appendChild(e);
    const half = e.offsetWidth / 2 + 26; // (+ the italic overhang)
    e.style.left = U.clamp(x, V.x0 + half, V.x1 - half) + 'px'; e.style.top = Math.max(V.y0 + 50, y) + 'px';
    setTimeout(() => e.remove(), 1000 * FX.k);
  },

  /* ---------------- 2–5. throw, capture, suspense, verdict ---------------- */
  makeOrb(id) {
    const core = U.img(WArt.orbPart(id, 'core'), 'cp-core'), belt = U.img(WArt.orbPart(id, 'belt'), 'cp-belt'), glint = U.el('i', { class: 'cp-glint' });
    const body = U.el('div', { class: 'cp-body' }, core, belt, glint);
    const el = U.el('div', { class: 'cp-orb' }, body);
    const shade = U.el('div', { class: 'cp-shade' });
    UI.fx.append(shade, el);
    return { el, body, core, belt, glint, shade };
  },
  /** the orb icon in the CATCH dial, in effects-layer coordinates (and the scale that matches its size) */
  dialPoint(B) {
    const src = B.dial.querySelector('.bd-orb') || B.dial;
    const r = src.getBoundingClientRect(), fr = UI.fx.getBoundingClientRect();
    const k = (fr.width || 1) / (UI.fx.offsetWidth || 1);
    const [x, y] = UI.toFx(r.left + r.width / 2, r.top + r.height / 2);
    return [x, y, U.clamp(r.width / k / this.ORB, 0.3, 1)];
  },
  flash(O, peak = 1, ms = 260) { U.anim(O.glint, [{ opacity: 0 }, { opacity: peak, offset: 0.25 }, { opacity: 0 }], { duration: ms * FX.k }); },
  squash(O, sx, sy, ms = 200) { U.anim(O.body, [{ transform: 'scale(1)' }, { transform: `scale(${sx}, ${sy})`, offset: 0.3 }, { transform: `scale(${1 + (1 - sx) * 0.3}, ${1 + (1 - sy) * 0.3})`, offset: 0.65 }, { transform: 'scale(1)' }], { duration: ms * FX.k }); },

  /** the whole throw → Promise<boolean>: true = caught. sh: how many wobbles hold (3 = caught) */
  async run(B, id, grade, sh) {
    const spr = B.monE.spr, lite = Main.lite;
    let caught = false, freed = false, O = null, pips = null;
    try {
      const G = this.geo(B), fx = this.fx(), [sx, sy, s0] = this.dialPoint(B);
      O = this.makeOrb(id);
      /* 2. throw: out of the dial, up and over, onto the Orbling */
      B.dial.classList.add('thrown');
      this.spot(B, G.x, G.cy, 1.05, 600);
      const P2 = [G.x, G.hitY], C = [(sx + P2[0]) / 2 - 30, P2[1] - 250 - 0.5 * Math.max(0, sy - P2[1])];
      const path = q => { const u = 1 - q; return [u * u * sx + 2 * u * q * C[0] + q * q * P2[0], u * u * sy + 2 * u * q * C[1] + q * q * P2[1]]; };
      const spin = grade === 3 ? 1440 : 1080, dur = 560; // whole turns: upright again at the hit
      const kPos = [], kBody = [];
      for (let i = 0; i <= 14; i++) {
        const q = i / 14, [x, y] = path(q), sc = q < 0.22 ? s0 + (1.3 - s0) * Math.sin(q / 0.22 * Math.PI / 2) : 1.3 - 0.32 * (q - 0.22) / 0.78;
        kPos.push({ transform: this.at(x, y) });
        kBody.push({ transform: `rotate(${(q * spin).toFixed(0)}deg) scale(${sc.toFixed(3)})` });
      }
      O.el.style.transform = kPos[0].transform; O.body.style.transform = kBody[0].transform;
      Snd.play('throw');
      if (fx) {
        const cols = this.TRAIL[grade];
        VFX.shot(path, dur, { size: grade === 3 ? 9 : 6, cols, rate: grade === 3 ? 120 : 80, trail: (x, y) => VFX.part({ x, y, vx: U.rf(-30, 30), vy: U.rf(-30, 30), shape: 'star', cols, s0: U.rf(4, grade === 3 ? 10 : 7), s1: 1, life: grade === 3 ? 520 : 380, rot: U.rf(0, 6) }) });
      }
      await Promise.all([this.go(O.el, kPos, dur, { easing: 'linear' }), this.go(O.body, kBody, dur, { easing: 'linear' })]);

      /* hit: a hit-stop, a flash, the Orbling flinches */
      Snd.play('orb_hit');
      FX.shake(3, 160);
      if (fx) { VFX.flash(P2[0], P2[1], '#ffffff', 110, 220); VFX.ring(P2[0], P2[1], '#ffffff', 12, 110, 300, 5); VFX.stars(P2[0], P2[1], 8, ['#ffffff', '#fff6a0'], { spd: [120, 260] }); }
      U.anim(spr, [{ transform: 'translate(-50%,-96%) scale(1)' }, { transform: 'translate(-50%,-96%) scale(1.08, .9)', offset: 0.3 }, { transform: 'translate(-50%,-96%) scale(1)' }], { duration: 220 * FX.k });
      U.anim(B.monE.img, [{ filter: 'brightness(1)' }, { filter: 'brightness(2.6)' }, { filter: 'brightness(1)' }], { duration: 220 * FX.k });
      O.body.style.transform = 'rotate(0deg) scale(1.2, .82)';
      await this.wait(75);

      /* the orb bounces up and hangs over its head */
      const kUp = [];
      for (let i = 0; i <= 8; i++) { const q = i / 8, e = 1 - (1 - q) * (1 - q); kUp.push({ transform: this.at(G.x + Math.sin(q * Math.PI) * -16, G.hitY + (G.hy - G.hitY) * e) }); }
      this.flash(O, 0.7, 220);
      await Promise.all([this.go(O.el, kUp, 300, { easing: 'linear' }), this.go(O.body, [{ transform: 'rotate(0deg) scale(1.2, .82)' }, { transform: 'rotate(-160deg) scale(1)', offset: 0.6 }, { transform: 'rotate(-360deg) scale(1)' }], 300, { easing: 'ease-out' })]);
      O.body.style.transform = '';
      U.anim(O.shade, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.4)' }, { opacity: 0.45, transform: 'translate(-50%,-50%) scale(.55)' }], { duration: 300 * FX.k, fill: 'forwards' });
      O.shade.style.left = G.x + 'px'; O.shade.style.top = G.ey + 'px';

      /* 3. the ring flies off, lassoes the Orbling and pulls it in as light */
      const d = [220, 320, 270];
      Snd.play('orb_open');
      this.flash(O, 0.9, 260);
      U.anim(O.belt, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(2.3, 1.7) translateY(8px)', opacity: 0 }], { duration: 180 * FX.k, fill: 'forwards' });
      if (fx) VFX.halo({ ox: G.x, oy: G.hy, fx: G.x, fy: G.ey - 4, cy: G.cy + G.s * 0.08, top: G.top, rx: G.rx, cols: this.HALO, d });
      B.statusOverlay(B.monE, null);
      await this.wait(d[0]);
      const glow = lite ? '' : ' drop-shadow(0 0 0 rgba(255,246,160,0))', glowOn = lite ? '' : ' drop-shadow(0 0 14px rgba(255,246,160,1))';
      U.anim(spr, [
        { transform: 'translate(-50%,-96%) scale(1)', filter: 'brightness(1) saturate(1)' + glow },
        { transform: 'translate(-50%,-96%) translateY(-6px) scale(1.03, .98)', filter: 'brightness(2.2) saturate(.5)' + glowOn, offset: 0.45 },
        { transform: 'translate(-50%,-96%) translateY(-12px) scale(1.02)', filter: 'brightness(7) saturate(0)' + glowOn }], { duration: d[1] * FX.k, easing: 'ease-in', fill: 'forwards' });
      U.anim(B.monE.shadow, [{ opacity: 1 }, { opacity: 0 }], { duration: (d[1] + d[2]) * FX.k, fill: 'forwards' });
      await this.wait(d[1]);
      Snd.play('orb_suck');
      const dy = G.hy - (G.ey + G.s * 0.04);
      await this.go(spr, [
        { transform: 'translate(-50%,-96%) translateY(-12px) scale(1.02)', filter: 'brightness(7) saturate(0)' + glowOn, opacity: 1 },
        { transform: `translate(-50%,-96%) translateY(${(dy * 0.25).toFixed(1)}px) scale(.5, 1.28)`, filter: 'brightness(7) saturate(0)' + glowOn, opacity: 1, offset: 0.45 },
        { transform: `translate(-50%,-96%) translateY(${dy.toFixed(1)}px) scale(.03, .05)`, filter: 'brightness(7) saturate(0)' + glowOn, opacity: 0.3 }], d[2], { easing: 'cubic-bezier(.6,0,.9,.5)' });
      this.clear(spr);
      spr.style.opacity = 0; spr.style.transform = ''; spr.style.filter = '';
      // the ring snaps back on: clack
      Snd.play('orb_clack');
      U.anim(O.belt, [{ transform: 'scale(2.4, 1.8)', opacity: 0 }, { transform: 'scale(.86)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 200 * FX.k, fill: 'forwards' });
      this.flash(O, 1, 300);
      this.squash(O, 1.25, 0.8, 220);
      if (fx) { VFX.flash(G.x, G.hy, '#ffffff', 120, 260); VFX.ring(G.x, G.hy, '#fff6a0', 20, 120, 320, 6); }
      await this.wait(210);

      /* the orb drops, bounces twice and settles on its shadow */
      await this.drop(O, G);

      /* 4. suspense: muffled music, a narrower spotlight, the camera leaning in, three wobbles */
      Snd.duck(0.2, 650);
      this.spot(B, G.x, G.gy, 0.62, 900);
      this.cam(B, 1.1, G.x, G.gy, 2600, 'cubic-bezier(.3,0,.6,1)');
      pips = U.el('div', { class: 'cp-pips' }, ...[0, 1, 2].map(() => U.el('i', { html: this.star4() })));
      pips.style.left = G.x + 'px'; pips.style.top = (G.gy - 74) + 'px';
      UI.fx.appendChild(pips);
      O.body.style.transformOrigin = '50% 90%';
      for (let i = 0; i < 3; i++) {
        if (i === 2) Snd.play('heartbeat');
        await this.wait(i === 0 ? 400 : 330);
        if (i >= sh) { await this.burst(B, O, G, pips.children[i], pips); freed = true; return false; }
        await this.wobble(O, G, i);
        const pip = pips.children[i];
        pip.classList.add('on');
        Snd.note([1318.5, 1568, 1975.5][i], 0.55, 0.07);
        if (fx) VFX.stars(G.x - 40 + i * 40, G.gy - 74, 6, VFX.PAL.star, { spd: [60, 150], size: [3, 6] });
      }
      await this.wait(320);
      await this.success(B, O, G, pips);
      caught = true;
      return true;
    } catch (e) {
      console.error('catch sequence', e);
      caught = sh >= 3; // the show broke, not the catch: an orb that held still catches
      return caught;
    } finally {
      this.settle(B);
      B.dial.classList.remove('thrown');
      if (O) for (const e of [O.el, O.shade]) e.remove();
      if (pips) pips.remove();
      if (!caught && !freed) { // an error mid-show: the Orbling comes back as it was
        this.clear(spr); spr.style.opacity = 1; spr.style.transform = ''; spr.style.filter = '';
        this.clear(B.monE.shadow); this.plate(B, true);
      }
    }
  },
  /** a fall under gravity from the hover point with two smaller bounces; a squash, a thud and dust at each contact */
  async drop(O, G) {
    const g = 3600, y0 = G.hy, gy = G.gy, h0 = Math.max(8, gy - y0), h1 = Math.min(42, h0 * 0.26), h2 = Math.min(12, h1 * 0.3);
    const tf = h => Math.sqrt(2 * h / g) * 1000, T0 = tf(h0), T1 = tf(h1), T2 = tf(h2), total = T0 + 2 * T1 + 2 * T2;
    const FALL = 'cubic-bezier(.33,0,.67,.33)', RISE = 'cubic-bezier(.33,.67,.67,1)';
    const pts = [[0, y0, FALL], [T0, gy, RISE], [T0 + T1, gy - h1, FALL], [T0 + 2 * T1, gy, RISE], [T0 + 2 * T1 + T2, gy - h2, FALL], [total, gy]];
    const kf = pts.map(([tt, y, e]) => Object.assign({ transform: this.at(G.x, y), offset: tt / total }, e ? { easing: e } : {}));
    const kSh = pts.map(([tt, y, e]) => { const k = 1 - Math.min(1, (gy - y) / Math.max(1, h0)); return Object.assign({ transform: `translate(-50%,-50%) scale(${(0.55 + 0.45 * k).toFixed(3)})`, opacity: (0.25 + 0.4 * k).toFixed(3), offset: tt / total }, e ? { easing: e } : {}); });
    O.body.style.transformOrigin = '50% 90%';
    U.anim(O.shade, kSh, { duration: total * FX.k, fill: 'forwards' });
    const hits = [[T0, 1, 1.3, 0.72], [T0 + 2 * T1, 0.55, 1.14, 0.88], [total, 0.3, 1.06, 0.95]];
    for (const [tt, v, sx, sy] of hits) setTimeout(() => {
      Snd.bounce(v);
      this.squash(O, sx, sy, 180 + 60 * v);
      if (this.fx()) { VFX.smoke(G.x, G.ey - 4, Math.round(3 + 5 * v), '#d8ccb4', { rx: 26 + 16 * v, size: [10, 18], spd: [20, 60], a: [0.25, 0.4] }); if (v === 1) VFX.ring(G.x, G.ey - 2, '#ffffff', 16, 90, 380, 4, { flat: 0.3 }); }
    }, tt * FX.k);
    await this.go(O.el, kf, total);
    await this.wait(120);
  },
  /** one wobble: the orb rocks on its base (anticipation, swing, counter-swing, settle), sliding a little with it */
  async wobble(O, G, i) {
    const dir = i % 2 ? -1 : 1, A = [17, 21, 25][i] * dir, ms = 500;
    Snd.rattle(i);
    U.anim(O.body, [
      { transform: 'rotate(0deg) scale(1)' },
      { transform: `rotate(${(-A * 0.3).toFixed(1)}deg) scale(1.04, .96)`, offset: 0.14 },
      { transform: `rotate(${A}deg) scale(.98, 1.02)`, offset: 0.4 },
      { transform: `rotate(${(-A * 0.55).toFixed(1)}deg) scale(1.03, .97)`, offset: 0.66 },
      { transform: `rotate(${(A * 0.2).toFixed(1)}deg) scale(1)`, offset: 0.84 },
      { transform: 'rotate(0deg) scale(1)' }], { duration: ms * FX.k, easing: 'ease-in-out' });
    U.anim(O.el, [{ transform: this.at(G.x, G.gy) }, { transform: this.at(G.x + dir * 7, G.gy), offset: 0.4 }, { transform: this.at(G.x - dir * 4, G.gy), offset: 0.66 }, { transform: this.at(G.x, G.gy) }], { duration: ms * FX.k, easing: 'ease-in-out' });
    U.anim(O.shade, [{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: `translate(calc(-50% + ${dir * 6}px),-50%) scale(1.05, .95)`, offset: 0.4 }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: ms * FX.k });
    setTimeout(() => { this.flash(O, 0.55, 240); if (this.fx()) VFX.stars(G.x + dir * 20, G.gy - 30, 4, VFX.PAL.star, { ang: [-Math.PI * 0.85, -Math.PI * 0.15], spd: [60, 140], size: [4, 7] }); }, ms * 0.4 * FX.k);
    await this.wait(ms);
  },
  /** 5a. caught: a click, a burst, the constellation of its sign drawing itself over the orb, a fanfare */
  async success(B, O, G, pips) {
    const V = G.V, sp = B.e.sp, fx = this.fx();
    Snd.play('orb_lock');
    this.flash(O, 1, 360);
    this.squash(O, 1.18, 0.86, 200);
    O.core.classList.add('lit');
    await this.wait(110);
    Snd.duck(1);
    Snd.music('caught');
    FX.shake(5, 280);
    if (fx) VFX.sealed(G.x, G.gy, G.ey - 2, this.HALO);
    this.cam(B, 1.16, G.x, G.gy, 120, 'ease-out');
    setTimeout(() => this.cam(B, 1, G.x, G.gy, 560, 'cubic-bezier(.3,.8,.3,1)'), 130 * FX.k);
    this.spotOff();
    pips.classList.add('win');
    setTimeout(() => pips.remove(), 760); // (their CSS animation keeps one speed)
    B.msg.innerHTML = t('b.caught', { name: sp.name });
    // the orb hops for joy
    U.anim(O.el, [{ transform: this.at(G.x, G.gy) }, { transform: this.at(G.x, G.gy - 34), offset: 0.4, easing: 'cubic-bezier(.33,0,.67,.33)' }, { transform: this.at(G.x, G.gy) }], { duration: 420 * FX.k, delay: 120 * FX.k, easing: 'cubic-bezier(.33,.67,.67,1)' });
    setTimeout(() => { Snd.bounce(0.4); this.squash(O, 1.12, 0.9, 160); }, 540 * FX.k);
    // CAPTURED! stamped over the orb, the constellation above it
    const title = U.el('div', { class: 'cp-title', text: t('b.captured_big') });
    title.style.animationDuration = Math.round(1900 * FX.k) + 'ms';
    UI.fx.appendChild(title);
    const w = title.offsetWidth || 480, ty = Math.max(V.y0 + 170, G.gy - 122);
    title.style.left = U.clamp(G.x, V.x0 + w / 2 + 30, V.x1 - w / 2 - 34) + 'px'; title.style.top = ty + 'px';
    let life = 1400, show = null, confT = 0;
    if (fx) {
      const S = SIGN_STARS[sp.sign], n = S ? S.p.length : 6, r = 122;
      const kx = U.clamp(G.x, V.x0 + r + 24, V.x1 - r - 24), ky = Math.max(V.y0 + r * 0.86 + 16, ty - 66 - r * 0.86);
      const bells = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349.3, 2637, 3136, 3520, 4186, 4698.6, 5274];
      life = VFX.constellation(show = { sign: sp.sign, x: kx, y: ky, r, col: (SIGN[sp.sign] || {}).color || '#8fe8ff', t0: 160, step: Math.min(85, 760 / n), hold: 760, out: 420, tx: G.x, ty: G.gy, onStar: i => Snd.note(bells[Math.min(i, bells.length - 1)], 0.6, 0.035) });
      confT = setTimeout(() => VFX.confetti(G.x, G.gy - 70, 64), 240 * FX.k);
    }
    setTimeout(() => title.remove(), 2000 * FX.k);
    // a tap after the stamp skips the rest of the show
    await new Promise(res => {
      let done = false;
      const fin = () => { if (done) return; done = true; clearTimeout(tm); UI.scene.removeEventListener('pointerdown', fin); res(); };
      const tm = setTimeout(fin, Math.max(1500, life + 80) * FX.k);
      setTimeout(() => { if (!done) UI.scene.addEventListener('pointerdown', fin); }, 650 * FX.k);
    });
    // everything goes before the card opens (the effects layer sits above the popups): the canvas show is called off,
    // the stamp fades from wherever it has got to and the orb glows out
    if (show) show.cancelled = true;
    clearTimeout(confT);
    this.fadeOut(title, 200);
    await this.go(O.el, [{ opacity: 1, transform: this.at(G.x, G.gy) }, { opacity: 0, transform: this.at(G.x, G.gy - 20) + ' scale(1.25)' }], 220);
    if (fx) VFX.clear();
  },
  /** 5b. the Orbling breaks free: cracks of light, the orb bursts, the Orbling hops out */
  async burst(B, O, G, pip, pips) {
    const fx = this.fx(), spr = B.monE.spr;
    Snd.play('orb_shake');
    pip.classList.add('bad');
    const kf = [];
    for (let i = 0; i <= 8; i++) kf.push({ transform: `rotate(${(i % 2 ? 1 : -1) * (i === 8 ? 0 : 6 + i * 1.6)}deg) scale(${(1 + i * 0.012).toFixed(3)})` });
    U.anim(O.body, kf, { duration: 340 * FX.k, easing: 'linear' });
    U.anim(O.glint, [{ opacity: 0 }, { opacity: 0.8, offset: 0.3 }, { opacity: 0.3, offset: 0.5 }, { opacity: 1 }], { duration: 340 * FX.k, fill: 'forwards' });
    if (fx) VFX.cracks(G.x, G.gy, 44, 340);
    await this.wait(340);
    // burst: the halves fly apart, the ring spins off; the lights come back up
    Snd.play('orb_burst');
    FX.shake(7, 300);
    this.spotOff();
    this.cam(B, 1, G.x, G.gy, 420, 'cubic-bezier(.3,.8,.3,1)');
    Snd.duck(1);
    pips.classList.add('out');
    setTimeout(() => pips.remove(), 400);
    if (fx) VFX.breakout(G.x, G.gy, G.ey - 2); else FX.burst(G.x, G.gy, 'fx-star', 10, { bg: FX_COL.star, dist: 120, size: 16 });
    const half = (clip, tx, ty, rot) => {
      const h = U.el('div', { class: 'cp-half' }, U.img(O.core.src));
      h.style.clipPath = clip; h.style.left = (G.x - this.ORB / 2) + 'px'; h.style.top = (G.gy - this.ORB / 2) + 'px';
      UI.fx.appendChild(h);
      U.anim(h, [{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${tx * 0.7}px, ${ty}px) rotate(${rot * 0.7}deg)`, opacity: 1, offset: 0.5 }, { transform: `translate(${tx}px, ${ty + 70}px) rotate(${rot}deg)`, opacity: 0 }], { duration: 620 * FX.k, easing: 'cubic-bezier(.2,.7,.4,1)' }).then(() => h.remove());
    };
    half('inset(0 0 50% 0)', -40, -70, -70);
    half('inset(50% 0 0 0)', 34, -26, 50);
    const belt = U.img(O.belt.src, 'cp-half');
    belt.style.left = (G.x - this.ORB / 2) + 'px'; belt.style.top = (G.gy - this.ORB / 2) + 'px';
    UI.fx.appendChild(belt);
    U.anim(belt, [{ transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 }, { transform: 'translate(10px,-110px) scale(1.8, 1.2) rotate(40deg)', opacity: 0 }], { duration: 560 * FX.k, easing: 'ease-out' }).then(() => belt.remove());
    O.el.style.visibility = 'hidden'; O.shade.style.visibility = 'hidden';
    // the Orbling hops out of the light
    const dy = G.gy - (G.ey + G.s * 0.04);
    spr.style.opacity = 1;
    Snd.cry(B.e.mon.sp);
    U.anim(B.monE.shadow, [{ opacity: 0 }, { opacity: 1 }], { duration: 420 * FX.k, fill: 'forwards' });
    await this.go(spr, [
      { transform: `translate(-50%,-96%) translateY(${dy.toFixed(1)}px) scale(.05)`, filter: 'brightness(7) saturate(0)' },
      { transform: `translate(-50%,-96%) translateY(${(dy * 0.4 - 30).toFixed(1)}px) scale(1.1, .92)`, filter: 'brightness(2.4) saturate(.5)', offset: 0.45 },
      { transform: 'translate(-50%,-96%) translateY(-24px) scale(.96, 1.05)', filter: 'brightness(1.2) saturate(1)', offset: 0.72 },
      { transform: 'translate(-50%,-96%) scale(1)', filter: 'brightness(1) saturate(1)' }], 480, { easing: 'ease-out' });
    this.clear(spr);
    spr.style.transform = ''; spr.style.filter = '';
    this.clear(B.monE.shadow);
    Snd.bounce(0.7);
    if (fx) VFX.smoke(G.x, G.ey - 4, 8, '#d8ccb4', { rx: 60, size: [14, 24], a: [0.3, 0.45] });
    U.anim(spr, [{ transform: 'translate(-50%,-96%) scale(1.12, .88)' }, { transform: 'translate(-50%,-96%) scale(1)' }], { duration: 200 * FX.k });
    this.plate(B, true);
    B.dial.classList.remove('thrown'); B.dial.classList.add('reload');
    setTimeout(() => B.dial.classList.remove('reload'), 500);
    await this.wait(160);
  },
};
