/* Dev: in-page layout audit. Load it into a running game page (dev server) and call its checks:
 *   eval(await (await fetch('/tools/audit.js')).text());  await Audit.setup();  await Audit.tour();
 * Audit.tour() visits every screen and reports, per screen: UI under Poki's pill, text below the size limit (on-screen
 * px, after the stage's scale), clipped text, text printed over other text, and UI outside the stage. The same checks
 * run one by one: Audit.pill(), Audit.fonts(px), Audit.clipped(), Audit.overlaps(), Audit.offstage(). */
window.Audit = {
  vis(el) {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false;
    for (let p = el; p && p !== document.body; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === 'none' || +c.opacity === 0 || c.visibility === 'hidden') return false; if (p.hidden) return false; }
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
  },
  /** is anything of el on top where it stands (not hidden under a window, a menu page or a dim backdrop)? Every element
   *  takes pointer events while this runs, so toasts and labels that normally let taps through are found as well. */
  onTop(el) {
    const r = el.getBoundingClientRect();
    for (const [fx, fy] of [[0.5, 0.5], [0.2, 0.5], [0.8, 0.5]]) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
      const top = document.elementFromPoint(x, y);
      if (top && (top === el || el.contains(top) || top.contains(el) && top.tagName !== 'DIV')) return true;
    }
    return false;
  },
  withHits(fn) {
    const st = document.createElement('style');
    // (the full-screen layers — the fade, the effects, the battle wipe, the toast column, the ambient particles — stay see-through)
    st.textContent = '#game, #game * { pointer-events: auto !important; } #fade, #fx, #fx *, #wipe, #wipe *, #toasts, .amb, .amb * { pointer-events: none !important; }';
    document.head.appendChild(st);
    try { return fn(); } finally { st.remove(); }
  },
  /** is el under an open window (a popup, a menu page, a dialogue) while not being part of it? */
  underWindow(el) {
    if (el.closest('#modals')) return false;
    if (document.querySelector('#modals .modal.sheet')) return true; // a menu page covers the whole screen
    const r = el.getBoundingClientRect();
    const top = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).find(e => this.vis(e)); // (faded toasts do not count)
    return !!(top && top.closest('#modals'));
  },
  /** elements that carry their own text and can be seen (loose: also those partly covered by other UI, for overlaps) */
  texts(root = document.getElementById('game'), loose) {
    return this.withHits(() => {
      const out = [];
      for (const el of root.querySelectorAll('*')) {
        if (['SCRIPT', 'STYLE', 'svg', 'SVG'].includes(el.tagName) || el.closest('svg')) continue;
        const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
        if (!own || !this.vis(el) || (loose ? this.underWindow(el) : !this.onTop(el))) continue;
        out.push({ el, text: own });
      }
      return out;
    });
  },
  name(el) { return (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '')); },
  /** what lies under Poki's mobile pill (62×46 at 24 px from the top; 92×64 from 1211 px) */
  pill() {
    // sample the pill's area and look at what is on top there (a backdrop, the world or empty sky is fine)
    const big = innerWidth >= 1211, R = { l: 0, t: 24, r: big ? 92 : 62, b: 24 + (big ? 64 : 46) };
    const hits = new Set(), bg = '.ex-back, .ex-bg, .b-bg, .ti-bg, .pr-bg, .pr-bgw, .world, .stage16, .rv-rays, .sheet-back, .modal-back, .sh-body, .sheet, .rv, #scene, #hud, #fx, #toasts, #modals, #fade, .talk-back, .al-world, .al-sky';
    for (let x = R.l + 3; x < R.r; x += 8) for (let y = R.t + 3; y < R.b; y += 8) {
      const top = document.elementFromPoint(x, y);
      if (!top || top === document.body || top.id === 'game' || top.id === 'poki-debug-pill' || top.closest('#poki-debug-pill')) continue;
      const hit = top.closest('button, .btn, .snd, .hb-goal, .hb-q, .b-card, .sh-bar b, p, h4, small, em, .chip, .card, [class*="-card"]');
      if (hit && !hit.matches(bg)) hits.add(this.name(hit) + ' "' + (hit.textContent || '').trim().slice(0, 20) + '"');
    }
    return [...hits];
  },
  /** text whose size on screen is below px (the stage is scaled by UI.scale) */
  fonts(px = 11) {
    const k = UI.scale, out = {};
    for (const { el, text } of this.texts()) {
      const fs = parseFloat(getComputedStyle(el).fontSize) * k;
      if (fs < px - 0.01) { const key = this.name(el) + ' ' + (fs).toFixed(1) + 'px'; (out[key] = out[key] || []).push(text.slice(0, 18)); }
    }
    return Object.entries(out).map(([k, v]) => k + ' ← ' + [...new Set(v)].slice(0, 3).join(' | '));
  },
  /** text cut off by its box (ellipsis or overflow hidden) */
  clipped() {
    const out = [];
    for (const { el, text } of this.texts()) {
      const cs = getComputedStyle(el);
      const clipX = el.scrollWidth > el.clientWidth + 1 && (cs.overflow !== 'visible' || cs.textOverflow === 'ellipsis');
      const clipY = el.scrollHeight > el.clientHeight + 2 && cs.overflowY !== 'visible' && cs.overflowY !== 'auto' && cs.overflowY !== 'scroll';
      if (clipX || clipY) out.push(this.name(el) + ' "' + text.slice(0, 24) + '"' + (clipX ? ' ↔' : '') + (clipY ? ' ↕' : ''));
    }
    return out;
  },
  /** two texts printed over each other (neither inside the other) */
  overlaps() {
    const T = this.texts(undefined, true).map(o => ({ ...o, r: o.el.getBoundingClientRect() })).filter(o => o.r.width > 2);
    const out = [];
    for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
      const a = T[i], b = T[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (x > 3 && y > 3 && x * y > 0.15 * Math.min(a.r.width * a.r.height, b.r.width * b.r.height)) out.push(`"${a.text.slice(0, 16)}" ✕ "${b.text.slice(0, 16)}"`);
    }
    return out.slice(0, 12);
  },
  /** UI (buttons, text) that sticks out of the stage (not counting what a page scrolls to, or the Star Map's nodes) */
  offstage() {
    const g = document.getElementById('game').getBoundingClientRect(), out = [];
    const scrolls = el => { for (let p = el.parentElement; p && p.id !== 'game'; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return true; } return false; };
    for (const el of document.querySelectorAll('#game button, #game .btn, #game .snd')) {
      if (!this.vis(el) || el.classList.contains('mnode') || scrolls(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.left < g.left - 2 || r.right > g.right + 2 || r.top < g.top - 2 || r.bottom > g.bottom + 2) out.push(this.name(el));
    }
    return [...new Set(out)];
  },
  report(name) {
    const r = { screen: name, pill: UI.pill ? this.pill() : [], small: this.fonts(this.min || 11), clipped: this.clipped(), overlaps: this.overlaps(), offstage: this.offstage() };
    for (const k of Object.keys(r)) if (Array.isArray(r[k]) && !r[k].length) delete r[k];
    return r;
  },
  sleep: ms => new Promise(r => setTimeout(r, ms)),
  /** a mid-game save with most of the menus unlocked */
  async setup() {
    try { localStorage.clear(); } catch (e) { /* ignore */ }
    Game.newGame('Tester', { skin: WArt.SKINS[1], hair: 'spiky', hairC: WArt.HAIRC[1], top: WArt.SUITS[0], acc: ['goggles'] }, 'sunkit');
    Object.assign(Game.s.flags, { tutCatch: 1, tutDone: 1, introCamp: 1, introArena: 1, homeIntro: 1, yardIntro: 1, returning: 1 });
    Game.s.login.day = U.today(); Game.s.flags.todayDay = U.today();
    Game.s.visited = Object.keys(ZONES);
    Game.s.sigils = ['sunny'];
    Game.s.tamer.lv = 6; Game.s.stats.battles = 20; Game.s.stats.catches = 5; Game.s.stats.tamers = 2; Game.s.coins = 4321;
    for (const [sp, lv] of [['breezle', 12], ['mossmoo', 14], ['finnip', 9], ['fluffire', 11], ['zapsy', 7]]) Game.addMon(Game.makeMon(sp, lv));
    Game.addItem('berry', 3); Game.addItem('potion', 2); Game.addItem('nova', 2); Game.addItem('candy', 1);
    Game.save();
    return 'ok';
  },
  async go(scene, p, wait = 1600) { await UI.go(scene, p || {}); await this.sleep(wait); },
  /** end any dialogue still on screen (a finished step's talk must not be counted on the next screen) */
  endTalks() { for (const fn of UI._talkEnd.slice()) fn(); document.querySelectorAll('.talk-back').forEach(e => e.remove()); },
  async open(fn, wait = 1100) { UI.closeAll(true); this.endTalks(); await this.sleep(150); fn(); await this.sleep(wait); },
  /** every screen once: [name, async () => bring it up] */
  screens() {
    const mon = () => Game.team()[0].id;
    return [
      ['explore', () => this.go(ExploreScene, { zone: 'clover' })],
      ['team', () => this.open(() => Menus.team())],
      ['orbling', () => this.open(() => Menus.monDetail(mon()))],
      ['profile', () => this.open(() => Menus.profile())],
      ['codex', () => this.open(() => Menus.codex())],
      ['bag', () => this.open(() => Menus.bag())],
      ['quests', () => this.open(() => Menus.quests())],
      ['shop', () => this.open(() => Menus.shop())],
      ['today', () => this.open(() => Menus.today())],
      ['settings', () => this.open(() => Menus.settings())],
      ['rewards', () => this.open(() => UI.rewards(t('b.win'), { coins: 120, txp: 40 }))],
      ['daily', () => this.open(() => { Game.s.login.day = 'x'; Menus.dailyGift(); })],
      ['reveal', () => this.open(() => Menus.caughtCard(Game.makeMon('zapsy', 4), true, 'team', 0, { coins: 24, txp: 19 }), 1600)],
      ['cheer', async () => { UI.closeAll(true); await this.go(ExploreScene, { zone: 'clover' }, 900); UI.cheer(t('q.done'), { coins: 100, txp: 30 }, { sub: Quests.text(Quests.main()), color: 'green' }); await this.sleep(900); }],
      ['battle', async () => { UI.closeAll(true); await UI.go(BattleScene, { kind: 'wild', enemies: [Game.makeMon('fluffire', 5)], zone: 'clover' }, { trans: 'battle' }); await this.sleep(3200); }],
      ['galaxy', () => this.go(GalaxyScene, {})],
      ['base', () => this.go(ExploreScene, { home: true })],
    ];
  },
  /** the rarer screens (a second tour, so the first stays quick) */
  screens2() {
    const mon = () => Game.team()[0].id;
    const tab = i => { const b = document.querySelectorAll('#modals .sh-bar .seg button')[i]; if (b) b.click(); };
    return [
      ['orb-moves', async () => { await this.open(() => Menus.monDetail(mon()), 700); tab(1); await this.sleep(500); }],
      ['orb-evo', async () => { tab(2); await this.sleep(500); }],
      ['tutor', () => this.open(() => Menus.tutor(Game.mon(mon())))],
      ['spin', () => this.open(() => Menus.spin())],
      ['typechart', () => this.open(() => Menus.typeChart())],
      ['typechart-signs', async () => { tab(1); await this.sleep(500); }],
      ['observatory', () => this.open(() => Menus.observatory())],
      ['hatchery', () => this.open(() => Menus.camp('hatch'))],
      ['dojo', () => this.open(() => Menus.camp('dojo'))],
      ['medals', () => this.open(() => Menus.medals())],
      ['trophy', () => this.open(() => Menus.trophy('bronze', { coins: 500, egg_star: 1 }))],
      ['sigil', () => this.open(() => Menus.sigil('sunny'))],
      ['stall', () => this.open(() => Menus.bruno())],
      ['workshop', () => this.open(() => Menus.workshop(WORKSHOPS[0]))],
      ['evolve', () => this.open(() => Menus.evolve(Object.assign(Game.makeMon('fluffire', 30), {})), 3800)],
      ['confirm', () => this.open(() => UI.confirm(t('ti.new_q')))],
      ['talk', () => this.open(() => UI.talk([{ who: 'prof', text: t('pip.arena2') }]), 1400)],
      ['customize', () => this.open(() => IntroScene.customize(Game.s.look, Game.s.name))],
      ['tamer', async () => { UI.closeAll(true); await this.sleep(300); await UI.go(BattleScene, { kind: 'tamer', tamer: Object.keys(TAMERS).find(k => !TAMERS[k].npc && !TAMERS[k].guardian && TAMERS[k].team), enemies: [Game.makeMon('clawby', 8), Game.makeMon('nimbub', 8)], zone: 'clover' }, { trans: 'battle' }); await this.sleep(4200); }],
      ['arena', () => this.go(ArenaScene, { league: 'bronze' })],
      ['yard', () => this.go(ExploreScene, { home: 'yard' })],
      ['galaxy-card', async () => { await this.go(GalaxyScene, {}, 1200); const n = document.querySelector('.mnode:not(.locked)'); if (n) n.click(); await this.sleep(700); }],
      ['altar', () => this.go(IntroScene, {}, 3000)],
      ['title', () => this.go(TitleScene, {}, 1500)],
    ];
  },
  async tour2() {
    const keep = this.screens; this.screens = this.screens2;
    try { return await this.tour(); } finally { this.screens = keep; }
  },
  async tour(only) {
    const out = [];
    for (const [name, fn] of this.screens()) {
      if (only && !only.includes(name)) continue;
      try { await fn(); out.push(this.report(name)); } catch (e) { out.push({ screen: name, error: String(e) }); }
    }
    UI.closeAll(true);
    return out;
  },
};
'Audit ready';
