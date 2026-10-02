'use strict';
/* 3.5 "Skies over the isles": the weather of the Star Isles and the falling stars Orblings are born from.
 * The weather is the same for everyone at the same minute: each isle draws it from a hash of its id and a 6-minute
 * slot of the clock, so Jett's station at the Base can tell what comes next. Rain makes Water moves stronger and
 * draws water Orblings out, a storm does the same for Air and a heatwave for Fire; in fog the rare ones come out
 * (and shinies are twice as common). Every few minutes of play a star falls somewhere in the zone: a rare Orbling sits
 * in the warm crater until it cools down (STARFALL.cool seconds). Nothing here opens a screen. */

const WX_SLOT = 6 * 60e3;
const WX_BOOST = 1.25;
/** the element each weather favours (moves ×WX_BOOST, Orblings of it walk out ×3); fog favours the rare */
const WX_KINDS = { rain: { el: 'water', icon: 'rain' }, storm: { el: 'air', icon: 'storm' }, heat: { el: 'fire', icon: 'heat' }, fog: { el: null, icon: 'fog' } };
/** how likely each weather is on an isle (the rest of the time the sky is clear) */
const WX_ODDS = {
  sunny:   { rain: 0.2, fog: 0.12, heat: 0.1, storm: 0.06 },
  coral:   { rain: 0.24, heat: 0.14, storm: 0.1, fog: 0.06 },
  ember:   { heat: 0.36, fog: 0.12, storm: 0.08 },  // fog here is ash haze
  frost:   { fog: 0.26, storm: 0.16 },              // a storm here is a blizzard
  storm:   { storm: 0.38, rain: 0.18, fog: 0.06 },
  eclipse: { fog: 0.3, rain: 0.14, storm: 0.08 },
};
/** biomes where a storm brings snow instead of rain */
const WX_SNOW = ['snow', 'glacier'];
/** the falling star: the first one after `first` seconds of exploring, then every `every`; the crater cools in `cool` */
const STARFALL = { first: [70, 110], every: [150, 230], cool: 60, shiny: 1 / 12 };

