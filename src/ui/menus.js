'use strict';
/* Menus & popups. */

const ISLE_COL = { sunny: '#5cb947', coral: '#36a3ff', ember: '#ff6b3d', frost: '#8fd8ff', storm: '#a07cff', eclipse: '#5a2a9a' };
const SHOP_ADS = 3; // free candies per day for a rewarded ad
const CODEX_MILESTONES = [[5, { nova: 2 }], [10, { candy: 1 }], [20, { egg_star: 1 }], [30, { candy: 2 }], [40, { egg_star: 1, candy: 1 }], [48, { galaxy: 2, egg_star: 1 }]];

const Menus = {
  /* ---------------- the Tamer Card: the tamer on their island (left); a licence card with the numbers that matter,
   * the island Sigils, the arena trophies and this month's Ascendant (right) */
  profile() {
    const s = Game.s, st = s.stats;
    let h;
    const need = Game.tamerNeed(s.tamer.lv), n = Medals.claimable().length;
    const hero = U.el('div', { class: 'pf-hero' },
      U.el('div', { class: 'pf-fig el-earth' }, U.el('div', { class: 'tv-ped' }), U.img(WArt.portrait(s.look), 'pf-art')),
      U.el('b', { class: 'pf-nm', text: s.name }),
      U.el('div', { class: 'pf-rk' }, U.el('span', { class: 'pf-rkb' }, U.el('small', { text: t('ui.rank') }), U.el('b', { text: s.tamer.lv })),
        U.el('div', { class: 'pf-xp' }, UI.bar(s.tamer.xp / need, 'txp'), U.el('small', { text: U.fmt(s.tamer.xp) + ' / ' + U.fmt(need) + ' XP' }))),
      U.el('div', { class: 'pf-btns' },
        U.el('button', { class: 'btn sm' + (n ? ' green pulse' : ' purple'), html: WArt.icon('medal', 22) + ' ' + t('medal.title') + ' <small>' + Medals.count() + '/' + MEDALS.length * 3 + '</small>' + (n ? ' <i class="pf-dot">' + n + '</i>' : ''), onclick: () => { h.close(true); this.medals(); } }),
        U.el('button', { class: 'btn sm white', text: t('pf.look'), onclick: async () => {
          h.close(true);
          const r = await IntroScene.customize(s.look, s.name);
          if (!r) return;
          s.look = r.look; s.name = r.name; Game.save();
          if (UI.cur === ExploreScene) {
            if (!ExploreScene.home) ExploreScene.saveState();
            UI.go(ExploreScene, ExploreScene.home ? { home: true } : { zone: Game.s.loc.zone, returning: true });
          } else UI.hudBuild();
        } })));
    // the numbers: six big tiles
    const tiles = U.el('div', { class: 'pf-tiles' });
    for (const [k, v, ic, c] of [['pf.caught', Game.codexCount() + '<small>/' + SPECIES_ORDER.length + '</small>', 'codex', 'blue'], ['pf.catches', U.fmt(st.catches), 'orb', 'teal'],
      ['pf.wins', U.fmt(st.wins), 'swords', 'red'], ['pf.tamers', U.fmt(st.tamers), 'badge', 'gold'], ['pf.shinies', U.fmt(st.shinies), 'star', 'pink'], ['pf.evos', U.fmt(st.evolutions), 'evolve', 'violet']])
      tiles.appendChild(U.el('div', { class: 'pf-tile c-' + c }, U.el('span', { class: 'pf-ic', html: WArt.icon(ic, 26) }), U.el('b', { html: v }), U.el('small', { text: t(k) })));
    const sigN = ISLES.filter(is => s.sigils.includes(is.id)).length, troN = ARENA.filter(L => Arena.cleared(L)).length;
    const head = (k, have, of) => U.el('div', { class: 'pf-h' }, U.el('b', { text: t(k) }), U.el('em', { text: have + ' / ' + of }));
    const card = U.el('div', { class: 'pf-card' }, tiles,
      U.el('div', { class: 'pf-row2' },
        U.el('div', { class: 'pf-sec' }, head('pf.sigils', sigN, ISLES.length),
          U.el('div', { class: 'pf-sigils' }, ...ISLES.map(is => U.el('div', { class: 'pf-sig' + (s.sigils.includes(is.id) ? ' on' : ''), title: t('isle.' + is.id), html: this.sigilSvg(is.id, 58) })))),
        U.el('div', { class: 'pf-sec' }, head('pf.trophies', troN, ARENA.length),
          U.el('div', { class: 'pf-tros' }, ...ARENA.map(L => U.el('div', { class: 'pf-tro' + (Arena.cleared(L) ? ' on' : ''), title: t('ar.' + L.id), html: this.trophySvg(L.id, 50) }))))),
      U.el('div', { class: 'pf-asc2' }, U.el('span', { html: signIcon(Game.ascendant(), 40) }),
        U.el('div', {}, U.el('b', { text: t('pf.asc', { sign: t('sign.' + Game.ascendant()) }) }), U.el('small', { text: t('pf.asc_d') }))));
    const body = U.el('div', { class: 'pf' }, hero, card);
    h = UI.sheet({ title: t('pf.title'), body, cls: 'pf-sheet' });
  },

  /* ---------------- team & storage ---------------- */
  /** a stage: the leader in the middle on the high pedestal (it fights first), the other two on either side, all of
   *  them big; below it the storage shelf of Orbling tiles */
  team() {
    const body = U.el('div', { class: 'tv' });
    let order = [];
    const orderNow = () => order;
    const draw = () => {
      body.innerHTML = '';
      const team = Game.team();
      const box = Game.boxMons();
      const sorted = box.slice().sort((a, b) => this.boxSort === 'new' ? b.t - a.t : this.boxSort === 'sign' ? SIGN[SPECIES[a.sp].sign].idx - SIGN[SPECIES[b.sp].sign].idx || b.lv - a.lv : b.lv - a.lv);
      order = [...Game.s.team, ...sorted.map(x => x.id)];
      const stage = U.el('div', { class: 'tv-stage' });
      for (const i of [1, 0, 2]) stage.appendChild(this.teamSlot(team[i], i, draw, orderNow));
      const sorts = U.el('div', { class: 'seg' });
      for (const k of ['lv', 'new', 'sign']) sorts.appendChild(U.el('button', { class: 'snd' + (this.boxSort === k ? ' on' : ''), onclick: () => { this.boxSort = k; draw(); } }, t('tm.sort_' + k)));
      const shelf = U.el('div', { class: 'tv-shelf' });
      if (!sorted.length) shelf.appendChild(U.el('p', { class: 'tv-none', text: t('tm.nobox') }));
      for (const m of sorted) shelf.appendChild(this.monTile(m, () => this.monDetail(m.id, draw, orderNow)));
      body.append(stage, U.el('div', { class: 'tv-box' }, U.el('div', { class: 'tv-head' }, U.el('b', { class: 'tv-label' }, t('tm.storage'), U.el('em', { text: box.length })), sorts), shelf));
    };
    this.boxSort = this.boxSort || 'lv';
    draw();
    UI.sheet({ title: t('hud.team'), body, cls: 'team-sheet', onClose: () => { UI.hudUpdate(); UI.checkQuests(); if (UI.cur === ArenaScene) ArenaScene.draw(); } });
  },
  teamSlot(m, i, redraw, order) {
    const lead = i === 0 ? ' lead' : '';
    if (!m) return U.el('div', { class: 'tv-slot empty' + lead }, U.el('div', { class: 'tv-fig' }, U.el('div', { class: 'tv-ped' }), U.el('span', { class: 'tv-plus', text: '+' })), U.el('b', { class: 'tv-name', text: t('tm.empty') }));
    const sp = SPECIES[m.sp], mx = Game.maxHp(m), fr = U.clamp(m.hp / mx, 0, 1);
    return U.el('button', { class: 'tv-slot snd el-' + sp.el + lead + (m.hp <= 0 ? ' ko' : ''), style: { '--sz': this.artK(sp) }, onclick: () => this.monDetail(m.id, redraw, order) },
      U.el('div', { class: 'tv-fig' }, U.el('div', { class: 'tv-ped' }), U.img(MonArt.url(m.sp, { shiny: m.shiny, size: 'lg' }), 'tv-art' + (MonArt.floats(m.sp) ? ' fly' : '')),
        i === 0 ? U.el('span', { class: 'tv-lead', text: t('tm.leader') }) : null),
      U.el('b', { class: 'tv-name', text: sp.name + (m.shiny ? ' ✦' : '') }),
      U.el('div', { class: 'tv-meta' }, U.el('span', { html: signIcon(sp.sign, 26) + elIcon(sp.el, 26) }), U.el('em', { text: t('ui.lv') + ' ' + m.lv })),
      U.el('div', { class: 'tv-hp' }, UI.bar(fr, UI.hpClass(fr)), U.el('small', { text: m.hp + '/' + mx })));
  },
  /** display scale of an Orbling's big picture: evolved stages stand taller, but only a little, so every stage fits the
   *  same frame (species size runs 0.8 … 1.16 → 0.84 … 1) */
  artK(sp) { return (0.84 + (sp.size - 0.8) * 0.45).toFixed(3); },
  /** an Orbling tile: the Orbling itself fills it, standing out of a disc in its element's colour */
  monTile(m, onclick) {
    const sp = SPECIES[m.sp];
    return U.el('button', { class: 'mtile snd el-' + sp.el + ' r-' + sp.rarity, onclick },
      U.el('div', { class: 'mt-art' }, U.img(MonArt.url(m.sp, { shiny: m.shiny }))),
      U.el('b', { text: sp.name }), U.el('em', { text: t('ui.lv') + ' ' + m.lv }),
      Camp.training(m.id) ? U.el('span', { class: 'mt-flag', title: t('camp.dojo'), html: WArt.icon('dojo', 16) }) : Base.busy(m.id) ? U.el('span', { class: 'mt-flag', title: t('ws.' + Base.busy(m.id)), html: WArt.icon('hammer', 16) }) : null);
  },

  /* ---------------- the Orbling page: the Orbling big on its island (left) and what it can do behind three tabs
   * (right); the bar pages through the Orblings in the order of the page it was opened from */
  monDetail(id, onChange, order) {
    let m = Game.mon(id);
    if (!m) return;
    // the page it came from hands over its order (a function, so a new leader or a re-sorted storage shows at once)
    const ringNow = () => (typeof order === 'function' ? order() : order || [...Game.s.team, ...Game.s.box]).filter(x => Game.mon(x));
    let ring = ringNow();
    const body = U.el('div', { class: 'od' });
    const nav = U.el('div', { class: 'od-nav' });
    let h;
    this.odTab = this.odTab || 'stats';
    // the page behind first, so its order (a new leader, a re-sorted storage) is current when this page redraws
    const refresh = () => { if (onChange) onChange(); draw(); UI.hudUpdate(); };
    const go = d => { ring = ringNow(); const i = ring.indexOf(m.id), n = Game.mon(ring[(i + d + ring.length) % ring.length]); if (n && n !== m) { m = n; Snd.play('click'); draw(); } };
    const keys = e => { if (UI.stack[UI.stack.length - 1] !== h) return; if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); };
    const draw = () => {
      body.innerHTML = '';
      const sp = SPECIES[m.sp], st = Game.stats(m), mx = st.hp;
      const inTeam = Game.s.team.includes(m.id), lead = Game.s.team[0] === m.id;
      for (const e of EL_ORDER) body.classList.toggle('el-' + e, e === sp.el);
      nav.innerHTML = '';
      ring = ringNow();
      const at = ring.indexOf(m.id);
      if (ring.length > 1 && at >= 0) nav.append(
        U.el('button', { class: 'sh-back od-prev snd nosnd', title: '◀', html: WArt.icon('back', 26), onclick: () => go(-1) }),
        U.el('em', { class: 'od-count', text: (at + 1) + ' / ' + ring.length }),
        U.el('button', { class: 'sh-back od-next snd nosnd', title: '▶', html: WArt.icon('back', 26), onclick: () => go(1) }));
      // hero: the Orbling on its island (tap it: it hops and calls), its name and what it is
      const art = U.img(MonArt.url(m.sp, { shiny: m.shiny, size: 'lg' }), 'od-art' + (MonArt.floats(m.sp) ? ' fly' : '') + (m.hp <= 0 ? ' ko' : ''));
      art.addEventListener('click', () => { art.classList.remove('hop'); void art.offsetWidth; art.classList.add('hop'); Snd.cry(m.sp); });
      const hero = U.el('div', { class: 'od-hero' },
        U.el('div', { class: 'od-fig', style: { '--sz': this.artK(sp) } }, U.el('div', { class: 'tv-ped' }), art,
          lead ? U.el('span', { class: 'tv-lead', text: t('tm.leader') }) : null),
        U.el('b', { class: 'od-name' }, sp.name, m.shiny ? U.el('i', { class: 'od-shiny', text: '✦' }) : null),
        U.el('div', { class: 'od-tags' },
          U.el('span', { class: 'od-tag', html: signIcon(sp.sign, 26) + '<b>' + t('sign.' + sp.sign) + '</b>' }),
          U.el('span', { class: 'od-tag', html: elIcon(sp.el, 26) + '<b>' + t('el.' + sp.el) + '</b>' }),
          U.el('span', { class: 'od-rar r-' + sp.rarity, text: t('rar.' + sp.rarity) })),
        U.el('div', { class: 'od-love' }, U.el('span', { title: t('od.friend'), html: UI.hearts(m) }),
          U.el('button', { class: 'od-fav snd' + (m.fav ? ' on' : ''), title: t('home.fav'), html: WArt.icon('star', 24), onclick: () => { m.fav = !m.fav; Game.save(); refresh(); } })),
        Camp.training(m.id) ? U.el('div', { class: 'od-train', html: WArt.icon('dojo', 18) + ' ' + t('camp.intraining') }) : null);
      // the card: level, XP and HP always in view; stats / moves / evolution one at a time
      const need = Game.xpNeed(m.lv), maxed = m.lv >= MAX_LV, hf = m.hp / mx;
      const status = U.el('div', { class: 'od-status' },
        U.el('div', { class: 'od-lv' }, U.el('small', { text: t('ui.lv') }), U.el('b', { text: m.lv })),
        U.el('div', { class: 'od-bars' },
          U.el('div', { class: 'od-bar' }, U.el('span', { text: 'XP' }), UI.bar(maxed ? 1 : m.xp / need, 'xp'), U.el('small', { text: maxed ? 'MAX' : U.fmt(m.xp) + ' / ' + U.fmt(need) })),
          U.el('div', { class: 'od-bar' }, U.el('span', { text: t('ui.hp') }), UI.bar(hf, UI.hpClass(hf)), U.el('small', { text: m.hp + ' / ' + mx }))));
      const tabs = U.el('div', { class: 'od-tabs' });
      for (const [k, label] of [['stats', t('od.stats')], ['moves', t('md.moves')], ['evo', t('od.evo')]])
        tabs.appendChild(U.el('button', { class: 'od-tab snd' + (this.odTab === k ? ' on' : ''), onclick: () => { if (this.odTab !== k) { this.odTab = k; draw(); } } },
          label, k === 'evo' && Game.canEvolve(m) ? U.el('i', { class: 'od-ping' }) : null));
      const page = U.el('div', { class: 'od-page od-p-' + this.odTab });
      if (this.odTab === 'moves') this.odMoves(page, m, refresh);
      else if (this.odTab === 'evo') this.odEvo(page, m, refresh);
      else this.odStats(page, m, st, refresh);
      // actions: what fits this Orbling right now; releasing it sits apart, on the left
      const acts = U.el('div', { class: 'od-acts' });
      if (!sp.legend) acts.appendChild(U.el('button', { class: 'btn sm red od-free' + (inTeam && Game.s.team.length <= 1 ? ' off' : ''), text: t('md.release'), onclick: async () => {
        const coins = 10 + m.lv * 4, dust = Math.max(1, (DUST_FOR[sp.stage] || 2) - 1);
        if (await UI.confirm(t('md.release_q2', { name: sp.name, n: coins, d: dust }))) { if (Game.release(m.id)) { Game.addCoins(coins); Game.addDust(sp.sign, dust); Snd.play('coin'); h.close(); if (onChange) onChange(); UI.hudUpdate(); Game.save(); } }
      } }));
      acts.appendChild(U.el('i', { class: 'od-gap' }));
      if (m.hp > 0 && m.hp < mx && Game.item('potion') + Game.item('superpotion') > 0) acts.appendChild(U.el('button', { class: 'btn green', html: WArt.icon('heal', 22) + ' ' + t('md.heal'), onclick: () => { const it = Game.item('potion') ? 'potion' : 'superpotion'; Game.useItem(it); m.hp = Math.min(mx, m.hp + Math.ceil(mx * ITEMS[it].heal)); Snd.play('heal'); refresh(); } }));
      if (m.hp <= 0 && Game.item('revive')) acts.appendChild(U.el('button', { class: 'btn green', html: WArt.icon('heal', 22) + ' ' + t('it.revive'), onclick: () => { Game.useItem('revive'); m.hp = Math.ceil(mx / 2); Snd.play('heal'); refresh(); } }));
      if (Game.canEvolve(m)) acts.appendChild(U.el('button', { class: 'btn purple pulse', html: WArt.icon('evolve', 22) + ' ' + t('md.evolve'), onclick: async () => { await this.evolve(m); Game.save(); refresh(); } }));
      if (inTeam && !lead) acts.appendChild(U.el('button', { class: 'btn white', html: WArt.icon('crown', 22) + ' ' + t('md.leader'), onclick: () => { Game.setLeader(m.id); refresh(); } }));
      if (inTeam) acts.appendChild(U.el('button', { class: 'btn blue' + (Game.s.team.length <= 1 ? ' off' : ''), text: t('md.tobox'), onclick: () => { if (Game.toBox(m.id)) { refresh(); h.close(); } } }));
      else acts.appendChild(U.el('button', { class: 'btn green', text: t('md.toteam'), onclick: () => this.toTeam(m, () => { refresh(); h.close(); }) }));
      body.append(hero, U.el('div', { class: 'od-side' }, U.el('div', { class: 'od-card' }, tabs, status, page), acts));
    };
    draw();
    window.addEventListener('keydown', keys);
    h = UI.sheet({ title: '', body, bar: nav, cls: 'od-sheet', onClose: () => { window.removeEventListener('keydown', keys); Game.save(); UI.checkQuests(); } });
  },
  /** stats tab: the five stats as a star chart, the sign's trait, potential (with the stardust boost), friendship */
  odStats(page, m, st, refresh) {
    const sp = SPECIES[m.sp], S = SIGN[sp.sign];
    page.appendChild(this.radar(m, st));
    const col = U.el('div', { class: 'od-col' });
    col.appendChild(U.el('div', { class: 'od-box' }, U.el('div', { class: 'od-bh', html: signIcon(sp.sign, 26) + '<b>' + t('trait.' + S.trait) + '</b><small>' + t('od.trait') + '</small>' }),
      U.el('p', { text: t('traitd.' + S.trait) })));
    const stars = Game.stars(m), dustN = Game.dust(sp.sign);
    const pot = U.el('div', { class: 'od-box' }, U.el('div', { class: 'od-bh' }, U.el('span', { class: 'od-stars', html: '★'.repeat(stars) + '<i>' + '★'.repeat(3 - stars) + '</i>' }), U.el('b', { text: t('od.pot') })),
      U.el('p', { text: t('od.pot_d') }));
    if (!sp.legend) pot.appendChild(U.el('div', { class: 'od-dust' },
      U.el('span', { title: t('md.dust', { n: dustN, sign: t('sign.' + sp.sign) }), html: `<img src="${WArt.item('dust')}" width="30" alt=""><b>${dustN}</b>` }),
      U.el('button', { class: 'btn sm purple' + (Game.canBoost(m) ? '' : ' nope'), html: t('md.boost', { n: DUST_BOOST }), onclick: () => {
        if (!Game.canBoost(m)) { Snd.play('error'); UI.toast(t(dustN < DUST_BOOST ? 'md.boost_need' : 'md.boost_max', { n: DUST_BOOST }), 'bad'); return; }
        const s0 = Game.stars(m);
        Game.boost(m); Snd.play('levelup'); Game.save();
        UI.toast(Game.stars(m) > s0 ? t('md.boost_star', { name: sp.name }) : t('md.boost_ok', { name: sp.name }), 'good');
        refresh();
      } })));
    col.appendChild(pot);
    const hn = Base.hearts(m);
    col.appendChild(U.el('div', { class: 'od-box' }, U.el('div', { class: 'od-bh', html: WArt.icon('heart', 22, 'on') + '<b>' + t('od.friend') + '</b>' }),
      UI.bar(Base.heartProg(m), 'fr'), U.el('p', { text: hn >= 5 ? t('fr.max') : t('fr.next', { perk: t('fr.p_' + (hn + 1)) }) })));
    page.appendChild(col);
  },
  /** the five stats as a star chart: the shape is the Orbling's build (species × potential), the numbers its stats now */
  radar(m, st) {
    const K = ['hp', 'atk', 'def', 'spd', 'mag'], b = SPECIES[m.sp].base;
    const w = k => b[k] * m.pot[k], ref = Math.max(...K.map(w)) * 1.08;
    const C = 110, R = 88, xy = (i, f) => { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; return [(C + Math.cos(a) * R * f).toFixed(1), (C + Math.sin(a) * R * f).toFixed(1)]; };
    const ring = f => K.map((k, i) => xy(i, f).join(',')).join(' ');
    const fr = k => Math.max(0.16, w(k) / ref);
    let svg = '<svg viewBox="0 0 220 220" width="220" height="220" aria-hidden="true">';
    svg += `<polygon points="${ring(1)}" fill="#f3f7fc" stroke="#b9cbe2" stroke-width="3" stroke-linejoin="round"/>`;
    for (const f of [0.75, 0.5, 0.25]) svg += `<polygon points="${ring(f)}" fill="none" stroke="#d3dfee" stroke-width="2" stroke-linejoin="round"/>`;
    K.forEach((k, i) => { const [x, y] = xy(i, 1); svg += `<line x1="${C}" y1="${C}" x2="${x}" y2="${y}" stroke="#d3dfee" stroke-width="2"/>`; });
    svg += `<polygon class="od-shape" points="${K.map((k, i) => xy(i, fr(k)).join(',')).join(' ')}" fill="var(--e-md)" fill-opacity=".6" stroke="var(--e-dk)" stroke-width="4" stroke-linejoin="round"/>`;
    K.forEach((k, i) => { const [x, y] = xy(i, fr(k)); svg += `<circle cx="${x}" cy="${y}" r="6" fill="#fff" stroke="var(--e-dk)" stroke-width="3"/>`; });
    const box = U.el('div', { class: 'od-radar', html: svg + '</svg>' });
    K.forEach((k, i) => box.appendChild(U.el('div', { class: 'od-ax a' + i }, U.el('b', { text: st[k] }), U.el('small', { text: k === 'hp' ? t('ui.hp') : t('stat.' + k) }))));
    return box;
  },
  /** one line about a move: energy (or free), power or what it does, its side effect, whether it is quick */
  moveLine(id) {
    const mv = MOVES[id], parts = [mv.cost ? `<i class="en">⚡${mv.cost}</i>` : `<i class="free">${t('b.free')}</i>`];
    parts.push(mv.pow ? `${t('b.pow')} ${mv.pow}${mv.hits ? '×' + mv.hits : ''}` : t('mc.' + mv.cat));
    if (mv.status && mv.cat !== 'status') parts.push(t('st.' + mv.status[0]));
    if (mv.prio) parts.push(t('b.quick'));
    return parts.join(' · ');
  },
  /** moves tab: every move it knows as a card; up to four go into battle */
  odMoves(page, m, refresh) {
    page.appendChild(U.el('div', { class: 'od-mh' },
      U.el('div', { class: 'od-mh-t' }, U.el('b', { text: t('od.equip', { n: m.equip.length }) }), U.el('small', { text: t('od.equip_h') })),
      U.el('button', { class: 'btn sm blue', html: WArt.icon('star', 18) + ' ' + t('md.tutor'), onclick: () => this.tutor(m, refresh) })));
    const grid = U.el('div', { class: 'od-moves' });
    for (const mid of m.moves) {
      const mv = MOVES[mid], on = m.equip.includes(mid);
      grid.appendChild(U.el('button', { class: 'od-mv snd ' + (mv.el ? 'el-' + mv.el : 'el-none') + (on ? ' on' : ''), onclick: () => {
        const isFree = x => MOVES[x].cost === 0 && MOVES[x].pow;
        if (on) {
          if (m.equip.length <= 1) return;
          if (isFree(mid) && !m.equip.some(x => x !== mid && isFree(x))) { UI.toast(t('md.nofree'), 'bad'); return; }
          m.equip = m.equip.filter(x => x !== mid);
        } else { if (m.equip.length >= 4) { UI.toast(t('md.max4')); return; } m.equip.push(mid); }
        refresh();
      } },
        U.el('span', { class: 'od-mv-ic', html: mv.el ? elIcon(mv.el, 32) : WArt.icon(mv.pow ? 'swords' : mv.cat === 'heal' ? 'heal' : 'star', 26) }),
        U.el('span', { class: 'od-mv-t' }, U.el('b', { text: t('mv.' + mid) }), U.el('small', { html: this.moveLine(mid) })),
        U.el('span', { class: 'od-mv-ck', html: WArt.icon('check', 20) })));
    }
    page.appendChild(grid);
  },
  /** evolution tab: the whole line, big; the way to the next stage; candy to hurry it */
  odEvo(page, m, refresh) {
    const sp = SPECIES[m.sp], line = evoLine(m.sp), at = line.indexOf(m.sp);
    const chain = U.el('div', { class: 'od-chain' + (line.length > 1 ? '' : ' solo') });
    line.forEach((sid, i) => {
      const known = Game.seen(sid) || sid === m.sp;
      if (i) chain.appendChild(U.el('div', { class: 'od-arrow' + (i <= at ? ' done' : '') }, U.el('i'), U.el('small', { text: t('ui.lv') + ' ' + SPECIES[line[i - 1]].evoLv })));
      chain.appendChild(U.el('div', { class: 'od-stage el-' + SPECIES[sid].el + (sid === m.sp ? ' cur' : '') + (known ? '' : ' unk') },
        U.el('div', { class: 'od-st-art' }, U.img(MonArt.url(sid, { shiny: sid === m.sp && m.shiny }))), U.el('b', { text: known ? SPECIES[sid].name : '???' })));
    });
    page.appendChild(chain);
    const foot = U.el('div', { class: 'od-evo-foot' });
    if (Game.canEvolve(m)) foot.append(U.el('p', { class: 'od-ready', text: t('od.evo_ready', { name: sp.name }) }),
      U.el('button', { class: 'btn purple pulse', html: WArt.icon('evolve', 24) + ' ' + t('md.evolve'), onclick: async () => { await this.evolve(m); Game.save(); refresh(); } }));
    else if (sp.evoTo) foot.appendChild(U.el('div', { class: 'od-prog' }, U.el('b', { text: t('od.evo_at', { lv: sp.evoLv }) }), UI.bar(m.lv / sp.evoLv, 'xp'), U.el('small', { text: m.lv + ' / ' + sp.evoLv })));
    else foot.appendChild(U.el('p', { class: 'od-final', html: WArt.icon('star', 22) + ' ' + t(sp.legend ? 'od.evo_legend' : 'od.evo_final') }));
    if (Game.item('candy') && m.lv < MAX_LV) foot.appendChild(U.el('div', { class: 'od-candy' },
      U.el('img', { src: WArt.item('candy'), width: 40, alt: '' }), U.el('span', { text: t('od.candy', { n: Game.item('candy') }) }),
      U.el('button', { class: 'btn sm purple', text: t('md.candy'), onclick: () => this.useCandy(m, refresh) })));
    page.appendChild(foot);
  },
  /** the move tutor: Star moves of the other elements and a few support moves, for coins (the coin sink of 2.9) */
  tutor(m, done) {
    const sp = SPECIES[m.sp], list = [];
    for (const el of EL_ORDER) if (el !== sp.el) {
      list.push([EL_KIT[el].a, 1000, 1]);
      list.push([EL_KIT[el].m2, 3000, 17]);
    }
    for (const id of ['guard_up', 'focus', 'lullaby', 'star_heal']) list.push([id, 1500, 10]);
    const body = U.el('div', { class: 'tutor' }, U.el('p', { class: 'tu-intro', html: t('tu.intro', { name: sp.name }) }));
    const rows = U.el('div', { class: 'tu-list' });
    const draw = () => {
      rows.innerHTML = '';
      for (const [id, price, lv] of list) {
        const mv = MOVES[id], known = m.moves.includes(id), low = m.lv < lv;
        rows.appendChild(U.el('div', { class: 'tu-row od-mv on ' + (mv.el ? 'el-' + mv.el : 'el-none') + (known ? ' known' : '') },
          U.el('span', { class: 'od-mv-ic', html: mv.el ? elIcon(mv.el, 30) : WArt.icon(mv.pow ? 'swords' : mv.cat === 'heal' ? 'heal' : 'star', 24) }),
          U.el('span', { class: 'od-mv-t' }, U.el('b', { text: t('mv.' + id) }), U.el('small', { html: this.moveLine(id) })),
          known ? U.el('em', { class: 'tu-known', html: WArt.icon('check', 16) + ' ' + t('tu.known') })
            : low ? U.el('em', { class: 'tu-lv', text: t('tu.lv', { lv }) })
              : U.el('button', { class: 'btn sm ' + (Game.s.coins >= price ? 'green' : 'white nope'), html: `<img src="${WArt.item('coin')}" width="20" alt=""> ` + U.fmt(price), onclick: () => {
                if (Game.s.coins < price) { Snd.play('error'); UI.toast(t('tu.poor'), 'bad'); return; }
                Game.addCoins(-price); m.moves.push(id);
                if (m.equip.length < 4) m.equip.push(id);
                Snd.play('levelup'); Game.save(); UI.hudUpdate();
                UI.toast(t('tu.learned', { name: sp.name, move: t('mv.' + id) }), 'good');
                draw(); if (done) done();
              } })));
      }
    };
    draw();
    body.appendChild(rows);
    UI.modal({ title: t('md.tutor'), body, cls: 'tutor-modal' });
  },
  toTeam(m, done) {
    if (Camp.training(m.id)) {
      const r = Camp.claim(m.id);
      if (r) UI.toast(t('camp.got', { name: SPECIES[m.sp].name, n: U.fmt(r.xp) }), 'good');
    }
    if (Game.s.team.length < TEAM_MAX) { Game.toTeam(m.id); done(); return; }
    const list = U.el('div', { class: 'pick-team' });
    for (const tm of Game.team()) {
      list.appendChild(U.el('button', { class: 'pt-card snd', onclick: () => { Game.toTeam(m.id, tm.id); h.close(true); done(); } }, UI.monPortrait(tm, 'big'), U.el('div', { class: 'pt-info' }, U.el('b', { text: SPECIES[tm.sp].name }), U.el('small', { text: t('ui.lv') + ' ' + tm.lv }))));
    }
    const h = UI.modal({ title: t('md.swapwith'), body: list });
  },
  async useCandy(m, refresh) {
    if (!Game.useItem('candy')) return;
    const r = Game.gainXp(m, Game.xpNeed(m.lv) - m.xp);
    Snd.play('levelup');
    UI.toast(t('b.lvl', { name: SPECIES[m.sp].name, lv: m.lv }), 'good');
    for (const id of r.learned) UI.toast(t('b.learn', { name: SPECIES[m.sp].name, move: t('mv.' + id) }));
    refresh();
    if (Game.canEvolve(m)) { await this.evolve(m); refresh(); }
    Game.save();
    await UI.checkQuests();
  },

  /* ---------------- codex ---------------- */
  /* ---------------- the Codex: a zodiac wheel of the twelve signs (left); the picked sign's line of four Orblings,
   * big, with the chosen one's entry, and the collection rewards along a track (right) */
  codex(pick) {
    const body = U.el('div', { class: 'cx' });
    const lineOf = s => [...LINES[s].ids, LINES[s].legend];
    const stOf = id => Game.caught(id) ? 2 : Game.seen(id) ? 1 : 0;
    if (pick && SPECIES[pick]) { this.cxSign = SPECIES[pick].sign; this.cxPick = pick; }
    if (!this.cxSign) this.cxSign = Game.team()[0] ? SPECIES[Game.team()[0].sp].sign : SIGNS[0].id;
    const draw = () => {
      body.innerHTML = '';
      const caught = Game.codexCount(), total = SPECIES_ORDER.length, seen = SPECIES_ORDER.filter(id => Game.seen(id)).length;
      const wheel = U.el('div', { class: 'cx-wheel' },
        U.el('div', { class: 'cx-hub', style: { '--p': (caught / total * 360).toFixed(1) + 'deg' } },
          U.el('b', { html: caught + '<small>/' + total + '</small>' }), U.el('span', { text: t('cx.caught_s') }), U.el('small', { text: t('cx.seen', { n: seen }) })));
      SIGNS.forEach((s, i) => {
        const ids = lineOf(s.id), got = ids.filter(id => stOf(id) === 2).length, a = -Math.PI / 2 + i * Math.PI / 6;
        wheel.appendChild(U.el('button', { class: 'cx-sg snd el-' + s.el + (this.cxSign === s.id ? ' on' : '') + (got === ids.length ? ' full' : ''), title: t('sign.' + s.id),
          style: { left: (50 + Math.cos(a) * 40).toFixed(2) + '%', top: (50 + Math.sin(a) * 40).toFixed(2) + '%' }, onclick: () => { if (this.cxSign !== s.id) { this.cxSign = s.id; this.cxPick = null; draw(); } } },
          U.el('span', { html: signIcon(s.id, 46) }), U.el('i', { class: 'cx-pips', html: ids.map(id => '<u class="p' + stOf(id) + '"></u>').join('') })));
      });
      const S = SIGN[this.cxSign], ids = lineOf(this.cxSign);
      if (!ids.includes(this.cxPick)) this.cxPick = ids.find(id => stOf(id)) || ids[0];
      const line = U.el('div', { class: 'cx-line' });
      ids.forEach((id, i) => {
        const sp = SPECIES[id], st = stOf(id);
        if (i) line.appendChild(U.el('i', { class: 'cx-arr' + (i === ids.length - 1 ? ' leg' : '') }));
        line.appendChild(U.el('button', { class: 'cx-card snd st' + st + ' el-' + sp.el + (this.cxPick === id ? ' on' : '') + (sp.legend ? ' leg' : ''), onclick: () => { if (this.cxPick !== id) { this.cxPick = id; draw(); } } },
          U.el('div', { class: 'cx-art' }, U.img(MonArt.url(id))), U.el('b', { text: st ? sp.name : '???' }), U.el('small', { text: '#' + sp.no }),
          st === 2 ? U.el('span', { class: 'cx-ok', html: WArt.icon('check', 14) }) : null));
      });
      const sp = SPECIES[this.cxPick], st = stOf(this.cxPick), where = [];
      for (const zid in ZONES) if (ZONES[zid].spawns.some(([x]) => x === this.cxPick)) where.push(t('zone.' + zid));
      const hab = where.length ? where.join(', ') : sp.legend ? t('cx.obs') : sp.evoFrom ? t('cx.evolve', { name: Game.seen(sp.evoFrom) ? SPECIES[sp.evoFrom].name : '???', lv: SPECIES[sp.evoFrom].evoLv }) : '—';
      const entry = U.el('div', { class: 'cx-entry' },
        U.el('div', { class: 'cx-eh' }, U.el('b', { text: st ? sp.name : '???' }), U.el('span', { class: 'od-rar r-' + sp.rarity, text: sp.legend ? t('cx.legend') : t('rar.' + sp.rarity) })),
        U.el('p', { text: st === 2 ? t('d.' + this.cxPick) : t('cx.unknown') }),
        st ? U.el('div', { class: 'cx-hab' }, U.el('b', { text: t('cx.habitat') }), U.el('span', { text: hab })) : null);
      const page = U.el('div', { class: 'cx-page' },
        U.el('div', { class: 'cx-sh' }, U.el('span', { html: signIcon(this.cxSign, 58) }),
          U.el('div', { class: 'cx-sh-t' }, U.el('b', { text: t('sign.' + this.cxSign) }), U.el('small', { html: elIcon(S.el, 20) + ' ' + t('el.' + S.el) + ' · ' + t('trait.' + S.trait) })),
          U.el('em', { text: ids.filter(id => stOf(id) === 2).length + ' / ' + ids.length })),
        line, entry, this.cxMiles(caught, draw));
      body.append(wheel, page);
    };
    draw();
    UI.sheet({ title: t('hud.codex'), body, cls: 'cx-sheet' });
  },
  /** the collection rewards: nodes along a track that fills as the Codex does (evenly spaced, filled piece by piece) */
  cxMiles(caught, redraw) {
    const M = CODEX_MILESTONES, N = M.length, pos = i => (i + 1) / N;
    let fill = 1;
    for (let i = 0; i < N; i++) if (caught < M[i][0]) { const n0 = i ? M[i - 1][0] : 0, p0 = i ? pos(i - 1) : 0; fill = p0 + (caught - n0) / (M[i][0] - n0) * (pos(i) - p0); break; }
    const track = U.el('div', { class: 'cx-miles2' }, U.el('div', { class: 'cx-mbar' }, U.el('i', { style: { width: (fill * 100).toFixed(1) + '%' } })));
    M.forEach(([n, r], i) => {
      const claimed = (Game.s.flags.cx || []).includes(n), ready = caught >= n && !claimed, [k0, v0] = Object.entries(r)[0];
      track.appendChild(U.el('button', { class: 'cx-m snd' + (claimed ? ' done' : ready ? ' ready' : ''), style: { left: (pos(i) * 100).toFixed(2) + '%' }, title: t('cx.mile', { n }), onclick: () => {
        if (claimed) return;
        if (!ready) { UI.toast(t('cx.mile', { n })); return; }
        Game.s.flags.cx = (Game.s.flags.cx || []).concat(n);
        Game.grant(r); UI.hudUpdate(); Game.save();
        UI.rewards(t('cx.reward'), r); redraw();
      } }, U.el('span', { html: `<img src="${UI.rewardIcon(k0)}" width="30" alt="">` + (Object.keys(r).length > 1 ? '<i>+</i>' : v0 > 1 ? '<i>×' + v0 + '</i>' : '') + (claimed ? WArt.icon('check', 18, 'cx-done') : '') }), U.el('b', { text: n })));
    });
    return track;
  },
  codexDetail(id) { this.codex(id); },

  /* ---------------- bag ---------------- */
  /* ---------------- the bag: every item as a big tile (left); the picked one, what it does, and on whom to use it
   * (right) */
  bag() {
    const body = U.el('div', { class: 'bg' });
    let h;
    const draw = () => {
      body.innerHTML = '';
      const ids = ['berry'].concat(SHOP_LIST).filter(id => Game.item(id) > 0);
      if (!ids.length) { body.appendChild(U.el('p', { class: 'bg-empty', text: t('bag.empty') })); return; }
      if (!ids.includes(this.bagPick)) this.bagPick = ids[0];
      const grid = U.el('div', { class: 'bg-grid' });
      for (const id of ids) grid.appendChild(U.el('button', { class: 'bg-tile snd' + (this.bagPick === id ? ' on' : ''), onclick: () => { if (this.bagPick !== id) { this.bagPick = id; draw(); } } },
        U.img(WArt.item(id)), U.el('b', { text: t('it.' + id) }), U.el('em', { text: '×' + Game.item(id) })));
      const id = this.bagPick, it = ITEMS[id];
      const usable = ['berry', 'potion', 'superpotion', 'revive', 'candy'].includes(id);
      const det = U.el('div', { class: 'bg-det' }, U.el('div', { class: 'bg-art' }, U.img(WArt.item(id))),
        U.el('b', { class: 'bg-nm', text: t('it.' + id) }), U.el('span', { class: 'bg-n', text: t('bag.have', { n: Game.item(id) }) }), U.el('p', { text: t('itd.' + id) }));
      if (usable) {
        const mons = U.el('div', { class: 'bg-mons' });
        for (const m of Game.team().concat(Game.boxMons())) {
          const mx = Game.maxHp(m), ok = it.kind === 'heal' ? m.hp > 0 && m.hp < mx : it.kind === 'revive' ? m.hp <= 0 : it.kind === 'level' ? m.lv < MAX_LV : false;
          mons.appendChild(U.el('button', { class: 'bg-mon snd el-' + SPECIES[m.sp].el + (ok ? '' : ' off'), onclick: () => { if (ok) this.applyItem(id, m, draw); else Snd.play('error'); } },
            U.el('div', { class: 'mt-art' }, U.img(MonArt.url(m.sp, { shiny: m.shiny }))), U.el('b', { text: SPECIES[m.sp].name }),
            UI.bar(m.hp / mx, UI.hpClass(m.hp / mx)), U.el('small', { text: t('ui.lv') + ' ' + m.lv + ' · ' + m.hp + '/' + mx })));
        }
        det.append(U.el('div', { class: 'bg-h', text: t('bag.who') }), mons);
      } else if (it.kind === 'egg') det.appendChild(U.el('button', { class: 'btn purple', html: WArt.icon('tent', 22) + ' ' + t('camp.incubate'), onclick: () => { h.close(true); this.camp('hatch'); } }));
      else if (ORB_IDS.includes(id) || id === 'ether') det.appendChild(U.el('p', { class: 'bg-note', html: WArt.icon('swords', 18) + ' ' + t('bag.battle') }));
      body.append(grid, det);
    };
    draw();
    h = UI.sheet({ title: t('hud.bag'), body, cls: 'bg-sheet' });
  },
  /** a healing item or a candy used on an Orbling from the Bag */
  applyItem(id, m, after) {
    const it = ITEMS[id], mx = Game.maxHp(m);
    if (it.kind === 'level') { this.useCandy(m, () => { after(); UI.hudUpdate(); }); return; }
    Game.useItem(id);
    if (it.kind === 'heal') m.hp = Math.min(mx, m.hp + Math.ceil(mx * it.heal)); else m.hp = Math.ceil(mx * it.heal);
    Snd.play('heal'); UI.toast(t('bag.used', { name: SPECIES[m.sp].name }), 'good');
    after(); UI.hudUpdate(); Game.save(); UI.checkQuests();
  },

  /* ---------------- quests: Pip tells the main quest in a big speech bubble (left); Pip's requests, the characters'
   * requests and the daily quests as clear cards (right) */
  quests() {
    const body = U.el('div', { class: 'qv' });
    const rw = r => { const c = UI.rewardChips(Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'txp'))); c.classList.add('mini'); return c; };
    const prog = (c, n, label) => U.el('div', { class: 'qv-bar' }, UI.bar(Math.min(1, c / n), 'qbar'), U.el('em', { text: label || Math.min(c, n) + ' / ' + n }));
    const mq = Quests.main();
    let bubble;
    if (mq) {
      const [c, n] = Quests.progress(mq), hint = Quests.hintIsle(mq);
      bubble = U.el('div', { class: 'qv-bub' }, U.el('small', { text: t('q.main') + ' · ' + (Game.s.quests.main + 1) + ' / ' + MAIN_QUESTS.length }), U.el('b', { text: Quests.text(mq) }), prog(c, n),
        hint ? U.el('span', { class: 'qv-hint', html: WArt.icon('map', 18) + ' ' + t('q.where', { isle: t('isle.' + hint) }) }) : null,
        U.el('div', { class: 'qv-rw' }, rw(mq.reward)));
    } else bubble = U.el('div', { class: 'qv-bub' }, U.el('b', { text: t('q.alldone') }));
    const hero = U.el('div', { class: 'qv-hero' }, U.el('div', { class: 'qv-pip' }, U.img(WArt.pip(mq ? '' : 'wow'))), bubble);
    const list = U.el('div', { class: 'qv-list' });
    const sec = (title, extra) => list.appendChild(U.el('div', { class: 'qv-h' }, U.el('b', { text: title }), extra ? U.el('small', { text: extra }) : null));
    const side = Quests.side();
    if (side.length) sec(t('q.side'));
    for (const sq of side) {
      const [c, n] = Quests.progress(sq), hint = Quests.hintIsle(sq);
      list.appendChild(U.el('div', { class: 'qv-card' }, U.el('span', { class: 'qv-ic', html: WArt.icon('star', 24) }),
        U.el('div', { class: 'qv-t' }, U.el('b', { text: Quests.text(sq) }), prog(c, n), hint ? U.el('small', { class: 'qv-hint', text: t('q.where', { isle: t('isle.' + hint) }) }) : null), rw(sq.reward)));
    }
    // the characters' requests (mini-stories)
    const stories = Base.activeStories();
    if (stories.length) sec(t('st.title'));
    for (const S of stories) {
      const [c, n] = Base.storyProg(S);
      list.appendChild(U.el('div', { class: 'qv-card story' + (c >= n ? ' ready' : '') }, U.img(WArt.person(tamerLook(S.npc)), 'qv-face'),
        U.el('div', { class: 'qv-t' }, U.el('b', { text: t('st.' + S.id + '.q') }), U.el('small', { text: UI.whoName(S.npc) + ' · ' + t('isle.' + S.isle) }), prog(c, n, c >= n ? t('st.ready') : null)),
        U.img(decorUrl(S.reward.decor), 'qv-deco')));
    }
    const daily = Quests.dailyOpen() ? Quests.ensureDaily() : { list: [] };
    if (daily.list.length) {
      const now = new Date(), tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      sec(t('q.daily'), t('q.reset', { time: U.fmtTime(tomorrow - now) }));
    }
    for (const dq of daily.list) {
      const [c, n] = Quests.progress(dq, dq.base);
      list.appendChild(U.el('div', { class: 'qv-card' + (dq.claimed ? ' done' : '') }, U.el('span', { class: 'qv-ic d', html: WArt.icon(dq.claimed ? 'check' : 'calendar', 24) }),
        U.el('div', { class: 'qv-t' }, U.el('b', { text: Quests.text(dq) }), prog(c, n, dq.claimed ? '✓' : null)), rw(dq.reward)));
    }
    body.appendChild(hero);
    if (list.children.length) body.appendChild(list); else body.classList.add('solo');
    UI.sheet({ title: t('hud.quests'), body, cls: 'qv-sheet' });
  },

  /* ---------------- shop ---------------- */
  /* ---------------- the shop: categories on the left (and the free candy for an ad), big product cards on the right;
   * the purse sits in the page bar */
  shop() {
    const body = U.el('div', { class: 'sv' });
    const purse = U.el('div', { class: 'sv-purse' });
    const CATS = [['orbs', 'orb', ['orb', 'nova', 'galaxy']], ['care', 'potion', ['potion', 'superpotion', 'ether', 'revive']],
      ['eggs', 'egg_star', ['egg_fire', 'egg_water', 'egg_earth', 'egg_air', 'egg_star']], ['extra', 'candy', ['candy']]];
    if (!CATS.some(c => c[0] === this.svCat)) this.svCat = 'orbs';
    const draw = () => {
      body.innerHTML = '';
      purse.innerHTML = `<img src="${WArt.item('coin')}" alt=""><b>${U.fmt(Game.s.coins)}</b>`;
      const s = Game.s;
      if (s.daily.day !== U.today()) s.daily = { day: U.today(), free: false, ads: 0 };
      const cats = U.el('div', { class: 'sv-cats' });
      for (const [k, ic] of CATS) cats.appendChild(U.el('button', { class: 'sv-cat snd' + (this.svCat === k ? ' on' : ''), onclick: () => { if (this.svCat !== k) { this.svCat = k; draw(); } } },
        U.img(WArt.item(ic)), U.el('b', { text: t('shop.c_' + k) })));
      // rewarded ad: a free candy, three times a day (optional, never the only way to progress)
      if (Platform.adsOk()) {
        const left = SHOP_ADS - (s.daily.shopAds || 0);
        const adBtn = U.el('button', { class: 'btn sm ad' + (left > 0 ? '' : ' off'), html: UI.adIcon(20) + ' ' + (left > 0 ? t('shop.watch', { n: left }) : t('shop.ads_done')), onclick: async () => {
          if (left <= 0) return;
          adBtn.classList.add('off');
          if (await Platform.rewardedBreak()) { s.daily.shopAds = (s.daily.shopAds || 0) + 1; Game.addItem('candy', 1); Snd.play('coin'); Game.save(); UI.toast(`<img src="${WArt.item('candy')}"> +1 ${t('it.candy')}`, 'good'); }
          else UI.toast(t('ui.adfail'), 'bad');
          draw();
        } });
        cats.appendChild(U.el('div', { class: 'sv-free' }, U.img(WArt.item('candy')), U.el('div', { class: 'sv-free-t' }, U.el('b', { text: t('shop.free') }), U.el('small', { text: t('shop.free_d') })), adBtn));
      }
      const grid = U.el('div', { class: 'sv-grid' });
      for (const id of CATS.find(c => c[0] === this.svCat)[2]) {
        const cost = ITEMS[id].price;
        if (!cost) continue;
        const can = n => Game.s.coins >= cost * n;
        const buy = n => {
          if (!can(n)) { Snd.play('error'); UI.toast(t('shop.nocoins'), 'bad'); return; }
          Game.addCoins(-cost * n);
          Game.addItem(id, n); Snd.play('coin'); UI.toast(`<img src="${WArt.item(id)}"> +${n} ${t('it.' + id)}`, 'good');
          UI.hudUpdate(); Game.save(); draw();
        };
        const price = n => `<img src="${WArt.item('coin')}" alt="">${U.fmt(cost * n)}`;
        const five = cost < 500;
        grid.appendChild(U.el('div', { class: 'sv-card' }, Game.item(id) ? U.el('em', { class: 'sv-own', text: '×' + Game.item(id) }) : null,
          U.el('div', { class: 'sv-art' }, U.img(WArt.item(id))), U.el('b', { text: t('it.' + id) }), U.el('small', { text: t('itd.' + id) }),
          U.el('div', { class: 'sv-buy' },
            U.el('button', { class: 'btn sm green' + (can(1) ? '' : ' off'), html: (five ? '<i>1×</i> ' : '') + price(1), onclick: () => buy(1) }),
            five ? U.el('button', { class: 'btn sm green' + (can(5) ? '' : ' off'), html: '<i>5×</i> ' + price(5), onclick: () => buy(5) }) : null)));
      }
      body.append(cats, grid);
    };
    draw();
    UI.sheet({ title: t('hud.shop'), body, bar: purse, cls: 'sv-sheet', onClose: () => UI.hudUpdate() });
  },

  /* ---------------- daily spin ---------------- */
  spin(done) {
    const s = Game.s;
    if (s.daily.day !== U.today()) s.daily = { day: U.today(), free: false, ads: 0 };
    const N = SPIN_PRIZES.length, seg = 360 / N;
    const cols = ['#ff7ab6', '#ffd23f', '#5cd6ff', '#9dff7a', '#b08cff', '#ff9a5a', '#7ff0d8', '#ff6b6b', '#ffe98a', '#8fb8ff'];
    let svg = '<svg viewBox="-210 -210 420 420" class="wheel-svg">';
    SPIN_PRIZES.forEach(([k, n], i) => {
      const a0 = (i * seg - 90 - seg / 2) * Math.PI / 180, a1 = ((i + 1) * seg - 90 - seg / 2) * Math.PI / 180;
      svg += `<path d="M0 0L${(Math.cos(a0) * 200).toFixed(1)} ${(Math.sin(a0) * 200).toFixed(1)}A200 200 0 0 1 ${(Math.cos(a1) * 200).toFixed(1)} ${(Math.sin(a1) * 200).toFixed(1)}Z" fill="${cols[i % cols.length]}" stroke="#2b2040" stroke-width="4"/>`;
      const am = (i * seg - 90) * Math.PI / 180;
      const ix = Math.cos(am) * 135, iy = Math.sin(am) * 135;
      svg += `<g transform="translate(${ix.toFixed(1)} ${iy.toFixed(1)}) rotate(${i * seg})"><image href="${UI.rewardIcon(k)}" x="-24" y="-34" width="48" height="48"/><text y="30" text-anchor="middle" font-size="22" font-weight="900" fill="#2b2040" font-family="Arial">${k === 'coins' ? n : '×' + n}</text></g>`;
    });
    svg += '<circle r="200" fill="none" stroke="#2b2040" stroke-width="8"/><circle r="206" fill="none" stroke="#ffd23f" stroke-width="6" stroke-dasharray="4 18"/></svg>';
    const wheel = U.el('div', { class: 'wheel', html: svg });
    wheel.style.transform = `rotate(${this._spinRot || 0}deg)`;
    const btn = U.el('button', { class: 'btn lg green' });
    const note = U.el('small', { class: 'spin-note' });
    const upd = () => {
      if (!s.daily.free) { btn.className = 'btn lg green'; btn.innerHTML = t('spin.free'); note.textContent = t('spin.note'); }
      else if (s.daily.ads < 2 && Platform.adsOk()) { btn.className = 'btn lg ad'; btn.innerHTML = UI.adIcon(30) + ' ' + t('spin.ad', { n: 2 - s.daily.ads }); note.textContent = t('spin.again'); }
      else { btn.className = 'btn lg off'; btn.innerHTML = t('spin.tomorrow'); note.textContent = ''; }
    };
    upd();
    let spinning = false;
    btn.onclick = async () => {
      if (spinning) return;
      if (s.daily.free) {
        if (s.daily.ads >= 2) return;
        btn.classList.add('off');
        const ok = await Platform.rewardedBreak();
        if (!ok) { UI.toast(t('ui.adfail'), 'bad'); upd(); return; }
        s.daily.ads++;
      } else s.daily.free = true;
      spinning = true; btn.classList.add('off');
      const idx = U.weighted(SPIN_PRIZES.map((p, i) => [i, p[2]]));
      const [k, n] = SPIN_PRIZES[idx];
      const r = { [k]: n };
      Game.grant(r);
      Game.s.stats.spins++;
      Game.save();
      const base = this._spinRot || 0;
      const target = base - (base % 360) + 360 * 5 + (360 - idx * seg) + U.rf(-seg * 0.3, seg * 0.3);
      this._spinRot = target;
      wheel.style.transition = 'transform 4.2s cubic-bezier(.12,.72,.18,1)';
      wheel.style.transform = `rotate(${target}deg)`;
      let tick = 0;
      const tk = setInterval(() => { tick++; if (tick < 40) Snd.play('tick'); }, 90);
      await U.sleep(4300);
      clearInterval(tk);
      UI.hudUpdate();
      await UI.rewards(t('spin.won'), r);
      spinning = false;
      upd();
      const done = Quests.check();
      if (done.length) await UI.questDone(done);
      UI.hudUpdate();
    };
    // the odds, in the open (a daily gift, not a slot machine)
    const tot = SPIN_PRIZES.reduce((a, p) => a + p[2], 0);
    const odds = U.el('div', { class: 'spin-odds' }, U.el('b', { text: t('spin.odds') }), U.el('div', {}, ...SPIN_PRIZES.map(([k, n, w]) => U.el('span', { html: `<img src="${UI.rewardIcon(k)}">${k === 'coins' ? n : '×' + n} <em>${(w / tot * 100).toLocaleString(langTag(LANG), { maximumFractionDigits: 1 })}%</em>` }))));
    const body = U.el('div', { class: 'spinbox' }, U.el('div', { class: 'wheel-wrap' }, wheel, U.el('div', { class: 'wheel-ptr' }), U.el('div', { class: 'wheel-hub', html: WArt.icon('star', 40) })), U.el('div', { class: 'spin-side' }, U.el('p', { text: t('spin.desc') }), btn, note, odds));
    UI.modal({ title: t('spin.title'), body, cls: 'mid', onClose: () => { UI.hudUpdate(); if (done) done(); } });
  },

  /* ---------------- settings & help ---------------- */
  settings() {
    const s = Game.s;
    const body = U.el('div', { class: 'settings' });
    const draw = () => {
      body.innerHTML = '';
      const tog = (label, on, fn, icon) => U.el('div', { class: 'set-row' }, U.el('span', { html: WArt.icon(icon, 26) + ' ' + label }), U.el('button', { class: 'toggle snd' + (on ? ' on' : ''), onclick: fn }, U.el('i')));
      body.append(
        tog(t('set.music'), Snd.musicOn, () => { Snd.setMusic(!Snd.musicOn); if (s) s.settings.music = Snd.musicOn; Main.saveSettings(); draw(); }, 'music'),
        tog(t('set.sfx'), Snd.sfxOn, () => { Snd.setSfx(!Snd.sfxOn); if (s) s.settings.sfx = Snd.sfxOn; Main.saveSettings(); draw(); }, 'sound'),
        tog(t('set.fast'), !!Main.settings.fast, () => { Main.settings.fast = !Main.settings.fast; Main.saveSettings(); draw(); }, 'fast'),
        tog(t('set.shake'), Main.settings.shake !== false, () => { Main.settings.shake = Main.settings.shake === false; Main.saveSettings(); draw(); }, 'bolt'),
        tog(t('set.lite'), Main.lite, () => { Main.settings.lite = !Main.lite; Main.setLite(Main.settings.lite); Main.saveSettings(); draw(); }, 'star'),
        U.el('div', { class: 'set-row lang-row' }, U.el('span', { html: WArt.icon('lang', 26) + ' ' + t('set.lang') }),
          U.el('div', { class: 'lang-grid' }, ...LANGS.filter(([l]) => langReady(l)).map(([l, name]) => U.el('button', { class: 'btn sm ' + (LANG === l ? 'blue' : 'white'), text: name, lang: langTag(l), onclick: () => { setLang(l); if (s) s.settings.lang = l; Main.saveSettings(); h.close(true); Main.refreshLang(); } })))),
        U.el('div', { class: 'row' }, U.el('button', { class: 'btn sm', html: WArt.icon('info', 20) + ' ' + t('set.help'), onclick: () => this.typeChart() }),
          s ? U.el('button', { class: 'btn sm red', text: t('set.reset'), onclick: async () => { if (await UI.confirm(t('set.reset_q'))) { Game.wipe(); location.reload(); } } }) : null),
        U.el('small', { class: 'ver', text: 'Orbling Skies v' + VERSION + ' · ' + Platform.kind }));
    };
    draw();
    const h = UI.modal({ title: t('hud.settings'), body, cls: 'small' });
  },
  /* ---------------- signs & elements: the element cycle as a big wheel with the rules beside it; the twelve sign
   * traits as cards (two tabs in the page bar) */
  typeChart() {
    const body = U.el('div', { class: 'tcv' });
    const tabs = U.el('div', { class: 'seg' });
    if (this.tcTab !== 'signs') this.tcTab = 'el';
    const draw = () => {
      body.innerHTML = ''; tabs.innerHTML = '';
      for (const [k, label] of [['el', t('tc.elements')], ['signs', t('tc.traits')]])
        tabs.appendChild(U.el('button', { class: 'snd' + (this.tcTab === k ? ' on' : ''), onclick: () => { if (this.tcTab !== k) { this.tcTab = k; draw(); } } }, label));
      body.classList.toggle('signs', this.tcTab === 'signs');
      if (this.tcTab === 'el') {
        const cyc = U.el('div', { class: 'tcv-cyc', html: this.cycleSvg() });
        EL_ORDER.forEach((el, i) => cyc.appendChild(U.el('div', { class: 'tcv-el el-' + el + ' p' + i }, U.el('span', { html: elIcon(el, 64) }), U.el('b', { text: t('el.' + el) }))));
        cyc.appendChild(U.el('div', { class: 'tcv-mid' }, U.el('b', { text: t('tc.x15') }), U.el('small', { text: t('tc.beats') })));
        body.append(cyc, U.el('div', { class: 'tcv-rules' },
          U.el('div', { class: 'tcv-rule' }, U.el('span', { class: 'tcv-ri', html: WArt.icon('target', 26) }), U.el('p', { html: t('help.rule1') })),
          U.el('div', { class: 'tcv-rule' }, U.el('span', { class: 'tcv-ri b', html: WArt.icon('bolt', 26) }), U.el('p', { html: t('help.rule2') })),
          U.el('div', { class: 'tcv-rule' }, U.el('span', { class: 'tcv-ri g', html: WArt.icon('heal', 26) }), U.el('p', { html: t('help.rule3') }))));
      } else {
        const grid = U.el('div', { class: 'tcv-signs' });
        for (const s of SIGNS) grid.appendChild(U.el('div', { class: 'tcv-sg el-' + s.el }, U.el('span', { class: 'tcv-sgi', html: signIcon(s.id, 46) }),
          U.el('div', { class: 'tcv-sg-t' }, U.el('b', { html: t('sign.' + s.id) + ' ' + elIcon(s.el, 18) }), U.el('em', { text: t('trait.' + s.trait) }), U.el('small', { text: t('traitd.' + s.trait) }))));
        body.appendChild(grid);
      }
    };
    draw();
    UI.sheet({ title: t('help.title'), body, bar: tabs, cls: 'tcv-sheet' });
  },
  /** the element wheel: each element beats the next one clockwise (×1.5) — arcs with arrowheads and a label each */
  cycleSvg() {
    const C = 220, R = 150;
    let s = '<svg viewBox="0 0 440 440" width="440" height="440" aria-hidden="true"><defs>';
    for (const el of EL_ORDER) s += `<marker id="tca-${el}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.4" markerHeight="3.4" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${ELEMENTS[el].color}" stroke="#0a121b" stroke-width="1.4" stroke-linejoin="round"/></marker>`;
    s += '</defs>';
    EL_ORDER.forEach((el, i) => {
      const a0 = (-90 + i * 90 + 25) * Math.PI / 180, a1 = (-90 + (i + 1) * 90 - 27) * Math.PI / 180;
      const p = (a, r) => (C + Math.cos(a) * r).toFixed(1) + ' ' + (C + Math.sin(a) * r).toFixed(1);
      const d = `M${p(a0, R)}A${R} ${R} 0 0 1 ${p(a1, R)}`;
      s += `<path d="${d}" fill="none" stroke="#0a121b" stroke-width="15" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${ELEMENTS[el].color}" stroke-width="9" stroke-linecap="round" marker-end="url(#tca-${el})"/>`;
      const [lx, ly] = p((a0 + a1) / 2, R + 36).split(' ');
      s += `<g transform="translate(${lx} ${ly})"><rect x="-32" y="-16" width="64" height="32" rx="13" fill="#ffffff" stroke="#0a121b" stroke-width="3"/><text y="7" text-anchor="middle" style="font: italic 900 19px var(--f-ui)" fill="#1b2940">${t('tc.x15')}</text></g>`;
    });
    return s + '</svg>';
  },

  /* ---------------- the Zodiac Observatory: this month's Ascendant on top; the twelve legends as big cards */
  observatory() {
    const body = U.el('div', { class: 'ob' });
    const asc = Game.ascendant();
    let h;
    const grid = U.el('div', { class: 'ob-grid' });
    for (const s of SIGNS) {
      const lid = LINES[s.id].legend, has = Game.hasLegend(s.id), ready = Game.legendReady(s.id);
      grid.appendChild(U.el('div', { class: 'ob-card el-' + s.el + (has ? ' has' : ready ? ' ready' : '') + (s.id === asc ? ' asc' : '') },
        s.id === asc ? U.el('span', { class: 'ob-asc', text: t('obs.asc') }) : null,
        U.el('div', { class: 'ob-art' }, U.el('span', { class: 'ob-sg', html: signIcon(s.id, 34) }), U.img(MonArt.url(lid), has ? '' : 'sil')),
        U.el('b', { text: has || Game.seen(lid) ? SPECIES[lid].name : '???' }), U.el('small', { text: t('sign.' + s.id) }),
        has ? U.el('em', { class: 'ob-ok', html: WArt.icon('check', 16) + ' ' + t('obs.owned') })
          : ready ? U.el('button', { class: 'btn sm purple pulse', text: t('obs.challenge'), onclick: () => { h.close(true); this.startLegend(lid); } })
            : U.el('em', { class: 'ob-req', text: t('obs.req', Object.assign({ sign: t('sign.' + s.id) }, Game.legendNeed(s.id))) })));
    }
    body.append(U.el('div', { class: 'ob-intro' }, U.el('span', { html: signIcon(asc, 46) }), U.el('p', { html: t('obs.intro', { sign: t('sign.' + asc) }) })), grid);
    h = UI.sheet({ title: t('ex.obs'), body, cls: 'ob-sheet' });
  },
  async startLegend(lid) {
    if (!Game.teamAlive()) { UI.toast(t('pip.needheal'), 'bad'); return; }
    await UI.talk([{ who: lid, text: t('obs.appears', { name: SPECIES[lid].name }) }]);
    const mon = Game.makeMon(lid, LEGEND_LV, { noShiny: true });
    if (UI.cur === ExploreScene) ExploreScene.saveState();
    UI.go(BattleScene, { kind: 'legend', enemies: [mon], zone: Game.s.loc.zone });
  },

  /* ---------------- the big moments (a catch, a hatch, an evolution): a full-screen burst in the Orbling's element
   * colour, a banner, the Orbling on its island in the middle; its details and the button follow */
  reveal(o) {
    const fig = U.el('div', { class: 'rv-fig' }, U.el('div', { class: 'rv-glow' }), U.el('div', { class: 'tv-ped' }));
    const info = U.el('div', { class: 'rv-info' });
    const row = U.el('div', { class: 'rv-row' });
    const banner = U.el('div', { class: 'rv-banner ' + (o.color || '') }, U.el('b', { text: o.title }), o.isNew ? U.el('span', { class: 'rv-new', text: t('cap.new') }) : null);
    const body = U.el('div', { class: 'rv el-' + SPECIES[o.sp].el }, U.el('div', { class: 'rv-rays' }), banner, fig, info, row);
    const h = UI.sheet({ bare: true, body, cls: 'rv-sheet', closable: false, onClose: o.onClose });
    return { h, body, fig, info, row, banner };
  },
  /** an Orbling's big picture for a reveal (its own display scale, floating or standing) */
  revealArt(sp, shiny, cls) {
    const img = U.img(MonArt.url(sp, { shiny, size: 'lg' }), 'rv-art ' + (cls || '') + (MonArt.floats(sp) ? ' fly' : ''));
    img.style.setProperty('--sz', this.artK(SPECIES[sp]));
    return img;
  },
  /** the details under the Orbling: its name; sign, element, rarity, potential and level; a line or two of news */
  revealInfo(info, m, lines) {
    const sp = SPECIES[m.sp], stars = Game.stars(m);
    info.append(
      U.el('b', { class: 'rv-name' }, sp.name, m.shiny ? U.el('i', { class: 'od-shiny', text: '✦' }) : null),
      U.el('div', { class: 'od-tags' },
        U.el('span', { class: 'od-tag', html: signIcon(sp.sign, 26) + '<b>' + t('sign.' + sp.sign) + '</b>' }),
        U.el('span', { class: 'od-tag', html: elIcon(sp.el, 26) + '<b>' + t('el.' + sp.el) + '</b>' }),
        U.el('span', { class: 'od-rar r-' + sp.rarity, text: t('rar.' + sp.rarity) }),
        U.el('span', { class: 'od-tag rv-lv', title: t('md.stars_h'), html: '<span class="od-stars">' + '★'.repeat(stars) + '<i>' + '★'.repeat(3 - stars) + '</i></span><b>' + t('ui.lv') + ' ' + m.lv + '</b>' })),
      ...lines.filter(Boolean).map(l => U.el('p', { class: 'rv-line', html: l })));
  },
  /** where the burst of a reveal goes: the Orbling's middle */
  revealMid() { return UI.mid(UI.portrait ? 470 : 300); },
  evolve(m) {
    return new Promise(res => {
      const from = m.sp, to = Game.canEvolve(m);
      if (!to) { res(); return; }
      const track = Snd.cur, inBattle = UI.cur === BattleScene;
      Snd.stopMusic();
      const r = this.reveal({ sp: from, title: t('evo.title'), color: 'purple', onClose: () => { if (!inBattle && track) Snd.music(track); res(); } });
      r.fig.append(this.revealArt(from, m.shiny, 'evo-a'), this.revealArt(to, m.shiny, 'evo-b'));
      r.info.appendChild(U.el('p', { class: 'rv-line big', html: t('evo.start', { name: SPECIES[from].name }) }));
      Snd.play('evolve');
      r.fig.classList.add('go');
      setTimeout(() => {
        Game.evolve(m);
        UI.hudUpdate();
        r.fig.classList.remove('go'); r.fig.classList.add('done');
        Snd.play('levelup'); Snd.cry(to);
        UI.burst(...this.revealMid(), ['#ffffff', '#ffe066', '#e0b8ff', '#8fd8ff'], 34, 260);
        r.info.innerHTML = '';
        this.revealInfo(r.info, m, [t('evo.done', { name: SPECIES[from].name, to: SPECIES[to].name })]);
        r.row.appendChild(U.el('button', { class: 'btn green', text: t('ui.ok'), onclick: () => r.h.close(true) }));
        Game.save();
      }, 3000);
    });
  },
  /** spoils: the battle's coins and XP, shown under the catch (3.4: no separate "Victory!" window after it) */
  caughtCard(m, isNew, where, dust, spoils) {
    return new Promise(res => {
      const r = this.reveal({ sp: m.sp, title: t('cap.title'), isNew, onClose: res });
      r.fig.appendChild(this.revealArt(m.sp, m.shiny, 'pop'));
      this.revealInfo(r.info, m, [t(where === 'team' ? 'cap.team' : 'cap.box'),
        dust ? `<img src="${WArt.item('dust')}" width="28" alt=""> ` + t('cap.dust', { n: dust, sign: t('sign.' + SPECIES[m.sp].sign) }) : null]);
      if (spoils) r.row.appendChild(UI.pills(spoils)); // (beside OK: the page stays as tall as before)
      r.row.appendChild(U.el('button', { class: 'btn green', text: t('ui.ok'), onclick: () => r.h.close(true) }));
      UI.burst(...this.revealMid(), ['#ffe066', '#ffffff', '#8fd8ff', '#ff8fd0'], 30, 240);
    });
  },
  sigilSvg(isle, size) {
    const c = ISLE_COL[isle] || '#ffd23f';
    return `<svg viewBox="0 0 60 60" width="${size}" height="${size}"><defs><radialGradient id="sg${isle}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${U.shade(c, -0.2)}"/></radialGradient></defs><path d="M30 3L37 10L47 9L49 19L57 25L53 34L56 44L46 47L41 56L31 52L21 56L16 47L6 44L9 34L4 25L12 19L14 9L24 10Z" fill="url(#sg${isle})" stroke="#2b2040" stroke-width="3" stroke-linejoin="round"/><path d="M30 17l4 8.5 9.3 1.2-6.8 6.4 1.7 9.2L30 37.9l-8.2 4.4 1.7-9.2-6.8-6.4 9.3-1.2z" fill="#fff" stroke="#2b2040" stroke-width="2.4" stroke-linejoin="round"/></svg>`;
  },
  sigil(isle) {
    return new Promise(res => {
      if (!Game.s.sigils.includes(isle)) Game.s.sigils.push(isle);
      const i = ISLE[isle].idx, next = ISLES[i + 1];
      Game.save();
      const body = U.el('div', { class: 'sigil-box' },
        U.el('div', { class: 'sigil-big', html: this.sigilSvg(isle, 160) }),
        U.el('p', { html: t('sig.got', { isle: t('isle.' + isle) }) }),
        next ? U.el('p', { class: 'sub', html: t('sig.next', { isle: t('isle.' + next.id) }) }) : null,
        U.el('div', { class: 'row' }, U.el('button', { class: 'btn green', text: t('ui.ok'), onclick: () => h.close(true) })));
      const h = UI.modal({ title: t('sig.title'), body, cls: 'small', closable: false, color: 'gold', onClose: async () => {
        if (!next) await UI.talk([{ who: 'g_umbra', text: t('end.u1') }, { who: 'prof', text: t('end.p1') }, { who: 'pip', text: t('end.p2') }, { who: 'prof', text: t('end.p3') }]);
        res();
      } });
      Snd.play('catch');
      UI.burst(...UI.mid(300), ['#ffe066', '#ffffff', ISLE_COL[isle]], 30, 240);
    });
  },
};
