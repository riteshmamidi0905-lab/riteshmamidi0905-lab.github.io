'use strict';
(() => {
  const evidence = window.NashaIntegrationEvidence;
  const select = document.querySelector('#service-workflow');
  const output = document.querySelector('#service-results');
  if (!evidence || !select || !output) return;
  const names = {ATLAS:'AETHON', BREWMASTER:'ZYBREW', FORGE:'PYRIX', SENTINEL:'VECTRA', MERIDIAN:'NEXORA', PULSE:'QUANTIX', ECHO:'ECHON', SPARK:'NOVARA', NEXUS:'SYNAPSE', GUARDIAN:'AEGIS', SCRIBE:'CORTEX', LUMEN:'VERITAS'};
  const add = (parent, tag, value) => { const el = document.createElement(tag); el.textContent = value; parent.append(el); return el; };
  function render() {
    const flow = evidence.workflows.find(x => x.workflow === select.value);
    output.replaceChildren();
    for (const step of flow.handoffs) {
      const card = add(output, 'article', ''); card.className = 'card';
      add(card, 'h3', names[step.role] + ' / ' + step.role);
      add(card, 'p', 'Recorded result: ' + step.status + (step.requires_approval ? ' · Human review required' : ' · Analytical step'));
      const pre = add(card, 'pre', JSON.stringify(step.output, null, 2));
      pre.tabIndex = 0; pre.setAttribute('aria-label', names[step.role] + ' recorded synthetic output');
    }
    document.querySelector('#service-status').textContent = flow.handoffs.length + ' Python handoffs · ' + flow.status + ' · External actions: ' + flow.external_actions + '. Changing the courtyard inputs does not rerun this recorded fixture.';
  }
  select.addEventListener('change', render); render();
  const s = evidence.security;
  document.querySelector('#recorded-security-summary').textContent = 'Real gateway on synthetic data: ' + s.decisions.join(' → ') + '. Explicit synthetic operator approval; ' + s.synthetic_note_writes + ' in-memory note write; external actions: 0. Audit chain verified and complete. Argument changes, cross-session reuse, replay, expiry and audit tampering were checked.';
  const list = document.querySelector('#recorded-security-events');
  s.audit_kinds.forEach(kind => add(list, 'li', kind));
})();
