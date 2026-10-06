#!/usr/bin/env python3
"""Mutation check of the portfolio's own claim guards. Deliberately breaks each protection (a vendored byte, a stray number, a withheld claim, a mislabelled badge, a flipped
recorded result, a banned token, a retitled role, ...), rebuilds, runs scripts/check-site.js and requires it to FAIL. Restores every file afterwards.
Manual: not run in CI (it rewrites sources and rebuilds ~20 times). Usage: python3 scripts/mutate-claim-guards.py   (node on PATH)"""
import subprocess, os, json, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
J = 'content/support-escalation-copilot.json'
def run():
    b = subprocess.run(['node', 'build.js'], capture_output=True, text=True)
    if b.returncode: return True, 'build refused: ' + (b.stderr.strip().splitlines() or ['?'])[-1][:110]
    t = subprocess.run(['node', 'scripts/check-site.js'], capture_output=True, text=True)
    if t.returncode == 0: return False, 'NOT CAUGHT'
    msg = [l for l in t.stderr.splitlines() if 'Error' in l or 'FAIL' in l]
    return True, 'caught: ' + (msg[0] if msg else t.stderr.strip().splitlines()[-1])[:110]
results = []
def text_mutation(name, path, fn):
    orig = open(path, 'rb').read()
    try:
        new = fn(orig.decode('utf8')); assert new != orig.decode('utf8'), 'mutation did not change the file: ' + name
        open(path, 'wb').write(new.encode('utf8')); ok, msg = run()
    finally: open(path, 'wb').write(orig)
    results.append(ok); print(('OK   ' if ok else 'FAIL ') + f'{name:58s} {msg}')
def json_mutation(name, fn):
    orig = open(J, 'rb').read()
    try:
        d = json.loads(orig); fn(d); open(J, 'w').write(json.dumps(d, indent=1, ensure_ascii=False)); ok, msg = run()
    finally: open(J, 'wb').write(orig)
    results.append(ok); print(('OK   ' if ok else 'FAIL ') + f'{name:58s} {msg}')
text_mutation('vendored manifest altered by one character', 'content/evidence/support-escalation-copilot/public-claims.json', lambda s: s.replace('472', '473', 1))
text_mutation('vendored injection report altered', 'content/evidence/support-escalation-copilot/m4-injection.md', lambda s: s.replace('✔', '✘', 1))
json_mutation('stray figure in a Copilot step', lambda d: d['steps'][0].update(text='99 tests pass. ' + d['steps'][0]['text']))
json_mutation('withheld 280/315 figure added to copy', lambda d: d['steps'][0].update(text='280 of 315 matched. ' + d['steps'][0]['text']))
json_mutation('stat points at the withheld claim', lambda d: d['stats'][0].update(claim='workflow-standin-scenario-matches'))
json_mutation('token resolves into a withheld claim', lambda d: d['steps'][5].update(text='{{workflow-standin-scenario-matches.cases}} cases'))
json_mutation('unknown claim id', lambda d: d['steps'][2]['claims'].append('no-such-claim'))
json_mutation('step badge mislabelled (simulated -> verified)', lambda d: d['steps'][4].update(badge='verified'))
json_mutation('stand-in qualifier deleted from the diagnosis step', lambda d: d['steps'][4].update(text=d['steps'][4]['text'].replace('Here the model is a rule-based stand-in, not an LLM, so this stage shows the orchestration, not model quality.', '')))
json_mutation('simulated figure loses its "scripted" explanation', lambda d: d['stats'][3].update(note='this tests the controls'))
json_mutation('attack row claims a different containing layer', lambda d: d['attackRows'][0].update(contained='policy'))
json_mutation('recorded draft result flipped (missed -> flagged)', lambda d: d['examples'][1].update(result='flagged'))
json_mutation('retrieval strategy mapped to the wrong key', lambda d: d['retrieval']['strategies'][1].__setitem__(0, 'hybrid'))
json_mutation('an eligible claim dropped from the evidence table', lambda d: d['evidenceGroups'][2]['claims'].remove('test-suite'))
text_mutation('banned token slipped into a doc', 'README.md', lambda s: s + '\n' + ''.join(chr(c) for c in [65, 116, 108, 97, 115]) + 'IQ\n')
text_mutation('job title changed back to an engineer title', 'index.src.html', lambda s: s.replace('"jobTitle":"Data & AI Analyst"', '"jobTitle":"AI/ML Engineer"', 1))
text_mutation('MAREF no longer labelled not evaluated', 'scripts/render.js', lambda s: s.replace("${CPR.badge('not-evaluated')} <b>Research / framework", "<b>Research / framework", 1))
text_mutation('profile README left stale', 'profile/README.md', lambda s: s.replace('472', '471', 1))
ok, msg = run(); print(('OK   ' if ok is False else 'note ') + 'restored tree: ' + ('passes (as it must)' if not ok else msg))
print(f'\n{sum(results)}/{len(results)} mutations caught'); sys.exit(0 if all(results) else 1)
