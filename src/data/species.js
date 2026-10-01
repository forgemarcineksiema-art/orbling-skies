'use strict';
/* Orbling species. 12 zodiac lines (3 stages each) + 12 legendary Zodiac Orblings.
 * Stats are derived from the line's stat weights and the stage total. Learnsets are generated
 * from the element kit + sign kit (see buildLearnset). Art params feed MonArt (procedural SVG). */

const LINES = {
  //            hp   atk  star def  spd
  aries:       { w: [1.0, 1.3, 0.8, 0.95, 0.95], ids: ['fluffire', 'blazeram', 'ignaram'], evo: [14, 30], legend: 'chrysaries' },
  leo:         { w: [1.0, 1.15, 1.05, 0.9, 0.9], ids: ['sunkit', 'pridefang', 'solmane'], evo: [14, 30], legend: 'regulion' },
  sagittarius: { w: [0.9, 0.9, 1.2, 0.85, 1.15], ids: ['cinderfawn', 'emberstag', 'meteorhorn'], evo: [15, 31], legend: 'sagittaris' },
  taurus:      { w: [1.3, 1.1, 0.7, 1.2, 0.7], ids: ['mossmoo', 'bouldox', 'gaiaurus'], evo: [14, 30], legend: 'terrataur' },
  virgo:       { w: [1.05, 0.7, 1.25, 1.0, 1.0], ids: ['budlet', 'petalina', 'floravelle'], evo: [13, 29], legend: 'spicaria' },
  capricorn:   { w: [1.1, 1.2, 0.75, 1.15, 0.8], ids: ['goatlet', 'cragoat', 'peakhorn'], evo: [15, 31], legend: 'aegoros' },
  gemini:      { w: [0.9, 1.1, 1.05, 0.85, 1.1], ids: ['zapsy', 'twinbolt', 'geminova'], evo: [14, 30], legend: 'castorlux' },
  libra:       { w: [0.95, 1.05, 1.0, 0.95, 1.05], ids: ['breezle', 'gustwing', 'libratross'], evo: [13, 29], legend: 'equinyx' },
  aquarius:    { w: [0.95, 0.75, 1.3, 0.95, 1.05], ids: ['nimbub', 'nimbolt', 'tempestar'], evo: [15, 31], legend: 'sadalmir' },
  cancer:      { w: [1.05, 1.15, 0.8, 1.3, 0.7], ids: ['clawby', 'shellsnap', 'moontide'], evo: [14, 30], legend: 'lunacrest' },
  scorpio:     { w: [1.0, 1.2, 0.95, 1.0, 0.85], ids: ['stingle', 'venomire', 'abyssting'], evo: [14, 30], legend: 'antarex' },
  pisces:      { w: [1.0, 0.8, 1.2, 0.9, 1.1], ids: ['finnip', 'koiwhirl', 'pisceidon'], evo: [14, 30], legend: 'alreshia' },
};

const STAGE_TOTAL = [0, 270, 360, 450, 520];
const STAGE_RATE = [0, 0.55, 0.32, 0.16, 0.05];
const STAGE_XP = [0, 55, 95, 150, 240];
const STAGE_SIZE = [0, 0.8, 0.93, 1.05, 1.16];
/* rarity (2.9) follows the stage — a first form is common, the next ones rarer, the legends one of a kind. It is shown on
 * the battle plate, on the catch orb, in the Codex and on the cards, and it is what makes an Orbling harder to catch. */
const RARITY = ['', 'common', 'rare', 'epic', 'legend'];
const RARITY_COL = { common: '#8fd46b', rare: '#4fb0ff', epic: '#c98bff', legend: '#ffc93c' };
/* stardust (per zodiac line) from duplicate catches and releases; it raises an Orbling's potential */
const DUST_FOR = [0, 3, 5, 8, 0];
const DUST_BOOST = 10;

