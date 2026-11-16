// v1.13 player card: renders at every width, PNG export (sizes, sharp), share link opened logged out with no Firebase,
// privacy in image + link, hostile links are neutralised, Web Share / copy fallback, friend's card, minimal card, demo.
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const errs = [];
let fails = 0;
const check = (label, ok, extra = '') => { if (!ok) fails++; log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };
async function ctxOf(name, w, opt = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: 860 }, timezoneId: 'Asia/Kolkata', colorScheme: opt.dark ? 'dark' : 'light', hasTouch: !!opt.touch, isMobile: !!opt.touch });
  await ctx.clock.setFixedTime(new Date('2026-10-22T19:10:00+05:30'));
  if (opt.init) await ctx.addInitScript(opt.init);
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(name + ': ' + e.message));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(name + ' ' + m.type() + ': ' + m.text().slice(0, 180)); });
  return { ctx, p, ev: (f, a) => p.evaluate(f, a) };
}
// ---------- the demo account (rich data) ----------
const A = await ctxOf('demo', 1280);
await A.p.goto('http://localhost:8000/index.html?emulator=1');
await A.p.waitForSelector('#previewBtn', { state: 'visible' }); await A.p.click('#previewBtn');
await A.p.waitForSelector('#appView:not(.hidden)'); await wait(2500);
await A.ev(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); $('#toast').innerHTML = ''; showTab('profile'); });
await wait(600);
const head = await A.ev(() => { const c = $('#profileHead .pcard'); return { ok: !!c, name: $('.pc-name', c).textContent, lv: $('.pc-lv', c).textContent.replace(/\s+/g, ' '), tiles: $$('.pc-tile', c).length, week: !!$('.pc-week', c), heat: $$('.pc-heat rect', c).length, facts: $$('.pc-fact', c).length, feat: $$('.pc-chip', c).length, subj: $$('.pc-subj li', c).length, banner: !!$('.pc-banner .pc-bart', c), aura: !!$('.pc-av .aura', c), style: c.className }; });
check('Profile: player card with banner, badge + aura, name, tier/level, 4 stat tiles, week chart, 12-week heatmap, facts, top subjects and 3 featured', head.ok && head.banner && head.aura && /Level 19/.test(head.lv) && head.tiles === 4 && head.week && head.heat > 70 && head.facts >= 3 && head.subj === 3 && head.feat === 3 && /cs-champion/.test(head.style), JSON.stringify(head));
// widths
for (const w of [360, 390, 768, 1280]) {
  await A.p.setViewportSize({ width: w, height: 860 }); await wait(400);
  const r = await A.ev(() => { const c = $('#profileHead .pcard'), cr = c.getBoundingClientRect(); const over = [...c.querySelectorAll('*')].filter(x => { const r = x.getBoundingClientRect(); return r.width && (r.right > cr.right + 1 || r.left < cr.left - 1) && !x.closest('.pc-banner'); }).map(x => x.className.baseVal ?? x.className).slice(0, 4); return { cw: Math.round(cr.width), doc: document.documentElement.scrollWidth, vw: innerWidth, over }; });
  check(`Card at ${w}px: fits, nothing spills out, no horizontal scroll`, r.doc <= r.vw && !r.over.length, JSON.stringify(r));
  await A.p.screenshot({ path: `s113/v113b-card-${w}.png` });
}
await A.p.setViewportSize({ width: 1280, height: 860 });
// PNG export
const png = await A.ev(async () => { const out = {}; for (const size of ['square', 'story']) { const bl = await cardPNG(cardData(), size); const bm = await createImageBitmap(bl); const c = new OffscreenCanvas(bm.width, bm.height), x = c.getContext('2d'); x.drawImage(bm, 0, 0); const px = x.getImageData(0, 0, bm.width, bm.height).data; const cols = new Set(); let hardEdges = 0; for (let i = 0; i < px.length; i += 4 * 97) cols.add(px[i] << 16 | px[i + 1] << 8 | px[i + 2]);
  // sharpness: adjacent pixel pairs with a big jump along a row (crisp text edges); an upscaled image has almost none.
  // v2.0: the best of rows every 2% of the height, so the check does not depend on where the layout puts the text
  // (one fixed row at 34% of the story image stopped crossing any text when later versions added to the card).
  let bestRow = 0; for (let k = 5; k <= 95; k += 2) { const yRow = Math.round(bm.height * k / 100); let n = 0; for (let xx = 1; xx < bm.width; xx++) { const i = (yRow * bm.width + xx) * 4, j = i - 4; if (Math.abs(px[i] - px[j]) + Math.abs(px[i + 1] - px[j + 1]) + Math.abs(px[i + 2] - px[j + 2]) > 180) n++; } if (n > hardEdges) { hardEdges = n; bestRow = k; } }
  if (size === 'story') out.storyUrl = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(bl); });
  out[size] = { w: bm.width, h: bm.height, bytes: bl.size, type: bl.type, colours: cols.size, hardEdges, bestRow }; } return out; });
