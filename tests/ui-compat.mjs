// Preloaded (node --import) for every suite since v2.0. The app's native controls became its own (<ui-select>,
// <ui-date>, <ui-time>, <ui-num>, <ui-color>, <ui-tags>, and a dialog instead of confirm() / alert()). The older suites
// drive them the way they always did — page.selectOption(), page.fill() on a date, page.on('dialog') or a stubbed
// window.confirm — and this layer translates those calls, so one suite never has to know which kind of control it met:
//   selectOption('#id', value | { value } | { label } | { index })   on a <ui-select>: chooses that option the way a person
//                                                                     would (one input + one change event)
//   fill('#id', text)        on <ui-date> / <ui-time> / <ui-num> / <ui-color> / <ui-tags>: sets the value, fires input + change
//   check / uncheck / setChecked, inputValue, isChecked                keep working (the elements keep value / checked)
//   page.on('dialog', h)     h is also called for the app's own confirm / alert dialog, with accept() / dismiss() / message() / type()
//   window.confirm = () => true   (a stub set inside the page) answers the app's own confirm dialog the same way
// (v200a tests the dialog itself and names its buttons, so it is left alone, like every suite that clicks them.)
import { chromium } from 'playwright';
import fs from 'fs';

// A suite that clicks the app's confirm dialog itself (it names the dialog's buttons) keeps doing so: for that suite
// the dialog is not routed to page.on('dialog') handlers or to a window.confirm stub.
const MANUAL = (() => { try { return /#cf(Ok|No)\b/.test(fs.readFileSync(process.argv[1], 'utf8')); } catch (e) { return false; } })();

const CUSTOM = 'ui-select, ui-date, ui-time, ui-num, ui-color, ui-tags';
// Runs in the page before the app: watch the app's confirm dialog and report it to the test.
const IN_PAGE = manual => {
  if (manual) return;
  const nativeConfirm = window.confirm, nativeAlert = window.alert;
  window.__uiCompat = { last: 0 };
  const seen = new WeakSet();
  const look = () => {
    const d = document.getElementById('confirmDlg');
    if (!d || !d.open || d.classList.contains('closing')) { if (d) seen.delete(d); return; }
    if (seen.has(d)) return;
    const ok = d.querySelector('#cfOk'), no = d.querySelector('#cfNo');
    if (!ok || ok.disabled) return;   // (a "type the word" confirm waits for the word)
    seen.add(d);
    const text = [d.querySelector('#cfTitle'), d.querySelector('#cfBody')].map(x => (x && !x.classList.contains('hidden') ? x.textContent.trim() : '')).filter(Boolean).join('\n\n');
    const isAlert = !no || no.classList.contains('hidden');
    const answer = v => { seen.delete(d); (v || isAlert ? ok : no).click(); };
    // a suite that replaced window.confirm / alert inside the page answers through its stub
    if (!isAlert && window.confirm !== nativeConfirm) { let r = true; try { r = window.confirm(text); } catch (e) {} answer(r !== false); return; }
    if (isAlert && window.alert !== nativeAlert) { try { window.alert(text); } catch (e) {} answer(true); return; }
    if (typeof window.__uiDialog === 'function') { window.__uiCompat.answer = answer; window.__uiDialog(isAlert ? 'alert' : 'confirm', text); }
  };
  setInterval(look, 60);
};

function patchPage(pg) {
  if (pg.__uiCompat) return pg; pg.__uiCompat = true;
  const handlers = new Set();
  const on = pg.on.bind(pg), once = pg.once.bind(pg), off = (pg.off || pg.removeListener).bind(pg);
  pg.on = (ev, h) => { if (ev === 'dialog') handlers.add(h); return on(ev, h); };
  pg.addListener = pg.on;
  pg.once = (ev, h) => { if (ev === 'dialog') { const w = d => { handlers.delete(w); return h(d); }; w.__orig = h; handlers.add(w); return once(ev, h); } return once(ev, h); };
  pg.off = (ev, h) => { if (ev === 'dialog') { handlers.delete(h); for (const x of handlers) if (x.__orig === h) handlers.delete(x); } return off(ev, h); };
  pg.removeListener = pg.off;
  // awaited by newPage (below): a binding still being set up while the suite adds its own made Playwright throw
  // "Cannot read properties of undefined (reading 'addBinding')" inside the page
  pg.__uiReady = pg.exposeBinding('__uiDialog', async ({ page }, type, text) => {
    const answer = v => page.evaluate(v => { const a = window.__uiCompat && window.__uiCompat.answer; if (a) { window.__uiCompat.answer = null; a(v); } }, v).catch(() => {});
    if (!handlers.size) return;   // nobody listens: the dialog stays for the suite to click (as a person would)
    let done = false;
    const fake = { type: () => type, message: () => text, defaultValue: () => '', page: () => page, accept: async () => { if (!done) { done = true; await answer(true); } }, dismiss: async () => { if (!done) { done = true; await answer(false); } } };
    for (const h of [...handlers]) { try { await h(fake); } catch (e) { /* the suite's own handler threw */ } }
  }).catch(() => {});

  const kind = sel => pg.evaluate(([s, c]) => { let el = null; try { el = document.querySelector(s); } catch (e) { return ''; } return el && el.matches(c) ? el.tagName.toLowerCase() : ''; }, [sel, CUSTOM]).catch(() => '');
  const selectOption = pg.selectOption.bind(pg);
  pg.selectOption = async (sel, values, opts) => {
    if (typeof sel !== 'string' || await kind(sel) !== 'ui-select') return selectOption(sel, values, opts);
    const v = Array.isArray(values) ? values[0] : values;
    return pg.evaluate(([s, v]) => {
      const el = document.querySelector(s), os = el.options;
      const o = typeof v === 'string' ? (os.find(x => x.value === v) || os.find(x => (x.label || x.textContent).trim() === v)) : v && v.value !== undefined ? os.find(x => x.value === v.value) : v && v.label !== undefined ? os.find(x => (x.label || x.textContent).trim() === v.label) : v && v.index !== undefined ? os[v.index] : null;
      if (!o) throw new Error('ui-select ' + s + ': no option ' + JSON.stringify(v));
      if (el.disabled) throw new Error('ui-select ' + s + ' is disabled');
      const changed = el.value !== o.value || el.selectedOptions[0] !== o;
      el.value = o.value;
      if (changed) { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
      return [o.value];
    }, [sel, v]);
  };
  const fill = pg.fill.bind(pg);
  pg.fill = async (sel, text, opts) => {
    const k = typeof sel === 'string' ? await kind(sel) : '';
    if (!k || k === 'ui-select') { const r = await fill(sel, text, opts); if (typeof sel === 'string') await pg.evaluate(s => { let el = null; try { el = document.querySelector(s); } catch (e) {} if (el && el.matches('input[data-suggest]') && window.UI && UI.closePop) UI.closePop('api'); }, sel).catch(() => {}); return r; }   // (a fill leaves the suggestion list closed, as a person who moves on would)
    return pg.evaluate(([s, t]) => {
      const el = document.querySelector(s);
      if (el.disabled) throw new Error(s + ' is disabled');
      const before = el.value; el.value = t;
      if (el.value !== before) { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
    }, [sel, String(text)]);
  };
  const inputValue = pg.inputValue.bind(pg);
  pg.inputValue = async (sel, opts) => (typeof sel === 'string' && await kind(sel) ? pg.evaluate(s => document.querySelector(s).value, sel) : inputValue(sel, opts));
  return pg;
}

const launch = chromium.launch.bind(chromium);
chromium.launch = async (...a) => {
  const b = await launch(...a);
  const nc = b.newContext.bind(b), np = b.newPage.bind(b);
  const wrapCtx = c => { if (c.__uiCompat) return c; c.__uiCompat = true; const cp = c.newPage.bind(c); c.newPage = async (...x) => { const pg = patchPage(await cp(...x)); await pg.__uiReady; return pg; }; c.on('page', pg => patchPage(pg)); return c; };
  b.newContext = async (...x) => { const c = await nc(...x); await c.addInitScript(IN_PAGE, MANUAL); return wrapCtx(c); };
  b.newPage = async (...x) => { const pg = await np(...x); await pg.addInitScript(IN_PAGE, MANUAL); wrapCtx(pg.context()); patchPage(pg); await pg.__uiReady; return pg; };
  return b;
};
