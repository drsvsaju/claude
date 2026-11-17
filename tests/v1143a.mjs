// v1.14.3: copy buttons (Clipboard API, the select-and-copy fallback, both failing), Share on phones,
// navigation at 360/390/768/1024/1280/1440 (no cut-off labels, sidebar / ☰ / bottom bar + More, badges,
// shortcuts, collapse remembered, tour), the collapsible profile card, the welcome page for new and returning visitors.
import { b, device, signup, wait, log, check, errs, failCount, closeDlg } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-4);
const A = await device('A', 1280);
await A.ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:8000' });
await signup(A, 'cp_' + R);
await A.ev(n => clanCreate({ name: n, tag: 'COPY', desc: 'jee' }), 'Copy Crew ' + R);
await A.ev(() => clanLoadDetails(true)); await wait(800);
const clip = () => A.ev(() => navigator.clipboard.readText());
const resetClip = () => A.ev(() => navigator.clipboard.writeText('-'));
// ---------- 1. Copy: the Clipboard API (Chrome) ----------
await A.ev(() => { showTab('clan'); openClanInvite(); }); await wait(300);
const link = await A.ev(() => $('#ciLink').value), code = await A.ev(() => CLAN.info.code);
await resetClip(); await A.p.click('#ciCopy'); await wait(250);
check('Clan invite link: Copy puts the link on the clipboard', (await clip()) === link, link);
check('…the button reads “Copied ✓”', (await A.ev(() => $('#ciCopy').textContent)) === 'Copied ✓');
check('…and a small toast says so', await A.ev(() => [...document.querySelectorAll('.toast-item')].some(t => t.textContent.includes('Invite link copied'))));
await wait(2100);
check('…the button goes back to “Copy” after about 2 seconds', (await A.ev(() => $('#ciCopy').textContent)) === 'Copy');
await resetClip(); await A.p.click('#ciCodeCopy'); await wait(250);
check('Clan invite code: Copy code copies the code', (await clip()) === code, code);
// ---------- 2. Clipboard API blocked (embedded page / permissions, as Safari often does): the select-and-copy fallback ----------
await A.ev(() => { window.__copied = null; document.addEventListener('copy', () => { window.__copied = document.getSelection().toString(); }); window.__wt = navigator.clipboard.writeText.bind(navigator.clipboard);
  navigator.clipboard.writeText = () => Promise.reject(new DOMException('Write permission denied.', 'NotAllowedError')); });
await A.p.click('#ciCopy'); await wait(300);
check('Clipboard API blocked → copied with the fallback (select + copy) inside the dialog', (await A.ev(() => window.__copied)) === link, await A.ev(() => window.__copied));
check('…still “Copied ✓”', (await A.ev(() => $('#ciCopy').textContent)) === 'Copied ✓');
// ---------- 3. No Clipboard API at all (an http page, older Safari): copies straight away ----------
await wait(2100);
await A.ev(() => { window.__copied = null; Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); });
await A.p.click('#ciCopy'); await wait(300);
check('No Clipboard API → copied with the fallback', (await A.ev(() => window.__copied)) === link);
// ---------- 4. Both fail: the link is selected and the toast says how to copy it ----------
await wait(2100);
await A.ev(() => { window.__ex = document.execCommand; document.execCommand = () => false; });
await A.p.click('#ciCopy'); await wait(400);
const sel = await A.ev(() => { const i = $('#ciLink'); return { active: document.activeElement === i, all: i.selectionStart === 0 && i.selectionEnd === i.value.length, btn: $('#ciCopy').textContent,
  toast: [...document.querySelectorAll('.toast-item')].map(t => t.textContent).find(t => t.includes('Couldn’t copy')) || '' }; });
