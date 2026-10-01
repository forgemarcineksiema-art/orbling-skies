'use strict';
/* Moves.
 * cat: phys (uses ATK, no element, free) | star (uses STAR power, elemental, costs energy)
 *      buff (self stat stages) | debuff (foe stat stages) | status (inflict status) | heal
 * cost = energy (EN). Every Orbling has 10 EN, +1 per turn, refilled after battle. */

const MOVES = {
  // ---- physical (neutral, free) ----
  tackle:      { cat: 'phys', pow: 40, acc: 100, cost: 0 },
  scratch:     { cat: 'phys', pow: 45, acc: 100, cost: 0, crit: 0.12 },
  pounce:      { cat: 'phys', pow: 70, acc: 95, cost: 0, crit: 0.12 },
  quick_dash:  { cat: 'phys', pow: 40, acc: 100, cost: 0, prio: 1 },
  bite:        { cat: 'phys', pow: 60, acc: 95, cost: 0 },
  // 2.9: the late free moves were toned down so that Star moves (and energy) carry the fights
  double_hit:  { cat: 'phys', pow: 40, acc: 95, cost: 0, hits: 2 },
  headbutt:    { cat: 'phys', pow: 60, acc: 95, cost: 0 },
  body_slam:   { cat: 'phys', pow: 65, acc: 90, cost: 0, status: ['shock', 0.15] },
  mega_strike: { cat: 'phys', pow: 80, acc: 85, cost: 0, recoil: 0.33 },
  // sign-flavoured physical moves
  ram_charge:  { cat: 'phys', pow: 65, acc: 95, cost: 0, crit: 0.12 },
  horn_rush:   { cat: 'phys', pow: 65, acc: 95, cost: 0 },
  pinch:       { cat: 'phys', pow: 55, acc: 100, cost: 0, crit: 0.18 },
  peck:        { cat: 'phys', pow: 65, acc: 100, cost: 0 },
  venom_sting: { cat: 'phys', pow: 65, acc: 100, cost: 0, status: ['poison', 0.3] },
  arrow_shot:  { cat: 'phys', pow: 60, acc: 100, cost: 0, sure: true },

  // ---- neutral support ----
  growl:       { cat: 'debuff', acc: 100, cost: 1, foe: { atk: -1 } },
  glare:       { cat: 'debuff', acc: 100, cost: 1, foe: { spd: -1 } },
  roar:        { cat: 'debuff', acc: 100, cost: 2, foe: { atk: -1, def: -1 } },
  focus:       { cat: 'buff', cost: 2, self: { atk: 1, mag: 1 } },
  guard_up:    { cat: 'buff', cost: 2, self: { def: 2 } },
  recharge:    { cat: 'buff', cost: 0, en: 5 },
  star_heal:   { cat: 'heal', cost: 4, heal: 0.4 },
  lullaby:     { cat: 'status', acc: 75, cost: 3, status: ['sleep', 1] },

  // ---- fire ----
  ember:       { el: 'fire', cat: 'star', pow: 50, acc: 100, cost: 2, status: ['burn', 0.15] },
  flame_dash:  { el: 'fire', cat: 'star', pow: 50, acc: 100, cost: 2, prio: 1 },
  fireball:    { el: 'fire', cat: 'star', pow: 70, acc: 95, cost: 3, status: ['burn', 0.2] },
  blaze_wave:  { el: 'fire', cat: 'star', pow: 90, acc: 90, cost: 5, status: ['burn', 0.2] },
  inferno:     { el: 'fire', cat: 'star', pow: 120, acc: 85, cost: 7, status: ['burn', 0.3] },
  heat_up:     { el: 'fire', cat: 'buff', cost: 3, self: { mag: 2 } },
  wisp_burn:   { el: 'fire', cat: 'status', acc: 85, cost: 3, status: ['burn', 1] },

  // ---- water (incl. ice) ----
  bubble:      { el: 'water', cat: 'star', pow: 50, acc: 100, cost: 2, foe: { spd: -1 }, foeChance: 0.25 },
  aqua_jet:    { el: 'water', cat: 'star', pow: 50, acc: 100, cost: 2, prio: 1 },
  water_blast: { el: 'water', cat: 'star', pow: 70, acc: 95, cost: 3 },
  frost_shard: { el: 'water', cat: 'star', pow: 65, acc: 95, cost: 3, status: ['freeze', 0.15] },
  tidal_wave:  { el: 'water', cat: 'star', pow: 95, acc: 90, cost: 5 },
  blizzard:    { el: 'water', cat: 'star', pow: 115, acc: 80, cost: 7, status: ['freeze', 0.2] },
  soothing_rain: { el: 'water', cat: 'heal', cost: 4, heal: 0.35, cure: true },

  // ---- earth (incl. nature) ----
  pebble_toss: { el: 'earth', cat: 'star', pow: 50, acc: 100, cost: 2 },
  vine_whip:   { el: 'earth', cat: 'star', pow: 50, acc: 100, cost: 2, crit: 0.1 },
  mud_shot:    { el: 'earth', cat: 'star', pow: 60, acc: 95, cost: 3, foe: { spd: -1 } },
  rock_slide:  { el: 'earth', cat: 'star', pow: 75, acc: 90, cost: 4 },
  leaf_storm:  { el: 'earth', cat: 'star', pow: 90, acc: 90, cost: 5 },
  earthquake:  { el: 'earth', cat: 'star', pow: 120, acc: 85, cost: 7 },
  sleep_spores:{ el: 'earth', cat: 'status', acc: 75, cost: 3, status: ['sleep', 1] },
  barkskin:    { el: 'earth', cat: 'buff', cost: 3, self: { def: 2 }, heal: 0.15 },

  // ---- air (incl. storm) ----
  gust:        { el: 'air', cat: 'star', pow: 50, acc: 100, cost: 2 },
  spark:       { el: 'air', cat: 'star', pow: 50, acc: 100, cost: 2, status: ['shock', 0.2] },
  // the sign attacks that replaced Recharge (nobody ever used it) at Lv 20
  twin_sparks: { el: 'air', cat: 'star', pow: 35, acc: 95, cost: 3, hits: 2, status: ['shock', 0.1] },
  scale_gale:  { el: 'air', cat: 'star', pow: 70, acc: 100, cost: 3 },
  rain_pour:   { el: 'air', cat: 'star', pow: 70, acc: 95, cost: 3, foe: { spd: -1 }, foeChance: 0.3 },
  air_slash:   { el: 'air', cat: 'star', pow: 75, acc: 95, cost: 4, crit: 0.15 },
  thunderbolt: { el: 'air', cat: 'star', pow: 90, acc: 95, cost: 5, status: ['shock', 0.2] },
  tempest:     { el: 'air', cat: 'star', pow: 120, acc: 80, cost: 7, status: ['shock', 0.2] },
  tailwind:    { el: 'air', cat: 'buff', cost: 2, self: { spd: 2 } },
  static_field:{ el: 'air', cat: 'status', acc: 85, cost: 3, status: ['shock', 1] },

  // ---- legendary signatures ----
  stellar_ram:    { el: 'fire', cat: 'star', pow: 110, acc: 95, cost: 6, self: { atk: 1 }, sig: true },
  solar_roar:     { el: 'fire', cat: 'star', pow: 120, acc: 90, cost: 7, status: ['burn', 0.3], sig: true },
  meteor_arrow:   { el: 'fire', cat: 'star', pow: 130, acc: 100, cost: 7, sure: true, sig: true },
  stampede:       { el: 'earth', cat: 'star', pow: 115, acc: 90, cost: 6, foe: { def: -1 }, sig: true },
  harvest_bloom:  { el: 'earth', cat: 'star', pow: 100, acc: 95, cost: 6, drain: 0.4, sig: true },
  summit_crash:   { el: 'earth', cat: 'star', pow: 130, acc: 90, cost: 7, recoil: 0.15, sig: true },
  twin_tempest:   { el: 'air', cat: 'star', pow: 65, acc: 95, cost: 6, hits: 2, sig: true },
  equinox:        { el: 'air', cat: 'star', pow: 100, acc: 100, cost: 6, self: { mag: 1, def: 1 }, sig: true },
  starfall_surge: { el: 'air', cat: 'star', pow: 120, acc: 95, cost: 7, status: ['shock', 0.25], sig: true },
  moon_tide:      { el: 'water', cat: 'star', pow: 100, acc: 95, cost: 6, drain: 0.3, sig: true },
  night_sting:    { el: 'water', cat: 'star', pow: 100, acc: 95, cost: 6, status: ['poison', 0.5], sig: true },
  dream_current:  { el: 'water', cat: 'star', pow: 100, acc: 95, cost: 6, status: ['sleep', 0.3], sig: true },
};
for (const id in MOVES) MOVES[id].id = id;

/** rough usefulness score (used for auto-equipping and AI) */
function moveValue(id) {
  const m = MOVES[id];
  if (!m) return 0;
  if (m.pow) return m.pow * (m.hits || 1) * (m.sure ? 1 : (m.acc || 100) / 100) * (m.cat === 'star' ? 1.1 : 1) - (m.recoil ? 12 : 0);
  if (m.cat === 'heal') return 55;
  if (m.cat === 'status') return 65;
  if (m.en) return 38;
  return 60;
}
