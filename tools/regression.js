/* Regressions for storage failures, damaged saves and battle traits.
 * Usage: node tools/regression.js */
const assert = require('node:assert/strict');
const { createHarness } = require('./battle_harness');

(async () => {
  const h = createHarness(), { Game, BL, Platform, LINES, SAVE_KEY, SAVE_V } = h;
  const fresh = () => Game.newGame('Test', Game.blank().look, 'sunkit');
  fresh();
  assert.equal(h.Base.open(), false, 'base is not introduced before the first catch');
  Game.s.stats.catches = 1;
  assert.equal(h.Base.open(), true, 'first catch unlocks direct base access without eggs or sigils');
  Game.s.beaten = { t_tim: 1, t_lily: 1 };
  const remaining = h.Quests.tamerTargets({ type: 'tamers', isle: 'sunny' }).filter(x => !x.beaten);
  assert.deepEqual(Array.from(remaining, x => x.id), ['t_owen', 't_zoe']);
  assert.ok(remaining.every(x => x.zone === 'whisper'));
  assert.equal(Game.guardianOpen('sunny'), false, 'route guidance does not bypass the guardian gate');
  Game.s.beaten.t_owen = 1; Game.s.beaten.t_zoe = 1;
  assert.equal(Game.guardianOpen('sunny'), true);
  assert.equal(h.Quests.tamerTargets({ type: 'tamers', isle: 'sunny' }).filter(x => !x.beaten).length, 0);
  fresh();
  const set = Platform.storeSet, saved = h.store[SAVE_KEY], savedAt = Game.s.savedAt;
  Platform.storeSet = () => false;
  assert.equal(Game.save(), false);
  assert.equal(Game._dirty, true);
  assert.equal(Game.s.savedAt, savedAt);
  assert.equal(h.store[SAVE_KEY], saved);
  let notices = 0;
  h.UI.toasts = {}; h.UI.toast = () => { notices++; }; Game._saveFailed = false;
  Game.save(); Game.save(); assert.equal(notices, 1, 'one warning per consecutive storage failure');
  Platform.storeSet = set;
  assert.equal(Game.save(), true); assert.equal(Game._dirty, false); assert.equal(Game._saveFailed, false);
  Platform.storeSet = () => false; Game.save(); assert.equal(notices, 2, 'new warning after a later failure');
  Platform.storeSet = set;

  h.console.warn = () => {}; // expected rejection paths below are assertions, not unexpected errors
  for (const change of [d => { d.camp.dojo = null; }, d => { d.team.push('missing'); }, d => { d.v = SAVE_V + 1; }, d => { d.mons[d.team[0]].sp = 'missing'; }]) {
    fresh(); const d = JSON.parse(h.store[SAVE_KEY]); change(d);
    const raw = JSON.stringify(d); h.store[SAVE_KEY] = raw; Game.s = null;
    assert.equal(Game.load(), false); assert.equal(Game.s, null); assert.equal(Game._loadFailed, true);
    assert.equal(Game.save(), false); assert.equal(h.store[SAVE_KEY], raw, 'failed load never overwrites the original');
  }
  const originalTimer = h.setTimeout;
  h.setTimeout = fn => { queueMicrotask(fn); return 0; };
  h.window.OG_TARGET = 'poki'; h.window.PokiSDK = { init: () => new Promise(() => {}) };
  await Platform.init();
  assert.equal(Platform.kind, 'none', 'a stalled portal SDK must not block startup or enable simulated rewards');
  delete h.window.PokiSDK;
  h.window.CrazyGames = { SDK: { init: () => new Promise(() => {}) } };
  await Platform.init(); assert.equal(Platform.kind, 'none'); assert.equal(Platform.sdk, null);
  delete h.window.CrazyGames; delete h.window.OG_TARGET;
  h.setTimeout = originalTimer; Platform.kind = 'local';

  fresh();
  const d = JSON.parse(h.store[SAVE_KEY]); delete d.base.decor.yard; delete d.stats.catchEl.air;
  h.store[SAVE_KEY] = JSON.stringify(d); Game.s = null;
  assert.equal(Game.load(), true); assert.deepEqual(Array.from(Game.s.base.decor.yard), []);
  assert.equal(Game.s.stats.catchEl.air, 0, 'missing nested legacy fields are filled');

  const released = Game.makeMon('breezle', 4); Game.addMon(released);
  assert.equal(Game.release(released.id), true);
  assert.equal(Game.release(released.id), false, 'a stale confirmation cannot release/reward the same monster twice');
  assert.equal(Game.release(Game.s.team[0]), false, 'the final team member remains protected');

  const mon = (sign, lv = 20) => Game.makeMon(LINES[sign].ids[0], lv, { noShiny: true });
  const aries = mon('aries'), partner = mon('leo');
  let b = h.scene([aries, partner], [mon('taurus')]);
  await b.useMove(b.p, b.e, aries.equip[0]);
  await b.switchPlayer(1); await b.switchPlayer(0);
  assert.equal(b.p.first, false, 'switching back cannot renew First Strike');
  aries.hp = Game.maxHp(aries); partner.hp = Game.maxHp(partner);
  b = h.scene([aries, partner], [mon('taurus')]);
  assert.equal(b.p.first, true, 'a new battle renews First Strike');
  await b.useMove(b.p, b.e, aries.equip[0]); await b.sendPlayer(0);
  assert.equal(b.p.first, false, 'a revive/resend also keeps First Strike consumed');

  b = h.scene([mon('sagittarius')], [mon('pisces')]);
  h.Math.random = () => 0;
  let hp = b.e.mon.hp;
  await b.attack(b.p, b.e, 'arrow_shot');
  assert.ok(b.e.mon.hp < hp, 'Marksman/sure-hit damages Pisces even on a dodge roll');
  b = h.scene([mon('leo')], [mon('pisces')]); hp = b.e.mon.hp;
  await b.attack(b.p, b.e, 'arrow_shot'); assert.ok(b.e.mon.hp < hp, 'sure-hit works without Marksman');
  b = h.scene([mon('sagittarius')], [mon('pisces')]); hp = b.e.mon.hp;
  await b.attack(b.p, b.e, 'tackle'); assert.ok(b.e.mon.hp < hp, 'Marksman works without sure-hit');
  b = h.scene([mon('leo')], [mon('pisces')]); hp = b.e.mon.hp;
  await b.attack(b.p, b.e, 'tackle'); assert.equal(b.e.mon.hp, hp, 'ordinary attacks can still be dodged');

  b = h.scene([mon('aquarius')], [mon('taurus')]); b.p.en = 9;
  await b.endTurn(); assert.equal(b.p.en, 11); await b.endTurn(); assert.equal(b.p.en, 13);
  const run = async () => { const x = createHarness(123); return x.fight([x.Game.makeMon('sunkit', 6)], [x.Game.makeMon('fluffire', 3)]); };
  assert.deepEqual(await run(), await run(), 'seeded real-turn simulations are repeatable');
  console.log('regression OK');
})().catch(e => { console.error(e); process.exitCode = 1; });
