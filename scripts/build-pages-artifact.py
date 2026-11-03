#!/usr/bin/env python3
"""Build the GitHub Pages publication artifact from the explicit allowlist in scripts/publish-manifest.json.

  python3 scripts/build-pages-artifact.py --out dist          build dist/ (must not exist yet); fails if the output and the manifest disagree
  python3 scripts/build-pages-artifact.py --check             verify the manifest against release-files.json and the source files; write nothing
  python3 scripts/build-pages-artifact.py --write-manifest    regenerate the manifest from release-files.json (after the reviewed files change)

Only files listed (path, size, SHA-256) in the manifest are copied; everything else in the repository (scripts, tests, configuration, notes) is not.
The output is deterministic: bytes are copied unchanged, paths are processed in sorted order, and permissions and timestamps are fixed.
Run scripts/verify-pages-artifact.py on the result for the independent publication checks. This script never deploys anything.
"""
import argparse
import json
import os
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pages_policy as P

FIXED_TIME = int(os.environ.get("SOURCE_DATE_EPOCH", "946684800"))   # 2000-01-01 unless SOURCE_DATE_EPOCH says otherwise


def build(out, manifest, root=P.ROOT):
    out = Path(out)
    if out.exists():
        raise SystemExit("refusing to write into an existing path: %s (remove it first; this script never deletes anything)" % out)
    out.mkdir(parents=True)
    for e in manifest["files"]:                                           # manifest order is sorted (checked by manifest_errors)
        dest = out / e["path"]
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(Path(root) / e["path"], dest)
        os.chmod(dest, 0o644)
        os.utime(dest, (FIXED_TIME, FIXED_TIME))
    for d in sorted((p for p in out.rglob("*") if p.is_dir()), reverse=True):
        os.chmod(d, 0o755)
        os.utime(d, (FIXED_TIME, FIXED_TIME))
    os.chmod(out, 0o755)
    inv, errs = P.inventory(out)
    return inv, errs + P.compare(inv, manifest)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="dist")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--write-manifest", action="store_true")
    a = ap.parse_args()
    release = P.load_release()
    if a.write_manifest:
        m = P.derive_manifest(release)
        errs = P.manifest_errors(m, release)
        if errs:
            print("refusing to write a manifest that fails the policy:\n  " + "\n  ".join(errs[:20]))
            return 1
        P.MANIFEST_PATH.write_text(json.dumps(m, indent=1) + "\n", encoding="utf-8")
        print("wrote %s with %d files" % (P.MANIFEST_PATH.relative_to(P.ROOT), len(m["files"])))
        return 0
    manifest = P.load_manifest()
    errs = P.manifest_errors(manifest, release)
    if errs:
        print("PUBLICATION MANIFEST CHECK FAILED:\n  " + "\n  ".join(errs[:30]) + ("\n  ... %d more" % (len(errs) - 30) if len(errs) > 30 else ""))
        return 1
    if a.check:
        print("publication manifest OK: %d files, all reviewed, hashed and policy-clean" % len(manifest["files"]))
        return 0
    inv, errs = build(a.out, manifest)
    if errs:
        print("BUILD OUTPUT DISAGREES WITH THE PUBLICATION MANIFEST:\n  " + "\n  ".join(errs[:30]))
        return 1
    print("built %s: %d files, %d bytes, tree digest %s" % (a.out, len(inv), sum(v[0] for v in inv.values()), P.tree_digest(inv)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
