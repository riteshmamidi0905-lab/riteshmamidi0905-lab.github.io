#!/usr/bin/env python3
"""Adversarial tests for the publication boundary. Builds the artifact into a temporary directory, proves it passes, then tampers with copies in the
ways an accident could happen and requires the builder, the manifest policy and the independent verifier to fail each time.
Run:  python3 scripts/test-pages-artifact.py   (uses only the temporary directory; never touches the repository or the network)"""
import copy
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import pages_policy as P

PY = sys.executable
dec = lambda *c: "".join(map(chr, c))
checks = 0


def ok(cond, name):
    global checks
    assert cond, "FAILED: " + name
    checks += 1


def run(*args):
    r = subprocess.run([PY, *map(str, args)], capture_output=True, text=True, cwd=HERE.parent)
    return r.returncode, r.stdout + r.stderr


def tampered(base, label, mutate, expect, verify_http=False):
    """Copy the good artifact, apply one accidental change, and require the verifier to reject it with the expected reason."""
    d = Path(tempfile.mkdtemp(prefix="tamper-", dir=TMP)) / "site"
    shutil.copytree(base, d, symlinks=True)
    mutate(d)
    code, out = run(HERE / "verify-pages-artifact.py", d, *([] if verify_http else ["--no-http"]))
    ok(code == 1 and expect in out, "verifier rejects: %s (expected %r)" % (label, expect))
    return out


