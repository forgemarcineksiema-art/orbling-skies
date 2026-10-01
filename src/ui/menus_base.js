'use strict';
/* 3.0 menus: the daily panel ("Today"), Bruno's stall (decorations and workshops), the workshop card and worker
 * picker, decoration spots and the story rewards. Extends the Menus object from menus.js. */

/** the art of a decoration (its own prop or a shared one) */
function decorUrl(id) { const [type, v] = DECOR_ART[id] || [id, 0]; return WArt.prop(type, v).url; }
/** what a workshop makes, as a word ("Berries", "Orbs", "coins") */
function wsOut(W) { return W.out === 'coins' ? t('ui.coins') : t('it.' + W.out); }

Object.assign(Menus, {
  /* ---------------- the daily panel ---------------- */
  /** everything that resets or waits every day, in one place: the daily reward, a welcome-back gift, the first catch
   *  of the day, the daily quests, the prize wheel and the Base (one tap collects every workshop) → Promise on close */
  today() {
    return new Promise(res => {
      const body = U.el('div', { class: 'today' });
      let go = null; // 'home' when the player asks to go to the Base (the caller travels once the panel is closed)
      const card = (icon, title, ...kids) => U.el('div', { class: 'day-card' }, U.el('h4', { html: WArt.icon(icon, 24) + ' ' + title }), ...kids);
      const draw = () => {
        body.innerHTML = '';
        const s = Game.s, cards = [];
        // a welcome-back gift after a few days away (never a penalty for being gone)
        if (s.base.welcome) {
          const d = s.base.welcome;
          cards.push(card('gift', t('day.welcome_t'), U.el('p', { text: t('day.welcome', { n: d }) }), UI.rewardChips(Base.welcomeGift(d)),
            U.el('button', { class: 'btn green', text: t('login.claim'), onclick: async () => { const r = Base.claimWelcome(); Game.save(); UI.hudUpdate(); draw(); if (r) await UI.rewards(t('day.welcome_t'), r, { color: 'gold' }); } })));
        }
        // the daily reward (the 7-day cycle; a missed day never resets it)
        const day = Login.dayIdx(), due = Login.due();
        const cells = this.loginCells(day, due);
        const row = U.el('div', { class: 'row pair' });
        if (due) {
          const claim = async mult => { const r = Login.claim(mult); Game.save(); UI.hudUpdate(); draw(); if (r) await UI.rewards(t('login.got'), r, { color: 'green' }); };
          row.append(U.el('button', { class: 'btn green', text: t('login.claim'), onclick: () => claim(1) }),
            !Platform.adsOk() ? null : U.el('button', { class: 'btn ad', html: UI.adIcon(24) + ' ' + t('login.claim2'), onclick: async ev => { ev.currentTarget.classList.add('off'); const ok = await Platform.rewardedBreak(); if (!ok) UI.toast(t('ui.adfail'), 'bad'); claim(ok ? 2 : 1); } }));
        } else row.append(U.el('small', { class: 'muted', html: WArt.icon('check', 18) + ' ' + t('day.login_done') }));
        const lc = card('calendar', t('login.title'), cells, row);
        lc.classList.add('wide');
        cards.push(lc);
        // the first catch of the day
        const fc = Base.firstCatchDone();
        cards.push(card('orb', t('day.fc_t'), U.el('p', { html: fc ? WArt.icon('check', 18) + ' ' + t('day.fc_done') : t('day.fc', { n: FIRST_CATCH.orb, c: FIRST_CATCH.coins }) })));
        // the daily quests (they complete by themselves while you play)
        if (Quests.dailyOpen()) {
          const dl = Quests.ensureDaily(), list = U.el('div', { class: 'day-qs' });
          for (const dq of dl.list) {
            const [c, n] = Quests.progress(dq, dq.base);
            list.appendChild(U.el('div', { class: 'day-q' + (dq.claimed ? ' done' : '') }, U.el('span', { text: Quests.text(dq) }), U.el('div', { class: 'qc-bar' }, UI.bar(Math.min(1, c / n), 'qbar'), U.el('em', { text: dq.claimed ? '✓' : Math.min(c, n) + ' / ' + n }))));
          }
          cards.push(card('quests', t('q.daily'), list));
        }
        // the prize wheel: free once a day (the odds are on the wheel's screen)
        if (s.sigils.length >= 1) { // the wheel opens with the first sigil (as before the daily panel)
          const free = s.daily.day !== U.today() || !s.daily.free;
          cards.push(card('spin', t('spin.title'), U.el('p', { text: free ? t('day.spin_free') : t('day.spin_done') }),
            U.el('button', { class: 'btn ' + (free ? 'green' : 'white'), text: free ? t('spin.free') : t('day.spin_look'), onclick: () => this.spin(draw) })));
        }
        // the Base: the workshops' harvest (one tap), eggs, the Dojo, petting, a visitor
        if (Base.open()) {
          Base.visitor();
          const units = Base.readyUnits(), lines = [];
          if (units) lines.push(t('day.harvest', { n: units }));
          const eggs = s.camp.eggs.filter(x => Camp.ready(x)).length;
          if (eggs) lines.push(t('day.eggs', { n: eggs }));
          if (s.camp.dojo.some(d => Camp.hours(d) >= 0.5)) lines.push(t('day.dojo'));
          const pets = Base.petsLeft();
          if (pets) lines.push(t('day.pets', { n: pets }));
          if (s.base.visit && !s.base.visit.gone && s.base.visit.w === Math.floor(Date.now() / (VISIT_H * 3600e3))) lines.push(t('day.visitor', { name: SPECIES[s.base.visit.sp].name }));
          const acts = U.el('div', { class: 'row pair' });
          if (units) acts.appendChild(U.el('button', { class: 'btn green', html: WArt.icon('gift', 22) + ' ' + t('day.collect'), onclick: async () => {
            const c = Base.collectAll();
            Snd.play('coin'); Game.save(); UI.hudUpdate();
            for (const sg in c.dust) c.r.dust = (c.r.dust || 0) + c.dust[sg];
            for (const [m, h] of c.ups) UI.heartToast(m, h);
            draw();
            await UI.rewards(t('day.collect'), c.r);
            if (UI.cur === ExploreScene && ExploreScene.home) ExploreScene.refreshBase();
          } }));
          if (UI.cur !== ExploreScene || !ExploreScene.home) acts.appendChild(U.el('button', { class: 'btn blue', html: WArt.icon('tent', 22) + ' ' + t('day.gohome'), onclick: () => { go = 'home'; h.close(true); } }));
          cards.push(card('tent', t('hud.home'), lines.length ? U.el('ul', { class: 'day-base' }, ...lines.map(x => U.el('li', { text: x }))) : U.el('p', { class: 'muted', text: t('day.base_quiet') }), acts));
        }
        body.append(U.el('div', { class: 'day-grid' }, ...cards));
      };
      draw();
      const h = UI.sheet({ title: t('day.title'), body, cls: 'td-sheet', onClose: async () => { Game.save(); UI.hudUpdate(); await UI.checkQuests(); res(go); } });
    });
  },
  /** 3.4: the daily reward when a returning player comes in — one small window instead of the whole daily panel:
   *  the week's strip with today's cell lit and one tap to claim it (×2 for a rewarded ad next to it). The reward is
   *  celebrated by a cheer and the coins fly to the HUD. */
  dailyGift() {
    return new Promise(res => {
      if (!Login.due()) { res(); return; }
      let busy = false;
      const claim = mult => {
        const got = Login.claim(mult);
        Game.save(); UI.hudUpdate();
        h.close(true);
        if (got) UI.cheer(t('login.got'), got, { color: 'green', sound: 'coin' });
      };
      const row = U.el('div', { class: 'row pair' },
        U.el('button', { class: 'btn green', text: t('login.claim'), onclick: () => { if (!busy) { busy = true; claim(1); } } }),
        !Platform.adsOk() ? null : U.el('button', { class: 'btn ad', html: UI.adIcon(24) + ' ' + t('login.claim2'), onclick: async ev => {
          if (busy) return;
          busy = true; ev.currentTarget.classList.add('off');
          const ok = await Platform.rewardedBreak();
          if (!ok) UI.toast(t('ui.adfail'), 'bad');
          claim(ok ? 2 : 1);
        } }));
      const body = U.el('div', { class: 'reward-box dgift' }, this.loginCells(Login.dayIdx(), true), row);
      // no ✕ and no tap-outside: the daily panel that could claim it later opens only with the first sigil
      const h = UI.modal({ title: t('login.title'), body, cls: 'small reward dgift-m', color: 'green', closable: false, onClose: () => res() });
    });
  },
  /** the 7 reward cells of the login cycle: claimed ones ticked, today's lit (`day` = the next reward's index) */
  loginCells(day, due) {
    const cells = U.el('div', { class: 'login-days' });
    LOGIN_REWARDS.forEach((r, i) => {
      const [k, n] = Object.entries(r)[0];
      cells.appendChild(U.el('div', { class: 'lday' + (i < day ? ' got' : i === day && due ? ' today' : '') + (i === 6 ? ' big' : '') },
        U.el('small', { text: t('login.day', { n: i + 1 }) }),
        U.img(UI.rewardIcon(k)),
        U.el('b', { text: (k === 'coins' ? '' : '×') + n + (Object.keys(r).length > 1 ? '+' : '') }),
        i < day ? U.el('i', { class: 'lcheck', html: WArt.icon('check', 22) }) : null));
    });
    return cells;
  },

  /* ---------------- Bruno's stall ---------------- */
  /** decorations to buy (placed later on the ✚ spots) and workshops to build */
  bruno(done) {
    const body = U.el('div', { class: 'br2' });
    const purse = U.el('div', { class: 'sv-purse' });
    let tab = 'decor';
    const draw = () => {
      body.innerHTML = '';
      purse.innerHTML = `<img src="${WArt.item('coin')}" alt=""><b>${U.fmt(Game.s.coins)}</b>`;
      const tabs = U.el('div', { class: 'seg br2-tabs' });
      for (const [k, ic] of [['decor', 'star'], ['ws', 'hammer']]) tabs.appendChild(U.el('button', { class: 'snd' + (tab === k ? ' on' : ''), html: WArt.icon(ic, 20) + ' ' + t('br.' + k), onclick: () => { if (tab !== k) { tab = k; draw(); } } }));
      body.appendChild(U.el('div', { class: 'br2-top' }, tabs,
        U.el('p', { class: 'br2-charm', html: WArt.icon('heart', 22, 'on') + ' ' + t('br.charm', { n: Math.round(Base.charm()), p: Math.round(Base.charmBonus() * 100), v: Math.round(Base.visitChance() * 100) }) })));
      const grid = U.el('div', { class: 'sv-grid br2-grid' });
      const price = n => `<img src="${WArt.item('coin')}" alt="">${U.fmt(n)}`;
      if (tab === 'decor') {
        for (const id in DECOR) {
          const D = DECOR[id], own = Base.owned(id);
          if (D.story && !own) continue;
          const elTag = D.el === '*' ? t('dc.any') : t('el.' + D.el);
          const btn = D.story ? U.el('em', { class: 'br2-uniq', text: t('dc.unique') })
            : U.el('button', { class: 'btn sm green' + (Game.s.coins >= D.price ? '' : ' off'), html: price(D.price), onclick: () => {
              if (!Base.buy(id)) { Snd.play('error'); UI.toast(t('shop.nocoins'), 'bad'); return; }
              Snd.play('coin'); Game.save(); UI.hudUpdate();
              UI.toast(t('dc.bought', { name: t('dc.' + id) }), 'good');
              draw();
            } });
          grid.appendChild(U.el('div', { class: 'sv-card' }, own ? U.el('em', { class: 'sv-own', text: '×' + own }) : null, U.el('div', { class: 'sv-art' }, U.img(decorUrl(id))),
            U.el('b', { text: t('dc.' + id) }), U.el('small', { text: elTag + ' · ' + t('dc.charm', { n: Base.charmOf(id) }) }), U.el('div', { class: 'sv-buy' }, btn)));
        }
      } else {
        for (const W of WORKSHOPS) {
          const built = Base.built(W.id);
          grid.appendChild(U.el('div', { class: 'sv-card' + (built ? ' done' : '') }, U.el('div', { class: 'sv-art' }, U.img(WArt.prop(W.id).url)),
            U.el('b', { text: t('ws.' + W.id) }), U.el('small', { text: t('ws.d_' + W.id) }),
            U.el('div', { class: 'sv-buy' }, built ? U.el('em', { class: 'br2-uniq ok', html: WArt.icon('check', 16) + ' ' + t('ws.built') })
              : U.el('button', { class: 'btn sm green' + (Game.s.coins >= W.cost ? '' : ' off'), html: t('ws.build') + ' ' + price(W.cost), onclick: () => {
                if (!Base.build(W.id)) { Snd.play('error'); UI.toast(t('shop.nocoins'), 'bad'); return; }
                Snd.play('chest'); Game.save(); UI.hudUpdate();
                UI.toast(t('ws.built_t', { name: t('ws.' + W.id) }), 'good');
                draw();
              } }))));
        }
      }
      body.append(grid, U.el('p', { class: 'br2-tip', html: t(tab === 'decor' ? 'br.tip_decor' : 'br.tip_ws') }));
    };
    draw();
    UI.sheet({ title: UI.whoName('bruno'), body, bar: purse, cls: 'br2-sheet', onClose: () => { Game.save(); if (done) done(); } });
  },

  /* ---------------- workshops ---------------- */
  async buildWorkshop(W, done) {
    const ok = await UI.confirm(t('ws.build_q', { name: t('ws.' + W.id), n: U.fmt(W.cost) }) + `<br><small>${t('ws.d_' + W.id)}</small>`, t('ws.build'), t('ui.later'));
    if (!ok) return;
    if (!Base.build(W.id)) { Snd.play('error'); UI.toast(t('shop.nocoins'), 'bad'); return; }
    Snd.play('chest');
    UI.toast(t('ws.built_t', { name: t('ws.' + W.id) }), 'good');
    Game.save();
    if (done) done();
  },
  /** choose who works here: Orblings from storage, the best first (its element works at full speed) */
  pickWorker(W, done) {
    const list = U.el('div', { class: 'pick-team' });
    const mons = Game.boxMons().filter(m => !Base.busy(m.id)).sort((a, b) => Base.speed(W, b) - Base.speed(W, a));
    if (!mons.length) list.appendChild(U.el('p', { class: 'muted', text: t('ws.nobox') }));
    let h;
    for (const m of mons) {
      const match = SPECIES[m.sp].el === W.el, n = Base.capUnits(W, m);
      list.appendChild(U.el('button', { class: 'pt-card snd' + (match ? ' match' : ''), onclick: () => { if (Base.assign(W.id, m.id)) { Snd.play('select'); Game.save(); } h.close(true); if (done) done(); } },
        UI.monPortrait(m, 'big'), U.el('div', { class: 'pt-info' }, U.el('b', { text: SPECIES[m.sp].name }),
          U.el('small', { html: t('ui.lv') + ' ' + m.lv + ' · ' + (match ? elIcon(W.el, 16) + ' ' + t('ws.match') : t('ws.nomatch')) }),
          U.el('small', { text: t('ws.per10', { n: W.out === 'coins' ? U.fmt(n * W.amt) : n, item: wsOut(W) }) }))));
    }
    list.appendChild(U.el('p', { class: 'camp-tip', html: t('ws.tip', { el: t('el.' + W.el) }) }));
    h = UI.modal({ title: t('ws.pick', { name: t('ws.' + W.id) }), body: list, cls: 'mid' });
  },
  /** a workshop at a glance: the worker, how full it is, collect / change / send back to storage */
  workshop(W, done) {
    const body = U.el('div', { class: 'ws-card' });
    let h;
    const draw = () => {
      body.innerHTML = '';
      const m = Base.worker(W.id);
      if (!m) { h.close(true); return; }
      const n = Base.units(W.id), cap = Base.capUnits(W, m), match = SPECIES[m.sp].el === W.el;
      body.append(
        U.el('div', { class: 'ws-top' }, U.img(WArt.prop(W.id).url, 'ws-img'), U.el('div', {}, U.el('b', { text: t('ws.' + W.id) }), U.el('p', { text: t('ws.d_' + W.id) }))),
        U.el('div', { class: 'ws-worker' }, UI.monPortrait(m, 'big'), U.el('div', {},
          U.el('b', { text: SPECIES[m.sp].name + ' · ' + t('ui.lv') + ' ' + m.lv }), U.el('div', { html: UI.hearts(m) }),
          U.el('small', { html: (match ? elIcon(W.el, 16) + ' ' + t('ws.match') : t('ws.nomatch')) + ' · ' + t('ws.per10', { n: W.out === 'coins' ? U.fmt(cap * W.amt) : cap, item: wsOut(W) }) }))),
        U.el('div', { class: 'qc-bar' }, UI.bar(n / cap, 'qbar'), U.el('em', { text: (W.out === 'coins' ? U.fmt(n * W.amt) : n) + ' / ' + (W.out === 'coins' ? U.fmt(cap * W.amt) : cap) })),
        U.el('small', { class: 'muted', text: Base.full(W.id) ? t('ws.full') : t('ws.full_in', { time: U.fmtTime(Base.fullIn(W.id)) }) }),
        U.el('div', { class: 'row tight' },
          U.el('button', { class: 'btn sm green' + (n ? '' : ' off'), text: t('camp.collect'), onclick: () => { if (!n) return; h.close(true); if (UI.cur === ExploreScene && ExploreScene.home) ExploreScene.collectWorkshop(W); } }),
          U.el('button', { class: 'btn sm blue', text: t('ws.change'), onclick: () => { h.close(true); this.pickWorker(W, done); } }),
          U.el('button', { class: 'btn sm white', text: t('ws.stop'), onclick: () => { const r = Base.unassign(W.id); Game.save(); h.close(true); if (r) UI.rewards(t('ws.' + W.id), r.r); if (done) done(); } })));
    };
    const timer = setInterval(() => { if (body.isConnected) draw(); }, 5000);
    h = UI.modal({ title: t('ws.' + W.id), body, cls: 'mid', onClose: () => { clearInterval(timer); if (done) done(); } });
    draw();
  },

  /* ---------------- decorations ---------------- */
  /** a spot at the Base: put a decoration you own on it, swap it or take it down */
  decorSpot(area, i, done) {
    const body = U.el('div', { class: 'decor-pick' });
    let h;
    const draw = () => {
      body.innerHTML = '';
      const cur = Base.at(area, i);
      if (cur) body.appendChild(U.el('div', { class: 'dp-cur' }, U.img(decorUrl(cur), 'deco-img'), U.el('b', { text: t('dc.' + cur) }),
        U.el('button', { class: 'btn sm white', text: t('dc.take'), onclick: () => { Base.place(area, i, null); Snd.play('pop'); Game.save(); draw(); } })));
      const spare = Object.keys(DECOR).filter(id => Base.spare(id) > 0);
      if (spare.length) {
        body.appendChild(U.el('h4', { text: t(cur ? 'dc.swap' : 'dc.pick') }));
        body.appendChild(U.el('div', { class: 'dp-grid' }, ...spare.map(id => U.el('button', { class: 'dp-item snd', onclick: () => { Base.place(area, i, id); Snd.play('chest'); Game.save(); h.close(true); } },
          U.img(decorUrl(id), 'deco-img'), U.el('b', { text: t('dc.' + id) }), U.el('em', { text: '×' + Base.spare(id) })))));
      } else body.appendChild(U.el('p', { class: 'muted', text: t('dc.none') }));
      body.appendChild(U.el('div', { class: 'row' }, U.el('button', { class: 'btn sm blue', html: WArt.icon('hammer', 20) + ' ' + t('dc.shop'), onclick: () => this.bruno(draw) })));
      body.appendChild(U.el('p', { class: 'camp-tip', html: t('dc.tip') }));
    };
    draw();
    h = UI.modal({ title: t('dc.spot_t'), body, cls: 'mid', onClose: () => { if (done) done(); } });
  },
  /** a character's thanks: a one-of-a-kind decoration (and a little more) */
  decorGift(id, r) {
    return new Promise(res => {
      const body = U.el('div', { class: 'sigil-box' }, U.img(decorUrl(id), 'gift-deco'), U.el('b', { class: 'cap-name', text: t('dc.' + id) }),
        U.el('p', { html: t('dc.gift', { name: t('dc.' + id) }) }), UI.rewardChips(r),
        U.el('div', { class: 'row' }, U.el('button', { class: 'btn green', text: t('ui.ok'), onclick: () => h.close(true) })));
      const h = UI.modal({ title: t('dc.gift_t'), body, cls: 'small', closable: false, color: 'gold', onClose: res });
      Snd.play('medal');
      UI.burst(...UI.mid(300), ['#ffe066', '#ffffff', '#9dff7a'], 26, 200);
    });
  },
});
