(() => {
  document.documentElement.classList.add('js');
  function toggle(button, expanded) {
    button.setAttribute('aria-expanded', String(expanded));
    document.getElementById('navigation')?.classList.toggle('open', expanded);
  }
  function enable() {
    const button = document.querySelector('.portfolio-head .menu-button');
    if (button) button.hidden = false;
  }
  enable();
  addEventListener('pageshow', enable);
  document.addEventListener('portfolio-navigation-ready', enable);
  document.addEventListener('click', event => {
    const button = event.target.closest('.portfolio-head .menu-button');
    if (button) toggle(button, button.getAttribute('aria-expanded') !== 'true');
  });
  document.addEventListener('keydown', event => {
    const button = document.querySelector('.portfolio-head .menu-button[aria-expanded="true"]');
    if (event.key === 'Escape' && button) { toggle(button, false); button.focus(); }
  });
})();

