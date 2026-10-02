/* agent-core.js — the deterministic ReAct loop from ai-agent-toolkit, ported to the browser.
   Mirrors aiagent/{tools,backend,agent}.py: four safe tools (restricted arithmetic parser — no eval,
   unit converter, tiny knowledge base, text stats), the offline RuleBasedPlanner policy, and the
   Thought → Action → Observation loop (max 6 steps). No language model is involved; the planner is
   rule-based exactly as in the repository's offline mode. An added `evaluate` stage runs
   deterministic checks on the finished trace (the repository benchmark scores tasks separately). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RMLab = root.RMLab || {}).agentCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  /* ---- calculator: recursive-descent over numbers, + - * / % // ** and unary minus ---- */
  function fmtG4(x) {              // Python f"{x:.4g}"
    if (!isFinite(x)) return String(x);
    if (x === 0) return '0';
    const e = Math.floor(Math.log10(Math.abs(x)));
    let s = (e < -4 || e >= 4) ? x.toExponential(3) : x.toPrecision(4);
    if (s.indexOf('e') >= 0) { let [m, ex] = s.split('e'); if (m.indexOf('.') >= 0) m = m.replace(/0+$/, '').replace(/\.$/, ''); const n = parseInt(ex, 10); return m + 'e' + (n < 0 ? '-' : '+') + String(Math.abs(n)).padStart(2, '0'); }
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }
  function calculator(expression) {
    const src = String(expression).trim(); let i = 0;
    const ws = () => { while (src[i] === ' ') i++; };
    function num() {
      ws(); const m = /^\d+(?:\.\d+)?|^\.\d+/.exec(src.slice(i));
      if (m) { i += m[0].length; return parseFloat(m[0]); }
      if (src[i] === '(') { i++; const v = add(); ws(); if (src[i] !== ')') throw new Error('unbalanced parentheses'); i++; return v; }
      throw new Error('unsupported expression');
    }
    function unary() { ws(); if (src[i] === '-') { i++; return -unary(); } if (src[i] === '+') { i++; return unary(); } return pow(); }
    function pow() { const b = num(); ws(); if (src.slice(i, i + 2) === '**') { i += 2; return Math.pow(b, unary()); } return b; }
    function mul() {
      let v = unary();
      for (;;) {
        ws();
        if (src.slice(i, i + 2) === '//') { i += 2; const r = unary(); if (r === 0) throw new Error('division by zero'); v = Math.floor(v / r); }
        else if (src[i] === '*' && src[i + 1] !== '*') { i++; v *= unary(); }
        else if (src[i] === '/') { i++; const r = unary(); if (r === 0) throw new Error('division by zero'); v /= r; }
        else if (src[i] === '%') { i++; const r = unary(); if (r === 0) throw new Error('modulo by zero'); v = ((v % r) + r) % r; }
        else return v;
      }
    }
    function add() { let v = mul(); for (;;) { ws(); if (src[i] === '+') { i++; v += mul(); } else if (src[i] === '-') { i++; v -= mul(); } else return v; } }
    if (!src) throw new Error('empty expression');
    const v = add(); ws();
    if (i < src.length) throw new Error('unsupported expression');
    return fmtG4(v);
  }
  const CONV = { 'km>mi': (x) => x * 0.621371, 'mi>km': (x) => x / 0.621371, 'kg>lb': (x) => x * 2.20462, 'lb>kg': (x) => x / 2.20462, 'm>ft': (x) => x * 3.28084, 'ft>m': (x) => x / 3.28084, 'c>f': (x) => x * 9 / 5 + 32, 'f>c': (x) => (x - 32) * 5 / 9 };
  function unitConvert(query) {
    const m = /^\s*(-?\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s*(?:to|in)\s*([a-zA-Z]+)/.exec(String(query).trim());
    if (!m) throw new Error("format: '<value> <unit> to <unit>'");
    const v = parseFloat(m[1]), s = m[2].toLowerCase(), d = m[3].toLowerCase(), f = CONV[s + '>' + d];
    if (!f) throw new Error(`no conversion ${s}->${d}`);
    return fmtG4(f(v)) + ' ' + d;
  }
  const FACTS = { 'capital of france': 'Paris', 'capital of japan': 'Tokyo', 'capital of india': 'New Delhi', 'capital of italy': 'Rome', 'largest planet': 'Jupiter', 'speed of light': '299,792 km/s', 'author of hamlet': 'William Shakespeare', 'chemical symbol for gold': 'Au' };
  const stripChars = (s, chars) => { let a = 0, b = s.length; while (a < b && chars.indexOf(s[a]) >= 0) a++; while (b > a && chars.indexOf(s[b - 1]) >= 0) b--; return s.slice(a, b); };
  function knowledgeBase(query) {
    const q = stripChars(String(query).toLowerCase(), '? ');
    if (Object.prototype.hasOwnProperty.call(FACTS, q)) return FACTS[q];
    let best = null, score = 0; const qs = new Set(q.split(/\s+/));
    Object.keys(FACTS).forEach((k) => { const s = k.split(' ').filter((w) => qs.has(w)).length; if (s > score) { best = FACTS[k]; score = s; } });
    return best && score >= 2 ? best : 'unknown';
  }
  const textStats = (text) => `${String(text).split(/\s+/).filter(Boolean).length} words, ${String(text).length} chars`;
  const TOOLS = {
    calculator: { description: "evaluate an arithmetic expression like '2*(3+4)'", run: calculator },
    unit_convert: { description: "convert units, e.g. '10 km to mi'", run: unitConvert },
    knowledge_base: { description: "look up a fact, e.g. 'capital of France'", run: knowledgeBase },
    text_stats: { description: 'count words and characters in text', run: textStats },
  };

  /* ---- RuleBasedPlanner ---- */
  const NUM = '-?\\d+(?:\\.\\d+)?', UNIT = '(km|mi|kg|lb|m|ft|c|f)';
  const WORD_OPS = { double: ['*', 2], doubled: ['*', 2], triple: ['*', 3], tripled: ['*', 3], halve: ['/', 2], halved: ['/', 2], square: ['**', 2], squared: ['**', 2] };
  const PHRASE_OPS = [[new RegExp('(?:multiply(?:\\s+it)?\\s+by|times)\\s+(' + NUM + ')'), '*'], [new RegExp('(?:divide(?:\\s+it)?\\s+by)\\s+(' + NUM + ')'), '/'], [new RegExp('(?:add|plus|increase(?:\\s+it)?\\s+by)\\s+(' + NUM + ')'), '+'], [new RegExp('(?:subtract|minus|decrease(?:\\s+it)?\\s+by)\\s+(' + NUM + ')'), '-']];
  const pyFloat = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(x));
  function trailingOp(task) {
    const t = task.toLowerCase();
    for (const w of Object.keys(WORD_OPS)) if (new RegExp('\\b' + w + '\\b').test(t)) return { op: WORD_OPS[w][0], operand: WORD_OPS[w][1] };
    for (const [re, op] of PHRASE_OPS) { const m = re.exec(t); if (m) return { op, operand: parseFloat(m[1]) }; }
    return null;
  }
  function convertExpr(task) {
    const m = new RegExp('(' + NUM + ')\\s*' + UNIT + '\\s*(?:to|in)\\s*' + UNIT).exec(task.toLowerCase());
    return m ? `${m[1]} ${m[2]} to ${m[3]}` : null;
  }
  function knowledgeQuery(task) {
    const t = stripChars(task.toLowerCase(), '? ');
    for (const k of Object.keys(FACTS)) if (t.indexOf(k) >= 0) return k;
    if (/^(what is the|who is the|how)/.test(t) && Object.keys(FACTS).some((k) => t.indexOf(k.split(' ')[0]) >= 0)) return t.replace('what is the', '').replace('who is the', '').trim();
    return null;
  }
  function looksArithmetic(task) {
    const m = /[-+/*(). \d]+\d/.exec(task);
    if (m && /[-+*/]/.test(m[0]) && /\d/.test(m[0])) { const e = m[0].trim(); if (/^[\d+\-*/(). ]+$/.test(e)) return e; }
    return null;
  }
  function plan(task) {
    const t = task.toLowerCase(), mod = trailingOp(task), conv = convertExpr(task);
    if (conv) return mod ? { kind: 'compose', tool: 'unit_convert', input: conv, op: mod.op, operand: mod.operand } : { kind: 'simple', tool: 'unit_convert', input: conv };
    const kq = knowledgeQuery(task);
    if (kq) return { kind: 'simple', tool: 'knowledge_base', input: kq };
    if (t.indexOf('word') >= 0 || t.indexOf('character') >= 0) {
      const m = /[:"'](.+)["']?$/.exec(task);
      return { kind: 'simple', tool: 'text_stats', input: m ? stripChars(m[1], '"\' ') : task };
    }
    const expr = looksArithmetic(task);
    if (expr) return { kind: 'simple', tool: 'calculator', input: expr };
    return { kind: 'simple', tool: 'knowledge_base', input: task };
  }
  function decide(task, history) {
    const p = plan(task), n = history.length;
    if (p.kind === 'simple') return n === 0 ? { action: true, thought: `I'll use ${p.tool} to answer this.`, tool: p.tool, input: p.input } : { action: false, thought: 'I have the result.', answer: history[n - 1].observation };
    if (n === 0) return { action: true, thought: 'First run the base tool, then adjust the result.', tool: p.tool, input: p.input };
    if (n === 1) { const m = new RegExp(NUM).exec(history[0].observation), num = m ? parseFloat(m[0]) : null; return { action: true, thought: `Now apply ${p.op}${p.operand} to ${num}.`, tool: 'calculator', input: `${num} ${p.op} ${pyFloat(p.operand)}` }; }
    return { action: false, thought: 'I have the composed result.', answer: history[n - 1].observation };
  }
  /* ---- the loop, returning the whole trace so the UI can step through it ---- */
  function run(task, maxSteps = 6) {
    const history = [];
    for (let s = 0; s < maxSteps; s++) {
      const d = decide(task, history);
      if (!d.action) return { answer: d.answer, finalThought: d.thought, history, steps: history.length, finished: true, plan: plan(task) };
      let obs;
      if (!TOOLS[d.tool]) obs = `error: unknown tool '${d.tool}'`;
      else { try { obs = TOOLS[d.tool].run(d.input); } catch (e) { obs = `error: ${e.message}`; } }
      history.push({ thought: d.thought, tool: d.tool, input: d.input, observation: obs });
    }
    return { answer: '(no answer: step limit reached)', history, steps: history.length, finished: false, plan: plan(task) };
  }
  /* deterministic post-checks on a finished run */
  function evaluate(task, res) {
    const checks = [];
    checks.push({ name: 'run finished within the step limit', pass: res.finished });
    checks.push({ name: 'no tool returned an error', pass: res.history.every((h) => h.observation.indexOf('error:') !== 0) });
    checks.push({ name: 'answer is not "unknown"', pass: res.answer !== 'unknown' && !!res.answer });
    if (res.plan.kind === 'compose' && res.history.length >= 2) {
      const base = parseFloat(res.history[0].observation), o = res.plan.operand, expect = res.plan.op === '*' ? base * o : res.plan.op === '/' ? base / o : res.plan.op === '+' ? base + o : res.plan.op === '-' ? base - o : Math.pow(base, o);
      checks.push({ name: 'second step re-derives the first tool’s number', pass: Math.abs(parseFloat(res.history[1].observation) - expect) <= Math.abs(expect) * 1e-3 + 1e-9 });
    }
    return { checks, pass: checks.every((c) => c.pass) };
  }
  const EXAMPLES = ['Convert 5 km to mi then multiply by 2', 'What is the capital of France?', 'Compute 12 * 7 + 5', 'How many words are in: the quick brown fox jumps', 'Convert 100 f to c', 'Tell me a joke about databases'];
  return { calculator, unitConvert, knowledgeBase, textStats, TOOLS, plan, run, evaluate, EXAMPLES, fmtG4 };
});
