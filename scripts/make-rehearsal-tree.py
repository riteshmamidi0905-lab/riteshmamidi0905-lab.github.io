#!/usr/bin/env python3
"""Prepare a LOCAL tree for the disposable-repository rehearsal (see scripts/ROLLBACK-REHEARSAL.md). It creates nothing on GitHub.

  python3 scripts/make-rehearsal-tree.py --repo OWNER/NAME --out DIR [--variant b]

Two shapes are accepted. PROJECT mode (simplest, recommended): any repository NAME under any account except the production repository itself; the site is served at
https://OWNER.github.io/NAME and the verifier works under that path. USER-SITE mode: OWNER/OWNER.github.io under an account other than the production account.

It exports the committed files of HEAD into DIR, then points the two deployment workflows and the shared safety rules at the rehearsal repository (the production workflows are
deliberately hard-wired to the production repository, so in any other repository every job would skip), and re-runs the workflow safety tests and the release evidence tests
inside DIR. --variant b makes a second, different release for the rollback exercise by appending an HTML comment to 404.html and regenerating the publication manifest; the
digest of variant b therefore differs from the pinned production digest on purpose. The exported tree has no git history; initialise it as a new repository yourself."""
import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

PROD_REPO = "riteshmamidi0905-lab/riteshmamidi0905-lab.github.io"
PROD_HOST = "riteshmamidi0905-lab.github.io"
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
TARGETS = (".github/workflows/pages.yml", ".github/workflows/rollback.yml", "scripts/workflow_rules.py", "scripts/RELEASE-CHECKS.md", "scripts/FIRST-DEPLOYMENT.md")


def run(args, cwd):
    r = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
    return r.returncode, (r.stdout + r.stderr).strip()


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--repo", required=True, help="OWNER/NAME of the disposable repository (a user site repository named OWNER.github.io, or a project repository)")
    ap.add_argument("--out", required=True)
    ap.add_argument("--variant", choices=("a", "b"), default="a")
    a = ap.parse_args(argv)
    if not re.fullmatch(r"[\w.-]+/[\w.-]+", a.repo) or a.repo.lower() == PROD_REPO.lower():
        sys.exit("refusing: give the disposable repository as OWNER/NAME; it must not be the production repository")
    owner, name = a.repo.split("/")
    prod_owner = PROD_REPO.split("/")[0].lower()
    if name.lower() == owner.lower() + ".github.io":           # user-site mode
        if owner.lower() == prod_owner:
            sys.exit("refusing: that is the production user-site repository")
        site_url = "https://%s.github.io" % owner
    elif name.lower().endswith(".github.io"):
        sys.exit("refusing: a repository named *.github.io must be OWNER/OWNER.github.io")
    else:                                                       # project mode: served under /NAME
        site_url = "https://%s.github.io/%s" % (owner, name)
    out = Path(a.out)
    if out.exists() and any(out.iterdir()):
        sys.exit("refusing: %s exists and is not empty" % out)
    out.mkdir(parents=True, exist_ok=True)
    tar = subprocess.run(["git", "-C", str(ROOT), "archive", "HEAD"], capture_output=True)
    if tar.returncode != 0:
        sys.exit("git archive failed")
    subprocess.run(["tar", "-x", "-C", str(out)], input=tar.stdout, check=True)
    for rel in TARGETS:
        p = out / rel
        s = p.read_text(encoding="utf-8")
        p.write_text(s.replace(PROD_REPO, a.repo).replace("https://" + PROD_HOST, site_url).replace(PROD_HOST, site_url.split("//")[1].split("/")[0]), encoding="utf-8")
    want = 'SITE_URL: %s\n' % site_url
    for rel in (".github/workflows/pages.yml", ".github/workflows/rollback.yml"):
        if want not in (out / rel).read_text(encoding="utf-8"):
            sys.exit("internal error: %s does not point SITE_URL at %s" % (rel, site_url))
    same_host = site_url.split("//")[1].split("/")[0] == PROD_HOST        # project mode under the production account shares the host name but not the path
    left = [rel for rel in TARGETS if PROD_REPO in (out / rel).read_text(encoding="utf-8") or (not same_host and PROD_HOST in (out / rel).read_text(encoding="utf-8"))]
    if left:
        sys.exit("internal error: production identifiers remain in %s" % left)
    if a.variant == "b":
        p = out / "404.html"
        p.write_text(p.read_text(encoding="utf-8").rstrip("\n") + "\n<!-- rehearsal release b -->\n", encoding="utf-8")
        rf = out / "release-files.json"                     # the reviewed-file list pins every published file's size and hash
        files = json.loads(rf.read_text(encoding="utf-8"))
        data = p.read_bytes()
        for e in files:
            if e["path"] == "404.html":
                e["bytes"], e["sha256"] = len(data), hashlib.sha256(data).hexdigest()
        rf.write_text(json.dumps(files, indent=1) + "\n", encoding="utf-8")
        code, msg = run([sys.executable, "scripts/build-pages-artifact.py", "--write-manifest"], out)
        if code:
            sys.exit("could not regenerate the manifest:\n" + msg)
    for script in ("test-workflows.py", "test-release-evidence.py", "test-pages-artifact.py"):
        code, msg = run([sys.executable, "scripts/" + script], out)
        print("%-26s exit %d  %s" % (script, code, msg.splitlines()[-1][:110] if msg else ""))
        if code:
            sys.exit("a safety test failed inside the rehearsal tree:\n" + msg[-1500:])
    code, msg = run([sys.executable, "scripts/build-pages-artifact.py", "--out", str(out.parent / (out.name + "-dist"))], out)
    print(msg.splitlines()[-1][:200] if msg else "")
    print("rehearsal tree ready in %s (variant %s); the site will be served at %s. Nothing was created on GitHub." % (out, a.variant, site_url))
    return 0


if __name__ == "__main__":
    sys.exit(main())
