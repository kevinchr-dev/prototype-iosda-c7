import { storage } from './storage.js';
import { enforceMobileViewport, createModalController, navigateTo, showToast } from './utils.js';

enforceMobileViewport();

const grid = document.getElementById('summary-grid');
const remainPill = document.getElementById('remain-pill');
const modePill = document.getElementById('mode-pill');
const replayBtn = document.getElementById('replay-btn');

const modal = createModalController('method-modal');
const state = storage.read();

const finalPhotos = (state.refinedYesPhotos && state.refinedYesPhotos.length)
  ? state.refinedYesPhotos
  : state.yesPhotos && state.yesPhotos.length
    ? state.yesPhotos
    : state.photos || [];

remainPill.textContent = `Remain Photos: ${finalPhotos.length}`;

grid.innerHTML = '';

if (!finalPhotos.length) {
  const empty = document.createElement('p');
  empty.textContent = 'No curated photos found.';
  empty.style.color = 'var(--text-muted)';
  empty.style.textAlign = 'center';
  grid.appendChild(empty);
} else {
  finalPhotos.forEach((photo, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'thumbnail';

    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.filename || `Photo ${index + 1}`;

    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = `${index + 1}`;

    wrapper.appendChild(img);
    wrapper.appendChild(badge);
    grid.appendChild(wrapper);
  });
}

setTimeout(() => modal.open(), 500);

modal.modal.querySelectorAll('button').forEach((button) => {
  button.addEventListener('click', () => {
    const method = button.dataset.method;
    modePill.textContent = `Mode: ${method?.toUpperCase() || 'SMART'}`;
    showToast(`Method set to ${method}`);
    modal.close();
  });
});

replayBtn.addEventListener('click', () => {
  storage.reset({ hasVisited: true });
  navigateTo('./index.html');
});