check('Copying impossible → the link is selected for Ctrl/⌘+C', sel.active && sel.all, JSON.stringify(sel));
check('…the toast says so (and the button doesn’t pretend it worked)', /press (Ctrl|⌘)\+C/.test(sel.toast) && sel.btn === 'Copy', sel.toast);
await A.ev(() => { document.execCommand = window.__ex; delete navigator.clipboard; delete navigator.clipboard.writeText; });
check('…the Clipboard API is back for the next checks', await A.ev(() => !!navigator.clipboard));
await closeDlg(A);
// ---------- 5. The other Copy buttons ----------
await A.ev(() => { S.ui.friendsView = 'friends'; showTab('friends'); }); await wait(600);
await resetClip(); await A.p.click('[data-copy-invite]'); await wait(300);
check('Friends: “Copy invite link” copies the friend invite link', (await clip()) === (await A.ev(() => inviteLink())));
check('…and reads “Copied ✓”', (await A.ev(() => $('[data-copy-invite]').textContent)) === 'Copied ✓');
await A.ev(() => showTab('settings')); await wait(500);
await resetClip(); await A.ev(() => $('#copyInvite').scrollIntoView({ block: 'center' })); await A.p.click('#copyInvite'); await wait(300);
check('Settings: the invite link Copy button works', (await clip()) === (await A.ev(() => inviteLink())));
await A.ev(() => { showTab('profile'); return openShareDlg(); }); await wait(1500);
await resetClip(); await A.p.click('#shCopy'); await wait(300);
const url = await A.ev(() => shareURL);
check('Player card: Copy copies the card link', url && (await clip()) === url);
check('Share buttons stay hidden on a computer (Copy is enough there)', await A.ev(() => ['#shLink', '#ciShare', '#shareInvite2'].every(s => $(s).classList.contains('hidden'))));
await closeDlg(A);
// ---------- 6. Phones: a Share button where the Web Share API is available ----------
const P = await device('P', 390);
await P.ctx.addInitScript(() => { navigator.share = d => { window.__shared = d; return Promise.resolve(); }; });
await signup(P, 'cq_' + R);
await P.ev(() => { S.ui.friendsView = 'friends'; showTab('friends'); }); await wait(600);
check('Phone with Web Share: Friends shows a Share button next to Copy', await P.ev(() => { const s = $('[data-share-invite]'); return !!s && !s.classList.contains('hidden') && s.offsetWidth > 0; }));
await P.p.click('[data-share-invite]'); await wait(300);
check('…which opens the share sheet with the invite link', (await P.ev(() => window.__shared && window.__shared.url)) === (await P.ev(() => inviteLink())));
await P.ev(c => clanByCode(c).then(clanJoinOpen), code).catch(() => {});
await A.ev(() => clanSetDoc({ joinMode: 'open' }));
await P.ev(c => clanByCode(c).then(clanJoinOpen), code); await wait(1500);
await P.ev(() => { showTab('clan'); return clanLoadDetails(true); }); await wait(800);
await P.ev(() => openClanInvite()); await wait(300);
check('Phone: the clan invite dialog has Copy and Share', await P.ev(() => !$('#ciShare').classList.contains('hidden') && !$('#ciCopy').classList.contains('hidden')));
await P.p.click('#ciShare'); await wait(300);
check('…Share sends the clan link', (await P.ev(() => window.__shared && window.__shared.url)) === (await P.ev(() => $('#ciLink').value)));
await closeDlg(P);
// ---------- 7. Navigation at every width ----------
const W = [360, 390, 768, 1024, 1280, 1440];
for (const w of W) {
  await A.p.setViewportSize({ width: w, height: w < 700 ? 780 : 860 }); await wait(350);
  await A.ev(() => showTab('timer')); await wait(200);
  const r = await A.ev(() => {
    const vis = el => el && el.offsetWidth > 0 && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
    const cut = [...document.querySelectorAll('#tabs [data-tab] .nv-l, #btmBar button > span, .top .brand span, #navCur')].filter(e => vis(e) && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent);
    const hdr = [...document.querySelectorAll('.top button, .top .brand, .top .sync')].filter(vis).map(e => e.getBoundingClientRect());
    const overlap = hdr.some((a, i) => hdr.some((b, j) => j > i && a.right > b.left + 1 && b.right > a.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1));
    return { mode: navMode(), side: vis($('#tabs')) && $('#tabs').getBoundingClientRect().left >= 0, burger: vis($('#navBurger')), bar: vis($('#btmBar')), barN: [...document.querySelectorAll('#btmBar > button')].filter(vis).length,
      cut, overlap, hscroll: document.documentElement.scrollWidth > innerWidth + 1, hdrFits: hdr.every(x => x.right <= innerWidth + 1 && x.left >= -1) };
  });
  const want = w <= 640 ? 'phone' : w < 1180 ? 'drawer' : 'side';
  check(`${w}px: ${want === 'side' ? 'sidebar' : want === 'drawer' ? '☰ menu' : 'bottom bar + More'}`, r.mode === want && (want === 'side' ? r.side && !r.burger && !r.bar : want === 'drawer' ? r.burger && !r.bar : r.bar && r.barN === 6 && !r.burger), JSON.stringify(r));
  check(`${w}px: no cut-off labels, no header overlaps, no sideways scroll`, !r.cut.length && !r.overlap && !r.hscroll && r.hdrFits, JSON.stringify({ cut: r.cut, overlap: r.overlap, hscroll: r.hscroll, fits: r.hdrFits }));
  if (want !== 'side') {
    await A.p.click(want === 'drawer' ? '#navBurger' : '#navMore'); await wait(420);
    const m = await A.ev(() => ({ open: document.body.classList.contains('nav-open'), items: [...document.querySelectorAll('#tabs [data-tab]:not(.hidden)')].filter(e => { const r = e.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth; }).length,
      cut: [...document.querySelectorAll('#tabs .nv-l')].filter(e => e.scrollWidth > e.clientWidth + 1).length, groups: [...document.querySelectorAll('#tabs .nv-h')].map(h => h.textContent).join(','), focus: document.activeElement.dataset.tab }));
    check(`${w}px: the menu slides in with every section (13: the Garden since 1.15, Study sessions since 1.19.1, Posts since 1.20, the Calendar since 2.0), grouped, full labels`, m.open && m.items === 13 && !m.cut && m.groups === 'Focus,Progress,Social', JSON.stringify(m));
    await A.p.keyboard.press('Escape'); await wait(350);
    check(`${w}px: Escape closes it and focus returns to the button`, await A.ev(t => !document.body.classList.contains('nav-open') && document.activeElement.id === t, want === 'drawer' ? 'navBurger' : 'navMore'));
  }
  if (w === 360 || w === 768 || w === 1280) await A.p.screenshot({ path: `s143/v1143a-nav-${w}.png` });
}
// active tab, More highlighting, shortcuts
await A.p.setViewportSize({ width: 390, height: 780 }); await wait(300);
await A.ev(() => showTab('stats')); await wait(200);
check('Phone: the active section is highlighted in the bottom bar', await A.ev(() => $('#btmBar [data-tab="stats"]').classList.contains('active') && $('#btmBar [data-tab="stats"]').getAttribute('aria-current') === 'page'));
await A.ev(() => showTab('friends')); await wait(200);
check('Phone: a section under More highlights More', await A.ev(() => $('#navMore').classList.contains('active') && $('#tabs [data-tab="friends"]').classList.contains('active')));
await A.p.setViewportSize({ width: 1280, height: 860 }); await wait(300);
await A.ev(() => { showTab('timer'); document.activeElement.blur(); });
await A.p.keyboard.press('Shift+Digit4'); await wait(250);
check('Shortcut Shift+4 → Stats (sidebar highlights it)', await A.ev(() => S.ui.tab === 'stats' && $('#tabs [data-tab="stats"]').classList.contains('active')));
await A.p.keyboard.press('Digit9'); await wait(250);
check('Shortcut 9 → Clan', await A.ev(() => S.ui.tab === 'clan'));
// badges on the right items, inside the menu, on More / ☰
await A.ev(() => { $('#friendsBadge').classList.remove('hidden'); $('#questDot').classList.add('hidden'); }); await wait(200);
await A.p.setViewportSize({ width: 390, height: 780 }); await wait(350);
check('Badge: Friends’ dot shows in the menu list and lights More (Friends is under More)', await A.ev(() => !$('#friendsBadge').classList.contains('hidden') && !$('#navMoreDot').classList.contains('hidden')));
const qd = await A.ev(() => { $('#friendsBadge').classList.add('hidden'); $('#profileDot').classList.add('hidden'); $('#clanDot').classList.add('hidden'); $('#questDot').classList.remove('hidden'); navMirror();
  return { bar: !$('#btmBar [data-dot="questDot"]').classList.contains('hidden'), more: !$('#navMoreDot').classList.contains('hidden') }; });
