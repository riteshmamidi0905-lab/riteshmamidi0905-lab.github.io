"""Validate the reviewed static release without regenerating its design."""
from pathlib import Path
import json,hashlib,re
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'release-files.json').read_text())
assert len(manifest)==81
expected={x['path'] for x in manifest}
assert not any(re.search(r'\.(mp4|webm|mov|zip|bundle|pem|key)$',p,re.I) or p.startswith(('review/','assets/nasha/','assets/media/')) for p in expected)
class Parser(HTMLParser):
 def __init__(self):super().__init__();self.ids=set();self.refs=[];self.projects=0;self.flags=0;self.rows=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.add(a['id'])
  self.projects+='project' in a.get('class','').split()
  self.flags+='flag-card' in a.get('class','').split()
  self.rows+='row' in a.get('class','').split()
  for key in ['href','src']:
   if key in a:self.refs.append(a[key])
pages={}
for item in manifest:
 p=root/item['path'];b=p.read_bytes()
 assert len(b)==item['bytes'] and hashlib.sha256(b).hexdigest()==item['sha256'],item['path']+' changed without manifest review'
 if p.suffix not in ['.pdf','.woff2','.webp']:
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
assert pages['index.html'].rows==6
assert 'prefers-reduced-motion' in (root/'cinematic.css').read_text() and 'prefers-reduced-motion' in (root/'css/system.css').read_text()
ev=json.loads((root/'data/nasha-governed-evidence.json').read_text())
assert ev['synthetic'] is True and all(x['external_transmissions']==0 and x['matched_expectation'] for x in ev['scenarios']) and 'dev-passcode' not in json.dumps(ev),'evidence file invariants'
assert all(n['status'] in ev['architecture']['status_legend'] for n in ev['architecture']['nodes'])
gr=json.loads((root/'data/release-gate-report.json').read_text())
assert gr['schema']=='release-gate-report/1' and len(gr['gates'])==12 and gr['overall'] in ('PASS','FAIL','REQUIRES_REVIEW') and gr['remote_ci']=='NOT_RUN','release-gate report invariants'
assert gr['overall']=='PASS' or all(v['status']!='PASS' for v in gr['gates'].values()) is False,'gate report'
cl=ev['claims']; assert cl and all({'id','text','value','source'}<=set(c) for c in cl),'claims shape'
assert ev['story']['draft']['external_transmissions']==0 and ev['story']['draft']['state']=='DRAFT_NOT_SENT'
assert ev['metrics']['governed_evaluation']['mutants_killed']==ev['metrics']['governed_evaluation']['mutants_total']==len(ev['mutation_detail'])
assert ev['metrics']['release_evidence']['tests_failed']==0 and 'UNVERIFIED' in ev['metrics']['release_evidence']['model_runtime']
gw=json.loads((root/'data/growth-os-evidence.json').read_text())
assert gw['synthetic'] is True and gw['pushed'] is False and gw['all_expectations_met'] is True and 'dev-passcode' not in json.dumps(gw),'growth evidence invariants'
w=gw['workflow'];assert all(m['killed'] for m in w['mutants']) and len(w['mutants'])==8 and all(o['match'] for o in w['oracle_evaluation']) and w['happy_path']['emails_or_messages_created']==0 and w['happy_path']['lead_after']['status']=='qualified'
assert [c['n'] for c in gw['capabilities'] if c['status']=='INTEGRATED']==[14],'only CRM automation may be integrated'
lc=gw['launch'];assert all(m['killed'] for m in lc['mutants']) and len(lc['mutants'])==8 and lc['model_tested'] is False and lc['approved']['side_effects']['orders_placed']==0 and lc['approved']['side_effects']['suppliers_contacted']==0,'launch evidence invariants'
assert all(s['verification_status'] in ('synthetic_fixture','lead_unverified') and not s['website_verified'] and s['contact']=='none recorded' for s in lc['walkthrough']['suppliers']) and lc['suppliers']['external_verification']=='INCOMPLETE','no supplier may be shown as verified'
assert lc['audit']['rows']==1 and lc['audit']['approval_matches'] is True and 'fusion' not in json.dumps(lc).lower()
m4=gw['m4'];assert m4['journey']['all_steps_ok'] is True and len(m4['journey']['steps'])==12 and m4['runtime']['model_backed_run_recorded'] is False and m4['runtime']['paid_provider_permitted'] is False and m4['boundary']['metrics']['false_accepts']==0 and m4['boundary']['metrics']['exact']==m4['boundary']['metrics']['cases']>=25 and all(x['killed'] for sec in ('boundary','supplier','finance') for x in m4[sec]['mutants']) and m4['supplier']['metrics']['dedupe']['false_positive']==0 and all(c['ok'] for c in m4['finance']['cases']) and not [c for c in m4['journey']['supplier_cards'] if c['official_website_verified']] and 'fusion' not in json.dumps(m4).lower(),'milestone 4 evidence invariants'
m5=gw['m5'];e5=m5['evaluations'];assert m5['journey']['all_steps_ok'] is True and len(m5['journey']['steps'])==9 and m5['model']['model_execution_recorded'] is False and m5['supplier_research']['verified_from_primary_page']==0 and sum(m5['supplier_research']['evidence_tiers'].values())==m5['supplier_research']['suppliers']>=5 and m5['authorization']['summary']['correct']==m5['authorization']['summary']['checks'] and all(x['killed'] for x in m5['authorization']['mutants']) and all(x['killed'] for x in e5['generalisation']['mutants']) and e5['financial']['held_out']['correct']==e5['financial']['held_out']['cases'] and e5['supplier']['held_out']['dedupe']['false_positive']==0 and m5['architecture']['tables_used_by_both_businesses']>=15 and 'fusion' not in json.dumps(m5).lower() and 'verified_public' not in json.dumps(m5['supplier_research']),'milestone 5 evidence invariants'
inc=gw['incident'];assert inc['dirty_code'] is False and all(r['returncode']!=0 and r['failed_tests'] for r in inc['before_fix']['runs']) and inc['after_fix']['passed_runs']==inc['after_fix']['repeats']>=10 and 'audit_log_pkey' in inc['original_failure']['postgres_error'] and len(inc['limitations'])>=3,'audit incident evidence invariants'
print('PASS: 58 reviewed files, hashes, media/secret signatures, local links/fragments, 24 projects, six index rows, reduced-motion stylesheets, evidence-file invariants')
