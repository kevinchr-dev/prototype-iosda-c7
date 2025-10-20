import { storage } from './storage.js';
import { enforceMobileViewport, navigateTo, showToast } from './utils.js';

enforceMobileViewport();

const startBtn = document.getElementById('start-btn');
const linkInput = document.getElementById('drive-link');

startBtn.addEventListener('click', () => {
  const link = linkInput.value.trim();
  if (!link) {
    showToast('Please paste your Drive link');
    linkInput.focus();
    return;
  }

  const nextState = storage.update((state) => ({
    ...state,
    driveLink: link,
    driveSubmittedAt: new Date().toISOString(),
    sessionStartedAt: Date.now()
  }));

  if (!nextState.hasVisited) {
    navigateTo('./login.html');
  } else {
    navigateTo('./prepare.html');
  }
});
