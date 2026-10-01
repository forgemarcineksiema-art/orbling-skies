/* Dev: render the key art (tools/keyart.html) through headless Chrome.
 *   node tools/keyart_shots.js still <out.png> <w> <h> [logo=0] [t=1.2]
 *   node tools/keyart_shots.js frames <outDir> <w> <h> [seconds=5] [fps=60]   → f0000.png … (python tools/keyart_video.py)
 *   node tools/keyart_shots.js sheet <out.png>
 * The page must be served (python tools/devserver.py 8794); env URL overrides the base (default http://127.0.0.1:8794). */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const [mode, out, W0, H0, a5, a6] = process.argv.slice(2);
const W = +(W0 || 1080), H = +(H0 || 1080);
const BASE = process.env.URL || 'http://127.0.0.1:8794';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9600 + Math.floor(Math.random() * 300);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const prof = path.join(require('os').tmpdir(), 'keyart' + PORT);
  const vw = mode === 'sheet' ? 1300 : W, vh = mode === 'sheet' ? 1400 : H;
  const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, `--window-size=${vw},${vh}`, 'about:blank'], { stdio: 'ignore' });
  let list;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch (e) { /* not up yet */ } }
  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0;
  const pend = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') console.log('EXC', m.params.exceptionDetails.text, (m.params.exceptionDetails.exception || {}).description); });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result && r.result.result && r.result.result.value; };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: vw, height: vh, deviceScaleFactor: 1, mobile: false });
  const q = mode === 'sheet' ? 'mode=sheet' : `w=${W}&h=${H}` + (mode === 'still' ? `&logo=${a5 || 0}&t=${a6 || 1.2}` : '');
  await send('Page.navigate', { url: `${BASE}/tools/keyart.html?${q}` });
  let ready = false;
  for (let i = 0; i < 300 && ready !== true; i++) { await sleep(100); ready = await ev('window.ready'); if (typeof ready === 'string') { console.log(ready); break; } }
  await sleep(300);
  const shot = async (file, fmt = 'png') => {
    const clip = mode === 'sheet' ? undefined : { x: 0, y: 0, width: W, height: H, scale: 1 };
    const r = await send('Page.captureScreenshot', Object.assign({ format: fmt, captureBeyondViewport: mode === 'sheet' }, clip ? { clip } : {}));
    fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  };
  if (mode === 'still' || mode === 'sheet') { fs.mkdirSync(path.dirname(out), { recursive: true }); await shot(out); console.log('saved', out); }
  else if (mode === 'frames') {
    const secs = +(a5 || 5), fps = +(a6 || 60), n = Math.round(secs * fps);
    fs.mkdirSync(out, { recursive: true });
    for (const f of fs.readdirSync(out)) if (/^f\d+\.png$/.test(f)) fs.unlinkSync(path.join(out, f));
    for (let i = 0; i < n; i++) {
      await ev(`setT(${(i / fps).toFixed(5)})`);
      await shot(path.join(out, 'f' + String(i).padStart(4, '0') + '.png'));
    }
    console.log('frames', n, 'at', fps, 'fps →', out);
  }
  ws.close(); ch.kill();
  await sleep(300);
  try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { /* locked */ }
})().catch(e => { console.error(e); process.exit(1); });
