'use strict';
/* 3.0 Base logic: friendship (hearts 0–5 with small battle perks), workshops (Orblings from storage produce items
 * while you are away, up to 10 h, collected with one tap), decorations (bought with coins, placed on fixed spots;
 * their charm speeds up the workshops and draws visitor Orblings of their element), the daily bonuses (first catch
 * of the day, a welcome-back gift) and the mini-stories of isle characters. Save data: Game.s.base. */

const Base = {
  /** the Base opens with the first sigil or the first egg (the same moment the HUD's Base button appears) */
  open() { const s = Game.s; return s.sigils.length >= 1 || Camp.eggsInBag() > 0 || s.camp.eggs.length > 0; },

  /* ---------------- friendship ---------------- */
  hearts(m) { const fr = m.fr || 0; let h = 0; for (const x of FR_HEARTS) if (fr >= x) h++; return h; },
  /** how far along the way to the next heart (1 with all five) */
  heartProg(m) {
    const h = this.hearts(m);
    if (h >= FR_HEARTS.length) return 1;
    const lo = h ? FR_HEARTS[h - 1] : 0;
    return ((m.fr || 0) - lo) / (FR_HEARTS[h] - lo);
  },
  /** friendship from battles and work (capped per Orbling and day) → the new heart count when one was gained */
  befriend(m, n) {
    const d = U.today();
    if (!m.frd || m.frd[0] !== d) m.frd = [d, 0];
    const add = Math.min(n, FR_DAILY - m.frd[1], FR_HEARTS[FR_HEARTS.length - 1] - (m.fr || 0));
    if (add <= 0) return 0;
    const h0 = this.hearts(m);
    m.frd[1] += add;
    m.fr = (m.fr || 0) + add;
    const h1 = this.hearts(m);
    return h1 > h0 ? h1 : 0;
  },
  petted(m) { const p = Game.s.pets; return !!p && p.day === U.today() && p.ids.includes(m.id); },
  /** petting, once a day per Orbling: friendship and a tenth of a level → { xp, r, up } or null if already petted */
  pet(m) {
    const p = Game.s.pets || (Game.s.pets = { day: '', ids: [] });
    if (p.day !== U.today()) { p.day = U.today(); p.ids = []; }
    if (p.ids.includes(m.id)) return null;
    p.ids.push(m.id);
    const h0 = this.hearts(m);
    m.fr = Math.min(FR_HEARTS[FR_HEARTS.length - 1], (m.fr || 0) + FR_PET);
    const h1 = this.hearts(m);
    let xp = 0, r = null;
    if (m.lv < MAX_LV) { xp = Math.max(4, Math.round(Game.xpNeed(m.lv) * 0.1)); r = Game.gainXp(m, xp); }
    Game.s.stats.pets++;
    return { xp, r, up: h1 > h0 ? h1 : 0 };
  },
  /** your Orblings not petted yet today (the ones that can be reached at the glade) */
  petsLeft() { return this.glade().filter(m => !this.petted(m)).length; },
  /** who roams the glade: the team, then favourites, then the strongest in storage (workers and trainees are busy) */
  glade() {
    const box = Game.boxMons().filter(m => !this.busy(m.id)).sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || b.lv - a.lv);
    return Game.team().concat(box).slice(0, 16);
  },
  // battle perks (your Orblings only)
  xpMult(m) { const h = this.hearts(m); return h >= 5 ? 1.1 : h >= 1 ? 1.05 : 1; },
  cure(m) { return this.hearts(m) >= 2 ? 0.12 : 0; },
  crit(m) { return this.hearts(m) >= 3 ? 0.05 : 0; },
  endure(m) { const h = this.hearts(m); return h >= 5 ? 0.2 : h >= 4 ? 0.12 : 0; },

  /* ---------------- workshops ---------------- */
  built(id) { return Game.s.base.built.includes(id); },
  build(id) {
    const W = WS[id];
    if (!W || this.built(id) || Game.s.coins < W.cost) return false;
    Game.addCoins(-W.cost);
    Game.s.base.built.push(id);
    Platform.track('base', 'build', id);
    return true;
  },
  job(id) { return Game.s.base.ws[id] || null; },
  worker(id) { const j = this.job(id); return j ? Game.mon(j.id) : null; },
  /** where an Orbling is busy: a workshop id, 'dojo' or null */
  busy(monId) {
    if (Camp.training(monId)) return 'dojo';
    for (const W of WORKSHOPS) { const j = Game.s.base.ws[W.id]; if (j && j.id === monId) return W.id; }
    return null;
  },
  /** production speed: the worker's element, level and friendship, and the charm of your decorations */
  speed(W, m) { return (SPECIES[m.sp].el === W.el ? 1 : 0.6) * (1 + m.lv / 50) * (1 + 0.06 * this.hearts(m)) * (1 + this.charmBonus()); },
  capUnits(W, m) { return Math.max(1, Math.floor(WS_CAP_H * this.speed(W, m) / W.per)); },
  hours(j) { return Math.min(WS_CAP_H, Math.max(0, Date.now() - j.t) / 3600e3); },
  units(id) {
    const W = WS[id], j = this.job(id), m = j && Game.mon(j.id);
    if (!m) return 0;
    return Math.min(this.capUnits(W, m), Math.floor(this.hours(j) * this.speed(W, m) / W.per));
  },
  full(id) { const j = this.job(id); return !!j && !!Game.mon(j.id) && this.hours(j) >= WS_CAP_H; },
  /** time until the workshop is full (ms) */
  fullIn(id) { const j = this.job(id); return j ? Math.max(0, WS_CAP_H * 3600e3 - (Date.now() - j.t)) : 0; },
  assign(id, monId) {
    if (!this.built(id) || !Game.s.box.includes(monId) || this.busy(monId)) return false;
    if (this.job(id)) this.collect(id);
    Game.s.base.ws[id] = { id: monId, t: Date.now() };
    return true;
  },
  unassign(id) { const r = this.collect(id); delete Game.s.base.ws[id]; return r; },
  /** collect a workshop → { r: rewards, dust, sign, m, up } (the worker gains friendship; a started unit is kept) */
  collect(id) {
    const W = WS[id], j = this.job(id), m = j && Game.mon(j.id);
    const n = this.units(id);
    if (!m || n < 1) return null;
    const h = this.hours(j), r = {};
    for (let i = 0; i < n; i++) {
      if (W.extra && Math.random() < W.extra[1]) r[W.extra[0]] = (r[W.extra[0]] || 0) + 1;
      else if (W.out === 'coins') r.coins = (r.coins || 0) + W.amt;
      else r[W.out] = (r[W.out] || 0) + 1;
    }
    j.t = h >= WS_CAP_H ? Date.now() : j.t + n * W.per / this.speed(W, m) * 3600e3;
    Game.grant(r);
    let dust = 0;
    if (W.dust) { j.dr = (j.dr || 0) + n; dust = Math.floor(j.dr / W.dust); j.dr -= dust * W.dust; } // a remainder waits for the next time
    const sign = SPECIES[m.sp].sign;
    if (dust) Game.addDust(sign, dust);
    const up = this.befriend(m, Math.max(1, Math.floor(h / 3)));
    Game.s.stats.harvests += n;
    return { r, dust, sign, m, up, n };
  },
  /** every workshop with something in it → { r (all rewards), dust: {sign: n}, ups: [[m, hearts]], n } */
  collectAll() {
    const out = { r: {}, dust: {}, ups: [], n: 0 };
    for (const W of WORKSHOPS) {
      const c = this.collect(W.id);
      if (!c) continue;
      for (const k in c.r) out.r[k] = (out.r[k] || 0) + c.r[k];
      if (c.dust) out.dust[c.sign] = (out.dust[c.sign] || 0) + c.dust;
      if (c.up) out.ups.push([c.m, c.up]);
      out.n += c.n;
    }
    return out;
  },
  readyUnits() { return WORKSHOPS.reduce((n, W) => n + this.units(W.id), 0); },
  anyFull() { return WORKSHOPS.some(W => this.full(W.id)); },
  /** a worker that left storage (joined the team, was released) stops working; what it made is collected first */
  cleanup() {
    for (const W of WORKSHOPS) {
      const j = Game.s.base.ws[W.id];
      if (!j) continue;
      if (!Game.mon(j.id) || !Game.s.box.includes(j.id) || Camp.training(j.id)) { if (Game.mon(j.id)) this.collect(W.id); delete Game.s.base.ws[W.id]; }
    }
  },

  /* ---------------- decorations ---------------- */
  owned(id) { return Game.s.base.owned[id] || 0; },
  /** different decorations owned (the Decorator medal) */
  ownedKinds() { return Object.values(Game.s.base.owned).filter(n => n > 0).length; },
  placedCount(id) { let n = 0; for (const a in Game.s.base.decor) for (const d of Game.s.base.decor[a]) if (d === id) n++; return n; },
  /** copies not standing anywhere yet */
  spare(id) { return this.owned(id) - this.placedCount(id); },
  buy(id) {
    const D = DECOR[id];
    if (!D || D.story || Game.s.coins < D.price) return false;
    Game.addCoins(-D.price);
    Game.s.base.owned[id] = this.owned(id) + 1;
    Platform.track('base', 'decor', id);
    return true;
  },
  give(id) { Game.s.base.owned[id] = this.owned(id) + 1; },
  at(area, i) { const a = Game.s.base.decor[area]; return (a && a[i]) || null; },
  /** put a decoration on a spot (null clears it; the old one goes back to your stock) */
  place(area, i, id) {
    if (id && this.spare(id) <= 0) return false;
    const a = Game.s.base.decor[area] || (Game.s.base.decor[area] = []);
    while (a.length <= i) a.push(null);
    a[i] = id || null;
    return true;
  },
  charmOf(id) { const D = DECOR[id]; return !D ? 0 : D.story ? 40 : D.price / 100; },
  charm() { let c = 0; for (const a in Game.s.base.decor) for (const d of Game.s.base.decor[a]) if (d) c += this.charmOf(d); return c; },
  /** decorations make the workshops faster (up to +30%) */
  charmBonus() { return Math.min(0.3, this.charm() * 0.0006); },

  /* ---------------- visitors ---------------- */
  /** a visitor Orbling at the yard: a new chance in every 8-hour window (likelier with more charm; decorations draw
   *  their element) → { sp, lv, shiny } or null */
  visitor() {
    const b = Game.s.base, w = Math.floor(Date.now() / (VISIT_H * 3600e3));
    if (!b.visit || b.visit.w !== w) {
      b.visit = { w, gone: true };
      if (Game.s.flags.tutDone && Math.random() < this.visitChance()) { const v = this.rollVisitor(); if (v) Object.assign(b.visit, v, { gone: false }); }
    }
    return b.visit.gone ? null : b.visit;
  },
  visitChance() { return Math.min(0.75, 0.25 + this.charm() / 400); },
  rollVisitor() {
    const wEl = { fire: 1, water: 1, earth: 1, air: 1 };
    for (const a in Game.s.base.decor) for (const d of Game.s.base.decor[a]) {
      const D = d && DECOR[d];
      if (!D) continue;
      if (D.el === '*') for (const k in wEl) wEl[k] += 0.5; else wEl[D.el] += 2;
    }
    const pool = SPECIES_ORDER.filter(id => { const S = SPECIES[id]; return !S.legend && S.stage <= 2 && Game.seen(id); });
    if (!pool.length) return null;
    const sp0 = U.weighted(pool.map(id => [id, wEl[SPECIES[id].el] * (Game.caught(id) ? 1 : 2)]));
    const [sp, lv] = Game.wildForm(sp0, U.clamp(Game.teamLevel() - U.ri(1, 4), 2, MAX_LV));
    return { sp, lv, shiny: Math.random() < 2 / SHINY_ODDS };
  },
  visitDone() { if (Game.s.base.visit) Game.s.base.visit.gone = true; },

  /* ---------------- daily bonuses ---------------- */
  /** the first catch of each day pays a little extra → the reward, or null if already paid today */
  firstCatch() {
    const b = Game.s.base;
    if (b.fc === U.today()) return null;
    b.fc = U.today();
    Game.grant(FIRST_CATCH);
    return Object.assign({}, FIRST_CATCH);
  },
  firstCatchDone() { return Game.s.base.fc === U.today(); },
  /** on load: 3+ days since the last save leave a welcome-back gift in the daily panel (never a penalty) */
  noteAbsence(savedAt) {
    if (!savedAt) return;
    const d = Math.floor((Date.now() - savedAt) / 864e5);
    if (d >= 3) Game.s.base.welcome = Math.max(Game.s.base.welcome || 0, Math.min(7, d));
  },
  welcomeGift(d) { const r = { coins: 200 * d, orb: 3 * d }; if (d >= 5) r.candy = 1; if (d >= 7) r.egg_star = 1; return r; },
  claimWelcome() {
    const d = Game.s.base.welcome;
    if (!d) return null;
    Game.s.base.welcome = 0;
    const r = this.welcomeGift(d);
    Game.grant(r);
    return r;
  },

  /* ---------------- mini-stories ---------------- */
  story(id) { return Game.s.base.stories[id] || 0; }, // 0 not met · 1 asked · 2 done
  storyOf(npc) { return STORIES.find(S => S.npc === npc) || null; },
  storyProg(S) {
    const n = S.need, st = Game.s.stats, b0 = Game.s.base.sbase[S.id] || {};
    if (n.own) return [Game.allMons().some(m => n.own.includes(m.sp)) ? 1 : 0, 1];
    if (n.hearts) return [Game.allMons().some(m => this.hearts(m) >= n.hearts) ? 1 : 0, 1];
    if (n.hatched) return [U.clamp(st.hatched - (b0.hatched || 0), 0, n.hatched), n.hatched];
    if (n.shards) return [U.clamp(st.shards - (b0.shards || 0), 0, n.shards), n.shards];
    return [0, 1];
  },
  storyReady(S) { const [c, n] = this.storyProg(S); return c >= n; },
  /** what a character has for you: 'start' (a request), 'end' (fulfilled), 'wait' (asked, not yet) or null */
  storyBeat(npc) {
    const S = this.storyOf(npc);
    if (!S || !Game.beaten(npc)) return null;
    const k = this.story(S.id);
    if (k === 0) return 'start';
    if (k === 1) return this.storyReady(S) ? 'end' : 'wait';
    return null;
  },
  startStory(S) { Game.s.base.stories[S.id] = 1; Game.s.base.sbase[S.id] = { shards: Game.s.stats.shards, hatched: Game.s.stats.hatched }; },
  endStory(S) {
    Game.s.base.stories[S.id] = 2;
    const r = Object.assign({}, S.reward), decor = r.decor;
    delete r.decor;
    if (decor) this.give(decor);
    Game.grant(r);
    Platform.track('story', S.id, 'complete');
    return { r, decor };
  },
  activeStories() { return STORIES.filter(S => this.story(S.id) === 1); },

  /* ---------------- the daily panel's "!" ---------------- */
  attention() {
    const s = Game.s;
    if (Login.due() || s.base.welcome) return true;
    if (s.sigils.length >= 1 && (s.daily.day !== U.today() || !s.daily.free)) return true;
    return this.open() && (this.anyFull() || Camp.attention());
  },
};
