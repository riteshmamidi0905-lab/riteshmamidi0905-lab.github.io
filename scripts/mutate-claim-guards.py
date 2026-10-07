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
text_mutation('vendored manifest altered by one character', 'content/evidence/support-escalation-copilot/public-claims.json', lambda s: s.replace('489', '490', 1))
text_mutation('vendored injection report altered', 'content/evidence/support-escalation-copilot/m4-injection.md', lambda s: s.replace('✔', '✘', 1))
json_mutation('stray figure in a Copilot step', lambda d: d['steps'][0].update(text='99 tests pass. ' + d['steps'][0]['text']))
json_mutation('withheld 280/315 figure added to copy', lambda d: d['steps'][0].update(text='280 of 315 matched. ' + d['steps'][0]['text']))
json_mutation('stat points at the withheld claim', lambda d: d['stats'][0].update(claim='workflow-standin-scenario-matches'))
json_mutation('token resolves into a withheld claim', lambda d: d['steps'][5].update(text='{{workflow-standin-scenario-matches.cases}} cases'))
json_mutation('unknown claim id', lambda d: d['steps'][2]['claims'].append('no-such-claim'))
json_mutation('step badge mislabelled (simulated -> verified)', lambda d: d['steps'][4].update(badge='verified'))
json_mutation('stand-in qualifier deleted from the diagnosis step', lambda d: d['steps'][4].update(text=d['steps'][4]['text'].replace('In this walkthrough the model is a rule-based stand-in, not an LLM, so the stage shows the orchestration. ', '')))
json_mutation('simulated figure loses its "scripted" explanation', lambda d: d['stats'][3].update(note='this tests the controls'))
json_mutation('attack row claims a different containing layer', lambda d: d['attackRows'][0].update(contained='policy'))
json_mutation('recorded draft result flipped (missed -> flagged)', lambda d: d['examples'][1].update(result='flagged'))
json_mutation('retrieval strategy mapped to the wrong key', lambda d: d['retrieval']['strategies'][1].__setitem__(0, 'hybrid'))
json_mutation('an eligible claim dropped from the evidence table', lambda d: d['evidenceGroups'][3]['claims'].remove('test-suite'))
text_mutation('banned token slipped into a doc', 'README.md', lambda s: s + '\n' + ''.join(chr(c) for c in [65, 116, 108, 97, 115]) + 'IQ\n')
text_mutation('job title changed back to an engineer title', 'index.src.html', lambda s: s.replace('"jobTitle":"Data & AI Analyst"', '"jobTitle":"AI/ML Engineer"', 1))
text_mutation('MAREF card figure altered (36/154 -> 35/154)', 'content/llm-eval-framework.json', lambda s: s.replace('36/154', '35/154', 1))
text_mutation('MAREF card keeps 33/33 but drops the false-alarm context', 'content/llm-eval-framework.json', lambda s: s.replace(' · 36/154 clean runs flagged · 151/187 overall agreement', '', 1))
text_mutation('vendored MAREF canonical claim altered by one character', 'content/evidence/maref/CLAIM.md', lambda s: s.replace('151/187', '152/187', 1))
text_mutation('vendored MAREF test results altered', 'content/evidence/maref/results.json', lambda s: s.replace('"36/154', '"35/154', 1) if '"36/154' in s else s.replace('36/154', '35/154', 1))
text_mutation('banned wording slipped into MAREF copy', 'content/site.json', lambda s: s.replace('MAREF is my attempt', 'MAREF is independently validated and is my attempt', 1))
text_mutation('MAREF same-author disclosure removed', 'content/llm-eval-framework.json', lambda s: s.replace('Same-author, not independent validation.', 'Pre-registered.', 1))
text_mutation('MAREF evaluation link repointed to a moving branch', 'scripts/render.js', lambda s: s.replace("id=\"maref-eval-link\" href=\"${MAREF_PIN('docs/EVALUATION.md')}\"", "id=\"maref-eval-link\" href=\"${MAREF_GH}/blob/main/docs/EVALUATION.md\"", 1))
text_mutation('hero loses the evaluation layer label', 'scripts/render.js', lambda s: s.replace('<i class="layer">I evaluate how they fail</i>', '', 1))
text_mutation('MAREF described as an agent', 'content/site.json', lambda s: s.replace('MAREF is my attempt', 'MAREF is an AI agent and is my attempt', 1))
text_mutation('a specific Apple programme named in career copy', 'content/site.json', lambda s: s.replace('(an Apple client engagement)', '(an Apple ' + 'Maps client engagement)', 1))
text_mutation('profile README left stale', 'profile/README.md', lambda s: s.replace('489', '488', 1))
# ---- M11: the real-model release, the ARB figures, the compact homepage
json_mutation('10/22 relabelled as accuracy on the homepage', lambda d: d['home']['result'].update(label='accuracy on the frozen cases', text='Accuracy of the model.'))
json_mutation('a failure class dropped from the homepage failure card', lambda d: d['home']['failure']['items'].pop())
json_mutation('homepage says the real-model run never happened', lambda d: d['home'].update(qualifier='Real-model evaluation was not executed. ' + d['home']['qualifier']))
json_mutation('real-model claim dropped from the evidence table', lambda d: d['evidenceGroups'][1]['claims'].remove('real-model-failure-classes'))
json_mutation('a stray figure in the real-model section', lambda d: d['realModel'].update(lead='A 6173 pass count. ' + d['realModel']['lead']))
json_mutation('prompt injection declared solved', lambda d: d['home'].update(qualifier=d['home']['qualifier'] + ' Prompt injection is solved.'))
json_mutation('homepage called production ready', lambda d: d['home'].update(architecture=d['home']['architecture'] + ' It is production-ready.'))
text_mutation('stale "has not been run" sentence reappears', 'content/site.json', lambda s: s.replace('One real-model run exposed the interface failures the scripted providers could not, and its results are published with those failures.', 'The step it still needs is the real-model evaluation, which has not been run.', 1))
text_mutation('ARB headline figure altered', 'content/agent-runtime.json', lambda s: s.replace('"43/48"', '"44/48"', 1))
text_mutation('ARB lesson title altered', 'content/agent-runtime.json', lambda s: s.replace('Action safety ≠ information-flow safety', 'Action safety is enough', 1))
text_mutation('vendored ARB results altered by one character', 'content/evidence/agent-runtime-bench/RESULTS.md', lambda s: s.replace('43/48', '44/48', 1))
text_mutation('ARB controls shown without the MT-02 failure', 'content/agent-runtime.json', lambda s: s.replace('"MT-02"', '"one gap"', 1))
text_mutation('near-100% scripted metric advertised on the homepage', 'scripts/render.js', lambda s: s.replace("keep = ['tests', 'scenarios reached', 'integration tests']", "keep = ['tests', 'scenarios reached', 'tool correctness']", 1))
text_mutation('a flagship scene pinned again on the homepage', 'scripts/render-copilot.js', lambda s: s.replace("['support-escalation-copilot.html', 'Read the full case study'], true)", "['support-escalation-copilot.html', 'Read the full case study'], false)", 1))
text_mutation('hierarchy label removed from the runtime section', 'scripts/render.js', lambda s: s.replace("${layerHTML('I build the infrastructure they run on')}", '', 1))
text_mutation('MAREF block on the homepage loses its disclosure', 'content/llm-eval-framework.json', lambda s: s.replace('"disclosure": "Same-author, not independent validation.', '"disclosure": "Same-author.', 1))

