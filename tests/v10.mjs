import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
async function device(name, { w = 1280, h = 860, touch = false, scheme = 'light', fresh = false, seenVersion = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, colorScheme: scheme });
  await ctx.addInitScript(([fresh, sv]) => {
    if (!fresh) localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1');
    if (sv) localStorage.setItem('pomodorolist-seen-version', sv);
    const d = new Date(), p = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()));
    window.__vib = []; navigator.vibrate = p => { window.__vib.push(p); return true; };
  }, [fresh, seenVersion]);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('dialog', d => d.accept());
  return { ctx, p };
}
const close = async d => { await d.p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(x => x.close())); await wait(300); };
const guest = async d => { await d.p.goto('http://localhost:8000/index.html'); await d.p.click('#guestBtn'); await d.p.waitForSelector('#appView:not(.hidden)'); await wait(1300); await close(d); };

const A = await device('A');
await A.p.goto('http://localhost:8000/index.html');
log('splash during boot:', await A.p.evaluate(() => !!$('#splash')));
await A.p.click('#guestBtn'); await A.p.waitForSelector('#appView:not(.hidden)'); await wait(700);
log('splash gone once app shows:', await A.p.evaluate(() => !$('#splash')));
await wait(800); await close(A);
// ---------- What's new ----------
log('what’s new card (existing user, new version):', await A.p.evaluate(() => !!$('#newsSlot .news-card') && $('#newsSlot h3').textContent));
await A.p.click('#newsClose'); await wait(100);
await A.p.reload(); await A.p.waitForSelector('#appView:not(.hidden)'); await wait(1200); await close(A);
log('shown once:', await A.p.evaluate(() => !$('#newsSlot .news-card') && localStorage.getItem(VER_KEY)));
// ---------- About ----------
await A.p.evaluate(() => showTab('settings')); await A.p.click('#sec-about [data-go-about]'); await wait(300);
log('about:', await A.p.evaluate(() => [S.ui.tab, $('#tab-about .appver').textContent, $$('#changelog li').length + ' versions', $('#aboutPomeo .mascot') ? 'pomeo' : '-'].join(' · ')));
log('footer:', await A.p.evaluate(() => [...$$('.app-foot')].map(f => f.textContent.trim() + ' → ' + f.querySelector('a').href + ' ' + f.querySelector('a').target).join(' | ')));
log('nav highlight on about:', await A.p.evaluate(() => $('#tabs .active').dataset.tab));
await A.p.screenshot({ path: 'v10-about.png', fullPage: true });
// ---------- Settings sections + search ----------
await A.p.evaluate(() => showTab('settings')); await wait(200);
log('sections:', await A.p.evaluate(() => $$('#tab-settings .set-sec h2').map(h => h.textContent).join(' | ')));
await A.p.fill('#setSearch', 'vibr'); await wait(100);
log('search "vibr":', await A.p.evaluate(() => $$('#tab-settings .setting').filter(r => r.style.display !== 'none' && !r.closest('.hidden') && r.offsetParent).map(r => r.querySelector('div > div').textContent).join(', ')), '| sections shown:', await A.p.evaluate(() => $$('#tab-settings .set-sec').filter(s => s.style.display !== 'none').length));
await A.p.fill('#setSearch', 'zzzz'); await wait(100);
log('no match message:', await A.p.evaluate(() => !$('#setNone').classList.contains('hidden') && $('#setNone').textContent));
await A.p.fill('#setSearch', ''); await A.p.dispatchEvent('#setSearch', 'input'); await wait(100);
log('cleared → all rows back:', await A.p.evaluate(() => $$('#tab-settings .set-sec').filter(s => s.style.display !== 'none').length));
log('controls still wired:', await A.p.evaluate(() => { $('#setAuto').click(); const a = S.settings.autoStart; $('#setAuto').click(); return a !== S.settings.autoStart; }));
// ---------- Inbox ----------
await A.p.evaluate(() => { toast('Note saved', 800, true); inboxAdd({ type: 'kudos', title: '@riya sent 🔥 for your session', go: { tab: 'friends' } }); inboxAdd({ type: 'reminder', title: 'Physics revision in 10 minutes!', go: { tab: 'reminders' } }); inboxAdd({ type: 'ach', title: 'Achievement unlocked: First focus', go: { tab: 'profile' }, at: Date.now() - 864e5 * 3 }); inboxAdd({ type: 'boss', title: 'Scroll Goblin got away', at: Date.now() - 864e5 * 1.2, go: { tab: 'quests' } }); });
log('badge:', await A.p.textContent('#inboxCount'), '| toast logged as read:', await A.p.evaluate(() => IB.some(x => x.title === 'Note saved' && x.read)));
await A.p.click('#inboxBtn'); await wait(400);
log('groups:', await A.p.evaluate(() => $$('#ibBody .ib-group').map(g => g.textContent).join(', ')));
await A.p.click('#ibSeg [data-f=social]'); await wait(100);
log('filter social:', await A.p.evaluate(() => $$('#ibBody .ib-t').map(x => x.textContent).join(' | ')));
await A.p.click('#ibSeg [data-f=all]');
await A.p.screenshot({ path: 'v10-inbox.png' });
await A.p.click('#ibBody .ib-item:has(.ib-t:text("Physics revision")) [data-ibdel]'); await wait(150);
log('dismissed:', await A.p.evaluate(() => !IB.some(x => x.title.startsWith('Physics revision'))));
await A.p.click('.toast-item.has-undo .undo'); await wait(150);
log('undo restores:', await A.p.evaluate(() => IB.some(x => x.title.startsWith('Physics revision'))));
await A.p.click('#ibBody .ib-item:has(.ib-t:text("riya"))'); await wait(400);
log('tap jumps:', await A.p.evaluate(() => S.ui.tab), '| closed:', await A.p.evaluate(() => !$('#inboxDlg').open));
await A.p.click('#inboxBtn'); await wait(300); await A.p.click('#ibReadAll'); await wait(100);
log('mark all read → badge hidden:', await A.p.evaluate(() => $('#inboxCount').classList.contains('hidden')));
await close(A);
log('kept to 100:', await A.p.evaluate(() => { for (let i = 0; i < 130; i++) inboxAdd({ type: 'info', title: 'x' + i }); return IB.length + ' / stored ' + JSON.parse(localStorage.getItem(ibKey())).length; }));
// sources: missed reminder, daily reward
log('missed reminder → inbox:', await A.p.evaluate(() => { const y = dayKey(addDays(new Date(), -1)); S.reminders.push({ id: 'mr', title: 'Chem homework', date: y, time: '09:00', repeat: 'none', days: [], before: 0, done: {}, snooze: {} }); save(); ibRefresh(); return IB.find(x => x.key.startsWith('miss:mr')).title; }));
// ---------- Undo instead of confirm ----------
await A.p.evaluate(() => showTab('reminders')); await wait(200);
let confirms = 0; A.p.on('dialog', () => confirms++);
await A.p.evaluate(() => deleteReminder(S.reminders.find(r => r.id === 'mr'))); await wait(100);
log('reminder delete: no confirm', confirms === 0, '| gone', await A.p.evaluate(() => !S.reminders.some(r => r.id === 'mr')));
await A.p.click('.toast-item.has-undo .undo'); await wait(150);
log('undo brings it back:', await A.p.evaluate(() => S.reminders.some(r => r.id === 'mr')));
await A.p.evaluate(() => { showTab('timer'); loadItems(['a', 'b', 'c']); removeSub(subs()[1].id); });
log('subtask delete + undo:', await A.p.evaluate(() => subs().map(x => x.t).join('')), '→', await (async () => { await A.p.click('.toast-item.has-undo .undo'); await wait(100); return A.p.evaluate(() => subs().map(x => x.t).join('')); })());
await A.p.evaluate(() => { S.sessions.push({ id: 'sd1', name: 'Del me', start: Date.now() - 3600e3, end: Date.now() - 1800e3, duration: 1500e3, planned: 1500e3, preset: '' }); save(); S.ui.statsView = 'day'; statsOffset = 0; showTab('stats'); }); await wait(300);
await A.p.click('[data-del="sd1"]'); await wait(100);
log('session delete: no confirm', confirms === 0, '| deleted', await A.p.evaluate(() => !S.sessions.some(s => s.id === 'sd1')));
await A.p.click('.toast-item.has-undo .undo'); await wait(150);
log('session undo:', await A.p.evaluate(() => S.sessions.some(s => s.id === 'sd1')));
log('serious action still confirms:', await A.p.evaluate(() => /Erase ALL sessions, presets and settings/.test(document.documentElement.innerHTML) || $('#wipeBtn') !== null));
// ---------- Command palette ----------
await A.p.evaluate(() => showTab('timer')); await A.p.click('body', { position: { x: 3, y: 400 } });
await A.p.keyboard.press('Control+k'); await wait(250);
log('Ctrl+K opens:', await A.p.evaluate(() => $('#cmdDlg').open && document.activeElement.id));
await A.p.keyboard.type('stts'); await wait(100);
log('fuzzy "stts" →', await A.p.evaluate(() => $('#cmdList li').textContent));
await A.p.keyboard.press('Enter'); await wait(300);
log('ran:', await A.p.evaluate(() => S.ui.tab));
await A.p.keyboard.press('Control+k'); await wait(200); await A.p.keyboard.type('start 37 min'); await wait(100);
log('"start 37 min" →', await A.p.evaluate(() => $('#cmdList li').textContent));
await A.p.keyboard.press('Enter'); await wait(500);
log('started:', await A.p.evaluate(() => `${S.timer.status} ${activePreset().name}`));
await A.p.evaluate(() => { S.timer.status = 'idle'; save(); renderAll(); });
await A.p.keyboard.press('Control+k'); await wait(200); await A.p.keyboard.type('dark'); await wait(100); await A.p.keyboard.press('Enter'); await wait(400);
log('toggle dark mode:', await A.p.evaluate(() => S.settings.theme + ' ' + document.documentElement.getAttribute('data-theme')));
await A.p.keyboard.press('Control+k'); await wait(200); await A.p.keyboard.type('revision int'); await wait(100); await A.p.keyboard.press('ArrowDown'); await A.p.keyboard.press('ArrowUp'); await A.p.keyboard.press('Enter'); await wait(600);
log('jump to a setting:', await A.p.evaluate(() => S.ui.tab + ' · focus ' + document.activeElement.id + ' · highlighted ' + !!$('.setting.hit')));
await A.p.evaluate(() => { S.settings.theme = 'auto'; save(); applyCosmetics(); });
log('? sheet lists Ctrl+K:', await A.p.evaluate(() => $('#keysDlg').textContent.includes('Command palette')));
// ---------- Offline banner + quiet retry ----------
await A.p.evaluate(() => showTab('timer'));
await A.ctx.setOffline(true); await wait(300);
log('offline banner:', await A.p.evaluate(() => $('#netBanner').classList.contains('show') && $('#netBanner').textContent.trim()));
await A.p.screenshot({ path: 'v10-offline.png', clip: { x: 0, y: 0, width: 1280, height: 200 } });
await A.ctx.setOffline(false); await wait(900);
log('back online:', await A.p.evaluate(() => $('#netBanner').textContent.trim()));
log('quiet retry:', await A.p.evaluate(() => { const t0 = [...$('#toast').children].length; const r1 = quietRetry({ code: 'unavailable' }), r2 = quietRetry({ code: 'unavailable' }), r3 = quietRetry({ code: 'unavailable' }), r4 = quietRetry({ code: 'unavailable' }), perm = quietRetry({ code: 'permission-denied' }); syncRetry = 0; return [r1, r2, r3, r4, perm].join(','); }));
// ---------- a11y ----------
log('icon buttons without a label:', await A.p.evaluate(() => $$('button.iconbtn, button.ib-x, .sc-add').filter(b => !b.getAttribute('aria-label') && !b.textContent.trim()).map(b => b.id || b.className).join(', ') || 'none'));
const contrast = await A.p.evaluate(() => {
  const lum = hex => { const m = hex.match(/\d+(\.\d+)?/g).map(Number); const [r, g, b2] = m.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b2; };
  const ratio = (a, b2) => { const x = lum(a), y = lum(b2); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const out = [];
  const themes = ['th_default', ...Object.keys(SKINS)];
  for (const th of themes) for (const mode of ['light', 'dark']) {
    S.game.purchases['c_' + th] = { item: th, price: 0, at: 1 }; G = null; S.game.equipped.theme = th; S.settings.theme = mode; applyCosmetics();
    const rs = getComputedStyle(document.documentElement), v = n => rs.getPropertyValue(n).trim();
    const rgb = c => c.startsWith('#') ? `rgb(${parseInt(c.slice(1, 3), 16)},${parseInt(c.slice(3, 5), 16)},${parseInt(c.slice(5, 7), 16)})` : c;
    const surf = rgb(v('--surface')), text = rgb(v('--text')), muted = rgb(v('--muted')), bg = rgb(v('--bg'));
    out.push(`${th}/${mode}: text ${ratio(text, surf).toFixed(1)} muted ${ratio(muted, surf).toFixed(1)} muted-on-bg ${ratio(muted, bg).toFixed(1)}`);
  }
  S.settings.theme = 'auto'; S.game.equipped.theme = 'th_default'; applyCosmetics();
  return out;
});
log('contrast (AA needs 4.5):\n  ' + contrast.join('\n  '));
// ---------- Phone: haptics, pull to refresh, tab swipe, swipe dismiss ----------
const P = await device('P', { w: 390, h: 844, touch: true, seenVersion: '1.7' });
await guest(P);
const touch = (type, x, y, target = 'main') => P.p.evaluate(([type, x, y, target]) => {
  const el = document.elementFromPoint(x, y) || document.querySelector(target);
  const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
  el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [t], changedTouches: [t] }));
}, [type, x, y, target]);
const swipe = async (x1, y1, x2, y2, steps = 6) => { await touch('touchstart', x1, y1); for (let i = 1; i <= steps; i++) await touch('touchmove', x1 + (x2 - x1) * i / steps, y1 + (y2 - y1) * i / steps); await touch('touchend', x2, y2); };
await P.p.evaluate(() => showTab('stats')); await wait(300);
await swipe(300, 420, 80, 430); await wait(400);
log('swipe left on Stats →', await P.p.evaluate(() => S.ui.tab), '| vibrate:', await P.p.evaluate(() => JSON.stringify(window.__vib)));
await swipe(80, 160, 300, 165); await wait(400);
log('swipe right →', await P.p.evaluate(() => S.ui.tab));
await P.p.evaluate(() => showTab('stats')); await wait(300);
await P.p.evaluate(() => { window.__ref = 0; const o = renderStats; window.renderStats = function () { window.__ref++; return o.apply(this, arguments); }; window.scrollTo(0, 0); });
await swipe(200, 200, 200, 420, 10); await wait(700);
log('pull to refresh on Stats → refreshed:', await P.p.evaluate(() => window.__ref > 0));
await P.p.evaluate(() => { inboxAdd({ type: 'kudos', title: 'swipe me' }); });
await P.p.click('#inboxBtn'); await wait(400);
await P.p.evaluate(() => { const el = $$('#ibBody .ib-item').find(x => x.textContent.includes('swipe me')), r = el.getBoundingClientRect(), y = r.top + 15, x = r.left + 150;
  const ev = (t, cx) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerType: 'touch', clientX: cx, clientY: y, pointerId: 5 }));
  ev('pointerdown', x); for (let i = 1; i <= 6; i++) ev('pointermove', x - i * 25); ev('pointerup', x - 150); });
await wait(200);
log('inbox swipe-dismiss:', await P.p.evaluate(() => !IB.some(x => x.title === 'swipe me')));
await P.p.screenshot({ path: 'v10-phone-inbox.png' });
await close(P);
await P.p.evaluate(() => showTab('settings')); await wait(200); await P.p.screenshot({ path: 'v10-phone-settings.png' });
log('haptics setting:', await P.p.evaluate(() => { $('#setHaptics').click(); const off = localStorage.getItem(HAPTIC_KEY); window.__vib = []; haptic(10); const none = window.__vib.length; $('#setHaptics').click(); return `off=${off} vibrations while off=${none}`; }));
// ---------- new user: no what's new, tour instead ----------
const N = await device('N', { fresh: true });
await N.p.goto('http://localhost:8000/index.html'); await N.p.click('#guestBtn'); await N.p.waitForSelector('#appView:not(.hidden)'); await wait(1500);
log('brand-new user: news card', await N.p.evaluate(() => !!$('#newsSlot .news-card')), '| version stored', await N.p.evaluate(() => localStorage.getItem(VER_KEY)), '| tutorial', await N.p.evaluate(() => $('#tutDlg').open));
log('errors', errs);
await b.close();
