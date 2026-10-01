'use strict';
/* Title screen */

function logoSvg() {
  // chunky rounded letters in a yellow-to-orange gradient on a thick teal slab; a star on each word (3.4: "Orbling Skies")
  const F = "'OG Logo', 'Lilita One', 'Arial Black', sans-serif";
  const word = (txt, x, y, size, ls) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-family="${F}" letter-spacing="${ls}"`;
  return `<svg class="logo-svg" viewBox="0 0 900 330">
  <defs>
    <linearGradient id="lgA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff8b0"/><stop offset=".45" stop-color="#ffd23a"/><stop offset="1" stop-color="#ff9a1a"/></linearGradient>
    <linearGradient id="lgT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2ec4c8"/><stop offset="1" stop-color="#0c5a70"/></linearGradient>
  </defs>
  ${word('ORBLING', 450, 150, 146, 6)} fill="url(#lgT)" stroke="#06232c" stroke-width="44" paint-order="stroke" stroke-linejoin="round">ORBLING</text>
  ${word('SKIES', 450, 284, 138, 16)} fill="url(#lgT)" stroke="#06232c" stroke-width="44" paint-order="stroke" stroke-linejoin="round">SKIES</text>
  ${word('ORBLING', 450, 144, 146, 6)} fill="url(#lgA)" stroke="#6a2a06" stroke-width="10" paint-order="stroke" stroke-linejoin="round">ORBLING</text>
  ${word('SKIES', 450, 278, 138, 16)} fill="url(#lgA)" stroke="#6a2a06" stroke-width="10" paint-order="stroke" stroke-linejoin="round">SKIES</text>
  ${word('ORBLING', 450, 144, 146, 6)} fill="none" stroke="#ffffff" stroke-width="3" opacity=".5" transform="translate(0 -4)">ORBLING</text>
  ${word('SKIES', 450, 278, 138, 16)} fill="none" stroke="#ffffff" stroke-width="3" opacity=".5" transform="translate(0 -4)">SKIES</text>
  <path d="M712 46l8 17 19 3-14 13 4 19-17-9-17 9 4-19-14-13 19-3z" fill="#fff6a0" stroke="#6a2a06" stroke-width="5" stroke-linejoin="round"/>
  <path d="M232 196l5 11 12 2-9 8 2 12-10-6-11 6 2-12-9-8 12-2z" fill="#ffffff" stroke="#06232c" stroke-width="4" stroke-linejoin="round"/>
  <path d="M676 214l4 8 9 1.4-6.6 6 1.6 9-8-4.4-8 4.4 1.6-9-6.6-6 9-1.4z" fill="#8ff0ff" stroke="#06232c" stroke-width="3.4" stroke-linejoin="round"/>
</svg>`;
}

const TitleScene = {
  /* 3.1: key art instead of the floating isles — the sun lion and the storm serpent of the opening face each other
   * behind the logo and its orbit, the Orblings line up on a glowing horizon, shooting stars cross the sky */
  async enter() {
    const root = UI.scene;
    root.className = 'title';
    root.appendChild(U.img(WArt.space(7), 'ti-bg'));
    root.appendChild(U.el('div', { class: 'ti-sky' }, U.el('b', { class: 'ti-shoot a' }), U.el('b', { class: 'ti-shoot b' })));
    root.append(
      U.el('div', { class: 'ti-leg l' }, U.el('i', { class: 'ti-aura' }), U.img(MonArt.url(PR_HERO, { size: 'lg' }))),
      U.el('div', { class: 'ti-leg r' }, U.el('i', { class: 'ti-aura' }), U.el('div', { class: 'pr-flip' }, U.img(MonArt.url(PR_FOE, { size: 'lg' })))));
    root.appendChild(U.el('div', { class: 'ti-crowd' }, ...PR_CROWD.map((id, i) => U.el('i', { class: 'pr-cm' + (STARTERS.includes(id) ? ' big' : ''), style: { '--i': i, '--sz': SPECIES[id].size || 1 } }, U.img(MonArt.url(id))))));
    root.appendChild(U.el('div', { class: 'logo', html: orbitSvg() + logoSvg() }));
    root.appendChild(U.el('div', { class: 'ti-sub ol', text: t('ti.sub') }));
    const btns = U.el('div', { class: 'ti-btns' });
    // (3.4: a returning player skips this screen; it shows up when their save could not be read — then "Continue"
    // is only offered if it can really continue)
    if (Game.hasSave() && (Game.s || Game.load())) {
      btns.append(U.el('button', { class: 'btn lg green pulse', text: t('ti.continue'), onclick: () => this.start(false) }),
        U.el('button', { class: 'btn sm white', text: t('ti.new'), onclick: async () => { if (await UI.confirm(t('ti.new_q'))) this.start(true); } }));
    } else btns.append(U.el('button', { class: 'btn lg green pulse', text: t('ti.play'), onclick: () => this.start(true) }));
    root.appendChild(btns);
    root.appendChild(U.el('div', { class: 'ti-corner' },
      U.el('button', { class: 'rbtn snd', html: WArt.icon('settings', 28), onclick: () => Menus.settings() }),
      U.el('button', { class: 'rbtn snd lang', text: LANG.toUpperCase(), onclick: () => { setLang(nextLang()); Main.saveSettings(); Main.refreshLang(); } })));
    root.appendChild(U.el('div', { class: 'ti-ver', text: 'v' + VERSION }));
    Snd.music('title');
    Platform.gameplayStop();
  },
  exit() {},
  start(fresh) {
    Snd.unlock();
    if (!fresh && Game.load()) { Game.s.flags.returning = 1; UI.go(ExploreScene, { zone: Game.s.loc.zone }); return; }
    UI.go(PrologueScene, {}); // a new game tells the story again (skippable)
  },
};
