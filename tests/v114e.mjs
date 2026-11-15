// v1.14 demo preview (sample clan, planned + live session, no writes), True Minimalist, and a layout audit of every clan
// screen and dialog at 360 / 390 / 768 / 1280 px, light + dark + Glossed Interface, with a long clan name.
// Usage: node v114e.mjs [shots]
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const SHOTS = process.argv.includes('shots');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const errs = [], found = new Map();
let fails = 0;
const check = (label, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };
const audit = touch => {
  const out = [], vw = innerWidth;
  if (document.documentElement.scrollWidth > vw + 1) out.push(['page', `page scrolls sideways (${document.documentElement.scrollWidth} > ${vw})`]);
  const root = [...document.querySelectorAll('dialog[open]')].pop() || document.querySelector('.tab.active');
  const sig = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const scrollAnc = el => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return a; } return null; };
  for (const el of [...root.querySelectorAll('*'), ...document.querySelectorAll('header.top *')]) {
    if (!el.getClientRects().length || el.closest('svg') && el.tagName !== 'svg') continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const anc = scrollAnc(el);
    if (!anc && (r.right > vw + 1 || r.left < -1) && cs.position !== 'fixed') out.push([sig(el), `sticks out of the screen (${Math.round(r.left)}..${Math.round(r.right)} / ${vw})`]);
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (own && el.scrollWidth > el.clientWidth + 1 && (cs.overflowX === 'hidden' || cs.overflowX === 'clip') && cs.textOverflow !== 'ellipsis') out.push([sig(el), `text clipped without ellipsis: "${el.textContent.trim().slice(0, 30)}"`]);
    if (own && cs.overflowX === 'visible' && el.scrollWidth > el.clientWidth + 2 && cs.display !== 'inline' && el.clientWidth > 0) out.push([sig(el), `text overflows its box: "${el.textContent.trim().slice(0, 30)}"`]);
    if (touch && el.matches('button, a[href], select, summary, [role=button], input:not([type=hidden]):not([type=range])') && !el.disabled && !el.closest('header.top')) {
      let h = r.height, w = r.width;
      const pa = getComputedStyle(el, '::after'); if (pa.content !== 'none' && pa.position === 'absolute') { w = Math.max(w, parseFloat(pa.width) || 0); h = Math.max(h, parseFloat(pa.height) || 0); }
      if (el.matches('input[type=text], input[type=number], input[type=date], input[type=time], input:not([type]), select, textarea')) { if (h < 40) out.push([sig(el), `field only ${Math.round(h)}px tall`]); }
      else if (el.matches('input[type=checkbox]')) { /* switches: the row is the target */ }
      else if (h < 43.5 || w < 43.5) out.push([sig(el), `tap target ${Math.round(w)}×${Math.round(h)} (“${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 18)}”)`]);
    }
  }
  return out;
};
async function open(w, h, touch, scheme = 'light', glass = null) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch && w < 700, colorScheme: scheme });
  await ctx.addInitScript(g => { localStorage.setItem('pomodorolist-intro-seen', '1'); if (g) localStorage.setItem('pomodorolist-glass', g); }, glass);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(`${w}: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|WebChannel/i.test(m.text())) errs.push(`${w} console: ${m.text().slice(0, 160)}`); });
  await p.goto('http://localhost:8000/index.html');
  await p.waitForSelector('#authView:not(.hidden)'); await wait(400);
  await p.evaluate(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
  await p.evaluate(() => startPreview());
  await p.waitForFunction(() => typeof CLAN !== 'undefined' && CLAN.doc && CLAN.members, null, { timeout: 15000 });
  await wait(1200);
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); $$('.pomeo-bubble').forEach(x => x.classList.add('hidden')); });
  return { ctx, p };
}

// ---------- 1. Demo preview: a sample clan, no writes ----------
{
  const { ctx, p } = await open(1280, 900, false);
  await p.evaluate(() => { window.__writes = 0; window.__wlog = []; for (const k of ['setDoc', 'updateDoc', 'deleteDoc', 'addDoc']) { const f = FB[k]; FB[k] = (...a) => { window.__writes++; window.__wlog.push(k + ' ' + (a[0] && a[0].path) + ' ' + new Error().stack.split('\n').slice(2, 5).map(x => x.trim().split(' ')[1]).join('<')); return f(...a); }; } const wb = FB.writeBatch; FB.writeBatch = () => { const x = wb(); return { ...x, commit: () => { window.__wlog.push('batch clans'); return x.commit(); } }; }; const rt = FB.runTransaction; FB.runTransaction = (...a) => { window.__tx = true; return rt(...a); }; window.__ls = JSON.stringify(Object.keys(localStorage).sort()); });
  await p.evaluate(() => showTab('clan')); await wait(800);
  check('Demo: a sample clan (header, level, members, quest, raid, feed, trophies)', await p.evaluate(() => /Night Owls/.test($('#clanBody').textContent) && $$('.cm-row').length === 5 && !!$('.clan-raid') && !!$('.clan-feed') && $$('.ctro').length >= 1));
  check('Demo: planned sessions with RSVPs', await p.evaluate(() => /Night owls/.test($('.cs-list').textContent) && /Mock test/.test($('.cs-list').textContent)));
  check('Demo: a live session at the study table (people, states, Pomeo, reactions)', await p.evaluate(() => $$('.lv-seat').length === 5 && !!$('.lv-reacts') && /Focusing/.test($('.lv-table').textContent) && /Away/.test($('.lv-table').textContent) && /Paused/.test($('.lv-table').textContent) && !!$('.lv-cd')));
  const tries = ['[data-cjoinlive]', '[data-react]', '[data-rsvp]', '#clanLeave', '[data-cremind]', '[data-cedit]'];
  let prompted = 0;
  for (const sel of tries) {
    await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
    await p.click(sel).catch(() => {}); await wait(250);
    if (await p.evaluate(() => $('#pvDlg').open)) prompted++;
  }
  check('Demo: actions show the “create your own account” prompt', prompted === tries.length, `${prompted}/${tries.length}`);
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); showTab('board'); S.ui.lbScope = 'clans'; renderBoard(); }); await wait(600);
  await p.evaluate(() => { showTab('reminders'); showTab('profile'); showTab('bag'); });
  await wait(500);
  check('Demo never writes clan data (no clan writes or transactions; the demo’s stand-in discards everything and nothing is stored in the browser)', await p.evaluate(() => !window.__wlog.some(x => /^\w+ (clans|clanOf|clanNames|clanCodes)/.test(x)) && !window.__tx && JSON.stringify(Object.keys(localStorage).sort()) === window.__ls), await p.evaluate(() => JSON.stringify(window.__wlog)));
  check('Demo: clan cosmetics in the bag’s Clan section', await p.evaluate(() => { S.ui.bagCat = 'clan'; showTab('bag'); return $$('#bagList .bag-item').length >= 6; }));
  // True Minimalist: the clan is still there (sessions, live, members) but cosmetics, shop, points, quest and raid are hidden
  await p.evaluate(() => { S.settings.gamification = false; G = null; applyCosmetics(); showTab('clan'); }); await wait(400);
  check('True Minimalist: sessions, live table and members stay; shop, points, levels, quest, raid and cosmetics are hidden',
    await p.evaluate(() => !!$('.cs-list') && !!$('.lv-card') && $$('.cm-row').length === 5 && !$('#clanShopBtn') && !$('.clan-raid') && !$('.clan-quest') && !$('.clan-lv') && !/Clan Points/.test($('#clanBody').textContent) && !$('.mvp') && !$('#clanBody .aura')));
  if (SHOTS) await p.screenshot({ path: 'c-min-1280.png', fullPage: true });
  await ctx.close();
}

// ---------- 2. Layout audit ----------
const LONG = 'Extraordinary Owls!';
const views = [
  ['clan', () => showTab('clan')],
  ['clan-none', () => { CLAN.__save = { id: CLAN.id, doc: CLAN.doc, me: CLAN.me }; CLAN.id = ''; showTab('clan'); }],
  ['clan-back', () => { Object.assign(CLAN, CLAN.__save); renderClan(); }],
  ['clan-summary', () => { LIVE.summary = { title: 'Group study with a long name', people: Object.values(DEMO_LIVE_PEOPLE()), min: 50, blocks: 2, together: true }; renderClan(); }],
  ['board-clans', () => { S.ui.lbScope = 'clans'; showTab('board'); }],
  ['reminders', () => { LIVE.summary = null; S.ui.remView = 'rem'; showTab('reminders'); }],
  ['profile', () => showTab('profile')],
  ['bag-clan', () => { S.ui.bagCat = 'clan'; showTab('bag'); }],
  ['timer-live', () => showTab('timer')],
  ['dlg-create', () => openClanCreate()], ['dlg-join', () => openClanJoin()], ['dlg-card', () => openClanCard(CLAN.doc)], ['dlg-invite', () => openClanInvite()],
  ['dlg-shop', () => openClanShop()], ['dlg-sched', () => openClanSched()], ['dlg-now', () => openClanSched(null, true)], ['dlg-settings', () => openClanSettings()],
  ['dlg-confirm', () => { confirmDlg({ title: 'Disband Extraordinary Owls!?', body: 'Every member is removed and the clan is deleted.', ok: 'Disband', danger: true, type: 'OWLS' }); }],
  ['dlg-inbox', () => { inboxAdd({ type: 'clan', key: 'creq:x', title: '@someone_with_a_long_name wants to join Extraordinary Owls!', body: 'Accept or decline here' }); openInbox(); }],
];
const runs = [[360, 740, true, 'light'], [390, 844, true, 'dark'], [768, 1024, true, 'light', 'full'], [1280, 860, false, 'dark', 'full']];
for (const [w, h, touch, scheme, glass] of runs) {
  const { ctx, p } = await open(w, h, touch, scheme, glass);
  await p.evaluate(n => { CLAN.doc.name = n; CLAN.doc.desc = 'upsc'; }, LONG);
  // the live table appears in the timer bar too: pretend we joined (no writes in the demo)
  for (const [name, fn] of views) {
    await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
    const res = await p.evaluate(`(() => { try { (${fn.toString()})(); return ''; } catch (e) { return e.stack.split('\\n').slice(0, 3).join(' | '); } })()`);
    if (res) { errs.push(`${w} ${name}: ${res}`); continue; }
    await wait(500);
    for (const [s, m] of await p.evaluate(audit, touch)) { const k = `${s} — ${m.replace(/\d+(\.\.\d+)?( \/ \d+)?\)/, '…)')}`; if (!found.has(k)) found.set(k, new Set()); found.get(k).add(`${w}:${name}`); }
    if (SHOTS) await p.screenshot({ path: `c-${w}-${name}.png`, fullPage: !name.startsWith('dlg') });
  }
  await ctx.close();
}
const rows = [...found.entries()].map(([k, v]) => `${k}  [${[...v].slice(0, 6).join(' ')}${v.size > 6 ? ' +' + (v.size - 6) : ''}]`).sort();
console.log(rows.join('\n'));
console.log(`\n${rows.length} layout findings`);
console.log('errors', JSON.stringify(errs.slice(0, 15)));
await b.close();
process.exit(fails || rows.length || errs.length ? 1 : 0);
