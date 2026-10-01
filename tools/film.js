/* Dev: record a short burst of real frames (CDP screencast in headless Chrome) to judge motion.
 * Usage: node tools/film.js <outDir> <steps.json> [frames=24]
 * steps: same format as shot.js ({eval, wait, print}); recording starts after the last step. */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const out = process.argv[2] || '.';
const steps = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const N = +(process.argv[4] || 24);
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333 + Math.floor(Math.random() * 400);
const URL0 = process.env.URL || 'http://127.0.0.1:8792/index.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const prof = path.join(out, '.prof' + PORT);
  const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, '--window-size=1280,720', 'about:blank'], { stdio: 'ignore' });
  let list;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch (e) { /* not up yet */ } }
  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0;
  const pend = new Map(), frames = [];
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    else if (m.method === 'Page.screencastFrame') { frames.push([m.params.metadata.timestamp, m.params.data]); ws.send(JSON.stringify({ id: ++id, method: 'Page.screencastFrameAck', params: { sessionId: m.params.sessionId } })); }
    else if (m.method === 'Runtime.exceptionThrown') console.log('EXC', m.params.exceptionDetails.text, m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description);
  });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: URL0 });
  for (const st of steps) {
    if (st.eval) {
      const r = await send('Runtime.evaluate', { expression: st.eval, awaitPromise: true, returnByValue: true });
      if (r.result && r.result.exceptionDetails) console.log('eval error:', r.result.exceptionDetails.text, (r.result.exceptionDetails.exception || {}).description);
      else if (st.print && r.result && r.result.result) console.log('=>', JSON.stringify(r.result.result.value));
    }
    if (st.wait) await sleep(st.wait);
  }
  await send('Page.startScreencast', { format: 'jpeg', quality: 80, everyNthFrame: 1 });
  const t0 = Date.now();
  while (frames.length < N && Date.now() - t0 < 15000) await sleep(20);
  await send('Page.stopScreencast');
  frames.slice(0, N).forEach(([ts, data], i) => fs.writeFileSync(path.join(out, `fr${String(i).padStart(2, '0')}.jpg`), Buffer.from(data, 'base64')));
  const dts = frames.slice(1, N).map((f, i) => Math.round((f[0] - frames[i][0]) * 1000));
  console.log('frames', Math.min(N, frames.length), 'dt ms', dts.join(','));
  ws.close(); ch.kill();
  setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { /* locked */ } process.exit(0); }, 400);
})();
