'use strict';
/* 3.0 Base props, painted like the other props (props.js): the four workshops of the Workshop Yard (Garden, Kiln,
 * Well, Windmill + its turning sails), a building site, Bruno's stall, and the decorations players buy or earn from
 * the characters' stories. Contract as in props.js: { w, h, svg(v) → 'defs|body' }, the ground line near the bottom. */

(() => {
  const { f, Cn, En, Pn, Ln, Rect, op, ctx, wrap } = PropArt.H;
  const SHADOW = '#12301a';
  const shadow = (C, x, y, rx, ry) => En(x, y, rx, ry, C.soft(SHADOW, 0.5, 0.3));
  const berry = (x, y, s = 1) => Pn(`M${f(x)} ${f(y - 6 * s)}Q${f(x + 7 * s)} ${f(y - 4 * s)} ${f(x + 5 * s)} ${f(y + 4 * s)}Q${f(x)} ${f(y + 9 * s)} ${f(x - 5 * s)} ${f(y + 4 * s)}Q${f(x - 7 * s)} ${f(y - 4 * s)} ${f(x)} ${f(y - 6 * s)}Z`, '#e8303a') +
    Cn(x - 2 * s, y - 2 * s, 1.6 * s, '#ffc0c0') + Pn(`M${f(x - 4 * s)} ${f(y - 6 * s)}L${f(x)} ${f(y - 9 * s)}L${f(x + 4 * s)} ${f(y - 6 * s)}Z`, '#3a8a30');
  const star = (x, y, r, rin = 0.45) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * rin : r; d += (i ? 'L' : 'M') + f(x + Math.cos(a) * rr) + ' ' + f(y + Math.sin(a) * rr); } return d + 'Z'; };
  const flower = (x, y, r, c) => { let s = ''; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; s += Cn(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5, c); } return s + Cn(x, y, r * 0.38, '#ffd23f'); };
  const LEAVES = { hi: '#e6ff9a', lit: '#8fd05a', mid: '#4ea040', sh: '#2c6a34' };
  const WOOD = ['#c8905a', '#8a5a36'];
  const plank = (C, x, y, w, h) => Rect(x, y, w, h, C.lin([[0, WOOD[0]], [1, WOOD[1]]], 0, 0, 0, 1));

  Object.assign(PropArt.PROP, {
    /* ---------------- workshops ---------------- */
    // the Garden (earth): a raised bed of berry bushes with a watering can
    garden: { w: 190, h: 150, svg() {
      const C = ctx(401), R = C.R;
      let b = shadow(C, 95, 142, 90, 9);
      b += Pn('M16 104L174 104L168 144L22 144Z', C.lin([[0, '#c08a58'], [1, '#7a5234']])) + Rect(12, 97, 166, 10, '#dcae74') + Rect(12, 105, 166, 3, '#8a5a36', op(0.6));
      for (const x of [58, 95, 132]) b += Ln(`M${x} 110L${x - 1} 142`, '#6a4428', 2, op(0.6));
      b += Pn('M16 99Q95 86 174 99Z', '#5a3e2a');
      for (const [x, y, r] of [[46, 82, 30], [95, 72, 38], [144, 82, 30]]) b += Scenery.crown(C, x, y, r, LEAVES, { n: 6, wide: 1.2, dabs: 3 });
      for (let i = 0; i < 12; i++) b += berry(24 + R() * 142, 44 + R() * 48, 0.95);
      // a little sign with a berry, a watering can at the side
      b += Rect(164, 70, 4, 34, '#8a5a36') + Pn('M150 56L182 56L182 76L150 76Z', '#f0d8a8') + berry(166, 67, 0.9);
      b += Pn('M6 128L28 128L30 146L8 146Z', '#5fb0e0') + Pn('M28 132L40 122L42 126L30 136Z', '#5fb0e0') + Ln('M10 128Q17 116 24 128', '#3a7aa8', 2.4);
      return wrap(C, b, '#1a3a20');
    } },
    // the Kiln (fire): a round clay oven with a glowing mouth, a chimney and fresh orbs cooling on the ledge
    kiln: { w: 160, h: 170, svg() {
      const C = ctx(411);
      let b = shadow(C, 80, 162, 72, 9);
      b += Rect(96, 30, 22, 44, C.lin([[0, '#c06a4a'], [1, '#7a3a28']], 0, 0, 1, 0)) + Rect(92, 26, 30, 8, '#d8845a');
      b += Pn('M20 160C16 108 40 62 80 62C120 62 144 108 140 160Z', C.lin([[0, '#eea078'], [0.45, '#c86a4a'], [1, '#86402c']], 0, 0, 1, 0));
      for (const [y, k] of [[88, 0.8], [112, 0.92], [136, 1]]) b += Ln(`M${f(80 - 58 * k)} ${y}Q80 ${y - 10} ${f(80 + 58 * k)} ${y}`, '#7a3a28', 2.2, op(0.5));
      for (const [x, y] of [[44, 100], [70, 96], [100, 98], [120, 106], [36, 124], [58, 122], [104, 122], [128, 128], [30, 148], [128, 150]]) b += Ln(`M${x} ${y}l0 12`, '#7a3a28', 1.8, op(0.45));
      b += Ln('M34 120C36 90 52 72 74 68', '#ffd0b0', 4, op(0.55));
      b += Pn('M52 160L52 130C52 108 108 108 108 130L108 160Z', '#3a1a14') + Pn('M58 160L58 132C58 118 102 118 102 132L102 160Z', C.rad([[0, '#fff6a0'], [0.45, '#ffb13b'], [1, '#e8402e']], { cx: '50%', cy: '85%', r: '75%' }));
      b += Pn('M66 160Q72 142 80 150Q86 136 94 160Z', '#fff3b0', op(0.9));
      // orbs cooling on a little shelf
      b += Rect(122, 116, 36, 5, '#8a5a36');
      for (const [x, c] of [[130, '#8fd8ff'], [146, '#8fd8ff']]) b += Cn(x, 108, 7, c) + Ln(`M${x - 7} 109Q${x} 112 ${x + 7} 109`, '#ffd23f', 2) + Cn(x - 2.5, 105, 2, '#ffffff', op(0.8));
      return wrap(C, b, '#3a1a10', Cn(80, 140, 40, C.soft('#ffb13b', 0.5, 0.2)) + En(107, 18, 10, 7, C.soft('#d8d0e0', 0.6, 0.3)) + En(114, 6, 8, 6, C.soft('#d8d0e0', 0.45, 0.3)));
    } },
    // the Well (water): a stone ring, a wooden roof and a bucket of sparkling water
    well: { w: 150, h: 180, svg() {
      const C = ctx(421), R = C.R;
      let b = shadow(C, 75, 172, 66, 9);
      b += Rect(26, 44, 8, 96, '#8a5a36') + Rect(116, 44, 8, 96, '#6a4428');
      b += Pn('M10 52L75 14L140 52L128 58L75 28L22 58Z', C.lin([[0, '#d8604a'], [1, '#9a3a30']])) + Ln('M14 52L75 18L136 52', '#ff9a80', 2.4, op(0.6));
      b += Ln('M30 66L120 66', '#6a4428', 5) + Ln('M75 66L75 96', '#c8b890', 2) + Pn('M64 96L86 96L84 114L66 114Z', '#9a6a44') + Rect(64, 100, 22, 3, '#6a4428');
      b += En(75, 128, 56, 14, '#3a6a9a') + En(75, 128, 50, 11, C.rad([[0, '#bff4ff'], [1, '#3a9ae0']], { cx: '40%', cy: '40%', r: '70%' }));
      b += Pn('M19 128L19 160Q75 178 131 160L131 128Q75 146 19 128Z', C.lin([[0, '#b8b0c8'], [0.5, '#9a92ac'], [1, '#6a6480']], 0, 0, 1, 0));
      for (let i = 0; i < 7; i++) { const x = 24 + i * 16 + (R() - 0.5) * 4; b += Ln(`M${f(x)} ${f(134 + Math.sin(i) * 2)}l0 26`, '#5a5470', 1.6, op(0.5)); }
      b += Ln('M19 144Q75 162 131 144', '#5a5470', 1.6, op(0.5));
      b += Pn(star(60, 124, 5), '#ffffff', op(0.9)) + Pn(star(88, 130, 3.5), '#ffffff', op(0.8));
      return wrap(C, b, '#1e2a3e', En(75, 128, 50, 16, C.soft('#bff4ff', 0.5, 0.3)));
    } },
    // the Windmill (air): a white tower with a red cap (the sails turn on their own layer: mill_sails)
    mill: { w: 150, h: 210, svg() {
      const C = ctx(431);
      let b = shadow(C, 75, 202, 60, 9);
      b += Pn('M44 200L56 70L94 70L106 200Z', C.lin([[0, '#fffaf0'], [0.55, '#ece2d0'], [1, '#b8aa98']], 0, 0, 1, 0));
      for (const y of [110, 150]) b += Ln(`M${f(52 - (y - 70) * 0.01)} ${y}L${f(98 + (y - 70) * 0.01)} ${y}`, '#c8b8a0', 2, op(0.6));
      b += Pn('M64 200L64 168C64 158 86 158 86 168L86 200Z', '#6a4a3a') + Cn(82, 182, 1.8, '#ffd23f');
      b += Pn('M70 124L80 124L80 138L70 138Z', '#5ab0e0') + Rect(74, 124, 2, 14, '#fffaf0');
      b += Pn('M48 74L75 36L102 74Z', C.lin([[0, '#e8604a'], [1, '#a83a30']])) + Ln('M52 72L75 40', '#ff9a80', 2.2, op(0.6));
      b += Cn(75, 60, 8, '#8a5a36');
      return wrap(C, b, '#2e2436');
    } },
    mill_sails: { w: 150, h: 150, svg() {
      const C = ctx(441);
      let b = '';
      for (let i = 0; i < 4; i++) {
        const a = i * 90;
        b += `<g transform="rotate(${a} 75 75)">` + Rect(72, 8, 6, 62, '#8a5a36') + Pn('M78 12L100 16L98 64L78 64Z', '#f8f0e0') + Ln('M78 28L99 30M78 44L98 45', '#c8b8a0', 1.6) + '</g>';
      }
      b += Cn(75, 75, 9, '#6a4428') + Cn(75, 75, 4, '#ffd23f');
      return wrap(C, b, '#2e2436');
    } },
    // a building site (a workshop not built yet): stakes, a rope, planks and a blueprint sign
    site: { w: 160, h: 120, svg() {
      const C = ctx(451);
      let b = shadow(C, 80, 112, 70, 8);
      b += En(80, 100, 66, 14, '#c8a870', op(0.8));
      for (const [x, y] of [[22, 104], [138, 104], [42, 86], [118, 86]]) b += Rect(x - 3, y - 36, 6, 38, '#9a6a44');
      b += Ln('M22 72L42 54L118 54L138 72L22 72', '#ffd23f', 2.4) + Ln('M22 80L138 80', '#ff6b4a', 2.4);
      b += `<g transform="rotate(-8 60 104)">` + plank(C, 30, 98, 70, 8) + '</g>' + plank(C, 40, 104, 74, 8);
      b += Rect(92, 30, 5, 70, '#8a5a36') + Pn('M72 14L122 14L122 50L72 50Z', '#6aa8e8') + Ln('M78 22H116M78 30H104M78 38H112', '#ffffff', 2, op(0.8)) + Pn('M104 26l8 8m0-8l-8 8', '#ffffff', ' stroke="#ffffff" stroke-width="2"');
      return wrap(C, b, '#2a2014');
    } },
    // Bruno's stall: a workbench under a striped awning, tools and a sample lantern
    stall: { w: 200, h: 170, svg() {
      const C = ctx(461);
      let b = shadow(C, 100, 162, 90, 9);
      b += Rect(22, 40, 7, 120, '#8a5a36') + Rect(171, 40, 7, 120, '#6a4428');
      for (let i = 0; i < 6; i++) b += Pn(`M${14 + i * 29} 26L${43 + i * 29} 26L${41 + i * 29} 56Q${28 + i * 29} 64 ${16 + i * 29} 56Z`, i % 2 ? '#fff4e0' : '#3aa6ff');
      b += Rect(10, 20, 180, 8, '#2a6ab8');
      b += plank(C, 18, 104, 164, 12) + Rect(26, 116, 8, 44, '#8a5a36') + Rect(166, 116, 8, 44, '#6a4428') + Rect(30, 140, 140, 5, '#9a6a44');
      // tools on the bench: a hammer, a saw, planks, a paint pot and a finished little lantern
      b += `<g transform="rotate(-20 52 96)">` + Rect(38, 94, 34, 5, '#c8905a') + Rect(66, 86, 10, 18, '#8a8aa8') + '</g>';
      b += Pn('M84 102L124 98L126 104L86 106Z', '#b8c0d8') + Ln('M88 104l3-3m4 3l3-3m4 3l3-3m4 3l3-3', '#6a6a88', 1.2);
      b += Pn('M134 88L150 88L152 104L132 104Z', '#ff7ab6') + En(142, 88, 9, 3, '#ffb0d0');
      b += Rect(160, 72, 3, 32, '#4a3a6a') + Pn('M154 74L170 74L168 90L156 90Z', '#ffe680');
      b += plank(C, 30, 146, 60, 8) + plank(C, 110, 150, 50, 7);
      return wrap(C, b, '#1e2a40', Cn(162, 82, 16, C.soft('#fff49a', 0.5, 0.2)));
    } },

    /* ---------------- decorations ---------------- */
    flowerbed: { w: 120, h: 70, svg() {
      const C = ctx(501), R = C.R;
      let b = shadow(C, 60, 64, 56, 7);
      b += En(60, 52, 54, 15, '#8a7a70') + En(60, 49, 50, 13, '#5a3e2a');
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; b += En(60 + Math.cos(a) * 52, 54 + Math.sin(a) * 14, 9, 6, '#b8aca0'); }
      const cols = ['#ff7ab6', '#ffd23f', '#ffffff', '#b18cff', '#ff6b6b'];
      for (let i = 0; i < 14; i++) { const x = 20 + R() * 80, y = 26 + R() * 22; b += Ln(`M${f(x)} ${f(y + 4)}l0 12`, '#3a8a30', 2) + flower(x, y, 6 + R() * 3, cols[i % cols.length]); }
      return wrap(C, b, '#2a2018');
    } },
    pinwheel: { w: 70, h: 120, svg() {
      const C = ctx(511);
      let b = shadow(C, 35, 114, 14, 4) + Rect(33, 40, 4, 76, '#c8905a');
      const cols = ['#ff6b6b', '#ffd23f', '#5cd6ff', '#9dff7a'];
      for (let i = 0; i < 4; i++) b += `<g transform="rotate(${i * 90} 35 38)">` + Pn('M35 38L35 10Q52 16 35 38Z', cols[i]) + Pn('M35 38L35 10Q44 20 35 38Z', '#ffffff', op(0.3)) + '</g>';
      b += Cn(35, 38, 4, '#fff4e0');
      return wrap(C, b, '#2a2040');
    } },
    bench: { w: 130, h: 84, svg() {
      const C = ctx(521);
      let b = shadow(C, 65, 78, 58, 6);
      b += Rect(18, 50, 8, 28, '#4a4a5a') + Rect(104, 50, 8, 28, '#4a4a5a') + Rect(26, 60, 8, 20, '#3a3a48') + Rect(96, 60, 8, 20, '#3a3a48');
      b += plank(C, 10, 46, 110, 9) + plank(C, 12, 56, 106, 6);
      b += plank(C, 14, 18, 102, 9) + plank(C, 14, 31, 102, 9) + Rect(18, 16, 6, 34, '#4a4a5a') + Rect(106, 16, 6, 34, '#4a4a5a');
      b += Ln('M18 22H110', '#ffe0b0', 2, op(0.6));
      return wrap(C, b, '#2a1a10');
    } },
    birdbath: { w: 90, h: 120, svg() {
      const C = ctx(531);
      let b = shadow(C, 45, 114, 30, 6);
      b += Pn('M30 114L36 102L54 102L60 114Z', '#a8a0b8') + Pn('M38 102L40 58L50 58L52 102Z', C.lin([[0, '#d0c8e0'], [1, '#8a82a0']], 0, 0, 1, 0));
      b += Pn('M8 44Q45 70 82 44L78 40L12 40Z', C.lin([[0, '#e0d8f0'], [1, '#9a92b0']])) + En(45, 42, 36, 8, '#3a8ac8') + En(45, 42, 32, 6, C.rad([[0, '#d8f8ff'], [1, '#4aa8e8']]));
      // a little bird on the rim
      b += En(70, 32, 9, 7, '#ff9a5a') + Cn(76, 26, 5, '#ff9a5a') + Pn('M80 26L86 27L80 29Z', '#ffd23f') + Cn(77, 25, 1.2, '#2b2040') + Pn('M62 32L54 28L60 36Z', '#e8703a');
      return wrap(C, b, '#1e2436');
    } },
    sundial: { w: 100, h: 100, svg() {
      const C = ctx(541);
      let b = shadow(C, 50, 94, 34, 6);
      b += Pn('M30 94L34 50L66 50L70 94Z', C.lin([[0, '#e8dcc0'], [1, '#a89878']], 0, 0, 1, 0)) + Rect(26, 88, 48, 7, '#c8b898');
      b += En(50, 46, 40, 12, '#c8b898') + En(50, 43, 38, 11, C.lin([[0, '#fff4d8'], [1, '#e0cca0']]));
      for (let i = 0; i < 12; i++) { const a = Math.PI + i / 11 * Math.PI; b += Ln(`M${f(50 + Math.cos(a) * 28)} ${f(43 + Math.sin(a) * 8)}L${f(50 + Math.cos(a) * 34)} ${f(43 + Math.sin(a) * 9.8)}`, '#8a7050', 1.4); }
      b += Pn('M50 44L50 18L64 44Z', '#ffb13b') + Pn('M50 44L50 18L56 44Z', '#ffd23f');
      b += Cn(26, 34, 6, '#ffd23f') + Ln('M26 24v-3M26 47v-3M16 34h-3M39 34h-3', '#ffd23f', 2);
      return wrap(C, b, '#3a2a14');
    } },
    brazier: { w: 80, h: 130, svg() {
      const C = ctx(551);
      let b = shadow(C, 40, 124, 24, 5);
      b += Ln('M22 124L36 70M58 124L44 70M40 124L40 70', '#4a3a3a', 4);
      b += Pn('M12 64Q40 84 68 64L64 56L16 56Z', C.lin([[0, '#9a8a8a'], [1, '#4a3a3a']])) + En(40, 57, 26, 5, '#2a1a1a');
      b += Pn('M22 58C18 40 30 36 30 22C38 32 38 38 40 42C42 30 46 20 44 8C58 22 62 40 58 58Z', '#ff6a2e') + Pn('M30 58C28 46 36 40 38 32C44 42 50 48 48 58Z', '#ffd23f') + Pn('M36 58C36 52 40 48 42 44C44 50 46 54 44 58Z', '#fff6c0');
      return wrap(C, b, '#2a1010', Cn(40, 40, 30, C.soft('#ffb13b', 0.5, 0.2)));
    } },
    arch: { w: 150, h: 180, svg() {
      const C = ctx(561), R = C.R;
      let b = shadow(C, 75, 172, 66, 8);
      b += Rect(16, 60, 12, 114, '#9a6a44') + Rect(122, 60, 12, 114, '#6a4428');
      b += Pn('M16 70C16 20 134 20 134 70L122 70C122 34 28 34 28 70Z', '#8a5a36');
      const cols = ['#ff7ab6', '#ffffff', '#ffd23f', '#ff9ac8'];
      for (let i = 0; i < 16; i++) { const a = Math.PI + i / 15 * Math.PI, x = 75 + Math.cos(a) * 54, y = 64 + Math.sin(a) * 38; b += Scenery.crown(C, x, y, 11 + R() * 5, LEAVES, { n: 4, dabs: 1 }); }
      for (let i = 0; i < 10; i++) { const a = Math.PI + (i + 0.5) / 10 * Math.PI; b += flower(75 + Math.cos(a) * 56, 62 + Math.sin(a) * 40, 5.5, cols[i % cols.length]); }
      for (const x of [22, 128]) for (let k = 0; k < 4; k++) b += Scenery.crown(C, x, 90 + k * 22, 8, LEAVES, { n: 3, dabs: 1 }) + flower(x + (k % 2 ? 4 : -4), 96 + k * 22, 4.5, cols[k % 4]);
      return wrap(C, b, '#1a3a20');
    } },
    fountain: { w: 150, h: 140, svg() {
      const C = ctx(571);
      let b = shadow(C, 75, 132, 70, 8);
      b += Pn('M8 104Q75 140 142 104L142 118Q75 150 8 118Z', C.lin([[0, '#d0c8e0'], [1, '#8a82a0']], 0, 0, 1, 0)) + En(75, 104, 67, 17, '#b8b0c8') + En(75, 104, 60, 14, C.rad([[0, '#d8f8ff'], [1, '#3a9ae0']]));
      b += Pn('M66 104L68 60L82 60L84 104Z', C.lin([[0, '#e0d8f0'], [1, '#9a92b0']], 0, 0, 1, 0)) + En(75, 60, 24, 7, '#c8c0d8') + En(75, 58, 21, 5, '#8ad8ff');
      b += Ln('M75 52C60 30 40 40 30 98M75 52C90 30 110 40 120 98', '#bff4ff', 4, op(0.85)) + Ln('M75 52C64 36 52 44 46 96M75 52C86 36 98 44 104 96', '#ffffff', 2.4, op(0.7));
      b += Cn(75, 48, 5, '#ffffff', op(0.9)) + Pn(star(40, 100, 4), '#ffffff', op(0.9)) + Pn(star(110, 102, 3.4), '#ffffff', op(0.8));
      return wrap(C, b, '#1e2436', En(75, 100, 64, 22, C.soft('#bff4ff', 0.35, 0.3)));
    } },
    totem: { w: 80, h: 180, svg() {
      const C = ctx(581);
      let b = shadow(C, 40, 174, 26, 5);
      b += Pn('M22 174L24 30L56 30L58 174Z', C.lin([[0, '#c8905a'], [1, '#6a4428']], 0, 0, 1, 0));
      const faces = [['#ff6a3a', 140], ['#3a9ae0', 108], ['#5fb043', 76], ['#b18cff', 44]];
      for (const [c, y] of faces) b += Pn(`M22 ${y}L58 ${y}L58 ${y + 28}L22 ${y + 28}Z`, c) + Cn(32, y + 11, 4, '#ffffff') + Cn(48, y + 11, 4, '#ffffff') + Cn(32, y + 11, 2, '#2b2040') + Cn(48, y + 11, 2, '#2b2040') + Ln(`M32 ${y + 20}Q40 ${y + 25} 48 ${y + 20}`, '#2b2040', 2);
      b += Pn('M24 36L2 24L10 44L24 46Z', '#ffd23f') + Pn('M56 36L78 24L70 44L56 46Z', '#ffd23f') + Pn(star(40, 20, 12), '#ffd23f');
      return wrap(C, b, '#2a1a10');
    } },
    balloon: { w: 120, h: 200, svg() {
      const C = ctx(591);
      let b = shadow(C, 60, 194, 40, 6);
      b += Ln('M30 194L46 150M90 194L74 150', '#8a5a36', 1.6) + Rect(26, 188, 6, 8, '#6a4428') + Rect(88, 188, 6, 8, '#6a4428');
      b += Pn('M44 150L76 150L72 172L48 172Z', C.lin([[0, '#c8905a'], [1, '#8a5a36']])) + Ln('M46 158H74M47 165H73', '#6a4428', 1.4, op(0.7));
      b += Ln('M46 150L30 96M74 150L90 96M52 150L48 110M68 150L72 110', '#6a4428', 1.2);
      const env = 'M60 4C92 4 112 30 112 62C112 90 92 106 76 118L44 118C28 106 8 90 8 62C8 30 28 4 60 4Z';
      b += Pn(env, '#ff6b6b');
      for (const [d, c] of [['M60 4C48 4 36 30 36 62C36 92 44 108 50 118L44 118C28 106 8 90 8 62C8 30 28 4 60 4Z', '#ffd23f'], ['M60 4C72 4 84 30 84 62C84 92 76 108 70 118L76 118C92 106 112 90 112 62C112 30 92 4 60 4Z', '#ffd23f']]) b += Pn(d, c);
      b += Pn('M60 4C66 4 70 30 70 62C70 92 66 108 64 118L56 118C54 108 50 92 50 62C50 30 54 4 60 4Z', '#fff4e0');
      b += Ln('M24 40C28 24 40 14 52 12', '#ffffff', 3, op(0.6));
      return wrap(C, b, '#2a1a28');
    } },
    statue: { w: 100, h: 170, svg() {
      const C = ctx(601);
      let b = shadow(C, 50, 164, 40, 6);
      b += Pn('M14 164L18 118L82 118L86 164Z', C.lin([[0, '#e0d8f0'], [1, '#8a82a0']], 0, 0, 1, 0)) + Rect(10, 112, 80, 10, '#c8c0d8') + Rect(12, 158, 76, 7, '#b8b0c8');
      b += Pn(star(50, 142, 9), '#ffd23f');
      const gold = C.lin([[0, '#fff6b0'], [0.4, '#ffd23f'], [1, '#b8860b']], 0, 0, 1, 1);
      // a round Orbling with big ears and a curled tail, all in gold
      b += Pn('M78 96C92 92 94 76 84 72C92 78 86 88 76 88Z', gold);
      b += En(50, 88, 30, 26, gold) + Cn(50, 52, 24, gold);
      b += Pn('M30 42L24 14L42 32Z', gold) + Pn('M70 42L76 14L58 32Z', gold);
      b += Cn(42, 52, 3.4, '#8a6a10') + Cn(58, 52, 3.4, '#8a6a10') + Ln('M44 62Q50 67 56 62', '#8a6a10', 2.4);
      b += Ln('M36 36C38 28 46 24 54 26', '#ffffff', 3, op(0.7)) + Ln('M28 80C30 72 36 66 44 64', '#ffffff', 3, op(0.5));
      return wrap(C, b, '#3a2a0a', Cn(50, 64, 44, C.soft('#fff4b0', 0.35, 0.3)));
    } },
    // ---- story rewards ----
    tent: { w: 140, h: 120, svg() {
      const C = ctx(611);
      let b = shadow(C, 70, 114, 64, 7);
      b += Pn('M8 112L70 22L132 112Z', C.lin([[0, '#ffb13b'], [1, '#e87a2a']], 0, 0, 1, 0)) + Pn('M70 22L132 112L96 112Z', '#c85a1a', op(0.5));
      b += Pn('M52 112L70 60L88 112Z', '#5a2a14') + Pn('M70 60L88 112L80 112L70 70Z', '#3a1a0a');
      b += Ln('M8 112L70 22L132 112', '#ffe0a0', 2.4, op(0.6)) + Ln('M70 22L70 8', '#6a4428', 3) + Pn('M70 8L88 13L70 18Z', '#4cd964');
      b += Ln('M20 112L4 118M120 112L136 118', '#8a6a4a', 1.6);
      return wrap(C, b, '#3a1a08');
    } },
    lighthouse: { w: 80, h: 170, svg() {
      const C = ctx(621);
      let b = shadow(C, 40, 164, 30, 6);
      b += Pn('M18 164L26 56L54 56L62 164Z', '#ffffff');
      for (const [y0, y1] of [[64, 84], [104, 124], [144, 164]]) b += Pn(`M${f(26 - (y0 - 56) * 0.074)} ${y0}L${f(54 + (y0 - 56) * 0.074)} ${y0}L${f(54 + (y1 - 56) * 0.074)} ${y1}L${f(26 - (y1 - 56) * 0.074)} ${y1}Z`, '#e8403a');
      b += Pn('M40 56L54 56L62 164L44 164Z', '#2b2040', op(0.15));
      b += Rect(20, 50, 40, 7, '#4a4a5a') + Pn('M26 50L26 30L54 30L54 50Z', '#fff49a') + Rect(38, 30, 4, 20, '#4a4a5a') + Pn('M22 30L40 14L58 30Z', '#e8403a') + Cn(40, 12, 3, '#4a4a5a');
      b += Pn('M34 164L34 148C34 142 46 142 46 148L46 164Z', '#3a6a9a');
      return wrap(C, b, '#1e2436', Cn(40, 40, 30, C.soft('#fff49a', 0.55, 0.2)));
    } },
    campfire: { w: 110, h: 100, svg() {
      const C = ctx(631);
      let b = shadow(C, 55, 92, 50, 7);
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; b += En(55 + Math.cos(a) * 40, 80 + Math.sin(a) * 12, 11, 8, i % 2 ? '#9a92a0' : '#b8b0c0'); }
      b += `<g transform="rotate(-18 55 76)">` + Rect(22, 72, 66, 11, '#8a5a36') + '</g><g transform="rotate(18 55 76)">' + Rect(22, 72, 66, 11, '#6a4428') + '</g>';
      b += Pn('M34 78C28 56 42 52 42 36C50 46 50 52 52 56C54 44 58 32 56 18C72 34 78 54 74 78Z', '#ff6a2e') + Pn('M42 78C40 64 48 58 50 50C56 60 62 66 60 78Z', '#ffd23f') + Pn('M48 78C48 70 52 66 54 62C56 68 58 72 56 78Z', '#fff6c0');
      return wrap(C, b, '#2a1010', Cn(55, 58, 40, C.soft('#ffb13b', 0.5, 0.2)));
    } },
    telescope: { w: 110, h: 140, svg() {
      const C = ctx(641);
      let b = shadow(C, 55, 134, 40, 6);
      b += Ln('M55 84L28 134M55 84L82 134M55 84L55 134', '#6a4428', 4);
      b += `<g transform="rotate(-32 55 76)">` + Rect(14, 66, 84, 20, C.lin([[0, '#ffe08a'], [0.5, '#e8a830'], [1, '#a8741a']])) + Rect(92, 62, 14, 28, '#d8a030') + Rect(8, 70, 10, 12, '#a8741a') + Rect(40, 64, 6, 24, '#6a4a1a') + Rect(70, 64, 6, 24, '#6a4a1a') + '</g>';
      b += Cn(55, 84, 6, '#4a3a2a') + Pn(star(100, 16, 6), '#fff6b0') + Pn(star(84, 6, 3.5), '#ffffff');
      return wrap(C, b, '#2a1a08');
    } },
    station: { w: 100, h: 180, svg() {
      const C = ctx(651);
      let b = shadow(C, 50, 174, 34, 6);
      b += Rect(47, 30, 6, 144, '#9aa0c0') + Ln('M50 174L30 150M50 174L70 150', '#9aa0c0', 3);
      // cups of an anemometer, a vane with an arrow, and a box with a little screen
      b += Ln('M50 30L50 20M50 26L28 26M50 26L72 26', '#6a7090', 2.4) + Cn(26, 26, 6, '#5cd6ff') + Cn(74, 26, 6, '#5cd6ff') + Cn(50, 16, 6, '#5cd6ff');
      b += Ln('M50 58L86 58', '#6a7090', 2.4) + Pn('M86 52L98 58L86 64Z', '#ff6b6b') + Pn('M50 50L40 58L50 66Z', '#ffd23f');
      b += Rect(30, 96, 40, 30, '#e8ecf8') + Rect(34, 100, 32, 16, '#3a9ae0') + Ln('M36 112L44 106L50 110L58 102L64 104', '#ffffff', 1.8) + Cn(62, 121, 2, '#4cd964');
      return wrap(C, b, '#1e2436');
    } },
  });
})();
