'use strict';
/* World: 6 floating Star Isles × 2 zones, tamers & guardians, main quest chain, daily quest templates. */

const ISLES = [
  { id: 'sunny',   biome: 'meadow',   pos: [200, 520],  lv: [2, 9],   zones: ['clover', 'whisper'], guardian: 'g_fern',   music: 'explore' },
  { id: 'coral',   biome: 'beach',    pos: [420, 320],  lv: [8, 15],  zones: ['shore', 'cove'],     guardian: 'g_marina', music: 'explore' },
  { id: 'ember',   biome: 'volcano',  pos: [650, 525],  lv: [14, 21], zones: ['ashen', 'caldera'],  guardian: 'g_blaze',  music: 'explore' },
  { id: 'frost',   biome: 'snow',     pos: [860, 300],  lv: [20, 27], zones: ['drift', 'glacier'],  guardian: 'g_yuki',   music: 'explore' },
  { id: 'storm',   biome: 'plains',   pos: [1075, 505], lv: [26, 33], zones: ['plains', 'spire'],   guardian: 'g_volt',   music: 'explore' },
  { id: 'eclipse', biome: 'twilight', pos: [1080, 170], lv: [32, 42], zones: ['grove', 'citadel'],  guardian: 'g_umbra',  music: 'night' },
];
const ISLE = Object.fromEntries(ISLES.map((s, i) => [s.id, Object.assign(s, { idx: i })]));

