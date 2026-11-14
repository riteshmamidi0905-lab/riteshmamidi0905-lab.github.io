"""Shared policy for the GitHub Pages publication artifact.

Two different questions are answered by two different manifests, on purpose:
  * release-files.json   SOURCE validation: the reviewed, hash-pinned files that make up the website (scripts/validate-release.py).
  * scripts/publish-manifest.json   PUBLICATION: the exact allowlist of files that may appear in the deployed artifact.
The builder (build-pages-artifact.py) copies only what the publication manifest lists; the verifier (verify-pages-artifact.py) re-checks an
output directory against it independently. Nothing in the source tree is published unless it is listed, hashed and passes this policy.
"""
import hashlib
import json
import os
import re
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "scripts" / "publish-manifest.json"
RELEASE_PATH = ROOT / "release-files.json"
EXTRA_FILES = {".nojekyll": 0}            # published although not hash-pinned in release-files.json: path -> required size in bytes
DENY_PARTS = {"scripts", "node_modules", ".github", ".git", "work", "review", "dist", "tests", "__pycache__", "pending-assets", "private"}
DENY_NAMES = {"package.json", "package-lock.json", "release-files.json", "publish-manifest.json", "disclosure-rules.json", "README.md", ".gitignore", ".gitattributes"}
DENY_SUFFIX = (".py", ".cjs", ".mjs", ".sh", ".map", ".log", ".bak", ".orig", ".env", ".pem", ".key", ".yml", ".yaml", ".ts", ".ipynb", ".zip", ".mp4", ".webm", ".mov")
DENY_SUBSTR = ("selftest", ".private", ".local", "secret", "credential")
ALLOWED_SUFFIX = {".html", ".css", ".js", ".json", ".xml", ".txt", ".svg", ".pdf", ".woff2", ".jpg", ".png", ".webp", ".md"}
MD_ONLY_UNDER = ("recovered/",)           # the one pre-existing published document type that is not a page; everywhere else .md is documentation
EXCLUDED_URLS = ("/scripts/validate-release.py", "/scripts/selftest-lab.html", "/scripts/selftest-overflow.html", "/package.json", "/package-lock.json",
                 "/release-files.json", "/README.md", "/.gitignore", "/.github/workflows/validate.yml", "/scripts/disclosure-rules.json", "/scripts/publish-manifest.json", "/scripts/verify-live-site.py", "/scripts/RELEASE-CHECKS.md", "/scripts/disclosure.py", "/scripts/pages_policy.py")
_HEX64 = re.compile(r"^[0-9a-f]{64}$")


def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()


def path_errors(rel):
    """Why a path may never be published (an empty list means it passes the policy)."""
    if not isinstance(rel, str) or not rel:
        return ["empty or non-string path"]
    errs = []
    if "\\" in rel or rel.startswith("/") or PurePosixPath(rel).as_posix() != rel or any(p in ("", ".", "..") for p in rel.split("/")):
        errs.append("%s: not a normalised relative path" % rel)
        return errs
    parts = rel.split("/")
    low = rel.lower()
    name = parts[-1]
    if name in EXTRA_FILES:
        return errs
    if any(p in DENY_PARTS for p in parts[:-1]):
        errs.append("%s: lives in a directory that is never published" % rel)
    if name in DENY_NAMES:
        errs.append("%s: development or configuration file" % rel)
    if low.endswith(DENY_SUFFIX):
        errs.append("%s: tooling, source or secret-like file type" % rel)
    if any(s in low for s in DENY_SUBSTR):
        errs.append("%s: name marks it as a self-test, private or secret file" % rel)
    if name.startswith("."):
        errs.append("%s: hidden file" % rel)
    suffix = PurePosixPath(rel).suffix.lower()
    if suffix not in ALLOWED_SUFFIX:
        errs.append("%s: file type %r is not publishable" % (rel, suffix))
    elif suffix == ".md" and not rel.startswith(MD_ONLY_UNDER):
        errs.append("%s: markdown is documentation, not site content" % rel)
    return errs


def load_release(path=RELEASE_PATH):
    items = json.loads(Path(path).read_text(encoding="utf-8"))
    return {i["path"]: {"bytes": i["bytes"], "sha256": i["sha256"]} for i in items}


