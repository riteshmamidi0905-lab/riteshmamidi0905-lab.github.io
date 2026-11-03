/* NASHA Data Lab: SQL explorer and Enterprise Demo session panel. Reads the JSON embedded in the page; no network calls, no cookies, no tracking. */
(function () {
'use strict';
var D, Q, S;
function el(tag, attrs, kids) { var e = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }); (kids || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }); return e; }
var EXTRA = { Q09: ['Product analytics'], Q10: ['Product analytics'], Q17: ['Data quality/validation'], Q18: ['Data quality/validation'], Q19: ['Data quality/validation', 'ETL/ELT'], Q22: ['Data quality/validation'], Q23: ['Data quality/validation'], Q24: ['Data quality/validation'], Q02: ['Forecasting'], Q03: ['Forecasting'], Q07: ['Business intelligence (concept)'], Q14: ['Business intelligence (concept)'], Q01: ['Dashboards/reporting'], Q04: ['Statistics'], Q21: ['Statistics'] };
function skillsFor(q) { var out = ['SQL']; (EXTRA[q.id] || []).forEach(function (s) { if (out.indexOf(s) < 0) out.push(s); }); return out; }
function chips(list) { var ul = el('ul', { 'class': 'chiprow' }); list.forEach(function (t) { ul.appendChild(el('li', { text: t })); }); return ul; }
function table(cols, rows, label) {
  var wrap = el('div', { 'class': 'table-wrap', tabindex: '0', role: 'region', 'aria-label': label + ' (scrollable)' }), t = el('table'), cap = el('caption', { 'class': 'sr', text: label }), head = el('tr'), body = el('tbody');
  cols.forEach(function (c) { head.appendChild(el('th', { scope: 'col', text: String(c) })); }); t.appendChild(cap); t.appendChild(el('thead', {}, [head]));
  rows.forEach(function (r) { var tr = el('tr'); r.forEach(function (c) { tr.appendChild(el('td', { text: c === null ? 'NULL' : String(c) })); }); body.appendChild(tr); }); t.appendChild(body); wrap.appendChild(t); return wrap;
}
function start() {
var pick = document.getElementById('q-pick'), feat = document.getElementById('q-feat'), panel = document.getElementById('q-panel');
if (pick && feat && panel) {
  var feats = {}; Q.forEach(function (q) { q.sql_features_detected.forEach(function (f) { feats[f] = (feats[f] || 0) + 1; }); });
  Object.keys(feats).sort().forEach(function (f) { feat.appendChild(el('option', { value: f, text: f + ' (' + feats[f] + ')' })); });
  function fill() { var f = feat.value, cur = pick.value; pick.textContent = ''; Q.filter(function (q) { return !f || q.sql_features_detected.indexOf(f) >= 0; }).forEach(function (q) { var o = el('option', { value: q.id, text: q.id + ': ' + q.title }); if (q.id === cur) o.selected = true; pick.appendChild(o); }); show(); }
  function show() {
    var q = Q.filter(function (x) { return x.id === pick.value; })[0]; panel.textContent = ''; if (!q) { panel.appendChild(el('p', { 'class': 'note', text: 'No query uses that technique.' })); return; }
    panel.appendChild(el('h3', { text: q.id + ': ' + q.title }));
    panel.appendChild(el('p', {}, [el('strong', { text: 'Business question. ' }), q.question]));
    panel.appendChild(el('p', {}, [el('strong', { text: 'Technique (author’s note). ' }), q.technique]));
    panel.appendChild(el('p', {}, [el('strong', { text: 'Reads tables. ' }), q.input_tables.length ? q.input_tables.join(', ') : 'none (inline fixture data)']));
    panel.appendChild(el('p', {}, [el('strong', { text: 'SQL features detected in the text. ' })])); panel.appendChild(chips(q.sql_features_detected.length ? q.sql_features_detected : ['basic SELECT']));
    var code = el('div', { 'class': 'codebox', tabindex: '0', role: 'region', 'aria-label': q.id + ' SQL statement (scrollable)' }, [el('pre', {}, [el('code', { text: q.sql })])]); panel.appendChild(code);
    panel.appendChild(el('p', { 'class': 'note', text: 'Expected shape: ' + q.expected_shape }));
    panel.appendChild(el('p', {}, [el('strong', { text: 'Actual result. ' }), q.row_count + ' rows, executed in ' + q.executed_ms + ' ms in the last run' + (q.result_truncated ? '; first 60 shown.' : '.')]));
    panel.appendChild(table(q.columns, q.result_rows.slice(0, 20), q.id + ' result rows')); if (q.result_rows.length > 20) panel.appendChild(el('p', { 'class': 'note', text: 'Showing 20 of ' + q.result_rows.length + ' stored rows.' }));
    if (q.sqlite_specific && q.sqlite_specific !== 'none') panel.appendChild(el('p', { 'class': 'note', text: 'Dialect note: ' + q.sqlite_specific }));
    var sk = skillsFor(q); panel.appendChild(el('p', {}, [el('strong', { text: 'Job-market skills this evidences (postings requiring / mentioning, of 100 sampled). ' })]));
    panel.appendChild(chips(sk.map(function (n) { var s = S[n]; return n + (s ? ' (' + s.required + ' / ' + s.mentioned + ')' : ''); })));
  }
  pick.addEventListener('change', show); feat.addEventListener('change', fill); fill();
}
}
// Enterprise Demo session panel (reads this browser's demo state only)
var live = document.getElementById('demo-live');
if (live) {
  var st = null; try { var raw = localStorage.getItem('nasha-demo-state-v1'); st = raw ? JSON.parse(raw) : null; } catch (e) { st = null; }
  live.textContent = '';
  var mine = st && st.orders ? st.orders.filter(function (o) { return !o.seed; }) : [];
  if (!st || !mine.length) {
    live.appendChild(el('p', {}, ['No Enterprise Demo orders in this browser yet. ', el('a', { href: 'demo/index.html#/guide', text: 'Run the guided walkthrough' }), ' (about 75 seconds) and come back: this panel will show the order lifecycle from your session.']));
  } else {
    var n = function (f) { return mine.filter(f).length; }, accepted = n(function (o) { return o.status !== 'CANCELLED'; }), fulfilled = n(function (o) { return o.status === 'FULFILLED'; }), paid = n(function (o) { return o.payment === 'PAID'; }), rev = mine.filter(function (o) { return o.status !== 'CANCELLED'; }).reduce(function (a, o) { return a + o.revenueCents; }, 0);
    live.appendChild(el('h3', { text: 'From your Enterprise Demo session (computed here in JavaScript, not SQL)' }));
    var dl = el('dl'); [['Orders created', mine.length], ['Not cancelled', accepted], ['Fulfilled', fulfilled], ['Paid', paid], ['Booked revenue', '$' + (rev / 100).toFixed(2)], ['Audit events', st.audit ? st.audit.length : 0]].forEach(function (p) { dl.appendChild(el('div', {}, [el('dt', { text: p[0] }), el('dd', { text: String(p[1]) })])); }); live.appendChild(dl);
    var b = el('button', { 'class': 'button', type: 'button', text: 'Download session orders as CSV' }); b.addEventListener('click', function () {
      var rows = [['order_id', 'customer_id', 'status', 'payment', 'revenue_usd']].concat(mine.map(function (o) { return [o.id, o.customerId, o.status, o.payment, (o.revenueCents / 100).toFixed(2)]; }));
      var blob = new Blob([rows.map(function (r) { return r.join(','); }).join('\n') + '\n'], { type: 'text/csv' }), a = el('a', { href: URL.createObjectURL(blob), download: 'nasha-demo-session-orders.csv' }); document.body.appendChild(a); a.click(); a.remove();
    }); live.appendChild(b);
    live.appendChild(el('p', { 'class': 'note', text: 'Demo data is synthetic and stays in this browser. The CSV has the shape the lab’s ingestion step expects as a source (orders), but loading it into the warehouse is not implemented yet.' }));
  }
}
function load() { fetch('data/datalab/lab-data.json').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (d) { D = d; Q = D.sql.queries; S = D.skills; start(); }).catch(function () { var p = document.getElementById('q-panel'); if (p) p.textContent = 'The query data could not be loaded (this page needs to be served over HTTP). The table below lists all 24 queries.'; }); }
// The 128 KB evidence file is only needed by the explorer: fetch it when the explorer is about to scroll into view, so it cannot delay first paint.
var box = document.getElementById('sql-explorer');
if (box && 'IntersectionObserver' in window) { var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); load(); } }, { rootMargin: '800px 0px' }); io.observe(box); } else { load(); }
})();
