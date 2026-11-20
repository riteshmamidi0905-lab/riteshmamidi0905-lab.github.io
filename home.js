// The homepage already ships its default ecosystem selection and all links as HTML.
(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const menu = document.querySelector('.menu-button');
  const navigation = document.getElementById('navigation');
  function setMenu(open) {
    menu.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('open', open);
  }
  menu.hidden = false;
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menu.focus();
    }
  });

  // Native buttons work immediately. Query and update the offscreen diagram only on selection.
  document.addEventListener('click', event => {
    const control = event.target.closest('[data-eco], [data-eco-node]');
    const root = control && control.closest('[data-eco-root]');
    if (!root) return;
    const value = control.dataset.eco ?? control.dataset.ecoNode;
    for (const button of root.querySelectorAll('[data-eco]'))
      button.setAttribute('aria-pressed', String(button.dataset.eco === value));
    for (const panel of root.querySelectorAll('[data-eco-panel]'))
      panel.hidden = panel.dataset.ecoPanel !== value;
    for (const node of root.querySelectorAll('[data-eco-node]'))
      node.classList.toggle('on', node.dataset.ecoNode === value);
  });

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let progress, orbit, pending = false;
  function paintScroll() {
    pending = false;
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (!progress) {
      progress = document.createElement('div');
      progress.className = 'progress home-progress';
      progress.setAttribute('aria-hidden', 'true');
      document.body.append(progress);
      orbit = document.querySelector('.orbital');
    }
    progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1,y / max) : 0) + ')';
    if (innerWidth > 760 && y < innerHeight * 1.2)
      orbit.style.transform = 'translate3d(0,' + (y * .07).toFixed(1) + 'px,0)';
  }
  addEventListener('scroll', () => {
    if (!pending) {
      pending = true;
      requestAnimationFrame(paintScroll);
    }
  }, {passive: true});
})();

