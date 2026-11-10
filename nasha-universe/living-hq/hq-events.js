/* Event-to-visual-state mapping for the Living Headquarters. Pure and deterministic: reduce(state, event) -> state. Used by the 3D scene AND the accessible 2D view, so both always show the same facts.
   Rule: every visible transition is traceable. Any change to the state appends a `trace` entry {seq, kind, effect} and stores the causing `seq` on the element that changed; nothing is ever set without an event.
   Works in browsers (window.HQEvents) and in Node (module.exports) so it can be tested against every recording. No timers, no randomness, no network. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.HQEvents = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const AGENTS = ['aethon', 'zybrew', 'pyrix', 'vectra', 'nexora', 'quantix', 'echon', 'novara', 'synapse', 'aegis', 'cortex', 'veritas'];
  const ROOMS = { atrium: 'Arrival atrium', control: 'Mission Control', weir: 'THE WEIR', lab: 'AI Research Laboratory' };
  const fresh = () => ({
    mode: 'recorded', run: '', mission: { status: 'idle', title: '', scenario: '', note: '', seq: 0 }, pos: 0,
    agents: Object.fromEntries(AGENTS.map(a => [a, { state: 'idle', task: '', tool: '', alert: false, seq: 0 }])),
    link: null, tools: [], graph: null, holds: [], blocks: [], humans: [], validations: [], fallbacks: [], model: [],
    outcome: null, rooms: { atrium: { lit: true, seq: 0 }, control: { lit: false, seq: 0 }, weir: { lit: false, seq: 0 }, lab: { lit: false, seq: 0 } }, trace: [], announce: ''
  });
  const clone = s => JSON.parse(JSON.stringify(s));
  function reduce(prev, e) {
    const s = clone(prev), p = e.payload || {}, a = e.agent, seq = e.seq, ag = s.agents[a];
    const note = effect => { s.trace.push({ seq, kind: e.kind, effect }); s.announce = effect; };
    s.pos = seq;
    switch (e.kind) {
      case 'mission_started':
        Object.assign(s, fresh(), { mode: prev.mode, pos: seq, run: e.run_id });
        s.mission = { status: 'running', title: p.title, scenario: p.scenario, note: p.scenario_note || '', seq };
        s.rooms.control = { lit: true, seq };
        if (p.graph) s.graph = { nodes: Object.fromEntries(p.graph.map(g => [g.node, { title: g.title, agent: g.agent, deps: g.depends_on, state: 'queued', seq }])), order: p.graph.map(g => g.node) };
        (p.assignments || []).forEach(x => { if (s.agents[x.agent]) { s.agents[x.agent].task = x.task; s.agents[x.agent].seq = seq; s.agents[x.agent].assigned = true; } });
        note('Mission started: ' + p.title + ' (' + p.scenario + '). Mission Control lit; ' + (p.assignments || []).length + ' agents assigned.');
        break;
      case 'agent_started':
        if (ag) { const from = s.link ? s.link.to : null; ag.state = 'active'; ag.seq = seq; ag.task = p.task || ag.task; if (from && from !== a) s.link = { from, to: a, seq }; else s.link = { from: null, to: a, seq }; note(a.toUpperCase() + ' started: ' + (p.task || '')); }
        break;
      case 'agent_completed':
        if (ag) { ag.state = ['rejected', 'stopped', 'timed_out'].includes(p.outcome) ? 'blocked' : 'done'; ag.seq = seq; ag.tool = ''; note(a.toUpperCase() + ' finished (' + p.outcome + ')'); }
        break;
      case 'tool_called':
        if (ag) { ag.tool = p.tool; ag.seq = seq; if (ag.state === 'idle') ag.state = 'active'; s.tools.push({ seq, agent: a, tool: p.tool, probe: !!(p.args && p.args.probe), status: 'running' }); note(a.toUpperCase() + ' called ' + p.tool + (p.args && p.args.probe ? ' (guardrail probe)' : '')); }
        break;
      case 'tool_result': {
        const t = [...s.tools].reverse().find(x => x.tool === p.tool && x.status === 'running'); if (t) t.status = p.ok ? 'ok' : (p.held_for_approval ? 'held' : 'failed');
        if (!p.ok && !p.held_for_approval) { s.rooms.weir = { lit: true, seq }; if (p.failure === 'TOOL_DENIED' || p.probe) { s.blocks.push({ seq, agent: a, tool: p.tool, reason: p.failure || 'denied', probe: !!p.probe, codes: p.codes || [] }); note('THE WEIR blocked ' + p.tool + (p.probe ? ' (a deliberate out-of-policy probe)' : '') + ': ' + (p.failure || 'denied')); } else note(a.toUpperCase() + ' tool ' + p.tool + ' failed: ' + (p.failure || 'error')); if (ag) ag.alert = true; }
        else if (p.held_for_approval) { s.rooms.weir = { lit: true, seq }; note('THE WEIR held ' + p.tool + ' for a person'); }
        else note(p.tool + ' returned');
        break; }
      case 'evaluation':
        if (!p.passed) { if (ag) ag.alert = true; s.validations.push({ seq, agent: a, name: p.name, detail: (p.violations || p.errors || []).slice(0, 3).map(String), claim: p.claim || null, link: 'lab' }); s.rooms.lab = { lit: true, seq }; note('Validation failed: ' + p.name + ' (see the Research Laboratory)'); }
        break;
      case 'policy_decision': {
        const d = p.decision;
        if (d === 'deny' || d === 'block_original_response' || d === 'quarantine_untrusted_evidence') { s.rooms.weir = { lit: true, seq }; s.blocks.push({ seq, agent: a, tool: '', reason: d + ': ' + (p.policy || ''), probe: !!p.probe, codes: p.codes || [] }); note('THE WEIR ' + d.replace(/_/g, ' ') + ': ' + (p.policy || '')); }
        else if (d === 'hold_for_approval') { s.rooms.weir = { lit: true, seq }; note('THE WEIR holds the action for a person'); }
        else if (d === 'fallback_deterministic') { s.fallbacks.push({ seq, scope: p.scope || 'plan', reason: p.reason || '' }); s.rooms.control = { lit: true, seq }; note('Deterministic fallback (' + (p.scope || 'plan') + '): ' + (p.reason || '')); }
        else if (d === 'model_plan_accepted') { note('A model plan passed every validation and was accepted'); }
        else if (d === 'cancelled') { s.rooms.control = { lit: true, seq }; note('Cancelled by the operator'); }
        break; }
      case 'approval_requested':
        s.holds.push({ seq, id: p.approval_id, action: p.consequential_action || '', details: (p.summary && p.summary.details) || [], decided: null }); s.mission.status = 'awaiting_approval'; if (ag) { ag.state = 'awaiting'; ag.seq = seq; } s.rooms.weir = { lit: true, seq };
        note('Approval needed: ' + (p.consequential_action || 'a consequential action') + '. Nothing happens until a person decides.');
        break;
      case 'approval_decided': {
        const h = [...s.holds].reverse().find(x => x.id === p.approval_id); if (h) h.decided = { seq, decision: p.decision, by: p.by }; s.humans.push({ seq, decision: p.decision, by: p.by, role: p.role }); s.mission.status = 'running'; if (s.agents.aegis.state === 'awaiting') s.agents.aegis.state = 'active';
        note('A person decided: ' + p.decision + (p.by ? ' (' + p.by + ')' : '')); break; }
      case 'retry_scheduled': s.mission.retries = (p.attempt || 1) - 1; note('Retry ' + p.attempt + ' of ' + p.max_attempts + ': ' + p.reason); break;
      case 'workflow_failed': if (ag) { ag.alert = true; if (!p.retryable) ag.state = 'blocked'; ag.seq = seq; } note('Failure: ' + p.failure_class + (p.retryable ? ' (will retry)' : '')); break;
      case 'task_state': if (s.graph && s.graph.nodes[p.node]) { s.graph.nodes[p.node].state = p.state; s.graph.nodes[p.node].seq = seq; note('Task ' + p.node + ': ' + p.state); } break;
      case 'model_request': s.model.push({ seq, kind: 'request', purpose: p.purpose, model: p.model, double: !!p.test_double, real: p.runtime === 'ollama' && !p.test_double }); s.rooms.lab = { lit: true, seq }; note('A model was asked (' + p.purpose + ')' + (p.test_double ? ' [test double]' : '')); break;
      case 'model_response': s.model.push({ seq, kind: 'response', purpose: p.purpose, ok: !!p.ok, ms: p.latency_ms }); note('Model reply ' + (p.ok ? 'received' : 'failed: ' + p.error_class)); break;
      case 'model_validation': s.model.push({ seq, kind: 'validation', purpose: p.purpose, passed: !!p.passed, violations: p.violations || [] }); if (!p.passed) { s.validations.push({ seq, agent: a, name: 'model ' + p.purpose, detail: (p.violations || []).slice(0, 3).map(String), claim: null, link: 'lab' }); if (ag) ag.alert = true; } note('Model output ' + (p.passed ? 'passed' : 'FAILED') + ' validation (' + p.purpose + ')'); break;
      case 'tool_recommendation': s.model.push({ seq, kind: 'recommendation', capability: p.capability, decision: p.decision }); break;
      case 'mission_completed':
        s.mission.status = p.status; s.outcome = { seq, status: p.status, side_effects: p.side_effects, recommendation: p.recommendation || '' }; Object.values(s.agents).forEach(x => { if (x.state === 'active') x.state = 'done'; x.tool = ''; }); s.link = null;
        note('Outcome: ' + p.status + ' · ' + (p.side_effects ? p.side_effects.actions_executed + ' actions executed, ' + p.side_effects.external_transmissions + ' external transmissions' : '')); break;
      default: break;
    }
    return s;
  }
  function replay(events, upTo, mode) { let s = fresh(); if (mode) s.mode = mode; for (const e of events) { if (upTo != null && e.seq > upTo) break; s = reduce(s, e); } return s; }
  return { AGENTS, ROOMS, fresh, reduce, replay };
});
