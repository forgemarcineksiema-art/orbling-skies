'use strict';
/* Platform adapter: Poki SDK v2 / CrazyGames SDK v3 / local (no SDK, simulated ads).
 * The build script injects exactly one SDK <script> tag; we detect which one is present. */

const Platform = {
  kind: 'local',
  sdk: null,
  adActive: false,
  playing: false,
  _onAdStart: [],
  _onAdEnd: [],

  async init() {
    try {
      if (window.PokiSDK) {
        this.kind = 'poki';
        await window.PokiSDK.init().catch(() => {});
        if (/[?&]pokiDebug=true/.test(location.search)) window.PokiSDK.setDebug && window.PokiSDK.setDebug(true);
      } else if (window.CrazyGames && window.CrazyGames.SDK) {
        this.kind = 'crazygames';
        this.sdk = window.CrazyGames.SDK;
        await this.sdk.init();
        try { this.sdk.game.loadingStart(); } catch (e) { /* optional */ }
        try {
          this.sdk.game.addSettingsChangeListener(() => { if (typeof Snd !== 'undefined') Snd.applySettings(); });
        } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.warn('[platform] SDK init failed', e);
      this.kind = 'local';
      this.sdk = null;
    }
    // portal build whose SDK was blocked (adblock): no ads, and rewarded ads never pay out
    if (this.kind === 'local' && window.OG_TARGET) this.kind = 'none';
  },

  loadingDone() {
    try {
      if (this.kind === 'poki') window.PokiSDK.gameLoadingFinished();
      else if (this.kind === 'crazygames') this.sdk.game.loadingStop();
    } catch (e) { /* ignore */ }
  },

  /** Poki: gameplayStart fires on the player's first input, never on load; until then it is only remembered */
  inputSeen: false,
  wantStart: false,
  firstInput() {
    if (this.inputSeen) return;
    this.inputSeen = true;
    if (this.wantStart) { this.wantStart = false; this.gameplayStart(); }
  },
  gameplayStart() {
    if (this.playing || this.adActive) return;
    if (!this.inputSeen) { this.wantStart = true; return; }
    this.playing = true;
    try {
      if (this.kind === 'poki') window.PokiSDK.gameplayStart();
      else if (this.kind === 'crazygames') this.sdk.game.gameplayStart();
    } catch (e) { /* ignore */ }
  },
  gameplayStop() {
    this.wantStart = false;
    if (!this.playing) return;
    this.playing = false;
    try {
      if (this.kind === 'poki') window.PokiSDK.gameplayStop();
      else if (this.kind === 'crazygames') this.sdk.game.gameplayStop();
    } catch (e) { /* ignore */ }
  },
  /** a phone or tablet (Poki shows its mobile site, with the pill over the game, on these) */
  mobile() {
    try {
      const ua = navigator.userAgent || '';
      return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) || matchMedia('(pointer: coarse) and (hover: none)').matches;
    } catch (e) { return false; }
  },
  /** is Poki's pill over our top-left corner? (?pill=1 fakes it on any build) */
  pill() {
    if (this._pill == null) this._pill = /[?&]pill=1/.test(location.search) || (this.kind === 'poki' && this.mobile());
    return this._pill;
  },
  happy() {
    try { if (this.kind === 'crazygames') this.sdk.game.happytime(); } catch (e) { /* ignore */ }
  },
  /* ---- analytics: Poki game events (tutorial funnel, isles, firsts) and CrazyGames progress/context ---- */
  track(category, what, action) {
    try { if (this.kind === 'poki' && window.PokiSDK.measure) window.PokiSDK.measure(String(category), String(what), String(action)); } catch (e) { /* ignore */ }
  },
  /** share of the main quest chain completed (CrazyGames shows it with player feedback) */
  progress(frac) {
    try { if (this.kind === 'crazygames' && this.sdk.game.reportGameCompletedPercentage) this.sdk.game.reportGameCompletedPercentage(Math.round(Math.max(0, Math.min(1, frac)) * 100)); } catch (e) { /* ignore */ }
  },
  context(o) {
    try { if (this.kind === 'crazygames' && this.sdk.game.setGameContext) this.sdk.game.setGameContext(o); } catch (e) { /* ignore */ }
  },

  /* ---- when ads may play ----
   * A natural break between two stretches of play (after a battle, travelling to another isle). Never in the first
   * minutes or before the tutorial is over. Poki wants every natural break signalled and decides itself whether an
   * ad plays; CrazyGames asks RPGs to use midgame ads sparingly, so there only the major breaks (trainers,
   * Guardians, the Arena, island travel) are offered. The team revive for an ad is offered once a session. */
  /** can a rewarded ad play at all? (a portal build whose SDK was blocked shows no rewarded offers) */
  adsOk() { return this.kind !== 'none'; },
  bootAt: Date.now(),
  revives: 0,
  async naturalBreak(major) {
    if (Date.now() - this.bootAt < 4 * 60e3 || !(typeof Game !== 'undefined' && Game.s && Game.s.flags.tutDone)) return;
    if (this.kind === 'poki' || major) await this.commercialBreak();
  },
  /** platform forces mute (CrazyGames setting) */
  forcedMute() {
    try { return this.kind === 'crazygames' && !!this.sdk.game.settings.muteAudio; } catch (e) { return false; }
  },

  _adStart() {
    this.adActive = true;
    this._onAdStart.forEach(fn => fn());
  },
  _adEnd() {
    this.adActive = false;
    this._onAdEnd.forEach(fn => fn());
  },
  onAd(start, end) { this._onAdStart.push(start); this._onAdEnd.push(end); },

  /** natural break (between battles, travelling). Resolves when the game may continue. */
  async commercialBreak() {
    const wasPlaying = this.playing;
    this.gameplayStop();
    try {
      if (this.kind === 'poki') {
        await window.PokiSDK.commercialBreak(() => this._adStart());
      } else if (this.kind === 'crazygames') {
        await new Promise(res => {
          this.sdk.ad.requestAd('midgame', {
            adStarted: () => this._adStart(),
            adFinished: () => res(),
            adError: () => res(),
          });
        });
      }
    } catch (e) { /* ignore */ }
    if (this.adActive) this._adEnd();
    if (wasPlaying) this.gameplayStart();
  },

  /** opt-in rewarded ad; resolves true if the reward should be granted */
  async rewardedBreak() {
    const wasPlaying = this.playing;
    this.gameplayStop();
    let ok = false;
    try {
      if (this.kind === 'poki') {
        ok = !!(await window.PokiSDK.rewardedBreak(() => this._adStart()));
      } else if (this.kind === 'crazygames') {
        ok = await new Promise(res => {
          this.sdk.ad.requestAd('rewarded', {
            adStarted: () => this._adStart(),
            adFinished: () => res(true),
            adError: () => res(false),
          });
        });
      } else if (this.kind === 'local') {
        ok = await this._fakeAd();
      }
    } catch (e) { ok = false; }
    if (this.adActive) this._adEnd();
    if (wasPlaying) this.gameplayStart();
    return ok;
  },

  /* local testing: a short simulated rewarded ad */
  _fakeAd() {
    return new Promise(res => {
      this._adStart();
      const root = document.getElementById('game') || document.body;
      const ov = U.el('div', { class: 'fake-ad' }, U.el('div', { class: 'fake-ad-box' }, U.el('b', { text: 'AD' }), U.el('span', { text: 'Simulated rewarded ad (local build)' }), U.el('div', { class: 'fake-ad-bar' }, U.el('i'))));
      root.appendChild(ov);
      setTimeout(() => { ov.remove(); res(true); }, 1600);
    });
  },

  /* ---- persistent storage (CrazyGames Data module when available, else localStorage) ---- */
  storeGet(key) {
    try {
      if (this.kind === 'crazygames' && this.sdk && this.sdk.data) return this.sdk.data.getItem(key);
      return window.localStorage.getItem(key);
    } catch (e) { return null; }
  },
  storeSet(key, val) {
    try {
      if (this.kind === 'crazygames' && this.sdk && this.sdk.data) this.sdk.data.setItem(key, val);
      else window.localStorage.setItem(key, val);
      return true;
    } catch (e) { return false; }
  },
  storeRemove(key) {
    try {
      if (this.kind === 'crazygames' && this.sdk && this.sdk.data) this.sdk.data.removeItem(key);
      else window.localStorage.removeItem(key);
    } catch (e) { /* ignore */ }
  },
  language() {
    try {
      if (this.kind === 'crazygames' && this.sdk.user && this.sdk.user.systemInfo && this.sdk.user.systemInfo.locale) return this.sdk.user.systemInfo.locale;
    } catch (e) { /* ignore */ }
    return navigator.language || 'en';
  },
};
