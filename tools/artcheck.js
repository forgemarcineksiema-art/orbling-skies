/* Dev check for procedural art: renders every backdrop, prop, isle, character and Orbling and
 * reports NaN/undefined leaks and markup sizes. Usage: node tools/artcheck.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const sizes = {};
const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Set, Map, URL: { createObjectURL: () => 'blob:x' }, Blob: function (parts) { this.s = parts.join(''); }, document: { documentElement: {}, createElement: () => ({ getContext: () => null }) }, navigator: { language: 'en' }, window: {} };
vm.createContext(ctx);
const files = ['src/core/util.js', 'src/core/i18n.js', 'src/data/elements.js', 'src/data/moves.js', 'src/data/species.js', 'src/data/items.js', 'src/art/paint.js', 'src/art/painter.js', 'src/art/scenery.js', 'src/art/props.js', 'src/art/base_art.js', 'src/art/monster_art.js', 'src/art/world_art.js', 'src/data/world.js'];
vm.runInContext(files.map(read).join('\n;\n') + '\n;Object.assign(this, { U, MonArt, WArt, SPECIES, Scenery, ISLES });', ctx, { filename: 'bundle.js' });
const { U, MonArt, WArt, SPECIES } = ctx;
const errors = [];
const inspect = (name, svg) => {
  if (/NaN|undefined|Infinity/.test(svg)) errors.push(name + ': ' + (svg.match(/.{40}(NaN|undefined|Infinity).{20}/) || [''])[0]);
  sizes[name] = svg.length;
};
// capture the generated markup through U.svgUrl
const orig = U.svgUrl;
U.svgUrl = (key, gen) => { const s = gen(); inspect(key, s); return 'blob:' + key; };
for (const b of ['meadow', 'forest', 'beach', 'cove', 'volcano', 'caldera', 'snow', 'glacier', 'plains', 'spire', 'twilight', 'citadel', 'arena', 'altar']) {
  const t0 = Date.now();
  WArt.bg(b, 7);
  sizes['bg:' + b + ':7:ms'] = Date.now() - t0;
}
for (const k in WArt.PROP) for (const v of [0, 1, 2]) WArt.prop(k, v);
for (const b of ['meadow', 'beach', 'volcano', 'snow', 'plains', 'twilight', 'arena']) { WArt.isle(b); WArt.isle(b, true); }
WArt.space(3); WArt.pip(); WArt.pip('wow');
WArt.person({ skin: WArt.SKINS[0], hair: 'spiky', hairC: WArt.HAIRC[1], top: WArt.SUITS[0], acc: ['goggles'] });
for (const id in SPECIES) { inspect('m:' + id, MonArt.svg(id, {})); inspect('m:' + id + ':s', MonArt.svg(id, { shiny: true, anim: false })); inspect('mb:' + id, MonArt.svg(id, { anim: false, blink: true, t: 0, paint: true })); for (let k = 0; k < MonArt.FRAMES; k++) { inspect('mt:' + id + k, MonArt.svg(id, { anim: false, t: k / MonArt.FRAMES, paint: true })); inspect('mm:' + id + k, MonArt.svg(id, { anim: false, mv: k / MonArt.FRAMES, paint: true })); inspect('mts:' + id + k, MonArt.svg(id, { anim: false, shiny: true, t: k / MonArt.FRAMES, paint: true })); } }
for (const T of ['std', 'kid', 'tall', 'stout', 'elder']) for (let k = 0; k < 8; k++) inspect('pw:' + T + k, WArt.personSvg({ body: T, hold: 'staff', outfit: k % 2 ? 'robe' : 'coat', acc: ['cape', 'hat'] }, { walk: k / 8 }));
U.svgUrl = orig;
const bgs = Object.entries(sizes).filter(([k]) => k.startsWith('bg:'));
console.log(bgs.map(([k, v]) => k + '=' + (k.endsWith('ms') ? v + 'ms' : (v / 1024).toFixed(0) + 'KB')).join('  '));
const mons = Object.entries(sizes).filter(([k]) => k.startsWith('m:'));
console.log('orbling svg avg', (mons.reduce((a, [, v]) => a + v, 0) / mons.length / 1024).toFixed(1) + 'KB, max', (Math.max(...mons.map(m => m[1])) / 1024).toFixed(1) + 'KB');
if (errors.length) { console.log(errors.slice(0, 30).join('\n')); console.log(errors.length + ' problem(s)'); process.exit(1); }
console.log('art OK');
