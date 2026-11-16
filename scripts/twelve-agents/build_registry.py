#!/usr/bin/env python3
"""Derive a review registry from approved art and hash-pinned recorded events."""
import collections, hashlib, json, os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
BASE = 'https://github.com/riteshmamidi0905-lab/riteshmamidi0905-lab.github.io/blob/05bc67e337c67f144bd40c9af84a5d6fdc88660c/'
NAMES = 'aethon zybrew pyrix vectra nexora quantix echon novara synapse aegis cortex veritas'.split()

def load(path):
    return json.loads((ROOT / path).read_text())

def derive():
    hq = load('nasha-universe/living-hq/hq-data.json')
    approved = {r['file']: r for r in load('data/image-register.json')}
    recordings = {}
    for name, expected in hq['recordings_sha256'].items():
        path = ROOT / 'nasha-universe/replays' / name
        if Path(name).name != name or path.is_symlink():
            raise ValueError('Unsafe recording path')
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != expected:
            raise ValueError('Recording checksum differs: ' + name)
        recordings[name] = json.loads(data)
    agents, assets = [], []
    for slug in NAMES:
        a = next(x for x in hq['agents'] if x['slug'] == slug)
        art = 'assets/img/agents/' + slug + '.webp'
        entry = approved[art]
        if not entry['cleared_for_public_release'] or hashlib.sha256((ROOT / art).read_bytes()).hexdigest() != entry['sha256']:
            raise ValueError('Artwork approval/hash differs: ' + slug)
        events = [(f, e) for f in a['evidence'] for e in recordings[f]['events'] if e['agent'] == slug]
        if len(events) != a['events']:
            raise ValueError('Documented participation count differs: ' + slug)
        assignments = {}
        for f in a['evidence']:
            for e in recordings[f]['events']:
                for assignment in e.get('payload', {}).get('assignments', []):
                    if assignment['agent'] == slug:
                        assignments[assignment['task']] = f
        calls = collections.Counter(e['payload']['tool'] for _, e in events if e['kind'] == 'tool_called')
        if not all(task in assignments for task in a['assignments'].values()):
            raise ValueError('Responsibility missing from recording assignments: ' + slug)
        if calls != collections.Counter({t['tool']: t['calls'] for t in a['tools']}):
            raise ValueError('Tool call count differs: ' + slug)
        examples = []
        for f, e in events:
            if e['kind'] in ('tool_called', 'tool_result', 'task_completed', 'evaluation', 'policy_decision', 'model_validation'):
                examples.append({'file': f, 'seq': e['seq'], 'event_id': e['event_id'], 'kind': e['kind'], 'payload': e['payload'], 'hash': e['hash'], 'source': BASE + 'nasha-universe/replays/' + f})
        station = {'name': a['name'], 'slug': slug, 'role': a['specialty'], 'artwork': art,
                   'artwork_sha256': entry['sha256'], 'responsibilities': a['assignments'],
                   'responsibility_evidence': assignments, 'limits': a['limits'],
                   'capabilities': [
                       {'name': 'Browser registry and recorded-event inspection', 'status': 'Implemented'},
                       {'name': 'Backend participation and tools listed below', 'status': 'Recorded'},
                       {'name': 'Existing operating-day role visualization', 'status': 'Deterministic Simulation'},
                       {'name': 'Proposed architectural workstation', 'status': 'Conceptual'},
                       {'name': 'Faithful rigged physical animation / live hosted agent', 'status': 'Not Implemented'}],
                   'tools': a['tools'], 'tool_contracts': list({(x['kind'], x['payload'].get('tool', '')): x for x in reversed(examples)}.values()),
                   'dependencies': {'recorded_handoffs_from': a['handoffs_from'], 'recorded_handoffs_to': a['handoffs_to']},
                   'authorization': 'Recorded policy/approval events are historical. Replay cannot grant authorization or execute tools. Browser role selection in the separate deterministic demo is not production authentication.',
                   'evaluation': {'recorded_validations': a['validations'], 'examples': [x for x in examples if x['kind'] in ('evaluation', 'model_validation')][:5], 'note': 'Representative contracts/checks; complete events remain in linked recordings. A zero count is not an evaluation PASS.'},
                   'recordings': [{'file': f, 'sha256': hq['recordings_sha256'][f], 'title': recordings[f]['recording']['title'], 'trigger': recordings[f]['events'][0]['payload'].get('trigger', ''), 'source': BASE + 'nasha-universe/replays/' + f} for f in a['evidence']],
                   'local_implementation': ['nasha-universe/living-hq/hq-data.json', 'nasha-universe/living-hq/hq-app.js', 'nasha-universe/enterprise-state.js'],
                   'source_availability': 'The local renderer/model is inspectable. The recorded Python backend and its service/API implementation are not present in this repository; historical IMPLEMENTED labels do not prove current backend availability.',
                   'maturity': 'Recorded prototype on synthetic data; no live service or production readiness established.',
                   'animation_readiness': 'Approved static artwork preserved; faithful modeling, rigging and clips pending.',
                   'missing': ['Accepted faithful character source/rig/clips', 'Available rerunnable backend source and API contracts', 'New exact-candidate physical device and owner visual evidence']}
        agents.append(station)
        assets.append({'slug': slug, 'artwork': art, 'sha256': entry['sha256'], 'width': entry['width'], 'height': entry['height'], 'kind': entry['kind'], 'flattened_2d': True, 'mode': 'RGB', 'frames': 1, 'layered_source_found': False, 'multiview_found': False, 'approved_3d_model_found': False, 'approved_rig_found': False, 'approved_clips_found': False, 'readiness': 'Animation production pending', 'exception': 'PR #13 contains an unaccepted simplified VECTRA transform hierarchy, not a faithful approved model.' if slug == 'vectra' else None})
    catalog = [{'file': name, 'title': d['recording']['title'], 'sha256': hq['recordings_sha256'][name], 'event_count': len(d['events']), 'note': d['recording'].get('note', ''), 'agents': sorted({e['agent'] for e in d['events']}), 'path': 'baseline/nasha-universe/replays/' + name} for name, d in recordings.items()]
    registry = {'version': 1, 'scope': 'Review only. Recorded synthetic operations; not live AI.', 'source_commit': '05bc67e337c67f144bd40c9af84a5d6fdc88660c', 'agents': agents, 'recordings': catalog}
    sources = []
    for directory, dirs, files in os.walk(ROOT):
        dirs[:] = sorted(d for d in dirs if d not in ('.git', 'node_modules', 'work', 'dist', '__pycache__'))
        for name in sorted(files):
            if Path(name).suffix.lower() in ('.blend', '.fbx', '.gltf', '.glb', '.obj', '.usd', '.usdz', '.psd', '.ora', '.kra', '.hdr', '.exr', '.ktx2', '.basis'):
                sources.append(str((Path(directory)/name).relative_to(ROOT)))
    if sources != ['scripts/cinematic-proof/scene.glb']:
        raise ValueError('Source asset inventory changed; manually reassess animation readiness')
    audit = {'scope': 'Available repository source; no assumption about unavailable private files.', 'agents': assets, 'source_inventory': sources, 'faithful_animation_accepted': False, 'phase_b': 'OPEN', 'phase_c': 'HOLD'}
    return registry, audit

if __name__ == '__main__':
    registry, audit = derive()
    for name, data in [('registry.json', registry), ('asset-readiness.json', audit)]:
        (HERE / name).write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    print('Verified twelve identities, approved art, recording hashes, participation and tool counts.')
