import { storage } from './storage.js';
import { enforceMobileViewport, createModalController, navigateTo, showToast } from './utils.js';

enforceMobileViewport();

const targetPill = document.getElementById('target-pill');
const targetInput = document.getElementById('target-input');
const submitBtn = document.getElementById('target-submit');

const modal = createModalController('target-modal');
const state = storage.read();

if (state.targetCount) {
  targetPill.textContent = `Target: ${state.targetCount}`;
  targetInput.value = state.targetCount;
}

let timerHandle;

function startRedirectCountdown() {
  if (timerHandle) return;
  timerHandle = setTimeout(() => navigateTo('./swipe.html'), 5000);
}

setTimeout(() => {
  modal.open();
}, 500);

submitBtn.addEventListener('click', () => {
  const value = parseInt(targetInput.value, 10);
  if (!Number.isFinite(value) || value <= 0) {
    showToast('Please enter a positive number');
    return;
  }

  storage.update((prev) => ({
    ...prev,
    targetCount: value
  }));

  targetPill.textContent = `Target: ${value}`;
  modal.close();
  showToast(`Target set to ${value}`);
  startRedirectCountdown();
});

modal.backdrop.addEventListener('click', (event) => {
  if (event.target === modal.backdrop) {
    showToast('Enter target to proceed');
  }
});

