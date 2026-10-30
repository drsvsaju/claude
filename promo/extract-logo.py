"""Copy the Pomodorolist logo SVG out of index.html into promo/shots/logo.svg (run after a logo change)."""
import re, os
here = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(here, '..', 'index.html')).read()
i = s.find('id="brandBtn"'); j = s.find('<i class="logo"', i); k = s.find('</i>', j)
svg = re.search(r'<svg.*?</svg>', s[j:k], re.S).group(0)
if 'xmlns' not in svg: svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ', 1)
open(os.path.join(here, 'shots', 'logo.svg'), 'w').write(svg)
print('wrote shots/logo.svg')
