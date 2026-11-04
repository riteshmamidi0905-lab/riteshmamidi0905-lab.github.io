#!/usr/bin/env python3
"""Post-deployment verification: compare the LIVE site with a release's publication manifest. Changes nothing on the site.

  python3 scripts/verify-live-site.py BASE_URL [--manifest PATH] [--expect-digest HEX] [--summary FILE] [--wait SECONDS]

Every file in the manifest must be served byte-identical (size and SHA-256), and every excluded development URL must be unavailable (404 or 410).
--manifest selects WHICH release is expected: the manifest of the commit that was deployed, so after a rollback the live site is compared with the
rolled-back release, not with the current main. --expect-digest also requires that manifest's tree digest to equal the digest recorded when the release
was built, so the manifest itself cannot have been swapped. A redirect to a different host is refused. --summary appends a short result to a file
(for example $GITHUB_STEP_SUMMARY). --wait retries for up to that many seconds while the CDN catches up. Exit 0 only if everything agrees."""
import argparse
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pages_policy as P


class SameHostRedirects(urllib.request.HTTPRedirectHandler):
    """Follow redirects (for example /demo to /demo/) but never to another host: the answer must come from the site being verified."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urlsplit(newurl).netloc != urlsplit(req.full_url).netloc:
            raise urllib.error.URLError("redirect to another host refused")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


OPENER = urllib.request.build_opener(SameHostRedirects)


def fetch(url, timeout=20):
    req = urllib.request.Request(url + ("&" if "?" in url else "?") + "verify=%d" % time.time_ns(), headers={"Cache-Control": "no-cache", "User-Agent": "release-verifier"})
    try:
        with OPENER.open(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b""
    except (urllib.error.URLError, OSError):
        return 0, b""


def check(base, manifest):
    errs = []
    for e in manifest["files"]:
        rel = e["path"]
        if rel in P.EXTRA_FILES:                                   # .nojekyll need not be served by an artifact deployment
            continue
        code, body = fetch("%s/%s" % (base, rel))
        if code != 200:
            errs.append("GET /%s -> %s" % (rel, code or "no response"))
        elif len(body) != e["bytes"] or P.sha256_bytes(body) != e["sha256"]:
            errs.append("/%s is served but differs from the release manifest" % rel)
    for url in P.EXCLUDED_URLS:
        code, _ = fetch(base + url)
        if code not in (404, 410):
            errs.append("excluded development URL is reachable: %s -> %s" % (url, code or "no response"))
    return errs


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("base_url")
    ap.add_argument("--manifest", default=str(P.MANIFEST_PATH))
    ap.add_argument("--wait", type=int, default=0)
    ap.add_argument("--expect-digest", default=None)
    ap.add_argument("--summary", default=None)
    a = ap.parse_args()
    base = a.base_url.rstrip("/")
    if a.expect_digest is not None and not re.fullmatch(r"[0-9a-f]{64}", a.expect_digest):
        print("--expect-digest must be 64 lowercase hex characters")
        return 1
    manifest = P.load_manifest(a.manifest)
    if manifest.get("version") != 1 or not manifest.get("files"):
        print("manifest unusable: %s" % a.manifest)
        return 1
    bad = [x for e in manifest["files"] for x in P.path_errors(e["path"])]
    if bad:
        print("refusing a manifest that lists unpublishable paths: %s" % bad[0])
        return 1
    digest = P.tree_digest({e["path"]: (e["bytes"], e["sha256"]) for e in manifest["files"]})
    if a.expect_digest is not None and digest != a.expect_digest:
        print("RELEASE MANIFEST DOES NOT MATCH THE RECORDED DIGEST: manifest %s, expected %s" % (digest, a.expect_digest))
        return 1
    deadline = time.time() + a.wait
    while True:
        errs = check(base, manifest)
        if not errs or time.time() >= deadline:
            break
        time.sleep(min(15, max(1, deadline - time.time())))
    served = sum(1 for e in manifest["files"] if e["path"] not in P.EXTRA_FILES)
    if errs:
        msg = "LIVE SITE DOES NOT MATCH THE RELEASE (%d problem(s)):\n  " % len(errs) + "\n  ".join(errs[:30])
        result = 1
    else:
        msg = "LIVE SITE MATCHES THE RELEASE: %d files byte-identical, %d excluded URLs unavailable (tree digest of the manifest: %s)" % (served, len(P.EXCLUDED_URLS), digest)
        result = 0
    print(msg)
    if a.summary:
        with open(a.summary, "a", encoding="utf-8") as fh:
            fh.write("### Live verification\n- %s\n- site: %s\n- release tree digest: `%s`\n" % ("PASSED" if result == 0 else "FAILED (%d problem(s))" % len(errs), base, digest))
    return result

if __name__ == "__main__":
    sys.exit(main())
