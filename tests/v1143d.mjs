// v1.14.3 before its rules are published: with the 1.14.2 rules still live, a 1.14.3 app's clan focus still counts
// (it retries once without the new raid-hit fields). Swaps the emulator's rules, then puts the 1.14.3 rules back.
import fs from 'fs';
import { b, device, signup, wait, log, check, errs, failCount, focus, ownerGet } from './cl-common.mjs';
const S = '/tmp/claude-0/-home-user-claude/24ffcc98-6b94-5cf9-9f38-83a211e86577/scratchpad/';
const R = Date.now().toString(36).slice(-4);
const A = await device('A', 1200);
await signup(A, 'od_' + R);
await A.ev(n => clanCreate({ name: n, tag: 'OLDR', desc: 'jee' }), 'Old Rules ' + R);
const cid = await A.ev(() => CLAN.id), uid = await A.ev(() => USER.uid);
fs.copyFileSync(S + 'v1142/firestore.rules', 'firestore.rules'); await wait(4000);   // the emulator hot-reloads rules
try {
  await focus(A, 25); await wait(3000); await A.ev(() => flushContrib()); await wait(3000);
  const c = await ownerGet('clans/' + cid), m = await ownerGet(`clans/${cid}/members/${uid}`);
  check('With the 1.14.2 rules, a 1.14.3 app’s focus still reaches the clan (XP and month minutes)', c.xp === 25 && c.monthMin === 25 && m.contrib === 25, JSON.stringify([c.xp, c.monthMin, m.contrib]));
  check('…without the new raid-hit fields (the old rules don’t know them)', m.moKey === null || m.moKey === undefined, JSON.stringify(m.moKey));
} finally {
  fs.copyFileSync('/home/user/claude/firestore.rules', 'firestore.rules'); await wait(4000);   // back to the repository's current rules (v1.18: the 1.14.3 copy is stale — it trips the rules budget from November 2026)
}
log('rules restored to the repository copy:', fs.readFileSync('firestore.rules', 'utf8') === fs.readFileSync('/home/user/claude/firestore.rules', 'utf8'));
log('errors', JSON.stringify(errs.filter(e => !/clan contribution|permission/i.test(e))));
log('failures', failCount());
await b.close();
process.exit(failCount() ? 1 : 0);
