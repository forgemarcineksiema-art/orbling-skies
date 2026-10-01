/* Dev: scripted in-game screenshots through headless Chrome + the DevTools protocol.
 * Usage: node tools/shot.js <outDir> [steps.json]
 * Each step: { "eval": "js (awaited)", "resize": [w, h], "wait": ms, "shot": "name", "click": [x, y] } — run against http://127.0.0.1:8792/.
 * A click is a real mouse press (the game's "first input"); the eval of a click step runs first and may return [x, y].
 * LOG=1 prints the page's console (e.g. the Poki SDK's debug log with ?pokiDebug=true).
 * Without a steps file a default tour is captured (explore per biome, battle, galaxy, title). */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const out = process.argv[2] || '.';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333 + Math.floor(Math.random() * 400);
const URL0 = process.env.URL || 'http://127.0.0.1:8792/index.html';
// viewport: VW/VH (css px), DPR, MOBILE=1 for a touch phone (e.g. VW=390 VH=844 DPR=2 MOBILE=1 for portrait)
const VW = +(process.env.VW || 1280), VH = +(process.env.VH || 720), DPR = +(process.env.DPR || 1), MOBILE = !!process.env.MOBILE;
const setup = `(() => {
  try { localStorage.clear(); } catch (e) {}
  Game.newGame('Tester', { skin: WArt.SKINS[1], hair: 'spiky', hairC: WArt.HAIRC[1], top: WArt.SUITS[0], acc: ['goggles'] }, 'sunkit');
  Object.assign(Game.s.flags, { tutCatch: 1, tutDone: 1, introCamp: 1, introArena: 1 });
  Game.s.login.day = U.today();
  Game.s.visited = Object.keys(ZONES);
  Game.addMon(Game.makeMon('breezle', 12)); Game.addMon(Game.makeMon('mossmoo', 14));
  Game.save();
  return 'ok';
})()`;
const zone = z => `UI.go(ExploreScene, { zone: '${z}' }).then(() => 'ok')`;
const defaults = [
  { wait: 5000 },
  { eval: setup },
  ...['clover', 'whisper', 'shore', 'cove', 'ashen', 'caldera', 'drift', 'glacier', 'plains', 'spire', 'grove', 'citadel'].flatMap(z => [{ eval: zone(z), wait: 1800 }, { shot: 'ex_' + z }]),
  { eval: `UI.go(BattleScene, { kind: 'wild', enemies: [Game.makeMon('fluffire', 5)], zone: 'clover' }, { trans: 'battle' }).then(() => 'ok')`, wait: 3500 },
  { shot: 'battle_clover' },
  { eval: `UI.go(GalaxyScene, {}).then(() => 'ok')`, wait: 1800 },
  { shot: 'galaxy' },
  { eval: `UI.go(TitleScene, {}).then(() => 'ok')`, wait: 1800 },
  { shot: 'title' },
];
const steps = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : defaults;

const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const prof = path.join(out, '.prof' + PORT);
  const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, `--window-size=${VW},${VH}`, 'about:blank'], { stdio: 'ignore' });
  let list;
  for (let i = 0; i < 50 && !list; i++) { await sleep(200); try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch (e) { /* not up yet */ } }
  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0;
  const pend = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') console.log('EXC', m.params.exceptionDetails.text, m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description); else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || process.env.LOG)) console.log('console.' + m.params.type, m.params.args.map(a => a.value || a.description).join(' ').replace(/%c/g, '').replace(/(background-color|font-weight|color)[^;]*;[^ ]*/g, '')); });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: DPR, mobile: MOBILE });
  if (MOBILE) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url: URL0 });
  for (const st of steps) {
    if (st.eval) {
      const r = await send('Runtime.evaluate', { expression: st.eval, awaitPromise: true, returnByValue: true });
      if (r.result && r.result.exceptionDetails) console.log('eval error:', r.result.exceptionDetails.text, (r.result.exceptionDetails.exception || {}).description);
      else if (st.print && r.result && r.result.result) console.log('=>', JSON.stringify(r.result.result.value));
      if (st.click === true && r.result && r.result.result && Array.isArray(r.result.result.value)) st.click = r.result.result.value;
    }
    if (Array.isArray(st.click)) { const [x, y] = st.click; for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); }
    if (st.resize) await send('Emulation.setDeviceMetricsOverride', { width: st.resize[0], height: st.resize[1], deviceScaleFactor: DPR, mobile: MOBILE }); // turn the phone
    if (st.wait) await sleep(st.wait);
    if (st.shot) {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(out, st.shot + '.png'), Buffer.from(r.result.data, 'base64'));
      console.log('shot', st.shot);
    }
  }
  ws.close(); ch.kill();
  await sleep(300);
  try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { /* locked profile files */ }
})().catch(e => { console.error(e); process.exit(1); });