def load_manifest(path=MANIFEST_PATH):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def manifest_errors(manifest, release, root=ROOT):
    """Check a publication manifest against the reviewed release pins and the source files. Returns a list of problems."""
    errs = []
    if not isinstance(manifest, dict) or manifest.get("version") != 1 or not isinstance(manifest.get("files"), list):
        return ["publication manifest malformed (expected version 1 and a files list)"]
    entries = manifest["files"]
    paths = [e.get("path") if isinstance(e, dict) else None for e in entries]
    if paths != sorted(p for p in paths if isinstance(p, str)) or len(set(paths)) != len(paths):
        errs.append("publication manifest paths must be unique and sorted")
    published = set()
    for e in entries:
        if not isinstance(e, dict) or not isinstance(e.get("path"), str):
            errs.append("publication manifest entry malformed")
            continue
        rel = e["path"]
        published.add(rel)
        errs += path_errors(rel)
        if not isinstance(e.get("bytes"), int) or not _HEX64.match(str(e.get("sha256", ""))):
            errs.append("%s: bytes or sha256 malformed" % rel)
            continue
        if rel not in release and rel not in EXTRA_FILES:
            errs.append("%s: listed for publication but not a reviewed release file" % rel)
        if rel in release and (release[rel]["bytes"] != e["bytes"] or release[rel]["sha256"] != e["sha256"]):
            errs.append("%s: differs from the reviewed pin in release-files.json" % rel)
        if rel in EXTRA_FILES and e["bytes"] != EXTRA_FILES[rel]:
            errs.append("%s: must be %d bytes" % (rel, EXTRA_FILES[rel]))
        src = Path(root) / rel
        if src.is_symlink() or not src.is_file():
            errs.append("%s: source is missing, a symlink or not a regular file" % rel)
        else:
            b = src.read_bytes()
            if len(b) != e["bytes"] or sha256_bytes(b) != e["sha256"]:
                errs.append("%s: source file differs from the publication manifest" % rel)
    for rel in sorted(set(release) - published):
        errs.append("%s: reviewed release file missing from the publication manifest" % rel)
    return errs


def derive_manifest(release, root=ROOT):
    files = [{"path": p, "bytes": v["bytes"], "sha256": v["sha256"]} for p, v in release.items()]
    for p in EXTRA_FILES:
        b = (Path(root) / p).read_bytes()
        files.append({"path": p, "bytes": len(b), "sha256": sha256_bytes(b)})
    files.sort(key=lambda e: e["path"])
    return {"version": 1, "description": "Exact allowlist of files published to GitHub Pages. Regenerate with: python3 scripts/build-pages-artifact.py --write-manifest", "files": files}


def inventory(directory):
    """Every entry under directory: {relative path: (bytes, sha256)} plus errors for symlinks, empty directories and special files."""
    inv, errs = {}, []
    base = Path(directory)
    for dirpath, dirnames, filenames in os.walk(base, followlinks=False):
        dp = Path(dirpath)
        for d in list(dirnames):
            if (dp / d).is_symlink():
                errs.append("%s: symbolic link" % (dp / d).relative_to(base).as_posix())
                dirnames.remove(d)
        if not filenames and not dirnames and dp != base:
            errs.append("%s: empty directory" % dp.relative_to(base).as_posix())
        for f in filenames:
            p = dp / f
            rel = p.relative_to(base).as_posix()
            if p.is_symlink() or not p.is_file():
                errs.append("%s: symbolic link or special file" % rel)
                continue
            b = p.read_bytes()
            inv[rel] = (len(b), sha256_bytes(b))
    return inv, errs


def compare(inv, manifest):
    """Differences between an inventory and the publication manifest. Empty means they agree exactly."""
    want = {e["path"]: (e["bytes"], e["sha256"]) for e in manifest["files"]}
    errs = []
    for rel in sorted(set(inv) - set(want)):
        errs.append("%s: present in the output but not in the publication manifest" % rel)
    for rel in sorted(set(want) - set(inv)):
        errs.append("%s: in the publication manifest but missing from the output" % rel)
    for rel in sorted(set(inv) & set(want)):
        if inv[rel] != want[rel]:
            errs.append("%s: content differs from the publication manifest" % rel)
        errs += path_errors(rel)
    return errs


def tree_digest(inv):
    """One hash for the whole artifact: identical inputs give an identical value on every machine."""
    return sha256_bytes("".join("%s\t%s\n" % (p, inv[p][1]) for p in sorted(inv)).encode("utf-8"))