const SPECIES_DEF = [
  // ---------------- FIRE ----------------
  ['fluffire', 'aries', 1, { body: 'quad', c1: '#ff7a5c', c2: '#fff3e3', c3: '#ffb13b', wool: 'wool', eyes: 'cute', mouth: 'smile', ears: 'droop', horns: 'nub', crest: 'wool', tail: 'fluff', hoof: 1, cheeks: 1 }],
  ['blazeram', 'aries', 2, { body: 'quad', c1: '#f0603f', c2: '#ffe8d2', c3: '#ffb13b', wool: 'wool', eyes: 'fierce', mouth: 'smile', ears: 'droop', horns: 'ram', crest: 'flame', tail: 'flame', hoof: 1 }],
  ['ignaram', 'aries', 3, { body: 'biped', bulky: 1, c1: '#d9452e', c2: '#ffcf8a', c3: '#ffd03b', hoof: 1, hands: 'hoof', eyes: 'fierce', mouth: 'fang', ears: 'droop', horns: 'ram', hornK: 1.2, mantle: 'flame', crest: 'flame', tail: 'flame' }],

  ['sunkit', 'leo', 1, { body: 'quad', c1: '#ffc233', c2: '#fff3cf', c3: '#ff7a2b', eyes: 'cute', mouth: 'cat', ears: 'cat', crest: 'tuft', tail: 'flametuft', cheeks: 1, paws: 1 }],
  ['pridefang', 'leo', 2, { body: 'quad', c1: '#ffb420', c2: '#fff0c4', c3: '#ff6a2b', eyes: 'fierce', mouth: 'fang', ears: 'cat', crest: 'flamemane', tail: 'flametuft', paws: 1 }],
  ['solmane', 'leo', 3, { body: 'quad', pose: 'proud', bulky: 1, c1: '#ffa81c', c2: '#fff0c4', c3: '#ff531f', eyes: 'fierce', mouth: 'fangs', ears: 'cat', crest: ['sunrays', 'flamemane'], tail: 'flametuft', paws: 1, fit: [1, 0, 0.97] }],

  ['cinderfawn', 'sagittarius', 1, { body: 'quad', c1: '#ff8f5a', c2: '#fff0e0', c3: '#ffd23f', eyes: 'cute', mouth: 'smile', ears: 'deer', horns: 'nub', pattern: 'spots', tail: 'short', hoof: 1, cheeks: 1, slim: 1 }],
  ['emberstag', 'sagittarius', 2, { body: 'quad', c1: '#f5773f', c2: '#ffe7d1', c3: '#ffcf3b', eyes: 'wise', mouth: 'smile', ears: 'deer', horns: 'antler', flameTips: 1, pattern: 'spots', tail: 'short', hoof: 1, slim: 1 }],
  ['meteorhorn', 'sagittarius', 3, { body: 'quad', pose: 'rear', slim: 1, c1: '#e8602f', c2: '#ffe0c2', c3: '#ffe066', eyes: 'fierce', mouth: 'smile', ears: 'deer', horns: 'antler', hornK: 1.08, flameTips: 1, tail: 'comet', hoof: 1, fit: [22, 0] }],

  // ---------------- EARTH ----------------
  ['mossmoo', 'taurus', 1, { body: 'quad', c1: '#b8834f', c2: '#f6e3c3', c3: '#7cc85a', eyes: 'cute', mouth: 'smile', ears: 'droop', horns: 'nub', crest: 'sprout', muzzle: 1, pattern: 'spots', tail: 'tuft', hoof: 1, cheeks: 1 }],
  ['bouldox', 'taurus', 2, { body: 'quad', c1: '#9a6a3f', c2: '#f0d8b0', c3: '#6fb84e', hornC: '#f3e6c8', eyes: 'fierce', mouth: 'smile', ears: 'droop', horns: 'bull', muzzle: 1, pattern: 'plates', tail: 'tuft', hoof: 1, bulky: 1 }],
  ['gaiaurus', 'taurus', 3, { body: 'quad', pose: 'titan', bulky: 1, c1: '#7d5634', c2: '#e8cfa6', c3: '#5fb043', hornC: '#fff1d6', eyes: 'fierce', mouth: 'smile', ears: 'droop', horns: 'bull', muzzle: 1, pattern: 'mountain', tail: 'tuft', hoof: 1, fit: [8, 0, 0.9] }],

  ['budlet', 'virgo', 1, { body: 'egg', c1: '#8fe07b', c2: '#f4ffe6', c3: '#ff8fc2', eyes: 'cute', mouth: 'smile', crest: 'bud', arms: 'leaf', cheeks: 1 }],
  ['petalina', 'virgo', 2, { body: 'egg', c1: '#7fd66e', c2: '#f4ffe6', c3: '#ff86bd', eyes: 'cute', mouth: 'smile', crest: 'flower', wings: 'fairy', arms: 'leaf', skirt: 'petal', cheeks: 1 }],
  ['floravelle', 'virgo', 3, { body: 'biped', slim: 1, dress: 1, fur: false, c1: '#6cc95e', c2: '#effbe0', c3: '#ff7ab6', patC: '#ffb3d6', hands: 'leaf', eyes: 'wise', mouth: 'smile', crest: 'flowercrown', wings: 'leaf' }],

  ['goatlet', 'capricorn', 1, { body: 'quad', c1: '#b9b2cc', c2: '#f4f1fb', c3: '#5ccfb0', hornC: '#8f86ad', eyes: 'cute', mouth: 'smile', ears: 'droop', horns: 'goat', beard: 1, tail: 'short', hoof: 1, cheeks: 1 }],
  ['cragoat', 'capricorn', 2, { body: 'quad', c1: '#a49cbd', c2: '#eeeaf7', c3: '#4fc4a6', hornC: '#6f678f', eyes: 'fierce', mouth: 'smile', ears: 'droop', horns: 'goat', beard: 1, pattern: 'plates', tail: 'short', hoof: 1 }],
  ['peakhorn', 'capricorn', 3, { body: 'quad', pose: 'proud', islet: 1, c1: '#8f86ad', c2: '#ebe7f5', c3: '#48d6b8', hornC: '#48d6b8', eyes: 'fierce', mouth: 'smile', ears: 'droop', horns: 'goat', hornK: 1.3, crest: 'spikes', beard: 1, tail: 'short', hoof: 1, fit: [0, -10, 0.92] }],

  // ---------------- AIR ----------------
  ['zapsy', 'gemini', 1, { body: 'round', c1: '#b59cff', c2: '#fff5c2', c3: '#ffd23f', patC: '#62d6ff', pattern: 'split', eyes: 'cute', mouth: 'cat', ears: 'antenna', tail: 'bolt', arms: 'nub', cheeks: 1 }],
  ['twinbolt', 'gemini', 2, { body: 'egg', c1: '#a78bff', c2: '#fff5c2', c3: '#ffd23f', patC: '#4fd0ff', pattern: 'split', eyes: 'fierce', mouth: 'fang', ears: 'antenna', crest: 'bolt', tail: 'bolt', arms: 'nub' }],
  ['geminova', 'gemini', 3, { body: 'biped', fur: false, c1: '#9d7cff', c2: '#fff5c2', c3: '#ffd23f', patC: '#3fc8ff', pattern: 'split', hornC: '#ffe066', hands: 'claw', eyes: 'fierce', mouth: 'fang', ears: 'antenna', horns: 'crystal', wings: 'bat', tail: 'bolt' }],

  ['breezle', 'libra', 1, { body: 'bird', c1: '#7fe3d0', c2: '#ffffff', c3: '#ffc93c', eyes: 'cute', mouth: 'beak', crest: 'plume', tail: 'feather', wings: 'feather', cheeks: 1 }],
  ['gustwing', 'libra', 2, { body: 'bird', c1: '#55d2bd', c2: '#f4fffc', c3: '#ffc93c', eyes: 'fierce', mouth: 'beak', crest: 'plume', tail: 'feather', wings: 'feather' }],
  ['libratross', 'libra', 3, { body: 'bird', pose: 'fly', scales: 1, wingK: 1.45, c1: '#35bfae', c2: '#f0fffb', c3: '#ffd24a', eyes: 'wise', mouth: 'beak', crest: ['plume', 'halo'], tail: 'feather', wings: 'feather', fit: [0, 2] }],

  ['nimbub', 'aquarius', 1, { body: 'cloud', c1: '#e3f1ff', c2: '#ffffff', c3: '#58b7ff', eyes: 'cute', mouth: 'smile', crest: 'drop', arms: 'nub', tail: 'cloud', cheeks: 1 }],
  ['nimbolt', 'aquarius', 2, { body: 'cloud', c1: '#a3b8dc', c2: '#e2ebf8', c3: '#ffe04d', eyes: 'fierce', mouth: 'grin', crest: 'bolt', arms: 'nub', tail: 'cloud' }],
  ['tempestar', 'aquarius', 3, { body: 'serpent', c1: '#6f8fd8', c2: '#e6eeff', c3: '#ffe04d', eyes: 'fierce', mouth: 'fang', crest: 'cloud', ears: 'fin', tail: 'bolt', whiskers: 1 }],

  // ---------------- WATER ----------------
  ['clawby', 'cancer', 1, { body: 'crab', c1: '#5ec2ff', c2: '#e1f5ff', c3: '#ff8a6b', eyes: 'cute', mouth: 'smile', cheeks: 1 }],
  ['shellsnap', 'cancer', 2, { body: 'crab', c1: '#3aa6f0', c2: '#d6efff', c3: '#ff7a5a', eyes: 'fierce', mouth: 'fang', pattern: 'shell', crest: 'spikes' }],
  ['moontide', 'cancer', 3, { body: 'crab', c1: '#2f86d8', c2: '#d0e8ff', c3: '#ff6b4a', eyes: 'fierce', mouth: 'fangs', pattern: 'shell', shell: 'moon', bigClaw: 1 }],

  ['stingle', 'scorpio', 1, { body: 'scorp', c1: '#7c6cff', c2: '#d9d3ff', c3: '#ff5fa2', eyes: 'cute', mouth: 'fang', cheeks: 1 }],
  ['venomire', 'scorpio', 2, { body: 'scorp', c1: '#6a55f0', c2: '#cfc6ff', c3: '#ff4f97', eyes: 'fierce', mouth: 'fang', crest: 'spikes' }],
  ['abyssting', 'scorpio', 3, { body: 'biped', fur: false, c1: '#4b3bc9', c2: '#bdb2ff', c3: '#ff3f8a', patC: '#6ff0ff', pattern: 'glow', hands: 'pincer', clawK: 1.1, stinger: 1, eyes: 'fierce', mouth: 'fangs', crest: 'spikes' }],

  ['finnip', 'pisces', 1, { body: 'fish', c1: '#ff9ec7', c2: '#fff0f6', c3: '#6fd6ff', eyes: 'cute', mouth: 'smile', ears: 'gills', cheeks: 1 }],
  ['koiwhirl', 'pisces', 2, { body: 'fish', c1: '#ff8cc0', c2: '#fff0f6', c3: '#58c8ff', patC: '#fff4fa', pattern: 'spots', eyes: 'cute', mouth: 'smile', ears: 'gills', whiskers: 1 }],
  ['pisceidon', 'pisces', 3, { body: 'serpent', c1: '#ff78b4', c2: '#ffe6f2', c3: '#4fc0ff', eyes: 'fierce', mouth: 'fang', crest: 'fin', ears: 'gills', tail: 'fin', whiskers: 1 }],

  // ---------------- LEGENDARY ZODIAC ORBLINGS ----------------
  ['chrysaries', 'aries', 4, { body: 'quad', pose: 'fly', c1: '#ffcf4a', c2: '#fff6cf', c3: '#ff8a3d', hornC: '#ff9a3d', wool: 'wool', eyes: 'fierce', mouth: 'smile', ears: 'droop', horns: 'ram', wings: 'feather', wingC: '#fff6d8', tail: 'fluff', hoof: 1, aura: '#ffd24a', fit: [8, 8, 0.94] }, 'stellar_ram'],
  ['regulion', 'leo', 4, { body: 'quad', pose: 'proud', bulky: 1, c1: '#fff0b8', c2: '#fffaf0', c3: '#ff9f1c', eyes: 'fierce', mouth: 'fangs', ears: 'cat', crest: ['sunrays', 'flamemane', 'crown'], wings: 'feather', wingC: '#fff3c8', tail: 'flametuft', paws: 1, aura: '#ffb52e', fit: [1, 0, 0.97] }, 'solar_roar'],
  ['sagittaris', 'sagittarius', 4, { body: 'centaur', slim: 1, c1: '#ff7a45', c2: '#fff0e0', c3: '#ffe066', eyes: 'fierce', mouth: 'smile', ears: 'deer', horns: 'antler', flameTips: 1, tail: 'comet', hoof: 1, aura: '#ff9a5a' }, 'meteor_arrow'],
  ['terrataur', 'taurus', 4, { body: 'biped', bulky: 1, c1: '#6f9a4a', c2: '#eadcb8', c3: '#5fb043', hornC: '#ffd76a', hoof: 1, hands: 'hoof', eyes: 'fierce', mouth: 'smile', ears: 'droop', horns: 'bull', muzzle: 1, mantle: 'moss', tail: 'tuft', aura: '#8fd46a' }, 'stampede'],
  ['spicaria', 'virgo', 4, { body: 'biped', slim: 1, dress: 1, float: 1, fur: false, c1: '#c8f5a0', c2: '#fffbe8', c3: '#ffc93c', patC: '#fff3b0', wingC: '#9fe07f', hands: 'leaf', eyes: 'wise', mouth: 'smile', crest: ['flowercrown', 'halo'], wings: 'leaf', wingK: 1.35, aura: '#c4f7a6' }, 'harvest_bloom'],
  ['aegoros', 'capricorn', 4, { body: 'seagoat', c1: '#9c8fc4', c2: '#efeaff', c3: '#4fd1b0', hornC: '#4fd1b0', eyes: 'fierce', mouth: 'smile', ears: 'droop', horns: 'goat', beard: 1, aura: '#7fe3d0' }, 'summit_crash'],
  ['castorlux', 'gemini', 4, { body: 'twin', c1: '#ffe27a', c2: '#fffbe6', c3: '#ffffff', patC: '#c9d4ff', eyes: 'cute', mouth: 'smile', ears: 'antenna', aura: '#fff0a0' }, 'twin_tempest'],
  ['equinyx', 'libra', 4, { body: 'bird', pose: 'fly', wingK: 1.6, duo: '#3b2e8f', wingC: '#fff1b8', c1: '#8ff0e0', c2: '#ffffff', c3: '#ffd24a', eyes: 'wise', mouth: 'beak', crest: ['plume', 'halo'], tail: 'feather', wings: 'feather', aura: '#9ff7e8', disc: 1, fit: [0, 11] }, 'equinox'],
  ['sadalmir', 'aquarius', 4, { body: 'genie', c1: '#bfe6ff', c2: '#ffffff', c3: '#58b7ff', eyes: 'wise', mouth: 'smile', crest: ['cloud', 'halo'], aura: '#9fdcff' }, 'starfall_surge'],
  ['lunacrest', 'cancer', 4, { body: 'crab', c1: '#aebdff', c2: '#eef1ff', c3: '#dfe5ff', eyes: 'wise', mouth: 'smile', pattern: 'shell', crest: 'moon', shell: 'fullmoon', float: 1, aura: '#cfd8ff' }, 'moon_tide'],
  ['antarex', 'scorpio', 4, { body: 'scorp', float: 1, wings: 'bat', wingK: 1.8, c1: '#5b3fd6', c2: '#c9bcff', c3: '#ff4d6d', patC: '#ff4d6d', pattern: 'glow', eyes: 'fierce', mouth: 'fangs', crest: 'spikes', clawK: 1.3, aura: '#ff5d7a', fit: [10, -8, 0.92] }, 'night_sting'],
  ['alreshia', 'pisces', 4, { body: 'twinfish', c1: '#ffc0e0', c2: '#fff4fa', c3: '#7fe0ff', patC: '#fff4c8', aura: '#ffc8ec' }, 'dream_current'],
];

