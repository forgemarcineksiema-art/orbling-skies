/* Dev check: loads the data modules in a sandbox and verifies i18n keys + data integrity.
 * Usage: node tools/check.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Set, Map, URL: { createObjectURL: () => 'blob:x' }, Blob: function () {}, document: { documentElement: {} }, navigator: { language: 'en' }, window: {} };
vm.createContext(ctx);
const langFiles = fs.existsSync(path.join(root, 'src/core/lang')) ? fs.readdirSync(path.join(root, 'src/core/lang')).filter(f => f.endsWith('.js')).map(f => 'src/core/lang/' + f) : [];
const files = ['src/core/util.js', 'src/core/i18n.js', ...langFiles, 'src/data/elements.js', 'src/data/moves.js', 'src/data/species.js', 'src/data/items.js', 'src/art/paint.js', 'src/art/painter.js', 'src/art/scenery.js', 'src/art/props.js', 'src/art/base_art.js', 'src/art/monster_art.js', 'src/art/world_art.js', 'src/data/world.js', 'src/data/arena.js', 'src/data/base.js', 'src/game/camp.js', 'src/game/meta.js', 'src/game/base.js'];
// top-level const declarations are not added to the context object, so expose them explicitly
const expose = '\n;Object.assign(this, { U, I18N, LANGS, t, setLang, WORKSHOPS, DECOR, DECOR_ART, DECOR_SPOTS, STORIES, PropArt, ELEMENTS, EL_ORDER, SIGNS, SIGN, MOVES, SPECIES, SPECIES_ORDER, LINES, ITEMS, SHOP_LIST, SPIN_PRIZES, ISLES, ISLE, ZONES, TAMERS, MAIN_QUESTS, DAILY_TEMPLATES, CLASS_LOOK, MonArt, WArt, typeMult, moveValue, ARENA, MEDALS, LOGIN_REWARDS, EGG_IDS });';
vm.runInContext(files.map(read).join('\n;\n') + expose, ctx, { filename: 'bundle.js' });

const { I18N, LANGS, WORKSHOPS, DECOR, DECOR_ART, DECOR_SPOTS, STORIES, PropArt, MOVES, SPECIES, SIGNS, ITEMS, ISLES, ZONES, TAMERS, MAIN_QUESTS, DAILY_TEMPLATES, CLASS_LOOK, ARENA, MEDALS, LOGIN_REWARDS, EGG_IDS, WArt } = ctx;
const errors = [];
const need = k => { for (const l of ['en', 'pl']) if (I18N[l][k] == null) errors.push(`missing [${l}] ${k}`); };

// static keys in source
const src = fs.readdirSync(path.join(root, 'src'), { recursive: true }).filter(f => f.endsWith('.js')).map(f => read('src/' + f.replace(/\\/g, '/'))).join('\n');
const re = /\bt\('([a-z0-9_.]+)'/g;
let m; const statics = new Set();
while ((m = re.exec(src))) statics.add(m[1]);
for (const k of statics) if (!k.endsWith('.') && !k.endsWith('_')) need(k);

// dynamic keys
for (const id in MOVES) need('mv.' + id);
for (const id in SPECIES) need('d.' + id);
for (const s of SIGNS) { need('sign.' + s.id); need('trait.' + s.trait); need('traitd.' + s.trait); }
for (const el of ['fire', 'earth', 'air', 'water']) { need('el.' + el); need('elg.' + el); }
for (const id in ITEMS) { need('it.' + id); need('itd.' + id); }
for (const is of ISLES) { need('isle.' + is.id); need('g.' + is.id + '.i'); need('g.' + is.id + '.l'); if (is.id !== 'sunny') need('pip.isle.' + is.id); }
for (const z in ZONES) need('zone.' + z);
for (const id in TAMERS) { const T = TAMERS[id]; need('cls.' + T.cls); if (T.guardian || T.champ) need('gt.' + id); }
for (const k of ['atk', 'mag', 'def', 'spd']) need('stat.' + k);
for (const k of ['go', 'nudge', 'first', 'later', 'prof']) need('tut.' + k); // the first catch (some are picked at run time)
for (const k of ['burn', 'poison', 'shock', 'sleep', 'freeze']) { need('st.' + k); need('b.st.' + k); }
for (const k of ['phys', 'star', 'buff', 'debuff', 'status', 'heal']) need('mc.' + k);
for (const q of MAIN_QUESTS.concat(DAILY_TEMPLATES)) need('q.' + q.type + (q.el ? '_el' : ''));
for (let i = 0; i < 8; i++) { need('tl.i' + i); need('tl.l' + i); }
for (let i = 0; i < 3; i++) { need('tl.grunt.i' + i); need('tl.grunt.l' + i); }
for (const k of ['team', 'codex', 'bag', 'quests', 'camp', 'shop', 'map', 'settings']) need('hud.' + k);
// v2 systems
for (const M of MEDALS) { need('medal.' + M.id); need('medald.' + M.id); if (M.tiers.length !== 3) errors.push('medal tiers ' + M.id); }
for (let n = 1; n <= 3; n++) need('medal.t_' + n);
for (const L of ARENA) { need('ar.' + L.id); need('arc.' + L.id + '.i'); need('arc.' + L.id + '.l'); if (L.ids.length !== 5 || !TAMERS[L.ids[4]].champ) errors.push('arena ladder ' + L.id); }
for (let i = 0; i < 4; i++) { need('arl.i' + i); need('arl.l' + i); }
for (const r of LOGIN_REWARDS) for (const k in r) if (k !== 'coins' && !ITEMS[k]) errors.push('bad login reward ' + k);
for (const q of MAIN_QUESTS) for (const k in q.reward) if (!['coins', 'txp'].includes(k) && !ITEMS[k]) errors.push(`bad reward ${k} in ${q.id}`);
for (const q of DAILY_TEMPLATES) for (const k in q.reward) if (k !== 'coins' && !ITEMS[k]) errors.push('bad daily reward ' + k);
if (new Set(MAIN_QUESTS.map(q => q.id)).size !== MAIN_QUESTS.length) errors.push('duplicate main quest id');
for (const id of EGG_IDS) if (!ITEMS[id]) errors.push('egg item missing ' + id);
try { WArt.bg('arena', 5); WArt.isle('arena'); for (const id of EGG_IDS.concat(['shard'])) WArt.item(id); } catch (e) { errors.push('v2 art fail: ' + e.message); }
for (const k of ['goggles', 'cap', 'headset', 'bandana', 'flower', 'glasses', 'none']) need('acc.' + k);
for (const k of ['sunkit', 'finnip', 'mossmoo', 'breezle']) need('std.' + k);
for (let i = 1; i <= 5; i++) need('prof.tip' + i);
for (const k of ['burn', 'poison']) need('b.hurt.' + k);
for (const k of ['lv', 'new', 'sign']) need('tm.sort_' + k);

// 3.0: the Base
for (const W of WORKSHOPS) { need('ws.' + W.id); need('ws.d_' + W.id); if (!PropArt.PROP[W.id]) errors.push('no workshop art ' + W.id); if (W.out !== 'coins' && !ITEMS[W.out]) errors.push('bad workshop output ' + W.out); }
for (const id in DECOR) { need('dc.' + id); const [type] = DECOR_ART[id] || [id]; if (!PropArt.PROP[type]) errors.push('no decoration art ' + id); }
for (const S of STORIES) { if (!TAMERS[S.npc]) errors.push('bad story npc ' + S.npc); if (!DECOR[S.reward.decor] || DECOR[S.reward.decor].story !== S.id) errors.push('bad story reward ' + S.id); for (const k of ['a1', 'a2', 'b1', 'b2', 'w', 'q']) need('st.' + S.id + '.' + k); }
for (let n = 1; n <= 5; n++) need('fr.p_' + n);
for (const [k] of [['glade'], ['yard']]) if (!DECOR_SPOTS[k]) errors.push('no spots ' + k);

// data integrity
for (const id in SPECIES) {
  const sp = SPECIES[id];
  if (!sp.learn.length) errors.push('no learnset ' + id);
  for (const [, mv] of sp.learn) if (!MOVES[mv]) errors.push(`bad move ${mv} in ${id}`);
  if (sp.evoTo && !SPECIES[sp.evoTo]) errors.push('bad evo ' + id);
  try { ctx.MonArt.svg(id, {}); ctx.MonArt.svg(id, { shiny: true, anim: false }); } catch (e) { errors.push('art fail ' + id + ': ' + e.message); }
}
for (const z in ZONES) {
  for (const [sp] of ZONES[z].spawns) if (!SPECIES[sp]) errors.push(`bad spawn ${sp} in ${z}`);
  for (const [id] of ZONES[z].npcs) if (!TAMERS[id]) errors.push(`bad npc ${id} in ${z}`);
  for (const [to] of ZONES[z].exits) if (!ZONES[to]) errors.push(`bad exit ${to} in ${z}`);
}
for (const id in TAMERS) for (const [sp] of TAMERS[id].team || []) if (!SPECIES[sp]) errors.push(`bad tamer mon ${sp} in ${id}`);
for (const id in TAMERS) if (!CLASS_LOOK[TAMERS[id].cls]) errors.push('no class look ' + TAMERS[id].cls);

// the other languages (src/core/lang/*.js): the same placeholders as English, no unknown keys; a missing key falls
// back to English in the game (STRICT=1 makes missing keys errors, for a release)
const ph = s => (String(s).match(/\{(\w+)(?:\|[^}]*)?\}/g) || []).map(x => x.replace(/\|[^}]*\}/, '}')).filter((x, i, arr) => arr.indexOf(x) === i).sort().join(',');
for (const [l] of LANGS) {
  if (l === 'en' || l === 'pl') continue;
  const D = I18N[l] || {}, miss = Object.keys(I18N.en).filter(k => D[k] == null);
  for (const k in D) { if (I18N.en[k] == null) errors.push(`[${l}] unknown key ${k}`); else if (ph(D[k]) !== ph(I18N.en[k])) errors.push(`[${l}] placeholders differ in ${k}: ${D[k]}`); }
  console.log(`[${l}] ${Object.keys(D).length} keys, missing ${miss.length}` + (miss.length && miss.length < 40 ? ': ' + miss.join(', ') : ''));
  if (process.env.STRICT && miss.length) errors.push(`[${l}] missing ${miss.length} keys`);
}
console.log(`species: ${Object.keys(SPECIES).length}, moves: ${Object.keys(MOVES).length}, keys en: ${Object.keys(I18N.en).length}, pl: ${Object.keys(I18N.pl).length}`);
if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
console.log('OK');
