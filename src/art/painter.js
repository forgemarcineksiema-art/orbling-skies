'use strict';
/* Painter: turns the procedural SVG art into painted bitmaps.
 * A sprite is rasterised at 2× and then re-painted with oriented brush strokes (stroke-based rendering:
 * every stroke takes the colour under it and runs along the form, warmer in the lights and cooler in the
 * shadows), crisp lines and eyes are laid back on top, a canvas/brush texture, a soft key light and a cool
 * shade go over the figure, and a dark coloured ink line wraps the silhouette (heavier on the shadow side).
 * Stroke randomness is keyed to canvas position, so animation frames of one sprite don't "boil".
 * The heavy lifting runs in a Web Worker (OffscreenCanvas) when available; results are cached in memory and
 * in IndexedDB (keyed by a hash of the SVG + settings), so later sessions start painted immediately.
 * Until a bake lands callers get the vector version; <img>s showing it are upgraded in place. */

/* ---- the painting routines (shared verbatim with the worker, so no outside references) ---- */
function PAINT_KERNEL(mk) {
  const hash2 = (x, y, k) => { let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  let tex = null;
  function texture() {
    if (tex) return tex;
    const S = 256, c = mk(S, S), g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
    let seed = 4077;
    const R = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    g.lineCap = 'round';
    const stroke = (x, y, a, len, w, col) => {
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        const sx = x + ox, sy = y + oy;
        if (sx < -40 || sx > S + 40 || sy < -40 || sy > S + 40) continue;
        const ex = sx + Math.cos(a) * len, ey = sy + Math.sin(a) * len, bend = (R() - 0.5) * len * 0.35;
        g.strokeStyle = col; g.lineWidth = w;
        g.beginPath(); g.moveTo(sx, sy);
        g.quadraticCurveTo((sx + ex) / 2 - Math.sin(a) * bend, (sy + ey) / 2 + Math.cos(a) * bend, ex, ey);
        g.stroke();
      }
    };
    for (let i = 0; i < 260; i++) stroke(R() * S, R() * S, -0.75 + (R() - 0.5) * 0.9, 14 + R() * 26, 5 + R() * 7, R() < 0.5 ? `rgba(255,255,255,${0.035 + R() * 0.05})` : `rgba(0,0,0,${0.035 + R() * 0.05})`);
    for (let i = 0; i < 1500; i++) stroke(R() * S, R() * S, -0.75 + (R() - 0.5) * 1.3, 4 + R() * 13, 0.8 + R() * 2.2, R() < 0.5 ? `rgba(255,255,255,${0.05 + R() * 0.1})` : `rgba(0,0,0,${0.05 + R() * 0.1})`);
    const im = g.getImageData(0, 0, S, S), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * 16; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(im, 0, 0);
    tex = c;
    return tex;
  }
  function fillMask(src, fill) {
    const c = mk(src.width, src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = fill; g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  function soften(src, k) {
    const s = mk(Math.max(1, Math.round(src.width / k)), Math.max(1, Math.round(src.height / k))), sg = s.getContext('2d');
    sg.imageSmoothingQuality = 'high';
    sg.drawImage(src, 0, 0, s.width, s.height);
    const c = mk(src.width, src.height), g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(s, 0, 0, c.width, c.height);
    return c;
  }
  function over(base, layer, mode, alpha) {
    const g = base.getContext('2d');
    const m = mk(base.width, base.height), mg = m.getContext('2d');
    mg.drawImage(layer, 0, 0);
    mg.globalCompositeOperation = 'destination-in';
    mg.drawImage(base, 0, 0);
    g.save(); g.globalCompositeOperation = mode; g.globalAlpha = alpha; g.drawImage(m, 0, 0); g.restore();
  }
  function brushwork(S, o) {
    const W = S.width, H = S.height, px = o.px || 2;
    const src = S.getContext('2d').getImageData(0, 0, W, H).data;
    const bl = soften(S, 3 * px / 2).getContext('2d').getImageData(0, 0, W, H).data;
    const wide = soften(S, 9 * px / 2).getContext('2d').getImageData(0, 0, W, H).data;
    const n = W * H, lum = new Float32Array(n), keep = new Float32Array(n);
    const sm = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
    const LL = o.lineLum || 62, DT = o.detail || 150;
    for (let i = 0; i < n; i++) {
      const q = i * 4;
      lum[i] = bl[q + 3] > 5 ? (bl[q] * 0.3 + bl[q + 1] * 0.59 + bl[q + 2] * 0.11) / 255 : 0;
      if (src[q + 3] < 8) continue;
      const l0 = src[q] * 0.3 + src[q + 1] * 0.59 + src[q + 2] * 0.11;
      const diff = Math.abs(src[q] - bl[q]) + Math.abs(src[q + 1] - bl[q + 1]) + Math.abs(src[q + 2] - bl[q + 2]);
      keep[i] = Math.max(1 - sm(LL - 18, LL + 26, l0), sm(DT - 40, DT + 30, diff));
    }
    const near = i => keep[i] > 0.3 || keep[i - 1] > 0.3 || keep[i + 1] > 0.3 || keep[i - W] > 0.3 || keep[i + W] > 0.3 || keep[i - 2 * W] > 0.3 || keep[i + 2 * W] > 0.3 || keep[i - 2] > 0.3 || keep[i + 2] > 0.3;
    const P = mk(W, H), pg = P.getContext('2d');
    pg.drawImage(S, 0, 0);
    pg.lineCap = 'round';
    const warmK = o.warm != null ? o.warm : 1;
    const bs = o.bs || 1;
    const pass = (k, step, w0, w1, l0, l1, alpha) => {
      step *= px / 2 * bs;
      const cols = Math.ceil(W / step), rows = Math.ceil(H / step);
      for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
        const r = m => hash2(gx, gy, k * 16 + m);
        const jx = (gx + r(1)) * step, jy = (gy + r(2)) * step;
        const ix = jx | 0, iy = jy | 0;
        if (ix < 3 || iy < 3 || ix >= W - 3 || iy >= H - 3) continue;
        const i = iy * W + ix, q = i * 4;
        if (src[q + 3] < 230 || near(i)) continue;
        const dx = lum[i + 1] - lum[i - 1], dy = lum[i + W] - lum[i - W];
        let a = Math.abs(dx) + Math.abs(dy) > 0.006 ? Math.atan2(dy, dx) + Math.PI / 2 : -0.62;
        a += (r(3) - 0.5) * 0.4;
        const len = (l0 + r(4) * (l1 - l0)) * px / 2 * bs, w = (w0 + r(5) * (w1 - w0)) * px / 2 * bs;
        const rel = (src[q] * 0.3 + src[q + 1] * 0.59 + src[q + 2] * 0.11 - (wide[q] * 0.3 + wide[q + 1] * 0.59 + wide[q + 2] * 0.11)) * warmK;
        const j = (r(6) - 0.5) * 18;
        pg.strokeStyle = `rgba(${Math.round(src[q] + j + rel * 0.28)},${Math.round(src[q + 1] + j + rel * 0.08)},${Math.round(src[q + 2] + j - rel * 0.3)},${alpha})`;
        pg.lineWidth = w;
        const ca = Math.cos(a), sa = Math.sin(a), bend = (r(7) - 0.5) * len * 0.35;
        pg.beginPath();
        pg.moveTo(jx - ca * len * 0.5, jy - sa * len * 0.5);
        pg.quadraticCurveTo(jx - sa * bend, jy + ca * bend, jx + ca * len * 0.5, jy + sa * len * 0.5);
        pg.stroke();
      }
    };
    pass(1, o.step1 || 9, 6, 10, 12, 22, 0.45);
    pass(2, o.step2 || 5.5, 3, 5, 6, 12, 0.5);
    if (o.step3) pass(3, o.step3, 1.6, 2.6, 4, 7, 0.4);
    const Kc = mk(W, H), kg = Kc.getContext('2d'), kd = kg.createImageData(W, H);
    for (let i = 0; i < n; i++) if (keep[i] > 0.02) { const q = i * 4; kd.data[q] = src[q]; kd.data[q + 1] = src[q + 1]; kd.data[q + 2] = src[q + 2]; kd.data[q + 3] = src[q + 3] * keep[i]; }
    kg.putImageData(kd, 0, 0);
    pg.drawImage(Kc, 0, 0);
    pg.globalCompositeOperation = 'destination-in';
    pg.drawImage(S, 0, 0);
    return P;
  }
  function finish(S0, o) {
    const S = o.brush === false ? S0 : brushwork(S0, o);
    const W = S.width, H = S.height, px = o.px || 2;
    if (o.tex !== 0) {
      const L = mk(W, H), lg = L.getContext('2d');
      const pat = lg.createPattern(texture(), 'repeat');
      const k = (o.texScale || 1) * px / 2;
      lg.save(); lg.scale(k, k); lg.fillStyle = pat; lg.fillRect(0, 0, W / k, H / k); lg.restore();
      over(S, L, 'soft-light', o.tex != null ? o.tex : 0.5);
    }
    const [bx, by, bw, bh] = o.box || [0, 0, W, H];
    if (o.light !== 0) {
      const L = mk(W, H), lg = L.getContext('2d');
      const gr = lg.createRadialGradient(bx + bw * 0.3, by + bh * 0.22, 0, bx + bw * 0.3, by + bh * 0.22, Math.max(bw, bh) * 0.75);
      gr.addColorStop(0, 'rgba(255,248,225,0.9)'); gr.addColorStop(0.45, 'rgba(255,244,220,0.35)'); gr.addColorStop(1, 'rgba(255,240,220,0)');
      lg.fillStyle = gr; lg.fillRect(0, 0, W, H);
      over(S, L, 'soft-light', o.light != null ? o.light : 0.35);
    }
    if (o.shade !== 0) {
      const L = mk(W, H), lg = L.getContext('2d');
      const gr = lg.createLinearGradient(bx + bw * 0.25, by + bh * 0.2, bx + bw * 0.85, by + bh);
      gr.addColorStop(0, 'rgba(40,30,90,0)'); gr.addColorStop(0.55, 'rgba(40,30,90,0.08)'); gr.addColorStop(1, 'rgba(34,24,86,0.55)');
      lg.fillStyle = gr; lg.fillRect(0, 0, W, H);
      over(S, L, 'multiply', o.shade != null ? o.shade : 0.4);
    }
    if (o.noInk) return S;
    const F = mk(W, H), fg = F.getContext('2d');
    const ink = fillMask(S, o.ink || '#1c1430');
    // only solid shapes get inked (glows, auras and soft shadows stay clean)
    {
      const ig = ink.getContext('2d'), id = ig.getImageData(0, 0, W, H), d = id.data;
      for (let i = 3; i < d.length; i += 4) { const a = d[i]; d[i] = a < 110 ? 0 : a > 200 ? 255 : Math.round((a - 110) / 90 * 255); }
      ig.putImageData(id, 0, 0);
    }
    const r = (o.inkW || 1.6) * px, n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, heavy = 0.55 + 0.45 * Math.max(0, Math.cos(a - Math.PI / 4));
      fg.drawImage(ink, Math.cos(a) * r * heavy + r * 0.25, Math.sin(a) * r * heavy + r * 0.3);
    }
    fg.drawImage(S, 0, 0);
    return F;
  }
  return { finish, brushwork, texture };
}

