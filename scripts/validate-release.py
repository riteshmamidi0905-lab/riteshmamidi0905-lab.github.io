"""Validate the reviewed static release without regenerating its design."""
from pathlib import Path
import json,hashlib,re,os
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'release-files.json').read_text())
assert len(manifest)==48
expected={x['path'] for x in manifest}
assert not any(re.search(r'\.(mp4|webm|mov|zip|bundle|pem|key)$',p,re.I) or p.startswith(('review/','assets/nasha/','assets/media/')) for p in expected)
class Parser(HTMLParser):
 def __init__(self):super().__init__();self.ids=set();self.refs=[];self.projects=0;self.flags=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.add(a['id'])
  self.projects+='project' in a.get('class','').split()
  self.flags+='flag-card' in a.get('class','').split()
  for key in ['href','src']:
   if key in a:self.refs.append(a[key])
pages={}
# nothing may sit unlisted under assets/ (GitHub Pages would publish it); concept images need a cleared register entry
reg={i['file']:i for i in json.loads((root/'data/image-register.json').read_text())}
for f in sorted((root/'assets').rglob('*')):
 rel=f.relative_to(root).as_posix()
 if f.is_file() and rel not in expected:raise AssertionError('unlisted file under assets/: '+rel)
for p_ in expected:
 if p_.startswith('assets/img/'):
  assert p_ in reg,'image missing from data/image-register.json: '+p_
  assert reg[p_]['cleared_for_public_release'],'image not cleared for public release: '+p_
for item in manifest:
 p=root/item['path'];b=p.read_bytes()
 assert len(b)==item['bytes'] and hashlib.sha256(b).hexdigest()==item['sha256'],item['path']+' changed without manifest review'
 if p.suffix not in ['.pdf','.woff2','.webp','.jpg']:
  s=b.decode()
  for pattern in [r'-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----',r'gh[pousr]_[A-Za-z0-9]{30,}',r'github_pat_[A-Za-z0-9_]{40,}',r'AKIA[0-9A-Z]{16}',r'sk-(?:proj-)?[A-Za-z0-9_-]{40,}']:
   assert not re.search(pattern,s),'Secret signature in '+item['path']
  assert not re.search(r'<(?:video|audio)\b|assets/(?:nasha|media)/|\.mp4\b|\.webm\b',s,re.I),'Media in '+item['path']
 if p.suffix=='.html':
  parser=Parser();parser.feed(b.decode());pages[item['path']]=parser
for name,page in pages.items():
 for ref in page.refs:
  u=urlsplit(ref)
  if u.scheme or u.netloc:continue
  target=os.path.normpath((Path(name).parent/unquote(u.path)).as_posix()).replace(os.sep,'/') if u.path else name
  assert target in expected,(name,ref)
  if u.fragment and not u.fragment.startswith('/') and target in pages:assert unquote(u.fragment) in pages[target].ids,(name,ref)
assert pages['projects.html'].projects==24
assert pages['index.html'].flags==6
assert 'prefers-reduced-motion' in (root/'cinematic.css').read_text()
for name in ('lab-explorer.html','verified-projects.html'):
 s=(root/name).read_text()
 assert 'not an operating business' in s or 'not production readiness' in s,name
 assert not re.search(r'production[- ]ready|commercially operating|fully deployed(?! system)',s,re.I),name
assert (root/'verified-projects.html').read_text().count('<article class="proj ')==29
EMPLOYER=''.join(map(chr,(77,111,118,97,116,101)))  # not written out: the legal employer must not appear in this public repository
assert EMPLOYER not in ''.join(p.read_text() for p in root.glob('*.html')),'employer name in public pages'
import glob
cases=sorted(root.glob('case-*.html'))
cases=[c for c in cases if c.name!='case-studies.html']
assert len(cases)==6,[c.name for c in cases]
for c in cases:
 s=c.read_text()
 for need in ['Independent project','07 / LIMITATIONS','06 / RUN IT','05 / VERIFICATION','02 / ARCHITECTURE','data-nodes='] + ([] if c.name=='case-nasha-ai-lab-architecture.html' else ['github.com/riteshmamidi0905-lab/']):
  assert need in s,(c.name,need)
 assert not re.search(r'production[- ]ready|commercially operating',s,re.I),c.name
 assert re.search(r'<img [^>]*alt="[^"]{10,}"',s) or c.name=='case-nasha-ai-lab-architecture.html',c.name
# ENTERPRISE DEMO RULES: static, offline, synthetic, no collection
demo_files=[p for p in expected if p.startswith('demo/')]
assert 'demo/index.html' in demo_files and 'demo/engine.js' in demo_files
for p in demo_files:
 s=(root/p).read_text()
 code=re.sub(r'/\*.*?\*/','',s,flags=re.S)
 code=re.sub(r'<link rel="canonical"[^>]*>','',code)
 assert not re.search(r'\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|document\.cookie|EventSource|importScripts|<form[^>]*action=|https?://',code),'network or tracking construct in '+p
 if p!='demo/app.js':assert 'localStorage' not in code,'storage outside app.js: '+p