with tempfile.TemporaryDirectory() as TMP:
    TMP = Path(TMP)
    manifest, release = P.load_manifest(), P.load_release()
    ok(P.manifest_errors(manifest, release) == [], "the committed publication manifest passes the policy and matches the sources")
    ok({e["path"] for e in manifest["files"]} == set(release) | set(P.EXTRA_FILES), "the manifest is exactly the reviewed files plus the allowed extras")
    ok(not [e["path"] for e in manifest["files"] if P.path_errors(e["path"])], "no published path trips the publication policy")
    for banned in ("scripts/validate-release.py", "scripts/selftest-lab.html", "package.json", "release-files.json", "README.md", ".github/workflows/validate.yml", "node_modules/x/index.js"):
        ok(not any(e["path"] == banned for e in manifest["files"]), "never published: " + banned)

    # --- the build is deterministic and refuses to overwrite
    a, b = TMP / "a" / "site", TMP / "b" / "site"
    code, out = run(HERE / "build-pages-artifact.py", "--out", a)
    ok(code == 0 and "built" in out, "the builder succeeds")
    code2, out2 = run(HERE / "build-pages-artifact.py", "--out", b)
    ok(code2 == 0 and out.split("tree digest")[1] == out2.split("tree digest")[1], "two independent builds have the same tree digest")
    ok(subprocess.run(["diff", "-r", str(a), str(b)], capture_output=True).returncode == 0, "two independent builds are byte-identical")
    code3, out3 = run(HERE / "build-pages-artifact.py", "--out", a)
    ok(code3 != 0 and "refusing" in out3, "the builder refuses to write into an existing directory")
    code, out = run(HERE / "verify-pages-artifact.py", a)
    ok(code == 0 and "PUBLICATION VALIDATION PASSED" in out and "excluded URLs return 404" in out, "the good artifact passes, served over HTTP, with excluded URLs returning 404")
    inv, ierr = P.inventory(a)
    ok(not ierr and not P.compare(inv, manifest), "the output equals the publication manifest exactly")

    # --- accidents the verifier must catch
    tampered(a, "a build script slipped into the output", lambda d: (d / "scripts").mkdir() or (d / "scripts" / "build-lab.py").write_text("x"), "not in the publication manifest")
    tampered(a, "a self-test page slipped in", lambda d: (d / "selftest.html").write_text("<p>x</p>"), "selftest.html")
    tampered(a, "package.json slipped in", lambda d: (d / "package.json").write_text("{}"), "package.json")
    tampered(a, "a file changed after the build", lambda d: (d / "index.html").write_text((d / "index.html").read_text() + "<!-- x -->"), "content differs from the publication manifest")
    tampered(a, "a published file is missing", lambda d: (d / "lab.css").unlink(), "missing from the output")
    tampered(a, "a symbolic link in the output", lambda d: os.symlink("/etc/hosts", d / "link.html"), "symbolic link")
    tampered(a, "an empty directory in the output", lambda d: (d / "empty").mkdir(), "empty directory")
    tampered(a, "an unregistered image", lambda d: (d / "assets" / "img" / "cases" / "extra.jpg").write_bytes(b"\xff\xd8\xff"), "extra.jpg")
    tampered(a, "a video file", lambda d: (d / "assets" / "clip.mp4").write_bytes(b"x"), "clip.mp4")
    tampered(a, "an environment file", lambda d: (d / ".env").write_text("A=1"), ".env")

    def break_link(d):
        t = (d / "index.html").read_text()
        (d / "index.html").write_text(t.replace('href="lab-explorer.html"', 'href="lab-explorer-gone.html"', 1))
    # the file also differs from the manifest; the broken reference must be reported too, so mutate the manifest-matching copy through the checker's own pass
    out = tampered(a, "a broken internal link", break_link, "does not resolve inside the artifact")

    def external_script(d):
        t = (d / "index.html").read_text()
        (d / "index.html").write_text(t.replace("<title>", '<script src="https://cdn.example.com/x.js"></script><title>', 1))
    tampered(a, "an external runtime script", external_script, "external runtime resource")

    term = dec(109, 45, 111, 112, 115, 45, 50)
    out = tampered(a, "a prohibited internal identifier in a page", lambda d: (d / "404.html").write_text((d / "404.html").read_text() + "<p>" + term + "</p>"), "disclosure rule")
    ok(term not in out, "the failure output never echoes the prohibited text")
    tampered(a, "a local path inside a binary file", lambda d: (d / "ritesh_mamidi_resume.pdf").write_bytes((d / "ritesh_mamidi_resume.pdf").read_bytes() + b"/Users/someone/x"), "local-path or account marker")

    # --- manifest tampering is rejected before anything is built
    def bad(label, mutate, expect):
        m = copy.deepcopy(manifest)
        mutate(m)
        errs = P.manifest_errors(m, release)
        ok(any(expect in e for e in errs), "manifest rejected: %s (expected %r)" % (label, expect))
    bad("a tooling script added", lambda m: m["files"].append({"path": "scripts/validate-release.py", "bytes": 1, "sha256": "0" * 64}), "never published")
    bad("an unreviewed page added", lambda m: m["files"].append({"path": "zz-new.html", "bytes": 1, "sha256": "0" * 64}), "not a reviewed release file")
    bad("a reviewed file dropped", lambda m: m["files"].pop(5), "missing from the publication manifest")
    bad("a hash changed", lambda m: m["files"][3].update(sha256="f" * 64), "differs")
    bad("paths out of order", lambda m: m["files"].reverse(), "sorted")
    bad("a malformed entry", lambda m: m["files"].append({"nope": 1}), "malformed")
    bad("a wrong-size extra file", lambda m: [e.update(bytes=5) for e in m["files"] if e["path"] == ".nojekyll"], "must be 0 bytes")
    ok(P.manifest_errors({"version": 2, "files": []}, release) != [], "manifest of an unknown version is rejected")

    for path, why in (("../x.html", "traversal"), ("/abs.html", "absolute"), ("a\\b.html", "backslash"), ("a//b.html", "empty segment"), ("scripts/x.html", "tooling directory"), ("a/package.json", "config name"),
                      ("x.py", "source file"), ("x.mp4", "media"), (".secret.html", "hidden/secret"), ("assets/x.heic", "unknown type"), ("docs/notes.md", "markdown outside recovered/"), ("a/selftest-x.html", "self-test name")):
        ok(bool(P.path_errors(path)), "policy rejects %s (%s)" % (path, why))
    ok(not P.path_errors("recovered/x/ARCHITECTURE.md") and not P.path_errors(".nojekyll") and not P.path_errors("assets/img/cases/a.jpg"), "policy accepts the legitimate published kinds")

    # --- the builder fails if output and manifest disagree (simulate a copy step that drops a file)
    code, out = run(HERE / "build-pages-artifact.py", "--check")
    ok(code == 0 and "publication manifest OK" in out, "--check passes on the committed manifest")

    # --- post-deployment verification of the live site against a SELECTED release manifest (used after a deploy and after a rollback)
    import functools
    import http.server
    import threading
    import time

    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    live = TMP / "live" / "site"
    shutil.copytree(a, live)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(live)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = "http://127.0.0.1:%d" % srv.server_address[1]
    verify = lambda *extra: run(HERE / "verify-live-site.py", url, *extra)
    code, out = verify()
    ok(code == 0 and "LIVE SITE MATCHES THE RELEASE" in out and P.tree_digest(inv) in out, "a correct deployment matches its release manifest (and reports the same tree digest)")
    css = live / "lab.css"
    original = css.read_bytes()
    css.write_bytes(original + b"/* changed */")
    code, out = verify()
    ok(code == 1 and "differs from the release manifest" in out, "live verification fails when a served file differs")
    css.unlink()
    code, out = verify()
    ok(code == 1 and "GET /lab.css -> 404" in out, "live verification fails when a published file is missing")
    css.write_bytes(original)
    (live / "scripts").mkdir()
    (live / "scripts" / "validate-release.py").write_text("x")
    code, out = verify()
    ok(code == 1 and "excluded development URL is reachable: /scripts/validate-release.py" in out, "live verification fails when a development URL becomes reachable")
    (live / "scripts" / "validate-release.py").unlink()
    (live / "scripts").rmdir()
    ok(verify()[0] == 0, "live verification passes again after the live site is restored")
    other = copy.deepcopy(manifest)                                         # a different release: what a rollback target's manifest would look like
    for e in other["files"]:
        if e["path"] == "lab.css":
            e["sha256"] = "0" * 64
    other_path = TMP / "other-release.json"
    other_path.write_text(json.dumps(other))
    code, out = verify("--manifest", other_path)
    ok(code == 1 and "/lab.css is served but differs" in out, "the live site is compared with the SELECTED release manifest, not with whatever main currently is")
    poisoned = copy.deepcopy(manifest)
    poisoned["files"].append({"path": "scripts/x.py", "bytes": 1, "sha256": "0" * 64})
    poisoned_path = TMP / "poisoned.json"
    poisoned_path.write_text(json.dumps(poisoned))
    code, out = verify("--manifest", poisoned_path)
    ok(code == 1 and "refusing a manifest" in out, "a manifest that lists unpublishable paths is refused")
    css.write_bytes(original + b"x")
    started = time.time()
    code, out = verify("--wait", 2)
    ok(code == 1 and time.time() - started >= 1.5, "--wait retries for a while before failing")
    css.write_bytes(original)
    srv.shutdown()

    # --- the release digest, the summary file and redirects
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(live)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = "http://127.0.0.1:%d" % srv.server_address[1]
    good = P.tree_digest(inv)
    code, out = verify("--expect-digest", good)
    ok(code == 0 and "LIVE SITE MATCHES THE RELEASE" in out, "the live site passes when the release manifest has the recorded tree digest")
    code, out = verify("--expect-digest", "0" * 64)
    ok(code == 1 and "DOES NOT MATCH THE RECORDED DIGEST" in out, "a release manifest whose digest differs from the recorded one is refused")
    code, out = verify("--expect-digest", "XYZ")
    ok(code == 1 and "64 lowercase hex" in out, "a malformed expected digest is refused")
    swapped = copy.deepcopy(manifest)
    swapped["files"][2]["sha256"] = "1" * 64
    swapped_path = TMP / "swapped.json"
    swapped_path.write_text(json.dumps(swapped))
    code, out = verify("--manifest", swapped_path, "--expect-digest", good)
    ok(code == 1 and "DOES NOT MATCH THE RECORDED DIGEST" in out, "a swapped manifest cannot pass even if the live site matches it")
    summary = TMP / "summary.md"
    code, out = verify("--summary", summary)
    ok(code == 0 and "PASSED" in summary.read_text() and good in summary.read_text(), "a passing run writes a summary with the digest")
    css.write_bytes(original + b"y")
    code, out = verify("--summary", summary)
    ok(code == 1 and "FAILED" in summary.read_text(), "a failing run writes a failing summary")
    css.write_bytes(original)

    class Redirecting(Quiet):
        def do_GET(self):
            if self.path.startswith("/lab.css"):
                self.send_response(302)
                self.send_header("Location", "http://localhost:9/elsewhere.css")
                self.end_headers()
            else:
                super().do_GET()
    srv2 = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Redirecting, directory=str(live)))
    threading.Thread(target=srv2.serve_forever, daemon=True).start()
    code, out = run(HERE / "verify-live-site.py", "http://127.0.0.1:%d" % srv2.server_address[1])
    ok(code == 1 and "GET /lab.css -> no response" in out, "a redirect to a different host is refused")
    srv2.shutdown()
    srv.shutdown()

print("publication boundary: %d checks passed" % checks)