/* zone: biome, level range, wild spawn weights, NPC placement ([id, x, y]), interactables */
const ZONES = {
  clover: {
    isle: 'sunny', biome: 'meadow', seed: 11, lv: [2, 4], max: 4,
    spawns: [['fluffire', 30], ['mossmoo', 30], ['breezle', 26], ['budlet', 24], ['zapsy', 8], ['sunkit', 3], ['finnip', 3], ['nimbub', 4]],
    npcs: [['prof', 360, 470], ['t_tim', 780, 470], ['t_lily', 1000, 620]],
    ship: [120, 486], pod: [235, 628], chest: [620, 634], exits: [['whisper', 1236, 566, 0]], start: [300, 560],
  },
  whisper: {
    isle: 'sunny', biome: 'forest', seed: 12, lv: [4, 7], max: 4,
    spawns: [['budlet', 26], ['zapsy', 22], ['nimbub', 22], ['goatlet', 22], ['fluffire', 14], ['mossmoo', 12], ['cinderfawn', 4]],
    npcs: [['t_owen', 430, 610], ['t_zoe', 760, 470], ['g_fern', 1110, 520]],
    pod: [150, 470], chest: [620, 634], exits: [['clover', 44, 566, 1]], start: [120, 590],
  },
  shore: {
    isle: 'coral', biome: 'beach', seed: 21, lv: [8, 11], max: 4,
    spawns: [['finnip', 28], ['clawby', 28], ['stingle', 20], ['breezle', 16], ['nimbub', 14], ['koiwhirl', 3]],
    npcs: [['t_kai', 720, 480], ['t_mia', 980, 624]],
    ship: [120, 486], pod: [260, 632], chest: [560, 634], exits: [['cove', 1236, 566, 0]], start: [300, 560],
  },
  cove: {
    isle: 'coral', biome: 'cove', seed: 22, lv: [10, 14], max: 4,
    spawns: [['clawby', 24], ['stingle', 22], ['finnip', 20], ['nimbub', 14], ['gustwing', 8], ['shellsnap', 6]],
    npcs: [['t_rex', 430, 610], ['t_nia', 760, 470], ['g_marina', 1110, 520]],
    pod: [150, 470], chest: [620, 634], exits: [['shore', 44, 566, 1]], start: [120, 590],
  },
  ashen: {
    isle: 'ember', biome: 'volcano', seed: 31, lv: [14, 17], max: 4,
    spawns: [['sunkit', 18], ['cinderfawn', 18], ['fluffire', 16], ['goatlet', 12], ['mossmoo', 8], ['blazeram', 10], ['pridefang', 10], ['cragoat', 8]],
    npcs: [['t_ash', 720, 480], ['t_ruby', 980, 624]],
    ship: [120, 486], pod: [260, 632], chest: [560, 634], exits: [['caldera', 1236, 566, 0]], start: [300, 560],
  },
  caldera: {
    isle: 'ember', biome: 'caldera', seed: 32, lv: [16, 20], max: 4,
    spawns: [['blazeram', 16], ['emberstag', 16], ['bouldox', 16], ['cragoat', 16], ['pridefang', 6]],
    npcs: [['t_grunt1', 430, 610], ['t_cole', 760, 470], ['g_blaze', 1110, 520]],
    pod: [150, 470], chest: [620, 634], exits: [['ashen', 44, 566, 1]], start: [120, 590],
  },
  drift: {
    isle: 'frost', biome: 'snow', seed: 41, lv: [20, 23], max: 4,
    spawns: [['koiwhirl', 22], ['shellsnap', 20], ['nimbolt', 18], ['cragoat', 18], ['nimbub', 12], ['venomire', 10]],
    npcs: [['t_skye', 720, 480], ['t_ivan', 980, 624]],
    ship: [120, 486], pod: [260, 632], chest: [560, 634], exits: [['glacier', 1236, 566, 0]], start: [300, 560],
  },
  glacier: {
    isle: 'frost', biome: 'glacier', seed: 42, lv: [22, 26], max: 4,
    spawns: [['cragoat', 18], ['koiwhirl', 18], ['venomire', 16], ['gustwing', 16], ['twinbolt', 14], ['shellsnap', 7]],
    npcs: [['t_grunt2', 430, 610], ['t_hana', 760, 470], ['g_yuki', 1110, 520]],
    pod: [150, 470], chest: [620, 634], exits: [['drift', 44, 566, 1]], start: [120, 590],
  },
  plains: {
    isle: 'storm', biome: 'plains', seed: 51, lv: [26, 29], max: 4,
    spawns: [['twinbolt', 22], ['gustwing', 22], ['nimbolt', 20], ['emberstag', 14], ['petalina', 14], ['bouldox', 8]],
    npcs: [['t_jett', 720, 480], ['t_nova2', 980, 624]],
    ship: [120, 486], pod: [260, 632], chest: [560, 634], exits: [['spire', 1236, 566, 0]], start: [300, 560],
  },
  spire: {
    isle: 'storm', biome: 'spire', seed: 52, lv: [28, 32], max: 4,
    spawns: [['twinbolt', 18], ['nimbolt', 18], ['petalina', 16], ['pridefang', 14], ['bouldox', 12], ['libratross', 3], ['tempestar', 2]],
    npcs: [['t_grunt3', 430, 610], ['t_sir', 760, 470], ['g_volt', 1110, 520]],
    pod: [150, 470], chest: [620, 634], exits: [['plains', 44, 566, 1]], start: [120, 590],
  },
  grove: {
    isle: 'eclipse', biome: 'twilight', seed: 61, lv: [32, 36], max: 5,
    spawns: [['venomire', 16], ['koiwhirl', 14], ['petalina', 14], ['gustwing', 14], ['floravelle', 8], ['libratross', 8], ['moontide', 8], ['abyssting', 8]],
    npcs: [['t_luna', 720, 480], ['t_admin1', 980, 624]],
    ship: [120, 486], pod: [260, 632], chest: [560, 634], exits: [['citadel', 1236, 566, 0]], start: [300, 560],
  },
  citadel: {
    isle: 'eclipse', biome: 'citadel', seed: 62, lv: [35, 40], max: 5,
    spawns: [['ignaram', 10], ['solmane', 10], ['meteorhorn', 10], ['gaiaurus', 10], ['peakhorn', 10], ['geminova', 10], ['tempestar', 10], ['pisceidon', 10], ['abyssting', 8], ['moontide', 8]],
    npcs: [['t_admin2', 470, 620], ['t_grunt4', 800, 470], ['g_umbra', 1110, 520]],
    pod: [560, 640], obs: [215, 490], exits: [['grove', 44, 566, 1]], start: [120, 600],
  },
};
for (const id in ZONES) ZONES[id].id = id;

