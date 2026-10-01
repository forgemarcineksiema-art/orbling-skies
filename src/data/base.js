'use strict';
/* 3.0 "Base and world" data: the Workshop Yard (the Base's second glade), its workshops, the decoration catalogue and
 * the spots decorations stand on, friendship, the daily bonuses and the mini-stories of isle characters. */

/** the Workshop Yard: an orchard next to the glade where Orblings from storage work and visitors drop by */
const YARD = {
  id: 'yard', home: true, biome: 'yard', seed: 11, lv: [1, 1], isle: null, max: 0, spawns: [], npcs: [],
  walk: { x0: 60, x1: 1220, y0: 376, y1: 672 },
  start: [190, 566], bruno: [648, 482], stall: [640, 414],
  exits: [['__glade', 62, 546, 1]],
  props: [['bush', 1, 1250, 486, 0.85], ['bush', 2, 1204, 690, 0.8], ['tree_round', 1, 1262, 420, 0.9]],
  block: [[648, 482], [640, 414]],
};

/* workshops: an Orbling from storage works at each and its output piles up for 10 h (a worker of the workshop's
 * element works at full speed, others at 60%); `per` = hours per unit, `extra` = [item, chance] instead of a unit */
const WS_CAP_H = 10;
const WORKSHOPS = [
  { id: 'garden', el: 'earth', out: 'berry', per: 2, cost: 0, extra: ['candy', 0.05], pos: [206, 440], wp: [306, 488] },
  { id: 'kiln', el: 'fire', out: 'orb', per: 1.5, cost: 1500, extra: ['nova', 0.12], pos: [444, 430], wp: [530, 482] },
  { id: 'well', el: 'water', out: 'potion', per: 2.5, cost: 3000, extra: ['ether', 0.25], pos: [846, 434], wp: [762, 486] },
  { id: 'mill', el: 'air', out: 'coins', amt: 50, per: 1, cost: 5000, dust: 3, pos: [1080, 428], wp: [990, 488] },
];
const WS = Object.fromEntries(WORKSHOPS.map(W => [W.id, W]));

/* decorations: bought with coins (a sink for the one currency), placed on fixed spots of the glade and the yard;
 * `el` = the element they draw visitors of ('*' = all). The story rewards are one of a kind. */
const DECOR = {};
for (const [id, price, el] of [
  ['lantern', 500, '*'], ['flowerbed', 700, 'earth'], ['pinwheel', 700, 'air'], ['bench', 900, '*'], ['shell', 900, 'water'],
  ['snowman', 1100, 'water'], ['birdbath', 1400, 'air'], ['sundial', 1800, 'fire'], ['crystal', 2200, 'earth'], ['brazier', 2400, 'fire'],
  ['tesla', 2800, 'air'], ['arch', 3200, 'earth'], ['fountain', 3800, 'water'], ['totem', 5000, '*'], ['balloon', 6500, 'air'], ['statue', 8000, '*'],
]) DECOR[id] = { id, price, el };
for (const [id, story, el] of [['tent', 'tim', 'earth'], ['lighthouse', 'rex', 'water'], ['campfire', 'jax', 'fire'], ['telescope', 'ivan', 'air'], ['station', 'jett', 'air']]) DECOR[id] = { id, story, el };
/** the art of a decoration: [prop, variant, scale] (default: its own prop at 1) */
const DECOR_ART = { lantern: ['lantern', 0, 1.2], shell: ['shell_big', 0, 1.6], snowman: ['snowman', 0, 1], crystal: ['crystal', 1, 1.05], tesla: ['tesla', 0, 0.9] };
const DECOR_SPOTS = {
  glade: [[298, 412], [578, 388], [868, 402], [242, 618]],
  yard: [[118, 650], [410, 626], [880, 624], [1160, 642], [1192, 522]],
};
YARD.block.push(...WORKSHOPS.map(W => W.pos), ...WORKSHOPS.map(W => W.wp), ...DECOR_SPOTS.yard);
HOME.block.push(...DECOR_SPOTS.glade);

/* friendship: hearts at these points; petting once a day, battles won and work add to it (those two at most
 * FR_DAILY a day per Orbling). Perks: ♥1 +5% XP · ♥2 may shake off a status · ♥3 +5% crits · ♥4/5 may endure a KO. */
const FR_HEARTS = [10, 30, 60, 100, 150];
const FR_PET = 8, FR_DAILY = 10;

/* daily bonuses: the first catch of the day, and a welcome-back gift after 3+ days away */
const FIRST_CATCH = { orb: 3, coins: 100 };
const VISIT_H = 8; // a visitor may drop by the yard once in each 8-hour window

/* mini-stories: isle characters you have beaten ask for something small; the reward is a one-of-a-kind decoration */
const STORIES = [
  { id: 'tim', npc: 't_tim', isle: 'sunny', need: { own: ['sunkit', 'pridefang', 'solmane'] }, reward: { decor: 'tent', coins: 300 } },
  { id: 'rex', npc: 't_rex', isle: 'coral', need: { own: ['koiwhirl', 'pisceidon'] }, reward: { decor: 'lighthouse', coins: 400 } },
  { id: 'jax', npc: 't_grunt1', isle: 'ember', need: { hearts: 2 }, reward: { decor: 'campfire', coins: 500 } },
  { id: 'ivan', npc: 't_ivan', isle: 'frost', need: { hatched: 1 }, reward: { decor: 'telescope', egg_water: 1 } },
  { id: 'jett', npc: 't_jett', isle: 'storm', need: { shards: 10 }, reward: { decor: 'station', coins: 600 } },
];
