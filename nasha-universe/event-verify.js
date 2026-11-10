/* nasha.event.v1 verification in the browser: SHA-256 (so the chain can be re-verified in any context, including plain http), canonical JSON, the same schema rules as backend/nasha_events.py, and chain verification.
   Shared by the headquarters so that it verifies a recording before using it. */
(() => {
  'use strict';
  const SLUGS = ['aethon', 'zybrew', 'pyrix', 'vectra', 'nexora', 'quantix', 'echon', 'novara', 'synapse', 'aegis', 'cortex', 'veritas'];
  const GENESIS = '0'.repeat(64), SCHEMA = 'nasha.event.v1';
  const KINDS = { mission_started: ['title', 'scenario', 'trigger'], agent_started: ['task'], agent_completed: ['task', 'outcome'], tool_called: ['tool', 'stage'], tool_result: ['tool', 'stage', 'ok'], evaluation: ['name', 'passed'],
    policy_decision: ['decision', 'policy'], approval_requested: ['approval_id', 'summary'], approval_decided: ['approval_id', 'decision'], retry_scheduled: ['attempt', 'max_attempts', 'reason'], workflow_failed: ['failure_class', 'retryable'],
    task_completed: ['task', 'result'], audit_reference: ['ref_type', 'ref_id'], mission_completed: ['status', 'side_effects'], model_request: ['purpose', 'model'], model_response: ['purpose', 'ok'], model_validation: ['purpose', 'passed'], tool_recommendation: ['capability', 'decision'], task_state: ['node', 'state'] };
  const AGENT_OK = new Set([...SLUGS, 'owner', 'weir', 'system']);
  const ENVELOPE = ['schema', 'event_id', 'run_id', 'mission', 'seq', 'ts', 'mode', 'agent', 'kind', 'payload', 'evidence_refs', 'prev_hash', 'hash'];
  const ID_RE = /^[A-Za-z0-9._:\-]{1,80}$/, TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/, HASH_RE = /^[0-9a-f]{64}$/, BAD_KEY = /(passcode|password|passphrase|secret|token|session|api[_-]?key|authorization|credential)/i;

  /* ---------- SHA-256 (so the chain can be re-verified in any browser context, including plain http) ---------- */
  const K256 = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  const sha256 = str => {
    const m = new TextEncoder().encode(str), l = m.length, n = ((l + 9 + 63) >> 6) << 6, b = new Uint8Array(n);
    b.set(m); b[l] = 0x80; const dv = new DataView(b.buffer); dv.setUint32(n - 8, Math.floor(l * 8 / 4294967296)); dv.setUint32(n - 4, (l * 8) >>> 0);
    const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]), w = new Uint32Array(64), rr = (x, c) => (x >>> c) | (x << (32 - c));
    for (let o = 0; o < n; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) { const a = w[i - 15], c = w[i - 2]; w[i] = (w[i - 16] + (rr(a, 7) ^ rr(a, 18) ^ (a >>> 3)) + w[i - 7] + (rr(c, 17) ^ rr(c, 19) ^ (c >>> 10))) >>> 0; }
      let [a, bb, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) { const t1 = (h + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) >>> 0, t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) >>> 0; h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0; }
      H[0] += a; H[1] += bb; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    return [...H].map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
  };
  const canon = v => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v);
  const eventHash = e => { const b = {}; for (const k of Object.keys(e)) if (k !== 'hash') b[k] = e[k]; return sha256(canon(b)); };
  const walkKeys = (o, p) => { if (Array.isArray(o)) o.forEach((v, i) => walkKeys(v, p + '[' + i + ']')); else if (o && typeof o === 'object') for (const k of Object.keys(o)) { if (BAD_KEY.test(k)) throw new Error(p + '.' + k + ' looks like a credential'); walkKeys(o[k], p + '.' + k); } };
  /* the same rules as backend/nasha_events.py; returns null when the event is sound, otherwise the reason */
  const checkEvent = (e, prevHash, prevSeq, runId) => {
    try {
      if (!e || typeof e !== 'object' || Array.isArray(e)) return 'not an object';
      const keys = Object.keys(e);
      for (const k of ENVELOPE) if (!(k in e)) return 'missing ' + k;
      if (keys.length !== ENVELOPE.length) return 'unknown fields';
      if (e.schema !== SCHEMA) return 'wrong schema';
      for (const k of ['event_id', 'run_id', 'mission']) if (typeof e[k] !== 'string' || !ID_RE.test(e[k])) return 'bad ' + k;
      if (!Number.isInteger(e.seq) || e.seq < 1 || e.seq > 100000) return 'bad seq';
      if (typeof e.ts !== 'string' || !TS_RE.test(e.ts)) return 'bad ts';
      if (e.mode !== 'live' && e.mode !== 'replay') return 'bad mode';
      if (!AGENT_OK.has(e.agent)) return 'unknown agent';
      if (!KINDS[e.kind]) return 'unknown kind';
      if (!e.payload || typeof e.payload !== 'object' || Array.isArray(e.payload)) return 'bad payload';
      for (const need of KINDS[e.kind]) if (!(need in e.payload)) return e.kind + ' payload lacks ' + need;
      walkKeys(e.payload, 'payload');
      if (!Array.isArray(e.evidence_refs) || e.evidence_refs.length > 16) return 'bad evidence_refs';
      for (const r of e.evidence_refs) if (!r || Object.keys(r).length !== 2 || typeof r.type !== 'string' || typeof r.id !== 'string') return 'bad evidence ref';
      if (!HASH_RE.test(e.prev_hash) || !HASH_RE.test(e.hash)) return 'bad hash format';
      if (runId && e.run_id !== runId) return 'mixed run ids';
      if (e.seq !== prevSeq + 1) return 'expected seq ' + (prevSeq + 1);
      if (e.prev_hash !== prevHash) return 'chain broken';
      if (eventHash(e) !== e.hash) return 'hash does not match the contents';
      return null;
    } catch (x) { return String(x.message || x); }
  };
  const verifyAll = events => { let prev = GENESIS, seq = 0, run = null; for (const e of events) { const why = checkEvent(e, prev, seq, run); if (why) return { ok: false, why: 'event ' + (e && e.seq) + ': ' + why }; run = e.run_id; prev = e.hash; seq = e.seq; } return { ok: true, why: null, head: prev, n: events.length }; };
  window.NASHA_VERIFY = { GENESIS, SCHEMA, KINDS, SLUGS, sha256, canon, eventHash, checkEvent, verifyAll };
})();
