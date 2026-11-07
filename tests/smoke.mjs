// Garment Cost BD smoke tests - headless-Chrome QA harness.
// Raw CDP over the stock Playwright headless_shell binary.
// Run: node tests/smoke.mjs
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell';
const PORT = 9343;
const DIR = path.dirname(fileURLToPath(import.meta.url));
const PAGE = 'file://' + path.resolve(DIR, '..', 'index.html');

const proc = spawn(BIN, [
  '--headless', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=' + PORT, '--no-first-run', 'about:blank',
], { stdio: 'ignore' });

async function waitForVersion(tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + PORT + '/json/version');
      if (r.ok) return await r.json();
    } catch (e) { /* not up yet */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('CDP did not come up');
}

let seq = 0;
const pending = new Map();
let ws;
const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];

function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('CDP timeout: ' + method)); } }, 15000);
  });
}
async function ev(expression) {
  const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (res.exceptionDetails) throw new Error('page eval threw: ' + JSON.stringify(res.exceptionDetails));
  return res.result.value;
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let passed = 0;
function check(name, cond, extra = '') {
  if (!cond) throw new Error('FAIL: ' + name + ' ' + extra);
  passed++;
  console.log('ok - ' + name);
}

try {
  await waitForVersion();
  const t = await (await fetch('http://127.0.0.1:' + PORT + '/json/new?' + encodeURIComponent(PAGE), { method: 'PUT' })).json();
  ws = new WebSocket(t.webSocketDebuggerUrl);
  await once(ws, 'open');
  ws.addEventListener('message', (evt) => {
    const m = JSON.parse(evt.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) p.reject(new Error(JSON.stringify(m.error))); else p.resolve(m.result);
    } else if (m.method === 'Runtime.exceptionThrown') {
      pageErrors.push(JSON.stringify(m.params.exceptionDetails).slice(0, 300));
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      consoleErrors.push(JSON.stringify(m.params.args).slice(0, 300));
    } else if (m.method === 'Network.loadingFailed') {
      failedRequests.push(JSON.stringify(m.params).slice(0, 200));
    }
  });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await sleep(1200);

  // ---------------------------------------------------------- render + defaults
  check('title', (await ev(`document.title`)).includes('Garment Cost BD'));
  check('default consumption 0.366 m', (await ev(`document.getElementById('outConsumption').textContent`)).includes('0.366'));
  check('default consumption with wastage 0.384 m', (await ev(`document.getElementById('outConsumptionW').textContent`)).includes('0.384'));
  check('default fabric cost 84.52', (await ev(`document.getElementById('outFabricCost').textContent`)).includes('84.52'));
  check('default FOB 191.75', (await ev(`document.getElementById('outFob').textContent`)).includes('191.75'));
  check('default per dozen 2301', (await ev(`document.getElementById('outPerDozen').textContent`)).includes('2301'));
  check('default total fabric 1921 m', (await ev(`document.getElementById('outTotalFabricM').textContent`)).includes('1921'));
  check('default total value 958750', (await ev(`document.getElementById('outTotalValue').textContent`)).includes('958750'));
  check('3 default trim rows', (await ev(`document.querySelectorAll('#trimsBody tr').length`)) === 3);
  check('no error banner by default', (await ev(`document.getElementById('errBanner').hidden`)) === true);
  check('footer disclaimer', (await ev(`document.querySelector('footer').textContent`)).includes('Estimation tool'));

  // ---------------------------------------------------------- preset switch
  await ev(`const s = document.getElementById('preset'); s.value = 'hoodie'; s.dispatchEvent(new Event('change', {bubbles:true}))`);
  check('hoodie preset body 72', (await ev(`document.getElementById('bodyLen').value`)) === '72');
  check('hoodie preset sleeve 62', (await ev(`document.getElementById('sleeveLen').value`)) === '62');
  check('hoodie preset price mode kg', (await ev(`document.getElementById('priceMode').value`)) === 'kg');
  check('hoodie FOB computed 269.30', (await ev(`document.getElementById('outFob').textContent`)).includes('269.30'));

  // ---------------------------------------------------------- live edit
  await ev(`const s2 = document.getElementById('preset'); s2.value = 'tshirt'; s2.dispatchEvent(new Event('change', {bubbles:true}))`);
  await ev(`const i = document.getElementById('bodyLen'); i.value = '80'; i.dispatchEvent(new Event('input', {bubbles:true}))`);
  check('body 80 -> consumption 0.403 m', (await ev(`document.getElementById('outConsumption').textContent`)).includes('0.403'));
  check('preset flips to custom', (await ev(`document.getElementById('preset').value`)) === 'custom');

  // ---------------------------------------------------------- invalid input
  await ev(`const b = document.getElementById('bodyLen'); b.value = '5'; b.dispatchEvent(new Event('input', {bubbles:true}))`);
  check('invalid body shows error banner', (await ev(`!document.getElementById('errBanner').hidden`)) === true);
  check('invalid body marks field', (await ev(`document.getElementById('bodyLen').classList.contains('invalid')`)) === true);
  check('invalid body blanks FOB', (await ev(`document.getElementById('outFob').textContent`)) === '\u2014');
  await ev(`const b2 = document.getElementById('bodyLen'); b2.value = '70'; b2.dispatchEvent(new Event('input', {bubbles:true}))`);
  check('fix restores FOB 191.75', (await ev(`document.getElementById('outFob').textContent`)).includes('191.75'));

  // ---------------------------------------------------------- add trim
  await ev(`document.getElementById('addTrim').click()`);
  check('add trim makes 4 rows', (await ev(`document.querySelectorAll('#trimsBody tr').length`)) === 4);
  await ev(`const rows = document.querySelectorAll('#trimsBody tr'); const q = rows[3].querySelectorAll('input')[1]; q.value = '2'; q.dispatchEvent(new Event('input', {bubbles:true})); const p = rows[3].querySelectorAll('input')[2]; p.value = '10'; p.dispatchEvent(new Event('input', {bubbles:true}))`);
  check('new trim raises FOB (191.75 -> 214.85)', (await ev(`document.getElementById('outFob').textContent`)).includes('214.85'));

  // ---------------------------------------------------------- language
  await ev(`document.getElementById('langToggle').click()`);
  await sleep(200);
  check('BN title renders', (await ev(`document.querySelector('h1').textContent`)).includes('\u0997\u09be\u09b0\u09cd\u09ae\u09c7\u09a8\u09cd\u099f\u09b8'));
  check('BN FOB digits', (await ev(`document.getElementById('outFob').textContent`)).includes('\u09e8\u09e7\u09ea.\u09ee\u09eb'));
  check('BN preset name', (await ev(`document.getElementById('preset').selectedOptions[0].textContent`)).includes('\u09a8\u09bf\u099c\u09c7\u09b0'));
  check('lang persists', (await ev(`localStorage.getItem('gcb_lang_v1')`)) === 'bn');
  await ev(`document.getElementById('langToggle').click()`);
  await sleep(200);
  check('back to EN', (await ev(`document.querySelector('h1').textContent`)) === 'Garment Cost BD');

  // ---------------------------------------------------------- save sheet + reload
  await ev(`document.getElementById('sheetName').value = 'Smoke Tee'; document.getElementById('saveSheet').click()`);
  check('saved sheet appears', (await ev(`document.querySelectorAll('#savedList li').length`)) === 1);
  check('saved name shown', (await ev(`document.querySelector('#savedList li span').textContent`)).includes('Smoke Tee'));
  await send('Page.reload', { ignoreCache: true });
  await sleep(1200);
  check('saved sheet persists after reload', (await ev(`document.querySelectorAll('#savedList li').length`)) === 1);
  check('state persists after reload (body 70)', (await ev(`document.getElementById('bodyLen').value`)) === '70');

  // ---------------------------------------------------------- mobile
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(400);
  check('390px no horizontal overflow', (await ev(`document.documentElement.scrollWidth <= 390`)) === true);

  // ---------------------------------------------------------- errors
  check('0 page errors', pageErrors.length === 0, JSON.stringify(pageErrors));
  check('0 console errors', consoleErrors.length === 0, JSON.stringify(consoleErrors));
  check('0 failed requests', failedRequests.length === 0, JSON.stringify(failedRequests));

  console.log('\nSMOKE: ' + passed + '/' + passed + ' PASS');
} catch (err) {
  console.error('\nSMOKE FAILED: ' + err.message);
  console.error('pageErrors:', JSON.stringify(pageErrors));
  console.error('consoleErrors:', JSON.stringify(consoleErrors));
  process.exitCode = 1;
} finally {
  try { proc.kill(); } catch (e) { /* already dead */ }
}
