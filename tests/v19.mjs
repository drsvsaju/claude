// v1.9: welcome page, sign-up card, and the read-only preview (no Firestore traffic, no storage writes).
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const U = 'http://localhost:8000/index.html?emulator=1';
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
const SHOTS = process.argv.includes('shots');
async function device(name, { w = 1280, h = 860, scheme = 'light', init = null } = {}) {
  const touch = w < 900;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: w < 700, colorScheme: scheme });
  if (init) await ctx.addInitScript(init);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(name + ' console: ' + m.text().slice(0, 160)); });
  return { ctx, p };
}
const ev = (d, f, a) => d.p.evaluate(f, a);

// ---------- 1. welcome page layout at every width ----------
for (const [w, h, scheme] of [[360, 740, 'light'], [390, 844, 'dark'], [768, 1024, 'light'], [1280, 860, 'dark']]) {
  const D = await device('lp' + w, { w, h, scheme });
  await D.p.goto(U); await D.p.waitForSelector('#authView:not(.hidden)'); await wait(1200);
  const r = await ev(D, () => {
    const vw = innerWidth, out = [];
    if (document.documentElement.scrollWidth > vw + 1) out.push('page scrolls sideways');
    for (const el of $('#authView').querySelectorAll('*')) { if (!el.getClientRects().length) continue; const q = el.getBoundingClientRect(); if (q.right > vw + 1 || q.left < -1) out.push(el.tagName + '.' + el.className + ' off-screen'); }
    const hero = $('.lp-hero').getBoundingClientRect(), card = $('#authCard').getBoundingClientRect();
    return { out: [...new Set(out)].slice(0, 5), layout: card.top > hero.bottom - 5 ? 'stacked (pitch, then card)' : 'two columns', mode: authMode, tab: $('#authSeg .active').textContent,
      h1: $('.lp-h1').textContent, badges: $$('.lp-badges li').map(x => x.textContent).join(' · '), feats: $$('.lp-feat h3').map(x => x.textContent).length, faq: $$('.lp-faq details').length, cmp: $$('#lpCmpRows .lp-cmp-row').length, foot: $('.lp-foot').textContent.replace(/\s+/g, ' ').trim(),
      pomeo: !!$('#lpPomeo svg'), wave: getComputedStyle($('.lp-wave')).animationName };
  });
  const small = w < 900 ? await ev(D, () => $$('#authView button, #authView a[href], #authView input, #authView summary, #authView select').filter(el => el.getClientRects().length).map(el => { const r = el.getBoundingClientRect(), pa = getComputedStyle(el, '::after'); let w = r.width, h = r.height; if (pa.content !== 'none' && pa.position === 'absolute') { w = Math.max(w, parseFloat(pa.width) || 0); h = Math.max(h, parseFloat(pa.height) || 0); } const lab = el.closest('label'); if (lab && el.type === 'checkbox') { const lr = lab.getBoundingClientRect(); w = lr.width; h = lr.height; } return h < 43.5 || w < 43.5 ? `${el.tagName}${el.id ? '#' + el.id : ''}(${el.textContent.trim().slice(0, 12)}) ${Math.round(w)}×${Math.round(h)}` : null; }).filter(Boolean)) : [];
  if (small.length) log('  small tap targets:', small.join(', '));
  log(`${w}px ${scheme}: ${r.layout} | default tab ${r.tab} | ${r.out.length ? 'PROBLEMS ' + r.out.join(', ') : 'fits'}`);
  if (w === 1280) log('  content:', r.h1, '|', r.badges, '| features', r.feats, '| comparison rows', r.cmp, '| FAQ', r.faq, '| Pomeo', r.pomeo, 'wave', r.wave, '\n  footer:', r.foot);
  if (SHOTS) { await D.p.screenshot({ path: `v19-lp-${w}.png` }); await D.p.evaluate(() => window.scrollTo(0, innerHeight)); await wait(400); await D.p.screenshot({ path: `v19-lp-${w}-more.png` }); }
  await D.ctx.close();
}

