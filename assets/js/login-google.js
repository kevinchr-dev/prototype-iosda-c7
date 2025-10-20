import { storage } from './storage.js';
import { enforceMobileViewport, navigateTo, sleep } from './utils.js';

enforceMobileViewport();

storage.update((state) => ({
  ...state,
  hasVisited: true
}));

const note = document.getElementById('redirect-note');

(async function countdown() {
  for (let remaining = 3; remaining > 0; remaining--) {
    note.textContent = `Redirecting in ${remaining} second${remaining === 1 ? '' : 's'}…`;
    await sleep(1000);
  }
  navigateTo('./prepare.html');
})();
