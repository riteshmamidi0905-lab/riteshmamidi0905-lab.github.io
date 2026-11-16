#!/usr/bin/env python3
"""Build the isolated twelve-agent review; never extends the Pages allowlist."""
import argparse, importlib.util, json, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('proof_builder', ROOT/'scripts/build-cinematic-proof.py')
proof = importlib.util.module_from_spec(spec)
spec.loader.exec_module(proof)
spec = importlib.util.spec_from_file_location('registry_builder', ROOT/'scripts/twelve-agents/build_registry.py')
registry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(registry)

def build(out):
    if out.exists():
        raise ValueError('Output must not exist')
    derived, audit = registry.derive()
    for name, expected in [('registry.json', derived), ('asset-readiness.json', audit)]:
        if json.loads((ROOT/'scripts/twelve-agents'/name).read_text()) != expected:
            raise ValueError('Stale registry or asset audit: ' + name)
    subprocess.run([sys.executable, str(ROOT/'scripts/build-pages-artifact.py'), '--check'], cwd=ROOT, check=True)
    out.mkdir(parents=True)
    subprocess.run([sys.executable, str(ROOT/'scripts/build-pages-artifact.py'), '--out', str(out/'baseline')], cwd=ROOT, check=True)
    subprocess.run([sys.executable, str(ROOT/'scripts/verify-pages-artifact.py'), str(out/'baseline')], cwd=ROOT, check=True)
    for name in ['index.html', 'registry.css', 'registry.js', 'registry.json', 'asset-readiness.json', 'README.md', 'ARCHITECTURE.md', 'BLUEPRINT.md', 'ANIMATION.md', 'ROADMAP.md']:
        source = ROOT/'scripts/twelve-agents'/name
        if source.is_symlink() or not source.is_file():
            raise ValueError('Missing or unsafe review source')
        target = out/('docs/'+name if name.endswith('.md') else name)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    files = proof.inventory(out)
    manifest = {'version':1, 'scope':'TWELVE-AGENT REGISTRY REVIEW ONLY — NOT A PRODUCTION RELEASE', 'files':files, 'tree_sha256':proof.digest(files)}
    (out/'proof-manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    print(json.dumps({'files':len(files), 'bytes':sum(e['bytes'] for e in files), 'proof_tree_sha256':manifest['tree_sha256']}))
    return manifest

if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out',type=Path,required=True);args=p.parse_args()
    try:build(args.out.resolve())
    except (ValueError,OSError,subprocess.CalledProcessError) as e:sys.exit('Registry build refused: '+str(e))
