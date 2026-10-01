'use strict';
/* UI core: the stage (1280x720 landscape, or 540 wide in portrait) scaled to fit, scene switching, modals, NPC dialog, toasts,
 * reward popups, floating text/particles and the exploration HUD. */

const UI = {
  cur: null, stack: [], scale: 1, ox: 0, oy: 0, busyGo: false, talking: 0, _talkEnd: [], W: GW, H: GH, portrait: false,

  init() {
    try { document.documentElement.style.setProperty('--stars', `url(${WArt.starTile()})`); document.documentElement.style.setProperty('--zwheel', `url(${WArt.zodiacWheel()})`); document.documentElement.style.setProperty('--swirl', `url(${HudArt.swirl()})`); } catch (e) { /* ignore */ }
    this.root = document.getElementById('game');
    for (const id of ['scene', 'hud', 'modals', 'toasts', 'fx', 'fade']) {
      this[id] = U.el('div', { id });
      this.root.appendChild(this[id]);
    }
    this.fade.style.opacity = 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    this.root.addEventListener('pointerdown', e => {
      Snd.unlock();
      const b = e.target.closest('.btn, .snd');
      if (b && !b.disabled && !b.classList.contains('nosnd')) Snd.play('click');
    }, true);
    // a touch only counts as a user gesture on its release (pointerup / touchend; iOS: touchend or click), and keyboard
    // players never press the pointer at all: sound unlocks on any of them, so the first tap of the opening is enough
    for (const ev of ['pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(ev, () => Snd.unlock(), true);
    this.root.addEventListener('contextmenu', e => e.preventDefault());
    // Esc closes the menu page or popup on top (when it can be closed)
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && this.stack.length) { const h = this.stack[this.stack.length - 1]; if (h.closable) { e.preventDefault(); e.stopImmediatePropagation(); h.close(); } } });
    // the stage must never scroll (a focused button near an edge used to shift the whole game up for good)
    this.root.addEventListener('scroll', () => { if (this.root.scrollTop || this.root.scrollLeft) { this.root.scrollTop = 0; this.root.scrollLeft = 0; } });
  },
  /** Two stage modes. Landscape: the classic 1280×720 stage. Portrait (a phone held upright, or any tall window):
   *  a 540-wide stage whose height follows the screen, so text and buttons stay big; the world and the battle arena
   *  keep their 1280×720 coordinates inside a scaled "stage16" and the HUD, plates, controls and menus get their own
   *  layout (CSS under #game.port). Turning the phone re-lays the current scene out without losing anything. */
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const port = h > w * 1.1;
    const W = port ? PW : GW, H = port ? U.clamp(Math.round(PW * h / w), 880, 1300) : GH;
    const s = Math.min(w / W, h / H);
    const changed = this.portrait !== port || this.H !== H;
    this.W = W; this.H = H; this.scale = s; this.ox = (w - W * s) / 2; this.oy = (h - H * s) / 2;
    this.root.style.width = W + 'px'; this.root.style.height = H + 'px';
    this.root.style.transform = `translate(${this.ox}px, ${this.oy}px) scale(${s})`;
    this.root.classList.toggle('port', port);
    this.root.style.setProperty('--H', H + 'px');
    this.portrait = port;
    this.pillZone(w, s);
    if (changed && this.cur && this.cur.layout && !this.busyGo) this.cur.layout();
  },
  /** Poki's mobile site lays its own "pill" (a back-to-Poki button) over the game's top-left corner: 62×46 px at 24 px
   *  from the top (92×64 on screens 1211 px and wider). Nothing of ours may sit under it, so the corner is reserved:
   *  --pl is its width and --pb its bottom edge in stage px, and #game.pk-pill moves the top-left UI out of the way.
   *  (?pill=1 shows the zone on any build, for testing.) */
  pillZone(w, s) {
    const on = Platform.pill();
    let pl = 0, pb = 0;
    if (on) {
      const big = w >= 1211, pw = big ? 92 : 62, ph = big ? 64 : 46, top = 24, gap = 8;
      pl = Math.max(0, Math.ceil((pw + gap - this.ox) / s));
      pb = Math.max(0, Math.ceil((top + ph + gap - this.oy) / s));
    }
    const any = pl > 0 && pb > 0;
    this.root.classList.toggle('pk-pill', any);
    this.root.style.setProperty('--pl', (any ? pl : 0) + 'px');
    this.root.style.setProperty('--pb', (any ? pb : 0) + 'px');
    this.pill = any ? { pl, pb } : null;
  },
  /** the world / arena of the current scene sits in a 1280×720 "stage16" moved by transform t (portrait only);
   *  the effects layer follows it so every effect lands where it did in landscape */
  stageXform(t) {
    if (!this.portrait || !t) { this.fx.classList.remove('stage16'); this.fx.style.transform = ''; return; }
    this.fx.classList.add('stage16');
    this.fx.style.transform = t;
  },
  toGame(cx, cy) { return [(cx - this.ox) / this.scale, (cy - this.oy) / this.scale]; },
  /** a point of the landscape screen (x = 640, height y) as effects-layer coordinates, so a burst over a popup lands on
   *  the popup in portrait too (popups hang near the top there) */
  mid(y = 300) {
    if (!this.portrait) return [640, y];
    return this.toFx(this.ox + this.W / 2 * this.scale, this.oy + (y + 40) * this.scale);
  },
  /** client → effects-layer coordinates (in portrait the layer follows the world / the arena) */
  toFx(cx, cy) {
    const r = this.fx.getBoundingClientRect(), w = this.fx.offsetWidth || 1, h = this.fx.offsetHeight || 1;
    return [(cx - r.left) * w / (r.width || 1), (cy - r.top) * h / (r.height || 1)];
  },

  /* ---------------- scenes ---------------- */
  async go(scene, params, o = {}) {
    if (this.busyGo) return;
    this.busyGo = true;
    this.holdCheers(); // a cheer that just came up (a battle's spoils) is shown again in the next scene
    this.root.classList.remove('zb-on');
    for (const b of this.hud.querySelectorAll('.zbanner')) b.remove();
    const wipe = o.trans === 'battle';
    let lay = null;
    try {
      if (wipe) { this.fade.style.pointerEvents = 'auto'; await this.wipe(true); } else await this.fadeTo(1);
      if (this.cur && this.cur.exit) this.cur.exit();
      this.closeAll(true);
      this._talkEnd.forEach(fn => fn()); this._talkEnd = []; this.talking = 0;
      this.modals.innerHTML = '';
      this.scene.innerHTML = '';
      this.scene.className = '';
      this.fx.innerHTML = '';
      this.cur = scene;
      this.hudShow(false);
      this.stageXform('');
      lay = this.portrait + ':' + this.H;
      await scene.enter(params || {});
    } catch (e) { console.error(e); }
    if (wipe) { await this.wipe(false); this.fade.style.pointerEvents = 'none'; } else await this.fadeTo(0);
    this.busyGo = false;
    // the phone was turned while the scene was being built: lay it out for the orientation it ended up in
    if (lay && lay !== this.portrait + ':' + this.H && this.cur && this.cur.layout) this.cur.layout();
  },
  /** battle transition: diagonal stripes sweep in (cover) / out */
  wipe(cover) {
    return new Promise(res => {
      let w = document.getElementById('wipe');
      if (!w) { w = U.el('div', { id: 'wipe' }); this.root.appendChild(w); }
      // enough stripes for the screen (the portrait stage is up to 1300 tall), sweeping in the same ~0.6 s
      const need = Math.max(7, Math.ceil((this.H + 200) / 120));
      while (w.children.length < need) w.appendChild(U.el('i', { style: { top: (w.children.length * 120 - 60) + 'px' } }));
      const bars = Array.from(w.children), step = 245 / bars.length;
      w.style.display = 'block';
      if (cover) Snd.play('whoosh');
      bars.forEach((b, i) => {
        const from = i % 2 ? 'translateX(110%)' : 'translateX(-110%)', to = i % 2 ? 'translateX(-110%)' : 'translateX(110%)';
        U.anim(b, cover ? [{ transform: from }, { transform: 'translateX(0)' }] : [{ transform: 'translateX(0)' }, { transform: to }], { duration: 300, delay: i * step, easing: cover ? 'cubic-bezier(.3,.9,.4,1)' : 'cubic-bezier(.6,0,.8,.4)', fill: 'forwards' });
      });
      setTimeout(() => { if (!cover) w.style.display = 'none'; res(); }, 300 + 245 + 40);
    });
  },
  fadeTo(v, ms = 260) {
    return new Promise(res => {
      this.fade.style.transition = `opacity ${ms}ms ease`;
      this.fade.style.opacity = v;
      this.fade.style.pointerEvents = v ? 'auto' : 'none';
      setTimeout(res, ms + 30);
    });
  },

  /* ---------------- modals ---------------- */
  /** a full-screen menu page (Team, an Orbling's page, the Trainer Card, the Codex, the Bag …): a sky backdrop, a top
   *  bar with a back button and the title (o.bar: extra things on its right), the page below. Same stack as popups. */
  sheet(o) { return this.modal(Object.assign({}, o, { sheet: true })); },
  modal(o) {
    const back = U.el('div', { class: 'modal-back' + (o.sheet ? ' sheet-back' : '') });
    const box = U.el('div', { class: 'modal ' + (o.sheet ? 'sheet ' : '') + (o.cls || '') });
    const h = {
      el: box, back, closed: false, closable: o.closable !== false,
      close: (silent) => {
        if (h.closed) return;
        h.closed = true;
        this.stack = this.stack.filter(x => x !== h);
        if (!this.stack.length) this.root.classList.remove('modal-on');
        if (!this.stack.length && this.inGameplay()) Platform.gameplayStart();
        if (!this.stack.length && this.toastQ && this.toastQ.length) setTimeout(() => this.flushToasts(), 300);
        back.classList.add('out');
        setTimeout(() => back.remove(), 170);
        if (!silent) Snd.play('close');
        if (o.onClose) o.onClose();
      },
    };
    if (o.sheet) {
      if (!o.bare) box.appendChild(U.el('div', { class: 'sh-bar' },
        U.el('button', { class: 'sh-back snd nosnd', title: t('ui.back'), html: WArt.icon('back', 30), onclick: () => h.close() }),
        U.el('b', { class: 'sh-title', text: o.title || '' }), o.bar || null));
      o.body.classList.add('sh-body');
    } else {
      if (o.title) box.appendChild(U.el('div', { class: 'ribbon ' + (o.color || '') }, o.title));
      if (o.closable !== false) box.appendChild(U.el('button', { class: 'xbtn snd nosnd', html: WArt.icon('close', 24), onclick: () => h.close() }));
    }
    box.appendChild(o.body);
    back.appendChild(box);
    back.addEventListener('pointerdown', e => { if (e.target === back && !o.sheet && o.closable !== false && o.backClose !== false) h.close(); });
    this.modals.appendChild(back);
    this.stack.push(h);
    // toasts never sit on a window's title: with a window open they move to the page bar (portrait: the bottom edge);
    // the ones left over from before fade away, but news from this very moment (a level-up just before an evolution
    // page) stays readable
    this.root.classList.add('modal-on');
    this.holdCheers(); // a cheer that only just came up waits for the window to close; older ones fade with the toasts
    const now = performance.now();
    for (const e of this.toasts.children) if (now - (e._t || 0) > 500 || e.classList.contains('cheer')) e.classList.add('out'); // (a cheer is too big to stay over a window)
    if (this.stack.length === 1 && this.inGameplay()) Platform.gameplayStop();
    if (!o.silent) Snd.play('open');
    return h;
  },
  flushToasts() {
    if (this.stack.length) return; // another popup opened meanwhile: wait for it to close
    const q = this.toastQ || [];
    this.toastQ = [];
    q.forEach(([html, cls, sound], i) => setTimeout(() => this.toast(html, cls, { defer: true, sound }), i * 450));
  },
  /** close every window, including any that an onClose handler opens meanwhile (a quest reward popup) */
  closeAll(silent) {
    for (let n = 0; this.stack.length && n < 20; n++) for (const h of this.stack.slice()) h.close(silent);
    this.stack = [];
    this.root.classList.remove('modal-on');
  },
  anyModal() { return this.stack.length > 0 || this.talking > 0; },
  /** menus pause gameplay for the portal SDK; the title screen and the opening film are never gameplay */
  inGameplay() { return !!this.cur && this.cur !== TitleScene && this.cur !== PrologueScene; },

  confirm(html, yes, no) {
    return new Promise(res => {
      let done = false;
      const fin = v => { done = true; h.close(true); res(v); };
      const body = U.el('div', { class: 'confirm' },
        U.el('p', { html }),
        U.el('div', { class: 'row' },
          U.el('button', { class: 'btn red', onclick: () => fin(false) }, no || t('ui.no')),
          U.el('button', { class: 'btn green', onclick: () => fin(true) }, yes || t('ui.yes'))));
      const h = this.modal({ body, cls: 'small', onClose: () => { if (!done) res(false); } });
    });
  },
  alert(html, ok) {
    return new Promise(res => {
      const body = U.el('div', { class: 'confirm' }, U.el('p', { html }), U.el('div', { class: 'row' }, U.el('button', { class: 'btn green', onclick: () => h.close(true) }, ok || t('ui.ok'))));
      const h = this.modal({ body, cls: 'small', onClose: res });
    });
  },

  /* ---------------- NPC dialog ----------------
   * cinematic letterbox, a big portrait of whoever speaks, a white comic speech bubble with a tail,
   * hand-lettered text, a green "next" arrow and a Skip button for longer conversations */
  portrait(who) {
    const box = U.el('div', { class: 'portrait' });
    if (who === 'pip') box.appendChild(U.img(WArt.pip(), 'pp-pip'));
    else if (who === 'player') box.appendChild(U.img(WArt.person(Game.s.look), 'pp-person'));
    else if (TAMERS[who]) box.appendChild(U.img(WArt.person(tamerLook(who)), 'pp-person'));
    else if (SPECIES[who]) box.appendChild(U.img(MonArt.url(who), 'pp-mon'));
    return box;
  },
  bigPortrait(who) {
    const box = U.el('div', { class: 'tp-in' });
    if (who === 'pip') { box.classList.add('pip'); box.appendChild(U.img(WArt.pip(), 'tp-pip')); }
    else if (SPECIES[who]) { box.classList.add('mon'); box.appendChild(U.img(MonArt.url(who), 'tp-mon')); }
    else box.appendChild(U.img(WArt.portrait(who === 'player' ? Game.s.look : tamerLook(who)), 'tp-person'));
    return box;
  },
  whoName(who) {
    if (who === 'pip') return 'Pip';
    if (who === 'player') return Game.s.name;
    if (who === 'prof') return t('cls.professor') + ' ' + TAMERS.prof.name;
    if (TAMERS[who]) return (TAMERS[who].guardian ? t('gt.' + who) : t('cls.' + TAMERS[who].cls)) + ' ' + TAMERS[who].name;
    if (SPECIES[who]) return SPECIES[who].name;
    return who;
  },
  /** lines: [{who, text}] → resolves after the last line. o.auto: every line also moves on by itself once it has had
   *  time to be read (the opening's dialogue needs no taps — portal onboarding) */
  talk(lines, o = {}) {
    return new Promise(res => {
      this.talking++;
      const back = U.el('div', { class: 'talk-back' });
      const por = U.el('div', { class: 'talk-por' });
      const box = U.el('div', { class: 'talk' });
      const name = U.el('div', { class: 'talk-name' });
      const txt = U.el('div', { class: 'talk-text' });
      const next = U.el('div', { class: 'talk-next', html: `<img src="${HudArt.next()}">` });
      box.append(name, txt, next);
      const skip = lines.length > 1 ? U.el('button', { class: 'talk-skip snd', text: t('ui.skip') }) : null;
      back.append(U.el('i', { class: 'lb top' }), U.el('i', { class: 'lb bot' }), por, box);
      if (skip) back.appendChild(skip);
      this.modals.appendChild(back);
      let i = -1, typing = null, full = '', lastWho = null, autoT = 0;
      const hold = () => { clearTimeout(autoT); if (o.auto) autoT = setTimeout(() => { if (ended) return; if (document.hidden) hold(); else show(); }, Math.max(2600, full.replace(/<[^>]+>/g, '').length * 48)); };
      const show = () => {
        clearTimeout(autoT);
        i++;
        if (i >= lines.length) { end(); back.classList.add('out'); setTimeout(() => back.remove(), 220); res(); return; }
        const L = lines[i];
        const right = L.who !== 'player';
        if (L.who !== lastWho) {
          por.innerHTML = ''; por.appendChild(this.bigPortrait(L.who));
          por.className = 'talk-por ' + (right ? 'r' : 'l');
          lastWho = L.who;
        }
        box.className = 'talk ' + (right ? 'r' : 'l');
        name.textContent = this.whoName(L.who);
        full = L.text; txt.innerHTML = '';
        let n = 0;
        clearInterval(typing);
        typing = setInterval(() => {
          n += 2;
          txt.innerHTML = full.slice(0, n);
          if (n >= full.length) { clearInterval(typing); typing = null; hold(); }
        }, 18);
        Snd.play('tick');
      };
      const advance = () => {
        if (typing) { clearInterval(typing); typing = null; txt.innerHTML = full; hold(); return; }
        show();
      };
      const kd = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) advance(); } };
      let ended = false;
      const end = () => {
        if (ended) return;
        ended = true;
        clearInterval(typing); clearTimeout(autoT);
        window.removeEventListener('keydown', kd, true);
        this.talking = Math.max(0, this.talking - 1);
        this._talkEnd = this._talkEnd.filter(fn => fn !== end);
      };
      this._talkEnd.push(end);
      back.addEventListener('pointerdown', e => { if (e.target === skip) return; advance(); });
      if (skip) skip.addEventListener('pointerdown', e => { e.stopPropagation(); i = lines.length - 1; clearInterval(typing); typing = null; show(); });
      window.addEventListener('keydown', kd, true);
      show();
    });
  },

  /* ---------------- toasts & rewards ---------------- */
  /** o.defer: wait until no menu is open (medal toasts must not cover the panel you are reading) */
  toast(html, cls, o = {}) {
    if (o.defer && this.stack.length) { (this.toastQ = this.toastQ || []).push([html, cls, o.sound]); return; }
    if (o.sound) Snd.play(o.sound);
    const e = U.el('div', { class: 'toast ' + (cls || ''), html });
    e._t = performance.now();
    this.toasts.appendChild(e);
    setTimeout(() => e.classList.add('out'), 2300);
    setTimeout(() => e.remove(), 2700);
  },
  rewardIcon(k) {
    if (k === 'coins') return WArt.item('coin');
    if (k === 'txp') return WArt.item('xp');
    return WArt.item(k);
  },
  rewardChips(r) {
    const wrap = U.el('div', { class: 'chips' });
    for (const k in r) {
      if (!r[k]) continue;
      wrap.appendChild(U.el('div', { class: 'chip' }, U.img(this.rewardIcon(k)), U.el('b', { text: '+' + U.fmt(r[k]) }), U.el('small', { text: k === 'txp' ? t('ui.tamerxp') : k === 'coins' ? t('ui.coins') : t('it.' + k) })));
    }
    return wrap;
  },
  /** the 🎬 mark of every rewarded-ad button */
  adIcon(size = 24) { return WArt.icon('ad', size, 'adico'); },
  /** reward popup. opts.ad = { label, run: async () => note } offers an optional rewarded ad next to OK
   *  (OK first and at least as big; the ad button is never green — portal rules) */
  rewards(title, r, opts = {}) {
    return new Promise(res => {
      const chips = this.rewardChips(r);
      const row = U.el('div', { class: 'row pair' });
      const body = U.el('div', { class: 'reward-box' }, opts.sub ? U.el('p', { class: 'sub', html: opts.sub }) : null, opts.art || null, chips, row);
      row.appendChild(U.el('button', { class: 'btn green', onclick: () => h.close(true) }, t('ui.ok')));
      if (opts.ad && Platform.adsOk()) {
        const b = U.el('button', { class: 'btn ad', html: this.adIcon(24) + ' ' + opts.ad.label });
        b.onclick = async () => {
          b.disabled = true;
          const ok = await Platform.rewardedBreak();
          if (ok) {
            const note = await opts.ad.run();
            b.replaceWith(U.el('span', { class: 'ad-done', html: WArt.icon('check', 22) + ' ' + note }));
            Snd.play('coin');
          } else { b.disabled = false; this.toast(t('ui.adfail')); }
        };
        row.appendChild(b);
      }
      const h = this.modal({ title, body, cls: 'small reward', onClose: res, closable: false, color: opts.color || 'gold' });
      Snd.play(opts.sound || 'coin');
      this.burst(...this.mid(330), ['#ffe066', '#ff8fd0', '#8fd8ff'], 22);
    });
  },
  /** rewards as small pills (an icon and "+n") for a cheer or a reveal */
  pills(r) {
    const wrap = U.el('div', { class: 'ch-pills' });
    for (const k in r || {}) if (r[k]) wrap.appendChild(U.el('span', { class: 'ch-pill' }, U.img(this.rewardIcon(k)), U.el('b', { text: '+' + U.fmt(r[k]) })));
    return wrap;
  },
  /** 3.4: a celebration that never stops the game (a quest done, a rank up, a battle's spoils, the daily reward): a card
   *  with a coloured plaque, a line and the rewards, which comes and goes by itself (they are granted already). Poki
   *  asks to celebrate and to apply rewards by themselves; an "OK" after every little thing is downtime. Several in a
   *  row come one after another, and none shows while a window, a dialogue or a scene change is on (nothing is ever
   *  printed over a window: they wait for it to close). o: { sub, color, sound, ms } */
  cheer(title, r, o = {}) {
    (this._cheers = this._cheers || []).push({ title, r, o });
    // (a moment later, not at once: whatever the caller does next — a window, a scene change — counts as busy)
    if (!this._cheerT) this._cheerT = setTimeout(() => this._cheerStep(), 80);
  },
  /** cheers that came up less than maxAge ms ago go back to the front of the queue (a window or a scene change came
   *  right after them: they are shown again once it is over instead of being lost under it) */
  holdCheers(maxAge = 1200) {
    const now = performance.now(), held = [];
    for (const e of Array.from(this.toasts.querySelectorAll('.toast.cheer:not(.out)'))) {
      if (!e._cheer || now - (e._t || 0) >= maxAge) continue;
      clearTimeout(e._tOut); clearTimeout(e._tRm); e.remove();
      held.push(e._cheer);
    }
    if (!held.length) return;
    this._cheers = held.concat(this._cheers || []);
    this._cheerLast = 0;
    if (!this._cheerT) this._cheerT = setTimeout(() => this._cheerStep(), 250);
  },
  _cheerStep() {
    this._cheerT = 0;
    const q = this._cheers || [];
    if (!q.length) return;
    const wait = (this._cheerLast || 0) + 650 - performance.now();
    const busy = this.stack.length || this.talking || this.busyGo || Platform.adActive || this.hud.querySelector('.zbanner'); // (the zone's name band sits where cheers go)
    if (busy || wait > 0) { this._cheerT = setTimeout(() => this._cheerStep(), Math.max(250, wait)); return; }
    this._cheerLast = performance.now();
    const { title, r, o } = q.shift(), pills = this.pills(r);
    const e = U.el('div', { class: 'toast cheer ' + (o.color || 'gold') }, U.el('b', { class: 'ch-t', text: title }),
      o.sub ? U.el('span', { class: 'ch-sub', html: o.sub }) : null, pills.childNodes.length ? pills : null);
    e._t = performance.now(); e._cheer = { title, r, o };
    this.toasts.appendChild(e);
    if (o.sound !== null && !o.again) Snd.play(o.sound || 'quest');
    o.again = true; // (shown again after a window: no second sound, no second flight of coins)
    e._tOut = setTimeout(() => e.classList.add('out'), o.ms || 2900);
    e._tRm = setTimeout(() => e.remove(), (o.ms || 2900) + 400);
    const rc = e.getBoundingClientRect();
    if (rc.width) {
      const [x, y] = this.toFx(rc.left + rc.width / 2, rc.top + rc.height / 2);
      if (VFX.ok()) VFX.stars(x, y, 12, ['#fff6a0', '#ffffff', '#8ff0ff'], { spd: [120, 320] });
      if (r && r.coins && this.hud.style.display !== 'none' && !o.flown) { o.flown = true; this.flyTo(x, y, '.r-coins', WArt.item('coin'), 5); }
    }
    if (q.length) this._cheerT = setTimeout(() => this._cheerStep(), 650);
  },
  /** completed quests: each one a cheer (the rewards are paid already) */
  async questDone(list) {
    for (const d of list) {
      this.cheer(d.kind === 'main' ? t('q.done') : t('q.daily_done'), Object.assign({}, d.q.reward), { sub: Quests.text(d.q), color: 'green', sound: 'quest' });
      for (const lv of d.levels || []) await this.tamerLevel(lv);
    }
    this.hudUpdate();
  },
  async tamerLevel(lv) {
    const r = Game.tamerLevelReward(lv); // already granted by Game.addTamerXp
    this.cheer(t('ui.rankup'), r, { sub: t('ui.rankup_sub', { lv }), color: 'purple', sound: 'levelup' });
  },

  /** pay out quests completed outside battles/scene changes (menus, candy, items) + medal toasts */
  async checkQuests() {
    if (!Game.s) return;
    const d = Quests.check();
    if (d.length) { Game.save(); await this.questDone(d); }
    await this.medalToasts();
    this.hudUpdate();
  },
  /** "Medal earned!" toasts for tiers reached since the last check */
  async medalToasts() {
    if (!Game.s) return;
    const got = Medals.check();
    for (const [M, n] of got.slice(0, 3)) {
      this.toast(`<span class="tmedal">${Menus.medalSvg(n - 1, M.icon, 34)}</span> ${t('medal.earned', { name: t('medal.' + M.id), tier: t('medal.t_' + n) })}`, 'good', { defer: true, sound: 'medal' });
      await U.sleep(450);
    }
    if (got.length > 3) this.toast(t('medal.more', { n: got.length - 3 }), 'good', { defer: true });
    if (got.length) Game.save();
    this.hudUpdate();
  },

  /* ---------------- fx ---------------- */
  float(x, y, text, cls) {
    const e = U.el('div', { class: 'float ' + (cls || ''), text });
    e.style.left = x + 'px'; e.style.top = y + 'px';
    this.fx.appendChild(e);
    setTimeout(() => e.remove(), 1300);
  },
  burst(x, y, colors, n = 12, spread = 160) {
    for (let i = 0; i < n; i++) {
      const p = U.el('i', { class: 'spark' });
      const c = colors[i % colors.length];
      p.style.background = c; p.style.left = x + 'px'; p.style.top = y + 'px';
      const s = 6 + Math.random() * 10; p.style.width = p.style.height = s + 'px';
      this.fx.appendChild(p);
      const a = Math.random() * Math.PI * 2, d = spread * (0.35 + Math.random() * 0.65);
      U.anim(p, [{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 30}px)) scale(.2) rotate(${Math.random() * 360}deg)`, opacity: 0 }], { duration: 600 + Math.random() * 500, easing: 'cubic-bezier(.2,.8,.3,1)' }).then(() => p.remove());
    }
  },
  /** fly little icons from (x,y) to a HUD element */
  flyTo(x, y, sel, icon, n = 6) {
    const target = U.$(sel, this.hud);
    if (!target) return;
    const r = target.getBoundingClientRect();
    const [tx, ty] = this.toFx(r.left + r.width / 2, r.top + r.height / 2);
    for (let i = 0; i < n; i++) {
      const im = U.img(icon, 'flyer');
      im.style.left = x + 'px'; im.style.top = y + 'px';
      this.fx.appendChild(im);
      const dx = (Math.random() - 0.5) * 120, dy = (Math.random() - 0.5) * 80;
      U.anim(im, [{ transform: 'translate(-50%,-50%) scale(.4)' }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`, offset: 0.35 }, { transform: `translate(calc(-50% + ${tx - x}px), calc(-50% + ${ty - y}px)) scale(.6)` }], { duration: 700 + i * 70, easing: 'ease-in' }).then(() => { im.remove(); if (i === n - 1) { Snd.play('coin'); target.classList.add('bump'); setTimeout(() => target.classList.remove('bump'), 300); } });
    }
  },

  /* ---------------- common widgets ---------------- */
  bar(frac, cls) {
    const b = U.el('div', { class: 'bar ' + (cls || '') }, U.el('i'));
    b.firstChild.style.width = U.clamp(frac * 100, 0, 100) + '%';
    return b;
  },
  hpClass(frac) { return frac > 0.5 ? 'hp' : frac > 0.2 ? 'hp mid' : 'hp low'; },
  elBadge(el) { return U.el('span', { class: 'el-badge el-' + el, html: elIcon(el, 18) + '<b>' + t('el.' + el) + '</b>' }); },
  signBadge(sign) { return U.el('span', { class: 'sign-badge', html: signIcon(sign, 20) + '<b>' + t('sign.' + sign) + '</b>' }); },
  monPortrait(m, cls) {
    const sp = SPECIES[m.sp];
    const wrap = U.el('div', { class: 'mport ' + (cls || '') + (m.shiny ? ' shiny' : '') });
    wrap.appendChild(U.img(MonArt.url(m.sp, { shiny: m.shiny, anim: false })));
    wrap.style.setProperty('--sz', sp.size);
    return wrap;
  },

  /** "♥ Sunkit likes you more: ♥ 2! Now: <the new perk>" */
  heartToast(m, h) { Snd.play('medal'); this.toast(WArt.icon('heart', 22) + ' ' + t('fr.up', { name: SPECIES[m.sp].name, n: h }) + ' ' + t('fr.p_' + h), 'good'); },
  /** friendship as five little hearts */
  hearts(m) { const h = Base.hearts(m); let s = '<span class="hearts">'; for (let i = 0; i < 5; i++) s += WArt.icon('heart', 18, i < h ? 'on' : ''); return s + '</span>'; },

  /* ---------------- HUD ----------------
   * top-left: dark slate tiles (me, map, team, codex, bag, quests, camp) with painted icons; top-centre: the
   * resource bar (coins and orbs — one currency); top-right: settings, the shop stall Kramik and the prize wheel;
   * left column: round portraits of whoever wants something from you (Pip's main quest, daily quests, the
   * tamers of this zone); bottom-centre: the team strip. No labels floating over the world. */
  hudBuild() {
    this.hud.innerHTML = '';
    const tile = (id, art, fn, tip) => U.el('button', { class: 'hb-tile snd hb-' + id, onclick: fn },
      art ? U.img(art, 'hb-art') : U.el('span', { class: 'hb-art' }), U.el('i', { class: 'hb-badge' }), U.el('em', { class: 'hb-tip', text: tip }));
    const me = U.el('button', { class: 'hb-tile hb-me snd', onclick: () => Menus.profile() },
      U.el('span', { class: 'hb-face' }, U.img(WArt.person(Game.s.look))), U.el('b', { class: 'hb-rank' }), U.el('i', { class: 'hb-badge' }), U.el('em', { class: 'hb-tip', text: t('ui.rank') }));
    const tiles = U.el('div', { class: 'hb-tiles hud-el' }, me,
      tile('map', HudArt.globe(), () => { if (UI.cur === ExploreScene) ExploreScene.openGalaxy(); }, t('hud.map')),
      tile('mons', null, () => Menus.team(), t('hud.team')),
      tile('codex', HudArt.cards(), () => Menus.codex(), t('hud.codex')),
      tile('bag', HudArt.bag(), () => Menus.bag(), t('hud.bag')),
      tile('quests', HudArt.scroll(), () => Menus.quests(), t('hud.quests')),
      tile('camp', HudArt.home(), () => ExploreScene.goHome(), t('hud.home')));
    const res = U.el('div', { class: 'hb-res hud-el' },
      this.hudRes('coins', 'coin', () => { if (this.hudUnlocks().shop) Menus.shop(); }), this.hudRes('orbs', 'orb', () => { if (this.hudUnlocks().shop) Menus.shop(); }));
    const gear = U.el('button', { class: 'hb-tile hb-gear snd hud-el', onclick: () => Menus.settings() }, U.img(HudArt.gear(), 'hb-art'), U.el('em', { class: 'hb-tip', text: t('hud.settings') }));
    const shop = U.el('button', { class: 'hb-shop snd hud-el', onclick: () => Menus.shop() }, U.img(HudArt.stall(), 'hb-kramik'), U.el('b', { class: 'hb-shop-t', text: t('hud.shop') }));
    const wheel = U.el('button', { class: 'hb-wheel snd hud-el', onclick: () => Menus.today().then(r => { if (r === 'home') ExploreScene.goHome(); }) }, U.img(HudArt.today(), 'hb-art'), U.el('i', { class: 'hb-badge' }), U.el('em', { class: 'hb-tip', text: t('day.title') }));
    this.hud.append(tiles, res, gear, shop, wheel, U.el('div', { class: 'hb-left hud-el' }), U.el('div', { class: 'hb-squad hud-el' }));
    this.hudUpdate();
  },
  hudRes(kind, icon, fn) {
    return U.el('div', { class: 'hb-r snd r-' + kind, onclick: fn }, U.img(WArt.item(icon)), U.el('b'));
  },
  hudShow(v) { this.hud.style.display = v ? '' : 'none'; if (v) this.hudUpdate(); },
  /** what the player has unlocked so far: the HUD grows with the game instead of showing everything at minute 0
   *  (at the start only the team strip, the objective next to Pip and the settings) */
  hudUnlocks() {
    const s = Game.s, st = s.stats;
    const caught = st.catches >= 1 || s.team.length + s.box.length > 1;
    return {
      me: st.battles >= 1, res: st.battles >= 1, mons: caught, bag: st.battles >= 2, npcs: caught,
      codex: st.catches >= 2 || Game.codexCount() >= 3,
      quests: st.tamers >= 1 || s.tamer.lv >= 3,
      map: s.visited.length >= 2 || s.sigils.length >= 1,
      camp: s.sigils.length >= 1 || Camp.eggsInBag() > 0 || s.camp.eggs.length > 0,
      shop: s.tamer.lv >= 3 || st.battles >= 8,
      wheel: s.sigils.length >= 1 || (Quests.dailyOpen() && s.stats.battles >= 12), // the daily panel
    };
  },
  /** Area intro: the zone's name sweeps in on a dark band, then fades */
  zoneBanner(z, night) {
    const b = U.el('div', { class: 'zbanner' }, U.el('b', { text: t('zone.' + z.id) }),
      U.el('small', { html: z.home ? (z.id === 'yard' ? t('yard.sub', { n: WORKSHOPS.filter(W => Base.worker(W.id)).length }) : t('home.sub', { n: Game.allMons().length, k: Base.glade().length })) : t('isle.' + z.isle) + ' &middot; ' + t('ui.lv') + ' ' + z.lv[0] + '–' + z.lv[1] + (night ? ' &middot; ' + WArt.icon('moon', 16) + ' ' + t('ex.night') : '') }));
    const rare = !z.home && zoneRare(z.id);
    if (rare) b.appendChild(U.el('small', { class: 'zb-rare', html: `<i class="rdot r-${SPECIES[rare].rarity}"></i>` + t('ex.rare_target', { name: Game.seen(rare) ? SPECIES[rare].name : '???' }) + (Game.caught(rare) ? ' ✓' : '') }));
    this.hud.appendChild(b);
    // toasts step below the band while it is there (they share the top of the screen)
    this.root.classList.add('zb-on');
    setTimeout(() => { b.remove(); if (!this.hud.querySelector('.zbanner')) this.root.classList.remove('zb-on'); }, 3400);
  },
  hudUpdate() {
    if (!Game.s || !this.hud.firstChild) return;
    const s = Game.s, q = sel => U.$(sel, this.hud);
    const set = (sel, txt) => { const e = q(sel); if (e) e.textContent = txt; };
    const badge = (sel, v) => { const e = q(sel); if (e) { e.textContent = v || ''; e.style.display = v ? '' : 'none'; } };
    // show what is unlocked; a newly unlocked button pops once (no text badges)
    const un = this.hudUnlocks(), seen = s.flags.hudSeen || (s.flags.hudSeen = {});
    const els = { me: '.hb-me', res: '.hb-res', mons: '.hb-mons', bag: '.hb-bag', codex: '.hb-codex', quests: '.hb-quests', map: '.hb-map', camp: '.hb-camp', shop: '.hb-shop', wheel: '.hb-wheel' };
    for (const [k, sel] of Object.entries(els)) {
      const e = q(sel);
      if (!e) continue;
      e.hidden = !un[k];
      if (un[k] && !seen[k] && this.hud.style.display !== 'none') {
        seen[k] = 1;
        if (!seen.all) { e.classList.add('hb-new'); setTimeout(() => e.classList.remove('hb-new'), 3600); if (k !== 'res' && k !== 'me') Snd.play('pop'); }
      }
    }
    set('.hb-rank', s.tamer.lv);
    set('.r-coins b', U.fmt(s.coins));
    set('.r-orbs b', U.fmt(Game.item('orb') + Game.item('nova') + Game.item('galaxy')));
    const team = Game.team();
    const mons = q('.hb-mons .hb-art');
    if (mons && team[0] && mons.dataset.sp !== team[0].sp) { mons.dataset.sp = team[0].sp; mons.innerHTML = ''; mons.appendChild(U.img(MonArt.url(team[0].sp, { anim: false, shiny: team[0].shiny }))); }
    const dl = Quests.dailyOpen() ? Quests.ensureDaily() : { list: [] }, openDaily = dl.list.filter(x => !x.claimed).length;
    badge('.hb-quests .hb-badge', openDaily);
    badge('.hb-camp .hb-badge', Camp.attention() || Base.anyFull() ? '!' : 0);
    badge('.hb-me .hb-badge', Medals.claimable().length);
    badge('.hb-wheel .hb-badge', Base.attention() ? '!' : 0);
    badge('.hb-mons .hb-badge', team.some(m => m.hp < Game.maxHp(m) * 0.35) ? '!' : 0);
    // who wants something from you
    const left = q('.hb-left');
    if (left) {
      left.innerHTML = '';
      const add = (art, cls, tip, fn, mark, prog, goal) => {
        const b = U.el('button', { class: 'hb-q snd ' + cls, onclick: fn }, U.el('span', { class: 'hb-qf' }, U.img(art)), mark ? U.el('i', { class: 'hb-qm', text: mark }) : null,
          goal ? U.el('span', { class: 'hb-goal', html: goal }) : U.el('em', { class: 'hb-tip r', html: tip }));
        if (prog != null) b.style.setProperty('--p', Math.round(prog * 100) + '%');
        left.appendChild(b);
      };
      const mq = Quests.main();
      if (mq) {
        const [c, n] = Quests.progress(mq), hint = Quests.hintIsle(mq);
        const here = hint && UI.cur === ExploreScene && ExploreScene.zone && (ExploreScene.zone.isle === hint);
        add(WArt.pip(), 'pip', '', () => Menus.quests(), null, U.clamp(c / n, 0, 1),
          `<b>${Quests.text(mq)}</b>${n > 1 ? ` <u>${Math.min(c, n)}/${n}</u>` : ''}${hint && !here ? `<small>${t('q.where', { isle: t('isle.' + hint) })}</small>` : ''}`);
      }
      if (openDaily && un.quests) add(HudArt.scroll(), 'daily', `<b>${t('q.daily')}</b>` + dl.list.filter(x => !x.claimed).map(x => Quests.text(x)).join('<br>'), () => Menus.quests(), String(openDaily));
      if (un.npcs && UI.cur === ExploreScene && ExploreScene.zone && !ExploreScene.home) {
        for (const [id] of ExploreScene.zone.npcs) {
          const T = TAMERS[id], beat = Base.storyBeat(id), story = beat === 'start' || beat === 'end';
          if (!T || T.npc || (Game.beaten(id) && !story) || (T.guardian && !Game.guardianOpen(T.guardian))) continue;
          add(WArt.person(tamerLook(id)), 'npc' + (T.guardian ? ' boss' : ''), `<b>${this.whoName(id)}</b>${t(story ? 'hud.q_story' : T.guardian ? 'hud.q_guardian' : 'hud.q_tamer')}`, () => ExploreScene.goTalk(id), story ? '?' : '!');
        }
      }
    }
    // team strip
    const sq = q('.hb-squad');
    if (sq) {
      sq.innerHTML = '';
      team.forEach((m, i) => {
        const fr = U.clamp(m.hp / Game.maxHp(m), 0, 1);
        const hp = U.el('span', { class: 'sq-hp ' + UI.hpClass(fr) }, U.el('i'));
        hp.firstChild.style.width = (fr * 100) + '%';
        sq.appendChild(U.el('button', { class: 'sq snd el-' + SPECIES[m.sp].el + (i === 0 ? ' lead' : '') + (m.hp <= 0 ? ' ko' : ''), onclick: () => Menus.monDetail(m.id) },
          this.monPortrait(m), U.el('b', { class: 'sq-lv', text: m.lv }), hp));
      });
    }
  },
};
