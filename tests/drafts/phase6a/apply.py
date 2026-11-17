# Phase 6a (intention, debrief, distraction tally, resume card): the patch for index.html.
#   python3 tests/drafts/phase6a/apply.py [path to index.html]     (default: the repo's; give a copy for a dry run)
# Every replacement asserts its anchor, so it either applies whole or stops before writing.
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
P = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', '..', 'index.html')
s = open(P, encoding='utf-8').read()
def rep(tag, old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (tag, n)
    s = s.replace(old, new)

# ---------- state ----------
rep('def-debrief', "    energy: {},     // sessionId -> focus check-in 1 (low) … 4 (locked in)\n",
    "    energy: {},     // sessionId -> focus check-in 1 (low) … 4 (locked in)\n"
    "    debrief: {},    // sessionId -> did you do what you intended: 1 yes · 2 partly · 3 not yet (v2.0)\n")
rep('def-timer', "focusStartedAt: 0, name: '', subtasks: [] },", "focusStartedAt: 0, name: '', subtasks: [], intent: '', dx: 0 },   // intent, dx: this block's intention and distraction tally (v2.0)")
rep('def-setting', "                allDayAt: '08:00' },   // when all-day reminders alert (v2.0)",
    "                allDayAt: '08:00',     // when all-day reminders alert (v2.0)\n"
    "                intent: true },        // intention before a block, debrief after it, distraction tally, resume card (v2.0)")
rep('norm-debrief', "  if (!out.energy || typeof out.energy !== 'object' || Array.isArray(out.energy)) out.energy = {};\n",
    "  if (!out.energy || typeof out.energy !== 'object' || Array.isArray(out.energy)) out.energy = {};\n"
    "  if (!out.debrief || typeof out.debrief !== 'object' || Array.isArray(out.debrief)) out.debrief = {};\n")
rep('norm-timer', "  if (!Array.isArray(out.timer.subtasks)) out.timer.subtasks = [];\n",
    "  if (!Array.isArray(out.timer.subtasks)) out.timer.subtasks = [];\n"
    "  if (typeof out.timer.intent !== 'string') out.timer.intent = '';\n")
rep('push', "    energy: recentEnergy(),\n", "    energy: recentEnergy(),\n    debrief: recentDebrief(),\n")
rep('merge', "  if (d.energy && typeof d.energy === 'object' && !Array.isArray(d.energy)) S.energy = { ...S.energy, ...d.energy };",
    "  if (d.energy && typeof d.energy === 'object' && !Array.isArray(d.energy)) S.energy = { ...S.energy, ...d.energy };\n"
    "  if (d.debrief && typeof d.debrief === 'object' && !Array.isArray(d.debrief)) S.debrief = { ...S.debrief, ...d.debrief };")
rep('import', "  for (const [k, v] of Object.entries(src.energy)) if (!S.energy[k] && v >= 1 && v <= 4) S.energy[k] = Math.round(v);\n",
    "  for (const [k, v] of Object.entries(src.energy)) if (!S.energy[k] && v >= 1 && v <= 4) S.energy[k] = Math.round(v);\n"
    "  for (const [k, v] of Object.entries(src.debrief || {})) if (!S.debrief[k] && v >= 1 && v <= 3) S.debrief[k] = Math.round(v);\n")

# ---------- the session record ----------
rep('log-fields', "    ...(otMin > 0 ? { ot: otMin } : {}),   // minutes of overtime in this block (v1.20; the duration includes them)\n",
    "    ...(otMin > 0 ? { ot: otMin } : {}),   // minutes of overtime in this block (v1.20; the duration includes them)\n"
    "    ...(intentOn() && (t.intent || '').trim() ? { int: t.intent.trim().slice(0, 100) } : {}),   // what \"done\" was meant to look like (private; v2.0)\n"
    "    ...(intentOn() && dxNow() > 0 ? { dx: dxNow() } : {}),   // \"I got distracted\" taps in this block (v2.0)\n")
rep('log-reset', "  const subRec = takeSubtasks();\n  if (subRec) s.subtasks = subRec;\n", "  const subRec = takeSubtasks();\n  if (subRec) s.subtasks = subRec;\n  t.dx = 0;\n")

# ---------- markup ----------
rep('m-intent', '          <button class="sub-toggle" id="subToggle" aria-expanded="false" aria-controls="subEd">+ Add subtasks</button>\n',
    '          <button class="sub-toggle" id="subToggle" aria-expanded="false" aria-controls="subEd">+ Add subtasks</button>\n'
    '          <button class="sub-toggle int-toggle" id="intToggle" aria-expanded="false" aria-controls="intEd">+ Add an intention</button>\n'
    '          <div class="int-ed hidden" id="intEd">\n'
    '            <label class="field" for="intInput">What will “done” look like for this block?</label>\n'
    '            <div class="int-row"><input type="text" id="intInput" maxlength="100" placeholder="e.g. finish Q1–15 and check the answers" autocomplete="off"><button type="button" class="iconbtn" id="intClear" aria-label="Remove the intention" title="Remove">×</button></div>\n'
    '            <div class="sub-hint">Only you see it. After the block you can tick whether you did it.</div>\n'
    '          </div>\n')
rep('m-debrief', '            <div class="energy hidden" id="energyRow" aria-live="polite"></div>\n',
    '            <div class="energy debrief hidden" id="debriefRow" aria-live="polite"></div>\n'
    '            <div class="energy hidden" id="energyRow" aria-live="polite"></div>\n')
rep('m-dx', ' <button class="iconbtn park-btn hidden" id="parkBtn" title="Park a distracting thought (P)" aria-label="Park a distracting thought"><span class="park-ic" aria-hidden="true">P</span></button>\n',
    ' <button class="iconbtn park-btn hidden" id="parkBtn" title="Park a distracting thought (P)" aria-label="Park a distracting thought"><span class="park-ic" aria-hidden="true">P</span></button>\n'
    ' <button class="iconbtn dx-btn hidden" id="dxBtn" title="I got distracted: count it (D). Nothing else happens." aria-label="I got distracted. Count it"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12c2.2-4 4.3-4 6.5 0s4.3 4 6.5 0 3.3-3 5-1.5"/></svg><b class="dx-n" id="dxN" aria-hidden="true"></b></button>\n')
rep('m-resume', '          <div class="qs-row hidden" id="quickStart" aria-label="Quick start a preset"></div>',
    '          <div id="resumeSlot"></div>\n          <div class="qs-row hidden" id="quickStart" aria-label="Quick start a preset"></div>')
rep('m-setting', '          <ui-select id="setEnergy" aria-label="Energy check-in"><option value="always">Always</option><option value="sometimes">Sometimes (every 3rd)</option><option value="off">Off</option></ui-select>\n        </div>\n',
    '          <ui-select id="setEnergy" aria-label="Energy check-in"><option value="always">Always</option><option value="sometimes">Sometimes (every 3rd)</option><option value="off">Off</option></ui-select>\n        </div>\n'
    '        <div class="setting" data-k="intention debrief goal done distraction tally resume pick up left off">\n'
    '          <div><div>Intention &amp; debrief</div><div class="desc">A one-line “what will done look like?” before a block, a tick after it, a quiet “I got distracted” counter, and “pick up where you left off”. Private.</div></div>\n'
    '          <input type="checkbox" id="setIntent" aria-label="Intention and debrief">\n'
    '        </div>\n')
rep('m-keys', '<kbd>P</kbd><span>Park a distracting thought (during focus)</span>', '<kbd>P</kbd><span>Park a distracting thought (during focus)</span>\n    <kbd>D</kbd><span>Count a distraction (during focus; nothing else happens)</span>')

# ---------- wiring ----------
rep('w-offer', "  renderSumHead();\n  renderEnergyRow(sessionId);\n", "  renderSumHead();\n  renderDebriefRow(sessionId);\n  renderEnergyRow(sessionId);\n")
rep('w-hide', "function hideNote() { noteFor = null; subSum = null; sumFor = null; energyFor = null; clearTimeout(energyT);", "function hideNote() { noteFor = null; subSum = null; sumFor = null; energyFor = null; clearTimeout(energyT); debriefFor = null; clearTimeout(debriefT);")
rep('w-maybe', "&& !(subSum && subSum.left.length) && !energyFor) hideNote();", "&& !(subSum && subSum.left.length) && !energyFor && !debriefFor) hideNote();")
rep('w-sum', "${[esc(s.name), sub, en, parked ? `${parked} parked thought${parked === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ')}",
    "${[esc(s.name), sub, en, parked ? `${parked} parked thought${parked === 1 ? '' : 's'}` : '', s.dx ? `${s.dx} distraction${s.dx === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ')}")
rep('w-day', "${S.notes[s.id] ? `<span class=\"note\">“${esc(S.notes[s.id])}”</span>` : ''}${s.subtasks && s.subtasks.length ?",
    "${s.int ? `<span class=\"intent\" title=\"Your intention for this block${S.debrief[s.id] ? ': ' + DEBRIEF[S.debrief[s.id]].t.toLowerCase() : ''}\">🎯 ${esc(s.int)}${S.debrief[s.id] ? ` <b>${DEBRIEF[S.debrief[s.id]].m}</b>` : ''}</span>` : ''}${s.dx ? `<span class=\"dx-tag\" title=\"You counted ${s.dx} distraction${s.dx === 1 ? '' : 's'} in this block\">${s.dx}×</span>` : ''}${S.notes[s.id] ? `<span class=\"note\">“${esc(S.notes[s.id])}”</span>` : ''}${s.subtasks && s.subtasks.length ?")
rep('w-ins', "      ${I.subjTop ? box('By subject', esc(I.subjTop.k) + ' feels best', I.subjLow && I.subjLow.k !== I.subjTop.k ? `${esc(I.subjLow.k)} is the toughest` : '') : ''}\n",
    "      ${I.subjTop ? box('By subject', esc(I.subjTop.k) + ' feels best', I.subjLow && I.subjLow.k !== I.subjTop.k ? `${esc(I.subjLow.k)} is the toughest` : '') : ''}\n"
    "      ${J.n >= 3 ? box('Intentions', `${J.done} of ${J.n} done`, J.partly ? `${J.partly} partly` : 'last 60 days') : ''}\n"
    "      ${J.dxPerHour !== null ? box('Distractions', `${J.dxPerHour.toFixed(1)} an hour`, J.worst ? `most in the ${J.worst.k}` : 'counted by you') : ''}\n")
rep('w-ins-j', "  const D = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];\n  const box = (k, v, s = '') =>",
    "  const D = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'], J = intentInsights();\n  const box = (k, v, s = '') =>")
rep('w-key', "  else if (k === 'p') { e.preventDefault(); openPark(); }", "  else if (k === 'p') { e.preventDefault(); openPark(); }\n  else if (k === 'd') { e.preventDefault(); addDistraction(); }")
rep('w-park', "  $('#parkBtn').classList.toggle('hidden', !focusActive());\n", "  $('#parkBtn').classList.toggle('hidden', !focusActive());\n  renderDx();\n")
rep('w-quick', "function renderQuickStart() {\n  const el = $('#quickStart');\n  if (!el || !USER) return;\n", "function renderQuickStart() {\n  const el = $('#quickStart');\n  if (!el || !USER) return;\n  renderResume(); renderIntent();   // the same moments: the timer's state has changed\n")
rep('w-set-render', "  $('#setEnergy').value = st.energy || 'always';\n", "  $('#setEnergy').value = st.energy || 'always';\n  $('#setIntent').checked = st.intent !== false;\n")
rep('w-set-handler', "$('#setEnergy').addEventListener('change', e => { S.settings.energy = e.target.value; save(); if (S.ui.tab === 'stats') renderStats(); });",
    "$('#setEnergy').addEventListener('change', e => { S.settings.energy = e.target.value; save(); if (S.ui.tab === 'stats') renderStats(); });\n"
    "$('#setIntent').addEventListener('change', e => { S.settings.intent = e.target.checked; save(); renderIntent(); renderResume(); renderDx(); });")

# ---------- the demo ----------
rep('demo-1', "  rec.forEach((s, i) => { energy[s.id] = new Date(s.start).getHours() < 12 ? (i % 5 ? 4 : 3) : (i % 3 ? 3 : 2); });\n",
    "  rec.forEach((s, i) => { energy[s.id] = new Date(s.start).getHours() < 12 ? (i % 5 ? 4 : 3) : (i % 3 ? 3 : 2); });\n"
    "  // v2.0: intentions, their answers and a few counted distractions on the latest blocks (the last one \"partly\": something to pick up)\n"
    "  const debrief = {}, wants = ['Finish Q1–15 and check the answers', 'Summarise the chapter on one page', 'Redo yesterday’s wrong questions', 'One full mock section, timed'];\n"
    "  rec.slice(-14).forEach((s, i, a) => { s.int = wants[i % wants.length]; debrief[s.id] = i === a.length - 1 ? 2 : i % 5 === 3 ? 2 : i % 7 === 5 ? 3 : 1; if (i % 3 === 1) s.dx = 1 + (i % 4); });\n")
rep('demo-2', "    subTemplates: [], energy,", "    subTemplates: [], energy, debrief,")

# ---------- script and styles ----------
A = "/* ---------- The session-complete summary card ---------- */"
rep('js', A, open(os.path.join(HERE, 'intent.js.txt'), encoding='utf-8').read() + A)
MARK = "/* ----- component gallery (development only) ----- */"
rep('css', MARK, """/* ----- v2.0 phase 6: intention, debrief, distraction tally, resume ----- */
.int-toggle { margin-left: 14px; }
.int-ed { margin-top: 10px; }
.int-row { display: flex; align-items: center; gap: 8px; }
.int-row input { flex: 1; min-width: 0; }
.debrief .opts { grid-template-columns: repeat(3, 1fr); }
.debrief .eq span { min-width: 0; overflow-wrap: anywhere; }
.debrief .eq b { font-weight: 600; }
.timer-card .dx-btn { position: absolute; top: 12px; right: 104px; z-index: 3; }
.dx-btn svg { width: 18px; height: 18px; }
.dx-n { position: absolute; top: -4px; right: -4px; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 999px; display: grid; place-items: center; font-size: 11px; font-weight: 700; line-height: 1; background: var(--t-1, var(--text)); color: var(--bg); }
.dx-n:empty { display: none; }
.resume { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 12px 0 2px; padding: 10px 12px 10px 14px; border-radius: var(--r-12, 12px); background: color-mix(in srgb, var(--accent) 9%, var(--surface)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 26%, transparent); text-align: left; }
.rs-t { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.rs-t b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rs-s { font-size: 13px; color: var(--t-2, var(--muted)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rs-s:empty { display: none; }
.rs-a { display: flex; align-items: center; gap: 4px; flex: none; }
.intent { display: inline-block; margin-left: 8px; font-size: 12.5px; color: var(--t-2, var(--muted)); }
.intent b { color: var(--t-1, var(--text)); font-weight: 700; }
.dx-tag { margin-left: 8px; font-size: 12px; color: var(--t-2, var(--muted)); font-variant-numeric: tabular-nums; }
@media (max-width: 480px) { .int-toggle { margin-left: 0; display: flex; } }
""" + MARK)
open(P, 'w', encoding='utf-8').write(s); print('applied to', P, len(s))
