'use strict';
/* Star Arena scene: pick a league on the left, climb its ladder of four challengers and a champion on
 * the right. Battles return here; the arena medic heals for free. */

const ArenaScene = {
  async enter(p) {
    const root = UI.scene;
    await WArt.bake('arena', 5);
    root.className = 'arena-scene';
    this.busy = false;
    root.append(WArt.bgImg('arena', 5, 'ar-bg'), U.el('div', { class: 'ar-dim' }));
    root.appendChild(U.el('div', { class: 'ar-title ol', text: t('ar.title') }));
    root.appendChild(U.el('button', { class: 'btn blue ar-back', html: WArt.icon('back', 24) + ' ' + t('gx.title'), onclick: () => this.back() }));
    const open = ARENA.filter(L => Arena.unlocked(L));
    this.league = p.league && ARENA_LEAGUE[p.league] && Arena.unlocked(ARENA_LEAGUE[p.league]) ? p.league
      : (open.find(L => !Arena.cleared(L)) || open[open.length - 1] || ARENA[0]).id;
    this.leftEl = U.el('div', { class: 'ar-leagues' });
    this.ladderEl = U.el('div', { class: 'ar-ladder' });
    this.teamEl = U.el('div', { class: 'ar-team' });
    root.append(this.leftEl, this.ladderEl, this.teamEl);
    this.draw();
    Snd.music('arena');
    Platform.gameplayStart();
    setTimeout(() => this.afterEnter(p), 350);
  },
  exit() {},
  async afterEnter(p) {
    if (UI.cur !== this) return;
    this.busy = true;
    try {
      if (p.result === 'lost') UI.toast(WArt.icon('heal', 24) + ' ' + t('ar.medic_lost'), 'good');
      await UI.checkQuests();
    } catch (e) { console.error(e); }
    this.busy = false;
    this.draw();
    Game.save();
  },
  draw() {
    // leagues
    this.leftEl.innerHTML = '';
    for (const L of ARENA) {
      const open = Arena.unlocked(L), n = Math.min(Arena.nextIdx(L), L.ids.length);
      this.leftEl.appendChild(U.el('button', { class: 'ar-lg snd' + (L.id === this.league ? ' on' : '') + (open ? '' : ' locked'), style: { '--lc': L.color }, onclick: () => {
        if (!open) { Snd.play('error'); UI.toast(WArt.icon('lock', 22) + ' ' + t('ar.locked', { n: L.sigils }), 'bad'); return; }
        this.league = L.id; this.draw();
      } },
        U.el('span', { class: 'ar-tro' + (Arena.cleared(L) ? ' won' : ''), html: Menus.trophySvg(L.id, 46) }),
        U.el('div', { class: 'ar-lg-t' }, U.el('b', { text: t('ar.' + L.id) }), U.el('small', { text: open ? t('ui.lv') + ' ' + L.lv[0] + '–' + L.lv[1] + ' · ' + n + '/' + L.ids.length : t('ar.need', { n: L.sigils }) })),
        open ? null : U.el('span', { class: 'ar-lock', html: WArt.icon('lock', 26) })));
    }
    // ladder
    const L = ARENA_LEAGUE[this.league], next = Arena.nextIdx(L);
    this.ladderEl.innerHTML = '';
    this.ladderEl.style.setProperty('--lc', L.color);
    this.ladderEl.appendChild(U.el('div', { class: 'ar-head' }, U.el('b', { text: t('ar.' + L.id) }), U.el('small', { text: t('ar.ladder') })));
    L.ids.forEach((id, i) => {
      const T = TAMERS[id], beaten = Game.beaten(id), avail = i <= next;
      const team = U.el('div', { class: 'ar-mons' }, ...(beaten && T.teamRe ? T.teamRe : T.team).map(([sp, lv]) => U.el('div', { class: 'ar-mon' }, U.img(MonArt.url(sp, { anim: false }), beaten || Game.seen(sp) ? '' : 'sil'), U.el('small', { text: t('ui.lv') + ' ' + lv }))));
      const reward = beaten ? U.el('small', { class: 'ar-rw', html: `<img src="${WArt.item('coin')}">${U.fmt(Math.round(T.reward * TRAINER_COINS * 0.3))}` })
        : U.el('small', { class: 'ar-rw first', html: `<img src="${WArt.item('coin')}">${U.fmt(Math.round(T.reward * TRAINER_COINS))}` + (T.champReward ? ' + ' + Object.keys(T.champReward).map(k => `<img src="${UI.rewardIcon(k)}">`).join('') : '') });
      const act = !avail ? U.el('span', { class: 'ar-st', html: WArt.icon('lock', 26) })
        : beaten ? U.el('button', { class: 'btn sm white', html: WArt.icon('check', 18) + ' ' + t('ar.rematch'), onclick: () => this.fight(id) })
          : U.el('button', { class: 'btn sm green pulse', text: t('ui.battle'), onclick: () => this.fight(id) });
      this.ladderEl.appendChild(U.el('div', { class: 'ar-row' + (T.champ ? ' champ' : '') + (beaten ? ' beaten' : '') + (avail ? '' : ' locked') },
        U.el('span', { class: 'ar-rank', text: T.champ ? '★' : String(i + 1) }),
        U.el('div', { class: 'ar-por' }, U.img(WArt.person(tamerLook(id)))),
        U.el('div', { class: 'ar-name' }, U.el('b', { text: T.name }), U.el('small', { text: T.champ ? t('gt.' + id) : t('cls.' + T.cls) })),
        team, reward, act));
    });
    // team + medic
    this.teamEl.innerHTML = '';
    for (const m of Game.team()) {
      const mx = Game.maxHp(m), fr = m.hp / mx;
      this.teamEl.appendChild(U.el('div', { class: 'tm' + (m.hp <= 0 ? ' ko' : '') }, UI.monPortrait(m), U.el('span', { class: 'tlv', text: t('ui.lv') + ' ' + m.lv }), UI.bar(fr, UI.hpClass(fr))));
    }
    this.teamEl.appendChild(U.el('button', { class: 'btn green ar-heal' + (Game.teamHurt() ? '' : ' off'), html: WArt.icon('heal', 24) + ' ' + t('ar.heal'), onclick: () => {
      Game.healAll(); Snd.play('heal'); Game.save();
      UI.toast(WArt.icon('heal', 24) + ' ' + t('ar.medic'), 'good');
      this.draw();
    } }));
    this.teamEl.appendChild(U.el('button', { class: 'btn sm purple ar-teambtn', html: WArt.icon('team', 22) + ' ' + t('hud.team'), onclick: () => Menus.team() }));
  },
  async fight(id) {
    if (this.busy || UI.busyGo) return;
    if (!Game.teamAlive()) { Snd.play('error'); UI.toast(t('ar.heal_first'), 'bad'); return; }
    this.busy = true;
    const T = TAMERS[id], beaten = Game.beaten(id);
    if (!beaten) await UI.talk(ExploreScene.tamerLines(id, 'i'));
    const bonus = beaten ? Math.min(4, Game.s.beaten[id]) : 0; // rematches get a little tougher
    const enemies = (beaten && T.teamRe ? T.teamRe : T.team).map(([sp, lv]) => Game.makeMon(sp, lv + bonus, { noShiny: true }));
    UI.go(BattleScene, { kind: 'arena', tamer: id, enemies, zone: Game.s.loc.zone }, { trans: 'battle' });
  },
  back() {
    if (this.busy) return;
    this.busy = true;
    UI.go(GalaxyScene, {});
  },
};
