'use strict';
/* New game — the Star Altar (3.1). Sunny Isle's meadow at night, where four stars have just fallen. Pip greets the
 * new Tamer in a speech bubble while the four star orbs burst open on their stone pedestals one by one (3.4: at once,
 * no dialogue to tap through), and the player picks a partner in a beam of light (a card with its element, sign
 * and stars for its stats). The partner leaps to the Tamer, the others fly back to the sky, and at once another star
 * crashes into the grass: a wild Orbling jumps out of the crater and the first battle begins (the catch lesson, on
 * this same night backdrop). No forms on the way: the looks and the name are rolled at random and can be changed later
 * in the Trainer Card (customize()). */

const STARTERS = ['sunkit', 'finnip', 'mossmoo', 'breezle'];
const NAMES = ['Mika', 'Remy', 'Rin', 'Lumi', 'Juno', 'Alex', 'Sam', 'Robin', 'Nico', 'Eden', 'Zuri', 'Tess', 'Ari', 'Noa', 'Pax', 'Kiri'];
const ACCS = [[], ['goggles'], ['cap'], ['headset'], ['bandana'], ['flower'], ['glasses']];
const ALTAR_SEED = 3;
/** the four pedestals (landscape): an arc round the altar, the outer two nearer the viewer */
const STARTER_PADS = [[716, 574], [872, 516], [1028, 516], [1184, 574]];
/** the first wild Orbling complements the starter: it beats whatever the starter is weak against */
const TUT_WILD = { fire: 'breezle', water: 'mossmoo', earth: 'finnip', air: 'fluffire' };
function tutorialWildFor(starter) { return TUT_WILD[SPECIES[starter] && SPECIES[starter].el] || 'fluffire'; }
const EL_GLOW = { fire: '#ff8a2e', water: '#36b8ff', earth: '#6cd84a', air: '#b08cff' };

