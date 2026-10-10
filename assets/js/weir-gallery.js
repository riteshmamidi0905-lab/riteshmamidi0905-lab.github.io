/* Weir page: turns the list of Control Center screenshots into a tabbed viewer. Without this script the list simply shows every screenshot in turn.
   Mouse, touch and keyboard: Left and Right move between tabs, Home and End jump to the first and last. */
(function () {
  var walk = document.querySelector('[data-cc-walk]');
  if (!walk) return;
  var steps = [].slice.call(walk.querySelectorAll('.cc-step'));
  if (steps.length < 2) return;
  var list = document.createElement('div');
  list.className = 'cc-tabs'; list.setAttribute('role', 'tablist'); list.setAttribute('aria-label', 'Control Center screens');
  var tabs = steps.map(function (step, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'cc-tab'; b.id = 'cc-tab-' + i; b.textContent = step.getAttribute('data-title');
    b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', step.id);
    step.setAttribute('role', 'tabpanel'); step.setAttribute('aria-labelledby', b.id);
    list.appendChild(b);
    return b;
  });
  walk.insertBefore(list, walk.querySelector('.cc-steps'));
  function show(i, focus) {
    steps.forEach(function (s, j) { s.hidden = j !== i; });
    tabs.forEach(function (t, j) { t.setAttribute('aria-selected', j === i ? 'true' : 'false'); t.tabIndex = j === i ? 0 : -1; });
    if (focus) tabs[i].focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { show(i); });
    t.addEventListener('keydown', function (e) {
      var n = i;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      else return;
      e.preventDefault(); show(n, true);
    });
  });
  walk.setAttribute('data-enhanced', '');
  show(0);
})();