/* the player's base: a glade in the forest where every Orbling you own lives (not a travel zone of an isle) */
const HOME = {
  id: 'home', home: true, biome: 'home', seed: 7, lv: [1, 1], isle: null, max: 0, spawns: [], npcs: [],
  walk: { x0: 60, x1: 1220, y0: 360, y1: 672 },
  start: [600, 560], ship: [150, 420], treehouse: [1060, 440], hatch: [420, 400], dojo: [730, 408], spring: [1112, 640],
  exits: [['__back', 70, 668, 1], ['__yard', 1218, 546, 0]],
  props: [['bush', 1, 36, 470, 1], ['bush', 2, 1252, 404, 0.9]],
  // extra spots Orblings keep away from (the treehouse is wide; decoration spots are added in data/base.js), and
  // ellipses nobody walks into (the pond)
  block: [[940, 430], [1010, 440], [1090, 440], [1170, 440], [150, 410]],
  noGo: [[1112, 656, 172, 74]], pond: [1112, 654, 70, 28],
};

/* biome prop sets for procedural zone decoration: big (back row) and small (scattered) */
const BIOME_PROPS = {
  meadow:   { big: [['tree_round', 0], ['tree_round', 1], ['tree_round', 2]], small: [['bush', 0], ['bush', 1], ['rock', 0], ['stump', 0]] },
  forest:   { big: [['tree_pine', 0], ['tree_pine', 1], ['tree_round', 0]], small: [['mushroom', 0], ['bush', 2], ['stump', 0], ['rock', 0]] },
  beach:    { big: [['tree_palm', 0]], small: [['shell_big', 0], ['rock', 0], ['coral', 1], ['bush', 0]] },
  cove:     { big: [['tree_palm', 0], ['coral', 0]], small: [['coral', 1], ['shell_big', 0], ['rock', 1]] },
  volcano:  { big: [['tree_dead', 0], ['basalt', 0]], small: [['lava_vent', 0], ['rock', 2], ['crystal', 1]] },
  caldera:  { big: [['basalt', 0], ['tree_dead', 0]], small: [['lava_vent', 0], ['crystal', 1], ['rock', 2]] },
  snow:     { big: [['tree_snow', 0]], small: [['snowman', 0], ['rock_snow', 0], ['crystal', 0]] },
  glacier:  { big: [['crystal', 0], ['tree_snow', 0]], small: [['rock_snow', 0], ['crystal', 0]] },
  plains:   { big: [['tesla', 0], ['tree_round', 1]], small: [['rock', 1], ['bush', 0], ['crystal', 2]] },
  spire:    { big: [['tesla', 0], ['crystal', 3]], small: [['rock', 3], ['crystal', 2]] },
  twilight: { big: [['tree_twist', 0], ['tree_twist', 1]], small: [['mushroom', 1], ['lantern', 0], ['rock', 3]] },
  citadel:  { big: [['pillar', 0], ['pillar', 1]], small: [['crystal', 3], ['lantern', 0], ['rock', 3]] },
  home:     { big: [], small: [['bush', 1], ['mushroom', 0], ['bush', 2]] },
  yard:     { big: [], small: [['bush', 1], ['bush', 2]] },
};
const BIOME_PARTICLES = { meadow: 'petal', forest: 'firefly', beach: 'sparkle', cove: 'bubble', volcano: 'ember', caldera: 'ember', snow: 'snow', glacier: 'snow', plains: 'spark', spire: 'spark', twilight: 'firefly', citadel: 'mote', home: 'firefly', yard: 'petal' };
/** the hour a zone (and a battle in it) is painted for: 'dawn' | 'dusk' | 'night', or '' by day and on the Eclipse
 *  Isle, whose dusk never ends (3.4.1: the backdrop is repainted for the hour, see Scenery TIME OF DAY) */
const zoneTod = (z, phase = U.dayPhase()) => phase === 'day' || !z || z.isle === 'eclipse' ? '' : phase;
/** biomes open to the sky: a shooting star crosses it now and then at night */
const NIGHT_SKY = ['meadow', 'beach', 'cove', 'volcano', 'caldera', 'snow', 'glacier', 'plains', 'spire'];

