/* Dev: record a timed screencast of the game (headless Chrome + CDP) to judge motion frame by frame.
 * Usage: node tools/rec.js <outDir> <steps.json> [durMs=6000]    (then: python tools/sheet.py <outDir> sheet.png …)
 * Steps as in shot.js ({ eval, wait, print, shot }) plus { rec: true } (start recording before this step's eval),
 * { noawait: true } (do not wait for the eval's promise) and { click: [x, y] }. Recording runs durMs after the steps.
 * Frames are saved as fNNNN_<ms since recording started>.jpg. env: URL, VW, VH, MOBILE=1 (portrait phone).
 * Run one at a time: parallel runs against the dev server can make random scripts fail to load. */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const out = process.argv[2];
const steps = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const DUR = +(process.argv[4] || 6000);
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9800 + Math.floor(Math.random() * 150);
const URL0 = process.env.URL || 'http://127.0.0.1:8792/index.html';
const VW = +(process.env.VW || 1280), VH = +(process.env.VH || 720), MOBILE = !!process.env.MOBILE;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  fs.mkdirSync(out, { recursive: true });
  for (const f of fs.readdirSync(out)) if (/^f\d{4}_\d+\.jpg$/.test(f)) fs.unlinkSync(path.join(out, f)); // only our old frames
  const prof = path.join(require('os').tmpdir(), 'recprof' + PORT);
  const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, `--window-size=${VW},${VH}`, 'about:blank'], { stdio: 'ignore' });
  let list;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch (e) { } }
  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0, rec = false, t0 = 0;
  const pend = new Map(), frames = [];
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    else if (m.method === 'Page.screencastFrame') { if (rec) frames.push([Date.now() - t0, m.params.data]); ws.send(JSON.stringify({ id: ++id, method: 'Page.screencastFrameAck', params: { sessionId: m.params.sessionId } })); }
    else if (m.method === 'Runtime.exceptionThrown') console.log('EXC', m.params.exceptionDetails.text, m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description);
    else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning' || m.params.type === 'log')) console.log('console.' + m.params.type, m.params.args.map(a => a.value || a.description).join(' '));
  });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: MOBILE });
  if (MOBILE) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url: URL0 });
  let si = 0;
  for (const st of steps) {
    console.log('step', si++, Object.keys(st).join(','));
    if (st.rec) { await send('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1 }); rec = true; t0 = Date.now(); }
    if (st.eval) {
      const r = await send('Runtime.evaluate', { expression: st.eval, awaitPromise: !st.noawait, returnByValue: true });
      if (r.result && r.result.exceptionDetails) console.log('eval error:', r.result.exceptionDetails.text, (r.result.exceptionDetails.exception || {}).description);
      else if (st.print && r.result && r.result.result) console.log('=>', JSON.stringify(r.result.result.value));
    }
    if (st.click) { const [x, y] = st.click; for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); }
    if (st.wait) await sleep(st.wait);
    if (st.shot) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(out, st.shot + '.png'), Buffer.from(r.result.data, 'base64')); console.log('shot', st.shot); }
  }
  if (!rec) { await send('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1 }); rec = true; t0 = Date.now(); }
  await sleep(DUR);
  await send('Page.stopScreencast');
  frames.forEach(([ms, data], i) => fs.writeFileSync(path.join(out, `f${String(i).padStart(4, '0')}_${String(ms).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64')));
  const dts = frames.slice(1).map((f, i) => f[0] - frames[i][0]);
  console.log('frames', frames.length, 'avg dt', Math.round(dts.reduce((a, b) => a + b, 0) / Math.max(1, dts.length)), 'max dt', Math.max(...dts));
  ws.close(); ch.kill();
  setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { } process.exit(0); }, 500);
})();