const Weather = {
  force: null,
  starT: null,
  told: null, // the battle that already said what the weather does ("zone:slot")

  init() {
    // test hooks: ?wx=rain|storm|heat|fog|clear forces the weather everywhere, ?star=1 drops a star a few seconds in
    const q = typeof location !== 'undefined' ? location.search : '';
    const m = /[?&]wx=(rain|storm|heat|fog|clear)\b/.exec(q);
    if (m) this.force = m[1];
    if (/[?&]star=1\b/.test(q)) this.starT = 4;
  },

  /* ---------------- the weather ---------------- */
  slot(time = Date.now()) { return Math.floor(time / WX_SLOT); },
  /** ms until the weather of every isle may change */
  left(time = Date.now()) { return WX_SLOT - time % WX_SLOT; },
  /** the weather of an isle in a slot: 'rain' | 'storm' | 'heat' | 'fog' | '' (clear) */
  at(isle, slot) {
    if (this.force) return this.force === 'clear' || !WX_ODDS[isle] ? '' : this.force;
    const odds = WX_ODDS[isle];
    if (!odds) return '';
    const r = U.rng(U.hash('wx:' + isle + ':' + slot))();
    let acc = 0, kind = '';
    for (const k in odds) { acc += odds[k]; if (r < acc) { kind = k; break; } }
    if (kind === 'heat' && U.dayPhase(new Date(slot * WX_SLOT)) === 'night') kind = ''; // no heatwave under the moon
    return kind;
  },
  /** the weather now; the Sunny Isle stays clear until the first catch (the tutorial has one thing to look at) */
  now(isle) {
    if (!isle || !WX_ODDS[isle]) return '';
    if (isle === 'sunny' && !(Game.s && Game.s.flags.tutCatch)) return '';
    return this.at(isle, this.slot());
  },
  /** this slot and the next ones: [{ kind, at }] (at = when it starts, ms) */
  forecast(isle, n = 3) {
    const s = this.slot(), out = [];
    for (let i = 0; i < n; i++) out.push({ kind: i ? this.at(isle, s + i) : this.now(isle), at: (s + i) * WX_SLOT });
    return out;
  },
  /** the zone's weather (none at the Base, in the Arena or at the Altar) */
  ofZone(zid) { const z = ZONES[zid]; return z && z.isle ? this.now(z.isle) : ''; },
  /** damage multiplier of a move's element under this weather */
  boost(kind, el) { return kind && el && WX_KINDS[kind] && WX_KINDS[kind].el === el ? WX_BOOST : 1; },
  el(kind) { return kind && WX_KINDS[kind] ? WX_KINDS[kind].el : null; },
  /** how much more often a species (spawn weight w) walks out under this weather: fog brings out the scarce ones */
  spawnK(kind, sp, w) {
    if (!kind) return 1;
    if (kind === 'fog') return w <= 10 ? 3 : 1;
    return SPECIES[sp].el === WX_KINDS[kind].el ? 3 : 1;
  },
  shinyK(kind) { return kind === 'fog' ? 2 : 1; },
  snowy(biome) { return WX_SNOW.includes(biome); },
  name(kind, isle) { return t('wx.' + (kind || 'clear') + (kind === 'storm' && isle === 'frost' ? '_snow' : '')); },
  /** one line: what the weather does */
  effect(kind) { return kind ? t('wxe.' + kind, { n: Math.round((WX_BOOST - 1) * 100) }) : t('wxe.clear'); },
  icon(kind, size = 24, night) { return WArt.icon(kind ? WX_KINDS[kind].icon : night ? 'moon' : 'sun', size, 'wx-ico wx-' + (kind || 'clear')); },

  /**
   * the weather as two layers of the scene: `sky` goes right over the backdrop (clouds darken only the sky, haze
   * softens the far land, the sprites stay clear: no dark sheet over the whole picture), `front` over the world
   * (rain or snow, puddle rings on the ground, fog banks, heat shimmer). `o.y0`..`o.y1` is the ground band.
   */
  layers(kind, biome, o = {}) {
    const ash = biome === 'volcano' || biome === 'caldera' ? ' ash' : '';
    const sky = U.el('div', { class: 'wx-sky' + (kind ? ' k-' + kind : '') + ash });
    const front = U.el('div', { class: 'wx-front' + (kind ? ' k-' + kind : '') + ash });
    if (!kind) return { sky, front };
    const lite = typeof Main !== 'undefined' && Main.lite, k = lite ? 0.5 : 1, y0 = o.y0 || 440, y1 = o.y1 || 700;
    const add = (cls, st) => { const e = U.el('i', { class: cls }); Object.assign(e.style, st); front.appendChild(e); return e; };
    if (kind === 'rain' || kind === 'storm') {
      const snow = this.snowy(biome);
      if (snow) front.classList.add('snow');
      const n = Math.round((kind === 'storm' ? 76 : 48) * k);
      for (let i = 0; i < n; i++) {
        add(snow ? 'wf' : 'wd', { left: U.rf(-80, 1300).toFixed(0) + 'px', animationDelay: (-U.rf(0, snow ? 3 : 1.2)).toFixed(2) + 's',
          animationDuration: (snow ? U.rf(1.4, 2.4) : U.rf(0.42, 0.66)).toFixed(2) + 's', opacity: U.rf(0.5, 1).toFixed(2) });
      }
      if (!snow) for (let i = 0; i < Math.round(16 * k); i++) {
        add('ws', { left: U.rf(30, 1250).toFixed(0) + 'px', top: U.rf(y0, y1).toFixed(0) + 'px', animationDelay: (-U.rf(0, 1.6)).toFixed(2) + 's', animationDuration: U.rf(0.9, 1.5).toFixed(2) + 's' });
      }
    } else if (kind === 'fog') {
      for (let i = 0; i < 4; i++) {
        add('wfog', { top: (y0 - 70 + i * (y1 - y0) / 3.2).toFixed(0) + 'px', animationDelay: (-U.rf(0, 40)).toFixed(1) + 's', animationDuration: U.rf(38, 60).toFixed(1) + 's' });
      }
    } else if (kind === 'heat') {
      for (let i = 0; i < Math.round(12 * k); i++) {
        add('wh', { left: U.rf(20, 1260).toFixed(0) + 'px', top: U.rf(y0 - 40, y1).toFixed(0) + 'px', animationDelay: (-U.rf(0, 6)).toFixed(2) + 's', animationDuration: U.rf(3.5, 6).toFixed(2) + 's' });
      }
    }
    return { sky, front };
  },

  /* ---------------- the falling star ---------------- */
  /** seconds of exploring until the next star falls (counted only while you walk an isle zone, never at the Base) */
  starTick(dt) {
    if (this.starT == null) this.starT = U.rf(...STARFALL.first);
    this.starT -= dt;
    if (this.starT > 0) return false;
    this.starT = U.rf(...STARFALL.every);
    return true;
  },
  /** the Orbling born from the star: a zone species one stage further than any that walks there (rarity follows the
   *  stage, so it is always a rare sight), at the zone's top level + 1 with great potential. The scarce ones and the
   *  ones you have not caught come more often; a shiny now and then */
  starform(base, lv) {
    const S = SPECIES[Game.wildForm(base, lv, true)[0]];
    return S.evoTo ? S.evoTo : S.id;
  },
  starborn(zid) {
    const z = ZONES[zid], lv = z.lv[1] + 1;
    const base = U.weighted(z.spawns.map(([sp, w]) => [sp, (Game.caught(this.starform(sp, lv)) ? 1 : 2) / w]));
    return { sp: this.starform(base, lv), lv, base, shiny: Math.random() < STARFALL.shiny };
  },
};
Weather.init();