/* tamer class appearance presets */
const CLASS_LOOK = {
  camper:       { acc: ['cap'], accC: '#4cd964', top: '#ffb13b', hair: 'short', body: 'kid', hold: 'net', mouth: 'grin' },
  florist:      { acc: ['flower'], accC: '#ff7ab6', top: '#ff9ac8', hair: 'long', outfit: 'dress', eyes: 'happy' },
  hiker:        { acc: ['hat'], accC: '#8a6a3a', top: '#6fb84e', hair: 'short', body: 'stout', outfit: 'jacket', pack: true, hold: 'staff', beard: true },
  scout:        { acc: ['bandana'], accC: '#ff5d6c', top: '#3aa6ff', hair: 'pony', body: 'kid', mouth: 'grin' },
  swimmer:      { acc: ['goggles'], accC: '#ffd23f', top: '#2fd0c0', hair: 'short', body: 'tall', outfit: 'wetsuit' },
  sailor:       { acc: ['cap'], accC: '#ff5d6c', top: '#ffffff', hair: 'bob', outfit: 'sailor' },
  fisher:       { acc: ['hat'], accC: '#ffd23f', top: '#4f8f84', pants: '#3a5ab8', hair: 'curly', body: 'stout', outfit: 'overalls', hold: 'rod', beard: true },
  diver:        { acc: ['goggles'], accC: '#ffffff', top: '#ff8a3d', hair: 'long', outfit: 'wetsuit' },
  firebreather: { acc: ['bandana'], accC: '#ff5d2e', top: '#e8402e', hair: 'spiky', body: 'tall', outfit: 'vest', hold: 'torch', brows: 'angry' },
  ranger:       { acc: ['hat'], accC: '#c47a2e', top: '#8a6a3a', hair: 'pony', outfit: 'coat' },
  grunt:        { acc: ['hood', 'visor'], accC: '#ff3d6e', top: '#2a2240', pants: '#1c1830', hair: 'short', outfit: 'suit', brows: 'angry' },
  admin:        { acc: ['cape', 'visor'], accC: '#ff3d6e', top: '#2a2240', pants: '#1c1830', hair: 'long', body: 'tall', outfit: 'coat' },
  skier:        { acc: ['goggles', 'scarf'], accC: '#ff5d6c', top: '#ffffff', hair: 'bob', body: 'kid', outfit: 'jacket' },
  scientist:    { acc: ['labcoat', 'glasses'], top: '#8fb8e8', hair: 'curly', body: 'elder', hold: 'flask', mustache: true, eyes: 'dot' },
  pilot:        { acc: ['headset'], accC: '#ffb13b', top: '#5a6478', hair: 'short', outfit: 'jacket' },
  stormchaser:  { acc: ['goggles'], accC: '#ffe066', top: '#a07cff', hair: 'spiky', body: 'tall', outfit: 'coat', hold: 'staff' },
  mystic:       { acc: ['hood'], accC: '#8ffcff', top: '#6a4ae8', hair: 'long', outfit: 'robe', hold: 'staff', eyes: 'sleepy' },
  knight:       { acc: ['cape', 'knighthelm'], accC: '#ff5d6c', top: '#9aa0c0', hair: 'short', body: 'stout', outfit: 'armor', hold: 'sword', mustache: true },
  professor:    { acc: ['labcoat', 'glasses'], accC: '#6a4ae8', top: '#ffffff', hair: 'short', hairC: '#f2eef8', skin: '#f6c9a0', body: 'elder', hold: 'book' },
  builder:      { acc: ['cap'], accC: '#ffd23f', top: '#ff8a3d', pants: '#3a5ab8', hair: 'short', hairC: '#7a4a2a', skin: '#dca47a', body: 'stout', outfit: 'overalls', hold: 'wrench', beard: true, eyes: 'happy' },
};

