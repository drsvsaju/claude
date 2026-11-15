// Reproduce the 1.19 bug on the old build: Ranks, then Focus time → still Ranks; also after a reload.
import { b, device, signup, wait, log, closeDlg } from './cl-common.mjs';
const A = await device('A', 1280); await signup(A, 'rep_' + Date.now().toString(36).slice(-5)); await closeDlg(A);
await A.ev(() => showTab('board')); await wait(1500);
const st = () => A.ev(() => ({ kind: ($('#lbKind .active') || {}).textContent, period: ($('#lbPeriod .active') || {}).textContent, focusBtn: $$('#lbKind button')[0].dataset.period }));
await A.p.click('#lbKind button:has-text("Ranks")'); await wait(1500); log('after Ranks', JSON.stringify(await st()));
await A.p.click('#lbKind button:has-text("Focus time")'); await wait(1500); log('after Focus time', JSON.stringify(await st()));
await A.p.reload(); await A.p.waitForFunction(() => typeof firstLoadDone !== 'undefined' && firstLoadDone); await wait(800); await closeDlg(A); await A.ev(() => showTab('board')); await wait(1500);
await A.p.click('#lbKind button:has-text("Focus time")'); await wait(1500); log('reload, Focus time', JSON.stringify(await st()));
await b.close();