fs.writeFileSync('s113/v113b-story.png', Buffer.from(png.storyUrl.split(',')[1], 'base64')); delete png.storyUrl;
check('Save as image: square PNG is 1080×1080, story PNG is 1080×1920', png.square.w === 1080 && png.square.h === 1080 && png.story.w === 1080 && png.story.h === 1920 && png.square.type === 'image/png', JSON.stringify(png));
check('… drawn at full size (not upscaled): crisp edges and full detail', png.square.hardEdges > 20 && png.story.hardEdges > 20 && png.square.colours > 300, `${png.square.hardEdges}/${png.story.hardEdges} edges`);
// share dialog: preview + buttons; desktop without navigator.share → copy fallback
await A.ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:8000' });
await A.ev(() => { PV.on = false; });   // the demo blocks sharing (tested below); lift it to test the dialog itself
await A.p.click('#cardShare'); await wait(500);
const sh = await A.ev(() => ({ open: $('#shareDlg').open, img: $('#shImg').naturalWidth, url: $('#shUrl').value, native: !$('#shNative').classList.contains('hidden') }));
check('Share dialog: image preview, link field; no Web Share on desktop so "Share…" is hidden', sh.open && sh.img > 0 && /#card=/.test(sh.url) && !sh.native, JSON.stringify({ ...sh, url: sh.url.slice(0, 60) }));
check('“Share link” is hidden without Web Share (1.14.3: Copy is the way on a computer)', await A.ev(() => $('#shLink').classList.contains('hidden')));
await A.p.click('#shCopy'); await wait(400);
check('“Copy” copies the link', (await A.ev(() => navigator.clipboard.readText())) === sh.url);
await A.p.click('[data-shsize="story"]'); await wait(300);
check('Story 9:16 option switches the preview', await A.ev(() => $('#shPrev').classList.contains('story') && /1920/.test(decodeURIComponent($('#shImg').src))));
const dl = A.p.waitForEvent('download'); await A.p.click('#shSave'); const file = await dl;
check('“Save as image” downloads pomodorolist-card-story.png', file.suggestedFilename() === 'pomodorolist-card-story.png');
await A.ev(() => { $('#shareDlg').close(); PV.on = true; });
await A.p.click('#cardShare'); await wait(300); await A.p.click('#shSave'); await wait(300);
check('In the demo, saving/sharing asks to make an account', await A.ev(() => $('#pvDlg').open && /player card/.test($('#pvWhy').textContent)));
await A.ev(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
// privacy: the full card vs. everything sensitive off
const full = await A.ev(() => cardLink(cardData()));
const secrets = await A.ev(() => ({ notes: Object.values(S.notes), rem: S.reminders.map(r => r.title), parked: S.parked.map(p => p.text) }));
const decode = l => JSON.parse(Buffer.from(l.split('#card=')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
const fd = decode(full);
check('Link snapshot holds the card (subjects on in the demo) and never notes, reminders, parked thoughts or email', fd.sj && fd.n === 'demo_scholar' && ![...secrets.notes, ...secrets.rem, ...secrets.parked].some(t => JSON.stringify(fd).includes(t)) && !/@|email/i.test(JSON.stringify(fd)), Object.keys(fd).join(','));
const priv = await A.ev(() => { const keep = { ...S.cardPrefs }; for (const k of ['hours', 'streak', 'subjects', 'week', 'bosses', 'featured']) S.cardPrefs['p_' + k] = { v: false, u: Date.now() }; const d = cardData(), svg = cardImageSVG(d, 'square'), html = cardHTML(d, 'own'); S.cardPrefs = keep;
  return { keys: Object.keys(d), svgHas: ['Total focus', 'Current streak', 'Maths', 'Physics', 'LAST 7 DAYS', 'beaten', 'mastered'].filter(t => svg.includes(t)), htmlHas: ['Total focus', 'Current streak', 'Maths', 'Last 7 days', 'Bosses', 'mastered'].filter(t => html.includes(t)) }; });
check('Privacy switches: hidden stats leave the link, the image and the card (hours, streaks, subjects, week chart, bosses, featured)', !priv.keys.some(k => ['h', 'cs', 'ls', 'sj', 'wk', 'bd', 'ms', 'ft', 'sk'].includes(k)) && !priv.svgHas.length && !priv.htmlHas.length, JSON.stringify(priv));
const noNames = await A.ev(() => { const keep = { ...S.cardPrefs }; delete S.cardPrefs.p_subjects; const d = cardData(); S.cardPrefs = keep; return !d.sj && !JSON.stringify(d).match(/Maths|Physics|Chemistry/); });
check('Session names are off by default (top subjects only when switched on)', noNames);
// customise dialog (outside the demo lock)
await A.ev(() => { PV.on = false; openCardDlg(); });
await wait(400);
const cd = await A.ev(() => ({ styles: $$('#cdOpts .cd-style').length, locked: $$('#cdOpts .cd-style:disabled').length, bns: $$('#cdOpts .cd-bn').length, feats: $$('#cdOpts [data-cdfeat]').length, privs: $$('#cdOpts [data-cdpriv]').length, prev: !!$('#cdPrev .pcard') }));
check('Customise: 6 card styles (locked ones say how to unlock), banners (free + themes + boss arenas + event art), featured picker, privacy switches, live preview', cd.styles === 6 && cd.locked === 2 && cd.bns >= 8 && cd.feats >= 3 && cd.privs === 10 && cd.prev, JSON.stringify(cd));
await A.ev(() => { $('#cdOpts [data-cdstyle="card_gamer"]').click(); });
await wait(200);
await A.ev(() => { $('#cdOpts [data-cdbn="bn_dawn"]').click(); });
await wait(200);
const after = await A.ev(() => ({ st: equippedId('card'), bn: cardPref('banner'), prev: $('#cdPrev .pcard').className, prof: $('#profileHead .pcard').className }));
check('Picking a style and a banner updates the preview and the Profile card', after.st === 'card_gamer' && after.bn === 'bn_dawn' && /cs-gamer/.test(after.prev) && /cs-gamer/.test(after.prof), JSON.stringify(after));
await A.ev(() => { $('#cardDlg').close(); PV.on = true; });
// friend's card (from public data only)
await A.ev(() => { showTab('friends'); }); await wait(700);
await A.ev(() => { const el = $('[data-open="demo_f1"]'); if (el) el.click(); }); await wait(1200);
await A.ev(() => { const t = $('[data-fptab="card"]'); if (t) t.click(); }); await wait(600);
const fc = await A.ev(() => { const c = $('#friendsBody .pcard'); return c && { name: $('.pc-name', c).textContent, tiles: $$('.pc-tile', c).length, heat: !!$('.pc-heat', c), feat: !!$('.pc-feat', c), bosses: /Bosses/.test(c.textContent) }; });
check('Friend profile → Card: their card from what friends can read (badge, name, hours, streaks, charts); no bosses/featured (not public)', fc && fc.name === '@James' && fc.tiles === 3 && fc.heat && !fc.feat && !fc.bosses, JSON.stringify(fc));
await A.p.screenshot({ path: 's113/v113b-friendcard.png' });
// minimal
await A.ev(() => { S.settings.gamification = false; applyMinimal(); showTab('profile'); });
await wait(500);
const mc = await A.ev(() => { const c = $('#profileHead .pcard'); return { mini: c.classList.contains('pc-mini'), badge: !!$('.aura', c) || !!$('.pc-lv', c), feat: !!$('.pc-feat', c), bosses: /Bosses|plants/.test(c.textContent), d: cardData() }; });
check('True Minimalist: a clean card — no level/tier/aura, no featured, no bosses or garden (in the link too)', mc.mini && !mc.badge && !mc.feat && !mc.bosses && mc.d.m === 1 && !mc.d.lv && !mc.d.ft && !mc.d.bd, JSON.stringify(Object.keys(mc.d)));
const minLink = await A.ev(() => cardLink(cardData()));
await A.ev(() => { S.settings.gamification = true; applyMinimal(); });
await A.ctx.close();
// ---------- opening links: a fresh browser, logged out ----------
async function openLink(name, link, w = 390, opt = {}) {
  const B = await ctxOf(name, w, opt);
  const reqs = [];
  B.p.on('request', r => { if (!/^http:\/\/localhost:8000\/index\.html/.test(r.url()) && !/^data:/.test(r.url())) reqs.push(r.url().slice(0, 90)); });
  await B.p.goto(link); await wait(1200);
  return { B, reqs };
}
let { B, reqs } = await openLink('link', full);
const sv = await B.ev(() => ({ view: ['bootView', 'authView', 'appView', 'cardView'].filter(v => !$('#' + v).classList.contains('hidden')), name: ($('#cvCard .pc-name') || {}).textContent, fb: !!(window.FB && FB.db), user: typeof USER === 'undefined' ? 'x' : USER, ls: Object.keys(localStorage).filter(k => !/theme|glass|motion|calm/.test(k)), title: document.title, w: document.documentElement.scrollWidth <= innerWidth }));
check('Card link in a fresh, logged-out browser: the read-only card, no login', sv.view.join() === 'cardView' && sv.name === '@demo_scholar' && !sv.user && sv.w, JSON.stringify(sv));
check('… and no Firebase (nothing loaded, zero network requests beyond the page)', !sv.fb && !reqs.length, JSON.stringify(reqs));
await B.p.screenshot({ path: 's113/v113b-link.png', fullPage: true });
await B.p.click('#cvMake'); await wait(1500);
check('“Make your own: free” goes to the welcome page', await B.ev(() => !$('#authView').classList.contains('hidden') && !/#card=/.test(location.href)));
await B.ctx.close();
({ B, reqs } = await openLink('minlink', minLink, 1280, { dark: true }));
check('Minimal card link: clean card, no level or featured', await B.ev(() => !!$('#cvCard .pc-mini') && !$('#cvCard .pc-lv') && !$('#cvCard .pc-feat')) && !reqs.length);
await B.ctx.close();
// hostile + broken links
const evil = 'http://localhost:8000/index.html#card=' + Buffer.from(JSON.stringify({ v: 1, n: '<img src=x onerror=alert(1)>', c: 'javascript:alert(1)', t: '"><script>alert(2)</script>', lv: 1e9, tr: 'god', av: '../x', fr: '<b>', st: 'card_x', bn: 'bs:"><svg onload=alert(3)>', h: 'NaN', cs: -5, ls: 1e12, wk: [1, 2, 3, '<i>', 5, 6, 7], wd: '2026-10-16', hm: '0123x', hs: '2026', sj: [['<img src=x onerror=alert(4)>', 50], ['ok', '<b>']], ft: ['fm:dragon', 'fa:<x>', 'fe:../../'], bt: '<u>' })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
({ B, reqs } = await openLink('evil', evil));
const ex = await B.ev(() => ({ imgs: $$('#cvCard img').length, scripts: $$('#cvCard script').length, onl: $$('#cvCard [onerror],#cvCard [onload]').length, name: ($('#cvCard .pc-name') || {}).textContent, subj: $$('#cvCard .pc-subj li span').map(x => x.textContent), lv: ($('#cvCard .pc-lv') || {}).textContent, feat: $$('#cvCard .pc-chip').length, title: !!$('#cvCard .pc-title') }));
check('A hostile link is neutralised: no injected elements or handlers; bad ids/numbers dropped; text shown as text', !ex.imgs && !ex.scripts && !ex.onl && ex.name === 'Pomodorolist user' && ex.subj[0] === '<img src=x onerror=alert(4)>' && /Level 999/.test(ex.lv) && ex.feat === 1 && !ex.title, JSON.stringify(ex));
await B.ctx.close();
({ B } = await openLink('cut', full.slice(0, -30)));
check('A cut-off link shows “This card link doesn’t work” and the button', await B.ev(() => /doesn’t work/.test($('#cvCard').textContent) && !$('#cvMake').classList.contains('hidden')));
await B.ctx.close();
// Web Share on a phone
({ B } = await openLink('phone', 'http://localhost:8000/index.html?emulator=1', 390, { touch: true, init: () => { window.__shared = []; navigator.share = async d => { window.__shared.push({ url: d.url || '', files: (d.files || []).length }); }; navigator.canShare = d => true; } }));
await B.p.waitForSelector('#previewBtn', { state: 'visible' }); await B.p.click('#previewBtn'); await B.p.waitForSelector('#appView:not(.hidden)'); await wait(2000);
await B.ev(() => { PV.on = false; document.querySelectorAll('dialog[open]').forEach(x => x.close()); openShareDlg(); });
await wait(400);
check('Phone: Web Share is offered', await B.ev(() => !$('#shNative').classList.contains('hidden')));
await B.ev(() => $('#shLink').click()); await wait(300);
await B.ev(() => $('#shNative').click()); await wait(1500);
const shared = await B.ev(() => window.__shared);
check('Phone: “Share link” uses the share sheet with the card link; “Share…” shares the PNG file', shared.length === 2 && /#card=/.test(shared[0].url) && shared[1].files === 1, JSON.stringify(shared));
await B.p.screenshot({ path: 's113/v113b-share-390.png' });
await B.ctx.close();
log('errors', JSON.stringify(errs), '| failures', fails);
await b.close();
process.exit(fails ? 1 : 0);   // v2.0: a failing check fails the suite (it used to exit 0)