/* Tamers: cls, name, team [[species, level]], reward (coins). Guardians hold Star Sigils. */
const TRAINER_COINS = 0.6; // 2.7: trainer payouts cut by 40% (coins piled up with nothing to spend them on)
const TAMERS = {
  prof:     { cls: 'professor', name: 'Vega', npc: true },
  bruno:    { cls: 'builder', name: 'Rudi', npc: true }, // the Base's builder (the Workshop Yard)
  // Sunny Isle
  t_tim:    { cls: 'camper', name: 'Tim', team: [['fluffire', 2], ['mossmoo', 3]], reward: 90 },
  t_lily:   { cls: 'florist', name: 'Lily', team: [['budlet', 3], ['breezle', 4]], reward: 110 },
  t_owen:   { cls: 'hiker', name: 'Owen', team: [['goatlet', 4], ['mossmoo', 5]], reward: 130 },
  t_zoe:    { cls: 'scout', name: 'Zoe', team: [['zapsy', 5], ['nimbub', 6], ['budlet', 6]], reward: 150 },
  g_fern:   { cls: 'ranger', name: 'Fern', guardian: 'sunny', team: [['mossmoo', 6], ['budlet', 7], ['goatlet', 7]], reward: 400,
              look: { acc: ['hat', 'cape'], accC: '#4cae4c', top: '#3f8a4f', hair: 'long', hairC: '#7a4a2a', skin: '#dca47a', outfit: 'robe', body: 'tall', hold: 'staff', pack: false } },
  // Coral Isle
  t_kai:    { cls: 'swimmer', name: 'Kai', team: [['finnip', 8], ['clawby', 9]], reward: 170 },
  t_mia:    { cls: 'sailor', name: 'Mia', team: [['stingle', 9], ['breezle', 9], ['finnip', 10]], reward: 190 },
  t_rex:    { cls: 'fisher', name: 'Rex', look: { kind: 'cat', fur: '#f0a040', beard: false }, team: [['clawby', 11], ['stingle', 11]], reward: 210 },
  t_nia:    { cls: 'diver', name: 'Nia', team: [['finnip', 11], ['nimbub', 12], ['clawby', 12]], reward: 230 },
  g_marina: { cls: 'sailor', name: 'Marina', guardian: 'coral', team: [['clawby', 12], ['stingle', 12], ['koiwhirl', 13]], reward: 600,
              look: { acc: ['captain', 'cape'], accC: '#3a8fe8', top: '#1c3a8a', hair: 'long', hairC: '#3fbf8f', skin: '#f6c9a0', outfit: 'coat', hold: 'sword' } },
  // Ember Isle
  t_ash:    { cls: 'firebreather', name: 'Ash', team: [['sunkit', 14], ['fluffire', 14]], reward: 260 },
  t_ruby:   { cls: 'ranger', name: 'Ruby', team: [['cinderfawn', 15], ['goatlet', 15], ['sunkit', 16]], reward: 280 },
  t_grunt1: { cls: 'grunt', name: 'Jax', team: [['stingle', 16], ['venomire', 17]], reward: 300 },
  t_cole:   { cls: 'hiker', name: 'Cole', team: [['bouldox', 17], ['cragoat', 17], ['emberstag', 18]], reward: 320 },
  g_blaze:  { cls: 'firebreather', name: 'Blaze', guardian: 'ember', team: [['blazeram', 18], ['emberstag', 18], ['pridefang', 19]], reward: 800,
              look: { acc: ['bandana', 'cape'], accC: '#ff7a2e', top: '#e8402e', hair: 'spiky', hairC: '#e8604a', skin: '#b57b53', outfit: 'armor', body: 'stout', hold: 'torch', brows: 'angry', beard: true } },
  // Frost Isle
  t_skye:   { cls: 'skier', name: 'Skye', team: [['koiwhirl', 20], ['nimbolt', 20]], reward: 340 },
  t_ivan:   { cls: 'scientist', name: 'Ivan', team: [['shellsnap', 21], ['cragoat', 21], ['nimbolt', 22]], reward: 360 },
  t_grunt2: { cls: 'grunt', name: 'Moe', team: [['venomire', 22], ['shellsnap', 23]], reward: 380 },
  t_hana:   { cls: 'skier', name: 'Hana', team: [['koiwhirl', 23], ['twinbolt', 23], ['gustwing', 24]], reward: 400 },
  g_yuki:   { cls: 'skier', name: 'Yuki', guardian: 'frost', team: [['koiwhirl', 24], ['cragoat', 24], ['shellsnap', 25]], reward: 1000,
              look: { acc: ['tiara', 'cape'], accC: '#8fd8ff', top: '#e8f4ff', hair: 'bob', hairC: '#f2eef8', skin: '#ffe3cc', outfit: 'dress', body: 'std', hold: 'staff', eyes: 'sleepy' } },
  // Storm Isle
  t_jett:   { cls: 'pilot', name: 'Jett', look: { kind: 'bot', top: '#5a6478' }, team: [['gustwing', 26], ['twinbolt', 26]], reward: 420 },
  t_nova2:  { cls: 'stormchaser', name: 'Rhea', team: [['nimbolt', 27], ['petalina', 27], ['twinbolt', 28]], reward: 440 },
  t_grunt3: { cls: 'grunt', name: 'Pike', team: [['venomire', 28], ['pridefang', 28], ['bouldox', 29]], reward: 460 },
  t_sir:    { cls: 'knight', name: 'Percy', team: [['bouldox', 29], ['pridefang', 29], ['gustwing', 30]], reward: 480 },
  g_volt:   { cls: 'stormchaser', name: 'Volt', guardian: 'storm', team: [['twinbolt', 30], ['nimbolt', 30], ['libratross', 31]], reward: 1300,
              look: { acc: ['goggles', 'cape'], accC: '#ffd23f', top: '#6a4ae8', hair: 'spiky', hairC: '#ffd23f', skin: '#dca47a', outfit: 'armor', body: 'tall', hold: 'staff' } },
  // Eclipse Isle
  t_luna:   { cls: 'mystic', name: 'Luna', look: { kind: 'cat', fur: '#4a4452', acc: ['fez'], accC: '#8ffcff' }, team: [['floravelle', 32], ['moontide', 32], ['libratross', 33]], reward: 520 },
  t_admin1: { cls: 'admin', name: 'Vex', team: [['abyssting', 33], ['venomire', 33], ['pridefang', 34]], reward: 560 },
  t_admin2: { cls: 'admin', name: 'Nyx', team: [['geminova', 35], ['tempestar', 35], ['abyssting', 36]], reward: 600 },
  t_grunt4: { cls: 'grunt', name: 'Rook', team: [['solmane', 36], ['gaiaurus', 36], ['pisceidon', 37]], reward: 640 },
  g_umbra:  { cls: 'admin', name: 'Umbra', guardian: 'eclipse', boss: true, team: [['abyssting', 35], ['ignaram', 35], ['tempestar', 36], ['meteorhorn', 37]], reward: 2500,
              look: { acc: ['hood', 'cape', 'crown'], accC: '#7a3aff', top: '#1c1830', pants: '#120f22', hair: 'long', hairC: '#b56ae8', skin: '#b57b53', outfit: 'robe', body: 'tall', hold: 'staff', brows: 'angry' } },
};
for (const id in TAMERS) TAMERS[id].id = id;

