// Paint the arrival photograph before evaluating the simulation and storefront
// modules. Once loaded, the complete Builder remains available offline.
const root = document.querySelector('#builder');
let loading;
function start() {
  if (!loading) {
    document.querySelector('#board-style').media = 'all';
    loading = import('./builder.js').catch(() => {
      loading = null;
      document.querySelector('#notice').textContent = 'The workspace could not load. Select Guide me through it to retry.';
      return false;
    });
  }
  return loading;
}
function earlyClick(event) {
  const button = event.target.closest('[data-act="guide"]');
  if (!button || root.dataset.screen) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  start().then(loaded => { if (loaded && button.isConnected) button.click(); });
}
root.addEventListener('click', earlyClick, true);
const hero = root.querySelector('.gallery-hero img');
if (document.hidden || location.search || location.hash) {
  start();
} else {
  hero.decode().catch(() => {}).then(() => requestAnimationFrame(() => requestAnimationFrame(start)));
}
