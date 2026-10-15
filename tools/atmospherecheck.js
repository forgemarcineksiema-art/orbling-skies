/* Behavior/audio composition checks; browser scenarios cover real rendering and encounter cleanup. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ctx = vm.createContext({ console, Math, setTimeout, clearTimeout, setInterval, clearInterval,
  Main: { reducedMotion: false }, Platform: { forcedMute: () => false },
  SPECIES: { sunkit: {}, breezle: {} }, document: {}, window: {} });
for (const file of ['src/core/util.js', 'src/core/audio.js', 'src/scenes/explore.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), ctx, { filename: file });
}
const { ExploreScene: E, Snd, TRACKS, parseTrack } = vm.runInContext('({ ExploreScene, Snd, TRACKS, parseTrack })', ctx);
for (const kind of ['proud', 'breeze']) {
  const w = { act: kind, actT: 0, x: 400, y: 550, face: 1 };
  let frames = 0, changed = false;
  while (w.act && frames++ < 150) {
    E.doAct(w, 1 / 60);
    changed ||= w.ab !== 0 || w.ar !== 0 || w.ax !== 1 || w.ay !== 1;
    assert.ok([w.ab, w.ar, w.ax, w.ay].every(Number.isFinite));
    assert.ok(Math.abs(w.ab) < 25 && Math.abs(w.ar) <= 11);
    assert.ok(w.ax >= 0.9 && w.ay >= 0.9 && w.ax <= 1.1 && w.ay <= 1.1);
  }
  assert.ok(changed && frames < 150);
  assert.equal(w.act, null);
  assert.deepEqual([w.x, w.y, w.ab, w.ar, w.ax, w.ay], [400, 550, 0, 0, 1, 1]);
}
// The two hop cycles must not leak into the head tilt or settling pose.
ctx.MonArt = { FRAMES: 6 };
for (const [at, hopping] of [[0.2, false], [0.6, true], [1.0, true], [1.4, false]]) {
  const e = { gait: 'hop', act: 'breeze', actT: at, spr: { idle: 'idle', move: ['m0','m1','m2','m3','m4','m5'] }, imgEl: {} };
  E.spriteFrame(e, 1 / 60);
  assert.equal(e.imgEl.src.startsWith('m'), hopping);
}
ctx.Main.reducedMotion = true;
const w = { act: 'breeze', actT: 0.7, bob: 12, rot: 5, gait: 'hop' };
E.doAct(w, 1 / 60); E.gaitIdle(w, 1 / 60);
assert.deepEqual([w.act, w.ab, w.ar, w.ax, w.ay, w.bob, w.rot, w.sx, w.sy], [null, 0, 0, 1, 1, 0, 0, 1, 1]);
const forest = parseTrack(TRACKS.whisper), meadow = parseTrack(TRACKS.explore);
assert.equal(forest.len, 64);
assert.ok(forest.chans.every(c => c.ev.length === 64 && !c.drum));
const notes = p => p.chans.reduce((n, c) => n + c.ev.filter(Boolean).length, 0);
assert.ok(notes(forest) < notes(meadow) / 2, 'forest leaves space and schedules fewer voices');
assert.ok(forest.chans.every(c => c.ev.filter(Boolean).every(e => Number.isFinite(e.f) && e.f > 0)));
const sounds = [];
Snd.sfx = () => true; Snd._tone = (...a) => { sounds.push(['tone', ...a]); return { stop() {} }; }; Snd._noise = (...a) => sounds.push(['noise', ...a]);
Snd.cry('sunkit'); const sun = JSON.stringify(sounds); sounds.length = 0;
Snd.cry('breezle'); assert.notEqual(JSON.stringify(sounds), sun);
assert.ok(sounds.length <= 3); sounds.length = 0;
Snd.sfx = () => false; Snd.cry('breezle'); Snd.environment('forest', false); Snd.guardianCue();
assert.equal(sounds.length, 0, 'disabled SFX schedule no signature or ambience voices');
console.log(JSON.stringify({ status: 'atmosphere OK', forestNotes: notes(forest), meadowNotes: notes(meadow) }));
