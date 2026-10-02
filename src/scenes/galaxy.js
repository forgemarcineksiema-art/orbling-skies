'use strict';
/* The Star Map (the world map): a wide painted panorama of the Star Isles that you drag around.
 * White rings mark locations (yellow = somewhere new, a padlock = sealed, your face = you are here); tap one
 * for a black location card with a picture, difficulty and GO!. Your pin then walks the star trail there. */

const ARENA_POS = [640, 262]; // legacy anchor (kept for older saves / callers)

const GalaxyScene = {
  async enter(args = {}) {
    const root = UI.scene;
    root.className = 'mapview';
    this.busy = false; this.cardEl = null; this.vx = 0; this.scrollKey = null;
    this.open = ISLES.filter(is => Game.isleUnlocked(is.id)).map(is => is.id);
    this.arenaOpen = Arena.anyUnlocked();
    const master = await MapArt.bake(this.open, this.arenaOpen);
    this.view = U.el('div', { class: 'mv-view' });
    this.layer = U.el('div', { class: 'mv-layer' });
    const cv = document.createElement('canvas');
    cv.width = MapArt.W; cv.height = MapArt.H; cv.className = 'mv-canvas';
    cv.getContext('2d').drawImage(master, 0, 0);
    this.layer.appendChild(cv);
    this.view.appendChild(this.layer);
    root.appendChild(this.view);
    this.buildNodes();
    // you-are-here pin with the tamer's face
    this.pin = U.el('div', { class: 'mv-pin' }, U.el('span', { class: 'pin-face' }, U.img(WArt.person(Game.s.look))));
    this.layer.appendChild(this.pin);
    const here = this.nodes.find(n => n.here) || this.nodes[0];
    this.placePin(here.x, here.y);
    // chrome: the isle scroll, edge arrows, back
    this.scrollEl = U.el('div', { class: 'mv-scroll' }, U.el('b', { class: 'mvs-name' }), U.el('span', { class: 'mvs-a' }), U.el('span', { class: 'mvs-b' }));
    this.arL = U.el('button', { class: 'mv-arrow l snd', html: WArt.icon('back', 34), onclick: () => this.scrollBy(-this.vw * 0.48) });
    this.arR = U.el('button', { class: 'mv-arrow r snd', html: WArt.icon('back', 34), onclick: () => this.scrollBy(this.vw * 0.48) });
    const back = U.el('button', { class: 'mv-back snd', onclick: () => this.back() }, U.el('span', { html: WArt.icon('back', 26) }), U.el('b', { text: t('gx.back') }));
    root.append(this.scrollEl, this.arL, this.arR, back);
    root.appendChild(U.el('button', { class: 'mv-home snd', onclick: () => { if (!this.busy) { this.busy = true; ExploreScene.goHome(); } } }, U.img(HudArt.home()), U.el('b', { text: t('hud.home') })));
    if (Game.finished()) root.appendChild(U.el('button', { class: 'btn purple sm mv-obs', html: WArt.icon('telescope', 22) + ' ' + t('ex.obs'), onclick: () => Menus.observatory() }));
    const hint = U.el('div', { class: 'mv-hint', text: t('gx.drag') });
    root.appendChild(hint);
    setTimeout(() => hint.classList.add('out'), 4200);
    // camera: open on the isle you asked for (or where you are)
    const focus = args.isle && ISLE[args.isle] ? args.isle : ZONES[Game.s.loc.zone].isle;
    this.layoutCam();
    this.sx = this.clampX(MapArt.isleCenter(focus)[0] - this.vw / 2);
    this.applyScroll();
    this.bindInput();
    UI.hudBuild();
    UI.hudShow(true);
    UI.hud.classList.add('on-map');
    Snd.music('galaxy');
    Platform.gameplayStart();
  },
  exit() {
    this.busy = true;
    clearInterval(this.walkT); clearInterval(this.glideT);
    if (this.view) this.view.removeEventListener('pointerdown', this._pd);
    window.removeEventListener('pointermove', this._pm);
    window.removeEventListener('pointerup', this._pu);
    if (this.view) this.view.removeEventListener('wheel', this._wh);
    window.removeEventListener('keydown', this._kd);
    UI.hud.classList.remove('on-map');
    UI.hudShow(false);
  },
  back() {
    if (this.busy) return;
    this.busy = true;
    UI.go(ExploreScene, { zone: Game.s.loc.zone, returning: true });
  },
  async toArena() {
    const n = this.nodes.find(x => x.arena);
    if (n) this.card(n);
  },

  /* ---------------- nodes ---------------- */
  /** which location rings the main quest points at ("isle:key") */
  questNodes() {
    const q = Quests.main(), out = new Set();
    if (!q) return out;
    if (q.type === 'guardian' && TAMERS[q.target] && TAMERS[q.target].guardian) out.add(TAMERS[q.target].guardian + ':g');
    if (q.type === 'tamers' && q.isle) ISLE[q.isle].zones.forEach((z, i) => { if (ZONES[z].npcs.some(([id]) => TAMERS[id] && !TAMERS[id].npc && !TAMERS[id].guardian && !Game.beaten(id))) out.add(q.isle + ':z' + (i + 1)); });
    if (q.type === 'visit' && q.isle) out.add(q.isle + ':z1');
    if ((q.type === 'arena' || q.type === 'league') && this.arenaOpen) out.add('arena');
    return out;
  },
  buildNodes() {
    this.nodes = [];
    const cur = Game.s.loc.zone, qn = this.questNodes();
    for (const is of ISLES) {
      const open = this.open.includes(is.id);
      for (const k of ['z1', 'z2', 'g']) {
        const guard = k === 'g', zid = is.zones[k === 'z1' ? 0 : 1];
        const [x, y] = MapArt.node(is.id, k);
        const gOpen = open && Game.guardianOpen(is.id), done = guard && Game.s.sigils.includes(is.id);
        const locked = !open || (guard && !gOpen && !done);
        const here = !guard && zid === cur;
        const fresh = !guard && open && !Game.s.visited.includes(zid);
        const n = { is, k, zid, guard, locked, here, done, x, y };
        const el = U.el('button', { class: 'mnode snd' + (guard ? ' guard' : '') + (locked ? ' locked' : '') + (fresh ? ' new' : '') + (done ? ' done' : '') + (here ? ' here' : ''), style: { left: x + 'px', top: y + 'px' }, onclick: e => { e.stopPropagation(); if (!this.dragMoved) this.card(n); } },
          U.el('i', { class: 'mn-ring' }));
        if (!open && !guard) el.appendChild(U.img(HudArt.padlock(), 'mn-lock'));
        if (guard) {
          const por = U.el('span', { class: 'mn-boss' }, U.el('span', { class: 'mnb-in' }, U.img(WArt.person(tamerLook(is.guardian)))));
          if (locked) por.appendChild(U.img(HudArt.padlock(), 'mn-block'));
          if (done) por.appendChild(U.el('b', { class: 'mn-star', text: '★' }));
          el.appendChild(por);
        }
        const wx = open && !guard ? Weather.now(is.id) : ''; // 3.5: the isle's weather right now
        el.appendChild(U.el('em', { class: 'mn-tip', html: `<b>${guard ? UI.whoName(is.guardian) : t('zone.' + zid)}</b>${guard ? t('gx.guardian') : t('ui.lv') + ' ' + ZONES[zid].lv[0] + '–' + ZONES[zid].lv[1]}${wx ? ' · ' + Weather.name(wx, is.id) : ''}` }));
        if (wx && k === 'z1') el.appendChild(U.el('i', { class: 'mn-wx', title: Weather.effect(wx), html: Weather.icon(wx, 24) }));
        if (qn.has(is.id + ':' + k) && !locked) el.appendChild(U.el('i', { class: 'mn-q', text: '!' }));
        n.el = el;
        this.layer.appendChild(el);
        this.nodes.push(n);
      }
    }
    // the Star Arena hangs off the Coral Isle (it opens with the first sigil, like the Coral Isle)
    const [ax, ay] = MapArt.arenaNode();
    const an = { arena: true, locked: !this.arenaOpen, x: ax, y: ay };
    an.el = U.el('button', { class: 'mnode arena snd' + (an.locked ? ' locked' : ''), style: { left: ax + 'px', top: ay + 'px' }, onclick: e => { e.stopPropagation(); if (!this.dragMoved) this.card(an); } },
      U.el('i', { class: 'mn-ring' }), an.locked ? U.img(HudArt.padlock(), 'mn-lock') : null,
      U.el('em', { class: 'mn-tip', html: `<b>${t('ar.title')}</b>${this.arenaOpen ? t('ar.trophies', { n: Arena.trophies() }) : t('ar.need', { n: 1 })}` }),
      qn.has('arena') ? U.el('i', { class: 'mn-q', text: '!' }) : null);
    this.layer.appendChild(an.el);
    this.nodes.push(an);
  },
  difficulty(n) {
    if (n.arena) return 'arena';
    if (n.guard) return 'boss';
    const top = Math.max(1, ...Game.team().map(m => m.lv));
    const [lo, hi] = ZONES[n.zid].lv;
    return top >= hi + 2 ? 'easy' : top >= lo ? 'medium' : 'hard';
  },

  /* ---------------- the location card (black, with a picture, difficulty and GO!) ---------------- */
  card(n) {
    if (this.busy) return;
    this.closeCard(true);
    Snd.play('select');
    for (const m of this.nodes) m.el.classList.toggle('sel', m === n);
    const box = U.el('div', { class: 'mv-card' });
    const th = document.createElement('canvas');
    th.width = 302; th.height = 170; th.className = 'mvc-thumb';
    const [biome, seed] = n.arena ? ['arena', 5] : [ZONES[n.zid].biome, ZONES[n.zid].seed];
    WArt.bake(biome, seed).then(c => { if (c) try { th.getContext('2d').drawImage(c, 0, 0, 302, 170); } catch (e) { /* ignore */ } });
    const diff = this.difficulty(n);
    const name = n.arena ? t('ar.title') : n.guard ? UI.whoName(n.is.guardian) : t('zone.' + n.zid);
    box.append(U.el('button', { class: 'xbtn snd nosnd', html: WArt.icon('close', 22), onclick: () => this.closeCard() }),
      U.el('div', { class: 'mvc-tw' }, th, n.guard ? U.el('div', { class: 'mvc-por' }, U.img(WArt.portrait(tamerLook(n.is.guardian)))) : null),
      U.el('div', { class: 'mvc-row' }, U.el('b', { class: 'mvc-name', text: name }), U.el('em', { class: 'mvc-diff d-' + diff, text: t('gx.d_' + diff) })));
    let note = '', sp = null;
    if (n.arena) note = this.arenaOpen ? t('ar.trophies', { n: Arena.trophies() }) : t('ar.need', { n: 1 });
    else if (n.guard) {
      const [a, b] = Game.isleTamersBeaten(n.is.id);
      note = !this.open.includes(n.is.id) ? t('gx.locked_isle') : n.done ? t('gx.guard_done') : n.locked ? t('gx.guard_lock', { n: a, t: b }) : t('gx.guard_ready');
    } else if (!this.open.includes(n.is.id)) note = t('gx.locked_isle');
    else {
      const ids = [...new Set(ZONES[n.zid].spawns.map(([id]) => id))];
      const tam = ZONES[n.zid].npcs.map(([id]) => id).filter(id => TAMERS[id] && !TAMERS[id].npc && !TAMERS[id].guardian);
      note = `${t('ui.lv')} ${ZONES[n.zid].lv[0]}–${ZONES[n.zid].lv[1]} &middot; ${t('gx.isle_prog', { n: ids.filter(id => Game.caught(id)).length, t: ids.length })}` + (tam.length ? ` &middot; ${t('gx.tamers', { n: tam.filter(id => Game.beaten(id)).length, t: tam.length })}` : '');
      sp = U.el('div', { class: 'mvc-sp' }, ...ids.map(id => U.img(MonArt.url(id, { anim: false }), Game.caught(id) ? '' : Game.seen(id) ? 'sil' : 'ghost')));
      const rare = zoneRare(n.zid);
      if (rare) note += `<br><i class="rdot r-${SPECIES[rare].rarity}"></i>` + t('ex.rare_target', { name: Game.seen(rare) ? SPECIES[rare].name : '???' }) + (Game.caught(rare) ? ' ✓' : '');
    }
    box.appendChild(U.el('p', { class: 'mvc-note', html: note }));
    if (sp) box.appendChild(sp);
    let btn;
    if (n.locked) btn = U.el('button', { class: 'btn white go mvc-go off', html: `<span>${WArt.icon('lock', 22)} ${t('gx.sealed')}</span>` });
    else if (n.here) btn = U.el('button', { class: 'btn green go mvc-go', html: `<span>${t('gx.here')}</span>`, onclick: () => this.back() });
    else btn = U.el('button', { class: 'btn blue go mvc-go', html: `<span>${t('gx.fly')}</span>`, onclick: () => this.go(n) });
    box.appendChild(btn);
    // beside the ring, kept inside the screen (portrait: a sheet above the bottom buttons, see CSS)
    UI.scene.appendChild(box);
    if (!UI.portrait) {
      const sx = n.x - this.sx;
      const left = sx + 60 + 350 < 1270 ? sx + 60 : sx - 60 - 350;
      box.style.left = U.clamp(left, 10, 920) + 'px';
      box.style.top = U.clamp(n.y - 150, 70, 720 - (box.offsetHeight || 440) - 10) + 'px'; // its real height: the text may wrap
    }
    this.cardEl = box;
  },
  closeCard(silent) {
    if (!this.cardEl) return;
    if (!silent) Snd.play('close');
    this.cardEl.remove();
    this.cardEl = null;
    for (const m of this.nodes) m.el.classList.remove('sel');
  },

  /* ---------------- travel: the pin walks the star trail ---------------- */
  async go(n) {
    if (this.busy || n.locked) return;
    this.busy = true;
    this.closeCard(true);
    Snd.play('warp');
    await this.walkPin(this.pathTo(n));
    if (n.arena) { UI.go(ArenaScene, {}); return; }
    const curIsle = ZONES[Game.s.loc.zone].isle;
    if (n.is.id !== curIsle) await Platform.naturalBreak(true);
    Game.s.loc.x = 0;
    ExploreScene.saved = null;
    UI.go(ExploreScene, { zone: n.zid, fresh: true });
  },
  pathTo(n) {
    const r = MapArt.route();
    const idx = (isId, k) => r.findIndex(([a, b]) => a === isId && b === k);
    const curIsle = ZONES[Game.s.loc.zone].isle, curK = ISLE[curIsle].zones[0] === Game.s.loc.zone ? 'z1' : 'z2';
    const i0 = idx(curIsle, curK), i1 = n.arena ? idx('coral', 'g') : idx(n.is.id, n.k);
    const pts = [], step = i0 <= i1 ? 1 : -1;
    for (let i = i0; i !== i1 + step; i += step) pts.push(r[i][2]);
    if (n.arena) pts.push(MapArt.arenaNode());
    return pts;
  },
  walkPin(pts) {
    return new Promise(res => {
      if (pts.length < 2) { res(); return; }
      const segs = [];
      let L = 0;
      for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push([pts[i - 1], pts[i], L, d]); L += d; }
      const dur = U.clamp(L / 520, 0.6, 2.6) * 1000, t0 = performance.now();
      this.pin.classList.add('walk');
      const tick = () => {
        const q = Math.min(1, (performance.now() - t0) / dur), e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2, s = e * L;
        const seg = segs.find(g => s <= g[2] + g[3]) || segs[segs.length - 1];
        const u = seg[3] ? U.clamp((s - seg[2]) / seg[3], 0, 1) : 1;
        const x = seg[0][0] + (seg[1][0] - seg[0][0]) * u, y = seg[0][1] + (seg[1][1] - seg[0][1]) * u;
        this.placePin(x, y - Math.abs(Math.sin(q * Math.PI * 9)) * 10);
        this.sx = this.clampX(x - this.vw / 2); this.applyScroll();
        if (q >= 1) { clearInterval(this.walkT); this.pin.classList.remove('walk'); res(); }
      };
      clearInterval(this.walkT);
      this.walkT = setInterval(tick, 16);
      tick();
    });
  },
  placePin(x, y) { this.pin.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`; },

  /* ---------------- camera ---------------- */
  /** portrait: the panorama is scaled up to the tall screen, showing about one isle at a time */
  layoutCam() {
    this.k = UI.portrait ? U.clamp((UI.H - 250) / 720, 1, 1.3) : 1;
    this.top = UI.portrait ? Math.round((UI.H - 720 * this.k) / 2 + 10) : 0;
    this.vw = UI.W / this.k; // how much of the panorama is on screen
  },
  layout() {
    if (!this.layer) return;
    const mid = this.sx + this.vw / 2;
    this.layoutCam();
    this.closeCard(true);
    this.sx = this.clampX(mid - this.vw / 2);
    this.applyScroll();
  },
  clampX(x) { return U.clamp(x, 0, MapArt.W - this.vw); },
  applyScroll() {
    this.layer.style.transform = `translate3d(${(-this.sx * this.k).toFixed(1)}px, ${this.top}px, 0)` + (this.k !== 1 ? ` scale(${this.k.toFixed(4)})` : '');
    this.arL.classList.toggle('off', this.sx <= 1);
    this.arR.classList.toggle('off', this.sx >= MapArt.W - this.vw - 1);
    // the scroll names the isle in the middle of the view (or the Arena)
    const mid = this.sx + this.vw / 2;
    let best = null, bd = 1e9;
    for (const is of ISLES) { const d = Math.abs(MapArt.isleCenter(is.id)[0] - mid); if (d < bd) { bd = d; best = is; } }
    const key = Math.abs(MapArt.arenaNode()[0] - mid) < bd ? 'arena' : best.id;
    if (key === this.scrollKey) return;
    this.scrollKey = key;
    const nm = U.$('.mvs-name', this.scrollEl), a = U.$('.mvs-a', this.scrollEl), b = U.$('.mvs-b', this.scrollEl);
    if (key === 'arena') {
      nm.textContent = t('ar.title');
      a.innerHTML = `${WArt.icon('trophy', 20)} ${this.arenaOpen ? t('ar.trophies', { n: Arena.trophies() }) : t('ar.need', { n: 1 })}`;
      b.innerHTML = '';
    } else {
      const sp = new Set();
      for (const z of best.zones) for (const [id] of ZONES[z].spawns) sp.add(id);
      const all = [...sp], [tb, tt] = Game.isleTamersBeaten(best.id);
      nm.textContent = t('isle.' + best.id);
      a.innerHTML = `<img src="${WArt.item('orb')}"> ${t('gx.isle_prog', { n: all.filter(id => Game.caught(id)).length, t: all.length })}`;
      b.innerHTML = this.open.includes(best.id) ? `${WArt.icon('swords', 20)} ${tb}/${tt}` + (Game.s.sigils.includes(best.id) ? ` &nbsp;${WArt.icon('badge', 20)}` : '') : `${WArt.icon('lock', 20)} ${t('gx.sealed')}`;
    }
    this.scrollEl.classList.remove('flip'); void this.scrollEl.offsetWidth; this.scrollEl.classList.add('flip');
  },
  scrollBy(dx) {
    if (this.busy) return;
    this.closeCard(true);
    const from = this.sx, to = this.clampX(this.sx + dx), t0 = performance.now();
    clearInterval(this.glideT);
    this.glideT = setInterval(() => {
      const q = Math.min(1, (performance.now() - t0) / 420), e = 1 - Math.pow(1 - q, 3);
      this.sx = from + (to - from) * e; this.applyScroll();
      if (q >= 1) clearInterval(this.glideT);
    }, 16);
  },
  bindInput() {
    let down = null;
    this._pd = e => {
      if (this.busy || e.target.closest('.mnode, .mv-card, button')) return;
      clearInterval(this.glideT);
      down = { x: e.clientX, sx: this.sx, t: performance.now(), lx: e.clientX };
      this.dragMoved = false;
      this.view.classList.add('drag');
    };
    this._pm = e => {
      if (!down) return;
      const dx = (e.clientX - down.x) / UI.scale / this.k;
      if (Math.abs(dx) > 6) { this.dragMoved = true; this.closeCard(true); }
      const now = performance.now();
      this.vx = ((down.lx - e.clientX) / UI.scale / this.k) / Math.max(1, now - down.t) * 16;
      down.t = now; down.lx = e.clientX;
      this.sx = this.clampX(down.sx - dx); this.applyScroll();
    };
    this._pu = () => {
      if (!down) return;
      down = null;
      this.view.classList.remove('drag');
      if (!this.dragMoved) { this.closeCard(); return; }
      setTimeout(() => { this.dragMoved = false; }, 30);
      // a little inertia after a flick
      let v = U.clamp(this.vx, -60, 60);
      clearInterval(this.glideT);
      this.glideT = setInterval(() => { v *= 0.9; this.sx = this.clampX(this.sx + v); this.applyScroll(); if (Math.abs(v) < 0.4) clearInterval(this.glideT); }, 16);
    };
    this._wh = e => { e.preventDefault(); if (this.busy) return; this.closeCard(true); clearInterval(this.glideT); this.sx = this.clampX(this.sx + (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / this.k); this.applyScroll(); };
    this._kd = e => {
      if (UI.anyModal()) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.scrollBy(-this.vw * 0.31);
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.scrollBy(this.vw * 0.31);
      else if (e.key === 'Escape') { if (this.cardEl) this.closeCard(); else this.back(); }
    };
    this.view.addEventListener('pointerdown', this._pd);
    window.addEventListener('pointermove', this._pm);
    window.addEventListener('pointerup', this._pu);
    this.view.addEventListener('wheel', this._wh, { passive: false });
    window.addEventListener('keydown', this._kd);
  },
};
