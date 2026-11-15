import { b, U, wait } from './cl-common.mjs';
const c = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await c.newPage();
await p.goto(U); await p.waitForSelector('#previewBtn'); await p.click('#previewBtn'); await p.waitForSelector('#appView:not(.hidden)'); await wait(2600);
await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); showTab('reminders'); S.ui.remView = 'cards'; renderCards(); startReview(S.decks[0].id); });
await wait(700);
const r = await p.evaluate(() => { const d = $('#fcDlg'), r = d.getBoundingClientRect(); return { open: d.open, w: Math.round(r.width), h: Math.round(r.height), pad: getComputedStyle(d).padding }; });
console.log(JSON.stringify(r)); await p.screenshot({ path: 'shot-fc-review.png' }); await b.close();
