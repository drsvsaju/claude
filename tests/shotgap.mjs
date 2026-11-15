// Screenshots: Quests and Profile on a real account that beat the boss, at 1440 and 1920, in default / glass full / dark.
import { b, device, signup, wait, closeDlg, SITE } from './cl-common.mjs';
const A = await device('A', 1440);
await signup(A, 'gs_' + Date.now().toString(36).slice(-5)); await closeDlg(A);
await A.ev(() => { S.settings.gardenTour = Date.now(); const st = Date.now() - 6 * 3600e3; const s = { id: 'big' + st, name: 'Maths', start: st, end: st + 320 * 6e4, duration: 320 * 6e4, planned: 320 * 6e4, preset: 'x' }; S.sessions.push(s); cloudAddSessions([s]); G = null; save(); checkBoss(); });
await wait(2500); await closeDlg(A);
for (const [w, glass, mode] of [[1440, 'off', 'light'], [1440, 'full', 'dark'], [1920, 'off', 'light']]) {
  await A.p.setViewportSize({ width: w, height: 1100 });
  await A.ev(([g, m]) => { S.settings.theme = m; applyTheme(); setGlass(g); }, [glass, mode]); await wait(600);
  for (const t of ['quests', 'profile']) {
    await A.ev(t => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); showTab(t); scrollTo(0, 0); }, t); await wait(1800);
    await A.ev(t => document.querySelector(`#tab-${t} .mason`).scrollIntoView(), t); await wait(500);
    await A.p.screenshot({ path: `gapshots/${t}-${w}-${glass}.png` });
  }
}
await b.close();
