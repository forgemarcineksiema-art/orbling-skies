'use strict';
/* Boot: SDK init, settings, art warm-up with progress bar, global input & lifecycle handlers. */

const VERSION = '3.4.0';
const SETTINGS_KEY = 'orbling_galaxy_settings_v1';

const Main = {
  settings: { music: true, sfx: true, lang: '', fast: false, auto: false, shake: true, lite: null, seenIntro: 0 },
  lite: false,

  async boot() {
    const bar = document.querySelector('#loader .ld-bar i');
    const setP = p => { if (bar) bar.style.width = Math.round(p * 100) + '%'; };
    setP(0.05);
    // while an ad plays no key press reaches the game (Poki QA): this listener is the first on window, in the capture
    // phase (key releases still pass, so a key held when the ad began does not stay pressed afterwards)
    window.addEventListener('keydown', e => { if (Platform.adActive) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    await Platform.init();
    setP(0.15);
    this.loadSettings();
    UI.init();
    // lite mode: chosen in the settings, or guessed from the hardware (and later from the frame rate, probePerf)
    const weak = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory && navigator.deviceMemory <= 2);
    this.setLite(this.settings.lite != null ? !!this.settings.lite : !!weak);
    // warm up art caches so the first scenes pop in instantly, under the loading bar rather than on a black screen:
    // a new player gets the opening and the Star Altar with its first battle (and the two legends of the opening,
    // painted meanwhile); a returning player's save is read now, so their own zone, look, team and the zone's wild
    // Orblings and people are painted before the world shows (3.4)
    const hadSave = Game.hasSave(), returning = hadSave && Game.load();
    const zone = returning ? ZONES[Game.s.loc.zone] || ZONES.clover : null;
    const warm = returning ? [
      () => WArt.bake(zone.biome, zone.seed, zoneTod(zone)), () => WArt.space(7), () => WArt.pip(),
      // the painted sprites all at once, and never more than 2 s of the loader (the paint cache may be cold or slow)
      () => {
        const ps = [WArt.painted(Game.s.look, { urgent: true }),
          ...Game.team().map(m => MonArt.painted(m.sp, { t: 0, urgent: true, shiny: m.shiny })),
          ...[...new Set((zone.spawns || []).map(x => x[0]))].slice(0, 6).map(id => MonArt.painted(id, { t: 0, urgent: true })),
          ...(zone.npcs || []).slice(0, 4).filter(([id]) => TAMERS[id]).map(([id]) => WArt.painted(tamerLook(id), { urgent: true }))];
        return Promise.race([Promise.all(ps.map(p => Promise.resolve(p).catch(() => null))), U.sleep(2000)]);
      },
    ] : [
      () => WArt.space(7), () => WArt.space(3), () => WArt.bake('altar', ALTAR_SEED),
      () => { for (const id of [PR_HERO, PR_FOE]) MonArt.painted(id, { size: 'lg', urgent: true }); }, // painted while the loader runs, not awaited
      ...ISLES.map(is => () => WArt.isle(is.biome)),
      ...STARTERS.map(id => () => MonArt.url(id)),
      ...['fluffire', 'mossmoo', 'breezle', 'budlet', 'zapsy', 'nimbub', 'clawby'].map(id => () => MonArt.url(id)),
      () => WArt.pip(), () => WArt.person(tamerLook('prof')),
    ];
    for (let i = 0; i < warm.length; i++) {
      try { const r = warm[i](); if (r && r.then) await r; } catch (e) { console.warn(e); }
      setP(0.15 + 0.85 * (i + 1) / warm.length);
      if (i % 3 === 2) await new Promise(r => setTimeout(r, 0));
    }
    Platform.onAd(() => { Snd.pauseAll('ad'); Painter.hold('ad', true); UI.holdCheers(1e9); }, () => { Snd.resumeAll('ad'); Painter.hold('ad', false); }); // (cheers wait for the ad to end)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { Snd.pauseAll('hidden'); if (Game.s) Game.save(); }
      else Snd.resumeAll('hidden');
    });
    window.addEventListener('keydown', e => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) e.preventDefault();
    }, { passive: false });
    window.addEventListener('wheel', e => { if (!(e.target.closest && e.target.closest('#modals'))) e.preventDefault(); }, { passive: false });
    window.addEventListener('pagehide', () => { if (Game.s) Game.save(); });
    setInterval(() => { if (Game.s && !Platform.adActive) Game.save(); }, 30000);
    const ld = document.getElementById('loader');
    if (ld) { ld.classList.add('done'); setTimeout(() => ld.remove(), 500); }
    Platform.loadingDone();
    const first = () => { Platform.firstInput(); window.removeEventListener('pointerdown', first, true); window.removeEventListener('keydown', first, true); };
    window.addEventListener('pointerdown', first, true); window.addEventListener('keydown', first, true);
    // a returning player is back in the world at once (3.4: no title screen to click through — Poki counts every
    // menu before play; a new game starts from Settings → reset), and only a save that fails to load shows the title;
    // a new player gets the opening (no click needed: it flows into the Star Altar by itself), or the Altar straight
    // away when the opening was already seen
    if (returning) { Game.s.flags.returning = 1; await UI.go(ExploreScene, { zone: Game.s.loc.zone }); }
    else await UI.go(hadSave ? TitleScene : this.settings.seenIntro ? IntroScene : PrologueScene, {});
    setTimeout(() => this.probePerf(), 3000);
    // paint the whole bestiary quietly in the background (cached in IndexedDB for next time)
    setTimeout(() => { try { MonArt.prefetchAll(); } catch (e) { console.warn(e); } }, returning ? 2500 : 25000);
  },

  /** lite mode for slow devices: every other animation frame, half the particles, no heavy filters (.lite) */
  setLite(on) {
    this.lite = !!on;
    MonArt.setLite(this.lite); VFX.setLite(this.lite);
    const g = document.getElementById('game');
    if (g) g.classList.toggle('lite', this.lite);
  },
  /** if the player never chose: watch ~150 frames while nothing is being painted, and switch lite mode on when most
   *  of them are slow twice in a row (a one-off hiccup does not count) */
  probePerf(tries = 0, strikes = 0) {
    if (this.settings.lite != null || this.lite) return;
    if (document.hidden || Painter.busy()) { if (tries < 30) setTimeout(() => this.probePerf(tries + 1, strikes), 2000); return; }
    let n = 0, slow = 0, last = performance.now();
    const tick = now => {
      if (now - last > 45) slow++;
      last = now;
      if (++n < 150) { requestAnimationFrame(tick); return; }
      if (slow <= 60 || document.hidden) return;
      if (strikes >= 1) this.setLite(true);
      else setTimeout(() => this.probePerf(0, strikes + 1), 15000);
    };
    requestAnimationFrame(tick);
  },
  loadSettings() {
    try {
      const raw = Platform.storeGet(SETTINGS_KEY);
      if (raw) Object.assign(this.settings, JSON.parse(raw));
    } catch (e) { /* ignore */ }
    const lang = this.settings.lang || pickLang(Platform.language()); // the browser's (or CrazyGames') language
    setLang(lang);
    Snd.musicOn = this.settings.music !== false;
    Snd.sfxOn = this.settings.sfx !== false;
  },
  saveSettings() {
    this.settings = { music: Snd.musicOn, sfx: Snd.sfxOn, lang: LANG, fast: !!this.settings.fast, auto: !!this.settings.auto, shake: this.settings.shake !== false, lite: this.settings.lite != null ? !!this.settings.lite : null, seenIntro: this.settings.seenIntro ? 1 : 0 };
    Platform.storeSet(SETTINGS_KEY, JSON.stringify(this.settings));
  },
  refreshLang() {
    if (UI.busyGo) { setTimeout(() => this.refreshLang(), 80); return; } // mid scene change: rebuild once it is over
    if (UI.cur === TitleScene) UI.go(TitleScene, {});
    else if (UI.cur === IntroScene) UI.go(IntroScene, { keep: true });
    else if (UI.cur === ExploreScene && ExploreScene.home) UI.go(ExploreScene, { home: ExploreScene.area || true });
    else if (UI.cur === ExploreScene) { ExploreScene.saveState(); UI.go(ExploreScene, { zone: Game.s.loc.zone, returning: true }); }
    else if (UI.cur === GalaxyScene) UI.go(GalaxyScene, {});
    else if (UI.cur === ArenaScene) UI.go(ArenaScene, { league: ArenaScene.league });
    else if (UI.cur === BattleScene && BattleScene.p && !BattleScene.busy) BattleScene.ready();
  },
};

window.addEventListener('load', () => { Main.boot().catch(e => { console.error(e); const ld = document.getElementById('loader'); if (ld) ld.innerHTML = '<p style="color:#fff;font:20px sans-serif">Error: ' + e.message + '</p>'; }); });
