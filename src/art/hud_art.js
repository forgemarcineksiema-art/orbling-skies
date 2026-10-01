'use strict';
/* Painted HUD art: small illustrated icons for the dark slate top-bar tiles
 * (globe, card fan, backpack, scroll, tent, gear, prize wheel), the shop stall "Kramik", the orange exit
 * arrow, a blue metal padlock and the comic "!" / "?" marks. All original shapes, cached as blob URLs. */

const HudArt = (() => {
  const OL = '#0a121b';
  const f = n => Math.round(n * 10) / 10;
  const S = (w, h, body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${defs}</defs>${body}</svg>`;
  const rg = (id, stops, cx = '38%', cy = '32%', r = '75%') => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</radialGradient>`;
  const lg = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
  /** every HUD picture goes through the Painter (fine brush), sized from its viewBox */
  const url = (k, fn) => Painter.icon('hud:' + k, fn, ...(({ kramik: [120, 110], arrow: [80, 70], pointer: [64, 76], padlock: [56, 64], next: [64, 48], swirl: [400, 400] })[k] || [64, 64]), k === 'swirl' ? { brush: false, tex: 0, light: 0, shade: 0, noInk: true, scale: 1 } : {});

  /* planet globe with continents, clouds and a thin golden orbit (Map) */
  const globe = () => url('globe', () => S(64, 64,
    `<ellipse cx="32" cy="58" rx="17" ry="3.5" fill="#000" opacity=".25"/>` +
    `<circle cx="32" cy="31" r="22" fill="url(#go)" stroke="${OL}" stroke-width="2.6"/>` +
    `<clipPath id="gc"><circle cx="32" cy="31" r="21"/></clipPath><g clip-path="url(#gc)">` +
    `<path d="M14 18c5-5 12-6 16-3 3 2 1 6-3 7-4 1-5 5-2 8 3 2 1 7-4 7-5 0-8-5-9-10s-1-7 2-9z" fill="url(#gl)"/>` +
    `<path d="M36 12c6 0 12 3 15 8 2 3-1 5-4 4s-5 1-4 4c1 4 5 5 6 9 1 5-4 9-9 9-3 0-4-3-3-6 1-4-2-6-5-7-3-2-2-6 1-8 3-2 2-6-1-8-2-2 1-5 4-5z" fill="url(#gl)"/>` +
    `<path d="M10 34c6 1 9-2 14 0M40 46c5-1 9 1 12-2M30 10c5 1 9-1 13 1" stroke="#fff" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".55"/>` +
    `<circle cx="32" cy="31" r="21" fill="url(#gs)"/></g>` +
    `<ellipse cx="24" cy="20" rx="8" ry="5" fill="#fff" opacity=".45" transform="rotate(-30 24 20)"/>` +
    `<ellipse cx="32" cy="33" rx="30" ry="8" fill="none" stroke="${OL}" stroke-width="4.4" transform="rotate(-18 32 33)" stroke-dasharray="46 30" stroke-dashoffset="-2"/>` +
    `<ellipse cx="32" cy="33" rx="30" ry="8" fill="none" stroke="url(#gr)" stroke-width="2.4" transform="rotate(-18 32 33)" stroke-dasharray="46 30" stroke-dashoffset="-2"/>` +
    `<path d="M55 17l1.6 3.4 3.7.4-2.8 2.5.8 3.7-3.3-1.9-3.3 1.9.8-3.7-2.8-2.5 3.7-.4z" fill="#ffe36a" stroke="${OL}" stroke-width="1.4" stroke-linejoin="round"/>`,
    rg('go', [[0, '#b8f0ff'], [0.45, '#3aa8e8'], [1, '#12458a']]) + lg('gl', [[0, '#a8ec6a'], [1, '#2f8a3a']]) + rg('gs', [[0.6, '#000', 0], [1, '#001030', 0.45]], '40%', '35%', '70%') + lg('gr', [[0, '#fff3a0'], [1, '#f0a818']], 1, 0)));

  /* fan of three star cards (Codex) */
  const cards = () => url('cards', () => {
    const card = (rot, c1, c2, star) => `<g transform="rotate(${rot} 32 54)"><rect x="19" y="10" width="26" height="36" rx="4" fill="url(#${c1})" stroke="${OL}" stroke-width="2.4"/><rect x="22.5" y="13.5" width="19" height="29" rx="2.5" fill="none" stroke="#fff" stroke-width="1.6" opacity=".7"/>${star ? `<path d="M32 20.5l2.6 5.3 5.8.8-4.2 4 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4 5.8-.8z" fill="${star}" stroke="${OL}" stroke-width="1.3" stroke-linejoin="round"/>` : ''}</g>`;
    return S(64, 64, `<ellipse cx="32" cy="58" rx="20" ry="3.5" fill="#000" opacity=".25"/>` + card(-24, 'c1', 0, '#bfe6ff') + card(0, 'c2', 0, '#fff3a0') + card(22, 'c3', 0, '#ffe0f6') +
      `<ellipse cx="42" cy="18" rx="3" ry="6" fill="#fff" opacity=".35" transform="rotate(22 42 18)"/>`,
      lg('c1', [[0, '#5aa8ff'], [1, '#1f4fb0']]) + lg('c2', [[0, '#ffc24a'], [1, '#e8701a']]) + lg('c3', [[0, '#f27ae0'], [1, '#a82aa0']]));
  });

  /* red backpack with a flap, buckle and straps (Bag) */
  const bag = () => url('bag', () => S(64, 64,
    `<ellipse cx="32" cy="58" rx="18" ry="3.5" fill="#000" opacity=".25"/>` +
    `<path d="M22 16c0-6 4-9 10-9s10 3 10 9" fill="none" stroke="${OL}" stroke-width="6" stroke-linecap="round"/><path d="M22 16c0-6 4-9 10-9s10 3 10 9" fill="none" stroke="#8a2a1e" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M13 30c0-9 8-15 19-15s19 6 19 15v17c0 5-4 8-9 8H22c-5 0-9-3-9-8z" fill="url(#bb)" stroke="${OL}" stroke-width="2.6"/>` +
    `<path d="M17 45h30v4c0 2-2 3-4 3H21c-2 0-4-1-4-3z" fill="#b82a1c" opacity=".55"/>` +
    `<path d="M15 29c0-8 7-12 17-12s17 4 17 12c0 4-3 6-7 6H22c-4 0-7-2-7-6z" fill="url(#bf)" stroke="${OL}" stroke-width="2.4"/>` +
    `<rect x="27" y="30" width="10" height="9" rx="2" fill="#ffd23f" stroke="${OL}" stroke-width="2"/><rect x="30" y="32.5" width="4" height="4" rx="1" fill="#b87a0a"/>` +
    `<path d="M20 22c3-3 7-4 11-4" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".6"/>` +
    `<path d="M11 36c-2 4-2 9 1 12M53 36c2 4 2 9-1 12" stroke="${OL}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    lg('bb', [[0, '#ff6a52'], [1, '#b8261a']]) + lg('bf', [[0, '#ff8a70'], [1, '#d8402e']])));

  /* rolled parchment with a wax seal (Quests) */
  const scroll = () => url('scroll', () => S(64, 64,
    `<ellipse cx="32" cy="58" rx="20" ry="3.5" fill="#000" opacity=".25"/>` +
    `<path d="M16 12h32v36c0 4-3 7-7 7H16z" fill="url(#sp)" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<path d="M21 20h22M21 26h22M21 32h16M21 38h19" stroke="#b08a50" stroke-width="2.2" stroke-linecap="round"/>` +
    `<rect x="11" y="7" width="10" height="46" rx="5" fill="url(#sr)" stroke="${OL}" stroke-width="2.4"/><ellipse cx="16" cy="8.5" rx="4.2" ry="2" fill="#fff4d8" stroke="${OL}" stroke-width="1.6"/>` +
    `<rect x="43" y="46" width="12" height="11" rx="5" fill="url(#sr)" stroke="${OL}" stroke-width="2.4"/>` +
    `<circle cx="42" cy="44" r="7.5" fill="url(#sw)" stroke="${OL}" stroke-width="2.2"/><path d="M42 39.8l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8-2.1-1.9 2.8-.3z" fill="#ffd0c0"/>`,
    lg('sp', [[0, '#fff6d8'], [1, '#e2c48a']], 1, 1) + lg('sr', [[0, '#f0dca8'], [1, '#b89058']], 1, 0) + rg('sw', [[0, '#ff7a6a'], [1, '#b0201a']])));

  /* striped camp tent with a pennant and warm light inside (Camp) */
  const tent = () => url('tent', () => S(64, 64,
    `<ellipse cx="32" cy="56" rx="24" ry="4" fill="#000" opacity=".25"/>` +
    `<path d="M32 8v8" stroke="${OL}" stroke-width="3"/><path d="M32 7l12 4-12 4z" fill="#ffd23f" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>` +
    `<path d="M32 14L8 53h48z" fill="url(#tt)" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<path d="M32 14l-8 39M32 14l8 39" stroke="#fff" stroke-width="3" opacity=".55"/>` +
    `<path d="M32 26l-9 27h18z" fill="url(#tl)" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>` +
    `<path d="M32 14L8 53" stroke="#fff" stroke-width="1.8" opacity=".5" stroke-linecap="round"/>`,
    lg('tt', [[0, '#ff9a4a'], [1, '#d0501a']]) + lg('tl', [[0, '#fff6b0'], [1, '#ffb21a']])));

  /* metal gear (Settings) */
  const gear = () => url('gear', () => {
    let teeth = '';
    for (let i = 0; i < 8; i++) { const a = i / 8 * 360; teeth += `<rect x="28" y="6" width="8" height="12" rx="2" transform="rotate(${a} 32 32)"/>`; }
    return S(64, 64, `<g fill="${OL}" stroke="${OL}" stroke-width="5" stroke-linejoin="round">${teeth}<circle cx="32" cy="32" r="19"/></g><g fill="url(#gg)">${teeth}<circle cx="32" cy="32" r="19"/></g>` +
      `<circle cx="32" cy="32" r="7.5" fill="#1a2430" stroke="${OL}" stroke-width="2.4"/><path d="M20 24a14 14 0 0 1 10-7" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none" opacity=".6"/>`,
      lg('gg', [[0, '#eef4fa'], [0.5, '#a8b8c8'], [1, '#5a6a7c']], 1, 1));
  });

  /* little prize wheel (daily spin) */
  const wheel = () => url('wheel', () => {
    const cols = ['#ff5a4a', '#ffd23f', '#5ad65a', '#3ab0ff', '#b86aff', '#ff9a2e'];
    let seg = '';
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2;
      seg += `<path d="M32 33L${f(32 + Math.cos(a0) * 21)} ${f(33 + Math.sin(a0) * 21)}A21 21 0 0 1 ${f(32 + Math.cos(a1) * 21)} ${f(33 + Math.sin(a1) * 21)}Z" fill="${cols[i]}"/>`;
    }
    return S(64, 64, `<ellipse cx="32" cy="59" rx="18" ry="3" fill="#000" opacity=".25"/><circle cx="32" cy="33" r="24" fill="url(#wr)" stroke="${OL}" stroke-width="2.6"/>${seg}` +
      `<circle cx="32" cy="33" r="21" fill="url(#ws)"/><circle cx="32" cy="33" r="21" fill="none" stroke="${OL}" stroke-width="1.6"/>` +
      `<circle cx="32" cy="33" r="6" fill="#ffe36a" stroke="${OL}" stroke-width="2"/><path d="M32 3l6 9H26z" fill="#ff4a4a" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/>`,
      lg('wr', [[0, '#fff0a0'], [1, '#d8900a']]) + rg('ws', [[0, '#fff', 0.35], [0.5, '#fff', 0], [1, '#000', 0.25]]));
  });

  /* Kramik — the shop: a little market stall floating on a cloud, striped awning, orb and potion on the counter */
  const stall = () => url('kramik', () => {
    const cloud = [[26, 93, 12], [44, 88, 15], [64, 87, 16], [84, 90, 14], [100, 95, 9], [16, 98, 8]];
    const puffs = (extra) => cloud.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + extra}"/>`).join('') + `<rect x="${14 - extra}" y="${92 - extra}" width="${92 + extra * 2}" height="${12 + extra * 2}" rx="${6 + extra}"/>`;
    let stripes = '';
    for (let i = 0; i < 7; i++) stripes += `<rect x="${8 + i * 15}" y="10" width="7.5" height="40" fill="#fff6dc"/>`;
    let scallops = '';
    for (let i = 0; i < 6; i++) scallops += `<path d="M${12 + i * 16} 40a8 8 0 0 0 16 0z" fill="${i % 2 ? '#fff6dc' : 'url(#ka)'}" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"/>`;
    return S(120, 110,
      `<ellipse cx="60" cy="106" rx="36" ry="4" fill="#000" opacity=".2"/>` +
      // the cloud: outline pass, then the fill on top so the puffs merge
      `<g fill="${OL}">${puffs(3)}</g><g fill="url(#kc)">${puffs(0)}</g>` +
      `<path d="M22 86c6-5 14-4 18 0M52 82c6-5 16-5 22 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>` +
      // poles and the dark inside of the booth
      `<rect x="28" y="36" width="64" height="28" fill="#1c3552" stroke="${OL}" stroke-width="2.6"/>` +
      `<rect x="24" y="30" width="7" height="36" rx="2" fill="url(#kp)" stroke="${OL}" stroke-width="2.4"/><rect x="89" y="30" width="7" height="36" rx="2" fill="url(#kp)" stroke="${OL}" stroke-width="2.4"/>` +
      // goods on the counter: a star orb and a pink potion
      `<circle cx="45" cy="55" r="8" fill="url(#ko)" stroke="${OL}" stroke-width="2.2"/><ellipse cx="45" cy="55" rx="11" ry="3.2" fill="none" stroke="#ffd23f" stroke-width="2" transform="rotate(-14 45 55)"/>` +
      `<path d="M72 44h6v5c4 2 6 5 6 9 0 5-4 8-9 8s-9-3-9-8c0-4 2-7 6-9z" fill="url(#kv)" stroke="${OL}" stroke-width="2.2" stroke-linejoin="round"/><rect x="71" y="41" width="8" height="4" rx="1.5" fill="#c08858" stroke="${OL}" stroke-width="1.6"/>` +
      `<path d="M58 44l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#fff6a0" stroke="${OL}" stroke-width="1.3" stroke-linejoin="round"/>` +
      // the counter with a coin sign
      `<rect x="20" y="62" width="80" height="24" rx="4" fill="url(#kw)" stroke="${OL}" stroke-width="3"/>` +
      `<path d="M24 70h72M24 78h72" stroke="#7a4a24" stroke-width="1.6" opacity=".55"/><path d="M22 64h76" stroke="#ffe0b0" stroke-width="2" opacity=".6"/>` +
      `<circle cx="60" cy="74" r="9" fill="url(#kg)" stroke="${OL}" stroke-width="2.4"/><path d="M60 68.5l1.7 3.5 3.8.5-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.7 3.8-.5z" fill="#fff3b0" stroke="#a86a08" stroke-width="1" stroke-linejoin="round"/>` +
      // the striped awning with a scalloped edge and a star on top
      `<clipPath id="kcl"><path d="M22 14h76l12 26H10z"/></clipPath>` +
      `<path d="M22 14h76l12 26H10z" fill="url(#ka)"/><g clip-path="url(#kcl)">${stripes}</g>` +
      `<path d="M22 14h76l12 26H10z" fill="none" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>` + scallops +
      `<path d="M24 18h72" stroke="#fff" stroke-width="2" opacity=".5"/>` +
      `<path d="M60 1l2.4 5 5.4.7-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.7z" fill="#ffe36a" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`,
      rg('kc', [[0, '#ffffff'], [0.6, '#e8f4ff'], [1, '#b8d4f0']], '45%', '30%') + lg('ka', [[0, '#3ad8e8'], [1, '#1488b8']]) + lg('kp', [[0, '#e0a868'], [1, '#8a5430']], 1, 0) +
      lg('kw', [[0, '#e8b070'], [0.5, '#c8844a'], [1, '#9a5a2c']]) + rg('ko', [[0, '#ffffff'], [0.4, '#8fe0ff'], [1, '#1a6ac8']]) + lg('kv', [[0, '#ffc0e8'], [1, '#e04aa8']]) +
      rg('kg', [[0, '#fff6b8'], [0.5, '#ffc93a'], [1, '#d88a0a']]));
  });

  /* the orange exit arrow (the "leave the area" arrow); dir: 1 = right, -1 = left */
  const arrow = () => url('arrow', () => S(80, 70,
    `<path d="M6 24h34V8l34 27-34 27V46H6z" fill="url(#ar)" stroke="${OL}" stroke-width="4" stroke-linejoin="round"/>` +
    `<path d="M11 29h33V19l20 16" fill="none" stroke="#fff3c0" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`,
    lg('ar', [[0, '#ffc85a'], [0.5, '#ff8a1c'], [1, '#e0560a']])));

  /* the big yellow pointer over the first wild Orbling ("this one!") */
  const pointer = () => url('pointer', () => S(64, 76,
    `<path d="M21 5h22v30h15L32 70 6 35h15z" fill="url(#pt)" stroke="${OL}" stroke-width="4" stroke-linejoin="round"/>` +
    `<path d="M26.5 10v29.5H17l12.5 17" fill="none" stroke="#fffbd8" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`,
    lg('pt', [[0, '#fff5a0'], [0.5, '#ffd21f'], [1, '#f29a0c']], 1, 0)));

  /* blue metal padlock (locked places) */
  const padlock = () => url('padlock', () => S(56, 64,
    `<path d="M16 28V20c0-7 5-12 12-12s12 5 12 12v8" fill="none" stroke="${OL}" stroke-width="9" stroke-linecap="round"/>` +
    `<path d="M16 28V20c0-7 5-12 12-12s12 5 12 12v8" fill="none" stroke="url(#pl)" stroke-width="5" stroke-linecap="round"/>` +
    `<rect x="6" y="26" width="44" height="32" rx="8" fill="url(#pb)" stroke="${OL}" stroke-width="3"/>` +
    `<rect x="10" y="29" width="36" height="8" rx="4" fill="#fff" opacity=".35"/>` +
    `<circle cx="28" cy="40" r="5" fill="${OL}"/><path d="M26 42h4l1 9h-6z" fill="${OL}"/>`,
    lg('pl', [[0, '#e8eef6'], [1, '#8a98a8']], 1, 0) + lg('pb', [[0, '#8ad0ff'], [0.5, '#3a8ee8'], [1, '#1a4ea8']])));

  /* a tiny treehouse (the Base) */
  const home = () => url('home', () => S(64, 64,
    `<ellipse cx="32" cy="58" rx="22" ry="4" fill="#000" opacity=".25"/>` +
    `<path d="M14 57C16 44 13 34 18 24C22 18 28 16 32 16C38 16 44 18 47 24C51 34 48 44 50 57Z" fill="url(#hh)" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<path d="M22 24C22 34 21 46 20 56M40 22C42 34 43 46 44 56" stroke="#5a3620" stroke-width="1.6" fill="none" opacity=".6"/>` +
    `<path d="M26 57V46C26 41 29 38 32 38C35 38 38 41 38 46V57Z" fill="#e8a060" stroke="${OL}" stroke-width="2.2"/><circle cx="35.5" cy="49" r="1.4" fill="#ffd23f"/>` +
    `<circle cx="40" cy="30" r="5" fill="#ffe680" stroke="${OL}" stroke-width="2"/><path d="M40 25V35M35 30H45" stroke="#8a5a36" stroke-width="1.4"/>` +
    `<path d="M10 22C8 12 18 4 28 8C32 2 44 2 48 10C58 10 60 22 52 26C44 30 20 30 10 22Z" fill="url(#hl)" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/>` +
    `<path d="M16 16C20 10 28 9 32 11" stroke="#e8ffb0" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>` +
    `<path d="M14 36Q9 34 8 39Q12 41 14 39Z" fill="#f09040" stroke="${OL}" stroke-width="1.6"/>`,
    lg('hh', [[0, '#c08858'], [1, '#6a4428']], 1, 0) + rg('hl', [[0, '#c8f08a'], [0.6, '#5fae44'], [1, '#2f7a34']])));
  /* the green "next" arrow of the comic speech bubbles */
  const next = () => url('next', () => S(64, 48,
    `<path d="M4 17h28V5l28 19-28 19V31H4z" fill="url(#na)" stroke="${OL}" stroke-width="3.4" stroke-linejoin="round"/>` +
    `<path d="M8 21h27v-8l17 11" fill="none" stroke="#eaffc0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`,
    lg('na', [[0, '#b8f55a'], [0.55, '#5fc21e'], [1, '#2f8a10']])));
  /* a faint swirl texture for the element cards */
  const swirl = () => url('swirl', () => {
    let s = '';
    const spiral = (cx, cy, r0, turns, w, o) => {
      let d = '';
      for (let i = 0; i <= 90; i++) { const q = i / 90, a = q * turns * Math.PI * 2, r = r0 * (1 - q * 0.92); d += (i ? 'L' : 'M') + f(cx + Math.cos(a) * r) + ' ' + f(cy + Math.sin(a) * r); }
      return `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`;
    };
    s += spiral(200, 200, 190, 2.6, 16, 0.10) + spiral(200, 200, 150, 2.2, 7, 0.08) + spiral(70, 330, 60, 1.6, 6, 0.08) + spiral(340, 70, 50, 1.5, 5, 0.08);
    return S(400, 400, s);
  });
  /* the orb for small "catch" marks is the regular item art (WArt.item('orb')) */
  /* a day calendar with a golden star (the daily panel) */
  const today = () => url('today', () => S(64, 64,
    `<ellipse cx="32" cy="58" rx="18" ry="3.5" fill="#000" opacity=".25"/>` +
    `<rect x="10" y="12" width="44" height="42" rx="7" fill="url(#tp)" stroke="${OL}" stroke-width="2.6"/>` +
    `<path d="M10 25V19a7 7 0 0 1 7-7h30a7 7 0 0 1 7 7v6z" fill="url(#th)" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"/>` +
    `<rect x="19" y="5" width="6" height="13" rx="3" fill="#dfe6f8" stroke="${OL}" stroke-width="2"/><rect x="39" y="5" width="6" height="13" rx="3" fill="#dfe6f8" stroke="${OL}" stroke-width="2"/>` +
    `<path d="M32 29l3.4 6.9 7.6 1.1-5.5 5.3 1.3 7.6-6.8-3.6-6.8 3.6 1.3-7.6-5.5-5.3 7.6-1.1z" fill="#ffd23f" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>` +
    `<path d="M16 31h5M16 37h4M44 31h4M45 37h3" stroke="#b8c4dc" stroke-width="2" stroke-linecap="round"/>`,
    lg('tp', [[0, '#ffffff'], [1, '#dfe6f8']]) + lg('th', [[0, '#ff7a6a'], [1, '#d8403a']])));

  return { globe, cards, bag, scroll, tent, gear, wheel, stall, arrow, pointer, padlock, next, swirl, home, today };
})();
