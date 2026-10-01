'use strict';
/* Elements & Star Signs (the type system).
 * Every Orbling belongs to one of 12 zodiac Star Signs. Each sign belongs to a classical element.
 * Element cycle (x1.5 damage): Fire > Earth > Air > Water > Fire  (reverse = x0.67).
 * Each sign also grants a passive Star Trait. */

const ELEMENTS = {
  fire:  { id: 'fire',  color: '#ff6b3d', dark: '#c73e17', light: '#ffd2bd', beats: 'earth' },
  earth: { id: 'earth', color: '#5cb947', dark: '#377a26', light: '#d3f0c6', beats: 'air' },
  air:   { id: 'air',   color: '#a07cff', dark: '#6a48d6', light: '#e4dcff', beats: 'water' },
  water: { id: 'water', color: '#36a3ff', dark: '#1a6bc4', light: '#cde8ff', beats: 'fire' },
};
const EL_ORDER = ['fire', 'earth', 'air', 'water'];

function typeMult(atkEl, defEl) {
  if (!atkEl || !defEl) return 1;
  if (ELEMENTS[atkEl].beats === defEl) return 1.5;
  if (ELEMENTS[defEl].beats === atkEl) return 0.67;
  return 1;
}

/* glyph paths drawn in a 24x24 box, meant to be stroked */
const SIGNS = [
  { id: 'aries', el: 'fire', color: '#ff5d5d', trait: 'firststrike', from: 321,
    glyph: 'M4.5 10C3 6 6 3.5 8.5 4.5C11 5.5 12 9 12 12.5M19.5 10C21 6 18 3.5 15.5 4.5C13 5.5 12 9 12 12.5V20.5' },
  { id: 'taurus', el: 'earth', color: '#8bbf45', trait: 'sturdy', from: 420,
    glyph: 'M4 4C5.5 8 8.5 9.5 12 9.5C15.5 9.5 18.5 8 20 4M12 9.5A5.2 5.2 0 1 0 12.01 9.5' },
  { id: 'gemini', el: 'air', color: '#ffc02e', trait: 'twin', from: 521,
    glyph: 'M5 4.5C9.5 6 14.5 6 19 4.5M5 19.5C9.5 18 14.5 18 19 19.5M9 5.6V18.4M15 5.6V18.4' },
  { id: 'cancer', el: 'water', color: '#7fcbff', trait: 'shell', from: 621,
    glyph: 'M7 6.5C12 3.5 17 4.5 20.5 8M7 6.5A3 3 0 1 0 7.01 6.5M17 17.5C12 20.5 7 19.5 3.5 16M17 11.5A3 3 0 1 0 17.01 11.5' },
  { id: 'leo', el: 'fire', color: '#ffa726', trait: 'pride', from: 723,
    glyph: 'M8 18.5A3 3 0 1 1 8.01 18.5M10.5 15.5C8 11 8.5 4.5 13.5 4.5C18.5 4.5 18.5 10 16 13C13.5 16 14 20 18.5 19.5' },
  { id: 'virgo', el: 'earth', color: '#6fd17e', trait: 'pure', from: 823,
    glyph: 'M4 6V18M4 8.5C4 5 8.5 5 8.5 8.5V18M8.5 8.5C8.5 5 13 5 13 8.5V16.5C13 20 17.5 20.5 19 17M13 12C16 10.5 20 11.5 18.5 15.5C17.5 18 15 18.5 13.5 17.5' },
  { id: 'libra', el: 'air', color: '#5fe0cf', trait: 'balance', from: 923,
    glyph: 'M4 20H20M4 15.5H8.5C6.5 13 7 8 12 8C17 8 17.5 13 15.5 15.5H20' },
  { id: 'scorpio', el: 'water', color: '#8a6bff', trait: 'venom', from: 1023,
    glyph: 'M3.5 6V18M3.5 8.5C3.5 5 8 5 8 8.5V18M8 8.5C8 5 12.5 5 12.5 8.5V16C12.5 19 15 20 18.5 18.5M16 15.5L19 18.5L15.5 20.5' },
  { id: 'sagittarius', el: 'fire', color: '#ff7b47', trait: 'marksman', from: 1122,
    glyph: 'M4.5 19.5L19.5 4.5M11 4.5H19.5V13M6.5 11.5L12.5 17.5' },
  { id: 'capricorn', el: 'earth', color: '#b59a74', trait: 'resolve', from: 1222,
    glyph: 'M3.5 6.5C5 6.5 6 8 6.5 10L8.5 18.5L11.5 7C12 5 14 5 14 7.5V15C14 19.5 20.5 20 20.5 16C20.5 12.5 16 12 14 15' },
  { id: 'aquarius', el: 'air', color: '#6dbdff', trait: 'flow', from: 120,
    glyph: 'M3 10.5L6.5 7.5L10 10.5L13.5 7.5L17 10.5L21 7.5M3 17L6.5 14L10 17L13.5 14L17 17L21 14' },
  { id: 'pisces', el: 'water', color: '#ff8cc6', trait: 'elusive', from: 219,
    glyph: 'M6 4C10.5 8 10.5 16 6 20M18 4C13.5 8 13.5 16 18 20M5 12H19' },
];
const SIGN = Object.fromEntries(SIGNS.map((s, i) => [s.id, Object.assign(s, { idx: i })]));