function randomLook() {
  return { skin: U.pick(WArt.SKINS), hair: U.pick(WArt.HAIRS), hairC: U.pick(WArt.HAIRC), top: U.pick(WArt.SUITS), acc: U.pick(ACCS).slice(), accC: '#ff5d6c' };
}
/** 1–5 stars for a starter's stat, from its zodiac line's weights (shown on the choice card) */
function statStars(id, k) {
  const w = LINES[SPECIES[id].sign].w[{ hp: 0, atk: 1, mag: 2, def: 3, spd: 4 }[k]];
  return w < 0.8 ? 1 : w < 0.9 ? 2 : w < 1 ? 3 : w < 1.1 ? 4 : 5;
}
/** a hexagonal stone plinth with a glowing rune ring on top, lit in the element's colour */
function pedestalSvg(el) {
  const g = EL_GLOW[el] || '#8ff0ff';
  const top = 'M18 38 L52 22 L118 22 L152 38 L118 54 L52 54 Z';
  return `<svg viewBox="0 0 170 96"><defs><radialGradient id="pt${el}" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".35" stop-color="${g}" stop-opacity=".85"/><stop offset="1" stop-color="${g}" stop-opacity="0"/></radialGradient>
  <linearGradient id="ps${el}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5f86"/><stop offset="1" stop-color="#1c2640"/></linearGradient></defs>
  <ellipse cx="85" cy="80" rx="80" ry="15" fill="#020610" opacity=".55"/>
  <path d="M18 38 L18 62 L52 80 L118 80 L152 62 L152 38 L118 54 L52 54 Z" fill="url(#ps${el})" stroke="#0a1224" stroke-width="3" stroke-linejoin="round"/>
  <path d="M52 54 L52 80 M118 54 L118 80" stroke="#0a1224" stroke-width="2.4" opacity=".7"/>
  <path d="M24 44 L24 60 M146 44 L146 60" stroke="#8fa6d0" stroke-width="2" opacity=".35"/>
  <path d="M62 62 l6 8 l6 -8 M96 62 l6 8 l6 -8" stroke="${g}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/>
  <path d="${top}" fill="#5f76a4" stroke="#0a1224" stroke-width="3" stroke-linejoin="round"/>
  <path d="M30 38 L56 26 L114 26 L140 38 L114 50 L56 50 Z" fill="#3a4c74"/>
  <ellipse cx="85" cy="38" rx="44" ry="11" fill="url(#pt${el})"/>
  <ellipse cx="85" cy="38" rx="34" ry="8" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-dasharray="4 5" opacity=".8"/></svg>`;
}
/** the altar's sigil on the ground: two rings, twelve sign marks and a star, glowing teal */
function sigilSvg() {
  let s = '<circle cx="300" cy="300" r="286" fill="none" stroke="#8ff0ff" stroke-width="6" opacity=".55"/><circle cx="300" cy="300" r="266" fill="none" stroke="#ffffff" stroke-width="2" opacity=".45"/><circle cx="300" cy="300" r="190" fill="none" stroke="#8ff0ff" stroke-width="3" opacity=".45"/>';
  SIGNS.forEach((sg, i) => {
    const a = i / 12 * Math.PI * 2 - Math.PI / 2, x = 300 + Math.cos(a) * 228, y = 300 + Math.sin(a) * 228;
    s += `<g transform="translate(${(x - 18).toFixed(1)} ${(y - 18).toFixed(1)}) scale(1.5)"><path d="${sg.glyph}" fill="none" stroke="#dffbff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/></g>`;
  });
  let d = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 70 : 170; d += (i ? 'L' : 'M') + (300 + Math.cos(a) * r).toFixed(1) + ' ' + (300 + Math.sin(a) * r).toFixed(1); }
  s += `<path d="${d}Z" fill="none" stroke="#bff8ff" stroke-width="3" opacity=".5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600"><defs><radialGradient id="sgG"><stop offset="0" stop-color="#8ff0ff" stop-opacity=".35"/><stop offset=".6" stop-color="#8ff0ff" stop-opacity=".08"/><stop offset="1" stop-color="#8ff0ff" stop-opacity="0"/></radialGradient></defs><circle cx="300" cy="300" r="300" fill="url(#sgG)"/>${s}</svg>`;
}