/* ---- learnset kits ---- */
const EL_KIT = {
  fire:  { a: 'ember', b: 'flame_dash', s: 'wisp_burn', buff: 'heat_up', m2: 'fireball', m3: 'blaze_wave', m4: 'inferno' },
  water: { a: 'bubble', b: 'aqua_jet', s: 'frost_shard', buff: 'soothing_rain', m2: 'water_blast', m3: 'tidal_wave', m4: 'blizzard' },
  earth: { a: 'pebble_toss', b: 'vine_whip', s: 'sleep_spores', buff: 'barkskin', m2: 'rock_slide', m3: 'leaf_storm', m4: 'earthquake' },
  air:   { a: 'gust', b: 'spark', s: 'static_field', buff: 'tailwind', m2: 'air_slash', m3: 'thunderbolt', m4: 'tempest' },
};
// d (Lv 7): a Star move of the element that beats whatever beats the sign — coverage instead of Growl / Glare (2.9)
const SIGN_KIT = {
  aries:       { p: 'ram_charge', x: 'focus', d: 'spark' },
  leo:         { p: 'bite', x: 'roar', d: 'gust', p2: 'pounce' },
  sagittarius: { p: 'arrow_shot', x: 'focus', d: 'gust', swap: 1 },
  taurus:      { p: 'horn_rush', x: 'guard_up', d: 'bubble', eb: 'mud_shot' },
  virgo:       { p: 'scratch', x: 'star_heal', d: 'bubble', swap: 1 },
  capricorn:   { p: 'horn_rush', x: 'guard_up', d: 'aqua_jet', eb: 'mud_shot' },
  gemini:      { p: 'double_hit', x: 'twin_sparks', d: 'ember', swap: 1 },
  libra:       { p: 'peck', x: 'scale_gale', d: 'ember' },
  aquarius:    { p: 'quick_dash', x: 'rain_pour', d: 'flame_dash', swap: 1 },
  cancer:      { p: 'pinch', x: 'guard_up', d: 'pebble_toss' },
  scorpio:     { p: 'venom_sting', x: 'focus', d: 'vine_whip' },
  pisces:      { p: 'quick_dash', x: 'lullaby', d: 'pebble_toss' },
};