// ---------- 2. sign-up card: live checks, strength, match, loading, errors ----------
let D = await device('card', { w: 390, h: 844 });
await D.p.goto(U); await D.p.waitForSelector('#authView:not(.hidden)'); await wait(800);
const hint = sel => ev(D, s => `${$(s).textContent}${$(s).classList.contains('bad') ? ' [bad]' : $(s).classList.contains('ok') ? ' [ok]' : ''}`, sel);
await D.p.click('[data-mode=signup] >> visible=true');
for (const v of ['ab', 'ab cd', 'Riya_K', 'abcdefghijklmnopqrst']) { await D.p.fill('#authUser', v); log(`username "${v}":`, await hint('#userHint')); }
for (const v of ['abc', 'abcdefg', 'Tomato-Garden-42!']) { await D.p.fill('#authPass', v); log(`password "${v}": meter ${await ev(D, () => $('#pwMeter').dataset.s)} ·`, await hint('#pwHint')); }
await D.p.fill('#authPass2', 'Tomato'); log('confirm partial:', await hint('#pw2Hint'));
await D.p.fill('#authPass2', 'Tomato-Garden-4!'); log('confirm wrong:', await hint('#pw2Hint'));
await D.p.fill('#authPass2', 'Tomato-Garden-42!'); log('confirm same:', await hint('#pw2Hint'));
log('warning + stay:', await ev(D, () => `${$('#pwWarn').textContent.trim()} | stay checked=${$('#authStay').checked}`));
await D.p.fill('#authPass2', 'nope'); await D.p.click('#authSubmit'); await wait(300);
log('mismatch error:', await ev(D, () => $('#authError').textContent), '| shake', await ev(D, () => $('#authForm').classList.contains('shake')));
await D.p.click('[data-mode=login] >> visible=true'); await wait(200);
log('login tab:', await ev(D, () => `${$('#authSubmit').textContent} | confirm hidden=${$('#confirmWrap').classList.contains('hidden')} | meter hidden=${$('#pwMeter').classList.contains('hidden')}`));
await D.p.fill('#authUser', 'nobody_here_' + Date.now().toString(36).slice(-4)); await D.p.fill('#authPass', 'wrongpass');
await D.p.click('#authSubmit');
log('loading state:', await ev(D, () => `${$('#authSubmit').disabled} "${$('#authSubmit').textContent}" spinner=${!!$('#authSubmit .spin')}`));
await D.p.waitForFunction(() => !$('#authSubmit').disabled, null, { timeout: 15000 }); await wait(200);
log('wrong login error:', await ev(D, () => $('#authError').textContent));
await D.ctx.close();

// ---------- 3. sign-up → tutorial; stay logged in off → session persistence ----------
const sfx = Date.now().toString(36).slice(-5);
D = await device('signup', { w: 1280, h: 860 });
await D.p.goto(U); await D.p.waitForSelector('#authView:not(.hidden)');
await D.p.click('[data-mode=signup] >> visible=true'); await D.p.fill('#authUser', 'lp_' + sfx); await D.p.fill('#authPass', 'secret12'); await D.p.fill('#authPass2', 'secret12');
await D.p.click('#authStay'); await D.p.click('#authSubmit');
log('after sign-up → tutorial:', await D.p.waitForSelector('#tutDlg[open]', { timeout: 30000 }).then(() => true, () => false));
log('stay logged in off → kept for this tab only:', await ev(D, () => Object.keys(sessionStorage).some(k => k.startsWith('firebase:authUser')) && !Object.keys(localStorage).some(k => k.startsWith('firebase:authUser'))));
await D.ctx.close();

