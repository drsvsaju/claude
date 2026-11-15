// v1.19.1: balanced card columns on wide screens. On every multi-card page (Profile, Clan, Quests, Friends, Garden,
// Stats, Shop, Timer, Reminders, Leaderboard, Bag, Settings): no card column ends more than 200 px before the other, a
// one-column fallback is centred and not too wide, and no card has a blank area more than 200 px tall beside it. At
// 1024 / 1280 / 1440 / 1920 / 2560 px; light, dark, Glossed Interface and True Minimalist; the demo account and a new
// account; again after cards open and close, the window is resized and the sidebar collapses. Phones and tablets keep
// one full-width column.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg, SITE } from './cl-common.mjs';
const LIMIT = 200, TOP = 24, INNER = 32;   // INNER: cards sit on 4 px rows, so the space between two cards of a column is the 22 px gap ± one row step; more than 32 is a real hole   // columns may end up to 200 px apart; they must start within 24 px of each other
const TABS = ['profile', 'clan', 'quests', 'friends', 'posts', 'garden', 'stats', 'shop', 'timer', 'reminders', 'board', 'bag', 'settings'];
// the layout of the visible page: two-column lists and grids, centred single columns, blank areas beside cards
const LAYOUT = `(() => {
  const sec = [...document.querySelectorAll('main > section, main > .tab, main [id^="tab-"]')].find(s => s.getClientRects().length && getComputedStyle(s).display !== 'none') || document.querySelector('main');
  const out = { cols: [], one: [], blank: [] };
  const vis = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  // 1. every container that shows cards side by side: where does each column end?
  const conts = [...sec.querySelectorAll('.mason, .grid-2, .quest-grid, .clan-grid')].filter(vis);
  for (const c of conts) {
    const r = c.getBoundingClientRect(), mid = r.left + r.width / 2, end = [null, null];
    const kids = [...c.children].filter(vis);
    if (c.classList.contains('mason-one')) { const p = c.parentElement.getBoundingClientRect(); out.one.push({ id: (c.className || '').slice(0, 30), w: Math.round(r.width), l: Math.round(r.left - p.left), rr: Math.round(p.right - r.right) }); continue; }
    const top = [null, null], boxes = [[], []];
    for (const k of kids) { const b = k.getBoundingClientRect(); if (b.height < 1) continue; const i = b.left + b.width / 2 < mid ? 0 : 1; end[i] = Math.max(end[i] ?? -1e9, b.bottom); top[i] = Math.min(top[i] ?? 1e9, b.top); boxes[i].push([b.top, b.bottom]); }
    if (end[0] !== null && end[1] !== null) {
      // the biggest empty space between two cards of one column (cards in reading order down the column)
      const inner = Math.max(0, ...boxes.map(bs => { bs.sort((x, y) => x[0] - y[0]); let g = 0; for (let j = 1; j < bs.length; j++) g = Math.max(g, bs[j][0] - bs[j - 1][1]); return g; }));
      out.cols.push({ id: (c.id || c.className || '').slice(0, 30), d: Math.round(Math.abs(end[0] - end[1])), top: Math.round(Math.abs(top[0] - top[1])), inner: Math.round(inner), mason: c.classList.contains('mason'), n: kids.length });
    }
    else if (kids.length > 1 && r.width > 700) {   // laid out as one column: it must not hug one side of a wider area
      const p = c.parentElement.getBoundingClientRect(); const kw = Math.max(...kids.map(k => k.getBoundingClientRect().width));
      if (kw < p.width * 0.6 && Math.abs((r.left - p.left) - (p.right - r.right)) > 40) out.blank.push({ id: (c.className || '').slice(0, 30), why: 'one column on one side', kw: Math.round(kw), pw: Math.round(p.width) });
    }
  }
  // 2. any top-level card with a blank area > LIMIT beside it (cards not inside another card, inside the page)
  const sticky = e => { for (let x = e; x && x !== sec; x = x.parentElement) if (getComputedStyle(x).position === 'sticky') return true; return false; };   // a sticky side panel moves with the page
  const cards = [...sec.querySelectorAll('.card')].filter(c => vis(c) && !c.parentElement.closest('.card') && !c.closest('dialog') && !sticky(c));
  const sr = sec.getBoundingClientRect();
  for (const c of cards) {
    const b = c.getBoundingClientRect();
    if (b.width >= sr.width * 0.6 || b.height < 1) continue;
    const cx = b.left + b.width / 2;
    if (Math.abs(cx - (sr.left + sr.width / 2)) < 40) continue;   // centred
    const side = cards.filter(d => d !== c && (d.getBoundingClientRect().right <= b.left + 2 || d.getBoundingClientRect().left >= b.right - 2));
    if (!side.length) { out.blank.push({ id: (c.className || '').slice(0, 30), why: 'nothing beside it', h: Math.round(b.height) }); continue; }
    const reach = Math.max(...side.filter(d => d.getBoundingClientRect().top < b.bottom).map(d => d.getBoundingClientRect().bottom), b.top);
    const gap = Math.round(b.bottom - Math.max(reach, b.top));
    if (gap > ${LIMIT}) out.blank.push({ id: (c.className || '').slice(0, 30), why: 'blank beside it', gap });
  }
  // 3. a card stretched far past its own content (a row-based grid making a short card as tall as its neighbour)
  for (const c of cards) {
    const b = c.getBoundingClientRect(); if (b.height < 1) continue;
    let bottom = b.top; for (const k of c.children) { if (!k.getClientRects().length || getComputedStyle(k).position === 'absolute') continue; bottom = Math.max(bottom, k.getBoundingClientRect().bottom); }
    const empty = Math.round(b.bottom - parseFloat(getComputedStyle(c).paddingBottom) - bottom);
    if (empty > 120) out.blank.push({ id: (c.className || '').slice(0, 30), why: 'stretched past its content', empty });
  }
  return out;
})()`;
const verdict = (L) => [...L.cols.filter(x => x.d > LIMIT).map(x => ({ ...x, why: 'columns end apart' })),
  ...L.cols.filter(x => x.top > TOP).map(x => ({ ...x, why: 'one column starts below the other' })),
  ...L.cols.filter(x => x.mason && x.inner > INNER).map(x => ({ ...x, why: 'empty space between two cards of a column' })), ...L.one.filter(x => x.w > 780 || Math.abs(x.l - x.rr) > 4).map(x => ({ ...x, why: 'single column not centred / too wide' })), ...L.blank];
