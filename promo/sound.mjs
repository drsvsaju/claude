// Code-generated sound design (no samples, no music): soft whooshes on scene changes, a gentle chime on the harvest,
// pops on the badges and the Pomeo pops, a tick-tock under the timer, a thud on the boss hit. Writes a 48 kHz stereo WAV.
//   node sound.mjs out/sfx.wav
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TL = createRequire(import.meta.url)('./timeline.js');
const SR = 48000, N = Math.round(TL.total * SR), L = new Float32Array(N), R = new Float32Array(N);
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296 * 2 - 1;   // deterministic noise
const add = (t0, dur, fn, pan = 0, gain = 1) => {   // fn(tau, i) → sample for tau in [0, dur)
  const s0 = Math.round(t0 * SR), n = Math.round(dur * SR), gl = gain * (1 - Math.max(0, pan)) , gr = gain * (1 + Math.min(0, pan));
  for (let i = 0; i < n && s0 + i < N; i++) { const v = fn(i / SR, i); L[s0 + i] += v * gl; R[s0 + i] += v * gr; }
};
const env = (tau, a, d, dur) => tau < a ? tau / a : tau > dur - d ? Math.max(0, (dur - tau) / d) : 1;
// one-pole low-pass on a noise stream (a "whoosh": filtered noise with a moving cutoff)
function whoosh(t0, dur = .55, gain = .22, pan = 0, dir = 1) {
  let lp = 0, lp2 = 0;
  add(t0, dur, tau => { const x = tau / dur, cut = dir > 0 ? 0.02 + 0.25 * Math.sin(x * Math.PI) : 0.25 - 0.22 * x; lp += cut * (rnd() - lp); lp2 += cut * (lp - lp2); return lp2 * 4 * Math.sin(x * Math.PI) ** .7; }, pan, gain);
}
function chime(t0, notes, gain = .16, pan = 0) {   // soft bell: sine + a quiet 3rd harmonic, slow decay
  notes.forEach((f, k) => add(t0 + k * .11, 1.4, tau => (Math.sin(2 * Math.PI * f * tau) + .25 * Math.sin(2 * Math.PI * f * 3.01 * tau) * Math.exp(-tau * 9)) * Math.exp(-tau * 3.2) * Math.min(1, tau / .004), pan, gain));
}
function pop(t0, f = 520, gain = .2, pan = 0) {   // a short pitch-dropping blip
  add(t0, .13, tau => Math.sin(2 * Math.PI * (f * Math.exp(-tau * 18) + f * .5) * tau) * Math.exp(-tau * 28) * Math.min(1, tau / .002), pan, gain);
}
function thud(t0, gain = .35) {   // a boss hit: a low sine drop plus a noise click
  add(t0, .35, tau => Math.sin(2 * Math.PI * (120 * Math.exp(-tau * 9) + 42) * tau) * Math.exp(-tau * 10) * Math.min(1, tau / .002), 0, gain);
  add(t0, .06, tau => rnd() * Math.exp(-tau * 90), 0, gain * .5);
}
function tick(t0, gain = .07) { add(t0, .03, tau => Math.sin(2 * Math.PI * 1900 * tau) * Math.exp(-tau * 220), .3, gain); }
function sparkle(t0, gain = .09) { for (let k = 0; k < 7; k++) add(t0 + k * .09, .5, tau => Math.sin(2 * Math.PI * (1400 + 300 * k) * tau) * Math.exp(-tau * 14) * Math.min(1, tau / .003), (k % 2 ? .4 : -.4), gain); }

// ---- the cue sheet (from timeline.js) ----
for (let i = 0; i < 'Studying feels like a grind?'.length; i++) tick(.15 + i * (1.2 / 28), .05);   // the typing
whoosh(TL.hook.snap, .45, .2, 0, 1);
pop(TL.hook.pomeo, 640, .22, .35);
whoosh(TL.timer.start, .6, .22, .3, 1);
for (let k = 0; k < 10; k++) tick(TL.timer.start + 1.0 + k * .32, .06);   // the ring fills
whoosh(TL.garden.start - .2, .7, .24, 0, 1);
TL.garden.stages.slice(1).forEach((t, k) => pop(t, 380 + k * 60, .09, -.2));   // each growth stage
chime(TL.garden.harvest, [659.25, 783.99, 1046.5], .15, .1);   // E5 G5 C6
sparkle(TL.garden.sparkle);
pop(TL.garden.pet, 700, .18, .4);
whoosh(TL.boss.start, .6, .22, 0, -1);
thud(TL.boss.hit);
whoosh(TL.together.start, .6, .22, -.3, 1);
pop(TL.together.podium, 480, .14, .3); pop(TL.together.podium + .12, 600, .12, .3); pop(TL.together.podium + .24, 720, .12, .3);
whoosh(TL.montage.start, .5, .2, 0, 1);
TL.montage.items.forEach((_, i) => whoosh(TL.montage.start + .25 + i * TL.montage.step, .3, .11, i % 2 ? .3 : -.3, 1));
whoosh(TL.promise.start, .55, .2, 0, -1);
TL.promise.badges.forEach((t, i) => pop(t, 520 + i * 90, .24, 0));
pop(TL.promise.sub, 440, .1, 0);
whoosh(TL.end.start, .7, .24, 0, 1);
chime(TL.end.logo + .05, [523.25, 659.25, 783.99], .13, 0);
pop(TL.end.cta + .15, 760, .16, .4);

// ---- master: a touch of headroom, then 16-bit WAV ----
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const g = Math.min(1, .5 / Math.max(peak, 1e-6));   // −6 dBFS peak: mixed quietly under the user's music
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4); }
const out = process.argv[2] || path.join(HERE, 'out', 'sfx.wav');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buf);
console.log('wrote', out, `${TL.total}s, peak ${(20 * Math.log10(peak * g)).toFixed(1)} dBFS`);
