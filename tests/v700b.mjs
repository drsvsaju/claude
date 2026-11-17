// v2.0 phase 7 — the invite rules under attack (emulator): referrals/{invitee} and inviteStats/{inviter}.
// Every attempt is a real client write or read from a signed-in page; the emulator's owner token is used only to
// move time (backdating a check-in) and to set an account's published minutes, which the app cannot do at will.
// What must hold: only a new account can become an invitee, once, of someone else who exists; it becomes active only
// through three check-ins 18 hours apart within 14 days with growing published minutes (180 in total); the inviter's
// count grows by exactly one in that same write and in no other way; nobody else can read or change a referral.
import { b, device, signup, wait, log, check, errs, failCount, owner, ownerGet } from './cl-common.mjs';
const R = Date.now().toString(36).slice(-5);
const FS = 'http://127.0.0.1:8080/v1/projects/demo-pomo/databases/(default)/documents/';
const ownerDel = path => fetch(FS + path, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });
const op = (d, fn, ...args) => d.p.evaluate(async ([src, args]) => { try { await (0, eval)('(' + src + ')')(...args); return 'ALLOWED'; } catch (e) { return e.code || e.message; } }, [fn.toString(), args]);
const denied = r => r === 'permission-denied';
const ago = h => new Date(Date.now() - h * 3600e3);
const quiet = d => d.ev(() => { INV.retryAt = Date.now() + 864e5; window.publishPublic = () => {}; });   // from here the app neither checks in nor republishes its stats: every write below is the test's

// in-page writes
const create = (uid, d) => FB.setDoc(FB.doc(FB.db, 'referrals', uid), { at: FB.serverTimestamp(), checkAt: FB.serverTimestamp(), checks: 0, min: 0, state: 'joined', ...d });
const step = (uid, d) => FB.setDoc(FB.doc(FB.db, 'referrals', uid), { checkAt: FB.serverTimestamp(), ...d }, { merge: true });
const finish = (uid, inviter, n, d = {}) => { const w = FB.writeBatch(FB.db); w.set(FB.doc(FB.db, 'referrals', uid), { checks: 3, checkAt: FB.serverTimestamp(), state: 'active', activeAt: FB.serverTimestamp(), ...d }, { merge: true }); if (inviter) w.set(FB.doc(FB.db, 'inviteStats', inviter), { n, updatedAt: FB.serverTimestamp() }); return w.commit(); };
const stats = (inviter, n) => FB.setDoc(FB.doc(FB.db, 'inviteStats', inviter), { n, updatedAt: FB.serverTimestamp() });

const A = await device('A'), M = await device('M'), C = await device('C');
const nA = 'inva_' + R, nM = 'invm_' + R, nC = 'invc_' + R, nB = 'invb_' + R;
await signup(A, nA); await signup(M, nM); await signup(C, nC);
const [ua, um, uc] = [await A.ev(() => USER.uid), await M.ev(() => USER.uid), await C.ev(() => USER.uid)];
await wait(2500);   // every account has published its stats by now

// ---------- 1. who may become an invitee ----------
const old = await op(C, create, uc, { inviter: ua, inviterName: nA, name: nC });
await ownerDel('publicStats/' + uc); await quiet(C);   // from here C counts as new, so each refusal below has one cause only
const self = await op(C, create, uc, { inviter: uc, inviterName: nC, name: nC });
const wrongOwner = await op(C, create, uc, { inviter: um, inviterName: nA, name: nC });
const nobody = await op(C, create, uc, { inviter: ua, inviterName: 'nobody_' + R, name: nC });
const forOther = await op(C, create, um, { inviter: ua, inviterName: nA, name: nM });
const bad = [];
for (const d of [{ checks: 2 }, { state: 'active' }, { min: 100 }, { extra: 1 }, { name: nA }, { at: ago(48) }, { checkAt: ago(48) }, { activeAt: new Date() }]) bad.push(await op(C, create, uc, { inviter: ua, inviterName: nA, name: nC, ...d }));
check('An account that has already published stats cannot become an invitee; nor can anyone invite themselves, name an inviter that does not exist or whose username belongs to someone else, or write another account’s referral',
  denied(old) && denied(self) && denied(wrongOwner) && denied(nobody) && denied(forOther), JSON.stringify({ old, self, wrongOwner, nobody, forOther }));
