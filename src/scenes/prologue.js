'use strict';
/* The opening (3.1), shown to a new player before the Star Altar: a short trailer. The twelve signs light up round a
 * star, the Eclipse slides over it, opens red eyes and takes the shape of a shadow serpent, a sun lion answers
 * (silhouettes, close-ups against a burning backlight, a clash of light), a Star Orb catches the shadow, and the logo
 * lands with the Orblings. Made for the portals: ~6.5 s since 3.4, nothing to click (it flows into the Altar by
 * itself), "Skip" from the first second (and Esc / Enter / Space), a tap only switches the sound on, and it never
 * counts as gameplay. The shots sit on the bars of the 'prologue' track (music and pictures hit together). */

const PROLOGUE_BAR = 60 / TRACKS.prologue.bpm * 4 * 1000; // one bar of the prologue track (ms): the shots follow its bars
/** the Orblings that line up under the logo (the starters in the middle) */
const PR_CROWD = ['zapsy', 'budlet', 'fluffire', 'sunkit', 'finnip', 'mossmoo', 'breezle', 'nimbub', 'clawby'];
const PR_HERO = 'solmane', PR_FOE = 'tempestar';
/** the wheel's centre and the radius of its twelve signs (cinema-square coordinates) */
const PR_CX = 360, PR_CY = 318, PR_GR = 206;

/** the logo's orbit: a tilted ring of light behind the letters with a bright head running round it */
function orbitSvg() {
  return `<svg class="pr-orbit" viewBox="0 0 900 330"><defs><linearGradient id="prO" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7fe8ff" stop-opacity="0"/><stop offset=".5" stop-color="#7fe8ff" stop-opacity=".9"/><stop offset=".85" stop-color="#ffffff"/><stop offset="1" stop-color="#fff6a0"/></linearGradient></defs>
  <ellipse cx="450" cy="176" rx="436" ry="124" transform="rotate(-7 450 176)" fill="none" stroke="#7fe8ff" stroke-opacity=".22" stroke-width="3"/>
  <ellipse class="pr-orb-trail" cx="450" cy="176" rx="436" ry="124" transform="rotate(-7 450 176)" fill="none" stroke="url(#prO)" stroke-width="7" stroke-linecap="round" pathLength="100" stroke-dasharray="30 70"/></svg>`;
}

