# Table from perf4.mjs output lines:  python3 perf4sum.py before.jsonl [after.jsonl]
import json, sys
def load(f):
    out = {}
    for line in open(f, encoding='utf-8'):
        line = line.strip()
        if line.startswith('{'):
            d = json.loads(line); out[d.get('tag') or d['page']] = d
    return out
runs = [load(f) for f in sys.argv[1:]]
tags = [t for t in runs[0]]
for tag in tags:
    ds = [r.get(tag) for r in runs]
    if not all(ds): continue
    print(f"\n== {tag}  (sessions {ds[0].get('sessions')}, throttle {ds[0]['throttle']}x{', phone' if ds[0]['phone'] else ''})")
    row = lambda name, f: print(f"  {name:28s}" + ''.join(f"{str(f(d)):>14s}" for d in ds))
    row('start → first frame (ms)', lambda d: d['startMs'])
    row('long tasks at start (n/max)', lambda d: f"{d['startLongTasks']}/{d['startLongMax']}")
    row('DOM nodes (all)', lambda d: d['nodesAll'])
    row('interactions measured', lambda d: d['interactions'])
    row('slowest interaction (ms)', lambda d: d['inpWorst'][0]['ms'] if d['inpWorst'] else 0)
    row('interactions > 200 ms', lambda d: d['over200'])
    row('interactions > 100 ms', lambda d: d['over100'])
    row('fps, timer running', lambda d: f"{d['frames']['timerRunning']['fps']} ({d['frames']['timerRunning']['slow']} slow)")
    row('fps, scrolling', lambda d: f"{d['frames']['scroll']['fps']} ({d['frames']['scroll']['slow']} slow)")
    row('heap (MB)', lambda d: d['heapMB'])
    print('  tab switch, ms (nodes):')
    for t in ds[0]['tabs']:
        print(f"    {t:26s}" + ''.join(f"{(str(d['tabs'][t]['ms']) + ' (' + str(d['tabs'][t]['nodes']) + ')') if t in d['tabs'] else '-':>14s}" for d in ds))
    print('  slowest interactions:')
    for d in ds:
        print('    ' + '; '.join(f"{x['label']} {x['ms']}" for x in d['inpWorst'][:6]))
