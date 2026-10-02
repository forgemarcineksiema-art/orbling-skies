'use strict';
/* Game state: save data, Orbling instances, stats/XP/evolution, inventory, codex, progress. */

const SAVE_KEY = 'orbling_galaxy_save_v1';
const SAVE_V = 5;
const TEAM_MAX = 3;
const SHINY_ODDS = 150;
const MAX_LV = 50;
const GEM_COINS = 100; // 2.7 dropped the second currency: leftover gems are worth this many coins

const Game = {
  s: null,
  _dirty: false,

  /* ---------------- persistence ---------------- */
  hasSave() { return !!Platform.storeGet(SAVE_KEY); },
  load() {
    const raw = Platform.storeGet(SAVE_KEY);
    if (!raw) return false;
    try {
      const d = JSON.parse(raw);
      if (!d || !d.v || !d.mons) return false;
      const old = d.v < SAVE_V;
      this.s = this.migrate(d);
      if (old) Medals.seeAll(); // medals already earned in v1 are claimable without a toast flood
      Base.noteAbsence(d.savedAt); // a welcome-back gift after 3+ days away
      Camp.cleanup();
      return true;
    } catch (e) { console.warn('bad save', e); return false; }
  },
  migrate(d) {
    const def = this.blank();
    for (const k in def) if (d[k] === undefined) d[k] = def[k];
    for (const k in def.stats) if (d.stats[k] === undefined) d.stats[k] = def.stats[k];
    for (const k in def.settings) if (d.settings[k] === undefined) d.settings[k] = def.settings[k];
    for (const k in def.camp) if (d.camp[k] === undefined) d.camp[k] = def.camp[k];
    // v1 → v2: new main quests were inserted into the chain, so re-point the index by quest id
    if (d.v < 2) {
      const oldId = 'q' + (d.quests.main + 1);
      const i = V2_QUEST_ORDER.indexOf(oldId);
      d.quests.main = i >= 0 ? i : V2_QUEST_ORDER.indexOf('q32') + 1;
    }
    // v2 → v3 (2.7): one currency (gems become coins); the quest chain re-slotted the arena leagues and
    // gained Pip's side requests (inserted quests the player is already past become open requests)
    if (d.v < 3) {
      if (d.gems) d.coins += d.gems * GEM_COINS;
      delete d.gems;
      for (const dq of (d.quests.daily && d.quests.daily.list) || []) if (dq.reward && dq.reward.gems) { dq.reward.coins = (dq.reward.coins || 0) + dq.reward.gems * GEM_COINS; delete dq.reward.gems; }
      const oldId = V2_QUEST_ORDER[d.quests.main];
      const ni = oldId ? MAIN_QUESTS.findIndex(q => q.id === oldId) : MAIN_QUESTS.length;
      d.quests.side = MAIN_QUESTS.slice(0, Math.max(0, ni)).filter(q => q.side && !V2_QUEST_ORDER.includes(q.id)).map(q => q.id);
      d.quests.main = ni < 0 ? MAIN_QUESTS.length : ni;
      d.flags.hudSeen = { all: 1 }; // players who already know the HUD get no "new button" fanfare
    }
    // v3 → v4 (2.9): legends ask for an Orbling you evolved yourself; count everything already evolved as yours.
    // The move lists changed too: teach every move of the line up to its level that it missed (a stronger one takes
    // a weaker slot, as on a level-up)
    if (d.v < 4) for (const id in d.mons) {
      const m = d.mons[id], S = SPECIES[m.sp];
      if (!S) continue;
      if (S.stage >= 2 && !S.legend) m.evo = 1;
      for (const mid of this.movesUpTo(m.sp, m.lv)) this.learn(m, mid);
    }
    d.v = SAVE_V;
    // repair: a Guardian beaten without its sigil stored (interrupted victory in older builds)
    for (const is of ISLES) if ((d.beaten[is.guardian] || 0) > 0 && !d.sigils.includes(is.id)) d.sigils.push(is.id);
    return d;
  },
  save() {
    if (!this.s) return;
    this.s.savedAt = Date.now();
    Platform.storeSet(SAVE_KEY, JSON.stringify(this.s));
    this._dirty = false;
  },
  wipe() { Platform.storeRemove(SAVE_KEY); this.s = null; },

  blank() {
    return {
      v: SAVE_V, name: 'Tamer', look: { skin: WArt.SKINS[0], hair: 'spiky', hairC: WArt.HAIRC[1], top: WArt.SUITS[0], acc: ['goggles'] },
      tamer: { lv: 1, xp: 0 }, coins: 250,
      items: { orb: 5, potion: 3 },
      mons: {}, team: [], box: [], dust: {},
      codex: {}, beaten: {}, sigils: [], visited: [], legends: [],
      loc: { zone: 'clover', x: 300, y: 560 },
      quests: { main: 0, side: [], daily: null },
      chests: {}, daily: { day: '', free: false, ads: 0 },
      camp: { eggs: [], dojo: [] }, medals: {}, medalSeen: {}, login: { day: '', n: 0 },
      // 3.0: workshops (jobs + built), decorations (stock + spots), the visitor, first catch of the day, welcome gift, stories
      base: { ws: {}, built: ['garden'], decor: { glade: [], yard: [] }, owned: {}, visit: null, fc: '', welcome: 0, stories: {}, sbase: {} },
      stats: {
        battles: 0, wins: 0, wild: 0, tamers: 0, catches: 0, shinies: 0, evolutions: 0, spins: 0,
        arenaWins: 0, hatched: 0, trained: 0, shards: 0, alphas: 0, starborn: 0, crits: 0, supers: 0, excellent: 0, dailies: 0, coinsEarned: 0, pets: 0, harvests: 0,
        catchEl: { fire: 0, earth: 0, air: 0, water: 0 }, defeatEl: { fire: 0, earth: 0, air: 0, water: 0 },
      },
      settings: { music: true, sfx: true, lang: '' },
      flags: {},
      created: Date.now(), savedAt: 0,
    };
  },
  newGame(name, look, starter) {
    this.s = this.blank();
    this.s.name = name;
    this.s.look = look;
    this.s.settings.lang = LANG;
    this.s.settings.music = Snd.musicOn;
    this.s.settings.sfx = Snd.sfxOn;
    const m = this.makeMon(starter, 6, { noShiny: true });
    this.addMon(m);
    this.see(starter); this.catchReg(starter);
    this.s.visited.push('clover');
    this.save();
  },

  /* ---------------- Orblings ---------------- */
  makeMon(sp, lv, o = {}) {
    // potential per stat 0.9–1.1 (alphas & hatched Orblings roll from a higher floor)
    const lo = o.potMin || 0.9, pr = () => lo + Math.random() * (1.1 - lo);
    const m = {
      id: U.uid(), sp, lv: U.clamp(lv, 1, MAX_LV), xp: 0, hp: 1,
      pot: { hp: pr(), atk: pr(), mag: pr(), def: pr(), spd: pr() },
      shiny: o.shiny != null ? o.shiny : (!o.noShiny && Math.random() < 1 / SHINY_ODDS),
      moves: [], equip: [], t: Date.now(),
    };
    m.moves = this.movesUpTo(sp, m.lv);
    this.autoEquip(m);
    m.hp = this.stats(m).hp;
    return m;
  },
  movesUpTo(sp, lv) {
    return SPECIES[sp].learn.filter(([l]) => l <= lv).map(([, id]) => id);
  },
  /** choose best 4: at least one free (0 EN) move and one elemental star move when available */
  autoEquip(m) {
    const byVal = m.moves.slice().sort((a, b) => moveValue(b) - moveValue(a));
    const pick = [];
    const free = byVal.find(id => MOVES[id].cost === 0 && MOVES[id].pow);
    const star = byVal.find(id => MOVES[id].cat === 'star');
    if (free) pick.push(free);
    if (star && !pick.includes(star)) pick.push(star);
    for (const id of byVal) { if (pick.length >= 4) break; if (!pick.includes(id)) pick.push(id); }
    m.equip = pick.slice(0, 4);
  },
  stats(m) {
    const b = SPECIES[m.sp].base, L = m.lv, p = m.pot;
    const st = k => Math.floor((2 * b[k] * p[k] * L) / 100 + 5);
    return { hp: Math.floor((2 * b.hp * p.hp * L) / 100 + L + 10), atk: st('atk'), mag: st('mag'), def: st('def'), spd: st('spd') };
  },
  maxHp(m) { return this.stats(m).hp; },
  dust(sign) { return (this.s.dust && this.s.dust[sign]) || 0; },
  addDust(sign, n) { if (!this.s.dust) this.s.dust = {}; this.s.dust[sign] = Math.max(0, this.dust(sign) + n); },
  /** stardust of its line raises every potential of an Orbling a little (+0.02, up to 1.12) */
  canBoost(m) { const p = m.pot; return this.dust(SPECIES[m.sp].sign) >= DUST_BOOST && Object.values(p).some(v => v < 1.12); },
  boost(m) {
    if (!this.canBoost(m)) return false;
    const frac = m.hp / Math.max(1, this.maxHp(m));
    this.addDust(SPECIES[m.sp].sign, -DUST_BOOST);
    for (const k in m.pot) m.pot[k] = Math.min(1.12, Math.round((m.pot[k] + 0.02) * 1000) / 1000);
    if (m.hp > 0) m.hp = Math.max(1, Math.round(this.maxHp(m) * frac));
    return true;
  },
  /** potential rating 1..3 stars from individual values */
  stars(m) {
    const p = m.pot, avg = (p.hp + p.atk + p.mag + p.def + p.spd) / 5;
    return avg >= 1.04 ? 3 : avg >= 0.98 ? 2 : 1;
  },
  xpNeed(lv) { return Math.round(10 + 6 * Math.pow(lv, 1.75)); },
  /** add XP; returns {levels:[..], learned:[..]} (evolution checked separately) */
  gainXp(m, amt) {
    const out = { levels: [], learned: [] };
    if (m.lv >= MAX_LV) return out;
    m.xp += Math.round(amt);
    while (m.lv < MAX_LV && m.xp >= this.xpNeed(m.lv)) {
      m.xp -= this.xpNeed(m.lv);
      const before = this.stats(m).hp;
      m.lv++;
      const after = this.stats(m).hp;
      if (m.hp > 0) m.hp = Math.min(after, m.hp + (after - before));
      out.levels.push(m.lv);
      for (const [l, id] of SPECIES[m.sp].learn) if (l === m.lv && this.learn(m, id)) out.learned.push(id);
    }
    if (m.lv >= MAX_LV) m.xp = 0;
    return out;
  },
  /** a new move: known from now on, and equipped in a free slot or over the weakest one (never the last free damaging
   *  move; an attack of its own element counts for more) when it is better → false if it was already known */
  learn(m, id) {
    if (!MOVES[id] || m.moves.includes(id)) return false;
    m.moves.push(id);
    if (m.equip.length < 4) m.equip.push(id);
    else {
      const el = SPECIES[m.sp].el, val = x => moveValue(x) * (MOVES[x].pow && MOVES[x].el === el ? 1.2 : 1);
      const isFree = x => MOVES[x].cost === 0 && MOVES[x].pow;
      const keepFree = !isFree(id) && m.equip.filter(isFree).length <= 1;
      let worst = -1;
      m.equip.forEach((e, i) => { if (keepFree && isFree(e)) return; if (worst < 0 || val(e) < val(m.equip[worst])) worst = i; });
      if (worst >= 0 && val(id) > val(m.equip[worst])) m.equip[worst] = id;
    }
    return true;
  },
  canEvolve(m) {
    const sp = SPECIES[m.sp];
    return sp.evoTo && m.lv >= sp.evoLv ? sp.evoTo : null;
  },
  evolve(m) {
    const to = this.canEvolve(m);
    if (!to) return null;
    const frac = m.hp / Math.max(1, this.maxHp(m));
    m.sp = to;
    m.evo = 1; // evolved in your care (the Observatory's legends ask for that)
    for (const id of this.movesUpTo(to, m.lv)) if (!m.moves.includes(id)) m.moves.push(id);
    m.hp = Math.max(m.hp > 0 ? 1 : 0, Math.round(this.maxHp(m) * frac));
    this.see(to); this.catchReg(to);
    this.s.stats.evolutions++;
    return to;
  },
  mon(id) { return this.s.mons[id]; },
  team() { return this.s.team.map(id => this.s.mons[id]).filter(Boolean); },
  boxMons() { return this.s.box.map(id => this.s.mons[id]).filter(Boolean); },
  allMons() { return Object.values(this.s.mons); },
  addMon(m) {
    this.s.mons[m.id] = m;
    if (this.s.team.length < TEAM_MAX) { this.s.team.push(m.id); return 'team'; }
    this.s.box.push(m.id); return 'box';
  },
  release(id) {
    if (this.s.team.includes(id) && this.s.team.length <= 1) return false;
    Camp.stop(id);
    { const job = Base.busy(id); if (job && job !== 'dojo') Base.unassign(job); }
    this.s.team = this.s.team.filter(x => x !== id);
    this.s.box = this.s.box.filter(x => x !== id);
    delete this.s.mons[id];
    return true;
  },
  toBox(id) {
    if (this.s.team.length <= 1 || !this.s.team.includes(id)) return false;
    this.s.team = this.s.team.filter(x => x !== id); this.s.box.unshift(id); return true;
  },
  toTeam(id, replaceId) {
    if (!this.s.box.includes(id)) return false;
    Camp.stop(id); // callers claim pending Dojo XP first
    const job = Base.busy(id);
    if (job && job !== 'dojo') Base.unassign(job); // a worker's output is collected as it leaves
    if (this.s.team.length < TEAM_MAX) { this.s.box = this.s.box.filter(x => x !== id); this.s.team.push(id); return true; }
    if (!replaceId) return false;
    const i = this.s.team.indexOf(replaceId);
    this.s.team[i] = id;
    this.s.box = this.s.box.filter(x => x !== id); this.s.box.unshift(replaceId);
    return true;
  },
  setLeader(id) {
    const i = this.s.team.indexOf(id);
    if (i > 0) { this.s.team.splice(i, 1); this.s.team.unshift(id); }
  },
  healAll() { for (const m of this.team()) m.hp = this.maxHp(m); for (const m of this.boxMons()) m.hp = this.maxHp(m); },
  teamAlive() { return this.team().some(m => m.hp > 0); },
  teamHurt() { return this.team().some(m => m.hp < this.maxHp(m)); },
  maxLevel() { let lv = 1; for (const m of this.allMons()) lv = Math.max(lv, m.lv); return lv; },
  teamLevel() { let lv = 1; for (const m of this.team()) lv = Math.max(lv, m.lv); return lv; },

  /* ---------------- inventory / currency ---------------- */
  item(id) { return this.s.items[id] || 0; },
  addItem(id, n = 1) { this.s.items[id] = Math.max(0, (this.s.items[id] || 0) + n); },
  useItem(id) { if (this.item(id) <= 0) return false; this.s.items[id]--; return true; },
  addCoins(n) {
    this.s.coins = Math.max(0, this.s.coins + Math.round(n));
    if (n > 0) this.s.stats.coinsEarned += Math.round(n);
  },
  /** reward object {coins, txp, <itemId>: n} → applies it (a legacy 'gems' key pays out in coins) */
  grant(r) {
    const lv = [];
    for (const k in r) {
      if (k === 'coins') this.addCoins(r[k]);
      else if (k === 'gems') this.addCoins(r[k] * GEM_COINS);
      else if (k === 'txp') lv.push(...this.addTamerXp(r[k]));
      else if (ITEMS[k]) this.addItem(k, r[k]);
    }
    return lv;
  },
  tamerNeed(lv) { return 60 + 45 * lv; },
  addTamerXp(n) {
    const t = this.s.tamer, ups = [];
    t.xp += Math.round(n);
    while (t.xp >= this.tamerNeed(t.lv) && t.lv < 99) {
      t.xp -= this.tamerNeed(t.lv); t.lv++; ups.push(t.lv);
      this.grant(this.tamerLevelReward(t.lv)); // granted at once; the popup only shows it
    }
    return ups;
  },
  tamerLevelReward(lv) { return lv % 5 === 0 ? { candy: 1, nova: 2 } : { coins: 50 + lv * 10, orb: 2 }; },

  /* ---------------- codex ---------------- */
  see(sp) { if (!this.s.codex[sp]) this.s.codex[sp] = 1; },
  catchReg(sp) { this.s.codex[sp] = 2; },
  seen(sp) { return (this.s.codex[sp] || 0) >= 1; },
  caught(sp) { return this.s.codex[sp] === 2; },
  codexCount() { let n = 0; for (const k in this.s.codex) if (this.s.codex[k] === 2) n++; return n; },

  /* ---------------- progress ---------------- */
  beaten(id) { return (this.s.beaten[id] || 0) > 0; },
  isleUnlocked(isleId) {
    const i = ISLE[isleId].idx;
    return i === 0 || this.s.sigils.includes(ISLES[i - 1].id);
  },
  isleTamersBeaten(isleId) { const l = isleTamers(isleId); return [l.filter(id => this.beaten(id)).length, l.length]; },
  guardianOpen(isleId) { const [a, b] = this.isleTamersBeaten(isleId); return a >= b; },
  finished() { return this.s.sigils.includes('eclipse'); },
  ascendant() { return signOfDate(new Date()); },
  /** what a sign's legend asks for: an Orbling of the sign that you evolved yourself to stage 3 (the Ascendant: stage 2),
   *  or one of that sign at a high level */
  legendNeed(sign) { return sign === this.ascendant() ? { st: 2, lv: 35 } : { st: 3, lv: 45 }; },
  legendReady(sign) {
    if (!this.finished()) return false;
    const n = this.legendNeed(sign);
    return this.allMons().some(m => { const S = SPECIES[m.sp]; return S.sign === sign && !S.legend && ((m.evo && S.stage >= n.st) || m.lv >= n.lv); });
  },
  /** a wild Orbling's form follows its level: a first stage never shows up past its evolution level (it is capped
   *  just below it, or appears evolved when the zone is far beyond) — so nothing is caught with "Evolve!" waiting.
   *  An Alpha (strong) keeps its level and simply comes evolved. */
  wildForm(sp, lv, strong) {
    let S = SPECIES[sp];
    while (S.evoTo && lv >= S.evoLv) {
      if (strong || lv >= S.evoLv + 3) S = SPECIES[S.evoTo];
      else { lv = S.evoLv - 1; break; }
    }
    return [S.id, lv];
  },
  hasLegend(sign) { return this.s.legends.includes(LINES[sign].legend); },
};
