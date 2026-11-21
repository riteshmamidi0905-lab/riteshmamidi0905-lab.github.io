// Paint the arrival photograph before evaluating the simulation and storefront
// modules. Once loaded, the complete Builder remains available offline.
// Chromium requests a favicon again when the share fragment changes. Cache our
// existing local icon at startup so the preview journey can stay fully offline.
const icon = document.querySelector('link[rel="icon"]');
const localIcon = fetch(icon.href).then(response => {
  if (!response.ok) throw Error('Local icon unavailable');
  return response.blob();
}).then(blob => { icon.href = URL.createObjectURL(blob); }).catch(() => {});
const root = document.querySelector('#builder');
let loading;
function start() {
  if (!loading) {
    document.querySelector('#board-style').media = 'all';
    document.querySelector('#studio-style').media = 'all';
    document.querySelector('#venue-style').media = 'all';
    loading = localIcon.then(() => import('./builder.js')).catch(() => {
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
