/* Resource lifecycle regressions. Run: node tools/perfcheck.js.
 * Canvas/clock adapters keep this deterministic; real-browser timings live in docs/PERFORMANCE.md. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
let next = 0;
const timers = new Map(), frames = new Map();
const context2d = { drawImage() {}, setTransform() {}, clearRect() {} };
const canvas = () => ({ width: 300, height: 150, style: {}, isConnected: false,
  getContext: () => context2d, toDataURL: () => 'data:image/webp,',
  toBlob: fn => queueMicrotask(() => fn(new Blob(['paint']))) });
const revoked = new Set(), liveImages = [];
const document = { querySelectorAll: selector => selector === 'img[src]' ? liveImages : [], hidden: false, createElement: canvas, getElementsByTagName: () => [] };
const fx = { prepend(c) { c.isConnected = true; }, classList: { contains: () => false } };
const ctx = vm.createContext({ console, Blob, Map, Set, Math, Promise, queueMicrotask,
  document, navigator: { hardwareConcurrency: 2 }, window: { devicePixelRatio: 2 },
  UI: { fx, scale: 1, portrait: false }, PropArt: { PROP: {} },
  Scenery: { paint: () => ({ defs: '', body: '<rect width="1280" height="720"/>' }) },
  URL: { createObjectURL: () => 'blob:' + ++next, revokeObjectURL(u) { revoked.add(u); } },
  Image: class { set src(value) { queueMicrotask(() => this.onload?.()); } },
  setTimeout: fn => { const id = ++next; timers.set(id, fn); return id; },
  clearTimeout: id => timers.delete(id),
  requestAnimationFrame: fn => { const id = ++next; frames.set(id, fn); return id; },
  cancelAnimationFrame: id => frames.delete(id), performance: { now: () => 0 },
});
for (const f of ['src/core/util.js', 'src/art/painter.js', 'src/art/world_art.js', 'src/art/vfx.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}
const { Painter, WArt, VFX, U } = vm.runInContext('({Painter,WArt,VFX,U})', ctx);
(async () => {
  let generated = 0;
  const svg = () => { generated++; return '<svg/>'; };
  const options = { w: 16, h: 16, brush: false, noInk: true, tex: 0, light: 0, shade: 0 };
  const a = Painter.bake('test', svg, options), b = Painter.bake('test', svg, options);
  assert.equal(a, b, 'concurrent requests share one job');
  const url = await a;
  assert.equal(await Painter.bake('test', svg, options), url);
  assert.equal(generated, 1, 'cached async art must not regenerate SVG');
  assert.equal(Painter.stats().jobs, 0, 'completed jobs release promises');
  Painter.hold('hidden', true);
  let settled = false;
  const hidden = Painter.bake('hidden', svg, options).then(() => { settled = true; });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(settled, false, 'new raster jobs wait while hidden');
  Painter.hold('battle', true); Painter.hold('hidden', false);
  await hidden; // foreground work resumes even while background prefetch is held by a battle
  Painter.hold('battle', false);
  Painter.hold('hidden', true);
  const stale = Painter.bake('stale', svg, options);
  Painter.cancelQueued();
  const fallback = await stale;
  assert.equal(Painter.has('stale'), false, 'cancelled frames are not treated as painted');
  assert.equal(Painter.stats().queued, 0);
  Painter.hold('hidden', false);
  assert.notEqual(await Painter.bake('stale', svg, options), fallback, 'revisiting paints cancelled frames again');


  const pinned = await Painter.bake('pinned', svg, options);
  const visible = await Painter.bake('visible', svg, options, false);
  liveImages.push({ src: visible });
  for (let i = 0; i < 190; i++) await Painter.bake('evict:' + i, svg, { ...options, w: 512, h: 512 }, false);
  Painter.trim();
  assert.ok(Painter.stats().retainedBytes <= Painter.stats().budget);
  assert.equal(revoked.has(pinned), false, 'active animation frames remain decodable');
  assert.equal(revoked.has(visible), false, 'visible UI images remain decodable');
  assert.equal(Painter.has('evict:0'), false, 'old inactive images are evicted');
  Painter.beginScene(); liveImages.length = 0;
  for (let i = 190; i < 250; i++) await Painter.bake('evict:' + i, svg, { ...options, w: 512, h: 512 }, false);
  Painter.trim();
  assert.ok(revoked.has(pinned), 'leaving a scene releases its frame lease');
  assert.ok(revoked.has(visible), 'detached UI images can be reclaimed');
  assert.ok(await Painter.bake('pinned', svg, options) !== pinned, 'an evicted frame regenerates');
  const protectedSvg = U.svgUrl('protected', () => '<svg/>');
  for (let i = 0; i < 300; i++) U.svgUrl('svg:' + i, () => '<svg/>');
  const vectorStats = U.trimSvg(new Set([protectedSvg]));
  assert.ok(vectorStats.entries <= 256);
  assert.equal(revoked.has(protectedSvg), false);

  for (let i = 0; i < 12; i++) {
    const image = await WArt.bake('meadow', i);
    assert.equal(image.width, 2560);
    assert.ok(WArt.stats().bytes <= WArt.stats().limit, 'backdrop backing stores stay within budget');
    assert.ok(WArt.stats().backdrops <= 3);
  }
  const master = await WArt.bake('meadow', 11);
  assert.equal(await WArt.bake('meadow', 11), master, 'recent background reused');
  for (let i = 12; i < 16; i++) await WArt.bake('meadow', i);
  assert.equal(master.width, 2560, 'eviction must not damage a canvas retained by a caller');
  const copy = WArt.bgImg('meadow', 15, 'ex-back');
  assert.equal(copy.width, 640, 'blurred filler uses a smaller backing store');

  const RealImage = ctx.Image;
  ctx.Image = class { set src(value) {} };
  const beforeTimers = new Set(timers.keys());
  const stalledImage = U.loadImage('blob:stalled', 20);
  const rejectedImage = assert.rejects(stalledImage, /timed out/);
  assert.ok(U.visibleArtUrls().has('blob:stalled'));
  for (const [id, fn] of timers) if (!beforeTimers.has(id)) { timers.delete(id); fn(); }
  await rejectedImage;
  assert.equal(U.visibleArtUrls().has('blob:stalled'), false, 'failed decode releases its temporary lease');
  ctx.Image = RealImage;
  ctx.window.removeEventListener = () => {};
  vm.runInContext(fs.readFileSync(path.join(root, 'src/scenes/intro.js'), 'utf8'), ctx);
  const intro = vm.runInContext('IntroScene', ctx);
  ctx.UI.cur = intro; intro.state = 'intro'; intro.timers = [];
  const cancelledWait = intro.wait(100000);
  intro.exit(); intro.state = 'intro'; // same singleton can be entered again before a continuation resumes
  assert.equal(await cancelledWait, false, 'leaving the introduction resolves and cancels its waits');
  assert.equal(intro.waits.size, 0);

  VFX.emit(10000, { x: 100, y: 100 });
  assert.equal(VFX.stats().p, 1200, 'particle bursts have a hard budget');
  assert.equal(frames.size, 1, 'only one render loop');
  VFX.clear(); assert.equal(frames.size, 0);
  VFX.setLite(true); VFX.emit(10000, { x: 100, y: 100 });
  assert.equal(VFX.stats().p, 450); assert.ok(VFX.stats().res <= 1);
  for (let i = 0; i < 300; i++) VFX.obj({ life: 100, draw() {} });
  assert.equal(VFX.stats().o, 160);
  VFX.clear();
  const pending = VFX.wildIn(100, 100, 'fire', false);
  assert.equal(VFX.stats().timers, 1);
  VFX.clear();
  for (const [id, fn] of [...timers]) { timers.delete(id); fn(); }
  await pending; // cancelling visuals must still resolve gameplay waits
  assert.equal(VFX.stats().p, 0); assert.equal(VFX.stats().o, 0);
  assert.equal(VFX.stats().timers, 0); assert.equal(frames.size, 0);
  document.hidden = true;
  VFX.emit(50, { x: 0, y: 0 }); VFX.obj({ life: 100, draw() {} });
  assert.equal(VFX.stats().p + VFX.stats().o, 0, 'hidden pages do not allocate effects');
  document.hidden = false;
  VFX.emit(1, { x: 0, y: 0 });
  assert.equal(frames.size, 1, 'effects restart after clear/resume');
  VFX.clear();
  console.log('performance lifecycle OK');
})().catch(e => { console.error(e); process.exitCode = 1; });
