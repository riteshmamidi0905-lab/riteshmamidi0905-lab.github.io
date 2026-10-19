"""Reproduce synthetic evidence using hash-pinned NASHA and THE WEIR source.

No server, network, credentials or real transactions. Requires Python 3.11+.
Source checkouts are supplied explicitly; no code or dependency is downloaded.
"""
import argparse
import asyncio
import dataclasses
import hashlib
import json
from pathlib import Path
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'content/nasha-integration-sources.json'
OUTPUT = ROOT / 'content/nasha-integration-evidence.json'


def require(ok, message):
    if not ok:
        raise RuntimeError(message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--engineering-root', type=Path, required=True)
    parser.add_argument('--weir-root', type=Path, required=True)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text())
    for item in manifest['files']:
        project, path = item['path'].split('/', 1)
        base = args.engineering_root if project == 'engineering' else args.weir_root
        data = (base / path).read_bytes()
        blob = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        require(blob == item['git_blob'], 'Pinned source mismatch: ' + item['path'])
    sys.path[:0] = [str(args.engineering_root / 'lab'), str(args.weir_root / 'src')]
    from nasha_lab.specialists import invoke
    from nasha_lab.specialist_workflows import execute
    from nasha_lab.ai_audit import AuditLedger
    from nasha_lab.weir_adapter import WeirAdapter
    from nasha_lab.weir_incident import reconstruct
    from mcp_weir.gateway import Gateway
    from mcp_weir.policy import parse_policy
    from mcp_weir.store import Store
    from weir_testbed.servers import in_process_upstreams
    from weir_testbed.world import World

    flows = []
    for name in ['seasonal_beer', 'inventory_procurement', 'customer_marketing']:
        result = execute(name, correlation_id='synthetic-' + name)
        require(result.status == 'REQUIRES_HUMAN_APPROVAL' and result.external_actions == 0,
                'Workflow must stop at review')
        require(all(h.status == 'OK' for h in result.handoffs), 'Invalid handoff')
        flows.append({'workflow': name, 'status': result.status, 'external_actions': 0,
                      'handoffs': [dataclasses.asdict(h) for h in result.handoffs]})
    require(invoke('SENTINEL', {'on_hand': -1, 'reorder_point': 10}).status == 'REQUIRES_REVIEW',
            'Invalid inventory must fail closed')
    require(invoke('MERIDIAN', {'supplier_quotes': []}).status == 'REQUIRES_REVIEW',
            'Missing quotes must fail closed')
    require(invoke('PULSE', {'units': float('nan'), 'unit_price': 1, 'unit_cost': 0}).status == 'REQUIRES_REVIEW',
            'Nonfinite finance must fail closed')

    async def security():
        policy = {'policy': {'name': 'nasha-synthetic-approval', 'internal_domains': ['corp.example'],
                             'approval_ttl_seconds': 3},
                  'rules': {'gate_write': 'approve', 'gate_egress': 'deny',
                            'flow_conf_secret': 'deny', 'untrusted_read': 'approve'},
                  'upstreams': {'notes': {'command': ['python', '-m', 'weir_testbed.servers', 'notes']}},
                  'tools': {'notes__save_note': {'effect': 'write', 'target': {'title': 'other'}, 'content': ['body']},
                            'notes__publish_note': {'effect': 'egress', 'content': ['title', 'body']}}}
        tool = 'notes__save_note'
        payload = {'title': 'synthetic procurement review', 'body': 'wheat malt reorder proposal only'}
        with tempfile.TemporaryDirectory(prefix='nasha-synthetic-') as tmp:
            now = [100.0]
            store = Store(str(Path(tmp) / 'audit.db'), clock=lambda: now[0])
            world = World.from_fixture({})
            gateway = Gateway(parse_policy(policy), store,
                              {'notes': in_process_upstreams(world)['notes']}, clock=lambda: now[0])
            await gateway.start()
            try:
                session = gateway.open_session('synthetic-inventory-review')
                adapter = WeirAdapter(gateway, session, allowed_tools=frozenset({tool}))
                ledger = AuditLedger()
                flow = execute('inventory_procurement', correlation_id=session.id, audit=ledger)
                require(flow.external_actions == 0, 'External action forbidden')
                denied = await gateway.call_tool_detailed(session, 'notes__publish_note', payload)
                require(not denied.forwarded and denied.decision.verdict.name == 'DENY', 'Egress must deny')
                pending = await adapter.invoke(tool, payload, correlation_id=session.id)
                require(pending.status == 'APPROVE' and not world.effects, 'Approval must not execute')
                changed = await adapter.invoke(tool, {**payload, 'body': 'changed'}, correlation_id=session.id)
                require(changed.approval_id != pending.approval_id and not world.effects, 'Arguments must be bound')
                other = gateway.open_session('synthetic-other-caller')
                cross = await gateway.call_tool_detailed(other, tool, payload)
                require(cross.approval_id != pending.approval_id and not cross.forwarded, 'Session must be bound')
                # This explicit synthetic operator decision is separate from policy evaluation.
                require(store.resolve_approval(pending.approval_id, True) == 'approved', 'Human review failed')
                allowed = await adapter.invoke(tool, payload, correlation_id=session.id)
                require(allowed.status == 'ALLOW' and allowed.forwarded and len(world.effects) == 1,
                        'Approved synthetic note must execute exactly once')
                replay = await adapter.invoke(tool, payload, correlation_id=session.id)
                require(replay.status == 'APPROVE' and not replay.forwarded and len(world.effects) == 1,
                        'Consumed approval must not replay')
                now[0] += 10
                require(store.resolve_approval(replay.approval_id, True) == 'expired', 'Expired approval accepted')
                expired = await adapter.invoke(tool, payload, correlation_id=session.id)
                require(not expired.forwarded and len(world.effects) == 1, 'Expiry must block forwarding')
                events = [dataclasses.asdict(e) for e in ledger.reconstruct(session.id)]
                incident = reconstruct(session.id, weir_store=store, nasha_events=events, require_complete=True)
                require(incident.chain_valid and incident.complete and incident.protected_executions == 1
                        and incident.approvals_consumed == 1, 'Incident reconstruction failed')
                summary = {'decisions': ['DENY', 'APPROVE', 'ALLOW'], 'human_review': 'explicit synthetic operator',
                           'synthetic_note_writes': 1, 'external_actions': 0,
                           'pending_does_not_execute': True, 'argument_binding': True, 'session_binding': True,
                           'replay_blocked': True, 'expiry_blocked': True, 'chain_valid': True, 'complete': True,
                           'approvals_consumed': 1, 'protected_executions': 1,
                           'audit_kinds': [e['kind'] for e in incident.events],
                           'nasha_handoffs': [e['role'] for e in incident.events
                                              if e['system'] == 'NASHA' and e['kind'] == 'handoff']}
                store._db.execute("UPDATE events SET payload='{}' WHERE seq=(SELECT MIN(seq) FROM events)")
                try:
                    reconstruct(session.id, weir_store=store)
                except RuntimeError:
                    summary['tampered_chain_rejected'] = True
                else:
                    raise RuntimeError('Tampered chain was accepted')
                return summary
            finally:
                await gateway.close()
                store.close()

    report = {'schema': 1, 'status': 'LOCAL SYNTHETIC EXECUTION',
              'boundary': 'Recorded Python outputs; browser controls remain illustrative. No live backend.',
              'engineering_commit': manifest['engineering_commit'], 'weir_commit': manifest['weir_commit'],
              'source_manifest_sha256': hashlib.sha256(MANIFEST.read_bytes()).hexdigest(),
              'workflows': flows, 'security': asyncio.run(security()),
              'negative_contract_checks': ['negative inventory', 'missing quotes', 'nonfinite finance']}
    data = json.dumps(report, indent=2, sort_keys=True) + '\n'
    if args.check:
        require(OUTPUT.read_text() == data, 'Recorded integration evidence differs from actual execution')
        print('PASS: pinned service outputs and real gateway evidence reproduce byte for byte')
    else:
        OUTPUT.write_text(data)
        print('Recorded local synthetic integration evidence:', OUTPUT)


if __name__ == '__main__':
    main()
