import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
export const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
export const SITE = process.env.SITE || 'http://localhost:8000';
export const U = SITE + '/index.html?emulator=1';
export const wait = ms => new Promise(r => setTimeout(r, ms));
export const log = (...a) => console.log(...a);
export const errs = [];
export let fails = 0;
export const check = (label, ok, extra = '') => { if (!ok) fails++; log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };
export const failCount = () => fails;
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
export async function device(name, w = 1200, extra = {}, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, hasTouch: w < 500, isMobile: w < 500 });
  // v1.20: Overtime is on by default (a block that reaches 0 counts up until Stop). Suites written before 1.20 test the
  // classic end of a block, so they run with it off; v1.20 suites that test it pass { overtime: true }.
  if (!opts.overtime) await ctx.addInitScript(() => { setInterval(() => { try { if (typeof S !== 'undefined' && S && S.settings && S.settings.overtime !== false) S.settings.overtime = false; } catch (e) { /* not loaded yet */ } }, 100); });
  await ctx.addInitScript(([extra, td]) => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '1.14'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', td); for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v); }, [extra, today()]);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('dialog', d => d.accept());
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource|WebChannel|transport errored|Could not reach Cloud Firestore|Sync hiccup|offline mode|unavailable|clan contribution|live count|permission-denied|Firestore rules do not accept/i.test(m.text())) errs.push(name + ' ' + m.type() + ': ' + m.text().slice(0, 200)); });
  const d = { ctx, p, name, ev: (f, a) => p.evaluate(f, a) };
  return d;
}
export async function signup(d, user) {
  await d.p.goto(U); await d.p.waitForSelector('#authView:not(.hidden)');
  await d.p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
  await d.p.click('[data-mode=signup] >> visible=true'); await d.p.fill('#authUser', user); await d.p.fill('#authPass', 'secret12'); await d.p.fill('#authPass2', 'secret12');
  await d.p.click('#authSubmit');
  await d.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && CLAN.started, null, { timeout: 20000 });
  await wait(1500);
  await d.ev(() => { if ($('#tutDlg').open) finishTutorial(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); });
  await wait(300);
  await d.ev(() => { if ($('#tutDlg').open) finishTutorial(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); });
}
export const until = async (d, fn, arg, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await d.ev(fn, arg)) return Date.now() - t0; await wait(150); } return -1; };
export const closeDlg = d => d.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
export const tryOp = (d, src, ...args) => d.p.evaluate(async ([src, args]) => { try { const r = await (new Function('return ' + src)())(...args); return r === false ? 'FALSE' : 'ALLOWED'; } catch (e) { return e.code || e.message; } }, [src, args]);
// Emulator admin writes (bypass the rules) for setting up states like a full clan or a high level.
const FS = 'http://127.0.0.1:8080/v1/projects/demo-pomo/databases/(default)/documents/';
const enc = v => v instanceof Date ? { timestampValue: v.toISOString() } : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'string' ? { stringValue: v }
  : v === null ? { nullValue: null } : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
export async function owner(path, fields) {
  const q = Object.keys(fields).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  const r = await fetch(FS + path + '?' + q, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, enc(v)])) }) });
  if (!r.ok) throw new Error('owner write ' + r.status + ' ' + (await r.text()).slice(0, 200));
}
export async function ownerGet(path) {
  const r = await fetch(FS + path, { headers: { Authorization: 'Bearer owner' } });
  if (r.status === 404) return null;
  const j = await r.json();
  const dec = v => 'integerValue' in v ? +v.integerValue : 'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue : 'stringValue' in v ? v.stringValue : 'timestampValue' in v ? Date.parse(v.timestampValue)
    : 'arrayValue' in v ? (v.arrayValue.values || []).map(dec) : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, dec(x)])) : null;
  return Object.fromEntries(Object.entries(j.fields || {}).map(([k, x]) => [k, dec(x)]));
}
export async function ownerCreate(path, fields) {
  const r = await fetch(FS + path, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, enc(v)])) }) });
  if (!r.ok) throw new Error('owner create ' + r.status);
}
// log a finished focus block of `min` minutes that started now (so it counts for a clan joined earlier)
export async function focus(d, min = 25) {
  await d.ev(m => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer(); t.planned = m * 60000; t.focusStartedAt = Date.now(); t.endAt = Date.now() - 1; }, min);
  await wait(500);
}
