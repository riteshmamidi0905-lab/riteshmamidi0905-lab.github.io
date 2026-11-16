#!/usr/bin/env python3
"""Build a bounded owner-review board around the existing agent registry artifact."""
import argparse, importlib.util, json, shutil, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
registry=module('registry_artifact',ROOT/'scripts/build-agent-registry.py')
def build(out):
    registry.build(out)
    (out/'index.html').rename(out/'agents.html')
    source=ROOT/'scripts/world-class-program'
    files={'index.html':source/'design-board.html','direction.css':source/'direction.css','media/vectra.webp':ROOT/'assets/img/agents/vectra.webp','media/brewery.webp':ROOT/'assets/img/business/brewery.webp','fonts/inter-latin.woff2':ROOT/'assets/fonts/inter-latin.woff2','fonts/jetbrains-mono-latin.woff2':ROOT/'assets/fonts/jetbrains-mono-latin.woff2','fonts/Inter-LICENSE.txt':ROOT/'assets/fonts/Inter-LICENSE.txt','fonts/JetBrains-Mono-LICENSE.txt':ROOT/'assets/fonts/JetBrains-Mono-LICENSE.txt'}
    for name in ['README.md','BREWERY-MAP.md','DESIGN-SYSTEM.md','PILOT.md','CHARACTERS-AND-FOUNDER.md','PROJECTS.md','ARTLIST-CHECKLIST.md','ENTERPRISE-CONTRACT.md','RESEARCH.md','ASSET-BRIEFS.md','existing-assets.json','original-brewery-media.json','project-audit.json','production-assets.json','references.json','references.csv']:
        files['program-docs/'+name]=source/name
    for target,p in files.items():
        if p.is_symlink() or not p.is_file():raise ValueError('Missing or unsafe board source: '+str(p))
        dest=out/target;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest)
    entries=registry.proof.inventory(out);manifest={'version':1,'scope':'PRODUCTION DIRECTION BOARD ONLY — NO PILOT OR RELEASE ACCEPTANCE','files':entries,'tree_sha256':registry.proof.digest(entries)}
    (out/'proof-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'scope':manifest['scope'],'files':len(entries),'bytes':sum(x['bytes'] for x in entries),'proof_tree_sha256':manifest['tree_sha256']}))
    return manifest
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out',type=Path,required=True);args=p.parse_args()
    try:build(args.out.resolve())
    except (ValueError,OSError) as e:sys.exit('Board build refused: '+str(e))