check('Badge: the Quests dot shows on the bottom bar’s Quests (More stays unlit)', qd.bar && !qd.more, JSON.stringify(qd));
await A.p.setViewportSize({ width: 900, height: 860 }); await wait(350);
check('Badge: on tablets the ☰ button shows a dot when something inside has one', await A.ev(() => { $('#questDot').classList.remove('hidden'); navMirror(); return !$('#navBurgerDot').classList.contains('hidden'); }));
await A.ev(() => $('#questDot').classList.add('hidden'));
// collapse remembered
await A.p.setViewportSize({ width: 1280, height: 860 }); await wait(300);
await A.p.click('#navCollapse'); await wait(350);
const mini = await A.ev(() => ({ on: document.documentElement.classList.contains('nav-mini'), w: Math.round($('#tabs').getBoundingClientRect().width), labels: [...document.querySelectorAll('#tabs .nv-l')].some(e => e.offsetWidth) }));
check('Collapse: the sidebar shrinks to icons (no half-cut labels)', mini.on && mini.w <= 76 && !mini.labels, JSON.stringify(mini));
await A.p.reload(); await A.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(1500); await closeDlg(A);
check('…remembered after a reload', await A.ev(() => document.documentElement.classList.contains('nav-mini')));
await A.p.click('#navCollapse'); await wait(300);
check('…and expands again', await A.ev(() => !document.documentElement.classList.contains('nav-mini') && localStorage.getItem('pomodorolist-nav-mini') === '0'));
// the tour points at the right places
for (const w of [390, 768, 1280]) {
  await A.p.setViewportSize({ width: w, height: w < 700 ? 780 : 860 }); await wait(300);
  await A.ev(() => { showTab('timer'); startTour(); }); await wait(1000);
  const steps = [];
  for (let i = 0; i < 12; i++) {
    const s = await A.ev(() => { const st = TOUR.steps[TOUR.i], t = tourTarget(st.tab), el = t.el, r = el.getBoundingClientRect(), sp = $('#tour .tour-spot').getBoundingClientRect();
      return { tab: st.tab, on: r.width > 0 && r.left >= -1 && r.right <= innerWidth + 1, spot: Math.abs(sp.left + 6 - r.left) < 3 && Math.abs(sp.top + 6 - r.top) < 3, menu: document.body.classList.contains('nav-open'), last: TOUR.i === TOUR.steps.length - 1 }; });
    steps.push(s);
    if (s.last) break;
    await A.p.click('#tourNext'); await wait(1000);
  }
  await A.p.click('#tourNext'); await wait(300);
  check(`${w}px tour: every step spotlights its section on screen`, steps.length >= 6 && steps.every(s => s.on && s.spot), JSON.stringify(steps));
  if (w === 390) check('…phone: sections in the bar without the menu, the rest with it open', steps.filter(s => ['timer', 'stats', 'reminders', 'clan', 'quests'].includes(s.tab)).every(s => !s.menu) && steps.filter(s => ['board', 'friends', 'shop'].includes(s.tab)).every(s => s.menu));
  if (w === 768) check('…tablet: the menu is open for the tour', steps.every(s => s.menu));
  if (w === 1280) check('…desktop: the sidebar, no menu', steps.every(s => !s.menu));
  check(`${w}px tour: the menu is closed afterwards`, await A.ev(() => !document.body.classList.contains('nav-open') && $('#tour').classList.contains('hidden')));
}
// ---------- 8. Collapsible profile card ----------
await A.p.setViewportSize({ width: 1280, height: 860 }); await wait(300);
await A.ev(() => { localStorage.removeItem('pomodorolist-card-open'); showTab('profile'); }); await wait(600);
const c1 = await A.ev(() => { const c = $('#tab-profile .pcard.pc-fold'); return c && { closed: c.classList.contains('pc-closed'), head: !!c.querySelector('.pc-banner') && !!c.querySelector('.pc-av') && !!c.querySelector('.pc-name') && !!c.querySelector('.pc-lv'), label: c.querySelector('[data-pc-toggle]').textContent.trim() }; });
check('Desktop: the card starts expanded, with the header (banner, picture, name, level) and “Hide stats”', c1 && !c1.closed && c1.head && c1.label.startsWith('Hide stats'), JSON.stringify(c1));
await A.p.click('#tab-profile [data-pc-toggle]'); await wait(450);
for (let i = 0; i < 12 && (await A.ev(() => Math.round($('#tab-profile .pcard .pc-body').getBoundingClientRect().height))) > 0; i++) await wait(250);   // the fold animation finishes
const c2 = await A.ev(() => { const c = $('#tab-profile .pcard'), body = c.querySelector('.pc-body'); return { closed: c.classList.contains('pc-closed'), inert: body.inert, h: Math.round(body.getBoundingClientRect().height), aria: c.querySelector('[data-pc-toggle]').getAttribute('aria-expanded'), label: c.querySelector('[data-pc-toggle]').textContent.trim(), saved: localStorage.getItem('pomodorolist-card-open') }; });
check('“Hide stats” folds the stats board away (inert, 0 height) and is remembered', c2.closed && c2.inert && c2.h === 0 && c2.aria === 'false' && c2.label.startsWith('Show stats') && c2.saved === '0', JSON.stringify(c2));
await A.p.screenshot({ path: 's143/v1143a-card-closed.png' });
await A.ev(() => renderProfile()); await wait(300);
check('…stays folded when the Profile is drawn again', await A.ev(() => $('#tab-profile .pcard').classList.contains('pc-closed')));
const share = await A.ev(() => { const d = cardData(), svg = cardImageSVG(d); return { tiles: /Total focus/.test(svg), link: !!cardLink(d) && cardLink(d).length > 40 }; });
check('Sharing (image + link) still has the full card while folded', share.tiles && share.link, JSON.stringify(share));
await A.ev(() => { localStorage.setItem('pomodorolist-motion', 'off'); applyMotion(); });
check('Animations off: the fold has no transition', await A.ev(() => getComputedStyle($('#tab-profile .pc-body')).transitionDuration.split(',').every(t => parseFloat(t) === 0)));
await A.ev(() => { localStorage.setItem('pomodorolist-motion', 'full'); applyMotion(); });
await A.p.click('#tab-profile [data-pc-toggle]'); await wait(450);
check('“Show stats” opens it again', await A.ev(() => !$('#tab-profile .pcard').classList.contains('pc-closed') && localStorage.getItem('pomodorolist-card-open') === '1'));
const PH = await device('PH', 390);
await signup(PH, 'cr_' + R);
await PH.ev(() => showTab('profile')); await wait(500);
check('Phone: the card starts folded (stats behind “Show stats”)', await PH.ev(() => $('#tab-profile .pcard').classList.contains('pc-closed')));
await PH.p.screenshot({ path: 's143/v1143a-card-phone.png' });
// ---------- 9. Welcome page ----------
const visit = async (w, back) => {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 700 ? 844 : 860 }, isMobile: w < 700, hasTouch: w < 700 });
  await ctx.addInitScript(back => { localStorage.setItem('pomodorolist-intro-seen', '1'); if (back) localStorage.setItem('pomodorolist-been-here', '1'); }, back);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('LP: ' + e.message));
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)'); await wait(900);
  return { ctx, p };
};
for (const w of [390, 1280]) {
  const { ctx, p } = await visit(w, false);
  const r = await p.evaluate(() => {
    const vis = el => el && el.offsetWidth > 0 && getComputedStyle(el).visibility !== 'hidden';
    const cta = [...document.querySelectorAll('.lp-cta .btn')].filter(vis).map(b => b.textContent.trim());
    const order = ['.lp-hero', '#lpFeatures', '.lp-cmp', '#lpFaq'].map(s => document.querySelector(s).getBoundingClientRect().top + scrollY);
    return { cta, primary: $('#previewBtn').classList.contains('primary'), form: vis($('#authUser')), peek: vis($('.lp-peek')), firstScreenInputs: [...document.querySelectorAll('#authView input:not([type=checkbox])')].filter(i => vis(i) && i.getBoundingClientRect().top < innerHeight).length, ordered: order.every((v, i) => !i || v > order[i - 1]) };
  });
  check(`${w}px first visit: hero first — Preview the app (primary), Create free account, Continue without an account; no username or password on screen`,
    r.cta.join('|') === 'Preview the app|Create free account|Continue without an account' && r.primary && !r.form && r.firstScreenInputs === 0, JSON.stringify(r));
  check(`${w}px: a peek at the app, then features, free-vs-paid and FAQ in that order`, r.peek && r.ordered);
  await p.click('[data-mode=signup] >> visible=true'); await wait(800);
  const o = await p.evaluate(() => ({ open: $('#authView').classList.contains('auth-open'), mode: authMode, focus: document.activeElement.id, form: $('#authUser').getBoundingClientRect().top < innerHeight }));
  check(`${w}px: “Create free account” opens the sign-up card ${w < 900 ? '(a sheet from the bottom)' : '(beside the hero)'} with the username focused`, o.open && o.mode === 'signup' && o.focus === 'authUser' && o.form, JSON.stringify(o));
  await p.screenshot({ path: `s143/v1143a-lp-${w}-card.png` });
  if (w < 900) { await p.keyboard.press('Escape'); await wait(400); check(`${w}px: Escape closes the sheet`, await p.evaluate(() => !$('#authView').classList.contains('auth-open'))); }
  await ctx.close();
}
for (const w of [390, 1280]) {
  const { ctx, p } = await visit(w, true);
  const r = await p.evaluate(() => ({ open: $('#authView').classList.contains('auth-open'), mode: authMode, top: $('#lpLoginTop').classList.contains('primary') && $('#lpLoginTop').getBoundingClientRect().top < 120,
    hero: !$('#lpLoginHero').classList.contains('hidden') && $('#lpLoginHero').classList.contains('primary'), hi: $('#lpHi').textContent }));
  check(`${w}px returning visitor: “Log in” is prominent at the top${w >= 900 ? ' and the log-in card is already open' : ''}`, r.top && r.hero && r.hi === 'Welcome back!' && (w >= 900 ? r.open && r.mode === 'login' : !r.open), JSON.stringify(r));
  await ctx.close();
}
// the intro still flows into the page
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push('INTRO: ' + e.message));
  await p.goto('http://localhost:8000/index.html'); await wait(500);
  const playing = await p.evaluate(() => !$('#intro').classList.contains('hidden'));
  await p.waitForFunction(() => $('#intro').classList.contains('hidden'), null, { timeout: 15000 });
  const after = await p.evaluate(() => ({ brand: $('#authView .auth-brand').getBoundingClientRect().top < 120, card: $('#authView').classList.contains('auth-open') }));
  check('Intro: plays on a first visit and ends on the new hero (title in the top bar, card still closed)', playing && after.brand && !after.card, JSON.stringify({ playing, ...after }));
  await ctx.close();
}
log('errors', JSON.stringify(errs));
log('failures', failCount());
await b.close();
process.exit(failCount() ? 1 : 0);
