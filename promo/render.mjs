// Render promo.html frame by frame (every frame is seek(t), so there is no real-time capture and no stutter).
//   node render.mjs --fmt landscape|portrait --out out/promo-16x9.mp4 [--fps 60] [--crf 17] [--preset slow] [--scale 1]
//   node render.mjs --fmt landscape --stills 0.8,2.6,4.5 --dir out/stills       (PNG stills for review)
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const fmt = arg('fmt', 'landscape'), fps = +arg('fps', 60), crf = +arg('crf', 17), preset = arg('preset', 'slow'), scale = +arg('scale', 1);
const W = fmt === 'portrait' ? 1080 : 1920, H = fmt === 'portrait' ? 1920 : 1080;
const stills = arg('stills', ''), dir = arg('dir', path.join(HERE, 'out', 'stills')), out = arg('out', path.join(HERE, 'out', `promo-${fmt === 'portrait' ? '9x16' : '16x9'}.mp4`));
const total = +arg('total', 30);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: Math.round(W * scale), height: Math.round(H * scale) }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on('pageerror', e => console.error('page error:', e.message));
await p.goto('file://' + path.join(HERE, 'promo.html') + `?fmt=${fmt}`);
await p.evaluate(() => window.ready);
if (scale !== 1) await p.evaluate(k => { document.getElementById('stage').style.transform = `scale(${k})`; }, scale);
if (stills) {
  fs.mkdirSync(dir, { recursive: true });
  for (const ts of stills.split(',')) { const t = +ts; await p.evaluate(t => seek(t), t); await p.screenshot({ path: path.join(dir, `${fmt}-${t.toFixed(2)}.png`), type: 'png' }); }
  console.log('stills in', dir);
} else {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const n = Math.round(total * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-frames:v', String(n), '-c:v', 'libx264', '-preset', preset, '-crf', String(crf), '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2', '-movflags', '+faststart', '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < n; f++) {
    await p.evaluate(t => seek(t), f / fps);
    const png = await p.screenshot({ type: 'png' });
    if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 300 === 0) console.log(`frame ${f}/${n} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));
  console.log('wrote', out, `in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
await b.close();
