'use strict';
/* Star Camp: the Hatchery (eggs from quests/arena/shop hatch after a number of battles won) and the Dojo
 * (Orblings from storage train in real time, up to 8 hours, and collect XP on claim). */

const EGG_IDS = ['egg_fire', 'egg_water', 'egg_earth', 'egg_air', 'egg_star'];
const DOJO_CAP_H = 8;

const Camp = {
  eggSlots() { const r = Game.s.tamer.lv; return r >= 12 ? 3 : r >= 6 ? 2 : 1; },
  dojoSlots() { return Game.s.tamer.lv >= 10 ? 3 : 2; },
  need(egg) { return egg === 'egg_star' ? 8 : 5; },
  ready(e) { return e.prog >= this.need(e.egg); },
  eggsInBag() { return EGG_IDS.reduce((n, id) => n + Game.item(id), 0); },

  /** move an egg from the bag into a free incubator */
  place(egg) {
    const c = Game.s.camp;
    if (c.eggs.length >= this.eggSlots() || !Game.useItem(egg)) return false;
    c.eggs.push({ id: U.uid(), egg, prog: 0, warm: false });
    return true;
  },
  /** a battle was won: every incubating egg gets closer; returns how many just became ready */
  step(n = 1) {
    let ready = 0;
    for (const e of Game.s.camp.eggs) {
      if (this.ready(e)) continue;
      e.prog = Math.min(this.need(e.egg), e.prog + n);
      if (this.ready(e)) ready++;
    }
    return ready;
  },
  /** rewarded-ad boost: +2 progress, once per egg */
  warm(e) { if (e.warm) return false; e.warm = true; e.prog = Math.min(this.need(e.egg), e.prog + 2); return true; },
  /** hatch a ready egg → a new Orbling (not yet added to the team/storage) */
  hatch(eggId) {
    const c = Game.s.camp, i = c.eggs.findIndex(e => e.id === eggId);
    if (i < 0 || !this.ready(c.eggs[i])) return null;
    const e = c.eggs.splice(i, 1)[0];
    const star = e.egg === 'egg_star', el = star ? null : e.egg.slice(4);
    const pool = SPECIES_ORDER.filter(id => SPECIES[id].stage === 1 && (!el || SPECIES[id].el === el));
    const sp = U.pick(pool);
    const lv = U.clamp(Game.teamLevel() - 5, 5, 40);
    const m = Game.makeMon(sp, lv, { shiny: Math.random() < (star ? 5 : 2) / SHINY_ODDS, potMin: star ? 1.03 : 0.99 });
    Game.s.stats.hatched++;
    return m;
  },

  /* ---------------- dojo ---------------- */
  cleanup() {
    const c = Game.s.camp;
    c.dojo = c.dojo.filter(d => { const m = Game.mon(d.id); return m && m.lv < MAX_LV && Game.s.box.includes(d.id); });
  },
  training(monId) { return Game.s.camp.dojo.some(d => d.id === monId); },
  train(monId) {
    const c = Game.s.camp;
    if (c.dojo.length >= this.dojoSlots() || this.training(monId) || !Game.s.box.includes(monId)) return false;
    const m = Game.mon(monId);
    if (!m || m.lv >= MAX_LV) return false;
    c.dojo.push({ id: monId, t: Date.now() });
    return true;
  },
  /** XP per hour for this Orbling (a third of a level, a bit more at higher ranks) */
  rate(m) { return Game.xpNeed(m.lv) * 0.6 * (1 + Game.s.tamer.lv * 0.02); },
  hours(d) { return Math.min(DOJO_CAP_H, Math.max(0, Date.now() - d.t) / 3600e3); },
  pending(d) {
    const m = Game.mon(d.id);
    if (!m || m.lv >= MAX_LV) return 0;
    return Math.floor(this.rate(m) * this.hours(d));
  },
  full(d) { return this.hours(d) >= DOJO_CAP_H; },
  /** collect the XP (mult 2 after a rewarded ad); the timer restarts */
  claim(monId, mult = 1) {
    const d = Game.s.camp.dojo.find(x => x.id === monId);
    if (!d) return null;
    const m = Game.mon(d.id);
    if (!m || m.lv >= MAX_LV) { this.stop(monId); return null; }
    const xp = this.pending(d) * mult;
    if (xp <= 0) return null;
    const h = this.hours(d);
    d.t = Date.now();
    const r = Game.gainXp(m, xp);
    if (h >= 0.5) Game.s.stats.trained++;
    if (m.lv >= MAX_LV) this.stop(monId);
    return { m, xp, r };
  },
  stop(monId) { Game.s.camp.dojo = Game.s.camp.dojo.filter(d => d.id !== monId); },
  /** something worth opening the camp for (HUD dot) */
  attention() {
    const c = Game.s.camp;
    if (c.eggs.some(e => this.ready(e))) return true;
    if (c.eggs.length < this.eggSlots() && this.eggsInBag() > 0) return true;
    return c.dojo.some(d => this.full(d) && this.pending(d) > 0);
  },
};
