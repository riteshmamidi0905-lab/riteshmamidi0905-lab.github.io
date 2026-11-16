#!/usr/bin/env python3
"""Build a separate, explicitly allowlisted review artifact. Never a Pages artifact."""
import argparse,hashlib,json,shutil,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
PROOF={'index.html':'index.html','proof.css':'proof.css','viewer.js':'viewer.js','graphics.js':'graphics.js','graphics.js.LEGAL.txt':'graphics.js.LEGAL.txt','THIRD-PARTY-NOTICES.txt':'THIRD-PARTY-NOTICES.txt','scene.glb':'scene.glb'}
EXTRA={'shared/data.js':'demo/data.js','shared/engine.js':'demo/engine.js','shared/inventory-model.js':'nasha-universe/engineering/inventory-model.js','shared/enterprise-state.js':'nasha-universe/enterprise-state.js','reference/vectra.webp':'assets/img/agents/vectra.webp'}
def inventory(folder):
    return [{'path':str(p.relative_to(folder)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(folder.rglob('*')) if p.is_file() and p!=folder/'proof-manifest.json']
def digest(entries):return hashlib.sha256(''.join(e['path']+'\t'+e['sha256']+'\n' for e in entries).encode()).hexdigest()
def build(out):
    if out.exists():raise ValueError('Output must not exist; existing previews are never overwritten')
    subprocess.run([sys.executable,str(ROOT/'scripts/build-pages-artifact.py'),'--check'],check=True,cwd=ROOT)
    out.mkdir(parents=True)
    subprocess.run([sys.executable,str(ROOT/'scripts/build-pages-artifact.py'),'--out',str(out/'baseline')],check=True,cwd=ROOT)
    subprocess.run([sys.executable,str(ROOT/'scripts/verify-pages-artifact.py'),str(out/'baseline')],check=True,cwd=ROOT)
    for target,source in {**{k:'scripts/cinematic-proof/'+v for k,v in PROOF.items()},**EXTRA}.items():
        src=ROOT/source
        if src.is_symlink() or not src.is_file() or not src.resolve().is_relative_to(ROOT.resolve()):raise ValueError('Missing or symlinked proof source: '+source)
        dst=out/target;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dst)
    files=inventory(out);manifest={'version':1,'scope':'ISOLATED VISUAL REVIEW PROOF — NOT A PRODUCTION PUBLICATION ARTIFACT','files':files,'tree_sha256':digest(files)}
    (out/'proof-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'files':len(files),'bytes':sum(e['bytes'] for e in files),'proof_tree_sha256':manifest['tree_sha256'],'scope':manifest['scope']}));return manifest
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
    try:build(a.out.resolve())
    except (ValueError,OSError,subprocess.CalledProcessError) as e:sys.exit('Proof build refused: '+str(e))
