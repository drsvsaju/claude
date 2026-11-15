// Screenshots: the achievement categories at 360 px (start, last selected) and 1440 px.
import { b, device, signup, wait, closeDlg } from './cl-common.mjs';
const out = process.argv[2];
const A = await device('A', 360, {});
await signup(A, 'sha_' + Date.now().toString(36).slice(-5)); await closeDlg(A);
await A.ev(() => showTab('profile')); await wait(900);
const shot = async name => { const el = await A.p.$('.ach-tools'); await el.scrollIntoViewIfNeeded(); await wait(300); await el.screenshot({ path: `${out}/${name}.png` }); };
await shot('ach-360-start');
await A.ev(() => [...$$('#achCats button')].pop().click()); await wait(900); await shot('ach-360-last');
await A.ev(() => { S.settings.theme = 'dark'; applyTheme(); }); await wait(600); await shot('ach-360-dark');
await A.p.setViewportSize({ width: 1440, height: 900 }); await wait(700); await shot('ach-1440');
await b.close();