function tamerLook(id) {
  const T = TAMERS[id];
  if (T.look && T.guardian) return Object.assign({}, CLASS_LOOK[T.cls] || {}, T.look);
  const base = Object.assign({}, CLASS_LOOK[T.cls] || {}, T.look || {});
  const h = U.hash(id);
  if (!base.skin) base.skin = WArt.SKINS[h % WArt.SKINS.length];
  if (!base.hairC) base.hairC = WArt.HAIRC[(h >> 3) % 6];
  // tamers of the same class still look like different people: build, beard and expression vary
  if (!(T.look && T.look.body) && base.body !== 'kid' && base.body !== 'elder') base.body = ['std', 'tall', 'stout', base.body || 'std'][(h >> 6) % 4];
  if (base.beard && (h >> 9) % 2) base.beard = false;
  if (!base.eyes && (h >> 11) % 3 === 0) base.eyes = 'happy';
  return base;
}
/** tamers on an isle (excluding the guardian & npcs) */
function isleTamers(isleId) {
  const out = [];
  for (const z of ISLE[isleId].zones) for (const [id] of ZONES[z].npcs) if (TAMERS[id] && !TAMERS[id].npc && !TAMERS[id].guardian) out.push(id);
  return out;
}

/* Main quest chain (Pip guides the player). type → see Quests.progress. Counting quests count everything the
 * player has done so far (never "from now on"), so a quest can never demand what was already achieved.
 * side: one of Pip's requests. When the story has already moved past it (the next story quest is done), it moves
 * to the "Pip's requests" list instead of blocking the chain, and still pays out whenever it gets done. */
