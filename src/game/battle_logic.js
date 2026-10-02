'use strict';
/* Pure battle maths: fighters, stat stages, damage, accuracy, statuses, catching, XP, enemy AI. */

const STATUS_IMMUNE = { burn: 'fire', freeze: 'water', shock: 'air', poison: 'earth' };

const BL = {
  wx: '', // the weather over this battle (3.5): set by the battle scene, see Weather
  fighter(mon, side, o = {}) {
    const st = Game.stats(mon);
    const maxHp = Math.round(st.hp * (o.hpMult || 1));
    if (o.hpMult) mon.hp = maxHp;
    const maxEn = SPECIES[mon.sp].sign === 'aquarius' ? 13 : 10; // Flow: a bigger energy tank
    return {
      mon, side, sp: SPECIES[mon.sp], st, maxHp, en: o.en != null ? Math.min(o.en, maxEn) : maxEn, maxEn,
      stages: { atk: 0, mag: 0, def: 0, spd: 0 }, status: null, stTurns: 0, first: true, fainted: false, hpMult: o.hpMult || 1,
    };
  },
  refresh(f) {
    f.sp = SPECIES[f.mon.sp];
    f.st = Game.stats(f.mon);
    f.maxHp = Math.round(f.st.hp * f.hpMult);
  },
  mult(s) { return s >= 0 ? 1 + 0.25 * s : 1 / (1 + 0.25 * -s); },
  eff(f, k) { return f.st[k] * this.mult(f.stages[k]); },
  speed(f) { return this.eff(f, 'spd') * (f.status === 'shock' ? 0.75 : 1); },
  cost(f, id) {
    const c = MOVES[id].cost;
    return c > 0 && f.sp.sign === 'libra' && MOVES[id].cat === 'star' ? Math.max(1, c - 1) : c;
  },
  canUse(f, id) { return this.cost(f, id) <= f.en; },
  hitChance(a, id) {
    const m = MOVES[id];
    if (m.sure || a.sp.sign === 'sagittarius' || !m.acc) return 1;
    return m.acc / 100;
  },
  dodgeChance(d) { return d.sp.sign === 'pisces' ? 0.12 : 0; },
  critChance(a, id) { return 0.0625 + (MOVES[id].crit || 0) + (a.sp.sign === 'leo' ? 0.2 : 0) + (a.side === 'p' && typeof Base !== 'undefined' ? Base.crit(a.mon) : 0); },
  /** Scorpio's Venom: chance that a physical hit poisons */
  venomChance(a, id) { return MOVES[id].cat === 'phys' && a.sp.sign === 'scorpio' ? 0.35 : 0; },
  /** Gemini's Twin Soul: chance that a physical move strikes one extra time */
  twinChance(a, id) { return MOVES[id].cat === 'phys' && a.sp.sign === 'gemini' ? 0.25 : 0; },
  immune(f, status) { return STATUS_IMMUNE[status] === f.sp.el; },
  damage(a, d, id, crit, roll, charged) {
    const m = MOVES[id], L = a.mon.lv;
    const A = m.cat === 'phys' ? this.eff(a, 'atk') : this.eff(a, 'mag');
    let D = this.eff(d, 'def');
    if (d.sp.sign === 'cancer' && d.mon.hp < d.maxHp / 2) D *= 1.4;
    const base = ((2 * L / 5 + 2) * m.pow * A / Math.max(1, D)) / 50 + 2;
    const tm = typeMult(m.el, d.sp.el);
    let mult = tm;
    if (m.el && m.el === a.sp.el) mult *= 1.2;
    if (crit) mult *= a.sp.sign === 'leo' ? 1.75 : 1.5;
    if (m.cat === 'star' && a.sp.sign === 'libra' && a.mon.hp >= a.maxHp / 2) mult *= 1.15;
    if (charged) mult *= 1.3; // a boss's announced attack
    if (this.wx) mult *= Weather.boost(this.wx, m.el); // rain lifts Water, a storm Air, a heatwave Fire
    if (a.first && a.sp.sign === 'aries') mult *= 1.3;
    if (a.sp.sign === 'capricorn' && a.mon.hp < a.maxHp / 3) mult *= 1.3;
    if (m.cat === 'phys' && d.sp.sign === 'taurus') mult *= 0.8;
    if (m.cat === 'phys' && a.status === 'burn') mult *= 0.8;
    mult *= 0.86 + roll * 0.14;
    return { dmg: Math.max(1, Math.floor(base * mult)), tm };
  },
  /** how a move is expected to fare against this foe compared with a plain hit: the element, the foe's star trait and
   *  a burn weakening physical blows — one number behind the "Super!" / "Weak" label on the move buttons */
  effMult(a, d, id) {
    const m = MOVES[id];
    if (!m || !m.pow || !d) return 1;
    let k = typeMult(m.el, d.sp.el);
    if (m.cat === 'phys' && d.sp.sign === 'taurus') k *= 0.8;
    if (d.sp.sign === 'cancer' && d.mon.hp < d.maxHp / 2) k *= 0.75;
    if (d.sp.sign === 'pisces' && !(m.sure || a.sp.sign === 'sagittarius')) k *= 0.88;
    if (m.cat === 'phys' && a.status === 'burn') k *= 0.8;
    return k;
  },
  /** a boss's strongest move it can afford next turn (announced a turn ahead, after this turn's energy came in:
   *  it acts next turn with exactly the energy it has now) */
  chargeMove(f) {
    let best = null;
    for (const id of f.mon.equip) {
      const m = MOVES[id];
      if (!m || !m.pow || m.pow < 80 || !this.canUse(f, id)) continue;
      if (!best || m.pow * (m.hits || 1) > MOVES[best].pow * (MOVES[best].hits || 1)) best = id;
    }
    return best;
  },
  catchChance(e, orbId, bonus) {
    if (ITEMS[orbId].mult >= 100) return 1;
    const hpF = e.mon.hp / e.maxHp;
    let p = e.sp.rate * (1 - 0.66 * hpF) * ITEMS[orbId].mult * (bonus || 1);
    if (e.status === 'sleep' || e.status === 'freeze') p *= 1.8;
    else if (e.status) p *= 1.35;
    if (e.mon.lv - Game.teamLevel() > 4) p *= 0.7;
    if (e.alpha) p *= 0.75;
    if (e.star) p *= 1.5; // star-born: it came down to meet you
    if (e.pity) p *= 1 + 0.15 * e.pity; // every orb it broke out of makes the next throw easier
    return U.clamp(p, 0.04, 1);
  },
  xpFor(mon, trainer) {
    const sp = SPECIES[mon.sp];
    let x = sp.xp * mon.lv / 5 * (trainer ? 1.5 : 1);
    return Math.max(4, Math.floor(x));
  },
  /** enemy AI: score equipped moves; smart tamers pick the best, wild ones are sloppier */
  aiPick(f, foe, smart) {
    const opts = f.mon.equip.filter(id => MOVES[id] && this.canUse(f, id));
    if (!opts.length) return f.mon.equip.find(id => MOVES[id].cost === 0) || 'tackle';
    const hpF = f.mon.hp / f.maxHp, foeF = foe.mon.hp / foe.maxHp;
    const scored = opts.map(id => {
      const m = MOVES[id];
      let s = 0;
      if (m.pow) {
        // expected damage as a share of the foe's remaining HP (a likely KO scores highest)
        const dmg = this.damage(f, foe, id, false, 0.5).dmg * (m.hits || 1) * this.hitChance(f, id);
        s = Math.min(1.2, dmg / Math.max(1, foe.mon.hp)) * 100;
        if (m.recoil && hpF < 0.3) s *= 0.6;
        if (m.cost >= 5 && f.en - m.cost < 2) s *= 0.92;
        if (m.prio && dmg >= foe.mon.hp) s += 10;
      } else if (m.cat === 'status') s = foe.status || this.immune(foe, m.status[0]) ? 0 : 28 * foeF * (m.acc || 100) / 100;
      else if (m.cat === 'heal') s = hpF < 0.4 ? 60 : 0;
      else if (m.cat === 'buff') {
        if (m.en) s = f.en <= 2 ? 40 : 0;
        else s = hpF > 0.6 && Object.keys(m.self || {}).every(k => f.stages[k] < 2) ? (f.first ? 35 : 16) : 2;
      } else if (m.cat === 'debuff') s = Object.keys(m.foe).every(k => foe.stages[k] > -2) ? 12 * foeF : 1;
      return [id, s * (0.85 + Math.random() * 0.3)];
    });
    scored.sort((a, b) => b[1] - a[1]);
    if (smart || Math.random() < 0.6) return scored[0][0];
    const ok = scored.filter(x => x[1] > 0);
    return U.pick(ok.length ? ok : scored)[0];
  },
};
