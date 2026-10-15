/* Headless adapter for the actual BattleScene turn/move/status implementation.
 * Only DOM, sound, animations, XP rewards and defeat/ad dialogs are replaced.
 * Each instance owns its state and seeded RNG; no host Math globals are changed. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');

function createHarness(seed = 20261014, ascendant = 'libra') {
  const store = {};
  const quiet = () => {};
  const ctx = {
    console: { ...console }, Math: Object.create(Math), Date, JSON, Object, Array, String, Number, Set, Map, Intl,
    setTimeout, clearTimeout, setInterval, clearInterval,
    URL: { createObjectURL: () => 'blob:test' }, Blob: function () {},
    document: { documentElement: {} }, navigator: { language: 'en' },
    window: { localStorage: {
      getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; },
    } },
    UI: { float: quiet, toast: quiet },
    Snd: { musicOn: true, sfxOn: true, play: quiet },
    FX: new Proxy({}, { get: () => quiet }), VFX: { ok: () => false },
  };
  vm.createContext(ctx);
  const files = ['src/core/util.js', 'src/core/i18n.js', 'src/core/platform.js',
    'src/data/elements.js', 'src/data/moves.js', 'src/data/species.js', 'src/data/items.js',
    'src/art/paint.js', 'src/art/scenery.js', 'src/art/props.js', 'src/art/base_art.js', 'src/art/monster_art.js', 'src/art/world_art.js',
    'src/data/world.js', 'src/data/arena.js', 'src/data/base.js', 'src/game/state.js', 'src/game/quests.js',
    'src/game/camp.js', 'src/game/meta.js', 'src/game/base.js', 'src/game/battle_logic.js', 'src/scenes/battle.js'];
  vm.runInContext(files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n') +
    '\n;Object.assign(this, {Game, BL, Base, Quests, U, SPECIES, MOVES, LINES, ISLES, TAMERS, BattleScene, Platform, SAVE_KEY, SAVE_V});', ctx);
  ctx.Math.random = ctx.U.rng(seed);
  ctx.U.sleep = async () => {};
  ctx.U.anim = async () => {};
  ctx.Game.ascendant = () => ascendant;
  function scene(players, enemies, options = {}) {
    const { Game, BL, BattleScene } = ctx;
    Game.s = Game.blank(); Game._loadFailed = false;
    for (const m of players) Game.addMon(m);
    const slot = () => ({ wrap: { classList: { toggle: quiet } }, spr: { style: {} } });
    const b = Object.assign(Object.create(BattleScene), {
      p0: {}, kind: options.kind || 'wild', T: { name: 'Opponent' }, eTeam: enemies,
      over: false, busy: false, outcome: null, alpha: !!options.alpha, charge: null,
      enMap: {}, stMap: {}, firstMap: {}, endured: new Set(), monP: slot(), monE: slot(),
      say: async () => {}, faintFx: async () => {}, orbIn: async () => {}, awardXp: async () => {},
      setSprite(sl, f) { f.slot = sl; }, renderCard: quiet, renderMoves: quiet,
      updHp: quiet, updEn: quiet, updStatus: quiet, statusOverlay: quiet,
      hitFx: quiet, statusFx: quiet, stageFx: quiet, center: () => [0, 0],
      ready() { this.busy = false; }, autoOn: () => true,
      async victory() { this.over = true; this.outcome = 'won'; },
      async defeat() { this.over = true; this.outcome = 'lost'; },
    });
    b.p = BL.fighter(players[0], 'p');
    b.e = BL.fighter(enemies[0], 'e', options.hpMult ? { hpMult: options.hpMult } : {});
    b.e.alpha = b.alpha;
    b.setSprite(b.monP, b.p); b.setSprite(b.monE, b.e);
    return b;
  }
  async function fight(players, enemies, options = {}) {
    const b = scene(players, enemies, options);
    let turns = 0;
    while (!b.over && turns < (options.maxTurns || 200)) {
      turns++;
      await b.turn({ type: 'move', id: ctx.BL.aiPick(b.p, b.e, true) });
    }
    return { win: b.outcome === 'won', outcome: b.outcome || 'timeout', turns };
  }
  return { ...ctx, store, scene, fight };
}

module.exports = { createHarness };
