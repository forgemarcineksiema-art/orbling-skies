/* Team (3v3, sequential) sims vs each Guardian at the player level the isle expects. Usage: node tools/sim_teams.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Set, Map, URL: { createObjectURL: () => 'blob:x' }, Blob: function () {}, document: { documentElement: {} }, navigator: { language: 'en' }, window: {} };
vm.createContext(ctx);
const files = ['src/core/util.js', 'src/core/i18n.js', 'src/data/elements.js', 'src/data/moves.js', 'src/data/species.js', 'src/data/items.js', 'src/art/paint.js', 'src/art/scenery.js', 'src/art/props.js', 'src/art/monster_art.js', 'src/art/world_art.js', 'src/data/world.js', 'src/game/state.js', 'src/game/battle_logic.js'];
vm.runInContext(files.map(read).join('\n;\n') + '\n;Object.assign(this,{Game,BL,SPECIES,MOVES,TAMERS,ISLES,LINES});', ctx);
const { Game, BL, SPECIES, MOVES, TAMERS, ISLES, LINES } = ctx;
const stageFor = (sign, lv) => { const L = LINES[sign]; return lv >= L.evo[1] ? L.ids[2] : lv >= L.evo[0] ? L.ids[1] : L.ids[0]; };
function act(x, y, m) {
  x.en -= BL.cost(x, m);
  const mv = MOVES[m];
  if (mv.pow && Math.random() < BL.hitChance(x, m)) for (let h = 0; h < (mv.hits || 1); h++) y.mon.hp -= BL.damage(x, y, m, Math.random() < BL.critChance(x, m), Math.random()).dmg;
  else if (mv.cat === 'heal') x.mon.hp = Math.min(x.maxHp, x.mon.hp + Math.ceil(x.maxHp * mv.heal));
  else if (mv.self) for (const k in mv.self) x.stages[k] = Math.max(-3, Math.min(3, x.stages[k] + mv.self[k]));
  else if (mv.foe && !mv.pow) for (const k in mv.foe) y.stages[k] = Math.max(-3, Math.min(3, y.stages[k] + mv.foe[k]));
  if (mv.en) x.en = Math.min(10, x.en + mv.en);
  x.first = false;
}
function teamFight(pMons, eMons, hpMult) {
  let pi = 0, ei = 0, a = BL.fighter(pMons[0], 'p'), b = BL.fighter(eMons[0], 'e', { hpMult });
  for (let turn = 0; turn < 200; turn++) {
    const ma = BL.aiPick(a, b, true), mb = BL.aiPick(b, a, true);
    const aFirst = (MOVES[ma].prio || 0) !== (MOVES[mb].prio || 0) ? (MOVES[ma].prio || 0) > (MOVES[mb].prio || 0) : BL.speed(a) >= BL.speed(b);
    for (const [x, y, m] of aFirst ? [[a, b, ma], [b, a, mb]] : [[b, a, mb], [a, b, ma]]) if (x.mon.hp > 0 && y.mon.hp > 0) act(x, y, m);
    a.en = Math.min(10, a.en + 1); b.en = Math.min(10, b.en + 1);
    if (b.mon.hp <= 0) { if (++ei >= eMons.length) return true; b = BL.fighter(eMons[ei], 'e', { hpMult }); }
    if (a.mon.hp <= 0) { if (++pi >= pMons.length) return false; a = BL.fighter(pMons[pi], 'p'); }
  }
  return false;
}
const starters = [['leo', 'Sunkit'], ['pisces', 'Finnip'], ['taurus', 'Mossmoo'], ['libra', 'Breezle']];
const extras = ['aries', 'virgo', 'gemini', 'aquarius', 'cancer', 'scorpio', 'sagittarius', 'capricorn'];
for (const is of ISLES) {
  const G = TAMERS[is.guardian], lv = is.lv[1];
  const row = [];
  for (const [sign, name] of starters) {
    let w = 0; const N = 150;
    for (let i = 0; i < N; i++) {
      const team = [Game.makeMon(stageFor(sign, lv), lv, { noShiny: true }), Game.makeMon(stageFor(extras[i % 8], lv - 2), lv - 2, { noShiny: true }), Game.makeMon(stageFor(extras[(i + 3) % 8], lv - 2), lv - 2, { noShiny: true })];
      const foes = G.team.map(([sp, l]) => Game.makeMon(sp, l, { noShiny: true }));
      if (teamFight(team, foes, 1)) w++;
    }
    row.push(`${name} ${(w / N * 100).toFixed(0)}%`);
  }
  console.log(`${is.id.padEnd(8)} guardian ${G.name.padEnd(7)} @ player Lv ${lv}: ${row.join(' | ')}`);
}