async function sweep(D, tag, widths, extra = async () => {}) {
  const bad = [], seen = {};
  for (const w of widths) {
    await D.p.setViewportSize({ width: w, height: 1000 }); await wait(300);
    for (const t of TABS) {
      await D.ev(t => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); showTab(t); }, t); await wait(1100);
      await extra(t);
      const L = await D.ev(LAYOUT);
      seen[t] = (seen[t] || 0) + L.cols.length + L.one.length;
      for (const v of verdict(L)) if (t !== 'clan' || v.why === 'one column starts below the other') bad.push({ tag, w, t, ...v });   // the Clan page keeps its own fixed two columns (v1.19.1, as asked): only its tops are checked
    }
  }
  return { bad, seen };
}
const demo = async (w = 1440) => {
  const D = await device('D', w);
  await D.p.goto(SITE + '/index.html'); await D.p.waitForSelector('#authView:not(.hidden)'); await D.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
  await D.ev(() => startPreview()); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(3000); await closeDlg(D);
  await D.ev(() => { S.settings.gardenTour = Date.now(); });
  return D;
};
const WIDTHS = [1024, 1280, 1440, 1920, 2560];
// 1. the demo account (the fullest pages), default theme
const D = await demo();
const r1 = await sweep(D, 'demo', WIDTHS);
log('two-column / centred layouts checked per page:', JSON.stringify(r1.seen));
check(`Demo, every page at ${WIDTHS.join(' / ')} px: card columns end within ${LIMIT} px of each other, a single column is centred, no blank area beside a card`, !r1.bad.length, JSON.stringify(r1.bad.slice(0, 6)));
// the reported pages specifically
const pc = await D.ev(async () => { const sl = ms => new Promise(r => setTimeout(r, ms)); const out = {};
  showTab('profile'); await sl(1200); { const m = document.querySelector('#tab-profile .mason'); const r = m.getBoundingClientRect(), mid = r.left + r.width / 2, end = [0, 0]; for (const k of m.children) { const b = k.getBoundingClientRect(); if (!b.height) continue; end[b.left + b.width / 2 < mid ? 0 : 1] = Math.max(end[b.left + b.width / 2 < mid ? 0 : 1], b.bottom); } out.profile = { cols: m.classList.contains('mason-one') ? 1 : 2, d: Math.round(Math.abs(end[0] - end[1])), n: m.children.length }; }
  showTab('clan'); await sl(1200); { const g = document.querySelector('#tab-clan .clan-grid'); out.clan = { mason: !!document.querySelector('#tab-clan .mason'), stacks: g ? [...g.children].filter(c => c.classList.contains('stack')).length : 0, cols: g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0 }; }
  return out; });
