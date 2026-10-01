'use strict';
/* Meta progression: Medals (21 tracks × bronze/silver/gold, rewards claimed in the Tamer Card) and the
 * 7-day login calendar (cumulative: missing a day never resets it). */

/* [id, icon, stat(save), tiers] */
const MEDALS = [
  ['catch', 'orb', s => s.stats.catches, [10, 50, 150]],
  ['codex', 'codex', () => Game.codexCount(), [12, 24, 48]],
  ['shiny', 'star', s => s.stats.shinies, [1, 3, 10]],
  ['wild', 'swords', s => s.stats.wild, [25, 150, 600]],
  ['tamer', 'team', s => s.stats.tamers, [10, 40, 120]],
  ['evolve', 'evolve', s => s.stats.evolutions, [3, 15, 40]],
  ['level', 'up', () => Game.maxLevel(), [20, 35, 50]],
  ['sigil', 'medal', s => s.sigils.length, [2, 4, 6]],
  ['legend', 'telescope', s => s.legends.length, [1, 4, 12]],
  ['arena', 'arena', s => s.stats.arenaWins, [5, 25, 80]],
  ['league', 'trophy', () => Arena.trophies(), [1, 3, 5]],
  ['hatch', 'egg', s => s.stats.hatched, [1, 10, 30]],
  ['train', 'dojo', s => s.stats.trained, [3, 20, 60]],
  ['shard', 'shard', s => s.stats.shards, [25, 150, 500]],
  ['alpha', 'crown', s => s.stats.alphas, [1, 10, 30]],
  ['crit', 'bolt', s => s.stats.crits, [20, 150, 600]],
  ['super', 'flame', s => s.stats.supers, [50, 300, 1200]],
  ['throw', 'target', s => s.stats.excellent, [5, 30, 100]],
  ['rank', 'badge', s => s.tamer.lv, [5, 15, 30]],
  ['daily', 'quests', s => s.stats.dailies, [5, 30, 100]],
  ['rich', 'coin', s => s.stats.coinsEarned, [5000, 50000, 250000]],
  ['friend', 'heart', () => Game.allMons().filter(m => Base.hearts(m) >= 3).length, [1, 5, 15]],
  ['decor', 'hammer', () => Base.ownedKinds(), [1, 6, 16]],
].map(([id, icon, stat, tiers]) => ({ id, icon, stat, tiers }));
const MEDAL = Object.fromEntries(MEDALS.map(M => [M.id, M]));
const MEDAL_REWARDS = [{ coins: 250 }, { coins: 600, nova: 2 }, { coins: 1000, egg_star: 1 }];
const MEDAL_COL = ['#d9894a', '#b8c4dc', '#ffc21a'];

const Medals = {
  value(M) { return M.stat(Game.s) || 0; },
  /** tiers reached (0..3) */
  tier(M) { const v = this.value(M); return M.tiers.filter(x => v >= x).length; },
  claimed(M) { return Game.s.medals[M.id] || 0; },
  claimable() { return MEDALS.filter(M => this.tier(M) > this.claimed(M)); },
  count() { return MEDALS.reduce((n, M) => n + this.claimed(M), 0); },
  /** tiers earned so far, claimed or not (quests count these) */
  reached() { return MEDALS.reduce((n, M) => n + this.tier(M), 0); },
  claim(M) {
    const c = this.claimed(M);
    if (this.tier(M) <= c) return null;
    Game.s.medals[M.id] = c + 1;
    const r = Object.assign({}, MEDAL_REWARDS[c]);
    Game.grant(r);
    return r;
  },
  /** tiers reached since the last check (for "Medal earned!" toasts) */
  check() {
    const seen = Game.s.medalSeen, out = [];
    for (const M of MEDALS) {
      const n = this.tier(M);
      if (n > (seen[M.id] || 0)) { out.push([M, n]); seen[M.id] = n; }
    }
    return out;
  },
  /** mark everything reached as seen (used when an old save gains the medal system) */
  seeAll() { for (const M of MEDALS) Game.s.medalSeen[M.id] = this.tier(M); },
};

const LOGIN_REWARDS = [{ coins: 150 }, { orb: 5 }, { potion: 3, ether: 1 }, { candy: 1 }, { nova: 3 }, { egg_star: 1 }, { candy: 2, coins: 300 }];
const Login = {
  due() { return !!Game.s && Game.s.login.day !== U.today(); },
  dayIdx() { return Game.s.login.n % LOGIN_REWARDS.length; },
  /** claim today's reward (mult 2 after a rewarded ad) */
  claim(mult = 1) {
    if (!this.due()) return null;
    const r = {};
    for (const [k, v] of Object.entries(LOGIN_REWARDS[this.dayIdx()])) r[k] = v * mult;
    Game.s.login.n++;
    Game.s.login.day = U.today();
    Game.grant(r);
    return r;
  },
};