assert 'DEMO ENVIRONMENT' in (root/'demo/index.html').read_text() and 'SYNTHETIC DATA' in (root/'demo/index.html').read_text()
assert "nasha-demo-state-v1" in (root/'demo/app.js').read_text()
for c in json.loads((root/'data/cases.json').read_text()):
 s=(root/('case-'+c['slug']+'.html')).read_text(); r=c['run']
 if r['commands']:
  assert 'class="runbox"' in s and 'Copied from the project' in s and ('README' in r['where'] or 'docs/' in r['where']),('run block',c['slug'])
 else:
  assert 'class="runbox"' not in s and 'no public run command' in s,('no invented commands',c['slug'])
# PUBLIC DISCLOSURE RULES (hashed rules in scripts/disclosure-rules.json, engine in scripts/disclosure.py): no internal programme identifiers, no names of private
# repositories, records, files or environment variables, no withheld-image markers, anywhere in the repository source. Fail-closed: if the rules cannot be loaded the release fails.
import sys as _sys; _sys.path.insert(0,str(Path(__file__).resolve().parent)); import disclosure as _D
try: _rules=_D.load()
except _D.RulesError as _e: raise AssertionError('disclosure rules unusable (fail-closed): '+str(_e))
# The scan list is built from REPOSITORY-RELATIVE paths only (the checkout directory's name never matters; runners check out under .../work/...),
# and the run fails unless it was non-empty, above a floor, and included every file an independent listing says must be scanned.
PUBLIC_TEXT=_D.source_files(root)
try:
    _expected,_how=_D.expected_files(root)
    _D.check_coverage(PUBLIC_TEXT,_expected)
except _D.CoverageError as _e: raise AssertionError('disclosure scan coverage (fail-closed): '+str(_e))
_problems=_D.check_files(_rules,root,PUBLIC_TEXT,'file')
assert not _problems,('disclosure rule violations (rule id and line only; the matched text is never printed)',_problems[:20])
print('disclosure scan:',len(PUBLIC_TEXT),'text files scanned; every required file covered (%s);'%_how,_rules.private_summary())
for r in json.loads((root/'data/image-register.json').read_text()): assert r['cleared_for_public_release'] is True and r['kind']=='screenshot',('public register may list cleared screenshots only',r['file'])
_rec=(root/'recruiter.html').read_text()
assert '<h3>Business Analyst</h3>' in _rec and '<h3>Data Analyst</h3>' in _rec and 'Business / Data Analyst' not in _rec,'job titles must follow the master résumé'
assert 'Apple client engagement' in _rec and 'Kafka</span>' not in _rec,'identity wording / unsupported skill'
# FONT PRELOAD GUARD: both webfonts preloaded on every top-level page (prevents a measured font-swap layout shift)
for pg in sorted(root.glob('*.html')):
 s=pg.read_text(); assert 'inter-latin.woff2" as="font"' in s and 'jetbrains-mono-latin.woff2" as="font"' in s,('font preload missing',pg.name)
# FIRST-PAINT GUARD: the page-in entrance must not start fully transparent (a fully transparent start intermittently prevented any first paint in headless Chrome: 18 of 80 loads; 0 of 80 with a non-zero start)
_lab_css=(root/'lab.css').read_text(); assert 'page-in{from{opacity:0}' not in _lab_css.replace(' ',''),'page-in keyframes must not start at opacity:0'
assert re.search(r'@keyframespage-in\{from\{opacity:\.0*[1-9]',_lab_css.replace(' ','')),'page-in keyframes must start at a small non-zero opacity'
# DATA LAB RULES: evidence page must stay honest and offline
dl=json.loads((root/'data/datalab/lab-data.json').read_text()); dlp=(root/'data-lab.html').read_text(); dlj=(root/'datalab.js').read_text()
assert len(dl['sql']['queries'])==24 and all(q['row_count']>=1 for q in dl['sql']['queries']),'sql showcase incomplete'
nsk=len(dl['run']['skips']); assert (dl['run']['overall']=='PASS')==(nsk==0 and all(s['status']=='PASS' for s in dl['run']['stages'])),'overall status inconsistent with stages or skips'
assert all(s['status']!='FAIL' for s in dl['run']['stages']),'a failed stage must not be published as evidence'
assert all(x in dlp for x in ('SYNTHETIC','none of this is production-deployed','skipped','LIMITATIONS')),'lab page missing required honesty text'
if nsk: assert 'PASS WITH SKIPS' in dlp and f'{nsk} tests were' in dlp,'skipped tests not disclosed on the page'
blob=json.dumps(dl); assert not re.search(r'/Users/|/private/|/var/folders',blob),'local path in lab data'
assert not re.search(r'XMLHttpRequest|WebSocket|sendBeacon|document\.cookie|https?://',dlj),'network or tracking construct in datalab.js'
assert re.findall(r"fetch\s*\(\s*'([^']*)'",dlj)==['data/datalab/lab-data.json'] and dlj.count('fetch(')==1,'datalab.js may fetch only its own evidence file'
assert dlj.count('localStorage')==1 and 'nasha-demo-state-v1' in dlj,'datalab.js may only read the demo state key'
print('PASS: 48 reviewed files, hashes, media/secret signatures, local links/fragments, 24 projects, six flagships, reduced-motion stylesheet')
