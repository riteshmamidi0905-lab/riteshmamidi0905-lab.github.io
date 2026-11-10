#!/usr/bin/env python3
"""Tests for the hashed disclosure rules (scripts/disclosure.py). Every sensitive sample is built from character codes, so this public file
does not spell the terms it proves are detected. Run:  python3 scripts/test-disclosure.py"""
import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import disclosure as D

dec = lambda *c: "".join(map(chr, c))
checks = 0


def ok(cond, name):
    global checks
    assert cond, "FAILED: " + name
    checks += 1


def raises(fn, exc, name):
    try:
        fn()
    except exc:
        ok(True, name)
        return
    ok(False, name)


os.environ.pop("PORTFOLIO_PRIVATE_RULES", None)
os.environ.pop("REQUIRE_PRIVATE_RULES", None)
R = D.load()
ok(R.public_count >= 17, "the public ruleset carries all 17 rules")

POSITIVE = {
    "programme id": dec(77, 45, 79, 80, 83, 45, 50), "programme id lower": dec(109, 45, 111, 112, 115, 45, 50), "id with underscores": dec(109, 95, 111, 112, 115, 95, 51),
    "amendment id": dec(68, 88, 45, 49), "amendment phrase": "see " + dec(65, 109, 101, 110, 100, 109, 101, 110, 116) + " " + dec(49, 46, 51) + ".",
    "inner part": "a" + dec(95, 100, 120, 49, 95) + "b", "status one": dec(82, 69, 81, 85, 73, 82, 69, 83, 95, 82, 69, 86, 73, 69, 87), "status two": "x_" + dec(78, 79, 95, 71, 79) + "_y",
    "phrase across markup": "<b>" + dec(67, 108, 111, 117, 100) + "</b> " + dec(115, 109, 111, 107, 101),
    "private repo": "https://github.com/o/" + dec(73, 78, 68, 79, 45, 77, 69, 88, 45, 66, 82, 69, 87, 69, 82, 89) + "/blob/x",
    "private repo with suffix": dec(105, 110, 100, 111, 45, 109, 101, 120, 45, 98, 114, 101, 119, 101, 114, 121) + "-v2",
    "withheld record": dec(110, 97, 115, 104, 97, 45, 99, 111, 110, 99, 101, 112, 116, 45, 99, 111, 117, 114, 116), "withheld marker": dec(80, 82, 79, 86, 73, 83, 73, 79, 78, 65, 76, 45, 76, 79, 67, 65, 76, 45, 79, 78, 76, 89),
    "withheld phrase": dec(67, 111, 110, 99, 101, 112, 116) + " " + dec(105, 109, 97, 103, 101) + " " + dec(119, 105, 116, 104, 104, 101, 108, 100)[:4] + dec(104, 101, 108, 100),
    "private variable": dec(78, 65, 83, 72, 65, 95, 80, 82, 73, 86, 65, 84, 69, 95, 75, 69, 89, 83) + "=1", "private file name": dec(105, 109, 97, 103, 101, 45, 114, 101, 103, 105, 115, 116, 101, 114, 46, 111, 114, 105, 103, 105, 110, 97, 108, 46, 106, 115, 111, 110),
}
for name, text in POSITIVE.items():
    found = D.scan(R, text, "page.html")
    ok(bool(found), "detected: " + name)
    ok(all(set(f) == {"rule", "line"} for f in found), "a finding never carries the matched text: " + name)

BENIGN = ["NASHA is a proposed business concept, not an operating brewery.", "There is no go-ahead yet; a no-go zone on the map.", "Cloud services and smoke tests are different things.",
          "An amendment of 1.3 items", "the review required changes", "Documents about DX and ops are fine", "1.3 amendment", "Phase 2 of the plan", "the ops of a form", "a private answer key is not published"]
for text in BENIGN:
    ok(not D.scan(R, text, "page.html"), "benign text is not flagged: " + text[:40])

repo = dec(73, 78, 68, 79, 45, 77, 69, 88, 45, 66, 82, 69, 87, 69, 82, 89)
ok(bool(D.scan(R, repo, "other.js")) and not D.scan(R, repo, "assets/js/nasha-ecosystem-core.js"), "the single pre-existing live link is allow-listed by path, and only that path")
ok(D.scan(R, "ok\n" + POSITIVE["status one"] + "\n", "x")[0]["line"] == 2, "findings carry the right line number")

