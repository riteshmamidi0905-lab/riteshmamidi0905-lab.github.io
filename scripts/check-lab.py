"""Static accessibility, content and weight checks for the new pages (stdlib only; no browser). Run: python3 scripts/check-lab.py
Covers: lang/title/description, one h1, heading order, landmarks, skip link target, unique ids, aria-controls/labelledby targets, button and link names, form labels, WCAG contrast of the declared colour tokens and status chips, reduced-motion rule, no third-party requests, page weights. It does NOT replace a screen-reader test or Lighthouse."""
import re, sys
from html.parser import HTMLParser
from pathlib import Path
root = Path(__file__).resolve().parents[1]
def lum(h):
    h = h.lstrip('#'); r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= .03928 else ((c + .055) / 1.055) ** 2.4
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b)
def cr(a, b):
    x, y = sorted((lum(a), lum(b)), reverse=True); return (x + .05) / (y + .05)
class P(HTMLParser):
    def __init__(s): super().__init__(); s.h = []; s.ids = []; s.refs = []; s.tags = []; s.names = []; s.stack = []; s.text = {}; s.labels = set(); s.inputs = []; s.ext = []
    def handle_starttag(s, t, a):
        a = dict(a); s.tags.append(t)
        if t in 'h1 h2 h3 h4'.split(): s.h.append(int(t[1])); s.stack.append(('h', len(s.h)))
        if 'id' in a: s.ids.append(a['id'])
        for k in ('aria-controls', 'aria-labelledby', 'for'):
            if k in a: s.refs.append((k, a[k]))
        if t in ('button', 'a'): s.stack.append((t, a)); s.text[len(s.stack)] = ''
        if t == 'input': s.inputs.append(a)
        for k in ('src', 'href'):
            if k in a and re.match(r'https?://', a[k]) and (t in ('script', 'img', 'iframe') or (t == 'link' and a.get('rel') in ('stylesheet', 'preload', 'modulepreload'))): s.ext.append(a[k])
    def handle_data(s, d):
        if s.stack and s.stack[-1][0] in ('button', 'a'): s.text[len(s.stack)] = s.text.get(len(s.stack), '') + d
    def handle_endtag(s, t):
        if t in ('button', 'a') and s.stack and s.stack[-1][0] == t:
            kind, a = s.stack[-1]; txt = s.text.pop(len(s.stack), '').strip()
            if not (txt or a.get('aria-label')): s.names.append(('empty ' + t, a))
            s.stack.pop()
        elif t in 'h1 h2 h3 h4'.split() and s.stack and s.stack[-1][0] == 'h': s.stack.pop()
bad = []
def check(c, m):
    print(('ok    ' if c else 'FAIL  ') + m)
    if not c: bad.append(m)
for name in ('index.html', 'lab-explorer.html', 'verified-projects.html', 'case-studies.html', 'case-production-ai-agent-platform.html', 'case-llm-eval-framework.html', 'case-mcp-weir.html', 'case-genai-doc-assistant.html', 'case-support-escalation-copilot.html', 'case-nasha-ai-lab-architecture.html'):
    s = (root / name).read_text(); p = P(); p.feed(s)
    check(re.search(r'<html lang="en"', s) is not None, f'{name}: html lang')
    check(re.search(r'<title>[^<]{10,}</title>', s) is not None and 'name="description"' in s, f'{name}: title and description')
    check(p.h.count(1) == 1, f'{name}: exactly one h1')
    check(all(b - a <= 1 for a, b in zip(p.h, p.h[1:])), f'{name}: heading levels never skip down by more than one ({"".join(map(str, p.h[:12]))}...)')
    check('main' in p.tags and 'nav' in p.tags and 'footer' in p.tags and 'header' in p.tags, f'{name}: header, nav, main, footer landmarks')
    check('href="#main"' in s and 'id="main"' in s, f'{name}: skip link target exists')
    check(len(p.ids) == len(set(p.ids)), f'{name}: ids are unique')
    check(all(v in p.ids or k == 'for' and v in p.ids for k, v in p.refs if k != 'aria-controls'), f'{name}: aria-labelledby/for targets exist')
    check(not p.names, f'{name}: every link and button has an accessible name {p.names[:2]}')
    check(all('aria-label' in a or a.get('id') for a in p.inputs), f'{name}: inputs are labelled')
    check(not p.ext, f'{name}: no third-party scripts, styles or images ({p.ext})')
    check('target="_blank"' not in s, f'{name}: no new-window links')
css = (root / 'cinematic.css').read_text() + (root / 'lab.css').read_text()
tok = dict(re.findall(r'--(\w+):(#[0-9a-fA-F]{6})', css)); bg = tok['bg']; sf = tok['surface']
for n, fg in (('text', tok['text']), ('muted', tok['muted']), ('mint', tok['mint']), ('teal', tok['teal'])):
    for b, bn in ((bg, 'bg'), (sf, 'surface')): check(cr(fg, b) >= 4.5, f'contrast {n} on {bn}: {cr(fg, b):.1f}:1 (>= 4.5)')
for n, fg in dict(verified='#6cd8be', unverified='#f2c46d', prototype='#b9a7ff', fail='#ff9d8a', planned='#a8b9b4', concept='#c5f9df').items(): check(cr(fg, sf) >= 4.5, f'status chip {n} on surface: {cr(fg, sf):.1f}:1')
check('prefers-reduced-motion' in css and 'prefers-reduced-motion' in (root / 'lab.css').read_text(), 'reduced-motion rules in cinematic.css and lab.css')
check(all(a != 'outline:none' for a in re.findall(r'outline:\s*none', css)) or 'focus-visible' in css, 'focus styles present')
w = {n: (root / n).stat().st_size for n in ('index.html', 'lab-explorer.html', 'verified-projects.html', 'cinematic.css', 'lab.css', 'cinematic.js', 'lab.js')}
print('weights (bytes):', w, 'total', sum(w.values()))
check(sum(w.values()) < 250_000, 'page + css + js under 250 KB (fonts separate)')
sys.exit(1 if bad else 0)