check('Profile at 1440 px: two balanced columns of cards; the Clan page is back to its own layout (two fixed columns, not the balanced list) (v1.19.1)', pc.profile.cols === 2 && pc.profile.d <= 200 && !pc.clan.mason && pc.clan.stacks === 2 && pc.clan.cols === 2, JSON.stringify(pc));
// 2. light / dark / Glossed / True Minimalist at 1280 and 1920
const VAR = [{ mode: 'light', glass: 'off', mini: false }, { mode: 'dark', glass: 'off', mini: false }, { mode: 'dark', glass: 'full', mini: false }, { mode: 'light', glass: 'lite', mini: false }, { mode: 'light', glass: 'off', mini: true }, { mode: 'dark', glass: 'full', mini: true }];
const vbad = [];
for (const v of VAR) {
  await D.ev(v => { S.settings.theme = v.mode; applyTheme(); setGlass(v.glass); if (minimal() !== v.mini) setMinimal(v.mini); }, v); await wait(500);
  const r = await sweep(D, `${v.mode}/${v.glass}${v.mini ? '/minimal' : ''}`, [1280, 1920]);
  vbad.push(...r.bad);
}
await D.ev(() => { S.settings.theme = 'auto'; applyTheme(); setGlass('off'); if (minimal()) setMinimal(false); });
check(`Light, dark, Glossed (lite / full) and True Minimalist (${VAR.length} variants) at 1280 and 1920 px: the same on every page`, !vbad.length, JSON.stringify(vbad.slice(0, 6)));
// 3. re-flow: cards opening and closing, resizing, the sidebar collapsing
await D.p.setViewportSize({ width: 1440, height: 1000 });
const reflow = [];
const L = async (what) => { await wait(700); const onClan = await D.ev(() => S.ui.tab === 'clan'); for (const v of verdict(await D.ev(LAYOUT))) if (!onClan || v.why === 'one column starts below the other') reflow.push({ what, ...v }); };
await D.ev(() => showTab('clan')); await wait(1200);
for (const k of [0, 1, 2]) { await D.ev(() => document.querySelectorAll('#tab-clan details').forEach(d => { d.open = !d.open; })); await L(`clan details toggled ${k}`); }
for (const k of [0, 1]) { await D.ev(() => document.querySelectorAll('#tab-clan .fold-hd').forEach(b => b.click())); await L(`clan folding cards toggled ${k}`); }
await D.ev(() => showTab('profile')); await wait(1200);
await D.ev(() => { const c = document.querySelector('#tab-profile .mason > .card'); c.style.paddingBottom = '400px'; }); await L('profile: the first card grows by 400 px');
await D.ev(() => { const c = document.querySelector('#tab-profile .mason > .card'); c.style.paddingBottom = ''; }); await L('profile: and shrinks back');
await D.ev(() => { document.querySelectorAll('#tab-profile .mason > *').forEach((c, i) => { if (i > 1) c.style.display = 'none'; }); }); await wait(700);
const few = await D.ev(() => { const m = document.querySelector('#tab-profile .mason'), r = m.getBoundingClientRect(), p = m.parentElement.getBoundingClientRect(); return { one: m.classList.contains('mason-one'), w: Math.round(r.width), l: Math.round(r.left - p.left), rr: Math.round(p.right - r.right) }; });
await D.ev(() => document.querySelectorAll('#tab-profile .mason > *').forEach(c => { c.style.display = ''; })); await L('profile: all cards back');
const back2 = await D.ev(() => !document.querySelector('#tab-profile .mason').classList.contains('mason-one'));
// empty and hidden cards take no room: an empty card first in the list, one in the middle, a hidden one, the right
// column's first card hidden — the columns still start on one line, with no empty space between cards
await D.ev(() => { const m = document.querySelector('#tab-profile .mason'); const e = () => { const d = document.createElement('div'); d.className = 'v1191d-empty'; return d; }; m.prepend(e()); m.children[4].after(e()); const h = document.createElement('div'); h.className = 'card v1191d-empty'; h.style.visibility = 'hidden'; h.style.display = 'none'; m.children[2].after(h); }); await L('profile: empty and hidden cards added');
await D.ev(() => { const m = document.querySelector('#tab-profile .mason'); const right = [...m.children].find(c => c.offsetHeight && c.getBoundingClientRect().left > m.getBoundingClientRect().left + 50); right.dataset.v1191d = '1'; right.style.display = 'none'; }); await L("profile: the right column's first card hidden");
await D.ev(() => { document.querySelectorAll('.v1191d-empty').forEach(x => x.remove()); const r = document.querySelector('[data-v1191d]'); r.style.display = ''; delete r.dataset.v1191d; }); await L('profile: back to normal');
for (const w of [1024, 2560, 1280, 1440]) { await D.p.setViewportSize({ width: w, height: 1000 }); await L(`resized to ${w}`); }
for (const t of ['profile', 'clan', 'quests']) { await D.ev(t => { showTab(t); navMini(true); }, t); await L(`${t}: sidebar collapsed`); await D.ev(() => navMini(false)); await L(`${t}: sidebar back`); }
check('Re-flow: clan raid / member details opened and closed, a card growing and shrinking, resizing between 1024 and 2560 px, the sidebar collapsing — still balanced', !reflow.length, JSON.stringify(reflow.slice(0, 5)));
check(`Too few cards to share two columns (two left): one centred column, at most 760 px wide; two columns again when the cards come back`, few.one && few.w <= 760 && Math.abs(few.l - few.rr) <= 4 && back2, JSON.stringify({ few, back2 }));
// 4. phones and tablets: one full-width column, as before
const narrow = [];
for (const w of [390, 768]) { await D.p.setViewportSize({ width: w, height: 900 }); for (const t of ['profile', 'clan', 'quests', 'friends']) { await D.ev(t => showTab(t), t); await wait(900); narrow.push(...(await D.ev(t => [...document.querySelectorAll(`#tab-${t} .mason`)].map(m => { const r = m.getBoundingClientRect(), p = m.parentElement.getBoundingClientRect(), kids = [...m.children].filter(k => k.getClientRects().length); return { t, w: innerWidth, full: Math.abs(r.width - p.width) < 2, oneCol: kids.every(k => Math.abs(k.getBoundingClientRect().left - kids[0].getBoundingClientRect().left) < 2) }; }), t))); } }
check('390 and 768 px: the card lists are one full-width column', narrow.length >= 6 && narrow.every(x => x.full && x.oneCol), JSON.stringify(narrow.filter(x => !x.full || !x.oneCol).slice(0, 3)));
await D.ctx.close();
// 5. a new account (sparse pages: no clan, no friends, few achievements)
const A = await device('A', 1440);
await signup(A, 'col_' + Date.now().toString(36).slice(-5)); await closeDlg(A);
await A.ev(() => { S.settings.gardenTour = Date.now(); });
const r5 = await sweep(A, 'new account', WIDTHS);
check(`A new account (no clan, no friends) at ${WIDTHS.join(' / ')} px: the same`, !r5.bad.length, JSON.stringify(r5.bad.slice(0, 6)));
// 6. the same account after beating this week's boss Solo (the reported Quests page: Defeated, Claim rewards, Rewards card), before and after claiming
await A.p.setViewportSize({ width: 1440, height: 1000 });
await A.ev(() => { const st = Date.now() - 6 * 3600e3; const s = { id: 'big' + st, name: 'Maths', start: st, end: st + 320 * 6e4, duration: 320 * 6e4, planned: 320 * 6e4, preset: 'x' }; S.sessions.push(s); cloudAddSessions([s]); G = null; save(); checkBoss(); });
await wait(2500); await closeDlg(A);
const beat = await A.ev(() => { const b = bossBattle('solo'); return { done: !!b.done, pending: pendingBossRewards().length }; });
const r6 = await sweep(A, 'boss beaten', WIDTHS);
await A.ev(async () => { for (const p of pendingBossRewards()) await claimBossRewards(p.boss.id, p.mode); }); await wait(1500); await closeDlg(A);
const r7 = await sweep(A, 'rewards claimed', [1440, 1920]);
check(`A real account that beat the boss (unclaimed, then claimed) at ${WIDTHS.join(' / ')} px: both columns start on one line on every page, nothing apart`, beat.done && beat.pending > 0 && !r6.bad.length && !r7.bad.length, JSON.stringify({ beat, bad: [...r6.bad, ...r7.bad].slice(0, 6) }));
await A.ctx.close();
log('errors', JSON.stringify(errs));
log(failCount() ? failCount() + ' failed' : 'ALL PASSED'); await b.close(); process.exit(failCount() ? 1 : 0);