check('A referral must start clean: not with check-ins, minutes, “active”, an old date, another name or an extra field', bad.every(denied), bad.join());

const ok = await op(C, create, uc, { inviter: ua, inviterName: nA, name: nC });
const again = await op(C, create, uc, { inviter: um, inviterName: nM, name: nC });
const del = await op(C, uid => FB.deleteDoc(FB.doc(FB.db, 'referrals', uid)), uc);
check('A clean referral is accepted once; it cannot be written again (to another inviter) or deleted', ok === 'ALLOWED' && denied(again) && denied(del), JSON.stringify({ ok, again, del }));

// ---------- 2. check-ins: spacing, growth, order ----------
await owner('publicStats/' + uc, { lifeMin: 30 });
const early = await op(C, step, uc, { checks: 1, min: 30 });
await owner('referrals/' + uc, { checkAt: ago(19) });
const byInviter = await op(A, step, uc, { checks: 1, min: 30 });
const byStranger = await op(M, step, uc, { checks: 1, min: 30 });
const skip = await op(C, step, uc, { checks: 2, min: 30 });
const lie = await op(C, step, uc, { checks: 1, min: 500 });
const swap = await op(C, step, uc, { checks: 1, min: 30, inviter: um });
const jump = await op(C, step, uc, { checks: 1, min: 30, state: 'active', activeAt: new Date() });
const backdate = await op(C, step, uc, { checks: 1, min: 30, checkAt: ago(40) });
await owner('publicStats/' + uc, { lifeMin: 10 });
const little = await op(C, step, uc, { checks: 1, min: 10 });
await owner('publicStats/' + uc, { lifeMin: 30 });
const one = await op(C, step, uc, { checks: 1, min: 30 });
const twoEarly = await op(C, step, uc, { checks: 2, min: 30 });
await owner('referrals/' + uc, { checkAt: ago(19) });
const same = await op(C, step, uc, { checks: 2, min: 30 });   // 18 hours later but no more focus
await owner('publicStats/' + uc, { lifeMin: 60 });
const two = await op(C, step, uc, { checks: 2, min: 60 });
check('A check-in is refused before 18 hours have passed, from anyone but the invitee, when it skips a step, claims minutes that are not published, changes the inviter, jumps to “active” or sets its own time',
  denied(early) && denied(byInviter) && denied(byStranger) && denied(skip) && denied(lie) && denied(swap) && denied(jump) && denied(backdate), JSON.stringify({ early, byInviter, byStranger, skip, lie, swap, jump, backdate }));
check('Each check-in needs 20 more published minutes than the last; with them, the first and the second go through (and not twice in a row)',
  denied(little) && one === 'ALLOWED' && denied(twoEarly) && denied(same) && two === 'ALLOWED', JSON.stringify({ little, one, twoEarly, same, two }));

// ---------- 3. becoming active, and the inviter's count ----------
await owner('referrals/' + uc, { checkAt: ago(19) });
await owner('publicStats/' + uc, { lifeMin: 100 });
const short = await op(C, finish, uc, ua, 1, { min: 100 });
await owner('publicStats/' + uc, { lifeMin: 200 });
const alone = await op(C, finish, uc, '', 0, { min: 200 });                       // active without counting for the inviter
const plusTwo = await op(C, finish, uc, ua, 2, { min: 200 });
const wrongInviter = await op(C, finish, uc, um, 1, { min: 200 });
const selfCount = await op(A, stats, ua, 5);
const selfCount1 = await op(A, stats, ua, 1);
const loneCount = await op(C, stats, ua, 1);                                       // counting without becoming active
const strangerCount = await op(M, stats, ua, 1);
const before = await ownerGet('inviteStats/' + ua);
const done = await op(C, finish, uc, ua, 1, { min: 200 });
const after = await ownerGet('inviteStats/' + ua), ref = await ownerGet('referrals/' + uc);
const twice = await op(C, stats, ua, 2);
const redo = await op(C, finish, uc, ua, 2, { min: 200 });
const more = await op(C, step, uc, { checks: 4, min: 200 });
const delStats = await op(A, uid => FB.deleteDoc(FB.doc(FB.db, 'inviteStats', uid)), ua);
check('The third check-in needs 180 published minutes and must add exactly one to that inviter’s count in the same write; the count cannot be written in any other way (not by the inviter, not by the invitee alone, not by a stranger)',
  denied(short) && denied(alone) && denied(plusTwo) && denied(wrongInviter) && denied(selfCount) && denied(selfCount1) && denied(loneCount) && denied(strangerCount) && before === null,
  JSON.stringify({ short, alone, plusTwo, wrongInviter, selfCount, selfCount1, loneCount, strangerCount, before }));
