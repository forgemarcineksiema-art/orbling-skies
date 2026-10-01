'use strict';
/* Star Arena: five leagues of hand-built challengers plus a champion each. A league opens with its number
 * of Star Sigils (Cosmic needs all six). Arena tamers are registered into TAMERS, so battles, looks and
 * names reuse the tamer code; progress is simply "who has been beaten" (Game.beaten). */

CLASS_LOOK.champion = { acc: ['cape', 'crown'], accC: '#ffd23f', top: '#ff5d6c', hair: 'spiky' };

const ARENA = [
  { id: 'bronze', sigils: 1, color: '#d9894a', lv: [8, 14], tamers: [
    ['ar_b1', 'camper', 'Milo', [['zapsy', 8], ['finnip', 8]], 200],
    ['ar_b2', 'florist', 'Pia', [['budlet', 9], ['cinderfawn', 9]], 220],
    ['ar_b3', 'hiker', 'Gus', [['goatlet', 10], ['clawby', 10], ['breezle', 10]], 240],
    ['ar_b4', 'swimmer', 'Ivo', [['stingle', 11], ['nimbub', 11], ['sunkit', 11]], 260],
    ['ar_b5', 'champion', 'Ace', [['gustwing', 13], ['petalina', 13], ['sunkit', 14]], 600, { candy: 1, egg_star: 1 },
      { acc: ['cape', 'cap'], accC: '#d9894a', top: '#ff8a3d', hair: 'spiky', hairC: '#3b2a2a', skin: '#dca47a' }],
  ] },
  { id: 'silver', sigils: 2, color: '#b8c4dc', lv: [14, 19], tamers: [
    ['ar_s1', 'scout', 'Wren', [['bouldox', 14], ['twinbolt', 14]], 350],
    ['ar_s2', 'sailor', 'Nell', [['shellsnap', 15], ['emberstag', 15], ['petalina', 15]], 370],
    ['ar_s3', 'diver', 'Otto', [['venomire', 16], ['nimbolt', 16], ['cragoat', 16]], 390],
    ['ar_s4', 'firebreather', 'Hugo', [['blazeram', 17], ['koiwhirl', 17], ['gustwing', 17]], 410],
    ['ar_s5', 'champion', 'Bree', [['pridefang', 19], ['shellsnap', 19], ['nimbolt', 19]], 900, { candy: 1, egg_star: 1 },
      { acc: ['cape', 'flower'], accC: '#9aa8c8', top: '#6a7fb8', hair: 'long', hairC: '#f2eef8', skin: '#f6c9a0' }],
  ] },
  { id: 'gold', sigils: 3, color: '#ffc21a', lv: [20, 25], tamers: [
    ['ar_g1', 'pilot', 'Jin', [['gustwing', 20], ['bouldox', 20], ['emberstag', 20]], 500],
    ['ar_g2', 'mystic', 'Noor', [['petalina', 21], ['venomire', 21], ['twinbolt', 21]], 520],
    ['ar_g3', 'skier', 'Sanna', [['koiwhirl', 22], ['cragoat', 22], ['blazeram', 22]], 540],
    ['ar_g4', 'knight', 'Rolf', [['pridefang', 23], ['nimbolt', 23], ['shellsnap', 23]], 560],
    ['ar_g5', 'champion', 'Dara', [['petalina', 25], ['emberstag', 25], ['twinbolt', 25]], 1200, { candy: 2, egg_star: 1 },
      { acc: ['cape', 'crown'], accC: '#ffb21a', top: '#e8a21a', hair: 'bun', hairC: '#7a4a2a', skin: '#8a5a3c' }],
  ] },
  { id: 'platinum', sigils: 4, color: '#8fe3e0', lv: [26, 31], tamers: [
    ['ar_p1', 'scientist', 'Eli', [['gustwing', 26], ['shellsnap', 26], ['bouldox', 26]], 650],
    ['ar_p2', 'stormchaser', 'Tara', [['nimbolt', 27], ['blazeram', 27], ['cragoat', 27]], 680],
    ['ar_p3', 'ranger', 'Vera', [['pridefang', 28], ['venomire', 28], ['twinbolt', 28]], 710],
    ['ar_p4', 'fisher', 'Yusuf', [['koiwhirl', 29], ['emberstag', 29], ['floravelle', 29]], 740],
    ['ar_p5', 'champion', 'Lex', [['gaiaurus', 31], ['tempestar', 31], ['moontide', 31]], 1600, { candy: 2, egg_star: 1 },
      { acc: ['cape', 'glasses'], accC: '#4fd1c5', top: '#2fb0a8', hair: 'short', hairC: '#e8b04a', skin: '#ffe3cc' }],
  ] },
  { id: 'cosmic', sigils: 6, color: '#b88cff', lv: [38, 45], tamers: [
    ['ar_c1', 'mystic', 'Quinn', [['geminova', 38], ['pisceidon', 38], ['ignaram', 38]], 900],
    ['ar_c2', 'knight', 'Zane', [['peakhorn', 39], ['libratross', 39], ['abyssting', 39]], 950],
    ['ar_c3', 'stormchaser', 'Uma', [['meteorhorn', 40], ['moontide', 40], ['floravelle', 40]], 1000],
    ['ar_c4', 'firebreather', 'Cody', [['solmane', 41], ['tempestar', 41], ['gaiaurus', 41]], 1050],
    ['ar_c5', 'champion', 'Orion', [['solmane', 43], ['tempestar', 43], ['pisceidon', 43], ['gaiaurus', 44]], 2500, { candy: 3, galaxy: 1, egg_star: 2 },
      { acc: ['cape', 'crown', 'visor'], accC: '#8a4dff', top: '#2a2240', pants: '#1c1830', hair: 'long', hairC: '#b56ae8', skin: '#b57b53' }],
  ] },
];
// rematch teams: the Cosmic champion brings his legend only once you have beaten him (2.9: 7% → ~50% at Lv 48)
const ARENA_REMATCH = { ar_c5: [['regulion', 44], ['tempestar', 44], ['pisceidon', 44], ['gaiaurus', 45]] };
const ARENA_LEAGUE = {};
ARENA.forEach((L, i) => {
  L.idx = i;
  ARENA_LEAGUE[L.id] = L;
  L.ids = L.tamers.map(([id, cls, name, team, reward, champReward, look], j) => {
    TAMERS[id] = { id, cls, name, team, teamRe: ARENA_REMATCH[id] || null, reward, arena: L.id, rank: j, champ: !!champReward, champReward: champReward || null, look };
    return id;
  });
});

const Arena = {
  unlocked(L) { return Game.s.sigils.length >= L.sigils; },
  anyUnlocked() { return ARENA.some(L => this.unlocked(L)); },
  /** index of the next challenger to beat (== ids.length when the league is cleared) */
  nextIdx(L) { const i = L.ids.findIndex(id => !Game.beaten(id)); return i < 0 ? L.ids.length : i; },
  cleared(L) { return Game.beaten(L.ids[L.ids.length - 1]); },
  trophies() { return ARENA.filter(L => this.cleared(L)).length; },
  /** a league with a challenger waiting (for the galaxy-map marker) */
  hasOpenChallenge() { return ARENA.some(L => this.unlocked(L) && !this.cleared(L)); },
};
