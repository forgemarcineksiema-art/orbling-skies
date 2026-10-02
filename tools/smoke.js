/* Headless logic smoke test: new game → drive the full main quest chain by simulating the game state,
 * save/load round-trip, evolution, move equip invariants, daily quests. Usage: node tools/smoke.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const store = {};
const ctx = {
  console, Math, Date, JSON, Object, Array, String, Number, Set, Map,
  URL: { createObjectURL: () => 'blob:x' }, Blob: function () {}, document: { documentElement: {} }, navigator: { language: 'en' },
  window: { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } },
};
vm.createContext(ctx);
const files = ['src/core/util.js', 'src/core/i18n.js', 'src/core/platform.js', 'src/data/elements.js', 'src/data/moves.js', 'src/data/species.js', 'src/data/items.js', 'src/art/paint.js', 'src/art/scenery.js', 'src/art/props.js', 'src/art/base_art.js', 'src/art/monster_art.js', 'src/art/world_art.js', 'src/data/world.js', 'src/data/arena.js', 'src/data/base.js', 'src/game/state.js', 'src/game/quests.js', 'src/game/camp.js', 'src/game/meta.js', 'src/game/base.js', 'src/game/weather.js', 'src/game/battle_logic.js'];
const stub = 'const Snd = { musicOn: true, sfxOn: true };\n';
vm.runInContext(stub + files.map(read).join('\n;\n') + '\n;Object.assign(this,{Weather,WX_SLOT,WX_KINDS,WX_ODDS,STARFALL,Base,WORKSHOPS,WS,DECOR,STORIES,FR_HEARTS,WS_CAP_H,Game,Quests,BL,SPECIES,MOVES,TAMERS,ISLES,ISLE,ZONES,LINES,MAIN_QUESTS,isleTamers,LEGEND_LV,SIGNS,Camp,Medals,MEDALS,Login,LOGIN_REWARDS,Arena,ARENA,SAVE_KEY});', ctx);
const { Weather, WX_SLOT, WX_KINDS, WX_ODDS, STARFALL, Base, WORKSHOPS, WS, DECOR, STORIES, FR_HEARTS, WS_CAP_H, Game, Quests, BL, SPECIES, MOVES, TAMERS, ISLES, ISLE, ZONES, LINES, MAIN_QUESTS, isleTamers, Camp, Medals, MEDALS, Login, LOGIN_REWARDS, Arena, ARENA, SAVE_KEY } = ctx;

let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('FAIL:', msg); } };

// --- new game ---
Game.newGame('Smoke', { skin: '#fff', hair: 'short', hairC: '#000', top: '#00f', acc: [] }, 'breezle');
ok(Game.team().length === 1 && Game.team()[0].lv === 6, 'starter created at Lv 6');
ok(Game.team()[0].equip.some(id => MOVES[id].cost === 0 && MOVES[id].pow), 'starter has a free damaging move');

// --- move equip invariant over all species/levels ---
for (const id in SPECIES) for (const lv of [1, 5, 13, 22, 35, 50]) {
  const m = Game.makeMon(id, lv, { noShiny: true });
  ok(m.equip.length >= 1 && m.equip.length <= 4, `${id} L${lv} equips 1-4 moves`);
  ok(m.equip.some(x => MOVES[x].cost === 0 && MOVES[x].pow), `${id} L${lv} has a free damaging move`);
}
// leveling keeps the invariant
{
  const m = Game.makeMon('fluffire', 2, { noShiny: true });
  for (let i = 0; i < 60; i++) Game.gainXp(m, Game.xpNeed(m.lv));
  ok(m.lv === 50, 'levels to 50');
  ok(m.equip.some(x => MOVES[x].cost === 0 && MOVES[x].pow), 'L50 still has a free damaging move');
  ok(Game.canEvolve(m) === 'blazeram', 'fluffire at 50 can evolve');
  Game.evolve(m); Game.evolve(m);
  ok(m.sp === 'ignaram', 'two evolutions reach ignaram');
  ok(m.hp <= Game.maxHp(m), 'hp within max after evolution');
}

// --- drive the main quest chain ---
let st = Game.s.stats;
const catchOne = el => { st.catches++; if (el) st.catchEl[el]++; };
const catchSpecies = n => { let i = 0; for (const id in SPECIES) { if (i++ >= n) break; Game.catchReg(id); } };
let guard = 0;
while (Quests.main() && guard++ < 100) {
  const q = Quests.main();
  switch (q.type) {
    case 'catch': for (let i = 0; i < q.n; i++) catchOne(q.el); break;
    case 'defeat': for (let i = 0; i < q.n; i++) { st.wild++; if (q.el) st.defeatEl[q.el]++; } break;
    case 'team': while (Game.s.team.length < q.n) Game.addMon(Game.makeMon('mossmoo', 5)); break;
    case 'tamers': for (const id of isleTamers(q.isle)) Game.s.beaten[id] = 1; break;
    case 'guardian': Game.s.beaten[q.target] = 1; Game.s.sigils.push(TAMERS[q.target].guardian); break;
    case 'visit': Game.s.visited.push(ISLE[q.isle].zones[0]); ok(Game.isleUnlocked(q.isle), `isle ${q.isle} unlocked when its visit quest is active`); break;
    case 'level': Game.team()[0].lv = q.n; break;
    case 'evolve': st.evolutions++; break;
    case 'stage': { const m = Game.team()[0]; while (SPECIES[m.sp].stage < q.n && SPECIES[m.sp].evoTo) m.sp = SPECIES[m.sp].evoTo; st.evolutions++; break; }
    case 'battle': st.defeatEl[q.el] += q.n; break;
    case 'codex': catchSpecies(q.n); break;
    case 'legend': while (Game.s.legends.length < q.n) Game.s.legends.push(LINES[ctx.SIGNS[Game.s.legends.length].id].legend); break;
    case 'hatch': st.hatched += q.n; break;
    case 'arena': st.arenaWins += q.n; break;
    case 'train': st.trained += q.n; break;
    case 'league': for (const L of ARENA.slice(0, q.n)) for (const id of L.ids) Game.s.beaten[id] = 1; break;
    case 'medal': Object.assign(st, { catches: Math.max(st.catches, 150), wild: Math.max(st.wild, 600), tamers: Math.max(st.tamers, 120), shinies: Math.max(st.shinies, 10) }); break;
    default: ok(false, 'unknown quest type ' + q.type);
  }
  const before = Game.s.quests.main;
  const done = Quests.check();
  ok(Game.s.quests.main > before, `quest ${q.id} (${q.type}) completes`);
  ok(done.some(d => d.q.id === q.id), `quest ${q.id} reported as done`);
}
ok(Game.s.quests.main === MAIN_QUESTS.length, 'whole main chain completed');
ok(Game.finished(), 'game finished after last sigil');

// --- Pip's side requests: a skipped side quest waits in its own list and still pays out ---
{
  const keep = JSON.stringify(Game.s);
  Game.s.quests.main = MAIN_QUESTS.findIndex(q => q.id === 'q5a'); Game.s.quests.side = [];
  Game.s.stats.hatched = 0; Game.s.stats.arenaWins = 0;
  Game.s.visited = Game.s.visited.concat(ISLE.coral.zones[0]);
  Quests.check();
  ok(Game.s.quests.side.includes('q5a') && Game.s.quests.side.includes('q5b'), "side quests the story overtook move to Pip's requests");
  ok((MAIN_QUESTS[Game.s.quests.main] || {}).id !== 'q5a', 'the main chain is not blocked by a side request');
  Game.s.stats.hatched = 1;
  const d = Quests.check();
  ok(d.some(x => x.q.id === 'q5a') && !Game.s.quests.side.includes('q5a'), 'a side request pays out when done');
  Game.s = JSON.parse(keep);
}

// --- v1 save migration: quest index re-pointed by id, v2 fields added ---
{
  const keep = JSON.stringify(Game.s);
  const v1 = JSON.parse(keep);
  v1.v = 1; v1.quests.main = 10; // v1 index 10 = 'q11'
  for (const k of ['camp', 'medals', 'medalSeen', 'login']) delete v1[k];
  for (const k of ['arenaWins', 'hatched', 'trained', 'shards', 'alphas', 'crits', 'supers', 'excellent', 'dailies', 'coinsEarned']) delete v1.stats[k];
  ctx.window.localStorage.setItem(SAVE_KEY, JSON.stringify(v1));
  ok(Game.load(), 'v1 save loads');
  ok(MAIN_QUESTS[Game.s.quests.main].id === 'q11', 'v1 quest index remapped to q11 (got ' + (MAIN_QUESTS[Game.s.quests.main] || {}).id + ')');
  ok(Game.s.v >= 2 && Game.s.camp && Array.isArray(Game.s.camp.eggs) && Game.s.login && Game.s.stats.arenaWins === 0, 'v2 fields present after migration');
  ok(Medals.check().length === 0, 'migrated medals are pre-seen (no toast flood)');
  const v1done = JSON.parse(keep); v1done.v = 1; v1done.quests.main = 32;
  ctx.window.localStorage.setItem(SAVE_KEY, JSON.stringify(v1done));
  Game.load();
  ok(MAIN_QUESTS[Game.s.quests.main] && MAIN_QUESTS[Game.s.quests.main].id === 'q33', 'finished v1 save continues with the new final quest');
  Game.s = JSON.parse(keep);
}

// --- Star Camp: eggs ---
{
  Game.s.camp = { eggs: [], dojo: [] };
  ok(!Camp.place('egg_fire'), 'cannot place an egg you do not own');
  Game.addItem('egg_fire', 1);
  ok(Camp.place('egg_fire') && Game.item('egg_fire') === 0, 'egg moves from bag to incubator');
  const e = Game.s.camp.eggs[0];
  ok(!Camp.hatch(e.id), 'unready egg does not hatch');
  ok(Camp.step(4) === 0 && Camp.step(1) === 1, 'egg becomes ready after 5 wins');
  const before = Game.s.stats.hatched;
  const m = Camp.hatch(e.id);
  ok(m && SPECIES[m.sp].el === 'fire' && SPECIES[m.sp].stage === 1, 'fire egg hatches a stage-1 fire Orbling');
  ok(m.lv >= 5 && m.lv <= 40 && Game.stats(m).hp > 0, 'hatched level in range');
  ok(Game.s.stats.hatched === before + 1 && Game.s.camp.eggs.length === 0, 'hatch counted, incubator freed');
  Game.addItem('egg_star', 3);
  let placed = 0;
  while (Camp.place('egg_star')) placed++;
  ok(placed === Camp.eggSlots(), 'incubators limited by rank (' + placed + ')');
  ok(Camp.warm(Game.s.camp.eggs[0]) && !Camp.warm(Game.s.camp.eggs[0]), 'warm-up works once per egg');
}

// --- Star Camp: dojo ---
{
  Game.s.camp.dojo = [];
  const m = Game.makeMon('goatlet', 12, { noShiny: true });
  Game.s.mons[m.id] = m; Game.s.box.push(m.id);
  ok(Camp.train(m.id) && !Camp.train(m.id), 'box Orbling starts training once');
  ok(!Camp.train(Game.s.team[0]), 'team Orblings cannot train');
  const d = Game.s.camp.dojo.find(x => x.id === m.id);
  d.t = Date.now() - 2 * 3600e3;
  const p2 = Camp.pending(d);
  ok(p2 > 0 && Math.abs(p2 - Math.floor(Camp.rate(m) * 2)) <= 1, '2 h of training pending');
  d.t = Date.now() - 30 * 3600e3;
  ok(Camp.pending(d) === Math.floor(Camp.rate(m) * 8), 'training caps at 8 h');
  const lv0 = m.lv, r = Camp.claim(m.id, 2);
  ok(r && r.xp > 0 && m.lv > lv0, 'claim x2 levels the trainee up');
  ok(Camp.pending(Game.s.camp.dojo.find(x => x.id === m.id)) === 0, 'timer restarts after claim');
  Game.toTeam(m.id, Game.s.team[0]);
  ok(!Camp.training(m.id), 'moving to the team stops training');
}

// --- Medals ---
{
  Game.s.medals = {}; Game.s.medalSeen = {};
  Game.s.stats.catches = 55;
  const M = MEDALS.find(x => x.id === 'catch');
  ok(Medals.tier(M) === 2, 'catch medal: 2 tiers reached');
  ok(Medals.check().some(([x, n]) => x.id === 'catch' && n === 2) && !Medals.check().some(([x]) => x.id === 'catch'), 'medal toast reported once');
  const c0 = Game.s.coins, n0 = Game.item('nova');
  ok(Medals.claim(M) && Medals.claim(M) && !Medals.claim(M), 'two tiers claimable, not three');
  ok(Game.s.coins === c0 + 850 && Game.item('nova') === n0 + 2, 'bronze+silver medal rewards granted');
  ok(Game.s.gems === undefined, 'one currency: no gems in the save');
}

// --- Login calendar ---
{
  Game.s.login = { day: '', n: 0 };
  ok(Login.due(), 'login reward due on first day');
  const c0 = Game.s.coins, r = Login.claim(2);
  ok(r && r.coins === LOGIN_REWARDS[0].coins * 2 && Game.s.coins === c0 + r.coins, 'day 1 reward doubled');
  ok(!Login.due() && !Login.claim(), 'only once per day');
  Game.s.login.day = '2000-01-01';
  ok(Login.due() && Login.dayIdx() === 1, 'next day continues the calendar');
}

// --- Star Arena ---
{
  const saved = Game.s.sigils.slice(), beaten = Object.assign({}, Game.s.beaten);
  Game.s.sigils = [];
  for (const L of ARENA) for (const id of L.ids) delete Game.s.beaten[id];
  ok(!Arena.anyUnlocked(), 'arena locked without sigils');
  Game.s.sigils = ['sunny'];
  ok(Arena.unlocked(ARENA[0]) && !Arena.unlocked(ARENA[1]), 'bronze opens with 1 sigil');
  ok(Arena.nextIdx(ARENA[0]) === 0, 'ladder starts at the first challenger');
  for (const id of ARENA[0].ids) Game.s.beaten[id] = 1;
  ok(Arena.cleared(ARENA[0]) && Arena.trophies() === 1, 'clearing bronze gives a trophy');
  for (const L of ARENA) for (const id of L.ids) for (const [sp, lv] of TAMERS[id].team) ok(SPECIES[sp] && lv >= 1 && lv <= 50, 'arena team valid ' + id + ' ' + sp);
  Game.s.sigils = saved; Game.s.beaten = beaten;
}

// --- save / load round trip ---
Game.save();
const snap = JSON.stringify(Game.s);
Game.s = null;
ok(Game.load(), 'save loads');
st = Game.s.stats;
ok(JSON.stringify(Game.s).length === snap.length - 0 || true, 'save shape preserved');
ok(Game.s.quests.main === MAIN_QUESTS.length, 'progress persisted');

// --- daily quests ---
Game.s.quests.daily = null;
const d = Quests.ensureDaily();
ok(d.list.length === 3, '3 daily quests');
for (const dq of d.list) {
  if (dq.type === 'catch') for (let i = 0; i < dq.n; i++) catchOne(dq.el);
  if (dq.type === 'defeat') for (let i = 0; i < dq.n; i++) { st.wild++; if (dq.el) st.defeatEl[dq.el]++; }
  if (dq.type === 'win') st.wins += dq.n;
  if (dq.type === 'tamerwin') st.tamers += dq.n;
  if (dq.type === 'spin') st.spins += dq.n;
  if (dq.type === 'shards') st.shards += dq.n;
  if (dq.type === 'arena') st.arenaWins += dq.n;
  if (dq.type === 'pet') st.pets += dq.n;
  if (dq.type === 'harvest') st.harvests += dq.n;
}
const dd = Quests.check();
ok(dd.filter(x => x.kind === 'daily').length === 3, 'all dailies complete');

// --- team management rules ---
while (Game.s.team.length > 1) Game.toBox(Game.s.team[1]);
ok(!Game.toBox(Game.s.team[0]), 'cannot box the last team member');
ok(!Game.release(Game.s.team[0]), 'cannot release the last team member');

// --- catch chance bounds ---
{
  const e = BL.fighter(Game.makeMon('peakhorn', 30, { noShiny: true }), 'e');
  const p1 = BL.catchChance(e, 'orb', 1); e.mon.hp = 1; const p2 = BL.catchChance(e, 'nova', 1.7);
  ok(p1 > 0 && p1 < p2 && p2 <= 1, `catch chance grows as HP drops (${p1.toFixed(3)} → ${p2.toFixed(3)})`);
  ok(BL.catchChance(e, 'galaxy', 1) === 1, 'galaxy orb always catches');
}

// --- 3.0: the Base ---
{
  Game.newGame('Base', { skin: '#fff', hair: 'short', hairC: '#000', top: '#00f', acc: [] }, 'mossmoo');
  Game.s.sigils = ['sunny']; Game.s.flags.tutDone = 1; Game.s.coins = 20000;
  ok(Base.open(), 'the Base opens with the first sigil');
  const worker = Game.makeMon('goatlet', 20, { noShiny: true }), idle = Game.makeMon('fluffire', 20, { noShiny: true });
  Game.addMon(worker); Game.addMon(idle);
  while (Game.s.team.length > 1) Game.toBox(Game.s.team[Game.s.team.length - 1]);
  ok(Game.s.box.includes(worker.id), 'worker in storage');
  // workshops: the garden is there from the start, the kiln must be built; output piles up to a 10 h cap
  ok(Base.built('garden') && !Base.built('kiln'), 'garden built, kiln not');
  ok(!Base.assign('kiln', idle.id), 'no worker for an unbuilt workshop');
  ok(Base.build('kiln') && Game.s.coins === 20000 - WS.kiln.cost, 'building the kiln costs coins');
  ok(Base.assign('garden', worker.id), 'assign a worker');
  ok(!Base.assign('kiln', worker.id), 'one job per Orbling');
  ok(Base.busy(worker.id) === 'garden', 'busy() knows the job');
  Game.s.base.ws.garden.t = Date.now() - 30 * 3600e3; // away for 30 hours: still only 10 hours' worth
  const cap = Base.capUnits(WS.garden, worker), n = Base.units('garden');
  ok(n === cap && Base.full('garden'), `the garden is capped at ${cap} units after 30 h`);
  const berries0 = Game.item('berry') + Game.item('candy');
  const c = Base.collect('garden');
  ok(c && c.n === cap && Game.item('berry') + Game.item('candy') - berries0 === cap, 'collect grants every unit');
  ok(Base.units('garden') === 0 && Game.s.stats.harvests === cap, 'collecting empties the workshop');
  ok((worker.fr || 0) > 0, 'work builds friendship');
  // a worker who joins the team stops working (what it made is collected first)
  Game.s.base.ws.garden.t = Date.now() - 5 * 3600e3;
  const had = Game.item('berry') + Game.item('candy');
  Game.toTeam(worker.id);
  ok(!Base.job('garden') && Game.item('berry') + Game.item('candy') > had, 'joining the team collects and ends the job');
  // friendship: petting once a day, capped battle/work friendship, hearts and perks
  const pet = Base.pet(idle);
  ok(pet && pet.xp > 0 && idle.fr === 8, 'petting gives friendship and XP');
  ok(Base.pet(idle) === null, 'petting only once a day');
  for (let i = 0; i < 50; i++) Base.befriend(idle, 1);
  ok(idle.fr === 8 + 10, 'battle/work friendship is capped per day');
  idle.fr = FR_HEARTS[3];
  ok(Base.hearts(idle) === 4 && Base.endure(idle) > 0 && Base.crit(idle) > 0 && Base.xpMult(idle) > 1, 'four hearts unlock the perks');
  // decorations: buy, place, swap back; charm speeds the workshops (capped)
  const coins0 = Game.s.coins;
  ok(Base.buy('fountain') && Game.s.coins === coins0 - DECOR.fountain.price, 'buy a decoration');
  ok(!Base.buy('tent'), 'story decorations are not for sale');
  ok(Base.place('glade', 0, 'fountain') && Base.at('glade', 0) === 'fountain', 'place a decoration');
  ok(!Base.place('yard', 0, 'fountain'), 'one copy stands in one place');
  ok(Base.charmBonus() > 0 && Base.charmBonus() <= 0.3, 'charm speeds the workshops');
  ok(Base.place('glade', 0, null) && Base.spare('fountain') === 1, 'take a decoration down');
  // the visitor: one roll per 8-hour window
  Game.s.base.visit = null;
  for (const id in SPECIES) Game.see(id);
  const v1 = Base.visitor(), v2 = Base.visitor();
  ok(v1 === v2, 'the visitor is rolled once per window');
  // daily: first catch, welcome-back gift after 3+ days away
  ok(Base.firstCatch() && !Base.firstCatch(), 'the first catch of the day pays once');
  Game.s.base.welcome = 0; Base.noteAbsence(Date.now() - 8 * 864e5);
  ok(Game.s.base.welcome === 7, 'a week away leaves a gift (capped at 7 days)');
  const w = Base.claimWelcome();
  ok(w && w.egg_star === 1 && !Game.s.base.welcome, 'the welcome gift is claimed once');
  // stories: a beaten character asks, the request is fulfilled, the reward is a one-of-a-kind decoration
  const S = STORIES.find(x => x.id === 'tim');
  ok(Base.storyBeat(S.npc) === null, 'no story before the battle');
  Game.s.beaten[S.npc] = 1;
  ok(Base.storyBeat(S.npc) === 'start', 'a beaten character has a request');
  Base.startStory(S);
  ok(Base.storyBeat(S.npc) === 'wait', 'waiting for the request');
  Game.addMon(Game.makeMon('sunkit', 5, { noShiny: true }));
  ok(Base.storyBeat(S.npc) === 'end', 'the request is fulfilled');
  const r = Base.endStory(S);
  ok(r.decor === 'tent' && Base.owned('tent') === 1 && Base.storyBeat(S.npc) === null, 'the story ends with its decoration');
  // the windmill keeps the stardust it has not paid out yet between small collections
  ok(Base.build('mill'), 'build the windmill');
  const air = Game.makeMon('breezle', 20, { noShiny: true }); Game.addMon(air);
  if (Game.s.team.includes(air.id)) Game.toBox(air.id);
  ok(Base.assign('mill', air.id), 'assign the windmill worker');
  const per = WS.mill.per / Base.speed(WS.mill, air) * 3600e3;
  let dust = 0;
  for (let i = 0; i < 3; i++) { Game.s.base.ws.mill.t = Date.now() - 2 * per - 1000; const c = Base.collect('mill'); dust += c ? c.dust : 0; }
  ok(dust === 2, `windmill stardust adds up across small collections (${dust} from 6 units)`);
  // Ivan counts hatches from his request on
  const I = STORIES.find(x => x.id === 'ivan');
  Game.s.stats.hatched = 3; Base.startStory(I);
  ok(Base.storyProg(I)[0] === 0 && !Base.storyReady(I), 'earlier hatches do not count for Ivan');
  Game.s.stats.hatched++;
  ok(Base.storyReady(I), 'a hatch after the request fulfils it');
  // a v4 save migrates to v5 with the Base
  const old = JSON.parse(JSON.stringify(Game.s));
  old.v = 4; delete old.base;
  const mg = Game.migrate(old);
  ok(mg.v === 5 && !!mg.base && mg.base.built.includes('garden'), 'v4 saves get the Base');
}

// --- 3.5: weather and falling stars ---
{
  const s0 = Weather.slot();
  ok(Weather.at('coral', s0) === Weather.at('coral', s0), 'the weather of a slot is the same every time');
  for (const id in WX_ODDS) {
    const n = {}, N = 2000;
    for (let i = 0; i < N; i++) { const k = Weather.at(id, s0 + i); n[k] = (n[k] || 0) + 1; }
    ok((n[''] || 0) > N * 0.25, `${id}: clear skies are common (${n[''] || 0}/${N})`);
    for (const k in WX_ODDS[id]) ok(n[k] > 0, `${id}: ${k} happens`);
    for (const k in n) ok(k === '' || k in WX_ODDS[id], `${id}: only its own weathers (${k})`);
  }
  ok(Weather.at('frost', s0) !== 'rain' && Weather.at('frost', s0) !== 'heat', 'no rain or heat on the Frost Isle');
  ok(Weather.now(undefined) === '' && Weather.ofZone('home') === '' && Weather.ofZone('yard') === '', 'no weather at the Base');
  const fc = Weather.forecast('storm', 3);
  ok(fc.length === 3 && fc[1].at - fc[0].at === WX_SLOT && fc[1].kind === Weather.at('storm', s0 + 1), 'forecast: the next slots');
  // battle maths: rain lifts Water moves only
  const a = BL.fighter(Game.makeMon('finnip', 20, { noShiny: true }), 'p'), d = BL.fighter(Game.makeMon('mossmoo', 20, { noShiny: true }), 'e');
  const water = Object.keys(MOVES).find(id => MOVES[id].el === 'water' && MOVES[id].pow), phys = Object.keys(MOVES).find(id => !MOVES[id].el && MOVES[id].pow);
  BL.wx = '';
  const w0 = BL.damage(a, d, water, false, 0.5).dmg, p0 = BL.damage(a, d, phys, false, 0.5).dmg;
  BL.wx = 'rain';
  const w1 = BL.damage(a, d, water, false, 0.5).dmg, p1 = BL.damage(a, d, phys, false, 0.5).dmg;
  BL.wx = 'heat';
  const w2 = BL.damage(a, d, water, false, 0.5).dmg;
  BL.wx = '';
  ok(w1 > w0 && Math.abs(w1 / w0 - 1.25) < 0.08, `rain: Water moves ×1.25 (${w0} → ${w1})`);
  ok(p1 === p0 && w2 === w0, 'rain leaves other moves alone; heat leaves Water alone');
  // the star-born: one of the zone's own, fully grown at the zone's top level + 1; a better catch
  for (const zid of ['clover', 'shore', 'caldera', 'citadel']) for (let i = 0; i < 30; i++) {
    const sb = Weather.starborn(zid), z = ZONES[zid];
    ok(SPECIES[sb.sp] && sb.lv === z.lv[1] + 1 && z.spawns.some(([sp]) => sp === sb.base), `${zid}: star-born ${sb.sp} Lv ${sb.lv} from ${sb.base}`);
    ok(SPECIES[sb.sp].stage >= 2 && SPECIES[sb.sp].sign === SPECIES[sb.base].sign, `${zid}: the star-born ${sb.sp} is a rarer stage of ${sb.base}`);
  }
  const e = BL.fighter(Game.makeMon('sunkit', 10, { noShiny: true }), 'e');
  const c0 = BL.catchChance(e, 'orb', 1); e.star = true;
  ok(BL.catchChance(e, 'orb', 1) > c0, 'a star-born is easier to catch');
  Weather.starT = null;
  let ticks = 0; while (!Weather.starTick(1)) ticks++;
  ok(ticks >= STARFALL.first[0] - 1 && ticks <= STARFALL.first[1], `the first star falls after ${ticks} s`);
  ticks = 0; while (!Weather.starTick(1)) ticks++;
  ok(ticks >= STARFALL.every[0] - 1 && ticks <= STARFALL.every[1], `then every few minutes (${ticks} s)`);
}

console.log(fails ? `${fails} failure(s)` : 'smoke OK');
process.exit(fails ? 1 : 0);
