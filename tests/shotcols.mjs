// Screenshots (demo, 1440 px): Profile, Clan, Timer, Quests — the whole main column, scaled down.
import { b, device, wait, SITE } from './cl-common.mjs';
const out = process.argv[2];
const D = await device('D', 1440);
await D.p.goto(SITE + '/index.html'); await D.p.waitForSelector('#authView:not(.hidden)'); await D.ev(() => { const s = document.getElementById('introSkip'); if (s) s.click(); });
await D.ev(() => startPreview()); await D.p.waitForSelector('#appView:not(.hidden)'); await wait(3000);
for (const t of ['profile', 'clan', 'timer', 'quests']) {
  await D.ev(t => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); S.settings.gardenTour = Date.now(); showTab(t); scrollTo(0, 0); }, t); await wait(1500);
  const el = await D.p.$(`#tab-${t} .mason`);
  await el.screenshot({ path: `${out}/cols-${t}.png`, scale: 'css' });
}
await b.close();
