// v1.14.1 cosmetics audit: every item's id fits the rules (≤ 30 chars), has a renderer, shows in the bag when owned,
// equips and unequips; every public cosmetic (aura, name colour, avatar, frame) renders from a public profile the same
// way it renders for its owner. Then a gallery: every boss aura (Solo + Squad) on a real leaderboard row and a real
// profile card, light + dark, animations on and off.  Usage: node v1141b.mjs [shots]
import { chromium } from 'playwright';
import fs from 'fs';
const FBDIR = new URL('./node_modules/firebase/', import.meta.url).pathname;
const SHOTS = process.argv.includes('shots');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const errs = [];
const check = (label, ok, extra = '') => { if (!ok) fails++; console.log(`${ok ? '✓' : '✗'} ${label}${extra ? ' — ' + extra : ''}`); };
async function open(scheme = 'light', w = 1180) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme });
  await ctx.addInitScript(() => { if (sessionStorage.getItem('i')) return; sessionStorage.setItem('i', 1); localStorage.setItem('pomodorolist-guest', '1'); localStorage.setItem('pomodorolist-tour-done', '1'); localStorage.setItem('pomodorolist-onboarded:guest', '1'); localStorage.setItem('pomodorolist-seen-version', '9.9'); localStorage.setItem('pomodorolist-intro-seen', '1'); const d = new Date(), z = n => String(n).padStart(2, '0'); localStorage.setItem('pomodorolist-login-later', d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate())); });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(FBDIR + r.request().url().split('/').pop()), contentType: 'application/javascript' }));
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160)); });
  await p.goto('http://localhost:8000/index.html'); await p.waitForSelector('#appView:not(.hidden)'); await wait(1200);
  await p.evaluate(() => document.querySelectorAll('dialog[open]').forEach(x => x.close()));
  return { ctx, p };
}
// ---------- 1. Every item ----------
{
  const { ctx, p } = await open();
  const r = await p.evaluate(() => {
    const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules].map(r => r.cssText); } catch (e) { return []; } }).join('\n');
    const out = { long: [], noRender: [], notInBag: [], equip: [], pub: [], n: 0 };
    const t = Date.now();
    for (const it of ITEMS) if (it.price !== 0 && it.cat !== 'freeze') S.game.grants[it.id] = { src: 'test', at: t };   // own everything
    // clan cosmetics need a clan
    Object.assign(CLAN, { id: 'c1', doc: { name: 'Test', tag: 'TEST', level: 30, raids: { '2026-01': 'titan', '2026-02': 'leviathan', '2026-03': 'colossus' } }, me: { id: USER.uid, role: 'leader', joinedAt: 0 } });
    G = null;
    const bagIds = new Set(bagItems().map(x => x.it.id));
    const keep = { renderBag, applyCosmetics, save, toast, uiSound, uiClaim, renderShop };   // only the UI side effects are skipped during the loop
    for (const k of Object.keys(keep)) window[k] = () => {};
    for (const it of ITEMS) {
      out.n++;
      if (it.id.length > 30) out.long.push(it.id);
      let ok = true;
      if (it.cat === 'aura') ok = it.id === 'au_streak' || (!!SPECIAL_AURAS[it.id] && css.includes('.aura-x-' + it.id) && css.includes('.aura-x-' + it.id + ' { outline'));
      else if (it.cat === 'color') ok = it.id === 'col_default' || !!NAME_GRADS[it.id] || !!NAME_COLORS[it.id];
      else if (it.cat === 'avatar') ok = it.id === 'av_default' || !!AVATAR_ART[it.id];
      else if (it.cat === 'frame') ok = it.id === 'frame_none' || FRAMES[it.id] !== undefined;
      else if (it.cat === 'title') ok = it.id === 'ti_none' || !!TITLE_TEXT[it.id];
      else if (it.cat === 'stamp') ok = stampArt(it.id) !== STAMP_ART.stamp_classic || it.id === 'stamp_classic';
      else if (it.cat === 'card') ok = it.id === 'card_minimal' || !!CARD_STYLES[it.id];
      else if (it.cat === 'theme') ok = typeof themeVars === 'function' ? !!themeVars(it.id) : true;
      if (!ok) out.noRender.push(it.cat + ':' + it.id);
      if (it.price !== 0 && it.cat !== 'freeze' && !bagIds.has(it.id)) out.notInBag.push(it.id);
      // equip / unequip
      if (it.price !== 0 && it.cat !== 'freeze') {
        if (it.cat === 'extra') { const was = extraOn(it.id); toggleExtra(it.id); const on = extraOn(it.id); toggleExtra(it.id); if (on === was || extraOn(it.id) !== was) out.equip.push(it.id); }
        else if (it.cat === 'room') { const slot = roomSlotOf(it.id); bagEquip(it.id); const on = roomSlot(slot) === it.id, at = S.roomPrefs[slot] && S.roomPrefs[slot].u; roomRemove(slot); const off = roomSlot(slot) === ROOM_DEFAULT[slot]; if (!on || !off || !at) out.equip.push(it.id); }   // room items live in slots (1.15), not in game.equipped
        else { bagEquip(it.id); const on = equippedId(it.cat) === it.id; if (DEFAULTS[it.cat]) bagUnequip(it.cat); const off = !DEFAULTS[it.cat] || equippedId(it.cat) === DEFAULTS[it.cat]; if (!on || !off || !S.game.eqAt[it.cat]) out.equip.push(it.id); }
      }
      // public cosmetics: rendered for someone else from their public profile exactly as for the owner
      if (['aura', 'color', 'avatar', 'frame'].includes(it.cat) && it.price !== 0) {
        const prof = { username: 'pal', tier: 'focused', level: 9, avatar: 'av_owl', frame: 'frame_none', color: 'col_default', streak: 0, updatedAt: { toMillis: () => 1 } };
        prof[it.cat] = it.id;
        SOC.cache['publicProfiles/pal1'] = { v: prof, at: Date.now() };
        const L = personLook('pal1', 'pal'), html = lookPic(L, 30) + lookName(L);
        const good = it.cat === 'aura' ? html.includes('aura-x-' + it.id) && (!it.id.endsWith('_sq') || html.includes('aura-sq'))
          : it.cat === 'color' ? html.includes('nc-' + it.id) || html.includes('color:' + NAME_COLORS[it.id])
          : it.cat === 'avatar' ? html.includes(avatarArt(it.id).slice(0, 50))
          : html.includes(FRAMES[it.id].slice(0, 30));
        if (!good) out.pub.push(it.id);
      }
    }
    Object.assign(window, keep);
    return out;
  });
  check(`All ${r.n} cosmetic ids fit the rules’ 30-character limit (no migration needed)`, !r.long.length, r.long.join());
  check('Every cosmetic has a renderer (aura CSS incl. its ring, colour, avatar art, frame, title, stamp, card style)', !r.noRender.length, r.noRender.join());
  check('Every owned cosmetic appears in the bag', !r.notInBag.length, r.notInBag.join());
  check('Every cosmetic equips and unequips (and records when, for sync)', !r.equip.length, r.equip.join());
  check('Every public cosmetic renders for other people from their public profile', !r.pub.length, r.pub.join());
  // animations off: auras stay visible (static ring + glow), squad shimmer still drawn
  const off = await p.evaluate(() => {
    localStorage.setItem(MOTION_KEY, 'off'); applyMotion();
    const el = document.createElement('div'); el.innerHTML = withAura(badgeSVG(TIERS[2], { size: 26 }), 0, 'au_b_sloth_sq') + withAura(badgeSVG(TIERS[2], { size: 26 }), 0, 'au_b_sloth');
    document.body.appendChild(el);
    const [sq, so] = el.querySelectorAll('.aura'), cs = getComputedStyle(sq), cs2 = getComputedStyle(so), af = getComputedStyle(sq, '::after');
    const r = { sqOutline: cs.outlineStyle + ' ' + cs.outlineWidth, soOutline: cs2.outlineStyle + ' ' + cs2.outlineWidth, shimmer: af.content !== 'none' && af.backgroundImage.includes('conic'), anim: getComputedStyle(sq, '::before').animationName };
    el.remove(); return r;
  });
  check('Animations Off: auras stay visible and static (Squad: double ring + shimmer arc; Solo: one ring)', off.sqOutline.startsWith('double') && off.soOutline.startsWith('solid') && off.shimmer && off.anim === 'none', JSON.stringify(off));
  await ctx.close();
}
// ---------- 2. Gallery: every boss aura on a real leaderboard row and a real profile card ----------
const gallery = async (scheme, motion, glass) => {
  const { ctx, p } = await open(scheme);
  await p.evaluate(([m, g]) => {
    localStorage.setItem(MOTION_KEY, m); applyMotion();
    if (g) { localStorage.setItem('pomodorolist-glass', 'full'); if (typeof applyGlass === 'function') applyGlass(); }
    const rows = BOSSES.flatMap(bs => ['', '_sq'].map(sfx => {
      const id = 'au_b_' + bs.id + sfx, a = SPECIAL_AURAS[id];
      SOC.cache['publicStats/u' + id] = { v: { username: bs.short.toLowerCase() + (sfx ? '_squad' : '_solo'), tier: 'disciplined', level: 18, avatar: 'av_b_' + bs.id + sfx, frame: 'frame_orbit', color: sfx ? 'col_b_' + bs.id : 'col_default', aura: id, updatedAt: { toMillis: () => 2 } }, at: Date.now() };
      const L = personLook('u' + id);
      const card = cardHTML({ v: 1, n: L.name, c: L.color, lv: 18, tr: 'disciplined', av: L.avatar, fr: 'frame_orbit', st: 'card_minimal', bn: 'bn_mint', au: id, h: 120, cs: 12, ls: 30 }, 'preview');
      return `<div class="g-item"><div class="g-l"><b>${esc(bs.short)} · ${sfx ? 'Squad' : 'Solo'}</b> <span class="lbl">${RARITY_LABEL[bossRarity(bs.id, sfx ? 'squad' : 'solo')]} · level ${a.lv}</span></div>
        <ol class="lb"><li><span class="rk">1</span>${lookPic(L, 26)}<span class="nm-row">${lookName(L)}</span><span class="v">12h 30m</span></li></ol><div class="g-card">${card}</div></div>`;
    })).join('');
    const host = document.createElement('div');
    host.id = 'gal';
    host.innerHTML = `<style>#gal{position:absolute;inset:0;z-index:999;background:var(--bg);padding:16px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px;align-content:start}
      #gal .g-item{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px;min-width:0}#gal .g-l{font-size:12.5px;margin-bottom:6px}
      #gal .g-card{transform:scale(.62);transform-origin:top left;width:161%;height:190px;overflow:hidden;margin-bottom:-60px}#gal .lb li{padding:6px 4px}</style>${rows}`;
    document.body.appendChild(host);
    document.documentElement.style.overflow = 'auto';
    window.scrollTo(0, 0);
  }, [motion, glass]);
  await wait(900);
  const h = await p.evaluate(() => document.getElementById('gal').scrollHeight);
  await p.setViewportSize({ width: 1180, height: Math.min(h + 20, 6000) });
  await wait(400);
  await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(x => x.close()); $$('.pomeo-bubble, #toast').forEach(x => x.classList.add('hidden')); });
  await wait(300);
  if (SHOTS) await p.screenshot({ path: `aura-gallery-${scheme}${motion === 'off' ? '-still' : ''}${glass ? '-glass' : ''}.png`, fullPage: true });
  const bad = await p.evaluate(() => [...document.querySelectorAll('#gal .g-item')].filter(it => it.querySelectorAll('.aura[class*="aura-x-au_b_"]').length < 2).length);
  check(`Gallery (${scheme}${motion === 'off' ? ', animations off' : ''}${glass ? ', Glossed Interface' : ''}): all 20 boss auras render on a leaderboard row and a profile card`, bad === 0, 'missing: ' + bad);
  await ctx.close();
};
await gallery('light', 'full');
await gallery('dark', 'full', true);
await gallery('dark', 'off');
console.log('errors', JSON.stringify(errs.slice(0, 10)));
await b.close();
process.exit(fails || errs.length ? 1 : 0);
