#!/usr/bin/env python3
"""Publication validation: independently verify a built GitHub Pages artifact directory.

  python3 scripts/verify-pages-artifact.py dist [--no-http]

This is deliberately separate from SOURCE validation (scripts/validate-release.py). It trusts nothing the builder did and checks the output itself:
  1. the output equals the publication manifest exactly (no extra, missing or changed file) and every path passes the publication policy;
  2. no development tooling, self-test page, configuration or documentation is present;
  3. every image is a cleared screenshot from the artifact's own image register, and binary files carry no local-path leaks;
  4. every internal link, asset, stylesheet url(), script and fetched data file resolves inside the artifact (fragments included);
  5. no prohibited identifier appears (hashed disclosure rules, plus private rules when PORTFOLIO_PRIVATE_RULES is set; the check fails closed);
  6. the required pages and honest-status disclosures are present (six case studies, Enterprise Demo, Data Lab, Lab Explorer, recruiter pages);
  7. served over HTTP, every published file returns 200 and every excluded tooling URL returns 404.
It never deploys or uploads anything.
"""
import argparse
import functools
import json
import http.server
import posixpath
import re
import sys
import threading
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent))
import disclosure as D
import pages_policy as P

TEXT_SUFFIX = (".html", ".css", ".js", ".json", ".xml", ".txt", ".svg", ".md")
BINARY_LEAKS = (b"/Users/", b"/home/", b"/private/var", b"riteshrithu", b"NASHA-AI/")
RESOURCE_ATTRS = {("script", "src"), ("link", "href"), ("img", "src"), ("source", "src"), ("iframe", "src"), ("video", "src"), ("audio", "src"), ("embed", "src"), ("object", "data")}
JS_LITERAL = re.compile(r"""['"]((?:\.{1,2}/)?[A-Za-z0-9_][A-Za-z0-9_./-]*\.(?:json|js|css|html|woff2|jpg|png|webp|svg|pdf))['"]""")
CSS_URL = re.compile(r"""url\(\s*['"]?([^'")\s]+)['"]?\s*\)|@import\s+['"]([^'"]+)['"]""")
RESOURCE_RELS = {"stylesheet", "preload", "modulepreload", "icon", "shortcut", "apple-touch-icon", "manifest", "prefetch", "preconnect"}
IMAGE_SUFFIX = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".ico", ".avif")
ALLOWED_NON_REGISTER_IMAGES = {"mark.svg"}


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.refs, self.projects, self.flags, self.h1, self.title = set(), [], 0, 0, 0, ""
        self._t = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.add(a["id"])
        cls = a.get("class", "").split()
        self.projects += "project" in cls
        self.flags += "flag-card" in cls
        self.h1 += tag == "h1"
        self._t = tag == "title"
        for attr in ("href", "src", "poster", "data"):
            if attr in a and a[attr]:
                res = (tag, attr) in RESOURCE_ATTRS
                if tag == "link":                                          # canonical, alternate, author ... are metadata, not runtime resources
                    res = bool(set(a.get("rel", "").lower().split()) & RESOURCE_RELS)
                self.refs.append((tag, attr, a[attr].strip(), res))
        if "srcset" in a:
            for part in a["srcset"].split(","):
                if part.strip():
                    self.refs.append((tag, "srcset", part.strip().split()[0], True))

    def handle_data(self, data):
        if self._t:
            self.title += data

    def handle_endtag(self, tag):
        if tag == "title":
            self._t = False


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("directory")
    ap.add_argument("--no-http", action="store_true")
    a = ap.parse_args()
    base = Path(a.directory)
    errs, notes = [], []
    if not base.is_dir():
        print("not a directory: %s" % base)
        return 1
    manifest = P.load_manifest()
    errs += P.manifest_errors(manifest, P.load_release())
    inv, ierrs = P.inventory(base)
    errs += ierrs + P.compare(inv, manifest)                                              # 1 + 2
    names = set(inv)
    notes.append("inventory: %d files, %d bytes, tree digest %s" % (len(names), sum(v[0] for v in inv.values()), P.tree_digest(inv)))

    # 3 images and binaries
    reg = {}
    if "data/image-register.json" in names:
        reg = {r["file"]: r for r in json.loads((base / "data/image-register.json").read_text(encoding="utf-8"))}
    for rel in sorted(names):
        low = rel.lower()
        if low.endswith(IMAGE_SUFFIX):
            if rel.startswith("assets/img/"):
                r = reg.get(rel)
                if not r or r.get("cleared_for_public_release") is not True or r.get("kind") != "screenshot":
                    errs.append("%s: image is not a cleared screenshot in the artifact's own image register" % rel)
            elif rel not in ALLOWED_NON_REGISTER_IMAGES:
                errs.append("%s: image outside assets/img/ and not an allowlisted brand asset" % rel)
        if not low.endswith(TEXT_SUFFIX):
            b = (base / rel).read_bytes()
            for needle in BINARY_LEAKS:
                if needle in b:
                    errs.append("%s: binary file contains a local-path or account marker" % rel)
                    break

    # 4 references
    pages = {}
    for rel in sorted(names):
        if rel.endswith(".html"):
            pg = Page()
            pg.feed((base / rel).read_text(encoding="utf-8"))
            pages[rel] = pg

    def resolve(src, ref):
        u = urlsplit(ref)
        if u.scheme in ("http", "https"):
            return ("external", None)
        if u.scheme in ("mailto", "tel"):
            return ("ignore", None)
        if u.scheme or u.netloc:
            return ("bad", None)
        path = unquote(u.path)
        if not path:
            return (src, u.fragment)
        t = posixpath.normpath(str(PurePosixPath(src).parent / path)) if not path.startswith("/") else posixpath.normpath(path.lstrip("/"))
        if t.startswith(".."):
            return ("escape", None)
        if t == ".":
            t = "index.html"
        elif path.endswith("/") or (t not in names and t + "/index.html" in names):
            t = t + "/index.html"
        return (t, u.fragment)

    internal_refs = set()
    for src, pg in pages.items():
        for tag, attr, ref, is_res in pg.refs:
            t, frag = resolve(src, ref)
            if t == "external":
                if is_res:
                    errs.append("%s: external runtime resource <%s %s=%s>" % (src, tag, attr, ref[:80]))
                continue
            if t == "ignore":
                continue
            if t in ("bad", "escape"):
                errs.append("%s: unusable reference %s" % (src, ref[:80]))
                continue
            if t not in names:
                errs.append("%s: reference does not resolve inside the artifact: %s" % (src, ref[:80]))
                continue
            internal_refs.add(t)
            if frag and not frag.startswith("/") and t in pages and unquote(frag) not in pages[t].ids:
                errs.append("%s: fragment not found in %s: #%s" % (src, t, frag[:60]))
    for rel in sorted(names):
        text = None
        if rel.endswith(".css"):
            text = (base / rel).read_text(encoding="utf-8")
            for m in CSS_URL.finditer(text):
                ref = m.group(1) or m.group(2)
                if ref.startswith(("data:", "#")) or urlsplit(ref).scheme:
                    continue
                t, _ = resolve(rel, ref)
                if t not in names:
                    errs.append("%s: css reference does not resolve: %s" % (rel, ref[:80]))
        elif rel.endswith(".js"):
            text = (base / rel).read_text(encoding="utf-8")
            for m in JS_LITERAL.finditer(text):
                ref = m.group(1)
                if "//" in ref:
                    continue
                if not (posixpath.normpath(ref) in names or posixpath.normpath(str(PurePosixPath(rel).parent / ref)) in names):
                    errs.append("%s: script refers to a file that is not in the artifact: %s" % (rel, ref[:80]))

    # 5 disclosure (fail-closed)
    try:
        rules = D.load()
        scan_list = sorted(r for r in names if r.endswith(TEXT_SUFFIX))
        D.check_coverage(scan_list, {e["path"] for e in manifest["files"] if e["path"].endswith(TEXT_SUFFIX)}, minimum=20)   # never a silent empty scan
        notes.append("disclosure: %d artifact text files scanned, every manifest text file covered (%s)" % (len(scan_list), rules.private_summary()))
        errs += D.check_files(rules, base, scan_list, "file")
    except D.RulesError as exc:
        errs.append("disclosure rules unusable (fail-closed): %s" % exc)
    except D.CoverageError as exc:
        errs.append("disclosure scan coverage (fail-closed): %s" % exc)

    # 6 required pages and honest statuses
    need = ["index.html", "recruiter.html", "projects.html", "lab-explorer.html", "verified-projects.html", "data-lab.html", "case-studies.html", "demo/index.html", "demo/app.js", "demo/engine.js", "demo/data.js", "data/lab.json", "data/cases.json", "data/datalab/lab-data.json", "robots.txt", "sitemap.xml", "404.html"]
    errs += ["%s: required page or runtime file missing" % n for n in need if n not in names]
    cases = sorted(n for n in names if n.startswith("case-") and n.endswith(".html") and n != "case-studies.html")
    if len(cases) != 6:
        errs.append("expected six case-study pages, found %d" % len(cases))
    if "case-studies.html" in pages:
        linked = {resolve("case-studies.html", r[2])[0] for r in pages["case-studies.html"].refs}
        errs += ["%s: case study is not linked from case-studies.html" % c for c in cases if c not in linked]
    for c in cases:
        if c in pages and (pages[c].h1 != 1 or not pages[c].title.strip()):
            errs.append("%s: needs exactly one h1 and a title" % c)
    if "projects.html" in pages and pages["projects.html"].projects != 24:
        errs.append("projects.html: expected 24 projects, found %d" % pages["projects.html"].projects)
    if "index.html" in pages and pages["index.html"].flags != 6:
        errs.append("index.html: expected six flagship cards, found %d" % pages["index.html"].flags)
    must = {"index.html": ["not an operating business", "has not met its acceptance criteria (failed)"], "lab-explorer.html": ["not an operating business", "has not met its acceptance criteria (failed)"],
            "data-lab.html": ["PASS WITH SKIPS", "none of this is production-deployed", "SYNTHETIC", "has not met its acceptance criteria (failed)"], "demo/index.html": ["SYNTHETIC"],
            "verified-projects.html": ["not an operating business"]}
    for rel, phrases in must.items():
        if rel in names:
            s = (base / rel).read_text(encoding="utf-8")
            errs += ["%s: required honest-status text missing: %r" % (rel, ph) for ph in phrases if ph not in s]
    if "assets/js/nasha-ecosystem-core.js" in names and "prefers-reduced-motion" not in (base / "cinematic.css").read_text(encoding="utf-8"):
        errs.append("cinematic.css: reduced-motion rules missing")

    # 7 served over HTTP
    if not a.no_http and not errs:
        srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(base)))
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        root = "http://127.0.0.1:%d" % srv.server_address[1]

        def status(url):
            try:
                with urllib.request.urlopen(url, timeout=15) as r:
                    return r.status, len(r.read())
            except urllib.error.HTTPError as e:
                return e.code, 0
        for rel in sorted(names):
            code, n = status("%s/%s" % (root, rel))
            if code != 200 or n != inv[rel][0]:
                errs.append("GET /%s -> %s (%d bytes, expected %d)" % (rel, code, n, inv[rel][0]))
        for rel in ("", "demo/"):
            if status("%s/%s" % (root, rel))[0] != 200:
                errs.append("GET /%s did not return 200" % rel)
        for url in P.EXCLUDED_URLS:
            if status(root + url)[0] != 404:
                errs.append("excluded URL is reachable: %s" % url)
        srv.shutdown()
        notes.append("http: %d files fetched, %d excluded URLs return 404" % (len(names), len(P.EXCLUDED_URLS)))
    if errs:
        print("PUBLICATION VALIDATION FAILED (%d problem(s)):\n  " % len(errs) + "\n  ".join(errs[:40]) + ("\n  ... %d more" % (len(errs) - 40) if len(errs) > 40 else ""))
        return 1
    print("PUBLICATION VALIDATION PASSED\n  " + "\n  ".join(notes))
    return 0


if __name__ == "__main__":
    sys.exit(main())
