/* Balance sanity check: simplified AI-vs-AI duels using the real stat/damage/AI code.
 * Usage: node tools/sim.js */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Set, Map, URL: { createObjectURL: () => 'blob:x' }, Blob: function () {}, document: { documentElement: {} }, navigator: { language: 'en' }, window: {} };
vm.createContext(ctx);
const files = ['src/core/util.js', 'src/core/i18n.js', 'src/data/elements.js', 'src/data/moves.js', 'src/data/species.js', 'src/data/items.js', 'src/art/paint.js', 'src/art/scenery.js', 'src/art/props.js', 'src/art/monster_art.js', 'src/art/world_art.js', 'src/data/world.js', 'src/game/state.js', 'src/game/battle_logic.js'];
vm.runInContext(files.map(read).join('\n;\n') + '\n;Object.assign(this,{Game,BL,SPECIES,MOVES,TAMERS});', ctx);
const { Game, BL, SPECIES, MOVES, TAMERS } = ctx;

function duel(spA, lvA, spB, lvB) {
  const a = BL.fighter(Game.makeMon(spA, lvA, { noShiny: true }), 'p');
  const b = BL.fighter(Game.makeMon(spB, lvB, { noShiny: true }), 'e');
  let turns = 0;
  while (a.mon.hp > 0 && b.mon.hp > 0 && turns < 60) {
    turns++;
    const ma = BL.aiPick(a, b, true), mb = BL.aiPick(b, a, false);
    const aFirst = (MOVES[ma].prio || 0) !== (MOVES[mb].prio || 0) ? (MOVES[ma].prio || 0) > (MOVES[mb].prio || 0) : BL.speed(a) >= BL.speed(b);
    for (const [x, y, m] of aFirst ? [[a, b, ma], [b, a, mb]] : [[b, a, mb], [a, b, ma]]) {
      if (x.mon.hp <= 0 || y.mon.hp <= 0) continue;
      x.en -= BL.cost(x, m);
      const mv = MOVES[m];
      if (mv.pow && Math.random() < BL.hitChance(x, m)) {
        for (let h = 0; h < (mv.hits || 1); h++) y.mon.hp -= BL.damage(x, y, m, Math.random() < BL.critChance(x, m), Math.random()).dmg;
      } else if (mv.cat === 'heal') x.mon.hp = Math.min(x.maxHp, x.mon.hp + Math.ceil(x.maxHp * mv.heal));
      else if (mv.self) for (const k in mv.self) x.stages[k] = Math.max(-3, Math.min(3, x.stages[k] + mv.self[k]));
      else if (mv.foe && !mv.pow) for (const k in mv.foe) y.stages[k] = Math.max(-3, Math.min(3, y.stages[k] + mv.foe[k]));
      if (mv.en) x.en = Math.min(10, x.en + mv.en);
      x.first = false;
    }
    a.en = Math.min(10, a.en + 1); b.en = Math.min(10, b.en + 1);
  }
  return { win: a.mon.hp > 0, turns };
}
function stat(spA, lvA, spB, lvB, n = 300) {
  let w = 0, tt = 0;
  for (let i = 0; i < n; i++) { const r = duel(spA, lvA, spB, lvB); if (r.win) w++; tt += r.turns; }
  return `${spA} L${lvA} vs ${spB} L${lvB}: win ${(w / n * 100).toFixed(0)}%, avg turns ${(tt / n).toFixed(1)}`;
}
const cases = [
  ['sunkit', 6, 'fluffire', 3], ['sunkit', 6, 'mossmoo', 4], ['finnip', 6, 'fluffire', 4], ['mossmoo', 6, 'breezle', 5], ['breezle', 6, 'budlet', 5],
  ['sunkit', 8, 'budlet', 9], ['pridefang', 15, 'clawby', 12], ['pridefang', 20, 'blazeram', 20], ['solmane', 35, 'tempestar', 36],
  ['finnip', 10, 'clawby', 10], ['koiwhirl', 22, 'twinbolt', 24], ['gaiaurus', 40, 'regulion', 45],
];
for (const c of cases) console.log(stat(...c));
