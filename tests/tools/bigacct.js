// A large account for performance work (v2.0 phase 4). Page-side: load this file into the page, call bigAccount(),
// then startPreview(). It wraps the demo account's own data builders, so the result is still the read-only demo
// (nothing is written anywhere), only much bigger:
//   2 years of sessions (about 3,000), 400 harvests, 50 friends, 40 clan members, 150 posts, 80 inbox items,
//   120 reminders, 240 to-dos, 8 decks with 800 cards, 40 parked thoughts, 12 exams, 30 revision plans.
// Deterministic (its own little generator), so two runs measure the same thing.
window.bigAccount = function (o = {}) {
  const years = o.years || 2, nFriends = o.friends || 50;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, pickOf = a => a[Math.floor(rnd() * a.length)];
  const SUBJ = ['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Computer Science'];
  const origSessions = demoSessions;
  window.demoSessions = function () {
    const recent = origSessions(), out = [], today = startOfDay(new Date());
    for (let d = years * 365; d > 84; d--) {
      if (rnd() < 0.12) continue;   // a day off now and then
      const date = addDays(today, -d), n = 3 + Math.floor(rnd() * 4);
      let h = 6 + Math.floor(rnd() * 3), k = 0;
      for (let i = 0; i < n && h < 22; i++) {
        const len = pickOf([25, 50, 50, 25, 45, 30]), st = new Date(date); st.setHours(h, Math.floor(rnd() * 40), 0, 0);
        out.push({ id: `big${d}_${k++}`, name: pickOf(SUBJ), start: +st, end: +st + len * 6e4, duration: len * 6e4, planned: len * 6e4, preset: len >= 45 ? 'Deep Work 50/10' : 'Classic 25/5',
          stamp: pickOf(['stamp_pixel', 'stamp_tomato', 'stamp_classic']) });
        h += len >= 45 ? 2 : 1 + Math.floor(rnd() * 2);
      }
    }
    return out.concat(recent);
  };
  const origDocs = demoDocs;
  window.demoDocs = function () {
    const docs = origDocs(), u = docs['users/demo'], now = Date.now(), day = 864e5;
    const ts = ms => ({ toMillis: () => ms, toDate: () => new Date(ms) });
    const clone = v => JSON.parse(JSON.stringify(v, (k, x) => (x && x.toMillis ? { __ts: x.toMillis() } : x)), (k, x) => (x && x.__ts !== undefined ? ts(x.__ts) : x));
    const NAMES = ['Aarav', 'Diya', 'Kabir', 'Meera', 'Rohan', 'Sana', 'Vikram', 'Anika', 'Dev', 'Ishita', 'Karthik', 'Lakshmi', 'Nikhil', 'Priya', 'Rahul', 'Sneha', 'Tarun', 'Uma', 'Varun', 'Zoya'];
    // ---- friends: the five demo friends, cloned ----
    const fids = [];
    for (let i = 6; i <= nFriends; i++) {
      const src = 'demo_f' + (1 + (i % 5)), id = 'demo_f' + i, name = NAMES[i % NAMES.length] + '_' + i;
      fids.push(id);
      for (const col of ['publicProfiles', 'publicStats', 'rankStats', 'activity', 'presence']) {
        const d = clone(docs[col + '/' + src]); if (!d) continue;
        if ('username' in d) d.username = name;
        if (typeof d.level === 'number') d.level = 1 + Math.floor(rnd() * 40);
        if (typeof d.streak === 'number') d.streak = Math.floor(rnd() * 90);
        if (typeof d.hours === 'number') d.hours = Math.round(rnd() * 9000) / 10;
        if (typeof d.weekMin === 'number') d.weekMin = Math.floor(rnd() * 1800);
        if (typeof d.dayMin === 'number') d.dayMin = Math.floor(rnd() * 300);
        if (typeof d.seasonMin === 'number') d.seasonMin = Math.floor(rnd() * 9000);
        if (col === 'presence') { d.visible = true; if (i % 7) d.now = null; }
        docs[col + '/' + id] = d;
      }
      const f = clone(docs['friendships/demo_' + src]); f.users = ['demo', id]; f.from = id; f.fromName = name; docs['friendships/demo_' + id] = f;
    }
    // ---- posts: 150 over the last four weeks ----
    const postKeys = Object.keys(docs).filter(k => k.startsWith('posts/'));
    const aud = ['demo', ...Array.from({ length: nFriends }, (x, i) => 'demo_f' + (i + 1))];
    for (const k of postKeys) docs[k].aud = aud;
    for (let i = 0; i < 150; i++) {
      const src = docs[postKeys[i % postKeys.length]], p = clone(src), a = 1 + (i % nFriends), at = now - Math.floor(rnd() * 27 * day) - 36e5;
      p.author = 'demo_f' + a; p.authorName = (docs['publicProfiles/demo_f' + a] || {}).username || 'Friend ' + a; p.at = ts(at); p.day = dayKey(new Date(at)); p.ref = (p.ref || 'x') + '.b' + i; p.r = i % 3 ? {} : { demo: '🔥' };
      docs['posts/' + p.type + '_' + p.author + '_' + p.ref] = p;
    }
    // ---- inbox ----
    for (let i = 0; i < 80; i++) { const it = clone(docs['inbox/demo/items/k1']); it.from = 'demo_f' + (1 + (i % nFriends)); it.fromName = NAMES[i % NAMES.length]; it.createdAt = ts(now - i * 5 * 36e5); docs['inbox/demo/items/big' + i] = it; }
    // ---- clan: 40 members, 60 feed entries ----
    for (let i = 6; i <= 40; i++) { const m = clone(docs['clans/demo_clan/members/demo_f1']); m.name = NAMES[i % NAMES.length] + '_' + i; m.role = i % 9 ? 'member' : 'officer'; m.contrib = Math.floor(rnd() * 4000); m.weekMin = Math.floor(rnd() * 900); m.moMin = m.weekMin * 3; docs['clans/demo_clan/members/demo_f' + i] = m; }
    if (docs['clans/demo_clan'] && typeof docs['clans/demo_clan'].members === 'number') docs['clans/demo_clan'].members = 41;
    for (let i = 0; i < 60; i++) { const e = clone(docs['clans/demo_clan/feed/demo_e' + (i % 6)]); e.at = ts(now - (i + 6) * 4 * 36e5); e.who = NAMES[i % NAMES.length]; docs['clans/demo_clan/feed/big_e' + i] = e; }
    // ---- the account's own lists ----
    const hSrc = u.plants.filter(p => p.h), SP = [...new Set(u.plants.map(p => p.sp).filter(Boolean))];
    for (let i = 0; i < 400; i++) { const p = clone(hSrc[i % hSrc.length]), h = now - (8 + i * 1.6) * day; Object.assign(p, { id: 'big_h' + i, sp: SP[i % SP.length], at: h - 3 * day, h, u: h, y: 4 + Math.floor(rnd() * 20), m: i % 9 ? '' : 'golden', wm: i % 13 ? [] : ['shocked'] }); u.plants.push(p); }
    for (let i = 0; i < 120; i++) { const r = clone(u.reminders[i % u.reminders.length]), d = new Date(now + (i - 30) * day); Object.assign(r, { id: 'big_r' + i, title: pickOf(SUBJ) + ' — ' + pickOf(['revision', 'PYQs', 'mock test', 'notes', 'formula sheet']) + ' ' + i, date: dayKey(d), time: pad(6 + (i % 15)) + ':' + pad((i * 7) % 60), repeat: pickOf(['none', 'none', 'daily', 'weekly']) }); u.reminders.push(r); }
    for (let i = 0; i < 240; i++) { const t = clone(u.todos[i % u.todos.length]); Object.assign(t, { id: 'big_t' + i, title: pickOf(SUBJ) + ': ' + pickOf(['chapter', 'worksheet', 'lab record', 'essay', 'problem set']) + ' ' + i, due: i % 4 ? dayKey(new Date(now + (i % 40 - 10) * day)) : '', pri: pickOf(['high', 'med', 'low', '']), tag: pickOf(SUBJ), done: i % 3 === 0 ? now - i * 36e5 : 0, order: 10 + i, created: now - i * 5 * 36e5, u: now - i * 36e5 }); u.todos.push(t); }
    for (let k = 0; k < 8; k++) {
      const dk = clone(u.decks[0]); Object.assign(dk, { id: 'big_dk' + k, name: SUBJ[k % SUBJ.length] + ' deck ' + (k + 1), subject: SUBJ[k % SUBJ.length] }); u.decks.push(dk);
      for (let i = 0; i < 100; i++) { const c = clone(u.cards[0]); Object.assign(c, { id: 'big_cd' + k + '_' + i, deck: dk.id, f: `Question ${i + 1} of deck ${k + 1}: what is the result of step ${i}?`, b: `Answer ${i + 1}: a short explanation of about one line.`, due: i % 2 ? dayKey(new Date(now + (i % 20 - 5) * day)) : '', ivl: i % 12, reps: i % 6 }); u.cards.push(c); }
    }
    for (let i = 0; i < 40; i++) u.parked.push({ id: 'big_p' + i, text: 'A thought to come back to, number ' + (i + 1), at: now - i * 7 * 36e5, done: i % 4 === 0 });
    for (let i = 0; i < 12; i++) u.exams.push({ id: 'big_x' + i, name: pickOf(SUBJ) + ' unit test ' + (i + 1), date: dayKey(new Date(now + (5 + i * 9) * day)), added: now - i * day });
    for (let i = 0; i < 30; i++) { const v = clone(u.revisions[0]); Object.assign(v, { id: 'big_v' + i, topic: pickOf(SUBJ) + ' topic ' + (i + 1), next: dayKey(new Date(now + (i % 14) * day)), step: i % 5 }); u.revisions.push(v); }
    return docs;
  };
};