const Painter = (() => {
  const done = new Map();     // key → baked url
  const jobs = new Map();     // key → Promise<url>
  const vec = new Map();      // key → vector url shown meanwhile (for in-place upgrades)
  const queue = [], later = []; // later: background prefetch, only when nothing else waits
  const waiting = new Map();  // key → its job while still queued (so a more urgent request can move it forward)
  let running = 0;
  const holds = new Set(); // reasons to keep background paintings waiting (a battle, an ad)
  const VER = 'p4';
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const ok = (() => { try { return !!mkCanvas(2, 2).getContext('2d'); } catch (e) { return false; } })();
  const webp = (() => { try { return mkCanvas(2, 2).toDataURL('image/webp').indexOf('data:image/webp') === 0; } catch (e) { return false; } })();
  const K = PAINT_KERNEL(mkCanvas);

  /* ---- a small pool of workers running the same kernel on OffscreenCanvas ---- */
  const workers = [];
  let wseq = 0;
  const wjobs = new Map();
  try {
    if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined' && new OffscreenCanvas(2, 2).getContext('2d')) {
      const src = `const PAINT_KERNEL = ${PAINT_KERNEL.toString()};
const K = PAINT_KERNEL((w, h) => new OffscreenCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h))));
onmessage = async e => {
  const { id, bmp, o, type } = e.data;
  try {
    const S = new OffscreenCanvas(bmp.width, bmp.height);
    S.getContext('2d').drawImage(bmp, 0, 0);
    if (bmp.close) bmp.close();
    const F = K.finish(S, o);
    let blob;
    try { blob = await F.convertToBlob({ type, quality: 0.94 }); } catch (err) { blob = await F.convertToBlob({ type: 'image/png' }); }
    postMessage({ id, blob });
  } catch (err) { postMessage({ id, err: String(err) }); }
};`;
      const wurl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      const n = Math.max(1, Math.min(3, ((typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2) - 1));
      for (let i = 0; i < n; i++) {
        const w = new Worker(wurl);
        w.pending = 0;
        w.onmessage = e => { const j = wjobs.get(e.data.id); if (!j) return; wjobs.delete(e.data.id); w.pending--; if (e.data.err) j.rej(new Error(e.data.err)); else j.res(e.data.blob); };
        w.onerror = () => { const i2 = workers.indexOf(w); if (i2 >= 0) workers.splice(i2, 1); for (const [id, j] of wjobs) if (j.w === w) { wjobs.delete(id); j.rej(new Error('worker')); } };
        workers.push(w);
      }
    }
  } catch (e) { workers.length = 0; }
  const inWorker = (bmp, o) => new Promise((res, rej) => {
    const w = workers.reduce((a, b) => (a.pending <= b.pending ? a : b));
    const id = ++wseq;
    w.pending++;
    wjobs.set(id, { res, rej, w });
    w.postMessage({ id, bmp, o, type: webp ? 'image/webp' : 'image/png' }, [bmp]);
  });

  /* ---- IndexedDB cache of finished paintings ---- */
  // the `poki_ignore` prefix keeps this cache out of Poki's cloud save (localStorage + IndexedDB, 1 MB cap):
  // megabytes of paintings would otherwise switch cloud saving off for the player
  const DB = 'poki_ignore_orbling_paint', STORE = 'poki_ignore_p';
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(res => {
      try {
        try { indexedDB.deleteDatabase('orbling-paint'); } catch (e) { /* the pre-2.7 cache */ }
        const rq = indexedDB.open(DB, 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore(STORE);
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => res(null);
        rq.onblocked = () => res(null);
      } catch (e) { res(null); }
    });
    return dbp;
  }
  const idbGet = async k => { const d = await db(); if (!d) return null; return new Promise(res => { try { const rq = d.transaction(STORE).objectStore(STORE).get(k); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null); } catch (e) { res(null); } }); };
  const idbPut = async (k, v) => { const d = await db(); if (!d) return; try { d.transaction(STORE, 'readwrite').objectStore(STORE).put(v, k); } catch (e) { /* quota etc. */ } };

  const load = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  const idle = fn => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 120));
  function pump() {
    while (running < workers.length + 1 && queue.length) {
      const job = queue.shift();
      running++;
      job().finally(() => { running--; pump(); });
    }
    // background prefetch: one at a time, only when the main thread is idle (and nothing holds it back)
    if (!running && later.length && !pump.waiting && !holds.size) {
      pump.waiting = true;
      idle(() => { pump.waiting = false; if (running || queue.length || !later.length || holds.size) { pump(); return; } running++; later.shift()().finally(() => { running--; setTimeout(pump, 60); }); });
    }
  }
  function upgrade(key, url) {
    const v = vec.get(key);
    if (!v || v === url) return;
    for (const im of document.getElementsByTagName('img')) if (im.src === v) im.src = url;
  }
  /**
   * bake(key, svgText, o) → Promise<url>. o.w/o.h: output size in px; o.px: pixels per art unit.
   * The vector version (object URL of svgText) is what callers see until the painting lands.
   */
  function bake(key, svgText, o) {
    if (done.has(key)) return Promise.resolve(done.get(key));
    if (jobs.has(key)) { promote(key, o); return jobs.get(key); }
    const vurl = U.svgUrl('pv:' + key, () => svgText);
    vec.set(key, vurl);
    if (!ok) { done.set(key, vurl); return Promise.resolve(vurl); }
    const oo = Object.assign({}, o); delete oo.urgent; delete oo.low;
    const dbKey = VER + ':' + U.hash(svgText) + ':' + U.hash(JSON.stringify(oo)) + ':' + o.w + 'x' + o.h;
    const p = new Promise(res => {
      const job = async () => {
        waiting.delete(key);
        let url = null;
        try {
          const hit = await idbGet(dbKey);
          if (hit) url = URL.createObjectURL(hit);
          else {
            const img = await load(vurl);
            const S = mkCanvas(o.w, o.h);
            S.getContext('2d').drawImage(img, 0, 0, o.w, o.h);
            let blob = null;
            if (workers.length) { try { blob = await inWorker(await createImageBitmap(S), oo); } catch (e) { blob = null; } }
            if (!blob) { const F = K.finish(S, oo); blob = await new Promise(r => F.toBlob(r, webp ? 'image/webp' : 'image/png', 0.94)); }
            if (blob) { url = URL.createObjectURL(blob); idbPut(dbKey, blob); }
          }
        } catch (e) { console.warn('paint', key, e); }
        url = url || vurl;
        done.set(key, url);
        upgrade(key, url);
        res(url);
      };
      waiting.set(key, job);
      if (o.urgent) queue.unshift(job); else if (o.low) later.push(job); else queue.push(job);
      pump();
    });
    jobs.set(key, p);
    return p;
  }
  /** a picture someone needs now that is still waiting in the background queue (or further back) jumps ahead */
  function promote(key, o) {
    const job = waiting.get(key);
    if (!job || o.low) return;
    let i = later.indexOf(job);
    if (i >= 0) later.splice(i, 1);
    else if (o.urgent && (i = queue.indexOf(job)) > 0) queue.splice(i, 1);
    else return;
    if (o.urgent) queue.unshift(job); else queue.push(job);
    pump();
  }
  /** a painted UI icon (finer brush, lighter texture): sync url, vector until the painting lands */
  function icon(key, svgFn, vw, vh, o = {}) {
    const k = o.scale || 2, w = Math.round(vw * k), h = Math.round(vh * k);
    return get('ic:' + key, svgFn, Object.assign({ w, h, px: k, ink: '#0a121b', inkW: 1.1, bs: 0.42, tex: 0.3, light: 0.3, shade: 0.28, rim: null, box: [0, 0, w, h], step1: 9, step2: 5.5, detail: 120 }, o));
  }
  /** queue background paintings (lowest priority) */
  function prefetch(list) { for (const [key, svgFn, o] of list) if (!done.has(key) && !jobs.has(key)) bake(key, svgFn(), Object.assign({}, o, { low: true })); }
  /** synchronous: the painted url when ready, else the vector stand-in (and the bake is queued) */
  function get(key, svgFn, o) {
    if (done.has(key)) return done.get(key);
    if (!jobs.has(key)) bake(key, svgFn(), o); else promote(key, o);
    return vec.get(key);
  }
  const has = key => done.has(key);
  const busy = () => running > 0 || queue.length > 0;
  /** hold(reason, on): background prefetching waits while any reason holds it (battles, ads) — what is needed now still paints */
  function hold(reason, on) { if (on) holds.add(reason); else if (holds.delete(reason) && !holds.size) pump(); }
  const ready = keys => Promise.all(keys.map(k => jobs.get(k) || Promise.resolve()));
  return { bake, get, has, busy, ready, prefetch, icon, hold, kernel: K, ok: () => ok, usesWorker: () => workers.length };
})();