/* the twelve constellations, simplified from the real star patterns (x right, y down, in a -1..1 box): stars p in
 * drawing order, lines l as index pairs, the brightest stars in big. A caught Orbling's constellation draws itself
 * in the sky over the orb. */
const SIGN_STARS = {
  aries: { p: [[-0.95, -0.4], [-0.05, -0.08], [0.52, 0.22], [0.66, 0.5]], l: [[0, 1], [1, 2], [2, 3]], big: [1] },
  taurus: { p: [[0.4, 0.45], [0.02, 0.12], [-0.9, -0.32], [0.3, 0.05], [-0.38, -0.8], [0.75, 0.72], [0.95, -0.15]], l: [[0, 1], [1, 2], [0, 3], [3, 4], [0, 5]], big: [1] },
  gemini: { p: [[-0.38, -0.88], [0.22, -0.82], [-0.5, -0.12], [0.12, -0.08], [-0.72, 0.82], [0.06, 0.86], [-0.98, 0.5], [0.55, 0.6]], l: [[0, 2], [2, 4], [1, 3], [3, 5], [2, 3], [2, 6], [3, 7]], big: [0, 1] },
  cancer: { p: [[0.05, -0.88], [-0.05, -0.28], [0.06, 0.12], [-0.58, 0.82], [0.66, 0.66]], l: [[0, 1], [1, 2], [2, 3], [2, 4]], big: [4] },
  leo: { p: [[-0.45, 0.48], [-0.42, 0.08], [-0.3, -0.3], [-0.42, -0.62], [-0.68, -0.78], [-0.9, -0.56], [0.42, -0.16], [0.95, 0.12], [0.38, 0.22]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6], [6, 7], [7, 8], [8, 0]], big: [0, 7] },
  virgo: { p: [[0.92, -0.38], [0.48, -0.26], [0.06, -0.06], [-0.18, -0.42], [-0.32, -0.88], [0.22, 0.88], [-0.3, 0.3], [-0.82, 0.42]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [2, 6], [6, 7]], big: [5] },
  libra: { p: [[0.08, -0.85], [-0.62, -0.08], [0.58, 0.05], [-0.56, 0.82], [0.62, 0.78]], l: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4]], big: [0, 1] },
  scorpio: { p: [[0.74, -0.88], [0.86, -0.52], [0.8, -0.16], [0.52, -0.42], [0.3, -0.2], [0.2, 0.1], [0.1, 0.42], [-0.05, 0.72], [-0.36, 0.86], [-0.66, 0.72], [-0.86, 0.42], [-0.76, 0.12], [-0.5, 0.02]],
    l: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12]], big: [4] },
  sagittarius: { p: [[-0.78, 0.12], [-0.22, 0.1], [-0.32, 0.58], [-0.1, -0.38], [0.18, 0.02], [0.58, -0.12], [0.6, 0.46], [0.26, 0.56]],
    l: [[0, 1], [0, 2], [1, 2], [1, 3], [3, 4], [1, 4], [4, 5], [5, 6], [6, 7], [7, 2], [4, 7]], big: [2, 5] },
  capricorn: { p: [[-0.9, -0.52], [-0.78, -0.18], [-0.44, 0.36], [-0.14, 0.62], [0.26, 0.46], [0.92, -0.3], [0.62, -0.24], [0.02, -0.3]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 1]], big: [5] },
  aquarius: { p: [[-0.92, -0.46], [-0.36, -0.3], [0.14, -0.52], [0.44, -0.34], [0.62, -0.56], [0.84, -0.4], [0.32, 0.14], [0.02, 0.46], [-0.24, 0.84], [0.58, 0.6]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [3, 6], [6, 7], [7, 8], [6, 9]], big: [1, 2] },
  pisces: { p: [[-0.95, -0.12], [-0.8, -0.34], [-0.58, -0.28], [-0.54, 0], [-0.76, 0.1], [-0.3, 0.3], [0, 0.56], [0.16, 0.84], [0.36, 0.36], [0.5, -0.06], [0.6, -0.5], [0.82, -0.82], [0.4, -0.76]],
    l: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [3, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 10]], big: [7] },
};

