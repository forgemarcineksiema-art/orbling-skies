'use strict';
/* Quests: the main chain (guided by Pip), Pip's side requests that the story has overtaken, and 3 daily quests.
 * Main-chain counting quests count the player's totals; daily quests count from the day's baseline snapshot. */
const ZERO_BASE = { catchEl: { fire: 0, earth: 0, air: 0, water: 0 }, defeatEl: { fire: 0, earth: 0, air: 0, water: 0 } };

const Quests = {
  snapshot() {
    const st = Game.s.stats;
    return {
      catches: st.catches, wild: st.wild, wins: st.wins, tamers: st.tamers, evolutions: st.evolutions, spins: st.spins,
      arenaWins: st.arenaWins, hatched: st.hatched, trained: st.trained, shards: st.shards, alphas: st.alphas, pets: st.pets, harvests: st.harvests,
      catchEl: Object.assign({}, st.catchEl), defeatEl: Object.assign({}, st.defeatEl),
    };
  },
  main() { return MAIN_QUESTS[Game.s.quests.main] || null; },
  /** Pip's requests the story has already overtaken (still open, still rewarded) */
  side() { return (Game.s.quests.side || []).map(id => QUEST_BY_ID[id]).filter(Boolean); },
  progress(q, base) {
    const st = Game.s.stats;
    base = base || ZERO_BASE;
    const d = k => (st[k] || 0) - (base[k] || 0); // older snapshots lack the v2 counters
    switch (q.type) {
      case 'hatch': return [d('hatched'), q.n];
      case 'arena': return [d('arenaWins'), q.n];
      case 'train': return [d('trained'), q.n];
      case 'shards': return [d('shards'), q.n];
      case 'alpha': return [d('alphas'), q.n];
      case 'pet': return [d('pets'), q.n];
      case 'harvest': return [d('harvests'), q.n];
      case 'league': return [Arena.trophies(), q.n];
      case 'medal': return [Medals.reached(), q.n];
      case 'catch': return [q.el ? st.catchEl[q.el] - base.catchEl[q.el] : st.catches - (base.catches || 0), q.n];
      case 'defeat': return [q.el ? st.defeatEl[q.el] - base.defeatEl[q.el] : st.wild - (base.wild || 0), q.n];
      case 'battle': return [st.defeatEl[q.el] - base.defeatEl[q.el] + st.catchEl[q.el] - base.catchEl[q.el], q.n];
      case 'stage': return [Game.allMons().some(m => SPECIES[m.sp].stage >= q.n && !SPECIES[m.sp].legend) ? 1 : 0, 1];
      case 'win': return [st.wins - (base.wins || 0), q.n];
      case 'tamerwin': return [st.tamers - (base.tamers || 0), q.n];
      case 'spin': return [st.spins - (base.spins || 0), q.n];
      case 'evolve': return [st.evolutions - (base.evolutions || 0), q.n];
      case 'team': return [Game.s.team.length, q.n];
      case 'tamers': return Game.isleTamersBeaten(q.isle);
      case 'guardian': return [Game.beaten(q.target) ? 1 : 0, 1];
      case 'level': return [Game.maxLevel(), q.n];
      case 'codex': return [Game.codexCount(), q.n];
      case 'visit': return [ISLE[q.isle].zones.some(z => Game.s.visited.includes(z)) ? 1 : 0, 1];
      case 'legend': return [Game.s.legends.length, q.n];
    }
    return [0, 1];
  },
  text(q) {
    const p = { n: q.n, el: q.el ? t('elg.' + q.el) : '', isle: q.isle ? t('isle.' + q.isle) : '', name: q.target ? TAMERS[q.target].name : '' };
    const key = 'q.' + q.type + (q.el ? '_el' : '');
    return t(key, p);
  },
  /** where the player should go for a quest (isle id, or 'arena') */
  hintIsle(q) {
    if (!q || q.type === 'visit' || q.type === 'tamers') return null; // the text names the isle already
    if (q.isle) return q.isle;
    if (q.target) return TAMERS[q.target].guardian;
    if (q.type === 'arena' || q.type === 'league') return 'arena';
    if (q.el) return this.bestIsle(q.el);
    return null;
  },
  /** share of an element among the wild spawns of each unlocked isle → the best isle to look for it */
  elShares() {
    const out = {};
    for (const is of ISLES) {
      if (!Game.isleUnlocked(is.id)) continue;
      const w = { fire: 0, earth: 0, air: 0, water: 0 };
      let tot = 0;
      for (const zid of is.zones) for (const [sp, wt] of ZONES[zid].spawns) { w[SPECIES[sp].el] += wt; tot += wt; }
      out[is.id] = Object.fromEntries(Object.entries(w).map(([k, v]) => [k, tot ? v / tot : 0]));
    }
    return out;
  },
  bestIsle(el) {
    let best = null, bv = 0;
    for (const [isle, sh] of Object.entries(this.elShares())) if (sh[el] > bv) { bv = sh[el]; best = isle; }
    return best;
  },
  /** an element the player can actually find on the isles open to them (at least 10% of some isle's spawns) */
  pickEl() {
    const ok = new Set();
    for (const sh of Object.values(this.elShares())) for (const [el, v] of Object.entries(sh)) if (v >= 0.1) ok.add(el);
    return U.pick(ok.size ? [...ok] : EL_ORDER);
  },
  available(tp) {
    if (tp.req === 'arena') return Arena.anyUnlocked();
    if (tp.req === 'wheel') return Game.s.sigils.length >= 1;
    if (tp.req === 'base') return Base.open();
    if (tp.req === 'work') return WORKSHOPS.some(W => Base.worker(W.id)); // a harvest needs someone working already
    return true;
  },
  /** daily quests begin once the player has met the first tamer (the first minutes stay free of extra popups) */
  dailyOpen() { const s = Game.s; return s.stats.tamers >= 1 || s.tamer.lv >= 3; },
  ensureDaily() {
    const d = U.today();
    const cur = Game.s.quests.daily;
    if (cur && cur.day === d) return cur;
    const picks = U.shuffle(DAILY_TEMPLATES.filter(tp => this.available(tp))).slice(0, 3).map((tp, i) => {
      const q = Object.assign({}, tp, { id: 'd' + i, claimed: false });
      if (q.el === '*') q.el = this.pickEl();
      q.base = this.snapshot();
      return q;
    });
    Game.s.quests.daily = { day: d, list: picks };
    return Game.s.quests.daily;
  },
  done(q) { const [c, n] = this.progress(q); return c >= n; },
  /** is the story already past this point? (the next non-side quest after index i is done) */
  storyAhead(i) {
    for (let j = i + 1; j < MAIN_QUESTS.length; j++) if (!MAIN_QUESTS[j].side) return this.done(MAIN_QUESTS[j]);
    return false;
  },
  /** check completion; grants rewards; returns completed [{q, kind, levels}] */
  check() {
    if (!Game.s) return [];
    const done = [];
    if (!Game.s.quests.side) Game.s.quests.side = [];
    let q = this.main();
    let guard = 0;
    while (q && guard++ < 60) {
      if (this.done(q)) {
        const levels = Game.grant(q.reward);
        done.push({ q, kind: 'main', levels });
      } else if (q.side && this.storyAhead(Game.s.quests.main)) Game.s.quests.side.push(q.id);
      else break;
      Game.s.quests.main++;
      q = this.main();
      if (q) Platform.track('quest', q.id, 'start');
    }
    for (const sq of this.side()) {
      if (!this.done(sq)) continue;
      Game.s.quests.side = Game.s.quests.side.filter(id => id !== sq.id);
      done.push({ q: sq, kind: 'main', levels: Game.grant(sq.reward) });
    }
    if (done.length) Platform.progress(Game.s.quests.main / MAIN_QUESTS.length);
    const daily = this.dailyOpen() ? this.ensureDaily() : { list: [] };
    for (const dq of daily.list) {
      if (dq.claimed) continue;
      const [c, n] = this.progress(dq, dq.base);
      if (c >= n) {
        dq.claimed = true;
        Game.s.stats.dailies++;
        const levels = Game.grant(Object.assign({ txp: 25 }, dq.reward));
        done.push({ q: dq, kind: 'daily', levels });
      }
    }
    return done;
  },
};
