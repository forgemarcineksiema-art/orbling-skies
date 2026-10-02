'use strict';
/* Battle scene: 1v1 turn-based fights (team of up to 3). Physical moves are free, Star moves use
 * energy and carry the element; the Star Sign grants a trait. Wild Orblings can be caught with orbs
 * after a timing mini-game. Kinds: wild | tamer | guardian | arena | legend. Every move has its own
 * animation (FX), statuses stay visible on the sprites, AUTO and ×2 speed are one tap away. */

const EL_FX = {
  fire: ['#ffe066', '#ff8a2e', '#ff4a26'], water: ['#bfe9ff', '#36a3ff', '#ffffff'], earth: ['#8fd46b', '#a0764e', '#5cb947'],
  air: ['#e4dcff', '#a07cff', '#fff6a0'], none: ['#ffffff', '#ffe066', '#ffd0a0'],
};
// the two fighters' feet in arena coordinates: side by side on one ground line in landscape,
// diagonal in portrait (the foe further back on the right, yours in front on the left)
let PX = 345, PY = 506, EX = 935, EY = 506;
const ST_COL = { burn: '#ff7a2e', poison: '#b05cff', shock: '#ffd23f', sleep: '#9fb8ff', freeze: '#8fe3ff' };

const BattleScene = {
  async enter(p) {
    this.p0 = p;
    this.kind = p.kind;
    this.e = this.p = null; this.charge = null; // (the scene object lives on: nothing from the last battle leaks in)
    this.over = false; this.busy = true; this.newEnemy = false; this.newPlayer = false;
    this.tamerId = p.tamer || null;
    this.T = this.tamerId ? TAMERS[this.tamerId] : null;
    this.eTeam = p.enemies;
    this.zoneId = p.zone || 'clover';
    this.alpha = !!p.alpha;
    this.star = !!p.star; // 3.5: born from a falling star (a better catch, great potential)
    this.enMap = {}; this.stMap = {}; this.leveled = new Set(); this.skipXp = null; this.xpLog = {}; this.endured = new Set();
    this.hintShown = {};
    this.autoHold = false;
    const z = ZONES[this.zoneId] || (this.zoneId === 'yard' ? YARD : HOME); // a visitor at the Base
    // the backdrop: the zone's at the hour it is (3.4.1), the Arena's, or the one the fight started in (the first battle:
    // the Star Altar at night)
    const [bgB, bgS] = p.bg || (this.kind === 'arena' ? ['arena', 5] : [z.biome, z.seed]);
    const tod = p.bg || this.kind === 'arena' ? '' : zoneTod(z);
    // the isle's weather comes into the fight (not at the Altar, in the Arena or before a legend)
    BL.wx = p.bg || this.kind === 'arena' || this.kind === 'legend' ? '' : Weather.ofZone(this.zoneId);
    await WArt.bake(bgB, bgS, tod);
    const root = UI.scene;
    root.className = 'battle' + (this.kind === 'legend' ? ' legend' : '') + (this.kind === 'arena' ? ' arena' : '');
    const arena = this.arenaEl = U.el('div', { class: 'stage16 b-arena' });
    root.appendChild(arena);
    const wxl = Weather.layers(BL.wx, bgB, { y0: 330, y1: 700 });
    arena.append(WArt.bgImg(bgB, bgS, 'b-bg', tod), wxl.sky, U.el('div', { class: 'b-dim' }));
    if (this.tamerId) {
      this.tamerEl = U.el('div', { class: 'b-tamer' }, U.img(WArt.person(tamerLook(this.tamerId))));
      arena.appendChild(this.tamerEl);
    } else this.tamerEl = null;
    this.monE = this.slot('e'); this.monP = this.slot('p');
    if (this.alpha) this.monE.wrap.classList.add('alpha');
    arena.append(this.monE.wrap, this.monP.wrap, wxl.front);
    this.cardE = U.el('div', { class: 'b-card bp e' }); this.cardP = U.el('div', { class: 'b-card bp p' });
    root.append(this.cardE, this.cardP);
    // the control bar: big octagon portrait, team strip, battle log, 2×2 moves around the turn dial, item / run
    this.msg = U.el('div', { class: 'b-msg' });
    this.movesEl = U.el('div', { class: 'b-moves' });
    this.sideEl = U.el('div', { class: 'b-side' });
    this.porEl = U.el('div', { class: 'b-por' });
    this.teamEl = U.el('div', { class: 'b-team' });
    this.dial = U.el('button', { class: 'b-dial snd', onclick: () => { if (this.kind === 'wild') this.onCatch(); } }, U.el('span', { class: 'bd-orbit', html: this.dialRing() }),
      U.el('span', { class: 'bd-chance', html: '<svg viewBox="0 0 140 140"><circle class="bd-track" cx="70" cy="70" r="62"/><circle class="bd-arc" cx="70" cy="70" r="62" pathLength="100" stroke-dasharray="0 100" transform="rotate(-90 70 70)"/></svg>' }),
      U.el('span', { class: 'bd-core' }));
    this.panel = U.el('div', { class: 'b-panel lock' }, this.porEl, this.teamEl, this.msg, this.movesEl, this.dial, this.sideEl);
    root.appendChild(this.panel);
    this.buildSide();
    this.buildCtrl();
    this.layout();
    this.cardE.style.visibility = 'hidden'; this.cardP.style.visibility = 'hidden';
    UI.hudShow(false);
    Painter.hold('battle', true); // the bestiary paints on after the fight, not during it
    if (this.kind === 'wild') for (const id of ORB_IDS) if (Game.item(id) > 0) { WArt.orbPart(id, 'core'); WArt.orbPart(id, 'belt'); } // the catch's orb, painted in time
    Snd.music(this.bossy() ? 'boss' : 'battle');
    Platform.gameplayStart();
    Game.s.stats.battles++;
    window.addEventListener('keydown', this._kd = e => this.onKey(e));
    // blinking: every fighter shuts its eyes for a moment now and then
    clearInterval(this.blinkT);
    // the fighters' idle loops (flames flicker, tails sway, wings flutter …) at ~5 fps, with a blink as a loop starts over
    this.blinkT = setInterval(() => {
      for (const sl of [this.monE, this.monP]) {
        if (!sl || !sl.paint) continue;
        const L = sl.paint.loop;
        sl.it = (sl.it || 0) + 0.5 * L.length / MonArt.FRAMES; // the same 1.2 s loop with fewer pictures in lite mode
        const k = Math.floor(sl.it) % L.length;
        sl.bt = (sl.bt == null ? U.ri(10, 30) : sl.bt) - 1;
        let src = L[k];
        if (k === 0 && sl.bt <= 0 && sl.paint.blink) { if (sl.it % 1 < 0.5) src = sl.paint.blink; else sl.bt = U.ri(24, 50); }
        if (sl.cur !== src) { sl.img.src = src; sl.cur = src; }
      }
    }, 100);
    // the painted fighters are ready before the curtain opens (or after 2.5 s at most)
    const firstE = this.eTeam.find(m => m.hp > 0), firstP = Game.team().find(m => m.hp > 0);
    await Promise.race([Promise.all([firstE && this.paintFirst(firstE), firstP && this.paintFirst(firstP)]), U.sleep(2500)]);
    setTimeout(() => this.intro().catch(e => console.error(e)), 300);
  },
  exit() {
    BL.wx = '';
    clearInterval(this.blinkT);
    Capture.settle(this);
    Painter.hold('battle', false);
    window.removeEventListener('keydown', this._kd);
    clearTimeout(this.autoT);
    this.over = true;
  },
  bossy() { return this.kind === 'guardian' || this.kind === 'legend' || !!(this.T && this.T.champ); },
  trainer() { return this.kind === 'tamer' || this.kind === 'guardian' || this.kind === 'arena'; },

  /* ---------------- DOM ---------------- */
  slot(side) {
    const wrap = U.el('div', { class: 'b-mon ' + side });
    const shadow = U.el('div', { class: 'b-shadow' });
    const spr = U.el('div', { class: 'b-sprite' });
    const img = U.img('', 'b-img');
    const ov = U.el('div', { class: 'st-ov' });
    spr.append(img, ov);
    wrap.append(shadow, spr);
    spr.style.opacity = 0;
    return { wrap, spr, img, ov, shadow, side };
  },
  /** landscape: the classic side-on stage; portrait: the arena window on top (fighters diagonal), the controls below */
  layout() {
    if (!this.arenaEl) return;
    Capture.camReset(); // (a camera push-in during a catch would hold on to the old transforms)
    const port = UI.portrait;
    [PX, PY, EX, EY] = port ? [450, 640, 840, 420] : [345, 506, 935, 506];
    for (const [w, x, y] of [[this.monP.wrap, PX, PY], [this.monE.wrap, EX, EY]]) { w.style.left = x + 'px'; w.style.top = y + 'px'; }
    const short = port && UI.H < 1020;
    UI.scene.classList.toggle('short', short);
    if (!port) { this.win = null; this.arenaEl.style.transform = ''; UI.stageXform(''); UI.scene.style.removeProperty('--ph'); this.placeHint(); return; }
    const ph = short ? 400 : 480, R = UI.H - ph; // the control panel's height; the arena window above it
    const s = UI.W / 700; // the window shows x 295..995 of the stage
    // both fighters centred in the window below the foe's plate, yours never sinking into the panel
    const ty = Math.round(Math.min(R - 36 - PY * s, (120 + R) / 2 - (EY - 262 + PY + 20) / 2 * s));
    this.win = { s, ty, R };
    const t = `translate(${(-295 * s).toFixed(1)}px, ${ty}px) scale(${s.toFixed(4)})`;
    this.arenaEl.style.transform = t;
    UI.stageXform(t);
    // the backdrop is zoomed about the ground so that it also fills the window above the stage
    this.arenaEl.style.setProperty('--bgk', Math.max(1.35, (518 + ty / s + 24) / 518, ((R - ty) / s - 518 + 8) / 202).toFixed(3));
    UI.scene.style.setProperty('--ph', ph + 'px');
    this.placeHint();
  },
  /** the part of the arena on screen, in stage coordinates (landscape: all of it above the panel; portrait: the window) */
  view() {
    if (!this.win) return { x0: 0, y0: 0, x1: 1280, y1: 560 };
    const { s, ty, R } = this.win;
    return { x0: 295, y0: -ty / s, x1: 995, y1: (R - ty) / s };
  },
  /** the first (rest) frame of a fighter, large and painted */
  paintFirst(mon) { return MonArt.painted(mon.sp, { shiny: mon.shiny, size: 'lg', t: 0, urgent: true }); },
  /** the whole idle loop + blink, large and painted, decoded before use → Promise<{loop, blink}> */
  paintFighter(mon) {
    const n = MonArt.frames(), o = { shiny: mon.shiny, size: 'lg' }, fr = [];
    for (let i = 0; i < n; i++) fr.push(MonArt.painted(mon.sp, Object.assign({ t: i / n }, o)));
    const dec = u => { const im = new Image(); im.src = u; return (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => u); };
    return Promise.all([Promise.all(fr), MonArt.painted(mon.sp, Object.assign({ blink: true }, o))]).then(([loop, blink]) => Promise.all([Promise.all(loop.map(dec)), dec(blink)])).then(([loop, blink]) => ({ loop, blink }));
  },
  setSprite(slot, f) {
    for (const el of [slot.spr, slot.wrap, slot.img]) el.getAnimations().forEach(a => { if (!(window.CSSAnimation && a instanceof CSSAnimation)) a.cancel(); });
    slot.img.src = MonArt.url(f.mon.sp, { shiny: f.mon.shiny });
    slot.paint = null; slot.cur = null;
    const tok = slot.tok = {};
    this.paintFirst(f.mon).then(u => { if (slot.tok === tok && !slot.paint) { slot.img.src = u; slot.cur = u; } });
    this.paintFighter(f.mon).then(P => { if (slot.tok === tok) slot.paint = P; });
    const size = 262 * f.sp.size * (this.kind === 'legend' && slot.side === 'e' ? 1.14 : 1) * (f.alpha ? 1.08 : 1);
    slot.spr.style.width = size + 'px'; slot.spr.style.height = size + 'px';
    slot.spr.classList.toggle('floating', MonArt.floats(f.mon.sp));
    slot.size = size;
    this.statusOverlay(slot, null);
    f.slot = slot;
  },
  /** persistent status visuals on the sprite (flames, bubbles, Zzz, sparks, ice) */
  statusOverlay(slot, st) {
    if (!slot || !slot.ov) return;
    if (slot.st === st) return;
    slot.st = st;
    slot.ov.className = 'st-ov' + (st ? ' ' + st : '');
    slot.ov.innerHTML = st ? '<i></i><i></i><i></i>' : '';
    slot.spr.classList.remove('sts-burn', 'sts-poison', 'sts-shock', 'sts-sleep', 'sts-freeze');
    if (st) slot.spr.classList.add('sts-' + st);
  },
  center(f) {
    const s = f.slot;
    return s.side === 'e' ? [EX, EY - s.size * 0.46] : [PX, PY - s.size * 0.46];
  },
  ground(f) { return f.slot.side === 'e' ? [EX, EY] : [PX, PY]; },
  /** FX context for A acting on D */
  fxc(A, D, miss) { return { a: this.center(A), d: this.center(D), dir: A.side === 'p' ? 1 : -1, aSlot: A.slot, dSlot: D.slot, aGround: this.ground(A), dGround: this.ground(D), miss: !!miss }; },
  nameOf(f) {
    if (f.side !== 'e') return f.sp.name;
    if (this.kind === 'wild') return t(f.alpha ? 'b.alphap' : f.star ? 'b.starp' : 'b.wildp') + f.sp.name;
    return t('b.foep') + f.sp.name;
  },

  renderCard(side) {
    const f = side === 'e' ? this.e : this.p, el = side === 'e' ? this.cardE : this.cardP;
    el.innerHTML = '';
    el.style.visibility = '';
    el.classList.toggle('alpha', !!f.alpha);
    const sp = f.sp;
    const role = side === 'p' ? '' : f.alpha ? t('b.alpha') : f.star ? t('sf.tag') : this.kind === 'wild' ? t('b.wild_tag') : this.kind === 'legend' ? t('b.legend_tag') : t('b.foe_tag');
    el.append(U.el('div', { class: 'bp-top' },
      U.el('span', { class: 'bp-sign', html: signIcon(sp.sign, 40) }),
      U.el('b', { class: 'bp-name' + (f.alpha ? ' gold' : sp.legend ? ' legend' : ''), text: sp.name }),
      f.mon.shiny ? U.el('span', { class: 'bp-shiny', text: '✦' }) : null,
      side === 'e' && Game.caught(sp.id) && this.kind === 'wild' ? U.el('span', { class: 'bp-own', title: t('b.owned'), html: `<img src="${WArt.item('orb')}">` }) : null,
      role ? U.el('em', { class: 'bp-role', text: role }) : null));
    if (side === 'e' && (this.kind === 'wild' || this.kind === 'legend')) el.firstChild.appendChild(U.el('i', { class: 'bp-rar r-' + sp.rarity, text: t('rar.' + sp.rarity) }));
    f.hpBar = UI.bar(1, 'hp');
    f.hpTxt = U.el('span', { class: 'bp-hpt' });
    el.append(U.el('div', { class: 'bp-bar' }, f.hpBar, f.hpTxt));
    f.stEl = U.el('span', { class: 'bc-st' });
    const bot = U.el('div', { class: 'bp-bot' }, U.el('span', { class: 'bp-lv', text: t('ui.lv') + ' ' + f.mon.lv }), U.el('span', { class: 'bp-el', html: elIcon(sp.el, 20) }), f.stEl);
    el.appendChild(bot);
    if (side === 'p') {
      f.enEl = U.el('div', { class: 'bc-en' });
      f.xpBar = UI.bar(0, 'xp');
      bot.appendChild(f.enEl);
      el.appendChild(U.el('div', { class: 'bp-xp' }, f.xpBar));
      this.updEn(f); this.updXp(f);
      this.renderBar();
    } else if (this.tamerId) {
      const dots = U.el('div', { class: 'bc-team' });
      this.eTeam.forEach(m => dots.appendChild(U.el('i', { class: m.hp > 0 ? 'on' : '' })));
      bot.appendChild(dots);
    }
    this.updHp(f, true);
    this.updStatus(f);
  },
  /** bottom bar: the active Orbling in the octagon frame and the team strip (tap a teammate to switch) */
  renderBar() {
    if (!this.p) return;
    const f = this.p;
    this.porEl.className = 'b-por el-' + f.sp.el;
    this.porEl.innerHTML = '';
    this.porEl.append(U.el('i', { class: 'bpo-sw' }), U.img(MonArt.url(f.mon.sp, { shiny: f.mon.shiny, anim: false }), 'bpo-img'));
    this.teamEl.innerHTML = '';
    Game.team().forEach((m, i) => {
      const fr = U.clamp(m.hp / Game.maxHp(m), 0, 1), cur = m === f.mon;
      const hp = U.el('span', { class: 'sq-hp ' + UI.hpClass(fr) }, U.el('i'));
      hp.firstChild.style.width = (fr * 100) + '%';
      this.teamEl.appendChild(U.el('button', { class: 'sq snd el-' + SPECIES[m.sp].el + (cur ? ' lead' : '') + (m.hp <= 0 ? ' ko' : ''), title: SPECIES[m.sp].name, onclick: () => this.onSwitch(i) },
        UI.monPortrait(m), U.el('b', { class: 'sq-lv', text: m.lv }), hp));
    });
  },
  /** the ring of the turn dial: "YOUR TURN · YOUR TURN ·" set around a circle */
  dialRing() {
    return '<svg viewBox="0 0 140 140"><circle cx="70" cy="70" r="69" fill="none" stroke="rgba(160,230,255,.45)" stroke-width="2" stroke-dasharray="2 7"/><path d="M70 -4l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="#fff6a0" stroke="#060b12" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  },
  updHp(f, instant) {
    if (!f.hpBar) return;
    const fr = U.clamp(f.mon.hp / f.maxHp, 0, 1);
    f.hpBar.className = 'bar ' + UI.hpClass(fr);
    if (instant) { f.hpBar.firstChild.style.transition = 'none'; void f.hpBar.offsetWidth; }
    f.hpBar.firstChild.style.width = (fr * 100) + '%';
    if (instant) setTimeout(() => { if (f.hpBar) f.hpBar.firstChild.style.transition = ''; }, 30);
    if (f.hpTxt) f.hpTxt.textContent = Math.max(0, Math.ceil(f.mon.hp)) + ' / ' + f.maxHp;
    if (f === this.e) this.updCatch();
  },
  /** live catch chance on the Catch button (best orb in the bag); a one-time hint when the foe is weak */
  updCatch() {
    if (this.kind !== 'wild' || !this.chanceEl || !this.e) return;
    const orbs = ORB_IDS.filter(id => Game.item(id) > 0);
    const p = orbs.length ? Math.max(...orbs.map(id => BL.catchChance(this.e, id, 1))) : 0;
    const pct = Math.round(p * 100);
    this.chanceEl.textContent = orbs.length ? pct + '%' : '0';
    const arc = this.dial.querySelector('.bd-arc');
    if (arc) arc.setAttribute('stroke-dasharray', (orbs.length ? pct : 0) + ' 100');
    this.chanceEl.className = 'sb-chance ' + (p >= 0.5 ? 'hi' : p >= 0.25 ? 'mid' : 'lo');
    const btn = this.dial;
    btn.classList.remove('lo', 'mid', 'hi');
    btn.classList.add(p >= 0.5 ? 'hi' : p >= 0.25 ? 'mid' : 'lo');
    btn.classList.toggle('ripe', orbs.length > 0 && p >= 0.45 && !this.over);
    if (!this.p0.tutorial && orbs.length && p >= 0.45 && Game.s.stats.catches < 5 && !this.over && btn) this.hint('b.hint_catch', btn);
  },
  updEn(f) {
    if (!f || !f.enEl) return;
    f.enEl.innerHTML = '';
    for (let i = 0; i < f.maxEn; i++) f.enEl.appendChild(U.el('i', { class: i < f.en ? 'on' : '' }));
  },
  updXp(f) {
    if (!f.xpBar) return;
    const m = f.mon;
    f.xpBar.firstChild.style.width = (m.lv >= MAX_LV ? 100 : m.xp / Game.xpNeed(m.lv) * 100) + '%';
  },
  updStatus(f) {
    if (f === this.e) setTimeout(() => this.updCatch(), 0);
    if (!f.stEl) return;
    f.stEl.innerHTML = f.status ? `<em class="st st-${f.status}">${t('st.' + f.status)}</em>` : '';
    if (f.slot) this.statusOverlay(f.slot, f.mon.hp > 0 ? f.status : null);
  },

  buildSide() {
    this.chanceEl = null; // (the scene object lives on: a wild battle's chance label must not leak into a tamer battle)
    const b = (id, ic, fn, cls) => U.el('button', { class: 'sb snd ' + (cls || ''), onclick: fn }, U.el('em', { text: t('b.' + id) }), U.el('span', { class: 'sb-ic', html: WArt.icon(ic, 26) }));
    this.sideEl.append(b('items', 'bag', () => this.onItems(), 'sb-items'), b('run', 'run', () => this.onRun(), 'sb-run'));
    U.$('.sb-items .sb-ic', this.sideEl).innerHTML = `<img src="${HudArt.bag()}" alt="">`;
    if (this.kind !== 'wild') U.$('.sb-run', this.sideEl).classList.add('off');
    const core = U.$('.bd-core', this.dial);
    if (this.kind === 'wild') {
      this.dial.classList.add('catch', 'sb-catch');
      core.append(U.img(WArt.item('orb'), 'bd-orb'), U.el('b', { class: 'bd-cap', text: t('b.catch_btn') }), this.chanceEl = U.el('i', { class: 'sb-chance' }));
    } else {
      this.dial.classList.add('turn');
      core.append(U.el('span', { class: 'bd-star', html: WArt.icon('star', 40) }), U.el('b', { class: 'bd-turn', text: t('b.turn') }));
    }
  },
  /* AUTO & ×2 speed toggles (top-right) */
  buildCtrl() {
    this.autoBtn = U.el('button', { class: 'bctl snd', title: t('b.auto'), onclick: () => this.toggleAuto() }, U.el('span', { html: WArt.icon('auto', 26) }), U.el('em', { text: t('b.auto') }));
    this.fastBtn = U.el('button', { class: 'bctl snd', title: t('set.fast'), onclick: () => { Main.settings.fast = !Main.settings.fast; Main.saveSettings(); this.updCtrl(); } }, U.el('span', { html: WArt.icon('fast', 26) }), U.el('em', { text: '×2' }));
    this.ctrl = U.el('div', { class: 'b-ctrl' + (this.p0.tutorial ? ' hide' : '') }, this.autoBtn, this.fastBtn);
    UI.scene.appendChild(this.ctrl);
    this.updCtrl();
  },
  updCtrl() {
    if (!this.autoBtn) return;
    this.autoBtn.classList.toggle('on', !!Main.settings.auto && !this.autoHold);
    this.autoBtn.classList.toggle('held', !!Main.settings.auto && this.autoHold);
    this.fastBtn.classList.toggle('on', !!Main.settings.fast);
  },
  toggleAuto() {
    if (Main.settings.auto && this.autoHold) this.autoHold = false; // resume after a pause
    else { Main.settings.auto = !Main.settings.auto; Main.saveSettings(); }
    this.updCtrl();
    if (this.autoOn()) this.scheduleAuto(150);
  },
  autoOn() { return !!Main.settings.auto && !this.autoHold && !this.p0.tutorial; },
  scheduleAuto(ms = 520) {
    clearTimeout(this.autoT);
    if (!this.autoOn()) return;
    this.autoT = setTimeout(() => this.autoStep(), ms);
  },
  autoStep() {
    if (!this.autoOn() || this.busy || this.over || UI.cur !== this) return;
    if (UI.anyModal() || Platform.adActive) { this.scheduleAuto(400); return; } // wait until the picker / ad closes
    this.choose({ type: 'move', id: BL.aiPick(this.p, this.e, true) });
  },

  renderMoves() {
    const f = this.p;
    this.movesEl.innerHTML = '';
    for (let k = 0; k < 4; k++) {
      const id = f.mon.equip[k];
      if (!id) {
        const next = SPECIES[f.mon.sp].learn.find(([l, mid]) => l > f.mon.lv && !f.mon.moves.includes(mid));
        this.movesEl.appendChild(U.el('div', { class: 'mvb empty' + (k % 2 ? ' r' : '') }, next ? U.el('small', { class: 'mvb-next', text: t('b.next_move', { lv: next[0] }) }) : null));
        continue;
      }
      const m = MOVES[id];
      const cost = BL.cost(f, id);
      const eff = m.pow && this.e ? BL.effMult(f, this.e, id) : 1;
      const btn = U.el('button', { class: 'mvb snd ' + (m.el ? 'el-' + m.el : 'el-none') + (k % 2 ? ' r' : '') + (cost > f.en ? ' off' : ''), title: this.moveInfo(f, id).replace(/<[^>]+>/g, ''), onclick: () => this.choose({ type: 'move', id }) },
        U.el('span', { class: 'mvb-ic', html: m.el ? elIcon(m.el, 30) : WArt.icon(m.pow ? 'swords' : m.cat === 'heal' ? 'heal' : 'star', 24) }),
        U.el('b', { class: 'mvb-n', text: t('mv.' + id) }),
        eff >= 1.25 ? U.el('em', { class: 'mvb-eff good', text: t('b.eff_good') }) : eff <= 0.8 ? U.el('em', { class: 'mvb-eff bad', text: t('b.eff_bad') }) : null,
        m.pow && Weather.boost(BL.wx, m.el) > 1 ? U.el('i', { class: 'mvb-wx', title: Weather.effect(BL.wx), html: Weather.icon(BL.wx, 20) }) : null,
        U.el('small', { class: 'mvb-c', html: cost > 0 ? `⚡${cost}` : `<i>${t('b.free')}</i>` }));
      this.movesEl.appendChild(btn);
    }
  },
  moveInfo(f, id) {
    const m = MOVES[id], c = BL.cost(f, id);
    const parts = [c > 0 ? `<i class="en">⚡${c}</i>` : `<i class="free">${t('b.free')}</i>`];
    if (m.pow) parts.push(`${t('b.pow')} ${m.pow}${m.hits ? '×' + m.hits : ''}`);
    else parts.push(t('mc.' + m.cat));
    if (m.status && m.cat !== 'status') parts.push(t('st.' + m.status[0]));
    if (m.prio) parts.push(t('b.quick'));
    return parts.join(' · ');
  },
  lock(v) { this.panel.classList.toggle('lock', v); if (v && this.dial) this.dial.classList.remove('live'); },

  /* ---------------- messages ---------------- */
  say(html, ms = 900) {
    if (Main.settings.fast) ms *= 0.5;
    this.msg.innerHTML = html;
    return new Promise(res => {
      let done = false;
      const fin = () => { if (done) return; done = true; clearTimeout(tm); UI.scene.removeEventListener('pointerdown', fin); res(); };
      const tm = setTimeout(fin, ms);
      setTimeout(() => { if (!done) UI.scene.addEventListener('pointerdown', fin); }, 150);
    });
  },
  banner(text, cls) {
    const b = U.el('div', { class: 'b-banner ' + (cls || ''), text });
    UI.fx.appendChild(b);
    setTimeout(() => b.remove(), 1700);
  },
  /** small stylised label popping next to a fighter ("CRITICAL!", "SUPER!") */
  tag(f, text, cls) {
    const [x, y] = this.center(f);
    const e = U.el('div', { class: 'b-tag ' + cls, text });
    e.style.left = (x + (f.side === 'e' ? -90 : 90)) + 'px'; e.style.top = (y - 70) + 'px';
    UI.fx.appendChild(e);
    setTimeout(() => e.remove(), 1100);
  },
  hint(key, target) {
    if (this.hintShown[key]) return;
    this.hintShown[key] = 1;
    const h = U.el('div', { class: 'b-hint' }, U.el('span', { text: t(key) }));
    UI.scene.appendChild(h);
    this.hintEl = h; this.hintTarget = target;
    this.placeHint();
  },
  placeHint() {
    if (!this.hintEl || !this.hintTarget) return;
    const r = this.hintTarget.getBoundingClientRect();
    const [x, y] = UI.toGame(r.left + r.width / 2, r.top);
    this.hintEl.style.left = x + 'px'; this.hintEl.style.top = (y - 10) + 'px';
  },
  clearHint() { if (this.hintEl) { this.hintEl.remove(); this.hintEl = null; } },

  /* ---------------- flow ---------------- */
  async intro() {
    // enemy appears
    const first = this.eTeam.findIndex(m => m.hp > 0);
    const hpMult = this.kind === 'legend' ? 1.5 : this.alpha ? 1.3 : 1;
    this.e = BL.fighter(this.eTeam[first], 'e', hpMult > 1 ? { hpMult } : {});
    this.e.alpha = this.alpha;
    this.e.star = this.star;
    if (this.kind === 'wild') this.dial.classList.add('r-' + this.e.sp.rarity); // the ring shows how rare this one is
    this.setSprite(this.monE, this.e);
    Game.see(this.e.mon.sp);
    if (this.kind === 'wild' || this.kind === 'legend') {
      await this.wildIn();
      this.renderCard('e');
      if (this.kind === 'legend') { FX.flash('#fff6c8', 0.5, 600); await this.say(t('b.legend', { name: this.e.sp.name }), 1400); }
      else if (this.alpha) { FX.shake(8); FX.glow(...this.center(this.e), 'rgba(255,210,63,.8)', 340, 900); await this.say(t('b.alpha_wild', { name: this.e.sp.name }), 1400); }
      else if (this.star) { FX.flash('#fff6c8', 0.4, 500); await this.say(t('b.star', { name: this.e.sp.name }) + (this.e.mon.shiny ? ' <b class="shinytxt">✦ ' + t('b.shiny') + '</b>' : ''), 1400); }
      else await this.say(t(this.p0.first ? 'b.first' : 'b.wild', { name: this.e.sp.name }) + (this.e.mon.shiny ? ' <b class="shinytxt">✦ ' + t('b.shiny') + '</b>' : ''), 1200);
    } else {
      await this.vsSplash();
      await U.anim(this.tamerEl, [{ transform: 'translateX(420px)' }, { transform: 'translateX(0)' }], { duration: 600, easing: 'cubic-bezier(.2,.9,.3,1)' });
      const key = this.kind === 'guardian' ? 'b.guardian' : this.kind === 'arena' ? (this.T.champ ? 'b.champ' : 'b.arena') : 'b.tamer';
      await this.say(t(key, { tamer: UI.whoName(this.tamerId) }), 1100);
      U.anim(this.tamerEl, [{ transform: 'translateX(0)' }, { transform: 'translateX(170px)' }], { duration: 500, fill: 'forwards' });
      await this.say(t('b.send', { tamer: this.T.name, name: this.e.sp.name }), 500);
      await this.orbIn(this.monE);
      this.renderCard('e');
    }
    // player
    const pi = Game.team().findIndex(m => m.hp > 0);
    this.p = BL.fighter(Game.team()[pi], 'p');
    this.setSprite(this.monP, this.p);
    await this.say(t('b.go', { name: this.p.sp.name }), 450);
    await this.orbIn(this.monP);
    this.renderCard('p');
    // the weather, once per isle and change of weather: what it does to this fight
    const wxKey = BL.wx && this.zoneId + ':' + Weather.slot();
    if (wxKey && Weather.told !== wxKey) { Weather.told = wxKey; await this.say(Weather.icon(BL.wx, 24) + ' ' + t('wxb.' + BL.wx, { n: Math.round((WX_BOOST - 1) * 100) }), 1300); }
    // auto pauses for Orblings worth catching
    if (this.autoOn() && this.kind === 'wild' && (!Game.caught(this.e.mon.sp) || this.e.mon.shiny || this.alpha || this.star)) {
      this.autoHold = true;
      this.updCtrl();
      UI.toast(WArt.icon('auto', 22) + ' ' + t('b.auto_hold'), 'good');
    }
    this.ready();
  },
  /** wild entrance: an element-tinted sparkle vortex on the base, then the Orbling leaps out and lands */
  async wildIn() {
    const gx = EX, gy = EY, big = this.kind === 'legend' || this.alpha || this.star;
    if (this.kind === 'legend') { FX.flash('#140c30', 0.55, 1100); VFX.aura(gx, gy - 150, '#fff6a0', 1800); await U.sleep(300); }
    if (VFX.ok()) await VFX.wildIn(gx, gy, this.e.sp.el, big);
    this.monE.spr.style.opacity = 1;
    Snd.cry(this.e.mon.sp);
    await U.anim(this.monE.spr, [
      { transform: 'translate(-50%,-96%) translateY(-150px) scale(.25)', filter: 'brightness(6)' },
      { transform: 'translate(-50%,-96%) translateY(-70px) scale(1.04)', filter: 'brightness(2.2)', offset: 0.45 },
      { transform: 'translate(-50%,-96%) translateY(0) scale(1.18, .84)', filter: 'brightness(1.2)', offset: 0.78 },
      { transform: 'translate(-50%,-96%) scale(1)', filter: 'brightness(1)' }], { duration: 620, easing: 'ease-in' });
    if (VFX.ok()) { VFX.smoke(gx, gy - 6, 10, '#c8b8a0', { rx: 80 }); VFX.ring(gx, gy - 4, big ? '#ffd23f' : '#ffffff', 30, big ? 220 : 170, 520, 7, { flat: 0.3 }); }
    if (big) { FX.shake(10); if (VFX.ok()) VFX.aura(gx, gy - 110, this.alpha ? '#ffd23f' : '#fff6a0', 1400); }
  },
  /** Speed-streak banner ("Go, Sunkit!") sliding across the screen */
  goBanner(text, side) {
    const b = U.el('div', { class: 'go-banner ' + (side === 'e' ? 'r' : 'l') }, U.el('b', { text }));
    UI.fx.appendChild(b);
    setTimeout(() => b.remove(), 1000 * FX.k + 50);
  },
  /** translucent zodiac wheel behind a super-effective hit */
  zwheel(D) {
    const [x, y] = this.center(D);
    const w = U.img(WArt.zodiacWheel(), 'zwheel');
    w.style.left = x + 'px'; w.style.top = y + 'px';
    UI.fx.appendChild(w);
    setTimeout(() => w.remove(), 1050);
  },
  /** tamer battles open with a VS splash */
  async vsSplash() {
    const boss = this.bossy();
    const por = (src, name, sub) => U.el('div', { class: 'vs-card' }, U.el('div', { class: 'vs-por' }, U.img(src)), U.el('b', { text: name }), sub ? U.el('small', { text: sub }) : null);
    const lg = this.kind === 'arena' ? ARENA_LEAGUE[this.T.arena] : null;
    const el = U.el('div', { class: 'vs' + (boss ? ' boss' : '') },
      U.el('div', { class: 'vs-side l' }, por(WArt.person(Game.s.look), Game.s.name, t('ui.rank') + ' ' + Game.s.tamer.lv)),
      U.el('div', { class: 'vs-side r' }, por(WArt.person(tamerLook(this.tamerId)), UI.whoName(this.tamerId), lg ? t('ar.' + lg.id) : this.kind === 'guardian' ? t('isle.' + this.T.guardian) : null)),
      U.el('div', { class: 'vs-mid', text: 'VS' }));
    (UI.portrait ? UI.scene : UI.fx).appendChild(el); // portrait: over the whole screen, not the arena window
    Snd.play('vs');
    await U.sleep(1500 * FX.k);
    el.classList.add('out');
    setTimeout(() => el.remove(), 420);
    await U.sleep(200);
  },
  ready() {
    if (this.over) return;
    this.busy = false;
    this.renderMoves();
    this.renderCard('p');
    this.msg.innerHTML = t('b.what', { name: this.p.sp.name });
    this.dial.classList.add('live');
    this.lock(false);
    if (this.p0.tutorial) {
      if (this.e.mon.hp / this.e.maxHp > 0.6) this.hint('tut.b1', this.movesEl.querySelector('.mvb:not(.empty)') || this.movesEl);
      else { this.clearHint(); this.hint('tut.b2', this.dial); }
    }
    this.scheduleAuto();
  },
  async choose(a) {
    if (this.busy || this.over) return;
    // an unaffordable move is refused only while another equipped move is affordable; otherwise useMove() falls back to a free move
    if (a.type === 'move' && !BL.canUse(this.p, a.id) && this.p.mon.equip.some(id => BL.canUse(this.p, id))) { Snd.play('error'); this.msg.innerHTML = t('b.noen'); return; }
    clearTimeout(this.autoT);
    this.busy = true;
    this.lock(true);
    this.clearHint();
    try { await this.turn(a); } catch (e) { console.error(e); if (!this.over) this.ready(); }
  },
  async turn(a) {
    let eAct;
    if (this.charge && this.charge.f === this.e && this.e.mon.hp > 0 && BL.canUse(this.e, this.charge.id)) eAct = { type: 'move', id: this.charge.id, charged: true };
    else eAct = { type: 'move', id: BL.aiPick(this.e, this.p, this.kind !== 'wild' || this.alpha) };
    this.setCharge(null);
    let order;
    if (a.type !== 'move') order = [['p', a], ['e', eAct]];
    else {
      const pp = MOVES[a.id].prio || 0, ep = MOVES[eAct.id].prio || 0;
      const ps = BL.speed(this.p), es = BL.speed(this.e);
      const pFirst = pp !== ep ? pp > ep : ps !== es ? ps > es : Math.random() < 0.5;
      order = pFirst ? [['p', a], ['e', eAct]] : [['e', eAct], ['p', a]];
    }
    this.newEnemy = false; this.newPlayer = false;
    for (const [side, act] of order) {
      if (this.over) break;
      if (side === 'e' && this.newEnemy) continue;
      if (side === 'p' && this.newPlayer) continue;
      const f = side === 'p' ? this.p : this.e;
      if (f.mon.hp <= 0) continue;
      await this.doAction(side, act);
      await this.checkFaints();
    }
    if (!this.over) { await this.endTurn(); await this.checkFaints(); }
    if (!this.over) await this.telegraph();
    if (!this.over) this.ready();
  },
  /** Guardians, champions and legends sometimes gather power for their strongest move: it lands next turn with +30%,
   *  so guarding, healing or switching out has a moment to matter */
  async telegraph() {
    if (!this.bossy() || this.p0.tutorial || !this.e || this.e.mon.hp <= 0 || this.e.status === 'sleep' || this.e.status === 'freeze' || Math.random() > 0.3) return;
    const id = BL.chargeMove(this.e);
    if (!id) return;
    this.setCharge({ f: this.e, id });
    Snd.play('rumble');
    if (VFX.ok()) VFX.aura(...this.center(this.e), '#ffd23f', 900);
    await this.say(t('b.charge', { name: this.nameOf(this.e), move: t('mv.' + id) }), 1100);
  },
  setCharge(c) {
    this.charge = c;
    if (this.monE) this.monE.wrap.classList.toggle('charging', !!c);
    if (this.cardE) this.cardE.classList.toggle('charging', !!c);
  },
  async doAction(side, a) {
    const A = side === 'p' ? this.p : this.e, D = side === 'p' ? this.e : this.p;
    if (a.type === 'move') return this.useMove(A, D, a.id, a.charged);
    if (a.type === 'switch') return this.switchPlayer(a.idx);
    if (a.type === 'item') return this.useItem(a.id, a.target);
    if (a.type === 'orb') return this.throwOrb(a.id, a.bonus);
  },

  /* ---------------- moves ---------------- */
  async useMove(A, D, id, charged) {
    const nm = this.nameOf(A);
    if (A.status === 'sleep') {
      if (--A.stTurns <= 0) { A.status = null; this.updStatus(A); await this.say(t('b.wake', { name: nm }), 700); }
      else { this.statusFx(A, 'sleep'); await this.say(t('b.sleeping', { name: nm }), 800); return; }
    }
    if (A.status === 'freeze') {
      A.status = null; this.updStatus(A); this.statusFx(A, 'freeze');
      await this.say(t('b.frozen', { name: nm }), 900);
      return;
    }
    if (A.status === 'shock' && Math.random() < 0.25) { this.statusFx(A, 'shock'); await this.say(t('b.shocked', { name: nm }), 900); return; }
    if (!BL.canUse(A, id)) { id = A.mon.equip.find(x => MOVES[x].cost === 0 && MOVES[x].pow) || 'tackle'; charged = false; }
    const m = MOVES[id];
    A.en -= BL.cost(A, id);
    if (A.side === 'p') this.updEn(A);
    await this.say(t('b.used', { name: nm, move: t('mv.' + id) }), 600);
    if (m.pow) await this.attack(A, D, id, charged);
    else if (m.cat === 'buff') {
      await FX.cast(id, this.fxc(A, D));
      if (m.en) { A.en = Math.min(A.maxEn, A.en + m.en); this.updEn(A); UI.float(...this.center(A), '+' + m.en + ' ⚡', 'info'); await this.say(t('b.recharged', { name: nm }), 700); }
      if (m.heal) await this.healBy(A, Math.ceil(A.maxHp * m.heal));
      if (m.self) await this.stageChange(A, m.self);
    } else if (m.cat === 'heal') {
      await FX.cast(id, this.fxc(A, D));
      if (m.cure && A.status) { A.status = null; this.updStatus(A); }
      if (A.mon.hp >= A.maxHp) await this.say(t('b.fullhp', { name: nm }), 700);
      else await this.healBy(A, Math.ceil(A.maxHp * m.heal));
    } else if (m.cat === 'debuff') {
      const miss = Math.random() > BL.hitChance(A, id);
      await FX.attack(id, this.fxc(A, D, miss));
      if (miss) { Snd.play('miss'); await this.say(t('b.miss', { name: nm }), 700); }
      else await this.stageChange(D, m.foe);
    } else if (m.cat === 'status') {
      const fail = Math.random() > BL.hitChance(A, id) || D.status;
      await FX.attack(id, this.fxc(A, D, fail));
      if (fail) { Snd.play('miss'); await this.say(t('b.failed'), 700); }
      else await this.applyStatus(D, m.status[0]);
    }
    A.first = false;
  },
  async attack(A, D, id, charged) {
    const m = MOVES[id], nm = this.nameOf(A);
    if (Math.random() > BL.hitChance(A, id)) {
      await FX.attack(id, this.fxc(A, D, true));
      UI.float(...this.center(D), t('b.missf'), 'miss'); Snd.play('miss');
      await this.say(t('b.miss', { name: nm }), 800);
      return;
    }
    if (Math.random() < BL.dodgeChance(D)) {
      await FX.attack(id, this.fxc(A, D, true));
      U.anim(D.slot.wrap, [{ transform: 'translateX(0)' }, { transform: `translateX(${D.side === 'e' ? 70 : -70}px)` }, { transform: 'translateX(0)' }], { duration: 420 });
      Snd.play('miss');
      await this.say(t('b.dodge', { name: this.nameOf(D) }), 800);
      return;
    }
    let hits = m.hits || 1, twin = false;
    if (Math.random() < BL.twinChance(A, id)) { hits += 1; twin = true; }
    let total = 0, tmLast = 1, crits = 0, n = 0, endured = false;
    const aries = A.first && A.sp.sign === 'aries';
    for (let h = 0; h < hits; h++) {
      if (D.mon.hp <= 0) break;
      const c = this.fxc(A, D);
      await FX.attack(id, c);
      const crit = Math.random() < BL.critChance(A, id);
      let { dmg, tm } = BL.damage(A, D, id, crit, Math.random(), charged);
      // friendship (♥4+): your Orbling may hold on at 1 HP for you, once per battle
      if (D.side === 'p' && D.mon.hp > 1 && dmg >= D.mon.hp && !this.endured.has(D.mon.id) && Math.random() < Base.endure(D.mon)) { dmg = D.mon.hp - 1; this.endured.add(D.mon.id); endured = true; }
      // the tutorial Orbling can be weakened but never knocked out: the lesson is catching it
      D.mon.hp = Math.max(this.p0.tutorial && D.side === 'e' ? 1 : 0, D.mon.hp - dmg);
      total += dmg; tmLast = tm; n++; if (crit) crits++;
      FX.impact(id, c, { crit, tm });
      this.hitFx(D, dmg, tm, crit);
      this.updHp(D);
      if (A.side === 'p') { if (crit) Game.s.stats.crits++; if (tm > 1) Game.s.stats.supers++; }
      await U.sleep(hits > 1 ? 300 : 380);
    }
    if (aries) UI.float(this.center(A)[0], this.center(A)[1] - 70, t('trait.firststrike'), 'info');
    if (endured && D.mon.hp > 0) { UI.float(this.center(D)[0], this.center(D)[1] - 70, '♥', 'heart'); Snd.play('buff'); await this.say(t('fr.endure', { name: this.nameOf(D) }), 1000); }
    if (twin) await this.say(t('b.twin'), 500);
    if (n > 1) await this.say(t('b.hits', { n }), 600);
    if (crits) await this.say(t('b.crit'), 650);
    if (tmLast > 1) await this.say(t('b.super'), 750);
    else if (tmLast < 1) await this.say(t('b.weak'), 700);
    // hitting a weakness with a Star move gives 1 energy back
    if (tmLast > 1 && m.cat === 'star' && A.mon.hp > 0 && A.en < A.maxEn) {
      A.en = Math.min(A.maxEn, A.en + 1);
      if (A.side === 'p') { this.updEn(A); UI.float(this.center(A)[0], this.center(A)[1] - 50, '+1 ⚡', 'info'); }
    }
    if (m.drain && total && A.mon.hp > 0) await this.healBy(A, Math.max(1, Math.floor(total * m.drain)), 'b.drain');
    if (m.recoil && total) {
      const r = Math.max(1, Math.floor(total * m.recoil));
      A.mon.hp = Math.max(0, A.mon.hp - r);
      this.hitFx(A, r, 1, false, true); this.updHp(A);
      await this.say(t('b.recoil', { name: nm }), 700);
    }
    if (D.mon.hp > 0) {
      if (m.status && Math.random() < m.status[1]) await this.applyStatus(D, m.status[0]);
      if (D.status === 'freeze' && m.el === 'fire') { D.status = null; this.updStatus(D); await this.say(t('b.thaw', { name: this.nameOf(D) }), 700); }
      if (m.foe && Math.random() < (m.foeChance || 1)) await this.stageChange(D, m.foe);
      if (!D.status && !BL.immune(D, 'poison') && Math.random() < BL.venomChance(A, id)) { UI.float(...this.center(A), t('trait.venom'), 'info'); await this.applyStatus(D, 'poison'); }
    }
    if (m.self && A.mon.hp > 0) await this.stageChange(A, m.self);
  },
  async applyStatus(f, st) {
    if (f.status || f.mon.hp <= 0) return false;
    if (this.p0.tutorial && f.side === 'e') return false; // the lesson is catching it
    const nm = this.nameOf(f);
    if (BL.immune(f, st)) { await this.say(t('b.immune', { name: nm }), 800); return false; }
    f.status = st;
    f.stTurns = st === 'sleep' ? U.ri(2, 3) : st === 'poison' ? 4 : 3;
    this.updStatus(f);
    this.statusFx(f, st);
    Snd.play('status');
    await this.say(t('b.st.' + st, { name: nm }), 900);
    return true;
  },
  async stageChange(f, obj) {
    for (const k in obj) {
      const v = obj[k], before = f.stages[k];
      f.stages[k] = U.clamp(before + v, -3, 3);
      const p = { name: this.nameOf(f), stat: t('stat.' + k) };
      if (f.stages[k] === before) { await this.say(t(v > 0 ? 'b.stat_max' : 'b.stat_min', p), 700); continue; }
      this.stageFx(f, v > 0);
      Snd.play(v > 0 ? 'buff' : 'debuff');
      await this.say(t(v > 0 ? (v > 1 ? 'b.stat_up2' : 'b.stat_up') : (v < -1 ? 'b.stat_down2' : 'b.stat_down'), p), 750);
    }
  },
  async healBy(f, amt, key) {
    amt = Math.min(amt, f.maxHp - f.mon.hp);
    if (amt <= 0) return;
    f.mon.hp += amt;
    this.updHp(f);
    Snd.play('heal');
    UI.float(...this.center(f), '+' + amt, 'heal');
    FX.healRise(...this.center(f));
    await this.say(t(key || 'b.healed', { name: this.nameOf(f), n: amt }), 750);
  },
  async endTurn() {
    for (const f of [this.p, this.e]) {
      if (this.over || f.mon.hp <= 0) continue;
      const nm = this.nameOf(f);
      if (f.status === 'burn' || f.status === 'poison') {
        const d = Math.max(1, Math.floor(f.maxHp * (f.status === 'burn' ? 1 / 12 : 1 / 10)));
        f.mon.hp = Math.max(this.p0.tutorial && f.side === 'e' ? 1 : 0, f.mon.hp - d);
        this.statusFx(f, f.status);
        this.hitFx(f, d, 1, false, true);
        this.updHp(f);
        await this.say(t('b.hurt.' + f.status, { name: nm }), 750);
        if (--f.stTurns <= 0 && f.mon.hp > 0) { f.status = null; this.updStatus(f); await this.say(t('b.cured', { name: nm }), 600); }
      } else if (f.status === 'shock' && --f.stTurns <= 0) {
        f.status = null; this.updStatus(f); await this.say(t('b.cured', { name: nm }), 600);
      }
      if (f.side === 'p' && f.status && f.mon.hp > 0 && Math.random() < Base.cure(f.mon)) {
        f.status = null; this.updStatus(f);
        UI.float(this.center(f)[0], this.center(f)[1] - 60, '♥', 'heart');
        await this.say(t('fr.cure', { name: nm }), 750);
      }
      if (f.mon.hp > 0 && f.sp.sign === 'virgo' && f.mon.hp < f.maxHp) {
        const h = Math.min(f.maxHp - f.mon.hp, Math.max(1, Math.floor(f.maxHp * 0.05)));
        f.mon.hp += h; this.updHp(f);
        UI.float(this.center(f)[0], this.center(f)[1] - 40, '+' + h, 'heal');
      }
      f.en = Math.min(f.maxEn, f.en + 1 + (f.sp.sign === 'aquarius' ? 1 : 0));
    }
    this.updEn(this.p);
  },
  async checkFaints() {
    if (this.over) return;
    if (this.e.mon.hp <= 0 && !this.e.fainted) {
      this.e.fainted = true;
      this.statusOverlay(this.e.slot, null);
      await this.faintFx(this.e);
      await this.say(t('b.faint', { name: this.nameOf(this.e) }), 850);
      if (this.kind === 'wild') { Game.s.stats.wild++; Game.s.stats.defeatEl[this.e.sp.el]++; if (this.alpha) Game.s.stats.alphas++; }
      await this.awardXp(this.e.mon);
      const next = this.eTeam.findIndex(m => m.hp > 0);
      if (next >= 0) {
        this.e = BL.fighter(this.eTeam[next], 'e');
        this.setSprite(this.monE, this.e);
        Game.see(this.e.mon.sp);
        await this.say(t('b.send', { tamer: this.T.name, name: this.e.sp.name }), 600);
        await this.orbIn(this.monE);
        this.renderCard('e');
        this.newEnemy = true;
      } else { await this.victory(false); return; }
    }
    if (this.p.mon.hp <= 0 && !this.p.fainted) {
      this.p.fainted = true;
      this.statusOverlay(this.p.slot, null);
      await this.faintFx(this.p);
      await this.say(t('b.faint', { name: this.nameOf(this.p) }), 850);
      if (Game.teamAlive()) {
        const idx = this.autoOn() ? this.bestAlive() : await this.pickTeam(true);
        await this.sendPlayer(idx);
        this.newPlayer = true;
      } else await this.defeat();
    }
  },
  /** AUTO picks the healthiest teammate */
  bestAlive() {
    let best = -1, bf = -1;
    Game.team().forEach((m, i) => { const fr = m.hp / Game.maxHp(m); if (m.hp > 0 && fr > bf) { bf = fr; best = i; } });
    return best;
  },
  async sendPlayer(idx) {
    if (this.charge && this.charge.f !== this.e) this.setCharge(null);
    const mon = Game.team()[idx];
    this.p = BL.fighter(mon, 'p', { en: this.enMap[mon.id] });
    const kept = this.stMap[mon.id];
    if (kept && kept.status && mon.hp > 0) { this.p.status = kept.status; this.p.stTurns = kept.stTurns; }
    this.setSprite(this.monP, this.p);
    this.monP.spr.style.opacity = 0;
    await this.say(t('b.go', { name: this.p.sp.name }), 450);
    await this.orbIn(this.monP);
    this.renderCard('p');
    this.renderMoves();
  },
  async switchPlayer(idx) {
    this.enMap[this.p.mon.id] = this.p.en;
    this.stMap[this.p.mon.id] = { status: this.p.status, stTurns: this.p.stTurns };
    await this.say(t('b.back', { name: this.p.sp.name }), 500);
    this.statusOverlay(this.monP, null);
    await U.anim(this.monP.spr, [{ opacity: 1, transform: 'translate(-50%,-96%) scale(1)', filter: 'brightness(1)' }, { opacity: 0, transform: 'translate(-50%,-96%) scale(.1)', filter: 'brightness(3)' }], { duration: 320, fill: 'forwards' });
    await this.sendPlayer(idx);
  },

  /* ---------------- XP ---------------- */
  async awardXp(em) {
    const base = BL.xpFor(em, this.kind !== 'wild') * (this.kind === 'legend' ? 1.5 : this.alpha ? 1.6 : 1);
    const asc = Game.ascendant();
    for (const m of Game.team()) {
      if (m.hp <= 0 || m.lv >= MAX_LV || m.id === this.skipXp) continue;
      const active = this.p && m === this.p.mon;
      const amt = Math.max(1, Math.floor(base * (active ? 1 : 0.75) * (SPECIES[m.sp].sign === asc ? 1.5 : 1) * Base.xpMult(m)));
      const before = Game.stats(m), lv0 = m.lv;
      const r = Game.gainXp(m, amt);
      this.xpLog[m.id] = (this.xpLog[m.id] || 0) + amt;
      if (r.levels.length) this.leveled.add(m.id);
      if (active) {
        await this.say(t('b.xp', { name: this.p.sp.name, n: amt }), 550);
        if (r.levels.length) {
          BL.refresh(this.p);
          this.renderCard('p');
          Snd.play('levelup');
          UI.float(this.center(this.p)[0], this.center(this.p)[1] - 60, t('b.lvlup'), 'lvl');
          UI.burst(...this.center(this.p), ['#e0b8ff', '#ffe066', '#ffffff'], 14, 120);
          FX.glow(...this.center(this.p), 'rgba(224,184,255,.8)', 300, 800);
          this.lvPanel(lv0, m.lv, before, Game.stats(m));
          await this.say(t('b.lvl', { name: this.p.sp.name, lv: m.lv }), 1300);
        }
        for (const id of r.learned) await this.say(t('b.learn', { name: this.p.sp.name, move: t('mv.' + id) }), 900);
        this.updXp(this.p);
        this.renderCard('p');
      } else if (r.levels.length) UI.toast(t('b.lvl_bench', { name: SPECIES[m.sp].name, lv: m.lv }));
    }
  },
  /** level-up panel: new level and how much each stat grew */
  lvPanel(lv0, lv1, a, b) {
    const rows = ['hp', 'atk', 'mag', 'def', 'spd'].map(k => U.el('div', { class: 'lvp-row' }, U.el('span', { text: k === 'hp' ? t('ui.hp') : t('stat.' + k) }), U.el('b', { text: b[k] }), U.el('em', { text: '+' + (b[k] - a[k]) })));
    const el = U.el('div', { class: 'lvpanel' }, U.el('div', { class: 'lvp-head', text: t('ui.lv') + ' ' + lv0 + ' ▶ ' + lv1 }), ...rows);
    UI.fx.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2600 * FX.k);
  },

  /* ---------------- player actions ---------------- */
  async pickTeam(forced) {
    return new Promise(res => {
      const list = U.el('div', { class: 'pick-team' });
      let done = false;
      Game.team().forEach((m, i) => {
        const cur = this.p && m === this.p.mon && !this.p.fainted;
        const mx = Game.maxHp(m), fr = m.hp / mx;
        const card = U.el('button', { class: 'pt-card snd' + (m.hp <= 0 || cur ? ' off' : ''), onclick: () => { done = true; h.close(true); res(i); } },
          UI.monPortrait(m, 'big'),
          U.el('div', { class: 'pt-info' }, U.el('b', { text: SPECIES[m.sp].name }), U.el('small', { text: t('ui.lv') + ' ' + m.lv + (cur ? ' · ' + t('b.inbattle') : '') }), UI.bar(fr, UI.hpClass(fr)), U.el('small', { text: m.hp + ' / ' + mx })));
        list.appendChild(card);
      });
      const h = UI.modal({ title: t(forced ? 'b.choose' : 'b.switch'), body: list, closable: !forced, onClose: () => { if (!done) res(-1); } });
    });
  },
  async onSwitch(idx) {
    if (this.busy || this.over) return;
    if (Game.team().filter(m => m.hp > 0).length < 2) { Snd.play('error'); this.msg.innerHTML = t('b.noswitch'); return; }
    if (idx == null) idx = await this.pickTeam(false);
    const m = Game.team()[idx];
    if (idx < 0 || !m) return;
    if (m === this.p.mon) { Snd.play('error'); this.msg.innerHTML = t('b.inbattle_msg', { name: this.p.sp.name }); return; }
    if (m.hp <= 0) { Snd.play('error'); this.msg.innerHTML = t('b.fainted_msg', { name: SPECIES[m.sp].name }); return; }
    this.choose({ type: 'switch', idx });
  },
  async onItems() {
    if (this.busy || this.over) return;
    const usable = ['berry', 'potion', 'superpotion', 'ether', 'revive'].filter(id => Game.item(id) > 0);
    if (!usable.length) { Snd.play('error'); this.msg.innerHTML = t('b.noitems'); return; }
    const choice = await new Promise(res => {
      let done = false;
      const list = U.el('div', { class: 'pick-items' });
      for (const id of usable) {
        list.appendChild(U.el('button', { class: 'it-row snd', onclick: () => { done = true; h.close(true); res(id); } },
          U.img(WArt.item(id)), U.el('div', {}, U.el('b', { text: t('it.' + id) }), U.el('small', { text: t('itd.' + id) })), U.el('em', { text: '×' + Game.item(id) })));
      }
      const h = UI.modal({ title: t('b.items'), body: list, onClose: () => { if (!done) res(null); } });
    });
    if (!choice) return;
    let target = this.p.mon.id;
    if (choice === 'revive') {
      const ko = Game.team().filter(m => m.hp <= 0);
      if (!ko.length) { UI.toast(t('b.noko')); return; }
      target = ko[0].id;
    } else if (choice !== 'ether' && this.p.mon.hp >= this.p.maxHp) { UI.toast(t('b.fullhp', { name: this.p.sp.name })); return; }
    this.choose({ type: 'item', id: choice, target });
  },
  async useItem(id, targetId) {
    const it = ITEMS[id], m = Game.mon(targetId);
    Game.useItem(id);
    await this.say(t('b.useitem', { item: t('it.' + id) }), 500);
    if (it.kind === 'heal') {
      const f = this.p.mon === m ? this.p : null;
      if (f) await this.healBy(f, Math.ceil(f.maxHp * it.heal));
      else { m.hp = Math.min(Game.maxHp(m), m.hp + Math.ceil(Game.maxHp(m) * it.heal)); }
    } else if (it.kind === 'energy') {
      this.p.en = this.p.maxEn; this.updEn(this.p); Snd.play('buff');
      FX.cast('recharge', this.fxc(this.p, this.e));
      UI.float(...this.center(this.p), '⚡ MAX', 'info');
      await this.say(t('b.recharged', { name: this.p.sp.name }), 700);
    } else if (it.kind === 'revive') {
      m.hp = Math.ceil(Game.maxHp(m) * it.heal);
      Snd.play('heal');
      await this.say(t('b.revived', { name: SPECIES[m.sp].name }), 800);
    }
  },
  async onRun() {
    if (this.busy || this.over) return;
    if (this.kind !== 'wild' || this.p0.tutorial) { Snd.play('error'); this.msg.innerHTML = t('b.norun'); return; }
    this.busy = true; this.lock(true);
    clearTimeout(this.autoT);
    Snd.play('miss');
    await U.anim(this.monP.wrap, [{ transform: 'translateX(0)' }, { transform: 'translateX(-420px)' }], { duration: 450, fill: 'forwards' });
    await this.say(t('b.ran'), 700);
    this.finish('ran');
  },
  onKey(e) {
    if (this.busy || this.over || UI.anyModal() || Platform.adActive) return;
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4 && this.p && this.p.mon.equip[n - 1]) { e.preventDefault(); this.choose({ type: 'move', id: this.p.mon.equip[n - 1] }); }
    if (e.key === 'c' || e.key === 'C') this.onCatch();
  },

  /* ---------------- catching ---------------- */
  async onCatch() {
    if (this.busy || this.over) return;
    if (this.kind !== 'wild') { Snd.play('error'); this.msg.innerHTML = t('b.nocatch'); return; }
    clearTimeout(this.autoT);
    const orbs = ORB_IDS.filter(id => Game.item(id) > 0);
    if (!orbs.length) { this.busy = true; try { await this.noOrbs(); } finally { this.busy = false; } this.scheduleAuto(); return; }
    let orb = orbs[0];
    if (orbs.length > 1) {
      orb = await new Promise(res => {
        let done = false;
        const list = U.el('div', { class: 'pick-items' });
        for (const id of orbs) {
          const pct = Math.round(BL.catchChance(this.e, id, 1) * 100);
          list.appendChild(U.el('button', { class: 'it-row snd', onclick: () => { done = true; h.close(true); res(id); } },
            U.img(WArt.item(id)), U.el('div', {}, U.el('b', { text: t('it.' + id) }), U.el('small', { text: t('b.chance', { n: pct }) })), U.el('em', { text: '×' + Game.item(id) })));
        }
        const h = UI.modal({ title: t('b.catch'), body: list, onClose: () => { if (!done) res(null); } });
      });
      if (!orb) { this.scheduleAuto(); return; }
    }
    this.busy = true; this.lock(true); this.clearHint();
    let bonus = 1;
    try { bonus = await Capture.aim(this, orb); } catch (e) { console.error(e); } // a broken ring still throws
    if (bonus >= 1.7) Game.s.stats.excellent++;
    try { await this.turn({ type: 'orb', id: orb, bonus }); } catch (e) { console.error(e); if (!this.over) this.ready(); }
  },
  async noOrbs() {
    const cost = ITEMS.orb.price * 5;
    if (Game.s.coins < cost) { Snd.play('error'); UI.toast(t('b.noorbs_poor'), 'bad'); return; }
    const ok = await UI.confirm(t('b.noorbs', { cost }), t('b.buyorbs', { cost }), t('ui.cancel'));
    if (!ok) return;
    Game.addCoins(-cost); Game.addItem('orb', 5); Snd.play('coin'); UI.toast(t('b.gotorbs'), 'good');
    Game.save();
  },
  /** how many wobbles the orb holds (3 = caught): each holds with p^(1/3), so all three hold with chance p */
  shakes(p) {
    if (p >= 1) return 3;
    const q = Math.pow(p, 1 / 3);
    let sh = 0;
    while (sh < 3 && Math.random() < q) sh++;
    return sh;
  },
  async throwOrb(id, bonus) {
    Game.useItem(id);
    this.msg.innerHTML = t('b.throw', { orb: t('it.' + id) });
    const p = this.p0.tutorial ? 1 : BL.catchChance(this.e, id, bonus);
    const sh = this.shakes(p);
    if (await Capture.run(this, id, bonus >= 1.7 ? 3 : bonus > 1 ? 2 : 1, sh)) { await this.captured(); return; }
    this.e.pity = (this.e.pity || 0) + 1; // every orb it broke out of makes the next one hold better
    this.updStatus(this.e);
    this.updCatch();
    this.dial.classList.remove('gain'); void this.dial.offsetWidth; this.dial.classList.add('gain');
    await this.say(t(sh === 2 ? 'b.almost' : 'b.broke'), 900);
    await this.say(t('b.pity'), 900);
  },
  async captured() {
    this.over = true;
    clearTimeout(this.autoT);
    const m = this.e.mon;
    m.hp = Math.max(1, Math.min(Math.ceil(m.hp), Game.maxHp(m)));
    const isNew = !Game.caught(m.sp);
    const dust = isNew ? 0 : DUST_FOR[SPECIES[m.sp].stage] || 0;
    if (dust) Game.addDust(SPECIES[m.sp].sign, dust);
    Game.catchReg(m.sp);
    const where = Game.addMon(m);
    this.skipXp = m.id;
    const st = Game.s.stats;
    st.catches++; st.catchEl[this.e.sp.el]++;
    if (st.catches === 1) Platform.track('first', 'catch', 'complete');
    const fc = Base.firstCatch();
    if (fc) UI.toast(WArt.icon('calendar', 22) + ' ' + t('day.fc_got', { n: fc.orb, c: fc.coins }), 'good');
    if (m.shiny) st.shinies++;
    if (this.alpha) st.alphas++;
    if (this.star) st.starborn++;
    Game.s.flags.tutCatch = 1;
    this.caughtTxp = 15 + m.lv;
    Game.save();
    await this.awardXp(m);
    await this.victory(true, { m, isNew, where, dust });
  },

  /* ---------------- end of battle ---------------- */
  /** caught: the catch ({ m, isNew, where, dust }) — its reveal also shows the battle's spoils (3.4: one screen, one tap) */
  async victory(caught, cap) {
    this.over = true;
    clearTimeout(this.autoT);
    this.lock(true);
    const s = Game.s;
    s.stats.wins++;
    for (const m of Game.team()) if (m.hp > 0) m.hp = Math.min(Game.maxHp(m), m.hp + Math.round(Game.maxHp(m) * 0.2));
    const eLv = Math.max(...this.eTeam.map(m => m.lv));
    let coins = 0, txp = 0, firstWin = false, champ = null;
    const T = this.T;
    if (this.kind === 'wild') {
      coins = 6 + eLv * 3 + U.ri(0, eLv); txp = caught ? this.caughtTxp : 8 + eLv;
      if (this.alpha) { coins *= 2; txp = Math.round(txp * 1.5); }
    } else if (this.kind === 'legend') { coins = 1500; txp = 400; }
    else {
      s.stats.tamers++;
      firstWin = !Game.beaten(this.tamerId);
      s.beaten[this.tamerId] = (s.beaten[this.tamerId] || 0) + 1;
      const R = Math.round(T.reward * TRAINER_COINS);
      coins = firstWin ? R : Math.round(R * 0.3);
      txp = (firstWin ? 25 : 10) + eLv * 2;
      if (this.kind === 'guardian' && !s.sigils.includes(T.guardian)) { s.sigils.push(T.guardian); Platform.track('isle', T.guardian, 'complete'); }
      if (s.stats.tamers === 1) Platform.track('first', 'tamer', 'complete');
      if (this.kind === 'arena') {
        s.stats.arenaWins++;
        if (T.champ && firstWin) { champ = Object.assign({}, T.champReward); Game.grant(champ); }
      }
    }
    const legendMon = this.kind === 'legend' ? this.grantLegend() : null;
    const hearts = [];
    for (const m of Game.team()) if (m.hp > 0) { const up = Base.befriend(m, 1); if (up) hearts.push([m, up]); }
    Game.addCoins(coins);
    const levels = Game.addTamerXp(txp);
    const eggs = Camp.step(1);
    Game.save();
    if (!caught || Snd.cur !== 'caught') { Snd.stopMusic(); Snd.play('win'); } // a catch already had its fanfare (it ends by itself)
    if (!caught) { this.banner(t('b.win'), 'win'); if (VFX.ok()) VFX.confetti(640, 330, this.trainer() || this.kind === 'legend' ? 110 : 70); }
    if (this.bossy()) Platform.happy();
    await U.sleep(caught ? 200 : 1100);
    if (T && this.kind !== 'legend') await UI.talk(ExploreScene.tamerLines(this.tamerId, 'l'));
    const xpLog = this.xpLog;
    const canDouble = this.kind !== 'wild' && Object.keys(xpLog).some(id => { const m = Game.mon(id); return m && m.lv < MAX_LV; });
    // 3.4: a wild battle needs no popup — the catch's reveal carries the spoils, a plain win shows them as a cheer and
    // the world comes back at once; tamers, Guardians, the Arena and legends keep their reward window (with ×2 XP)
    if (cap) await Menus.caughtCard(cap.m, cap.isNew, cap.where, cap.dust, { coins, txp });
    else if (this.kind === 'wild') UI.cheer(t('b.win'), { coins, txp }, { color: 'gold', sound: 'coin' });
    else await UI.rewards(t('b.win'), { coins, txp }, !canDouble ? {} : {
      ad: {
        label: t('ui.double_xp'),
        run: async () => {
          for (const [id, amt] of Object.entries(xpLog)) {
            const m = Game.mon(id);
            if (!m || m.lv >= MAX_LV) continue;
            const r = Game.gainXp(m, amt);
            if (r.levels.length) { this.leveled.add(m.id); UI.toast(t('b.lvl_bench', { name: SPECIES[m.sp].name, lv: m.lv }), 'good'); }
            for (const mv of r.learned) UI.toast(t('b.learn', { name: SPECIES[m.sp].name, move: t('mv.' + mv) }), 'good');
          }
          Game.save();
          return t('ui.double_xp_done');
        },
      },
    });
    for (const lv of levels) await UI.tamerLevel(lv);
    if (champ) await Menus.trophy(T.arena, champ);
    if (legendMon) {
      await UI.talk([{ who: legendMon.mon.sp, text: t('obs.joins', { name: SPECIES[legendMon.mon.sp].name }) }]);
      await Menus.caughtCard(legendMon.mon, legendMon.isNew, legendMon.where);
    }
    if (this.kind === 'guardian' && firstWin) await Menus.sigil(T.guardian);
    for (const [m, h] of hearts) UI.heartToast(m, h);
    for (const m of Game.team()) if (this.leveled.has(m.id) && Game.canEvolve(m)) await Menus.evolve(m);
    const readyEgg = eggs && Game.s.camp.eggs.find(x => Camp.ready(x));
    if (readyEgg) UI.toast(`<img src="${WArt.item(readyEgg.egg)}"> ` + t('camp.egg_ready'), 'good');
    this.finish(caught ? 'caught' : 'won');
  },
  /** the defeated legend joins right away (persisted before any popup) */
  grantLegend() {
    const sp = this.e.mon.sp;
    const mon = Game.makeMon(sp, LEGEND_LV, { noShiny: true });
    const isNew = !Game.caught(sp);
    Game.catchReg(sp);
    const where = Game.addMon(mon);
    if (!Game.s.legends.includes(sp)) Game.s.legends.push(sp);
    return { mon, isNew, where };
  },
  async defeat() {
    this.over = true;
    clearTimeout(this.autoT);
    this.lock(true);
    Snd.stopMusic();
    Snd.play('lose');
    const choice = await new Promise(res => {
      let done = false;
      const canRevive = Platform.revives < 1 && Platform.adsOk();
      const body = U.el('div', { class: 'confirm' },
        U.el('p', { html: t('b.lose_txt') }),
        U.el('div', { class: 'row pair' },
          U.el('button', { class: 'btn red', onclick: () => { done = true; h.close(true); res('retreat'); } }, t('b.retreat')),
          canRevive ? U.el('button', { class: 'btn ad', html: UI.adIcon(24) + ' ' + t('b.revive_ad'), onclick: () => { done = true; h.close(true); res('revive'); } }) : null));
      const h = UI.modal({ title: t('b.lose'), body, cls: 'small', closable: false, color: 'red', onClose: () => { if (!done) res('retreat'); } });
    });
    if (choice === 'revive') {
      if (await Platform.rewardedBreak()) {
        Platform.revives++;
        for (const m of Game.team()) m.hp = Game.maxHp(m);
        this.over = false;
        Snd.music(this.bossy() ? 'boss' : 'battle');
        await this.sendPlayer(0);
        this.newPlayer = true;
        return;
      }
      UI.toast(t('ui.adfail'), 'bad');
    }
    Game.healAll();
    this.finish('lost');
  },
  async finish(result) {
    this.over = true;
    clearTimeout(this.autoT);
    Game.save();
    if (result === 'won' || result === 'caught') await Platform.naturalBreak(this.kind !== 'wild');
    if (this.kind === 'arena') UI.go(ArenaScene, { league: this.T.arena, result });
    else if (this.p0.visitor) { Base.visitDone(); Game.save(); UI.go(ExploreScene, { home: 'yard', result }); }
    else if (this.p0.first) UI.go(ExploreScene, { zone: this.zoneId, fresh: true, arrive: true, result }); // from the Star Altar on to the meadow (with its zone banner)
    else UI.go(ExploreScene, { zone: this.zoneId, returning: true, result });
  },

  /* ---------------- fx ---------------- */
  async orbIn(slot) {
    const [gx, gy] = slot.side === 'e' ? [EX, EY] : [PX, PY];
    const x = gx, y = gy - 30;
    const [sx, sy] = slot.side === 'e' ? [1180, 300] : [110, 560];
    const f = slot.side === 'e' ? this.e : this.p;
    const orb = U.img(WArt.item('orb'), 'b-orb');
    UI.fx.appendChild(orb);
    const path = q => [sx + (x - sx) * q, sy + (y - sy) * q - Math.sin(q * Math.PI) * 140];
    const kf = [];
    for (let i = 0; i <= 10; i++) { const q = i / 10, [px, py] = path(q); kf.push({ transform: `translate(${(px - 30).toFixed(1)}px, ${(py - 30).toFixed(1)}px) rotate(${(q * 620).toFixed(0)}deg)` }); }
    Snd.play('throw');
    const fx = VFX.ok();
    if (fx) VFX.shot(path, 480, { size: 5, cols: VFX.PAL.star, rate: 70, trail: (px, py) => VFX.part({ x: px, y: py, vx: U.rf(-30, 30), vy: U.rf(-30, 30), shape: 'star', cols: ['#fff6a0', '#ffffff'], s0: U.rf(4, 7), s1: 1, life: 340, rot: U.rf(0, 6) }) });
    await U.anim(orb, kf, { duration: 480, easing: 'linear', fill: 'forwards' });
    // the orb hovers above the base and charges up
    const hov = `translate(${x - 30}px, ${y - 70}px)`;
    if (fx) VFX.converge(x, y - 40, 22, VFX.PAL.star, { r: [70, 120], life: [260, 340] });
    await U.anim(orb, [{ transform: `translate(${x - 30}px, ${y - 30}px)` }, { transform: hov + ' scale(1.15)', offset: 0.55 }, { transform: hov + ' scale(1.4)', filter: 'brightness(3)' }], { duration: 300, easing: 'ease-out', fill: 'forwards' });
    orb.remove();
    Snd.play('pop');
    if (f) setTimeout(() => Snd.cry(f.mon.sp), 180);
    if (f) this.goBanner(slot.side === 'p' ? t('b.go', { name: f.sp.name }) : f.sp.name, slot.side);
    if (fx) await VFX.summon(x, gy, { big: slot.side === 'e' && this.bossy(), cols: VFX.PAL[VFX.EL[f ? f.sp.el : ''] || 'star'] || VFX.PAL.star });
    else { UI.burst(x, y - 40, ['#ffffff', '#fff6a0', '#8fd8ff'], 14, 110); FX.ring(x, y - 60, '#ffffff', 180); }
    slot.spr.style.opacity = 1;
    await U.anim(slot.spr, [
      { transform: 'translate(-50%,-96%) scale(.15)', filter: 'brightness(8) saturate(0)' },
      { transform: 'translate(-50%,-96%) scale(1.2, .86)', filter: 'brightness(3) saturate(.4)', offset: 0.45 },
      { transform: 'translate(-50%,-96%) scale(.92, 1.1)', filter: 'brightness(1.4)', offset: 0.72 },
      { transform: 'translate(-50%,-96%) scale(1)', filter: 'brightness(1)' }], { duration: 560, easing: 'ease-out' });
  },
  hitFx(D, dmg, tm, crit, quiet) {
    const [x, y] = this.center(D);
    U.anim(D.slot.img, [{ filter: 'brightness(1)' }, { filter: 'brightness(3) saturate(0)' }, { filter: 'brightness(1)' }], { duration: 260 });
    const kb = (D.side === 'e' ? 1 : -1) * (crit ? 26 : 14);
    U.anim(D.slot.spr, [{ marginLeft: '0px' }, { marginLeft: kb + 'px' }, { marginLeft: -kb * 0.4 + 'px' }, { marginLeft: kb * 0.2 + 'px' }, { marginLeft: '0px' }], { duration: 320 });
    UI.float(x + U.ri(-20, 20), y - 30, '-' + dmg, crit ? 'crit' : tm > 1 ? 'super' : tm < 1 ? 'weak' : 'dmg');
    if (!quiet) {
      Snd.play(crit ? 'crit' : 'hit');
      if (tm > 1) setTimeout(() => Snd.play('super'), 120);
      if (tm > 1) this.zwheel(D);
      if (crit) this.tag(D, t('b.crit_tag'), 'crit');
      else if (tm > 1) this.tag(D, t('b.super_tag'), 'super');
      else if (tm < 1) this.tag(D, t('b.weak_tag'), 'weak');
    }
  },
  statusFx(f, st) { FX.status(st, ...this.center(f)); },
  stageFx(f, up) {
    FX.stage(...this.center(f), up);
    U.anim(f.slot.img, [{ filter: 'brightness(1)' }, { filter: up ? 'brightness(1.5) drop-shadow(0 0 12px #9dff7a)' : 'brightness(.7) drop-shadow(0 0 12px #ff4d5d)' }, { filter: 'brightness(1)' }], { duration: 600 });
  },
  async faintFx(f) {
    Snd.play('faint');
    if (VFX.ok()) VFX.dissolve(...this.center(f)); else FX.burst(...this.center(f), 'fx-smoke', 6, { dist: 80, size: 60, dur: 800 });
    await U.anim(f.slot.spr, [{ transform: 'translate(-50%,-96%)', opacity: 1 }, { transform: 'translate(-50%,-70%)', opacity: 0 }], { duration: 600, fill: 'forwards' });
    f.slot.spr.style.opacity = 0;
  },
};
