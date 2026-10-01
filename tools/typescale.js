/* Dev (3.4): the type floor. Lists — or, with --apply, raises — every font size in the stylesheets that is below the
 * floor, so no text of the game is smaller than ~11 px on a 836×470 laptop frame or a 360 px wide phone.
 * Usage: node tools/typescale.js [--apply]   (sizes below FLOOR px are mapped by MAP; SVG text and icons are not CSS) */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const FILES = ['styles.css', 'scenes.css', 'fx.css', 'skin.css', 'panels.css', 'screens.css', 'opening.css', 'capture.css'];
const FLOOR = 17;
// old size → new size: everything below the floor goes up to it
const MAP = { 8: 17, 9: 17, 10: 17, 11: 17, 12: 17, 13: 17, 14: 17, 15: 17, 16: 17 };
const apply = process.argv.includes('--apply');
let n = 0;
for (const f of FILES) {
  const p = path.join(root, f);
  const src = fs.readFileSync(p, 'utf8');
  // rule by rule: "selector { declarations }" (no nested blocks except @media / @keyframes, which pass through)
  const out = src.replace(/([^{}]*)\{([^{}]*)\}/g, (all, sel, body) => {
    if (/@keyframes|^\s*(from|to|\d+%)\s*$/.test(sel.trim())) return all;
    const nb = body.replace(/(font-size\s*:\s*)(\d+(?:\.\d+)?)px/g, (m, a, v) => {
      const k = Math.floor(+v);
      if (+v >= FLOOR || !(k in MAP)) return m;
      n++; if (!apply) console.log(`${f}  ${sel.trim().slice(-70).padEnd(70)}  font-size ${v}px → ${MAP[k]}px`);
      return a + MAP[k] + 'px';
    }).replace(/(font\s*:\s*(?:[a-z-]+\s+)*?(?:\d{3}\s+)?)(\d+(?:\.\d+)?)px/g, (m, a, v) => {
      const k = Math.floor(+v);
      if (+v >= FLOOR || !(k in MAP)) return m;
      n++; if (!apply) console.log(`${f}  ${sel.trim().slice(-70).padEnd(70)}  font ${v}px → ${MAP[k]}px`);
      return a + MAP[k] + 'px';
    });
    return sel + '{' + nb + '}';
  });
  if (apply && out !== src) fs.writeFileSync(p, out);
}
console.log(apply ? `raised ${n} font sizes` : `${n} font sizes below ${FLOOR}px`);