check('Done properly it goes through once: the referral is active and the inviter’s count is 1; after that the invitee can neither count again nor change the referral, and the count cannot be deleted',
  done === 'ALLOWED' && after && after.n === 1 && ref.state === 'active' && ref.checks === 3 && ref.min === 200 && ref.inviter === ua && denied(twice) && denied(redo) && denied(more) && denied(delStats), JSON.stringify({ done, after, state: ref.state, twice, redo, more, delStats }));

// ---------- 4. the two weeks; who can read ----------
// B signs up through A's link in the app itself (the real path), then lets the two weeks pass
const B = await device('B');
await B.p.goto(`http://localhost:8000/index.html?emulator=1&ref=${nA}`); await B.p.waitForSelector('#authView:not(.hidden)');
await B.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await B.p.click('[data-mode=signup] >> visible=true'); await B.p.fill('#authUser', nB); await B.p.fill('#authPass', 'secret12'); await B.p.fill('#authPass2', 'secret12'); await B.p.click('#authSubmit');
await B.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone && SOC.started, null, { timeout: 20000 }); await wait(3000);
await B.ev(() => { if ($('#tutDlg').open) finishTutorial(); document.querySelectorAll('dialog[open]').forEach(x => x.close()); });
const ub = await B.ev(() => USER.uid); await quiet(B);
const made = await ownerGet('referrals/' + ub);
await owner('referrals/' + ub, { at: ago(15 * 24), checkAt: ago(19) }); await owner('publicStats/' + ub, { lifeMin: 30 });
const late = await op(B, step, ub, { checks: 1, min: 30 });
check('A sign-up through a link writes the referral by itself (the inviter by uid and name, nothing checked in); after 14 days a check-in is refused',
  made && made.inviter === ua && made.inviterName === nA && made.name === nB && made.checks === 0 && made.state === 'joined' && denied(late), JSON.stringify({ made, late }));

const get = (d, uid) => op(d, u => FB.getDoc(FB.doc(FB.db, 'referrals', u)), uid);
const list = (d, uid) => d.p.evaluate(async u => { try { const qs = await FB.getDocs(FB.query(FB.collection(FB.db, 'referrals'), FB.where('inviter', '==', u))); return qs.size; } catch (e) { return e.code; } }, uid);
const all = await M.p.evaluate(async () => { try { const qs = await FB.getDocs(FB.collection(FB.db, 'referrals')); return qs.size; } catch (e) { return e.code; } });
const reads = { stranger: await get(M, uc), inviter: await get(A, uc), own: await get(C, uc), listOther: await list(M, ua), listOwn: await list(A, ua), all, count: await M.p.evaluate(async u => { const d = await FB.getDoc(FB.doc(FB.db, 'inviteStats', u)); return d.exists() ? d.data().n : null; }, ua) };
check('A referral can be read by its invitee and its inviter only; an inviter can list their own invitees (2) and nobody can list anyone else’s or all of them; the count itself is public to signed-in users (1)',
  denied(reads.stranger) && reads.inviter === 'ALLOWED' && reads.own === 'ALLOWED' && reads.listOther === 'permission-denied' && reads.listOwn === 2 && reads.all === 'permission-denied' && reads.count === 1, JSON.stringify(reads));

check('No page errors', errs.length === 0, errs.join(' | '));
log(`\n${failCount() ? '✗ ' + failCount() + ' FAILED' : '✓ all passed'}`);
await b.close();
process.exit(failCount() ? 1 : 0);