text_mutation('hero implies direct Apple employment', 'scripts/render.js', lambda s: s.replace('Apple (client engagement) · AI/ML quality, data and operational analysis', 'Working at Apple · AI/ML quality, data and operational analysis', 1))
text_mutation('hero leads with a raw test count again', 'scripts/render.js', lambda s: s.replace('Approval-gated agentic workflow · deterministic controls', '489 tests · Approval-gated agentic workflow', 1))
text_mutation('hero stops saying the projects are independent', 'scripts/render.js', lambda s: s.replace('Independent open-source projects · evidence and limits published', 'Projects · evidence and limits published', 1))
json_mutation('10/22 loses its qualification in the Copilot section', lambda d: d['home']['result'].update(label='cases passed', text='A pass count.'))
text_mutation('an independent project presented as client work', 'content/site.json', lambda s: s.replace('I apply the same quality mindset to independent agent systems', 'I built these agent systems for my client at Apple, with the same quality mindset', 1))
text_mutation('experience loses the independent-work boundary', 'content/site.json', lambda s: s.replace('independent, open-source work, not built for any employer or client', 'open-source work', 1))

ok, msg = run(); print(('OK   ' if ok is False else 'note ') + 'restored tree: ' + ('passes (as it must)' if not ok else msg))
print(f'\n{sum(results)}/{len(results)} mutations caught'); sys.exit(0 if all(results) else 1)