/** zodiac sign for a date (the "Ascendant" sign of the month gets bonuses) */
function signOfDate(d = new Date()) {
  const v = (d.getMonth() + 1) * 100 + d.getDate();
  let best = null;
  for (const s of SIGNS) if (s.from <= v && (!best || s.from > best.from)) best = s;
  return (best || SIGN.capricorn).id;
}

const EL_ICON = {
  fire: '<path d="M12 2.2C13 6.2 18.2 8.2 18.2 14.2C18.2 18.6 15.4 21.6 12 21.6C8.6 21.6 5.8 18.6 5.8 14.6C5.8 11.2 8.3 9.6 8.9 7C10.4 8.4 10.8 10 10.5 11.6C12.6 9.6 13.1 6 12 2.2Z"/>',
  water: '<path d="M12 2.5C12 2.5 5.4 10.1 5.4 14.6C5.4 18.6 8.4 21.6 12 21.6C15.6 21.6 18.6 18.6 18.6 14.6C18.6 10.1 12 2.5 12 2.5Z"/>',
  earth: '<path d="M20.3 3.7C11.2 3.7 4.6 7.8 4.6 14.8C4.6 16.6 5.2 18.1 6.1 19.2L3.8 21.6L5.2 22.8L7.4 20.4C8.6 21.1 10 21.5 11.4 21.5C18.3 21.5 20.3 13 20.3 3.7Z"/>',
  air: '<path d="M3 8.6H13.6C16.4 8.6 17.4 5.6 15.7 4.2C14.2 3 11.8 3.9 11.9 6" fill="none" stroke-width="2.6" stroke-linecap="round"/><path d="M3 12.6H18.2C21 12.6 22 15.6 20.3 17C18.8 18.2 16.4 17.3 16.5 15.2" fill="none" stroke-width="2.6" stroke-linecap="round"/><path d="M3 16.6H10.5" fill="none" stroke-width="2.6" stroke-linecap="round"/>',
};

/* glossy painted badges for elements and star signs (cached images, used inline in UI markup) */
const BADGE_OL = '#0a121b';
function badgeSvg(color, glyph, glyphIsFill) {
  const lt = U.shade(color, 0.42), dk = U.shade(color, -0.38);
  const g = glyphIsFill
    ? `<g transform="translate(4.2 4.2) scale(.65)" fill="${BADGE_OL}" stroke="${BADGE_OL}" stroke-width="3.2" stroke-linejoin="round" transform-origin="0 0">${glyph}</g><g transform="translate(4.2 4.2) scale(.65)" fill="#fff" stroke="#fff">${glyph}</g>`
    : `<g transform="translate(4 4) scale(.667)"><path d="${glyph}" fill="none" stroke="${BADGE_OL}" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/><path d="${glyph}" fill="none" stroke="#fff" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26" width="52" height="52"><defs><radialGradient id="b" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="${lt}"/><stop offset=".55" stop-color="${color}"/><stop offset="1" stop-color="${dk}"/></radialGradient></defs>` +
    `<circle cx="12" cy="12" r="11.6" fill="url(#b)" stroke="${BADGE_OL}" stroke-width="1.5"/><circle cx="12" cy="12" r="9.9" fill="none" stroke="#fff" stroke-width=".8" opacity=".35"/>` + g +
    `<ellipse cx="8.2" cy="6.4" rx="4.4" ry="2.3" fill="#fff" opacity=".35" transform="rotate(-30 8.2 6.4)"/></svg>`;
}
/** small badge for an element (used in UI markup) */
function elIcon(el, size = 22) {
  const url = U.svgUrl('bdg:el:' + el, () => badgeSvg(ELEMENTS[el].color, EL_ICON[el], true));
  return `<img class="ico-el" src="${url}" width="${size}" height="${size}" alt="">`;
}
/** small badge for a star sign */
function signIcon(sign, size = 22) {
  const url = U.svgUrl('bdg:sg:' + sign, () => badgeSvg(SIGN[sign].color, SIGN[sign].glyph, false));
  return `<img class="ico-sign" src="${url}" width="${size}" height="${size}" alt="">`;

}