const MAIN_QUESTS = [
  { id: 'q1', type: 'catch', n: 1, reward: { orb: 5, txp: 30 } },
  { id: 'q2', type: 'defeat', n: 3, reward: { coins: 100, txp: 30 } },
  { id: 'q3', type: 'team', n: 3, reward: { potion: 3, txp: 40 } },
  { id: 'q4', type: 'tamers', isle: 'sunny', reward: { coins: 200, txp: 60 } },
  { id: 'q5', type: 'guardian', target: 'g_fern', reward: { coins: 300, nova: 2, egg_star: 1, txp: 100 } },
  { id: 'q5a', type: 'hatch', n: 1, side: 1, reward: { coins: 150, candy: 1, txp: 60 } },
  { id: 'q5b', type: 'arena', n: 1, side: 1, reward: { candy: 1, egg_water: 1, txp: 60 } },
  { id: 'q6', type: 'visit', isle: 'coral', reward: { coins: 120, txp: 40 } },
  { id: 'q7', type: 'catch', n: 2, el: 'water', side: 1, reward: { orb: 6, txp: 60 } },
  { id: 'q8', type: 'level', n: 12, side: 1, reward: { ether: 2, txp: 60 } },
  { id: 'q9', type: 'tamers', isle: 'coral', reward: { coins: 300, txp: 80 } },
  { id: 'q10', type: 'guardian', target: 'g_marina', reward: { coins: 300, revive: 2, txp: 150 } },
  { id: 'q10b', type: 'league', n: 1, side: 1, reward: { candy: 1, egg_star: 1, txp: 150 } },
  { id: 'q10a', type: 'train', n: 1, side: 1, reward: { candy: 1, egg_earth: 1, txp: 80 } },
  { id: 'q11', type: 'visit', isle: 'ember', reward: { coins: 150, txp: 60 } },
  { id: 'q12', type: 'stage', n: 2, side: 1, reward: { superpotion: 2, txp: 80 } },
  { id: 'q13', type: 'catch', n: 2, el: 'fire', side: 1, reward: { nova: 2, txp: 80 } },
  { id: 'q14', type: 'tamers', isle: 'ember', reward: { coins: 400, txp: 100 } },
  { id: 'q15', type: 'guardian', target: 'g_blaze', reward: { coins: 400, candy: 1, txp: 200 } },
  { id: 'q15a', type: 'league', n: 2, side: 1, reward: { candy: 1, egg_star: 1, txp: 150 } },
  { id: 'q16', type: 'visit', isle: 'frost', reward: { coins: 200, txp: 80 } },
  { id: 'q17', type: 'codex', n: 14, side: 1, reward: { nova: 3, txp: 100 } },
  { id: 'q18', type: 'battle', n: 5, el: 'air', side: 1, reward: { coins: 400, txp: 100 } },
  { id: 'q19', type: 'tamers', isle: 'frost', reward: { coins: 500, txp: 120 } },
  { id: 'q20', type: 'guardian', target: 'g_yuki', reward: { coins: 500, revive: 3, txp: 250 } },
  { id: 'q20b', type: 'league', n: 3, side: 1, reward: { candy: 2, egg_star: 1, txp: 200 } },
  { id: 'q20a', type: 'medal', n: 12, side: 1, reward: { candy: 1, egg_air: 1, txp: 200 } },
  { id: 'q21', type: 'visit', isle: 'storm', reward: { coins: 250, txp: 100 } },
  { id: 'q22', type: 'level', n: 30, side: 1, reward: { superpotion: 3, txp: 120 } },
  { id: 'q23', type: 'catch', n: 3, el: 'earth', side: 1, reward: { nova: 3, txp: 120 } },
  { id: 'q24', type: 'tamers', isle: 'storm', reward: { coins: 600, txp: 150 } },
  { id: 'q25', type: 'guardian', target: 'g_volt', reward: { coins: 600, candy: 1, txp: 300 } },
  { id: 'q25a', type: 'league', n: 4, side: 1, reward: { galaxy: 1, egg_star: 1, txp: 250 } },
  { id: 'q26', type: 'visit', isle: 'eclipse', reward: { coins: 300, txp: 120 } },
  { id: 'q27', type: 'codex', n: 24, side: 1, reward: { galaxy: 1, txp: 150 } },
  { id: 'q28', type: 'tamers', isle: 'eclipse', reward: { coins: 800, txp: 200 } },
  { id: 'q29', type: 'guardian', target: 'g_umbra', reward: { coins: 1500, galaxy: 1, txp: 500 } },
  { id: 'q30', type: 'legend', n: 1, reward: { candy: 2, txp: 300 } },
  { id: 'q31', type: 'codex', n: 36, reward: { candy: 2, egg_star: 1, txp: 400 } },
  { id: 'q32', type: 'legend', n: 12, reward: { galaxy: 3, egg_star: 2, txp: 1000 } },
  { id: 'q33', type: 'league', n: 5, reward: { candy: 3, egg_star: 2, txp: 800 } },
];
const QUEST_BY_ID = Object.fromEntries(MAIN_QUESTS.map(q => [q.id, q]));
/** the 2.6 chain order (saves store an index; 2.7 re-slotted the arena leagues) */
const V2_QUEST_ORDER = ['q1', 'q2', 'q3', 'q4', 'q5', 'q5a', 'q5b', 'q6', 'q7', 'q8', 'q9', 'q10', 'q10a', 'q11', 'q12', 'q13', 'q14', 'q15', 'q15a', 'q16', 'q17', 'q18', 'q19', 'q20', 'q20a', 'q21', 'q22', 'q23', 'q24', 'q25', 'q25a', 'q26', 'q27', 'q28', 'q29', 'q30', 'q31', 'q32', 'q33'];