const PrologueScene = {
  async enter() {
    this.done = false; this.leaving = false; this.skipAsk = false; this.t0 = 0; this.timers = []; this.waits = []; this.paused = 0; this.hiddenAt = 0;
    try { await this.build(); } catch (e) { console.error(e); this.t0 = this.t0 || performance.now(); this.finish(); } // never a black screen
  },
  async build() {
    const root = UI.scene;
    root.className = 'prologue';
    // the starry backdrop is drawn once into a canvas, so the slow camera drift costs nothing
    this.bg = U.el('canvas', { class: 'pr-bg' });
    this.bg.width = 1280; this.bg.height = 720;
    const paint = new Promise(res => { const im = new Image(); im.onload = () => { try { this.bg.getContext('2d').drawImage(im, 0, 0, 1280, 720); } catch (e) { /* the plain navy shows */ } res(); }; im.onerror = res; im.src = WArt.space(3); });
    this.bgw = U.el('div', { class: 'pr-bgw' }, this.bg);
    root.append(this.bgw, U.el('div', { class: 'pr-tint' }), U.el('div', { class: 'pr-back' }), U.el('div', { class: 'pr-vig' }));

    const sq = this.sq = U.el('div', { class: 'pr-sq' }), cam = this.cam = U.el('div', { class: 'pr-cam' });
    sq.append(cam, U.el('i', { class: 'pr-slash' }));
    this.ring = U.el('div', { class: 'pr-ring', html: this.ringSvg() });
    this.glyphs = SIGNS.map((sg, i) => {
      const a = i / 12 * Math.PI * 2 - Math.PI / 2;
      return U.el('i', { class: 'pr-g', style: { left: (PR_CX + Math.cos(a) * PR_GR).toFixed(1) + 'px', top: (PR_CY + Math.sin(a) * PR_GR).toFixed(1) + 'px' }, html: `<svg viewBox="0 0 24 24"><path d="${sg.glyph}"/></svg>` });
    });
    this.moon = U.el('div', { class: 'pr-moon' }, U.el('i', { class: 'pr-eye l' }), U.el('i', { class: 'pr-eye r' }));
    // the shadow serpent (an Orbling swallowed by the Eclipse): a black silhouette with a red rim and burning eyes
    this.foe = U.el('div', { class: 'pr-foe' }, U.img(MonArt.url(PR_FOE, { size: 'lg' }), 'pr-sil'), U.el('i', { class: 'pr-eye a' }), U.el('i', { class: 'pr-eye b' }));
    // the sun lion: a silhouette against its own light until the clash lights it up
    this.hero = U.el('div', { class: 'pr-hero' }, U.el('i', { class: 'pr-aura' }), U.el('div', { class: 'pr-flip' }, U.img(MonArt.url(PR_HERO, { size: 'lg' }), 'pr-sil')));
    this.orb = U.el('div', { class: 'pr-orbball' }, U.img(WArt.item('orb')));
    this.logo = U.el('div', { class: 'pr-logo', html: orbitSvg() + logoSvg() });
    cam.append(U.el('div', { class: 'pr-core' }, U.el('i')), this.ring, ...this.glyphs, this.moon, this.foe, this.hero, this.orb, this.logo);
    root.appendChild(sq);

    this.crowd = U.el('div', { class: 'pr-crowd' }, ...PR_CROWD.map((id, i) => U.el('i', { class: 'pr-cm' + (STARTERS.includes(id) ? ' big' : ''), style: { '--i': i, '--sz': SPECIES[id].size || 1 } }, U.img(MonArt.url(id)))));
    this.cap = U.el('div', { class: 'pr-cap' });
    this.flashEl = U.el('div', { class: 'pr-flash' });
    this.skipBtn = U.el('button', { class: 'pr-skip snd', onclick: () => this.skip() }, U.el('span', { text: t('ui.skip') }), U.el('b', { html: WArt.icon('fast', 26) }));
    this.sndEl = U.el('div', { class: 'pr-snd', html: WArt.icon('sound', 28) + '<i></i>' });
    root.append(this.crowd, U.el('i', { class: 'pr-lb top' }), U.el('i', { class: 'pr-lb bot' }), this.cap, this.flashEl, this.skipBtn, this.sndEl);
    this.layout();

    window.addEventListener('keydown', this._kd = e => { if (['Escape', 'Enter', ' '].includes(e.key)) { e.preventDefault(); this.skip(); } });
    document.addEventListener('visibilitychange', this._vis = () => this.onVis());
    this.sndT = setInterval(() => this.soundCheck(), 300);
    Snd.unlock(); // plays at once when the portal page already had a tap; otherwise the first tap here turns it on
    Platform.gameplayStop(); // a cutscene is never gameplay (Poki / CrazyGames)
    Platform.track('tutorial', 'prologue', 'start');
    await Promise.race([paint, U.sleep(500)]);
    this.t0 = performance.now();
    if (document.hidden) this.hiddenAt = this.t0;
    if (this.skipAsk) { this.skip(); return; } // "Skip" pressed while it was still loading
    Snd.music('prologue', { since: this.t0 });
    this.run().catch(e => { console.error(e); this.finish(); });
  },
  exit() {
    this.done = true;
    this.release();
    clearInterval(this.sndT);
    window.removeEventListener('keydown', this._kd);
    document.removeEventListener('visibilitychange', this._vis);
  },
  /** the action happens in a 720×720 "cinema square": full height in landscape, the full width in portrait */
  layout() {
    if (!this.sq) return;
    const port = UI.portrait, k = port ? UI.W / 720 : 1;
    const top = port ? Math.round(U.clamp((UI.H - 720 * k) / 2 - 60, 70, UI.H - 720 * k)) : 0;
    this.k = k;
    this.sq.style.transform = `translate(${((UI.W - 720 * k) / 2).toFixed(1)}px, ${top}px) scale(${k.toFixed(4)})`;
    const st = UI.scene.style;
    st.setProperty('--k', k.toFixed(4)); st.setProperty('--sqt', top + 'px'); st.setProperty('--sqb', Math.round(top + 720 * k) + 'px');
    // the backdrop covers the screen (portrait: scaled to the height and centred)
    const s = port ? UI.H / 720 : 1;
    this.bgw.style.transform = port ? `translate(${((UI.W - 1280 * s) / 2).toFixed(1)}px, 0) scale(${s.toFixed(4)})` : '';
  },
  soundCheck() {
    const live = Snd.live() || (!Snd.musicOn && !Snd.sfxOn);
    if (this.sndEl) this.sndEl.classList.toggle('off', live);
    if (live) clearInterval(this.sndT);
  },

  /* ---------------- timing ---------------- */
  /** the film's clock (ms since it started); it stands still while the page is hidden, like the sound */
  now() { return performance.now() - this.t0 - this.paused - (this.hiddenAt ? performance.now() - this.hiddenAt : 0); },
  /** resolves at ms on the film's clock (at once when the prologue is skipped) */
  at(ms) {
    return new Promise(res => {
      if (this.done) { res(); return; }
      this.waits.push([ms, res]);
      this.pump();
    });
  },
  /** resolve the waits that are due and wake up for the next one */
  pump() {
    clearTimeout(this.pumpT);
    if (this.done) return;
    const now = this.now();
    this.waits = this.waits.filter(([ms, res]) => { if (ms > now) return true; res(); return false; });
    if (this.waits.length && !this.hiddenAt) this.pumpT = setTimeout(() => this.pump(), Math.max(0, Math.min(...this.waits.map(w => w[0])) - now));
  },
  release() {
    clearTimeout(this.pumpT);
    for (const tm of this.timers) clearTimeout(tm);
    for (const [, res] of this.waits) res();
    this.timers = []; this.waits = [];
  },
  /** a hidden tab pauses the film (the sound is paused by Main); it goes on where it was */
  onVis() {
    if (document.hidden) { if (!this.hiddenAt && this.t0) this.hiddenAt = performance.now(); return; }
    if (this.hiddenAt) {
      const d = performance.now() - this.hiddenAt;
      this.paused += d; this.hiddenAt = 0;
      if (Snd.cur === 'prologue') Snd._since += d; // music that only starts later still joins in time
    }
    this.pump();
  },
  skip() {
    if (this.done) return;
    if (!this.t0) { this.skipAsk = true; return; }
    Platform.track('tutorial', 'prologue', 'skip');
    this.finish();
  },
  finish() {
    if (this.leaving) return;
    this.done = true; this.leaving = true;
    this.release();
    Platform.track('tutorial', 'prologue', 'complete');
    // a page reload before the starter is picked goes straight to the Altar (the story was told)
    Main.settings.seenIntro = 1; Main.saveSettings();
    // "Skip" can come while the scene is still fading in (UI.go refuses to start a second change then)
    const go = () => { if (UI.cur !== this) return; if (UI.busyGo) { setTimeout(go, 60); return; } UI.go(IntroScene, {}); };
    go();
  },

  /* ---------------- helpers ---------------- */
  ringSvg() {
    let s = '<circle cx="250" cy="250" r="236" fill="none" stroke="#8ff0ff" stroke-width="3" opacity=".75"/><circle cx="250" cy="250" r="246" fill="none" stroke="#ffffff" stroke-width="1.2" opacity=".5"/><circle cx="250" cy="250" r="168" fill="none" stroke="#8ff0ff" stroke-width="2" opacity=".6"/>';
    for (let i = 0; i < 12; i++) {
      const b = (i + 0.5) / 12 * Math.PI * 2 - Math.PI / 2;
      s += `<path d="M${(250 + Math.cos(b) * 168).toFixed(1)} ${(250 + Math.sin(b) * 168).toFixed(1)}L${(250 + Math.cos(b) * 236).toFixed(1)} ${(250 + Math.sin(b) * 236).toFixed(1)}" stroke="#8ff0ff" stroke-width="2" opacity=".6"/>`;
    }
    for (let i = 0; i < 48; i++) { const b = i / 48 * Math.PI * 2; s += `<circle cx="${(250 + Math.cos(b) * 202).toFixed(1)}" cy="${(250 + Math.sin(b) * 202).toFixed(1)}" r="${i % 4 ? 1.4 : 2.6}" fill="#dffbff" opacity=".7"/>`; }
    return `<svg viewBox="0 0 500 500">${s}</svg>`;
  },
  /** a point of the cinema square → effects-layer coordinates (the camera at rest) */
  pt(x, y) {
    const r = this.sq.getBoundingClientRect(), s = r.width / 720;
    return UI.toFx(r.left + x * s, r.top + y * s);
  },
  /** hard cut of the camera: square point (fx, fy) to the middle at zoom z (z 1 = the wide shot) */
  cut(z, fx = 360, fy = 330) {
    this.cam.style.transform = z === 1 ? '' : `translate(${(360 - fx * z).toFixed(1)}px, ${(330 - fy * z).toFixed(1)}px) scale(${z})`;
  },
  flash(col = '#ffffff', a = 1, ms = 260) {
    this.flashEl.style.background = col;
    return U.anim(this.flashEl, [{ opacity: a }, { opacity: 0 }], { duration: ms, easing: 'ease-out' });
  },
  /** a caption fades in (the one before fades out); no key: the screen is left to the action */
  caption(key, cls) {
    for (const old of Array.from(this.cap.children)) { old.classList.add('out'); setTimeout(() => old.remove(), 450); }
    if (key) this.cap.appendChild(U.el('span', { class: cls || '', html: t(key) }));
  },
  fx(fn) { if (VFX.ok() && !this.done) try { fn(); } catch (e) { console.warn(e); } },
  cls(...c) { if (!this.done) UI.scene.classList.add(...c); },

  /* ---------------- the film ---------------- */
  /** 3.4: ~6.5 s, three bars of 140 bpm and the logo. Players on a portal decide in seconds, so the story is told in
   *  pictures only (no captions until the logo) and every shot is short: signs and Eclipse, the clash, the capture. */
  async run() {
    const B = PROLOGUE_BAR, root = UI.scene;
    this.cls('go'); // letterbox in, the camera drifts, the star rises
    const notes = [440, 523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5, 1568, 1760, 2093];

    /* 1 — the twelve signs light up round the star; the Eclipse slides over it and opens red eyes */
    await this.at(60); if (this.done) return;
    this.cls('s1');
    for (let i = 0; i < 12; i++) {
      await this.at(120 + i * 58); if (this.done) return;
      this.glyphs[i].classList.add('on');
      Snd.note(notes[i], 0.7, 0.05);
      const a = i / 12 * Math.PI * 2 - Math.PI / 2;
      if (i % 2 === 0) this.fx(() => { const [x, y] = this.pt(PR_CX + Math.cos(a) * PR_GR, PR_CY + Math.sin(a) * PR_GR); VFX.stars(x, y, 4, ['#ffffff', '#fff6a0', '#8ff0ff'], { spd: [40, 120], size: [4, 7] }); });
    }
    await this.at(860); if (this.done) return;
    this.cls('lit');
    Snd.play('sparkle');
    this.fx(() => { const [x, y] = this.pt(PR_CX, PR_CY); VFX.ring(x, y, '#fff6a0', 60, 320 * this.k, 600, 6); VFX.flash(x, y, '#fff6c8', 260 * this.k, 500); });
    await this.at(1000); if (this.done) return;
    this.cls('s2', 'quick');
    Snd.play('rumble');
    this.glyphs.slice().reverse().forEach((g, i) => this.timers.push(setTimeout(() => g.classList.add('dim'), 120 + i * 30)));
    await this.at(1340); if (this.done) return;
    this.cls('eclipse');
    this.fx(() => { const [x, y] = this.pt(PR_CX, PR_CY); VFX.ring(x, y, '#ff6a8a', 50, 210 * this.k, 500, 5); });
    await this.at(1480); if (this.done) return;
    this.moon.classList.add('eyes');
    Snd.play('growl');

    /* 2 — the Eclipse becomes the shadow serpent; the sun lion answers: a bolt, two close-ups, the clash */
    await this.at(B); if (this.done) return;
    this.cls('s2b');
    this.fx(() => { const [x, y] = this.pt(PR_CX, PR_CY); VFX.smoke(x, y, 14, '#2a1440', { rx: 80, ry: 50, size: [30, 54], a: [0.5, 0.75], spd: [40, 140], grav: -10 }); const [fx, fy] = this.pt(200, 470); VFX.smoke(fx, fy, 10, '#1a0c2c', { rx: 120, ry: 30, size: [34, 60], a: [0.45, 0.7] }); });
    await this.at(B + 380); if (this.done) return;
    this.flash('#ffffff', 0.85, 150);
    this.cls('s3');
    Snd.play('riser');
    this.fx(() => { const [x, y] = this.pt(560, 300); VFX.aura(x, y, '#ffd23f', 1200); });
    await this.at(B + 560); if (this.done) return;
    this.foe.classList.add('strike');
    Snd.play('thunder');
    this.fx(() => { const [a, b] = this.pt(310, 226), [c, d] = this.pt(505, 400); VFX.bolt(a, b, c, d, { col: '#ff5d8a', glow: '#7a2aff', w: 20, life: 380 }); });
    await this.at(B + 780); if (this.done) return;
    this.cut(2.6, 468, 290); // close-up: the lion's face, a blade of light across it
    this.cls('cu', 'cu-hero');
    Snd.play('slash');
    await this.at(B + 980); if (this.done) return;
    root.classList.remove('cu-hero'); this.cls('cu-foe');
    this.cut(3.2, 280, 214); // close-up: the serpent's burning eye
    Snd.play('growl');
    await this.at(B + 1180); if (this.done) return;
    this.cut(1);
    root.classList.remove('cu', 'cu-foe'); this.cls('charge');
    Snd.play('roar');
    await this.at(B + 1440); if (this.done) return;
    this.cls('clash');
    this.flash('#ffffff', 1, 340);
    Snd.play('boom');
    FX.shake(14, 420);
    this.fx(() => { const [x, y] = this.pt(360, 330); VFX.ring(x, y, '#ffffff', 30, 520 * this.k, 620, 12); VFX.ring(x, y, '#ffd23f', 20, 360 * this.k, 560, 8, { delay: 80 }); VFX.sparks(x, y, 34, ['#ffffff', '#ffe066', '#ff8a2e'], { spd: [300, 900] }); VFX.stars(x, y, 20, ['#fff6a0', '#ffffff'], { spd: [200, 520] }); });

    /* 3 — a Star Orb catches the shadow */
    await this.at(2 * B + 80); if (this.done) return;
    this.cls('s4');
    Snd.play('throw');
    const P = FX.curve(700, 700, 170, 300, 250), kf = [];
    for (let i = 0; i <= 12; i++) { const q = i / 12, [x, y] = P(q); kf.push({ transform: `translate(${(x - 50).toFixed(1)}px, ${(y - 50).toFixed(1)}px) rotate(${Math.round(q * 900)}deg) scale(${(1.6 - q * 0.6).toFixed(2)})` }); }
    U.anim(this.orb, kf, { duration: 420, easing: 'linear', fill: 'forwards' });
    this.fx(() => VFX.shot(q => this.pt(...P(q)), 420, { size: 1, rate: 70, trail: (x, y) => VFX.part({ x, y, shape: 'glow', cols: [Math.random() < 0.5 ? '#fff6a0' : '#8ff0ff'], s0: 14, s1: 2, life: 380 }) }));
    await this.at(2 * B + 500); if (this.done) return;
    this.cls('sucked');
    Snd.play('absorb');
    this.fx(() => { const [x, y] = this.pt(200, 320), [ox, oy] = this.pt(170, 300); VFX.suck(x, y, ox, oy); });
    await this.at(2 * B + 820); if (this.done) return;
    U.anim(this.orb, [{ transform: 'translate(120px, 250px)' }, { transform: 'translate(120px, 440px)', offset: 0.7 }, { transform: 'translate(120px, 416px)', offset: 0.85 }, { transform: 'translate(120px, 440px)' }], { duration: 300, easing: 'ease-in', fill: 'forwards' });
    for (let i = 0; i < 2; i++) {
      await this.at(2 * B + 1140 + i * 240); if (this.done) return;
      this.orb.classList.remove('wob'); void this.orb.offsetWidth; this.orb.classList.add('wob');
      Snd.play('wobble');
      this.fx(() => { const [x, y] = this.pt(170, 476); VFX.wobble(x, y); });
    }
    await this.at(2 * B + 1640); if (this.done) return;
    this.cls('caught');
    Snd.play('catch');
    this.fx(() => { const [x, y] = this.pt(170, 490); VFX.caught(x, y); });

    /* 4 — the logo lands with the Orblings; the title theme takes over */
    await this.at(3 * B + 260); if (this.done) return;
    this.flash('#ffffff', 1, 380);
    VFX.clear(); // the capture's confetti stays in its own shot
    this.cls('s5');
    Snd.music('title');
    Snd.play('vs');
    this.caption('pr.c3', 'under');
    this.fx(() => { const [x, y] = this.pt(360, 220); VFX.stars(x, y, 26, ['#fff6a0', '#ffffff', '#8ff0ff'], { spd: [220, 600], rx: 200 * this.k, ry: 40 }); VFX.ring(x, y, '#fff6a0', 60, 520 * this.k, 700, 6, { flat: 0.4 }); });
    await this.at(3 * B + 1500); if (this.done) return;
    this.finish();
  },
};