with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    real = D.RULES_PATH
    def with_rules(obj_or_text):
        p = td / "rules.json"
        p.write_text(obj_or_text if isinstance(obj_or_text, str) else json.dumps(obj_or_text), encoding="utf-8")
        D.RULES_PATH = p
    try:
        D.RULES_PATH = td / "missing.json"
        raises(D.load, D.RulesError, "fail-closed: public rules file missing")
        with_rules("{not json")
        raises(D.load, D.RulesError, "fail-closed: public rules file malformed")
        good = json.loads(real.read_text())
        with_rules({**good, "rules": good["rules"][:3]})
        raises(D.load, D.RulesError, "fail-closed: public rules incomplete")
        with_rules({**good, "rules": good["rules"][:-1] + [dict(good["rules"][-1], id=good["rules"][0]["id"])]})
        raises(D.load, D.RulesError, "fail-closed: duplicate rule id")
        with_rules({**good, "rules": [dict(r, hash="zz") for r in good["rules"]]})
        raises(D.load, D.RulesError, "fail-closed: malformed hashes")
        with_rules({**good, "allow": [{"rule": "nope", "path": "x"}]})
        raises(D.load, D.RulesError, "fail-closed: allow-list names an unknown rule")
    finally:
        D.RULES_PATH = real
    ok(D.load().public_count == R.public_count, "the real ruleset still loads after the failure drills")

    private = td / "private.json"
    secret_literal = dec(122, 113, 120, 45, 112, 114, 105, 118, 97, 116, 101, 45, 116, 101, 114, 109)
    private.write_text(json.dumps({"literals": [secret_literal], "regexes": ["secret-[0-9]{3}"], "withheld_files": ["assets/img/held.jpg"]}))
    os.environ["PORTFOLIO_PRIVATE_RULES"] = str(private)
    R2 = D.load()
    ok("private" in R2.private_summary() and "1 private literal" in R2.private_summary(), "private rules load and are summarised without their content")
    ok(bool(D.scan(R2, "has " + secret_literal.upper() + " inside", "x")) and bool(D.scan(R2, "token secret-123 here", "x")), "private literal (case-insensitive) and regex both detected")
    (td / "assets" / "img").mkdir(parents=True)
    (td / "assets" / "img" / "held.jpg").write_bytes(b"x")
    (td / "p.html").write_text("see " + secret_literal)
    problems = D.check_files(R2, td, ["p.html"])
    ok(any("withheld" in x for x in problems) and any("p.html:1" in x for x in problems), "withheld file and private literal reported with path and line")
    ok(all(secret_literal not in x for x in problems), "reports never echo the matched private text")
    private.write_text(json.dumps({"literals": [], "regexes": [], "withheld_files": []}))
    raises(D.load, D.RulesError, "fail-closed: private rules configured but empty")
    os.environ["PORTFOLIO_PRIVATE_RULES"] = str(td / "nope.json")
    raises(D.load, D.RulesError, "fail-closed: private rules configured but missing")
    private.write_text("{broken")
    os.environ["PORTFOLIO_PRIVATE_RULES"] = str(private)
    raises(D.load, D.RulesError, "fail-closed: private rules configured but malformed")
    os.environ.pop("PORTFOLIO_PRIVATE_RULES")
    os.environ["REQUIRE_PRIVATE_RULES"] = "1"
    raises(D.load, D.RulesError, "fail-closed: private rules required but not configured")
    os.environ.pop("REQUIRE_PRIVATE_RULES")
    ok(D.load().private is None, "CI configuration (neither variable set) runs the public hashed rules")

blob = Path(D.RULES_PATH).read_text(encoding="utf-8").lower()
ok(not any(t.lower() in blob for t in (dec(105, 110, 100, 111, 45, 109, 101, 120), dec(114, 101, 113, 117, 105, 114, 101, 115), dec(99, 108, 111, 117, 100), dec(100, 120, 49))), "the public rules file does not spell the terms it protects")
src = Path(D.__file__).read_text(encoding="utf-8").lower() + Path(__file__).read_text(encoding="utf-8").lower()
ok(dec(114, 101, 113, 117, 105, 114, 101, 115, 95, 114, 101, 118, 105, 101, 119) not in src, "neither the engine nor this test spells a protected term")
print("disclosure rules: %d checks passed (%d public rules)" % (checks, R.public_count))
