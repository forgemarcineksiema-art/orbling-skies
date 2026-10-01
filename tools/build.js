/* Build: bundles all scripts & styles and writes three upload-ready variants + zips:
 *   dist/web          – no SDK (self-hosting, itch.io, local testing; ads are simulated)
 *   dist/poki         – Poki SDK v2 script tag
 *   dist/crazygames   – CrazyGames SDK v3 script tag
 * Usage: node tools/build.js   (no dependencies) */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');

const block = html.match(/<!--SCRIPTS-->([\s\S]*?)<!--\/SCRIPTS-->/);
if (!block) throw new Error('script block markers not found in index.html');
const files = [...block[1].matchAll(/src="([^"]+)"/g)].map(m => m[1]);

/* light, safe minification: drop full-line comments, header block comments and indentation */
function lite(src) {
  const out = [];
  let inBlock = false;
  for (let line of src.split(/\r?\n/)) {
    const tr = line.trim();
    if (inBlock) { if (tr.includes('*/')) inBlock = false; continue; }
    if (tr.startsWith('/*') && !tr.includes('*/')) { inBlock = true; continue; }
    if (tr.startsWith('/*') && tr.endsWith('*/')) continue;
    if (tr.startsWith('//') || tr === '') continue;
    out.push(tr);
  }
  return out.join('\n');
}

const js = `/* Orbling Skies — bundled ${new Date().toISOString().slice(0, 10)} */\n` + files.map(f => lite(read(f))).join('\n;\n');
const cssFiles = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]);
const css = cssFiles.map(f => read(f).replace(/\/\*[\s\S]*?\*\//g, '').split(/\r?\n/).map(l => l.trim()).filter(l => l).join('\n')).join('\n');

const SDK = {
  web: '',
  poki: '<script>window.OG_TARGET = "poki";</script>\n<script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>',
  crazygames: '<script>window.OG_TARGET = "crazygames";</script>\n<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>',
};

/* ---- tiny ZIP writer (deflate) ---- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zip(entries) {
  const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const locals = [], centrals = [];
  let offset = 0;
  for (const [name, data] of entries) {
    const raw = Buffer.from(data);
    const comp = zlib.deflateRawSync(raw, { level: 9 });
    const nameBuf = Buffer.from(name);
    const crc = crc32(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(time, 10); lh.writeUInt16LE(date, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, nameBuf, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt16LE(time, 12); ch.writeUInt16LE(date, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20);
    ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36); ch.writeUInt32LE(0, 38); ch.writeUInt32LE(offset, 42);
    centrals.push(ch, nameBuf);
    offset += 30 + nameBuf.length + comp.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16); end.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, cd, end]);
}

const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
for (const [name, sdk] of Object.entries(SDK)) {
  const dir = path.join(dist, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const page = html
    .replace(/<!--SCRIPTS-->[\s\S]*?<!--\/SCRIPTS-->/, '<script src="game.js"></script>')
    .replace(/(<link rel="stylesheet" href="[^"]+">\s*)+/, '<link rel="stylesheet" href="game.css">\n')
    .replace('<!--SDK-->', sdk);
  const out = { 'index.html': page, 'game.js': js, 'game.css': css };
  for (const f in out) fs.writeFileSync(path.join(dir, f), out[f]);
  const z = zip(Object.entries(out));
  const zp = path.join(dist, `orbling-skies-${name}.zip`);
  fs.writeFileSync(zp, z);
  console.log(`${name.padEnd(11)} → dist/${name}/  (${(Buffer.byteLength(js) / 1024).toFixed(0)} KB js, zip ${(z.length / 1024).toFixed(0)} KB)`);
}
console.log('Done.');
