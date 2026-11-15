// Preloaded (node --import) for the suites written before v1.20: Overtime is on by default since 1.20 (a block that
// reaches 0 counts up until Stop), and these suites test the classic end of a block, so every browser context they open
// keeps it off. The v1.20 suites run without this preload (they test overtime itself).
import { chromium } from 'playwright';
const OFF = () => { setInterval(() => { try { if (typeof S !== 'undefined' && S && S.settings && S.settings.overtime !== false) S.settings.overtime = false; } catch (e) { /* not loaded yet */ } }, 100); };
const launch = chromium.launch.bind(chromium);
chromium.launch = async (...a) => {
  const b = await launch(...a);
  const nc = b.newContext.bind(b), np = b.newPage.bind(b);
  b.newContext = async (...x) => { const c = await nc(...x); await c.addInitScript(OFF); return c; };
  b.newPage = async (...x) => { const pg = await np(...x); await pg.addInitScript(OFF); return pg; };
  return b;
};
