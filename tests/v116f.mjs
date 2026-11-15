// v1.16 leaderboard v2: the published garden totals (produce, harvests) and the "big" field under the new rules,
// the Focus / Garden kinds and their periods, the podium, rows with rank arrows, your own rank pinned, "You passed",
// Pomeo's empty states, the client-side clamp (growth within the rules), demo boards (no writes), a 360 px phone.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, ownerGet } from './cl-common.mjs';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const R = 'lb' + Date.now().toString(36).slice(-4);
const A = await device('A', 1280), B = await device('B', 1280), C = await device('C', 1280);
await Promise.all([signup(A, 'a' + R), signup(B, 'b' + R), signup(C, 'c' + R)]);
const uid = { A: await A.ev(() => USER.uid), B: await B.ev(() => USER.uid), C: await C.ev(() => USER.uid) };
await A.ev(n => sendRequest(n), 'b' + R); await wait(1500); await B.ev(() => acceptRequest(incoming()[0].id)); await wait(1500);
const harvests = (n, y) => Array.from({ length: n }, (_, i) => ({ id: 'h' + y + '_' + i, v: 1, sp: 'tomato', plot: -1, seed: '', at: Date.now() - 9e6 - i, sk: 0, w: { x: 90 }, fin: 'x', fd: 90, h: Date.now() - 8e6 + i, y, m: '', kg: .2, u: Date.now() }));
await A.ev(h => { S.plants.push(...h); GD = null; G = null; S.settings.globalBoard = true; save(); publishPublic(); }, harvests(2, 30));
await B.ev(h => { S.plants.push(...h); GD = null; G = null; S.settings.globalBoard = true; save(); publishPublic(); }, harvests(5, 40));
await C.ev(() => { S.settings.globalBoard = true; save(); publishPublic(); });
await wait(3000);
// ---------- 1. what is published ----------
const docA = await ownerGet('publicStats/' + uid.A), docB = await ownerGet('publicStats/' + uid.B), profA = await ownerGet('publicProfiles/' + uid.A);
const rej = await A.ev(() => ({ garden: !!SOC.gardenStatsRejected, big: !!SOC.bigRejected, mine: SOC.myStats && SOC.myStats.produce }));
check('publicStats carries produce and harvests as whole numbers (A: 60 / 2, B: 200 / 5) and publicProfiles carries "big" (species:kg); the new rules accept both', docA.produce === 60 && docA.harvests === 2 && docB.produce === 200 && docB.harvests === 5 && /^tomato:0\.2$/.test(profA.big) && !rej.garden && !rej.big && rej.mine === 60, JSON.stringify({ docA: [docA.produce, docA.harvests], docB: [docB.produce, docB.harvests], big: profA.big, rej }));
// a stats write refused for another reason (here: a fake denial) must not drop the garden fields for good
const probe = await A.ev(async () => { const orig = FB.setDoc; let n = 0; FB.setDoc = (ref, data) => { if (ref.path && ref.path.startsWith('publicStats') && n++ < 2) { const e = new Error('denied'); e.code = 'permission-denied'; return Promise.reject(e); } return orig(ref, data); }; delete lastPub.publicStats; publishPublic(); await new Promise(r => setTimeout(r, 5000)); FB.setDoc = orig; return { rejected: !!SOC.gardenStatsRejected, probe: !!SOC.gardenProbe, statsWrites: n, retries: SOC.statRetries || 0 }; });
const docA2 = await ownerGet('publicStats/' + uid.A);
check('A stats write refused for another reason: the client probes once without the garden fields, that is refused too, so the fields are kept and the next write (with them) lands', !probe.rejected && !probe.probe && probe.statsWrites === 3 && docA2.produce === 60 && docA2.harvests === 2, JSON.stringify({ probe, doc: [docA2.produce, docA2.harvests] }));
// rules from before 1.16 (simulated: every stats write that carries produce is refused): the client gives up on the
// fields after the normal retries, the probe without them lands, and nothing loops
const oldRules = await B.ev(async () => { const orig = FB.setDoc; let n = 0, withFields = 0; FB.setDoc = (ref, data) => { if (ref.path && ref.path.startsWith('publicStats')) { n++; if ('produce' in data) { withFields++; const e = new Error('denied'); e.code = 'permission-denied'; return Promise.reject(e); } } return orig(ref, data); }; SOC.statRetries = 0; SOC.gardenStatsRejected = false; delete lastPub.publicStats; publishPublic(); await new Promise(r => setTimeout(r, 9000)); const after = n; await new Promise(r => setTimeout(r, 3000)); FB.setDoc = orig; return { writes: n, withFields, settled: n === after, rejected: !!SOC.gardenStatsRejected, probe: !!SOC.gardenProbe }; });
const docB2 = await ownerGet('publicStats/' + uid.B);
check('Rules that refuse the fields (simulated on B): at most a handful of writes, the probe without the fields lands, the fields are left out for the session, no write loop', oldRules.writes <= 8 && oldRules.settled && oldRules.rejected && !oldRules.probe && docB2 && docB2.produce === undefined && docB2.lifeMin !== undefined, JSON.stringify({ oldRules, doc: docB2 && [docB2.produce, docB2.lifeMin] }));
await B.ev(() => { SOC.gardenStatsRejected = false; delete lastPub.publicStats; publishPublic(); }); await wait(3000);   // back to normal for the rest of the suite
// ---------- 2. the boards ----------
const show = async (d, scope, period) => { await d.ev(([s, p]) => { S.ui.lbScope = s; S.ui.lbPeriod = p; SOC.lb = {}; showTab('board'); renderBoard(); }, [scope, period]); await until(d, () => !!$('#boardBody .lb-card') && !$('#boardBody .skel'), null, 12000); await wait(300); };
await show(A, 'friends', 'produce');
const fp = await A.ev(() => ({ kind: $$('#lbKind button').map(x => x.textContent + (x.classList.contains('active') ? '*' : '')).join(), periods: $$('#lbPeriod button').map(x => x.textContent + (x.classList.contains('active') ? '*' : '')).join(), rows: $$('#boardBody .lb li[data-uid]').map(li => li.querySelector('.rk').textContent + ':' + li.querySelector('.nm').textContent + ':' + li.querySelector('.v').textContent.trim()), podium: $$('.lb-podium').length, you: ($('.lb-you') || {}).textContent, produceIcon: !!$('#boardBody .lb .v svg.produce'), meta: $('.lb-meta').textContent }));
check('Friends · Garden · Produce: the kind seg (Focus time / Garden*) and the two garden periods (Produce* / Harvests); B leads with 200, A second with 60 (no podium under three people); my rank is pinned (#2 · You · 60)', /Garden\*/.test(fp.kind) && fp.periods === 'Produce*,Harvests' && fp.rows.length === 2 && /^1:@b/.test(fp.rows[0]) && /200$/.test(fp.rows[0]) && /^2:@a/.test(fp.rows[1]) && fp.podium === 0 && /#2/.test(fp.you) && /You · 60/.test(fp.you.replace(/\s+/g, ' ')) && fp.produceIcon && /All produce/.test(fp.meta), JSON.stringify(fp));
await show(A, 'friends', 'harvests');
const fh = await A.ev(() => ({ rows: $$('#boardBody .lb li[data-uid] .v').map(x => x.textContent.trim()), meta: $('.lb-meta').textContent }));
check('Friends · Harvests: 5 🌱 then 2 🌱, "all time" in the meta line', fh.rows.join() === '5 🌱,2 🌱' && /all time/.test(fh.meta), JSON.stringify(fh));
await show(A, 'friends', 'week');
const fw = await A.ev(() => ({ kind: $$('#lbKind button.active').map(x => x.textContent).join(), periods: $$('#lbPeriod button').length, meta: $('.lb-meta').textContent, period: S.ui.lbPeriod, remembered: S.ui.lbGardenPeriod }));
check('Back on Focus time: three periods (Daily · Weekly · Lifetime; no Monthly since v1.19.1), "Resets in", the last garden period is remembered for the Garden button', fw.kind === 'Focus time' && fw.periods === 3 && /Resets in/.test(fw.meta) && fw.period === 'week' && fw.remembered === 'harvests', JSON.stringify(fw));
await show(A, 'global', 'produce');
const gp = await A.ev(u => { const rows = $$('#boardBody .lb-pod, #boardBody .lb li[data-uid]').map(el => ({ uid: el.dataset.uid, rank: +(el.querySelector('.lb-pr, .rk') || {}).textContent })); const me = rows.find(r => r.uid === USER.uid), them = rows.find(r => r.uid === u); return { n: rows.length, me: me && me.rank, them: them && them.rank, podium: $$('.lb-podium').length, pods: $$('.lb-pod').length, order: $$('.lb-pod').map(p => p.classList.contains('p1') ? 1 : p.classList.contains('p2') ? 2 : 3).join(), you: ($('.lb-you') || {}).textContent.replace(/\s+/g, ' ') }; }, uid.B);
check('Global · Produce: both appear (B above A); with three or more people the podium shows 2-1-3 and my rank is pinned', gp.me > gp.them && (gp.n < 3 ? gp.podium === 0 : gp.podium === 1 && gp.pods === 3 && gp.order === '2,1,3') && /#\d+/.test(gp.you), JSON.stringify(gp));
// ---------- 3. rank arrows and "You passed" ----------
await A.ev(() => { window.__toasts = []; const _t = toast; toast = (m, ...a) => { window.__toasts.push(String(m)); return _t(m, ...a); }; });
await show(A, 'friends', 'produce');   // snapshot: B #1, A #2
await A.ev(h => { S.plants.push(...h); GD = null; G = null; save(); publishPublic(); }, harvests(4, 100).map(p => ({ ...p, id: p.id + 'b' })));
await wait(3000);
await show(A, 'friends', 'produce');
const arrows = await A.ev(() => ({ rows: $$('#boardBody .lb li[data-uid]').map(li => li.querySelector('.rk').textContent + ':' + li.querySelector('.nm').textContent + ':' + ((li.querySelector('.lb-delta') || {}).textContent || '-')), you: ($('.lb-you') || {}).textContent.replace(/\s+/g, ' '), toasts: window.__toasts.filter(m => /passed/.test(m)) }));
check('After A harvests 400 more produce: A #1 ▲1, B #2 ▼1, the pinned rank shows ▲1 and a "You passed @b…" toast', /^1:@a.*▲1$/.test(arrows.rows[0]) && /^2:@b.*▼1$/.test(arrows.rows[1]) && /#1/.test(arrows.you) && /▲1/.test(arrows.you) && arrows.toasts.length === 1 && /You passed @b/.test(arrows.toasts[0]) && /produce board/.test(arrows.toasts[0]), JSON.stringify(arrows));
await show(A, 'friends', 'produce');
const again = await A.ev(() => ({ toasts: window.__toasts.filter(m => /passed/.test(m)).length, arrows: $$('#boardBody .lb li[data-uid] .lb-delta').map(x => x.textContent).join() }));
check('Showing the same board again keeps the arrows and does not repeat the toast', again.toasts === 1 && again.arrows === '▲1,▼1', JSON.stringify(again));
// ---------- 4. Pomeo's empty states; nothing to show yet ----------
await show(C, 'friends', 'produce');
const empty = await C.ev(() => ({ empty: !!$('#boardBody .lb-empty'), pomeo: !!$('#boardBody .lb-empty svg.mascot'), txt: ($('#boardBody .lb-empty p') || {}).textContent, you: ($('.lb-you') || {}).textContent.replace(/\s+/g, ' '), cta: !!$('#boardAddFriend') }));
check('A person with no friends sees Pomeo and "No friends on the board yet" plus the Add-friend card; the pinned line says to harvest something', empty.empty && empty.pomeo && /No friends on the board yet/.test(empty.txt) && /Harvest something/.test(empty.you) && empty.cta, JSON.stringify(empty));
await show(C, 'friends', 'week');
const emptyF = await C.ev(() => ({ txt: ($('#boardBody .lb-empty p') || {}).textContent, you: ($('.lb-you') || {}).textContent.replace(/\s+/g, ' ') }));
check('…and on a focus board the line says to finish a block', /No friends on the board yet/.test(emptyF.txt) && /Finish a block/.test(emptyF.you), JSON.stringify(emptyF));
// ---------- 5. the clamp: a big jump is published within the rules, the rest catches up later ----------
const before = await ownerGet('publicStats/' + uid.B);
await B.ev(h => { S.plants.push(...h); GD = null; G = null; save(); publishPublic(); }, harvests(60, 100).map(p => ({ ...p, id: p.id + 'c' })));   // +6000 produce, +60 harvests at once
await wait(3500);
const afterB = await ownerGet('publicStats/' + uid.B);
const bState = await B.ev(() => ({ retries: SOC.statRetries || 0, rejected: !!SOC.gardenStatsRejected, local: garden().produceAll }));
check('B adds 6,000 produce and 60 harvests at once: each upload is clamped to what the rules allow per write (produce +≤ 480, harvests +≤ 10; at most two writes in 3.5 s), nothing is refused, the local total is untouched', afterB.produce > before.produce && afterB.produce - before.produce <= 2 * 482 && afterB.produce < 6200 && afterB.harvests > before.harvests && afterB.harvests - before.harvests <= 2 * 10 && bState.retries === 0 && !bState.rejected && bState.local === 6200, JSON.stringify({ before: [before.produce, before.harvests], after: [afterB.produce, afterB.harvests], bState }));
await A.ctx.close(); await B.ctx.close(); await C.ctx.close();
// ---------- 6. demo ----------
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 844 : 860 }, hasTouch: w < 500, isMobile: w < 500 });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  const p = await ctx.newPage(); const tag = opts.tag || 'guest';
  p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebChannel|firestore/i.test(m.text())) errs.push(tag + ' console: ' + m.text().slice(0, 160)); });
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
const D = await guest(1280, { tag: 'demo' });
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await D.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
const ls0 = await D.ev(() => Object.keys(localStorage).length);
await show(D, 'friends', 'produce');
const demo = await D.ev(() => ({ pv: isPreview(), pods: $$('.lb-pod').map(p => p.querySelector('.lb-pr').textContent + ':' + p.querySelector('.lb-pn').textContent.trim() + ':' + p.querySelector('.lb-pv').textContent.trim()), rows: $$('#boardBody .lb li[data-uid]').map(li => li.querySelector('.rk').textContent + ':' + li.querySelector('.nm').textContent + ':' + li.querySelector('.v').textContent.trim()), you: ($('.lb-you') || {}).textContent.replace(/\s+/g, ' '), justin: $('#boardBody').textContent.includes('Justin'), ls: Object.keys(localStorage).length }));
check('Demo · Friends · Produce: the podium is Princess_cupcake 1,230 / James 610 / demo_scholar 441 (1.17: the demo garden holds more produce), then lenvixty 395 and siverieg 140 in the rows; Justin (no garden totals) is not listed; nothing is written', demo.pv && demo.pods.length === 3 && /^2:@James:.*610/.test(demo.pods[0]) && /^1:@Princess_cupcake:.*1,230/.test(demo.pods[1]) && /^3:@demo_scholar.*441/.test(demo.pods[2]) && demo.rows.length === 2 && /^4:@lenvixty:.*395/.test(demo.rows[0]) && /^5:@siverieg:.*140/.test(demo.rows[1]) && /#3/.test(demo.you) && !demo.justin && demo.ls === ls0, JSON.stringify(demo));
await show(D, 'global', 'harvests');
const demoG = await D.ev(() => ({ pods: $$('.lb-pod .lb-pv').map(x => x.textContent.trim()), you: ($('.lb-you') || {}).textContent.replace(/\s+/g, ' ') }));
check('Demo · Global · Harvests: 164 🌱 / 88 🌱 / 57 🌱 on the podium; the demo is not on the global board, and the pinned line says so', demoG.pods.join() === '88 🌱,164 🌱,57 🌱' && /not on the global board/.test(demoG.you), JSON.stringify(demoG));
await D.ctx.close();
// ---------- 7. a 360 px phone ----------
const M = await guest(360, { tag: 'phone' });
await M.p.click('#previewBtn'); await M.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await M.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
await show(M, 'friends', 'produce');
const phone = await M.ev(() => { const pods = $$('.lb-pod'); const w = document.documentElement.scrollWidth, card = $('.lb-card').getBoundingClientRect(); return { w, pods: pods.length, inside: pods.every(p => { const r = p.getBoundingClientRect(); return r.left >= card.left - 1 && r.right <= card.right + 1 && r.width > 60; }), names: pods.every(p => { const n = p.querySelector('.lb-pn'), pr = p.getBoundingClientRect(), nr = n.getBoundingClientRect(); return getComputedStyle(n).textOverflow === 'ellipsis' && nr.right <= pr.right + 1 && nr.left >= pr.left - 1; }), segs: $$('.lb-head .seg').every(s => s.getBoundingClientRect().right <= 361), you: $('.lb-you').getBoundingClientRect().width <= 360 }; });
check('On a 360 px phone the three podium slots fit inside the card, names are clipped with an ellipsis rather than overflowing, the three segs wrap inside the screen, no horizontal scroll', phone.w <= 360 && phone.pods === 3 && phone.inside && phone.names && phone.segs && phone.you, JSON.stringify(phone));
await M.ctx.close();
log('errors', JSON.stringify(errs.slice(0, 6)));
log(failCount() ? `${failCount()} failed` : 'ALL PASSED');
await b.close(); process.exit(failCount() ? 1 : 0);
