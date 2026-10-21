"""Validate the reviewed static release without regenerating its design."""
from pathlib import Path
import json,hashlib,re
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'release-files.json').read_text())
assert len(manifest)==19
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
for item in manifest:
 p=root/item['path'];b=p.read_bytes()
 assert len(b)==item['bytes'] and hashlib.sha256(b).hexdigest()==item['sha256'],item['path']+' changed without manifest review'
 if p.suffix not in ['.pdf','.woff2']:
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
  target=(Path(name).parent/unquote(u.path)).as_posix() if u.path else name
  assert target in expected,(name,ref)
  if u.fragment and target in pages:assert unquote(u.fragment) in pages[target].ids,(name,ref)
assert pages['projects.html'].projects==24
assert pages['index.html'].flags==6
assert 'prefers-reduced-motion' in (root/'cinematic.css').read_text()
print('PASS: 19 reviewed files, hashes, media/secret signatures, local links/fragments, 24 projects, six flagships, reduced-motion stylesheet')
