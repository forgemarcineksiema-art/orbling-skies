/* Seeded 3v3 fights against Guardians, using the actual BattleScene implementation.
 * Usage: SEED=20261014 SIGN=libra N=150 node tools/sim_teams.js */
const { createHarness } = require('./battle_harness');
const seed = +(process.env.SEED || 20261014), sign = process.env.SIGN || 'libra';
const h = createHarness(seed, sign), { Game, TAMERS, ISLES, LINES } = h;
const stageFor = (sign, lv) => { const L = LINES[sign]; return lv >= L.evo[1] ? L.ids[2] : lv >= L.evo[0] ? L.ids[1] : L.ids[0]; };
(async () => {
console.log(`Real BattleScene turns; seed ${seed}, Ascendant ${sign}`);
const starters = [['leo', 'Sunkit'], ['pisces', 'Finnip'], ['taurus', 'Mossmoo'], ['libra', 'Breezle']];
const extras = ['aries', 'virgo', 'gemini', 'aquarius', 'cancer', 'scorpio', 'sagittarius', 'capricorn'];
for (const is of ISLES) {
  const G = TAMERS[is.guardian], lv = is.lv[1];
  const row = [];
  for (const [sign, name] of starters) {
    let w = 0; const N = +(process.env.N || 150);
    for (let i = 0; i < N; i++) {
      const team = [Game.makeMon(stageFor(sign, lv), lv, { noShiny: true }), Game.makeMon(stageFor(extras[i % 8], lv - 2), lv - 2, { noShiny: true }), Game.makeMon(stageFor(extras[(i + 3) % 8], lv - 2), lv - 2, { noShiny: true })];
      const foes = G.team.map(([sp, l]) => Game.makeMon(sp, l, { noShiny: true }));
      if ((await h.fight(team, foes, { kind: 'guardian' })).win) w++;
    }
    row.push(`${name} ${(w / N * 100).toFixed(0)}%`);
  }
  console.log(`${is.id.padEnd(8)} guardian ${G.name.padEnd(7)} @ player Lv ${lv}: ${row.join(' | ')}`);
}

})().catch(e => { console.error(e); process.exitCode = 1; });