const IntroScene = {
  async enter(p) {
    const root = UI.scene;
    root.className = 'intro altar';
    this.timers = []; this.state = 'intro'; this.chosen = null; this.sel = null; this.card = null; this.battling = false;
    if (!(p && p.keep && this.look)) { this.look = randomLook(); this.name = U.pick(NAMES); } // a language switch keeps them
    await WArt.bake('altar', ALTAR_SEED);
    // the world zooms out of the stars on arrival (the establishing shot); the UI stays outside it
    const world = this.world = U.el('div', { class: 'al-world' });
    world.appendChild(WArt.bgImg('altar', ALTAR_SEED, 'ex-bg'));
    const sky = U.el('div', { class: 'al-sky' });
    for (let i = 0; i < 22; i++) sky.appendChild(U.el('i', { style: { left: U.rf(0, 100).toFixed(1) + '%', top: U.rf(2, 50).toFixed(1) + '%', animationDelay: -U.rf(0, 3).toFixed(2) + 's', animationDuration: U.rf(1.6, 3.4).toFixed(2) + 's' } }));
    sky.appendChild(U.el('b', { class: 'al-shoot' }));
    world.appendChild(sky);
    this.sigil = U.el('div', { class: 'al-sigil' }, U.img(U.svgUrl('altar-sigil', sigilSvg), 'al-sig'));
    world.appendChild(this.sigil);
    world.append(
      U.el('div', { class: 'in-ship' }, U.img(WArt.prop('ship').url)),
      this.profEl = U.el('div', { class: 'in-prof' }, U.img(WArt.person(tamerLook('prof')))),
      this.pipEl = U.el('div', { class: 'in-pip' }, U.img(WArt.pip())),
      this.me = U.el('div', { class: 'in-me' }, U.img(WArt.person(this.look))));
    this.pads = STARTERS.map((id, i) => {
      const sp = SPECIES[id];
      const el = U.el('button', { class: 'al-ped snd el-' + sp.el, style: { '--d': (-i * 0.41).toFixed(2) + 's', '--sz': sp.size, '--g': EL_GLOW[sp.el] }, onclick: () => this.pick(id) },
        U.el('i', { class: 'al-beam' }),
        U.el('i', { class: 'al-stone', html: pedestalSvg(sp.el) }),
        U.el('i', { class: 'al-orb' }, U.el('b')),
        U.el('div', { class: 'al-mon' }, U.img(MonArt.url(id), 'in-mon')),
        U.el('em', { class: 'in-name', html: elIcon(sp.el, 18) + sp.name }));
      world.appendChild(el);
      return { id, el };
    });
    root.appendChild(world);
    this.head = U.el('div', { class: 'al-head' }, U.el('b', { text: t('al.choose') }));
    root.appendChild(this.head);
    root.appendChild(U.el('div', { class: 'ti-corner al-corner' },
      U.el('button', { class: 'rbtn snd', html: WArt.icon('settings', 28), onclick: () => Menus.settings() }),
      U.el('button', { class: 'rbtn snd lang', text: LANG.toUpperCase(), onclick: () => { setLang(nextLang()); Main.saveSettings(); Main.refreshLang(); } })));
    this.layout();
    Snd.music('altar');
    // gameplay (Poki / CrazyGames) starts with the player's first tap or key here, or when the choice opens — never
    // during the establishing shot of someone who only tapped through the opening film
    window.addEventListener('pointerdown', this._gs = () => Platform.gameplayStart(), true);
    window.addEventListener('keydown', this._gs, true);
    window.addEventListener('keydown', this._kd = e => this.onKey(e));
    this.prefetch();
    if (p && p.keep) { this.open(true, true); return; } // a language switch: straight back to the choice
    Platform.track('tutorial', 'starter', 'start');
    this.seq().catch(e => { console.error(e); this.open(true); });
  },
  exit() {
    window.removeEventListener('keydown', this._kd);
    window.removeEventListener('pointerdown', this._gs, true);
    window.removeEventListener('keydown', this._gs, true);
    for (const tm of this.timers) clearTimeout(tm);
    this.timers = [];
    this.state = 'gone';
  },
  alive() { return UI.cur === this && this.state !== 'gone'; },
  wait(ms) { return new Promise(r => this.timers.push(setTimeout(r, ms))); },

  /* ---------------- layout ---------------- */
  /** where starter i stands: an arc round the altar in landscape; portrait: a 2×2 grid under the thumb */
  padXY(i) {
    if (!UI.portrait) return STARTER_PADS[i];
    const y1 = UI.H - 404, y2 = UI.H - 150;
    return [[146, y1], [394, y1], [146, y2], [394, y2]][i];
  },
  layout() {
    if (!this.pads) return;
    this.pads.forEach((p, i) => { const [x, y] = this.padXY(i); p.el.style.left = x + 'px'; p.el.style.top = y + 'px'; });
    const port = UI.portrait;
    const [sx, sy] = this.altarXY();
    Object.assign(this.sigil.style, { left: sx + 'px', top: sy + 'px', width: (port ? 540 : 700) + 'px', height: (port ? 540 : 700) + 'px' });
    UI.scene.classList.toggle('short', port && UI.H < 1110); // no room for Vega and you between the card and the starters
    if (this.card) this.placeCard();
  },
  /** the card: above its pedestal in landscape; portrait: at the top (CSS) */
  placeCard() {
    const [x] = this.padXY(STARTERS.indexOf(this.sel));
    this.card.style.left = UI.portrait ? '' : U.clamp(x - 190, 150, 1280 - 400) + 'px';
  },

  /* ---------------- the sequence ---------------- */
  /** 3.4: no dialogue to sit through — while the camera comes down from the stars, Pip says one line in a bubble and
   *  the four star orbs burst open at once, so the choice is there ~1.5 s after the Altar appears */
  async seq() {
    await this.wait(150); if (!this.alive()) return;
    this.world.classList.add('settle'); // the camera comes down from the stars to the altar
    await this.wait(250); if (!this.alive() || this.state !== 'intro') return; // a tap on a star opens them at once
    this.pipSay(t('al.d1'), 4600);
    await this.open(false);
  },
  /** the four star orbs burst open one after another; then the choice begins (quiet: a language switch came back) */
  async open(instant, quiet) {
    if (!this.alive() || this.state === 'choose') return;
    this.world.classList.add('settle', 'woke');
    for (let i = 0; i < this.pads.length; i++) {
      const P = this.pads[i];
      if (!instant) { await this.wait(i ? 230 : 100); if (!this.alive() || this.state !== 'intro') return; }
      P.el.classList.add('open');
      if (instant) continue;
      Snd.play('shard'); Snd.cry(P.id);
      const [x, y] = this.padXY(i), sp = SPECIES[P.id], cols = VFX.PAL[VFX.EL[sp.el]] || VFX.PAL.star;
      if (VFX.ok()) { VFX.summon(x, y - 34, { cols, dust: '#3a6a70' }); VFX.stars(x, y - 110, 10, cols, { spd: [120, 300] }); }
      else UI.burst(x, y - 90, [EL_GLOW[sp.el], '#ffffff'], 12, 90);
    }
    if (!instant) { await this.wait(320); if (!this.alive() || this.state !== 'intro') return; }
    this.state = 'choose';
    UI.scene.classList.add('choosing');
    Platform.gameplayStart();
    if (!quiet) Platform.track('tutorial', 'starter', 'show');
  },
  onKey(e) {
    if (this.state !== 'choose' || UI.anyModal()) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= STARTERS.length) this.pick(STARTERS[n - 1]);
    else if ((e.key === 'Enter' || e.key === ' ') && this.sel) { e.preventDefault(); this.choose(this.sel); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const n = STARTERS.length, i = STARTERS.indexOf(this.sel), right = e.key === 'ArrowRight';
      this.pick(STARTERS[i < 0 ? (right ? 0 : n - 1) : (i + (right ? 1 : n - 1)) % n]); // nothing chosen yet: from the first / last
    }
  },
  /** paint what the first minute needs while the player is choosing: the partners and the first wilds in battle size,
   *  and your walk cycle for the meadow afterwards */
  prefetch() {
    try {
      for (const id of STARTERS.concat(['fluffire'])) MonArt.painted(id, { size: 'lg', t: 0 });
      for (let i = 0; i < 8; i += MonArt.walkStep()) WArt.painted(this.look, { frame: i });
    } catch (e) { console.warn(e); }
  },
  pick(id) {
    if (this.state !== 'choose') { if (this.state === 'intro' && !UI.anyModal()) this.open(true); if (this.state !== 'choose') return; }
    const again = this.sel === id;
    this.sel = id;
    const sp = SPECIES[id], pad = this.pads.find(p => p.id === id);
    for (const p of this.pads) p.el.classList.toggle('on', p === pad);
    UI.scene.classList.add('picked-one');
    U.anim(pad.el.querySelector('.al-mon'), [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-26px) scale(1.06, .95)' }, { transform: 'translateY(0) scale(1)' }], { duration: 380, easing: 'ease-out' });
    Snd.play('pop'); Snd.cry(id);
    if (again && this.card) return;
    if (this.card) this.card.remove();
    const row = (k) => U.el('div', { class: 'al-stat' }, U.el('span', { text: t('stat.' + k) }), U.el('i', { class: 'al-stars', html: '<b>' + '★'.repeat(statStars(id, k)) + '</b>' + '★'.repeat(5 - statStars(id, k)) }));
    this.card = U.el('div', { class: 'al-card el-' + sp.el, style: { '--g': EL_GLOW[sp.el] } },
      U.el('div', { class: 'al-ct' }, U.el('b', { text: sp.name }), U.el('div', { class: 'row tight' }, UI.elBadge(sp.el), U.el('span', { class: 'in-sign', html: signIcon(sp.sign, 24) + t('sign.' + sp.sign) }))),
      U.el('small', { text: t('std.' + id) }),
      U.el('div', { class: 'al-stats' }, ...['atk', 'mag', 'def', 'spd'].map(row)),
      U.el('button', { class: 'btn green al-go', text: t('in.choose', { name: sp.name }), onclick: () => this.choose(id) }));
    UI.scene.appendChild(this.card);
    this.placeCard();
  },

  /* ---------------- the choice, and straight into the first battle ---------------- */
  async choose(id) {
    if (this.state !== 'choose' || this.chosen) return;
    this.chosen = id; this.state = 'chosen';
    try { await this.celebrate(id); } catch (e) { console.error(e); this.toBattle(id); } // a hiccup never blocks the first battle
  },
  /** the partner joins (beam, leap, banner), the others go back to the sky, a star falls — then the battle */
  async celebrate(id) {
    if (this.card) { this.card.remove(); this.card = null; }
    UI.scene.classList.add('chosen');
    const sp = SPECIES[id], i = STARTERS.indexOf(id), P = this.pads[i];
    const [x0, y0] = this.padXY(i), [tx, ty] = this.besideMe();
    Snd.play('select'); Snd.play('levelup'); Snd.cry(id);
    Game.newGame(this.name, this.look, id);
    Platform.track('tutorial', 'starter', 'complete');
    // the chosen one's beam flares; it leaps over to you
    P.el.classList.add('picked');
    if (VFX.ok()) { VFX.summon(x0, y0 - 30, { cols: VFX.PAL[VFX.EL[sp.el]] || VFX.PAL.star, big: true }); VFX.stars(x0, y0 - 120, 18, ['#fff6a0', '#ffffff', EL_GLOW[sp.el]], { spd: [160, 380] }); }
    const mon = P.el.querySelector('.al-mon'), dx = tx - x0, dy = ty - y0;
    await this.wait(260);
    U.anim(mon, [{ transform: 'translate(0, 0)' }, { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 170}px) rotate(${dx < 0 ? -14 : 14}deg) scale(1.08)`, offset: 0.5 }, { transform: `translate(${dx}px, ${dy}px)` }], { duration: 720, easing: 'cubic-bezier(.3,.6,.5,1)', fill: 'forwards' });
    // the others turn into light and fly back up to the stars
    this.pads.forEach((q, k) => { if (q !== P) setTimeout(() => this.toSky(q, k), 120 + k * 110); });
    await this.wait(760); if (!this.alive()) return;
    if (VFX.ok()) { VFX.smoke(tx, ty - 4, 8, '#3a6a70', { rx: 50 }); VFX.ring(tx, ty - 4, '#ffffff', 16, 120, 420, 5, { flat: 0.3 }); }
    this.banner(t('al.joined', { name: sp.name }));
    Snd.play('win');
    await this.wait(1250); if (!this.alive()) return;
    await this.meteor(id);
    this.toBattle(id);
  },
  /** the first battle: the catch lesson against the Orbling from the crater, on the Altar's night backdrop */
  toBattle(starter) {
    if (this.battling) return;
    this.battling = true;
    const mon = Game.makeMon(tutorialWildFor(starter), 2, { noShiny: true });
    Platform.track('tutorial', 'battle', 'start');
    const go = () => { if (UI.cur !== this) return; if (UI.busyGo) { setTimeout(go, 60); return; } UI.go(BattleScene, { kind: 'wild', enemies: [mon], zone: 'clover', tutorial: true, first: true, bg: ['altar', ALTAR_SEED] }, { trans: 'battle' }); };
    go();
  },
  /** where the partner lands: next to you */
  besideMe() {
    if (UI.portrait) return UI.scene.classList.contains('short') ? [270, UI.H - 560] : [262, UI.H - 548];
    return [610, 560];
  },
  /** the middle of the altar (the sigil; the second star falls there) */
  altarXY() { return UI.portrait ? [270, UI.H - 276] : [950, 548]; },
  toSky(q, k) {
    if (!this.alive()) return;
    const [x, y] = this.padXY(k), sp = SPECIES[q.id];
    q.el.classList.add('gone');
    Snd.play('warp');
    if (VFX.ok()) {
      VFX.dissolve(x, y - 80, [EL_GLOW[sp.el], '#ffffff', '#fff6a0']);
      VFX.shot(t => [x + t * 60, y - 90 - t * (y + 40)], 700, { size: 9, cols: [EL_GLOW[sp.el], '#ffffff'], trail: (px, py) => VFX.part({ x: px, y: py, shape: 'glow', cols: [EL_GLOW[sp.el]], s0: 10, s1: 1, life: 420 }) });
    }
  },
  /** a streak banner across the screen ("Sunkit joins your team!") */
  banner(text) {
    const b = U.el('div', { class: 'go-banner l al-banner' }, U.el('b', { text }));
    // long names and languages still fit on one line (portrait is 540 wide)
    b.firstChild.style.fontSize = Math.min(UI.portrait ? 36 : 56, Math.floor((UI.portrait ? 500 : 1180) / (text.length * 0.6))) + 'px';
    UI.scene.appendChild(b);
    this.timers.push(setTimeout(() => b.remove(), 1400));
  },
  /** Pip's short bubble that needs no tap */
  pipSay(html, ms = 2200) {
    if (this.pipBub) this.pipBub.remove();
    const b = this.pipBub = U.el('div', { class: 'pip-say al-say', html });
    // over Pip; on a short phone (the characters are hidden there) at the top of the screen
    if (this.pipEl.offsetParent) this.pipEl.appendChild(b); else { b.classList.add('top'); UI.scene.appendChild(b); }
    this.timers.push(setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 400); }, ms));
  },
  /** another star falls into the grass; a wild Orbling jumps out of the crater and the first battle begins */
  async meteor(starter) {
    const sp = tutorialWildFor(starter), [cx, cy0] = this.altarXY(), cy = cy0 + 24;
    this.pipSay(t('al.star'));
    Snd.play('meteor');
    const m = U.el('i', { class: 'al-meteor' });
    m.style.left = cx + 'px'; m.style.top = cy + 'px';
    this.world.appendChild(m);
    await this.wait(620); if (!this.alive()) return;
    m.remove();
    Snd.play('boom');
    FX.shake(12, 420);
    if (VFX.ok()) {
      VFX.flash(cx, cy - 20, '#fff6c8', 260, 420);
      VFX.ring(cx, cy, '#fff6a0', 20, 220, 560, 8, { flat: 0.3 });
      VFX.sparks(cx, cy - 10, 26, ['#ffffff', '#fff066', '#8ff0ff'], { spd: [200, 600], ang: [-Math.PI * 0.95, -Math.PI * 0.05] });
      VFX.smoke(cx, cy - 6, 14, '#4a5a70', { rx: 70, size: [26, 44] });
    }
    const crater = U.el('i', { class: 'al-crater' });
    crater.style.left = cx + 'px'; crater.style.top = cy + 'px';
    this.world.appendChild(crater);
    await this.wait(420); if (!this.alive()) return;
    // the wild one hops out of the smoke, sees you — "!"
    const w = U.el('div', { class: 'al-wild' }, U.img(MonArt.url(sp), ''), U.el('b', { class: 'emote red', text: '!' }));
    w.style.left = cx + 'px'; w.style.top = cy + 'px'; w.style.setProperty('--sz', SPECIES[sp].size);
    this.world.appendChild(w);
    Snd.cry(sp); Snd.play('notice');
    await this.wait(900);
  },

  /** the Tamer look & name editor (Trainer Card → "Change look"); resolves with { look, name } or null */
  customize(look, name) {
    return new Promise(res => {
      look = Object.assign({}, look, { acc: (look.acc || []).slice() });
      const prev = U.img(WArt.person(look), 'cz-img');
      const upd = () => { prev.src = WArt.person(look); for (const f of hairFaces) f.img.src = WArt.person(Object.assign({}, look, { hair: f.hair })); };
      const swatches = (list, key) => U.el('div', { class: 'swatches' }, ...list.map(c => U.el('button', { class: 'sw snd' + (look[key] === c ? ' on' : ''), style: { background: c }, onclick: e => { look[key] = c; U.$$('.sw', e.target.parentNode).forEach(b => b.classList.remove('on')); e.target.classList.add('on'); upd(); } })));
      const hairFaces = WArt.HAIRS.map(h => ({ hair: h, img: U.img(WArt.person(Object.assign({}, look, { hair: h })), 'cz-face') }));
      const hairs = U.el('div', { class: 'swatches' }, ...hairFaces.map(f => U.el('button', { class: 'chc face snd' + (look.hair === f.hair ? ' on' : ''), onclick: e => { look.hair = f.hair; U.$$('.chc', e.currentTarget.parentNode).forEach(b => b.classList.remove('on')); e.currentTarget.classList.add('on'); upd(); } }, f.img)));
      let accI = Math.max(0, ACCS.findIndex(a => a.join() === (look.acc || []).join()));
      const accs = U.el('div', { class: 'swatches' }, ...ACCS.map((v, i) => U.el('button', { class: 'chc snd' + (accI === i ? ' on' : ''), text: i ? t('acc.' + v[0]) : t('acc.none'), onclick: e => { accI = i; look.acc = v.slice(); U.$$('.chc', e.target.parentNode).forEach(b => b.classList.remove('on')); e.target.classList.add('on'); upd(); } })));
      const input = U.el('input', { class: 'cz-name', type: 'text', maxlength: '12', value: name, spellcheck: 'false', autocomplete: 'off' });
      input.addEventListener('input', () => { name = input.value.replace(/[<>&"]/g, '').slice(0, 12); });
      const dice = U.el('button', { class: 'btn sm', html: WArt.icon('star', 22), onclick: () => { name = U.pick(NAMES); input.value = name; } });
      const rows = U.el('div', { class: 'cz-rows' },
        U.el('div', { class: 'cz-row' }, U.el('label', { text: t('cz.name') }), U.el('div', { class: 'row tight left' }, input, dice)),
        U.el('div', { class: 'cz-row' }, U.el('label', { text: t('cz.skin') }), swatches(WArt.SKINS, 'skin')),
        U.el('div', { class: 'cz-row' }, U.el('label', { text: t('cz.hair') }), hairs),
        U.el('div', { class: 'cz-row' }, U.el('label', { text: t('cz.hairc') }), swatches(WArt.HAIRC, 'hairC')),
        U.el('div', { class: 'cz-row' }, U.el('label', { text: t('cz.suit') }), swatches(WArt.SUITS, 'top')),
        U.el('div', { class: 'cz-row' }, U.el('label', { text: t('cz.acc') }), accs));
      const body = U.el('div', { class: 'customize' }, U.el('div', { class: 'cz-prev' }, prev), U.el('div', { class: 'cz-right' }, rows,
        U.el('div', { class: 'row' }, U.el('button', { class: 'btn lg green', text: t('ui.save'), onclick: () => { if (!name.trim()) name = U.pick(NAMES); done = true; h.close(true); res({ look, name }); } }))));
      let done = false;
      const h = UI.modal({ title: t('cz.title'), body, cls: 'wide', onClose: () => { if (!done) res(null); } });
    });
  },
};