# Exact assets authorized by the Phase 4.2 integration directive. No wildcard allowance.
APPROVED_GENERATED_IMAGES = {'assets/img/agents/aegis.webp': 'ac898d5cb67e243bc92992d7fc5f02f335af01edf65d8cbd5a7859fdfa54e35a',
 'assets/img/agents/aethon.webp': '720adec8373822198cfa15901170bae2acb8258f057957e0ddd0b65e5d6ad0bc',
 'assets/img/agents/cortex.webp': '7afcf8d09fb6dbfb323e331cc0128927c4a5f09fdb61a966b99693bda84b3d62',
 'assets/img/agents/echon.webp': 'fd20dd1a888fc1042634356bcdc50ca738faa1a7500cd0bb3e7cfc863864edd0',
 'assets/img/agents/nexora.webp': '5f6d8ee73cb2939d4d1f032f533b63c54abfeefa831e5d2f7d306984b2c61c31',
 'assets/img/agents/novara.webp': '5f7937e1dda979c7d374bb6e95de706f643f7ce476c694d065143b6e675aaedc',
 'assets/img/agents/pyrix.webp': 'e3a6fbd0585e53e899b61ca39325842722e3a8408cbdcece107c77759f4aec73',
 'assets/img/agents/quantix.webp': '34ec3f554f54f489cac5958f879bf3478c91208af94f983243aab60f73f0a8da',
 'assets/img/agents/synapse.webp': '9f0abf0ad725ab09850e995780dc9432489df6569919cde2122315eb72a3f568',
 'assets/img/agents/vectra.webp': 'd1ac45e2ee2270d5d819856d6dd2e91324d2baeaf40526a8269a24ccd4c4bd9a',
 'assets/img/agents/veritas.webp': 'aebd1c699e7f2dd5a56f3186aba94be5a09956e805be316cd5b85804cd96671c',
 'assets/img/agents/zybrew.webp': 'de55dfdec7d40f5bd79113435ca11e8187461a6a8f762d5395ba4cef2bae3b92',
 'assets/img/business/brewery-square.webp': '05307aa77d07111c0223f45dbbf199ce59163cd07ce90dba0851f39594190629',
 'assets/img/business/brewery.webp': 'aea7dacfa1dbb91d0efa487fa4de3d098d4d7b4ccd087580c93f7c2f4d4db213',
 'assets/img/business/categories-square.webp': 'a7ec56918ca2d0c41b61507757c9445668d95eca73ba5c7ef37dfe1c55d715ed',
 'assets/img/business/categories.webp': 'eb37edaa8e9f2ea3b25d09863552a66f4c3bf21eb7d7baa3136351560f30a991',
 'assets/img/business/chicken65-square.webp': 'c6df07141bbf4025b8c0c0ac87d9e41accbd1839dac5b38a6607c1cc8ef7e662',
 'assets/img/business/chicken65.webp': '09ee53299771cdecee6125c1faa6579f28a91c7967d59eccb712b61bbc8d4280',
 'assets/img/business/gobi-square.webp': '15950cfbaa5d5d93289f91d76f446e1c4d67baca7a1334ca78b6ae99aaf511e6',
 'assets/img/business/gobi.webp': '83ae39f0c5ceefd113858a8e4a84c946e2ab80b4c00e5073496afa90a7ec7ec6',
 'assets/img/business/ingredients-square.webp': 'd8082b2628e4e5a8dfa7b57d1ce59308e4463df22acb63f6747c00e04e7422c6',
 'assets/img/business/ingredients.webp': '40155d220cdc9d5004737b9cfd7c7a3ec58d6ac51fd3fc9576332b4a9cfa6710',
 'assets/img/business/paneer-square.webp': '57034c69c0bdca1e06535cd4c485d596fc63edfcf7184df15f1fa6561a31ac39',
 'assets/img/business/paneer.webp': '9ded95f58380dfde84021d7a353faea795f43c8e81f1456164bc5c4a5ffc3442',
 'assets/img/business/quesadilla-square.webp': '949655da5b9f93a7a058c836d977ee1cd0b35041b3ae2c2fb4312eeb3e9d2bc6',
 'assets/img/business/quesadilla.webp': '81c7aad137140a5b24994f26af259fcab262582b920e16d2e096a2b1ea0ddd75',
 'assets/img/business/warehouse-control-square.webp': '10297111746ce0600fb454b88d68b69c6f5428a0ee0104d200b2ba54612da414',
 'assets/img/business/warehouse-control.webp': '944f6d7d6e8f7d71a5a7047693f39f5eee267c2a61f91052fa2ba7d522b94a32',
 'assets/img/business/warehouse-square.webp': '2f62c75cc9b43d49fd593804ee1268c03ae392b1ddc6f1cfb364c0e9da18f7ee',
 'assets/img/business/warehouse.webp': 'ba7df72173c126f150279d11ba42f83925eaf83f364c9d0c07f2b23b9192276a'}

def generated_image_errors(rel, entry, data):
    if rel not in APPROVED_GENERATED_IMAGES:
        return [rel + ": generated concept is not individually approved"]
    expected = APPROVED_GENERATED_IMAGES[rel]
    if entry.get("kind") != "generated-concept" or entry.get("cleared_for_public_release") is not True:
        return [rel + ": generated concept lacks truthful type or clearance"]
    if entry.get("sha256") != expected or sha256_bytes(data) != expected:
        return [rel + ": approved generated image digest mismatch"]
    for key in ("generation_id", "original_sha256", "rights_url", "approval_basis", "label"):
        if not entry.get(key):
            return [rel + ": missing provenance field " + key]
    return []
