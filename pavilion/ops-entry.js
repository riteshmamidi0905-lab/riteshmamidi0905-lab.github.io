// The default console is pre-rendered. Load the replay engine when someone uses a control.
const formSelector = '#compare, #decide';
let ready = false;
let hydration;
let queuedForm;

function activate() {
  hydration ??= import('./app.js').then(() => { ready = true; });
  return hydration;
}

function showError() {
  const notice = document.getElementById('ops-error');
  if (notice) notice.textContent = 'The interactive console could not load. Reload the page to try again.';
}

function warmControl(event) {
  if (event.target.closest(formSelector)) activate().catch(showError);
}

document.addEventListener('focusin', warmControl);
document.addEventListener('pointerover', warmControl, { passive: true });
document.addEventListener('submit', async event => {
  const form = event.target;
  if (ready || !form.matches(formSelector)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (queuedForm === form) return;
  queuedForm = form;
  const button = event.submitter;
  try {
    await activate();
    if (form.isConnected) form.requestSubmit(button ?? undefined);
  } catch {
    showError();
  } finally {
    queuedForm = undefined;
  }
}, true);

const hasLocalReplay = () => new URLSearchParams(location.hash.slice(1)).has('sim');
if (location.search || hasLocalReplay()) activate().catch(showError);
addEventListener('hashchange', () => {
  if (!ready && hasLocalReplay()) activate().catch(showError);
});
