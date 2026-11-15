// Screenshot the 360 px header with and without the rank chip (layout check).
import { b, device, signup, wait, closeDlg } from './cl-common.mjs';
const A = await device('A', 360);
await signup(A, 'h36_' + Date.now().toString(36).slice(-5)); await closeDlg(A);
await A.ev(() => showTab('timer')); await wait(600);
const box = () => A.ev(() => [...document.querySelectorAll('.top > *, .hdr-right > *')].filter(e => e.offsetParent !== null).map(e => { const r = e.getBoundingClientRect(); return `${e.id || e.className.split(' ')[0]}:${Math.round(r.left)}-${Math.round(r.right)}`; }).join(' '));
console.log('with   ', await box());
await A.p.screenshot({ path: process.argv[2] + '/hdr360-with.png', clip: { x: 0, y: 0, width: 360, height: 64 } });
await A.ev(() => $('#rankChip').classList.add('hidden')); await wait(200);
console.log('without', await box());
await A.p.screenshot({ path: process.argv[2] + '/hdr360-without.png', clip: { x: 0, y: 0, width: 360, height: 64 } });
await b.close();
