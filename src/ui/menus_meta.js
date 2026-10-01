'use strict';
/* Menus for the v2 meta systems: the Hatchery and the Dojo of the Base, hatching, Medals and the arena trophy
 * (the daily login reward lives in the daily panel, menus_base.js). Extends the Menus object from menus.js. */

Object.assign(Menus, {
  /* ---------------- Star Camp ---------------- */
  camp(tab, done) {
    Camp.cleanup();
    const body = U.el('div', { class: 'camp cp' });
    const tabs = U.el('div', { class: 'seg' });
    let cur = tab || (Game.s.camp.eggs.length || Camp.eggsInBag() || !Game.boxMons().length ? 'hatch' : 'dojo');
    const draw = () => {
      body.innerHTML = ''; tabs.innerHTML = '';
      for (const [k, ic] of [['hatch', 'egg'], ['dojo', 'dojo']]) tabs.appendChild(U.el('button', { class: 'snd' + (cur === k ? ' on' : ''), html: WArt.icon(ic, 20) + ' ' + t('camp.' + k), onclick: () => { if (cur !== k) { cur = k; draw(); } } }));
      if (cur === 'hatch') this.drawHatchery(body, draw);
      else this.drawDojo(body, draw);
    };
    draw();
    const timer = setInterval(() => { if (cur === 'dojo' && body.isConnected) draw(); }, 30000);
    UI.sheet({ title: t('hud.camp'), body, bar: tabs, cls: 'cp-sheet', onClose: () => { clearInterval(timer); Game.save(); UI.hudUpdate(); UI.checkQuests(); if (done) done(); } });
  },
  drawHatchery(body, redraw) {
    const c = Game.s.camp, slots = U.el('div', { class: 'camp-slots' });
    for (let i = 0; i < 3; i++) {
      const e = c.eggs[i];
      if (i >= Camp.eggSlots()) { slots.appendChild(U.el('div', { class: 'cslot locked' }, U.el('span', { html: WArt.icon('lock', 40) }), U.el('small', { text: t('camp.unlock', { lv: i === 1 ? 6 : 12 }) }))); continue; }
      if (!e) {
        const owned = EGG_IDS.filter(id => Game.item(id) > 0);
        slots.appendChild(U.el('div', { class: 'cslot empty' },
          U.el('div', { class: 'incub' }, U.el('div', { class: 'incub-glass' })),
          U.el('b', { text: t('camp.empty') }),
          owned.length ? U.el('div', { class: 'egg-pick' }, ...owned.map(id => U.el('button', { class: 'egg-btn snd', title: t('it.' + id), onclick: () => { if (Camp.place(id)) { Snd.play('pop'); Game.save(); redraw(); } } }, U.img(WArt.item(id)), U.el('em', { text: '×' + Game.item(id) }))))
            : U.el('small', { class: 'muted', text: t('camp.noeggs') })));
        continue;
      }
      const need = Camp.need(e.egg), ready = Camp.ready(e);
      const card = U.el('div', { class: 'cslot' + (ready ? ' ready' : '') },
        U.el('div', { class: 'incub' }, U.img(WArt.item(e.egg), 'incub-egg' + (ready ? ' wob' : '')), U.el('div', { class: 'incub-glass' })),
        U.el('b', { text: t('it.' + e.egg) }),
        U.el('div', { class: 'qc-bar' }, UI.bar(Math.min(1, e.prog / need), 'qbar'), U.el('em', { text: e.prog + ' / ' + need })),
        U.el('small', { text: ready ? t('camp.ready') : t('camp.need', { n: need - e.prog }) }));
      const row = U.el('div', { class: 'row tight' });
      if (ready) row.appendChild(U.el('button', { class: 'btn sm green pulse', html: WArt.icon('egg', 20) + ' ' + t('camp.hatchbtn'), onclick: async () => {
        const m = Camp.hatch(e.id);
        if (!m) return;
        const isNew = !Game.caught(m.sp);
        Game.catchReg(m.sp);
        const where = Game.addMon(m);
        Game.save(); // persisted before the animation: closing the tab can never lose the egg
        await this.hatchAnim(e.egg, m, isNew, where);
        redraw();
        UI.hudUpdate();
      } }));
      else if (!e.warm && Platform.adsOk()) row.appendChild(U.el('button', { class: 'btn sm ad', html: UI.adIcon(20) + ' ' + t('camp.warm'), onclick: async ev => {
        ev.currentTarget.classList.add('off');
        if (await Platform.rewardedBreak()) { Camp.warm(e); Snd.play('heal'); Game.save(); }
        else UI.toast(t('ui.adfail'), 'bad');
        redraw();
      } }));
      card.appendChild(row);
      slots.appendChild(card);
    }
    body.append(slots, U.el('p', { class: 'camp-tip', html: t('camp.tip_hatch') }));
  },
  drawDojo(body, redraw) {
    const c = Game.s.camp, slots = U.el('div', { class: 'camp-slots' });
    for (let i = 0; i < 3; i++) {
      const d = c.dojo[i];
      if (i >= Camp.dojoSlots()) { slots.appendChild(U.el('div', { class: 'cslot locked' }, U.el('span', { html: WArt.icon('lock', 40) }), U.el('small', { text: t('camp.unlock', { lv: 10 }) }))); continue; }
      if (!d) {
        slots.appendChild(U.el('div', { class: 'cslot empty dojo' },
          U.el('div', { class: 'cp-fig empty' }, U.el('div', { class: 'tv-ped' }), U.el('span', { class: 'cp-ic', html: WArt.icon('dojo', 58) })),
          U.el('b', { text: t('camp.dojo_empty') }),
          U.el('button', { class: 'btn sm blue', text: t('camp.pick'), onclick: () => this.pickTrainee(redraw) })));
        continue;
      }
      const m = Game.mon(d.id), sp = SPECIES[m.sp], xp = Camp.pending(d), full = Camp.full(d);
      const left = DOJO_CAP_H * 3600e3 - (Date.now() - d.t);
      const card = U.el('div', { class: 'cslot dojo' + (full ? ' ready' : '') },
        U.el('div', { class: 'cp-fig el-' + sp.el, style: { '--sz': this.artK(sp) } }, U.el('div', { class: 'tv-ped' }), U.img(MonArt.url(m.sp, { shiny: m.shiny, size: 'lg' }), 'cp-art' + (MonArt.floats(m.sp) ? ' fly' : ''))),
        U.el('b', { text: sp.name + ' · ' + t('ui.lv') + ' ' + m.lv }),
        U.el('div', { class: 'qc-bar' }, UI.bar(Camp.hours(d) / DOJO_CAP_H, 'xp'), U.el('em', { text: '+' + U.fmt(xp) + ' XP' })),
        U.el('small', { text: full ? t('camp.full') : t('camp.left', { time: U.fmtTime(left) }) }));
      const row = U.el('div', { class: 'row tight' });
      const claim = async mult => {
        const r = Camp.claim(d.id, mult);
        if (!r) { UI.toast(t('camp.nothing')); return; }
        Snd.play('levelup');
        UI.toast(t('camp.got', { name: sp.name, n: U.fmt(r.xp) }) + (r.r.levels.length ? ' · ' + t('ui.lv') + ' ' + r.m.lv : ''), 'good');
        for (const id of r.r.learned) UI.toast(t('b.learn', { name: SPECIES[r.m.sp].name, move: t('mv.' + id) }));
        if (Game.canEvolve(r.m)) await this.evolve(r.m);
        Game.save();
        redraw();
      };
      row.append(
        U.el('button', { class: 'btn sm green' + (xp < 1 ? ' off' : ''), text: t('camp.collect'), onclick: () => claim(1) }),
        !Platform.adsOk() ? null : U.el('button', { class: 'btn sm ad' + (xp < 1 ? ' off' : ''), html: UI.adIcon(20) + ' ×2', onclick: async ev => {
          ev.currentTarget.classList.add('off');
          if (await Platform.rewardedBreak()) await claim(2); else { UI.toast(t('ui.adfail'), 'bad'); redraw(); }
        } }),
        U.el('button', { class: 'btn sm white', text: t('camp.stop'), onclick: async () => { if (xp >= 1) await claim(1); Camp.stop(d.id); Game.save(); redraw(); } }));
      card.appendChild(row);
      slots.appendChild(card);
    }
    body.append(slots, U.el('p', { class: 'camp-tip', html: t('camp.tip_dojo') }));
  },
  pickTrainee(done) {
    const list = U.el('div', { class: 'pick-team' });
    const mons = Game.boxMons().filter(m => !Base.busy(m.id) && m.lv < MAX_LV).sort((a, b) => b.lv - a.lv);
    if (!mons.length) list.appendChild(U.el('p', { class: 'muted', text: t('camp.nobox') }));
    let h;
    for (const m of mons) {
      list.appendChild(U.el('button', { class: 'pt-card snd', onclick: () => { if (Camp.train(m.id)) { Snd.play('select'); Game.save(); } h.close(true); done(); } },
        UI.monPortrait(m, 'big'), U.el('div', { class: 'pt-info' }, U.el('b', { text: SPECIES[m.sp].name }), U.el('small', { text: t('ui.lv') + ' ' + m.lv + ' · ' + t('camp.rate', { n: U.fmt(Camp.rate(m)) }) }))));
    }
    h = UI.modal({ title: t('camp.pick'), body: list, cls: 'mid' });
  },
  /** egg wobbles on the island, cracks and bursts open (the Orbling has already joined); then it evolves if its
   *  level allows. The same big scene as a catch; the backdrop takes the Orbling's colour only once it is out */
  hatchAnim(egg, m, isNew, where) {
    return new Promise(res => {
      const r = this.reveal({ sp: m.sp, title: t('camp.hatching'), color: 'purple', onClose: async () => {
        if (Game.canEvolve(m)) await this.evolve(m);
        if (Game.canEvolve(m)) await this.evolve(m);
        Game.save();
        res();
      } });
      r.body.classList.add('egg');
      const cracks = U.el('div', { class: 'hatch-cracks', html: '<svg viewBox="0 0 60 60"><path d="M14 30L22 25L27 33L33 24L39 32L46 27" fill="none" stroke="#2b2040" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg>' });
      const wrap = U.el('div', { class: 'rv-egg' }, U.img(WArt.item(egg), 'hatch-egg'), cracks);
      r.fig.appendChild(wrap);
      const wob = async (i) => {
        Snd.play('crack');
        await U.anim(wrap, [{ transform: 'rotate(0)' }, { transform: `rotate(${-10 - i * 4}deg)` }, { transform: `rotate(${10 + i * 4}deg)` }, { transform: 'rotate(0)' }], { duration: 420 });
        cracks.style.opacity = String(0.34 * (i + 1));
        await U.sleep(260);
      };
      (async () => {
        try {
          await U.sleep(450);
          for (let i = 0; i < 3; i++) await wob(i);
          r.fig.classList.add('open');
          r.body.classList.remove('egg');
          Snd.play('hatch');
          UI.burst(...this.revealMid(), ['#ffffff', '#ffe066', '#e0b8ff', '#8fd8ff'], 34, 260);
          FX.flash('#ffffff', 0.7, 400);
          wrap.remove();
          r.fig.appendChild(this.revealArt(m.sp, m.shiny, 'pop'));
          if (isNew) r.banner.appendChild(U.el('span', { class: 'rv-new', text: t('cap.new') }));
          Snd.cry(m.sp);
          this.revealInfo(r.info, m, [t(where === 'team' ? 'cap.team' : 'cap.box')]);
        } catch (err) { console.error(err); }
        finally { r.row.appendChild(U.el('button', { class: 'btn green', text: t('ui.ok'), onclick: () => r.h.close(true) })); }
      })();
    });
  },

  /* ---------------- Medals ---------------- */
  medalSvg(tier, icon, size = 40) {
    return `<span class="medal t${tier}" style="width:${size}px;height:${size}px">${WArt.icon(icon, Math.round(size * 0.55))}</span>`;
  },
  /* ---------------- medals: a wall of badges (left); the picked medal, its three tiers and the claim button (right) */
  medals() {
    const body = U.el('div', { class: 'mv2' });
    const bar = U.el('div', { class: 'mv2-bar' });
    const claimOne = M => {
      const claimed = Medals.claimed(M), r = Medals.claim(M);
      if (!r) return;
      Snd.play('medal'); Game.save(); UI.hudUpdate(); draw();
      UI.rewards(t('medal.got', { name: t('medal.' + M.id), tier: t('medal.t_' + (claimed + 1)) }), r, { color: 'gold', sound: 'medal' });
    };
    const draw = () => {
      body.innerHTML = ''; bar.innerHTML = '';
      const claimable = Medals.claimable();
      bar.appendChild(U.el('span', { class: 'mv2-count', html: WArt.icon('medal', 24) + '<b>' + Medals.count() + '</b><small>/ ' + MEDALS.length * 3 + '</small>' }));
      if (claimable.length > 1) bar.appendChild(U.el('button', { class: 'btn sm green pulse', text: t('medal.claimall'), onclick: () => {
        const tot = {};
        for (const M of Medals.claimable()) {
          let r;
          while ((r = Medals.claim(M))) for (const k in r) tot[k] = (tot[k] || 0) + r[k];
        }
        Snd.play('coin'); Game.save(); UI.hudUpdate(); draw();
        UI.rewards(t('medal.rewards'), tot);
      } }));
      if (!MEDALS.includes(this.mdPick)) this.mdPick = claimable[0] || MEDALS[0];
      const wall = U.el('div', { class: 'mv2-wall' });
      for (const M of MEDALS) {
        const reached = Medals.tier(M), claimed = Medals.claimed(M), v = Medals.value(M), done = claimed >= 3, next = M.tiers[Math.min(claimed, 2)];
        wall.appendChild(U.el('button', { class: 'mv2-b snd' + (reached > claimed ? ' ready' : done ? ' done' : '') + (this.mdPick === M ? ' on' : ''), onclick: () => { if (this.mdPick !== M) { this.mdPick = M; draw(); } } },
          U.el('span', { class: 'mv2-ic' + (claimed ? '' : ' dim'), html: this.medalSvg(Math.max(0, claimed - 1), M.icon, 64) }),
          U.el('i', { class: 'mv2-pips', html: [0, 1, 2].map(i => '<u class="t' + i + (i < claimed ? ' on' : '') + '"></u>').join('') }),
          U.el('b', { text: t('medal.' + M.id) }), UI.bar(done ? 1 : Math.min(1, v / next), 'qbar'),
          reached > claimed ? U.el('em', { class: 'mv2-new', text: '!' }) : null));
      }
      const M = this.mdPick, reached = Medals.tier(M), claimed = Medals.claimed(M), v = Medals.value(M), done = claimed >= 3, next = M.tiers[Math.min(claimed, 2)];
      const det = U.el('div', { class: 'mv2-det' },
        U.el('span', { class: 'mv2-big' + (claimed ? '' : ' dim'), html: this.medalSvg(Math.max(0, claimed - 1), M.icon, 116) }),
        U.el('b', { class: 'mv2-nm', text: t('medal.' + M.id) + (claimed ? ' ' + ['I', 'II', 'III'][claimed - 1] : '') }),
        U.el('p', { text: t('medald.' + M.id, { n: U.fmt(next) }) }),
        U.el('div', { class: 'qv-bar' }, UI.bar(done ? 1 : Math.min(1, v / next), 'qbar'), U.el('em', { text: done ? '✓' : U.fmt(Math.min(v, next)) + ' / ' + U.fmt(next) })),
        U.el('div', { class: 'mv2-tiers' }, ...M.tiers.map((n, i) => U.el('div', { class: 'mv2-tier' + (i < claimed ? ' got' : i < reached ? ' ready' : '') },
          U.el('span', { html: this.medalSvg(i, M.icon, 40) }), U.el('small', { text: t('medal.t_' + (i + 1)) }), U.el('b', { text: U.fmt(n) })))),
        reached > claimed ? U.el('button', { class: 'btn green pulse', text: t('medal.claim'), onclick: () => claimOne(M) }) : null);
      body.append(wall, det);
    };
    draw();
    UI.sheet({ title: t('medal.title'), body, bar, cls: 'mv2-sheet', onClose: () => { UI.hudUpdate(); UI.checkQuests(); } });
  },

  /* ---------------- arena trophy ---------------- */
  trophySvg(league, size) {
    const c = ARENA_LEAGUE[league].color;
    return `<svg viewBox="0 0 80 90" width="${size}" height="${size * 1.125}"><defs><linearGradient id="tg${league}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="${c}"/><stop offset="1" stop-color="${U.shade(c, -0.22)}"/></linearGradient></defs>` +
      `<path d="M22 8h36v16c0 12-8 22-18 22S22 36 22 24z" fill="url(#tg${league})" stroke="#2b2040" stroke-width="4" stroke-linejoin="round"/>` +
      `<path d="M22 13H10c0 12 5 18 14 20M58 13h12c0 12-5 18-14 20" fill="none" stroke="#2b2040" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M34 46h12v12h8v10H26V58h8z" fill="url(#tg${league})" stroke="#2b2040" stroke-width="4" stroke-linejoin="round"/>` +
      `<rect x="20" y="68" width="40" height="12" rx="3" fill="#6b4a9a" stroke="#2b2040" stroke-width="4"/>` +
      `<path d="M40 16l3 6.2 6.8.9-5 4.7 1.3 6.7L40 31.3l-6.1 3.2 1.3-6.7-5-4.7 6.8-.9z" fill="#fff" stroke="#2b2040" stroke-width="2"/></svg>`;
  },
  trophy(league, reward) {
    return new Promise(res => {
      const body = U.el('div', { class: 'sigil-box' },
        U.el('div', { class: 'sigil-big', html: this.trophySvg(league, 150) }),
        U.el('p', { html: t('ar.champ_done', { league: t('ar.' + league) }) }),
        UI.rewardChips(reward),
        U.el('div', { class: 'row' }, U.el('button', { class: 'btn green', text: t('ui.ok'), onclick: () => h.close(true) })));
      const h = UI.modal({ title: t('ar.champ_title'), body, cls: 'small', closable: false, color: 'gold', onClose: res });
      Snd.play('medal');
      Platform.happy();
      UI.burst(...UI.mid(300), ['#ffe066', '#ffffff', ARENA_LEAGUE[league].color], 34, 260);
    });
  },
});