function buildLearnset(sp) {
  const E = EL_KIT[sp.el], S = SIGN_KIT[sp.sign];
  let a = E.a, b = S.eb || E.b;
  if (S.swap) [a, b] = [b, a];
  const L = [
    [1, 'tackle'], [1, a], [4, S.p], [7, S.d], [9, b], [13, E.s], [17, E.m2], [20, S.x],
    [24, S.p2 || 'bite'], [27, E.buff], [31, E.m3], [35, 'headbutt'], [38, 'body_slam'], [41, E.m4], [47, 'mega_strike'],
  ];
  if (sp.sig) L.unshift([1, sp.sig]);
  const seen = new Set(), out = [];
  for (const [lv, m] of L) if (MOVES[m] && !seen.has(m)) { seen.add(m); out.push([lv, m]); }
  return out;
}

const SPECIES = {};
const SPECIES_ORDER = [];
(function buildSpecies() {
  for (const [id, sign, stage, art, sig] of SPECIES_DEF) {
    const line = LINES[sign];
    const w = line.w, sum = w.reduce((a, b) => a + b, 0), tot = STAGE_TOTAL[stage];
    const k = n => Math.round(tot * w[n] / sum);
    const sp = {
      id, sign, el: SIGN[sign].el, stage, legend: stage === 4, art, sig: sig || null,
      base: { hp: k(0), atk: k(1), mag: k(2), def: k(3), spd: k(4) },
      rate: STAGE_RATE[stage], xp: STAGE_XP[stage], size: STAGE_SIZE[stage], rarity: RARITY[stage],
      name: id.charAt(0).toUpperCase() + id.slice(1),
      evoTo: null, evoLv: 0, evoFrom: null,
    };
    if (stage < 4) {
      const i = line.ids.indexOf(id);
      if (i >= 0 && i < 2) { sp.evoTo = line.ids[i + 1]; sp.evoLv = line.evo[i]; }
      if (i > 0) sp.evoFrom = line.ids[i - 1];
    }
    sp.learn = buildLearnset(sp);
    SPECIES[id] = sp;
  }
  // codex order: by sign order, then stage (legendaries last)
  for (const s of SIGNS) for (const id of LINES[s.id].ids) SPECIES_ORDER.push(id);
  for (const s of SIGNS) SPECIES_ORDER.push(LINES[s.id].legend);
  SPECIES_ORDER.forEach((id, i) => { SPECIES[id].no = i + 1; });
})();

/** full evolution line for a species id */
function evoLine(id) {
  const sp = SPECIES[id];
  if (sp.legend) return [id];
  return LINES[sp.sign].ids.slice();
}
