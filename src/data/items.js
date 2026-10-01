'use strict';
/* Items & shop. One currency: everything is bought with coins (Poki: one understandable currency). */

const ITEMS = {
  orb:         { kind: 'orb', mult: 1, price: 30 },
  nova:        { kind: 'orb', mult: 1.8, price: 120 },
  galaxy:      { kind: 'orb', mult: 100, price: 1500 },
  berry:       { kind: 'heal', heal: 0.3, price: 0 }, // grown in the Base's Garden (not sold)
  potion:      { kind: 'heal', heal: 0.5, price: 40 },
  superpotion: { kind: 'heal', heal: 1, price: 110 },
  ether:       { kind: 'energy', en: 10, price: 50 },
  revive:      { kind: 'revive', heal: 0.5, price: 150 },
  candy:       { kind: 'level', price: 800 },
  // eggs hatch in the Star Camp (element eggs: an Orbling of that element; Star Egg: any element, better odds)
  egg_fire:    { kind: 'egg', el: 'fire', price: 2000 },
  egg_water:   { kind: 'egg', el: 'water', price: 2000 },
  egg_earth:   { kind: 'egg', el: 'earth', price: 2000 },
  egg_air:     { kind: 'egg', el: 'air', price: 2000 },
  egg_star:    { kind: 'egg', price: 6000 },
};
const SHOP_LIST = ['orb', 'nova', 'potion', 'superpotion', 'ether', 'revive', 'galaxy', 'candy', 'egg_fire', 'egg_water', 'egg_earth', 'egg_air', 'egg_star'];
const ORB_IDS = ['orb', 'nova', 'galaxy'];

/* Daily Star Spin prizes: [kind, amount, weight] */
const SPIN_PRIZES = [
  ['coins', 100, 22], ['orb', 3, 18], ['potion', 2, 14], ['coins', 250, 12],
  ['nova', 1, 10], ['orb', 5, 8], ['superpotion', 1, 10], ['galaxy', 1, 2], ['candy', 1, 4], ['egg_star', 1, 3],
];
