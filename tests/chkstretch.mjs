// Run only the layout snapshot of v1191d on a few pages (demo, 1440 px) and print the stretched-card findings.
import { b, device, wait, SITE } from './cl-common.mjs';
import fs from 'fs';
const L = fs.readFileSync('v1191d.mjs', 'utf8').match(/const LAYOUT = `([\s\S]*?)`;/)[1].replace('${LIMIT}', '200');
const D = await device('D', 1440); await D.p.goto(SITE + '/index.html'); await D.p.waitForSelector('#authView:not(.hidden)'); await D.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); }); await D.ev(() => startPreview()); await wait(3500);
for (const t of ['quests', 'profile', 'clan', 'timer']) { await D.ev(t => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); showTab(t); }, t); await wait(1500); const r = await D.ev(L); console.log(t, JSON.stringify(r.blank)); }
await b.close();