// ---------- 4. the preview: demo account, no Firestore traffic, no storage writes ----------
D = await device('preview', { w: 1280, h: 860, init: () => { localStorage.setItem('focus-app-v1', JSON.stringify({ sessions: [{ id: 'mine', name: 'My own', start: 1, end: 2, duration: 1, planned: 1, preset: '' }] })); localStorage.setItem('pomodorolist-glass', 'full'); } });
await D.p.goto(U); await D.p.waitForSelector('#authView:not(.hidden)'); await wait(800);
const before = await ev(D, () => JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))));
const fsReq = []; D.p.on('request', r => { if (/:8080|firestore\.googleapis/.test(r.url())) fsReq.push(r.method() + ' ' + r.url().slice(0, 80)); });
await D.p.click('#previewBtn');
await D.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && SOC.started, null, { timeout: 15000 }); await wait(2500);
await ev(D, () => document.querySelectorAll('dialog[open]:not(#pvDlg)').forEach(x => x.close()));
const g = await ev(D, () => { const gm = game(), bs = bossBattle(bossView()); return { user: USER.username, banner: $('#pvBanner').textContent.replace(/\s+/g, ' ').trim(), streak: gm.streak.cur, level: gm.lv.level, tier: gm.tier.name, aura: !!$('#lvChip .aura, #lvChip [class*=aura]'), sessions: S.sessions.length, boss: `${bs.boss.name} ${bs.dmg}/${bs.hp} HP (${Math.round(bs.dmg / bs.hp * 100)}%) ${bs.mode} ×${bs.members.length}`, owned: Object.keys(S.game.purchases).length, coins: gm.balance, friends: friendsList().length, requests: incoming().length }; });
log('preview:', JSON.stringify(g));
if (SHOTS) await D.p.screenshot({ path: 'v19-pv-timer.png' });
for (const t of ['stats', 'quests', 'shop', 'board', 'friends', 'profile', 'settings', 'reminders']) {
  await ev(D, t => showTab(t), t); await wait(t === 'board' || t === 'friends' ? 1500 : 700);
  const info = await ev(D, t => t === 'board' ? $$('#boardBody .lb li').map(li => li.textContent.replace(/\s+/g, ' ').trim()).join(' | ')
    : t === 'friends' ? $$('#tab-friends .who .nm').map(x => x.textContent.trim()).join(', ') + ' · ' + ($('#tab-friends').textContent.match(/Organic chemistry[^·]*/) || [''])[0].trim()
    : t === 'stats' ? `garden plants=${$$('#gardenSlot .plant').length} tiles=${$$('#tiles .tile').length} insights=${$$('#energySlot .ins').length} wrapped=${!!$('#wrappedSlot .btn')}`
    : t === 'quests' ? $('#tab-quests').textContent.replace(/\s+/g, ' ').trim().slice(0, 120)
    : t === 'shop' ? `items=${$$('#shopView .item').length} owned=${$$('#shopView .item.owned, #shopView [data-equip], #shopView .btn[disabled]').length}`
    : t === 'settings' ? `disabled controls=${$$('#tab-settings input:disabled, #tab-settings select:disabled').length} note=${!!$('#pvSetNote')}`
    : t === 'reminders' ? `${$$('#tab-reminders .rem').length} reminders` : $('#profileHead').textContent.replace(/\s+/g, ' ').trim().slice(0, 90), t);
  log(`  ${t}:`, info);
  if (SHOTS) await D.p.screenshot({ path: `v19-pv-${t}.png` });
}
// blocked actions → friendly prompt, nothing changes
await ev(D, () => showTab('timer')); await wait(300);
await D.p.click('#mainBtn'); await wait(300);
log('Start in preview →', await ev(D, () => `${$('#pvDlg').open ? 'prompt: ' + $('#pvWhy').textContent : 'NO PROMPT'} | timer ${S.timer.status}`));
if (SHOTS) await D.p.screenshot({ path: 'v19-pv-prompt.png' });
await D.p.click('[data-pv-stay]'); await wait(200);
await ev(D, () => showTab('shop')); await wait(400);
const buy = await D.p.$('[data-buy]'); if (buy) { await buy.click(); await wait(200); }
log('Buy in preview →', await ev(D, () => $('#pvDlg').open ? $('#pvWhy').textContent : 'NO PROMPT'));
await ev(D, () => $('#pvDlg').close());
await D.p.keyboard.press('Space'); await wait(200);
log('Space key →', await ev(D, () => ($('#pvDlg').open ? 'prompt' : 'no prompt') + ' / timer ' + S.timer.status)); await ev(D, () => $('#pvDlg').close());
// try the obvious write paths directly: they go nowhere
await ev(D, async () => { save(); pushProfile(true); publishPublic(true); await FB.setDoc(FB.doc(FB.db, 'users', 'demo'), { x: 1 }); writeLS('pomodorolist-test', 'x'); localStorage.setItem('focus-app-v1', 'overwritten'); });
await wait(1500);
const after = await ev(D, () => JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))));
log('Firestore requests during preview:', fsReq.length, fsReq.slice(0, 3), '| localStorage unchanged:', before === after);
await D.p.click('.pv-exit'); await D.p.waitForSelector('#authView:not(.hidden)', { timeout: 10000 }); await wait(500);
log('exit → welcome page:', await ev(D, () => !$('#authView').classList.contains('hidden') && !USER), '| my own data intact:', await ev(D, () => JSON.parse(localStorage.getItem('focus-app-v1')).sessions[0].id === 'mine'));
await D.p.click('#previewBtn'); await D.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 15000 }); await wait(800);
await D.p.click('.pv-go'); await D.p.waitForSelector('#authView:not(.hidden)', { timeout: 10000 }); await wait(900);
log('banner "Create account" → sign-up tab:', await ev(D, () => authMode + ' focus=' + (document.activeElement && document.activeElement.id)));
await D.ctx.close();

// ---------- 5. preview on a phone ----------
D = await device('pvphone', { w: 360, h: 740 });
await D.p.goto(U); await D.p.waitForSelector('#authView:not(.hidden)'); await wait(600);
await D.p.click('#previewBtn'); await D.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 15000 }); await wait(1800);
log('phone preview: banner height', await ev(D, () => $('#pvBanner').offsetHeight), '| header below banner', await ev(D, () => Math.round($('header.top').getBoundingClientRect().top) >= $('#pvBanner').offsetHeight - 1), '| sideways scroll', await ev(D, () => document.documentElement.scrollWidth > innerWidth));
if (SHOTS) await D.p.screenshot({ path: 'v19-pv-phone.png' });
await D.ctx.close();
log('errors', errs);
await b.close();
