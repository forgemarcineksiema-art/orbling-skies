/* Seeded AI-vs-AI duels through the real BattleScene turn implementation.
 * Usage: SEED=20261014 SIGN=libra N=300 node tools/sim.js */
const { createHarness } = require('./battle_harness');
const seed = +(process.env.SEED || 20261014), sign = process.env.SIGN || 'libra';
const h = createHarness(seed, sign), { Game } = h;
async function stat(spA, lvA, spB, lvB, n = +(process.env.N || 300)) {
  let wins = 0, turns = 0, timeouts = 0;
  for (let i = 0; i < n; i++) {
    const r = await h.fight([Game.makeMon(spA, lvA, { noShiny: true })], [Game.makeMon(spB, lvB, { noShiny: true })]);
    if (r.win) wins++; if (r.outcome === 'timeout') timeouts++; turns += r.turns;
  }
  return `${spA} L${lvA} vs ${spB} L${lvB}: win ${(wins / n * 100).toFixed(0)}%, avg turns ${(turns / n).toFixed(1)}, timeouts ${timeouts}`;
}
const cases = [
  ['sunkit', 6, 'fluffire', 3], ['sunkit', 6, 'mossmoo', 4], ['finnip', 6, 'fluffire', 4], ['mossmoo', 6, 'breezle', 5], ['breezle', 6, 'budlet', 5],
  ['sunkit', 8, 'budlet', 9], ['pridefang', 15, 'clawby', 12], ['pridefang', 20, 'blazeram', 20], ['solmane', 35, 'tempestar', 36],
  ['finnip', 10, 'clawby', 10], ['koiwhirl', 22, 'twinbolt', 24], ['gaiaurus', 40, 'regulion', 45],
];

(async () => {
  console.log(`Real BattleScene turns; seed ${seed}, Ascendant ${sign}`);
  for (const c of cases) console.log(await stat(...c));
})().catch(e => { console.error(e); process.exitCode = 1; });