/* Daily quest templates (3 picked per day) */
const DAILY_TEMPLATES = [
  { type: 'catch', n: 3, reward: { coins: 150 } },
  { type: 'defeat', n: 6, reward: { orb: 4 } },
  { type: 'win', n: 4, reward: { potion: 2 } },
  { type: 'catch', n: 1, el: '*', reward: { nova: 1 } },
  { type: 'defeat', n: 3, el: '*', reward: { coins: 200 } },
  { type: 'tamerwin', n: 1, reward: { nova: 2 } },
  { type: 'spin', n: 1, reward: { coins: 80 }, req: 'wheel' },
  { type: 'shards', n: 5, reward: { coins: 120 } },
  { type: 'arena', n: 2, reward: { candy: 1 }, req: 'arena' },
  { type: 'pet', n: 3, reward: { coins: 120 }, req: 'base' },
  { type: 'harvest', n: 4, reward: { orb: 3 }, req: 'work' },
];

/* Zodiac Observatory (post-game): each sign's legend requires owning a Lv30+ Orbling of that sign (Lv20+ for the Ascendant sign). */
const LEGEND_LV = 45;
/** a zone's rare target: of the Orblings that actually walk there (a first stage far past its evolution level shows
 *  up evolved, see Game.wildForm) the highest stage, and the scarcest of those — shown on the map card and the banner */
function zoneRare(zid) {
  const z = ZONES[zid];
  if (!z || !z.spawns || !z.spawns.length) return null;
  const share = {}, n = z.lv[1] - z.lv[0] + 1;
  for (const [sp, w] of z.spawns) for (let lv = z.lv[0]; lv <= z.lv[1]; lv++) { const id = Game.wildForm(sp, lv)[0]; share[id] = (share[id] || 0) + w / n; }
  let best = null;
  for (const id in share) {
    const st = SPECIES[id].stage;
    if (!best || st > best[1] || (st === best[1] && share[id] < best[2])) best = [id, st, share[id]];
  }
  return best[0];
}
