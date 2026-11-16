#!/usr/bin/env python3
"""Read-only public-repository existence/source audit; does not rerun project tests."""
import concurrent.futures, datetime, json, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'work/design-research'
OWNER='riteshmamidi0905-lab'

def api(path):
    return json.loads(subprocess.check_output(['gh','api',path],stderr=subprocess.PIPE,timeout=40))

def inspect(project):
    row={'name':project['name'],'portfolio_repo':project['repo'],'portfolio_commit':project['commit'],'historical_portfolio_status':project['status'],'historical_test_evidence':project['evidence'],'limits':project['limits'],'tests_rerun':False}
    if not project['repo']:
        row.update(source_available=False,note='Portfolio prototype entry without a public source URL; not counted as a verified public repository.')
        return row
    repo=project['repo'].split('/')[-1]
    try:
        commit=api('repos/'+OWNER+'/'+repo+'/commits/'+project['commit'])
        tree=api('repos/'+OWNER+'/'+repo+'/git/trees/'+commit['commit']['tree']['sha']+'?recursive=1')
        paths=[p['path'] for p in tree['tree'] if p['type']=='blob']
        row.update(source_available=True,full_commit=commit['sha'],tree_truncated=tree.get('truncated',False),readmes=[p for p in paths if p.lower().endswith('readme.md')][:8],test_paths=[p for p in paths if p.startswith(('tests/','test/')) or '/tests/' in p or Path(p).name.startswith('test_')][:12],documentation_paths=[p for p in paths if p.startswith(('docs/','architecture/')) or 'architecture' in p.lower()][:12],ci_paths=[p for p in paths if p.startswith('.github/workflows/')],tree_url=project['repo']+'/tree/'+commit['sha'])
    except Exception as error:row.update(source_available=False,error=str(error)[:200])
    return row

if __name__=='__main__':
    OUT.mkdir(parents=True,exist_ok=True)
    projects=json.loads((ROOT/'data/projects.json').read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:rows=list(pool.map(inspect,projects))
    public=api('users/'+OWNER+'/repos?per_page=100&type=owner')
    known={p['repo'] for p in projects if p['repo']}
    report={'checked_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'Read-only GitHub public API commit/tree checks; no inference, deployment or test execution','portfolio_entries':len(projects),'distinct_public_source_urls':len(known),'owner_public_repositories':len(public),'historically_verified_entries':sum(p['status']=='VERIFIED' for p in projects),'source_commits_resolved':sum(p['source_available'] for p in rows),'projects':rows,'other_public_repositories':[{'name':r['name'],'url':r['html_url']} for r in public if r['html_url'] not in known]}
    (OUT/'project-audit.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k not in ('projects','other_public_repositories')}))
