// v1.15 Flashcards: the Flashcards view in Reminders, decks (new / rename / delete + undo), cards (add, bulk "front | back",
// edit, delete), review with flip + Again/Hard/Good/Easy spaced repetition (intervals, due dates, keyboard), due counts,
// Pomeo's break offer (never during focus, setting to turn off, toast fallback), export/import, demo (sample decks,
// nothing written), two devices (both ways + tombstones), phone layout.
import { b, device, signup, wait, log, check, errs, failCount, until, closeDlg, ownerGet } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-4);
const closeAll = d => d.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
async function guest(w = 1280, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 860 }, hasTouch: w < 500, isMobile: w < 500 });
  await ctx.addInitScript(() => { localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-intro-seen', '1'); localStorage.setItem('pomodorolist-login-later', String(Date.now())); localStorage.setItem('pomodorolist-onboarded:guest', '1');
    // the late-night nudge (23:00–04:00) would take Pomeo's bubble: mark tonight as already nudged, so the suite runs at any hour
    const n = new Date(); if (n.getHours() < 4) n.setDate(n.getDate() - 1); localStorage.setItem('pomodorolist-pomeo-night', `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`); });
  if (opts.clock) await ctx.clock.install({ time: opts.clock });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('guest: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('guest console: ' + m.text()); });
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#authView:not(.hidden)');
  if (!opts.noLogin) { await p.click('#guestBtn'); await p.waitForSelector('#appView:not(.hidden)'); if (opts.clock) await ctx.clock.runFor(2600); else await wait(2500); await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close())); }
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
const G = await guest();
// ---------- 1. the view ----------
await G.ev(() => { S.ui.remView = 'cards'; showTab('reminders'); }); await wait(400);
const v0 = await G.ev(() => ({ seg: $$('#remSeg button').map(b => b.textContent.trim()).join('|'), shown: !$('#cardsBody').classList.contains('hidden') && $('#todoBody').classList.contains('hidden'), add: $('#remAdd').textContent, empty: /No decks yet/.test($('#cardsBody').textContent) }));
check('Reminders tab has a third view, Flashcards, with its own add button and an empty state', v0.seg === 'Reminders|To-do|Flashcards' && v0.shown && v0.add === '+ New deck' && v0.empty, JSON.stringify(v0));
// ---------- 2. decks + cards ----------
await closeAll(G); await G.p.click('#remAdd'); await wait(200);
await G.p.fill('#dnName', 'Organic chemistry'); await G.p.fill('#dnSubject', 'Chemistry'); await G.p.click('#deckNew button[type=submit]'); await wait(400);
const d1 = await G.ev(() => ({ n: S.decks.length, name: S.decks[0].name, subject: S.decks[0].subject, v: S.decks[0].v, u: !!S.decks[0].u, dlg: $('#deckDlg').open, title: $('#deckDlgTitle') && $('#deckDlgTitle').textContent }));
check('New deck: created with a version + sync stamp, its dialog opens', d1.n === 1 && d1.name === 'Organic chemistry' && d1.subject === 'Chemistry' && d1.v === 1 && d1.u && d1.dlg && d1.title === 'Organic chemistry', JSON.stringify(d1));
await G.p.fill('#dkFront', 'Tollens’ test is positive for'); await G.p.fill('#dkBack', 'Aldehydes'); await G.p.click('#dkAdd button[type=submit]'); await wait(300);
check('Add a card: front + back, new, due now', await G.ev(() => S.cards.length === 1 && S.cards[0].f.startsWith('Tollens') && S.cards[0].b === 'Aldehydes' && S.cards[0].deck === S.decks[0].id && cardDue(S.cards[0]) && S.cards[0].reps === 0 && S.cards[0].v === 1));
await G.ev(() => $('#deckDlg details').open = true);
await G.p.fill('#dkBulk', 'Clemmensen reagent | Zn–Hg / HCl\nCannizzaro needs — no α-hydrogen\nFehling’s colour\tbrick red\n\n   \nOnly a front');
await G.p.click('[data-dkbulk]'); await wait(400);
const bulk = await G.ev(() => ({ n: S.cards.length, backs: S.cards.map(c => c.b), fronts: S.cards.map(c => c.f) }));
check('Bulk add: "front | back", "front — back" and tab lines become cards; blank lines skipped; a lone front gets an empty back', bulk.n === 5 && bulk.backs.includes('Zn–Hg / HCl') && bulk.backs.includes('no α-hydrogen') && bulk.backs.includes('brick red') && bulk.fronts.includes('Only a front') && bulk.backs.filter(x => x === '').length === 1, JSON.stringify(bulk));
const edit = await G.ev(() => { const c = S.cards.find(x => x.f === 'Only a front'); editCard(c.id, 'Only a front (edited)', 'now with a back'); return S.cards.find(x => x.id === c.id); });
check('Edit a card', edit.f === 'Only a front (edited)' && edit.b === 'now with a back', JSON.stringify(edit));
await G.p.click('#deckDlg [data-cdel]'); await wait(300);
const del = await G.ev(() => ({ n: S.cards.length, undo: !!document.querySelector('.toast-item button, #toast button') }));
check('Delete a card (with Undo)', del.n === 4 && del.undo, JSON.stringify(del));
await G.ev(() => document.querySelector('.toast-item button, #toast button').click()); await wait(200);
check('…Undo restores it', await G.ev(() => S.cards.length === 5));
await G.p.click('#deckDlg [data-drename]'); await G.p.fill('#drName', 'Organic chem'); await G.p.click('#dkRename button[type=submit]'); await wait(300);
check('Rename a deck', await G.ev(() => S.decks[0].name === 'Organic chem' && $('#deckDlgTitle').textContent === 'Organic chem'));
await G.ev(() => $('#deckDlg').close());
const list = await G.ev(() => ({ rows: $$('#cardsBody li.deck').length, due: $('#cardsBody').textContent.includes('5 due today'), seg: $('#remSeg [data-rview="cards"] .cnt').textContent, btn: $('#cardsBody li.deck [data-dreview]').textContent.trim() }));
check('Deck list: the deck row with its card count, "5 due today", the Flashcards segment badge shows the due count', list.rows === 1 && list.due && list.seg === '5' && /Review 5/.test(list.btn), JSON.stringify(list));
// ---------- 3. spaced repetition maths ----------
const sr = await G.ev(() => {
  const now = new Date(2026, 9, 25, 10), mk = () => ({ ivl: 0, ease: 2.5, reps: 0, lapses: 0, due: '' });
  const r = {};
  let c = mk(); r.again = [gradeCard(c, 'again', now), c.due === dayKey(now), c.ease];
  c = mk(); r.hard = [gradeCard(c, 'hard', now), c.due];
  c = mk(); r.good1 = gradeCard(c, 'good', now); r.good2 = gradeCard(c, 'good', now); r.good3 = gradeCard(c, 'good', now); r.dueGood = c.due; r.ease = c.ease;
  c = mk(); r.easy = gradeCard(c, 'easy', now); r.easyEase = c.ease;
  c = { ...mk(), ivl: 200, ease: 3.2 }; r.cap = gradeCard(c, 'easy', now);
  c = { ...mk(), ivl: 10 }; gradeCard(c, 'again', now); r.lapse = [c.ivl, c.lapses, c.ease];
  r.preview = gradePreview({ ...mk(), ivl: 3 }, 'good');
  return r;
});
check('Again → 0 days (due today, ease drops), Hard → 1 day, Good → 1 → 3 → 8 days (×ease), Easy → 3 days (ease up), capped at a year, a lapse resets', sr.again[0] === 0 && sr.again[1] && sr.again[2] === 2.3 && sr.hard[0] === 1 && sr.good1 === 1 && sr.good2 === 3 && sr.good3 === 8 && sr.dueGood === '2026-11-02' && sr.easy === 3 && sr.easyEase === 2.65 && sr.cap === 365 && sr.lapse[0] === 0 && sr.lapse[1] === 1 && sr.preview === '8 days', JSON.stringify(sr));
// ---------- 4. review ----------
await closeAll(G); await G.p.click('#cardsBody [data-dreview]'); await wait(400);
const rv0 = await G.ev(() => ({ open: $('#fcDlg').open, q: RV.q.length, flipped: RV.flipped, front: $('#fcDlg .cd-front .cd-t').textContent, grades: $('#fcDlg .cd-grades').classList.contains('hidden'), counter: $('#fcDlg .lbl').textContent }));
check('Review opens with the first due card face up, grades hidden until flipped', rv0.open && rv0.q === 5 && !rv0.flipped && rv0.front.length > 3 && rv0.grades && /1 \/ 5/.test(rv0.counter), JSON.stringify(rv0));
await G.p.click('#fcDlg [data-cdflip]'); await wait(600);
check('Tap flips the card (back shown, four grade buttons with their intervals)', await G.ev(() => RV.flipped && $('#fcDlg .cd-card').classList.contains('flipped') && !$('#fcDlg .cd-grades').classList.contains('hidden') && $$('#fcDlg [data-cdgrade]').length === 4 && $('#fcDlg .g-good small').textContent === '1 day'));
const firstId = await G.ev(() => RV.q[0].id);
await G.p.click('#fcDlg [data-cdgrade="good"]'); await wait(300);
const g1 = await G.ev(id => { const c = S.cards.find(x => x.id === id); return { ivl: c.ivl, due: c.due, reps: c.reps, i: RV.i, flipped: RV.flipped, due0: cardDue(c) }; }, firstId);
check('Good: the card is due tomorrow (not today), the next card shows face up', g1.ivl === 1 && g1.reps === 1 && !g1.due0 && g1.i === 1 && !g1.flipped, JSON.stringify(g1));
await G.p.keyboard.press('Space'); await wait(300); await G.p.keyboard.press('1'); await wait(300);
check('Keyboard: Space flips, 1 = Again → the card comes back at the end of this session', await G.ev(() => RV.q.length === 6 && RV.again === 1 && RV.i === 2));
await G.ev(() => { while (RV.q[RV.i]) { RV.flipped = true; reviewGrade('easy'); } }); await wait(300);
const done = await G.ev(() => ({ done: /card/.test($('#fcDlg .cd-done h2').textContent), n: RV.done, due: dueCards().length, keep: !!$('#fcDlg [data-cdmore]') }));
check('Finishing: a summary (6 reviewed), nothing left due today, no "Keep going"', done.done && done.n === 6 && done.due === 0 && !done.keep, JSON.stringify(done));
await G.p.click('#fcDlg [data-cdclose]'); await wait(300);
check('Closing updates the list and the segment badge (nothing due → total count)', await G.ev(() => !$('#fcDlg').open && $('#remSeg [data-rview="cards"] .cnt').textContent === '5' && !$('#remSeg [data-rview="cards"] .cnt').classList.contains('due') && /0.*due today/.test($('#cardsBody').textContent)));
check('Review refuses to start during a focus block', await G.ev(() => { startTimer(); const r = startReview(''); $('#resetBtn').click(); return r === false && !$('#fcDlg').open; }));
// ---------- 5. the break offer ----------
await G.ev(() => { for (const c of S.cards) { c.due = todayKey(); } save(); lastCardOffer = 0; showTab('timer'); });
const offer = await G.ev(() => { const r = offerBreakCards(); return { r, text: $('#pomeoBubble').textContent, acts: $$('#pomeoBubble [data-pba]').map(b => b.textContent) }; });
check('On a break Pomeo offers "Quick 5 cards?" with Review / Not now', offer.r && /Quick 5 cards/.test(offer.text) && offer.acts.length === 2 && /Review 5/.test(offer.acts[0]), JSON.stringify(offer));
await G.p.click('#pomeoBubble [data-pba="0"]'); await wait(400);
check('…Review starts a 5-card session', await G.ev(() => $('#fcDlg').open && RV.q.length === 5));
await G.ev(() => closeReview());
const noFocus = await G.ev(() => { lastCardOffer = 0; startTimer(); const r = offerBreakCards(); const bubble = !$('#pomeoBubble').classList.contains('hidden') && /cards/.test($('#pomeoBubble').textContent); $('#resetBtn').click(); return { r, bubble }; });
check('Never during a focus block: no offer while the timer runs focus', noFocus.r === false && !noFocus.bubble, JSON.stringify(noFocus));
const off = await G.ev(() => { lastCardOffer = 0; S.settings.breakCards = false; const r = offerBreakCards(); S.settings.breakCards = true; return r; });
check('The setting "Flashcards on breaks" turns the offer off', off === false && (await G.ev(() => !!$('#setBreakCards'))));
const real = await G.ev(() => { lastCardOffer = 0; const t = S.timer; t.phase = 'focus'; t.status = 'idle'; startTimer(); t.planned = 25 * 60000; t.focusStartedAt = Date.now() - 25 * 60000; t.endAt = Date.now() - 1; tick(); return t.phase; });
await wait(12500);
check('A real focus block ending → the break starts → the offer appears about 11 s later (after Pomeo’s break line)', real !== 'focus' && (await G.ev(() => /Quick 5 cards|flashcards due/.test($('#pomeoBubble').textContent + [...document.querySelectorAll('.toast-item')].map(t => t.textContent).join()))));
await closeAll(G); await G.ev(() => hideBubble());
const cadence = await G.ev(() => offerBreakCards());
check('…and not again for 20 minutes', cadence === false);
// ---------- 6. export / import ----------
const exp = await G.ev(() => { const { timer, ui, pendingSessions, profileDirty, ...data } = S; return JSON.parse(JSON.stringify(data)); });
const G2 = await guest();
const imp = await G2.ev(e => { mergeData(e); mergeData(e); return { decks: S.decks.length, cards: S.cards.length }; }, exp);
check('A backup carries decks and cards; importing twice doubles nothing', imp.decks === 1 && imp.cards === 5, JSON.stringify(imp));
await G2.ctx.close();
// ---------- 7. demo ----------
const D = await guest(1280, { noLogin: true });
await D.p.click('#previewBtn'); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(2600); await closeAll(D);
await D.ev(() => { S.ui.remView = 'cards'; showTab('reminders'); }); await wait(400);
const demo = await D.ev(() => ({ decks: S.decks.length, cards: S.cards.length, due: dueCards().length, rows: $$('#cardsBody li.deck').length, ls: Object.keys(localStorage).length }));
await closeAll(D); await D.p.click('#cardsBody [data-dreview=""]'); await wait(300);
const demoRv = await D.ev(() => ({ open: $('#fcDlg').open, n: RV.q.length }));
await D.ev(() => { RV.flipped = true; reviewGrade('good'); });
const demoAfter = await D.ev(() => ({ reps: S.cards.map(c => c.reps).reduce((a, b) => a + b, 0), ls: Object.keys(localStorage).length }));
const demoReps0 = 8;   // the sample cards' review counts before grading (2 + 2 + 2 + 2)
await D.ev(() => closeReview()); await closeAll(D); await D.p.click('#cardsBody [data-dnew]'); await wait(300);
check('Demo: two sample decks with due cards; review works but grades are not kept; new deck shows the demo prompt; nothing written', demo.decks === 2 && demo.cards === 9 && demo.due >= 5 && demo.rows === 2 && demoRv.open && demoRv.n >= 5 && demoAfter.reps === demoReps0 && demoAfter.ls === demo.ls && (await D.ev(() => !!document.querySelector('dialog[open] #pvWhy'))), JSON.stringify({ demo, demoRv, demoAfter }));
await D.ctx.close();
// ---------- 8. phone ----------
const P = await guest(360);
await P.ev(() => { const d = addDeck('Maths', 'Maths'); bulkAddCards(d.id, 'a | 1\nb | 2\nc | 3'); S.ui.remView = 'cards'; showTab('reminders'); }); await wait(600);
const ph = await P.ev(() => ({ hscroll: document.documentElement.scrollWidth > innerWidth + 1, small: $$('#cardsBody button').filter(b => b.offsetParent && (b.getBoundingClientRect().height < 40 || b.getBoundingClientRect().width < 40)).length }));
await closeAll(P); await P.p.click('#cardsBody [data-dreview]'); await wait(500);
const ph2 = await P.ev(() => { const r = $('#fcDlg .cd-card').getBoundingClientRect(); return { fits: r.right <= innerWidth + 1 && r.width > 250, grades: $$('#fcDlg [data-cdgrade]').every(b => b.getBoundingClientRect().height >= 44) }; });
await P.ev(() => $('#fcDlg .cd-card').click()); await wait(600);
const ph3 = await P.ev(() => $$('#fcDlg [data-cdgrade]').every(b => b.getBoundingClientRect().height >= 44 && b.getBoundingClientRect().width >= 44));
check('360px: the view and the review dialog fit, grade buttons are at least 44px', !ph.hscroll && ph.small === 0 && ph2.fits && ph3, JSON.stringify({ ph, ph2, ph3 }));
await P.ctx.close();
await G.ctx.close();
// ---------- 9. two devices ----------
const A = await device('A', 1200), U = 'fc_' + R;
await signup(A, U);
const uid = await A.ev(() => USER.uid);
const A2 = await device('A2', 1200);
await A2.p.goto('http://localhost:8000/index.html?emulator=1'); await A2.p.waitForSelector('#authView:not(.hidden)');
await A2.p.click('[data-mode=login] >> visible=true'); await A2.p.fill('#authUser', U); await A2.p.fill('#authPass', 'secret12'); await A2.p.click('#authSubmit');
await A2.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone, null, { timeout: 20000 }); await wait(2500); await closeDlg(A2);
await A.ev(() => { const d = addDeck('Biology', 'Biology'); bulkAddCards(d.id, 'Cell | unit of life\nATP | energy currency'); });
const seen = await until(A2, () => S.decks.length === 1 && S.cards.length === 2, null, 15000);
check('A makes a deck with two cards → A2 has them', seen >= 0, `${seen} ms`);
await A2.ev(() => { const c = S.cards[0]; gradeCard(c, 'good'); save(); });
const graded = await until(A, () => S.cards.some(c => c.reps === 1 && c.ivl === 1), null, 15000);
check('A2 grades a card → A sees the new due date', graded >= 0, `${graded} ms`);
await A.ev(() => deleteCard(S.cards.find(c => c.f === 'ATP').id)); await wait(300);
const gone = await until(A2, () => S.cards.length === 1 && !S.cards.some(c => c.f === 'ATP'), null, 15000);
check('A deletes a card → it disappears on A2 (tombstone)', gone >= 0 && (await A2.ev(() => Object.keys(S.tomb).some(k => k.startsWith('cards:')))));
const cloud = await ownerGet('users/' + uid);
check('The profile document holds decks and cards (nothing outside users/{uid})', Array.isArray(cloud.decks) && cloud.decks.length === 1 && Array.isArray(cloud.cards) && cloud.cards.length === 1 && cloud.cards[0].v === 1, JSON.stringify({ decks: cloud.decks.length, cards: cloud.cards.length }));
log('errors', JSON.stringify(errs.filter(e => !/permission|offline|Could not reach|unavailable|WebChannel|transport/i.test(e))));
log('failures', failCount());
await b.close();
process.exit(failCount() ? 1 : 0);
