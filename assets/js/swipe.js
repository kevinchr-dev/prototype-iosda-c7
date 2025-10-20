import { storage } from './storage.js';
import {
  enforceMobileViewport,
  loadPhotosManifest,
  createModalController,
  showToast,
  dedupeCandidates,
  navigateTo
} from './utils.js';

enforceMobileViewport();

const PREVIEW_DELAY = 450;
const PREVIEW_CANCEL_DISTANCE = 18;

const stack = document.getElementById('photo-stack');
const acceptBtn = document.getElementById('accept-btn');
const rejectBtn = document.getElementById('reject-btn');
const countPill = document.getElementById('count-pill');
const yesPill = document.getElementById('yes-pill');
const noPill = document.getElementById('no-pill');
const filenameLabel = document.getElementById('photo-name');

const resultModal = createModalController('result-modal');
const resultSummary = document.getElementById('result-summary');
const duplicateList = document.getElementById('duplicate-list');
const proceedBtn = document.getElementById('proceed-btn');

let deck = [];
let currentIndex = 0;
let yesPhotos = [];
let noPhotos = [];
let isAnimating = false;

init();

async function init() {
  storage.update((prev) => ({
    ...prev,
    yesPhotos: [],
    noPhotos: [],
    duplicateGroups: [],
    pairwiseDecisions: []
  }));

  const photos = await loadPhotosManifest();
  if (!photos.length) {
    stack.innerHTML = '<p style="text-align:center;color:var(--text-muted);">No photos found in manifest.</p>';
    if (filenameLabel) {
      filenameLabel.textContent = '—';
    }
    acceptBtn.disabled = true;
    rejectBtn.disabled = true;
    return;
  }

  deck = photos.map((photo, index) => ({
    photo,
    card: createCard(photo, index)
  }));

  deck.forEach(({ card }) => stack.appendChild(card));
  refreshPositions();
}

function createCard(photo, index) {
  const card = document.createElement('div');
  card.className = 'photo-card hidden';
  card.dataset.index = index;
  card.dataset.filename = photo.filename || `Photo ${index + 1}`;

  const surface = document.createElement('div');
  surface.className = 'photo-surface';

  const image = document.createElement('img');
  image.src = photo.src;
  image.alt = photo.filename || `Photo ${index + 1}`;
  image.style.maxHeight = '100%';
  image.style.width = '100%';
  image.style.height = '100%';
  image.style.objectFit = 'contain';

  surface.appendChild(image);
  card.appendChild(surface);

  const threshold = 90;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;

  let previewTimeout = null;
  let isPreviewing = false;
  let previewSource = null;

  const clearPreviewTimeout = () => {
    if (previewTimeout) {
      clearTimeout(previewTimeout);
      previewTimeout = null;
    }
  };

  const activatePreview = (source) => {
    if (isPreviewing && previewSource === source) return;
    previewSource = source;
    isPreviewing = true;
    card.classList.add('previewing');
  };

  const removePreview = () => {
    if (!isPreviewing) return;
    isPreviewing = false;
    previewSource = null;
    card.classList.remove('previewing');
  };

  const schedulePreview = () => {
    clearPreviewTimeout();
    previewTimeout = setTimeout(() => {
      if (Math.abs(currentX) <= PREVIEW_CANCEL_DISTANCE && Math.abs(currentY) <= PREVIEW_CANCEL_DISTANCE) {
        activatePreview('press');
      }
    }, PREVIEW_DELAY);
  };

  card.__resetPreview = () => {
    clearPreviewTimeout();
    removePreview();
  };

  const onPointerDown = (event) => {
    if (isAnimating || Number(card.dataset.index) !== currentIndex) return;
    event.preventDefault();
    clearPreviewTimeout();
    removePreview();

    card.setPointerCapture(event.pointerId);
    startX = event.clientX;
    startY = event.clientY;
    currentX = 0;
    currentY = 0;
    card.style.transition = 'none';

    schedulePreview();
  };

  const onPointerMove = (event) => {
    if (!card.hasPointerCapture?.(event.pointerId)) return;
    currentX = event.clientX - startX;
    currentY = event.clientY - startY;

    if (Math.abs(currentX) > PREVIEW_CANCEL_DISTANCE || Math.abs(currentY) > PREVIEW_CANCEL_DISTANCE) {
      clearPreviewTimeout();
      if (previewSource === 'press') {
        removePreview();
      }
    }

    if (isPreviewing && previewSource === 'press') {
      if (Math.abs(currentX) > PREVIEW_CANCEL_DISTANCE || Math.abs(currentY) > PREVIEW_CANCEL_DISTANCE) {
        removePreview();
      } else {
        return;
      }
    }

    const rotation = currentX / 16;
    card.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotation}deg)`;
  };

  const onPointerUp = (event) => {
    if (!card.hasPointerCapture?.(event.pointerId)) return;
    card.releasePointerCapture(event.pointerId);
    card.style.transition = '';
    clearPreviewTimeout();

    if (isPreviewing && previewSource === 'press') {
      removePreview();
      card.style.transform = '';
      return;
    }

    if (Math.abs(currentX) > threshold) {
      const direction = currentX > 0 ? 'right' : 'left';
      finalizeSwipe(direction, card);
    } else {
      card.style.transform = '';
    }
  };

  card.addEventListener('pointerdown', onPointerDown);
  card.addEventListener('pointermove', onPointerMove);
  card.addEventListener('pointerup', onPointerUp);
  card.addEventListener('pointercancel', onPointerUp);

  card.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse' && Number(card.dataset.index) === currentIndex && !isAnimating) {
      activatePreview('hover');
    }
  });

  card.addEventListener('pointerleave', () => {
    if (previewSource === 'hover') {
      removePreview();
    }
  });

  return card;
}

function refreshPositions() {
  const total = deck.length;
  const remaining = Math.max(total - currentIndex, 0);
  countPill.textContent = `Remaining: ${remaining}`;
  yesPill.textContent = `Yes: ${yesPhotos.length}`;
  noPill.textContent = `No: ${noPhotos.length}`;

  const activeItem = deck[currentIndex];
  if (filenameLabel) {
    const labelText = activeItem
      ? activeItem.photo.filename || activeItem.card.dataset.filename || '—'
      : '—';
    filenameLabel.textContent = labelText;
  }

  deck.forEach(({ card }, idx) => {
    card.classList.remove('slot-1', 'slot-2', 'slot-3', 'hidden');

    if (typeof card.__resetPreview === 'function' && idx !== currentIndex) {
      card.__resetPreview();
    }

    if (idx < currentIndex) {
      card.classList.add('hidden');
      card.style.pointerEvents = 'none';
      card.style.zIndex = '';
      card.style.transform = '';
      return;
    }

    const offset = idx - currentIndex;
    card.style.zIndex = '';

    if (offset === 0) {
      card.classList.add('slot-1');
      card.style.pointerEvents = 'auto';
      card.style.zIndex = 30;
    } else if (offset === 1) {
      card.classList.add('slot-2');
      card.style.pointerEvents = 'none';
      card.style.zIndex = 20;
    } else if (offset === 2) {
      card.classList.add('slot-3');
      card.style.pointerEvents = 'none';
      card.style.zIndex = 10;
    } else {
      card.classList.add('hidden');
      card.style.pointerEvents = 'none';
    }

    if (!card.style.transition) {
      card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    }

    if (!card.style.transform || card.style.transform === 'none') {
      card.style.transform = '';
    }
  });
}

function finalizeSwipe(direction, card) {
  if (isAnimating) return;
  isAnimating = true;

  card.__resetPreview?.();

  const idx = Number(card.dataset.index);
  const deckItem = deck[idx];
  const travelX = direction === 'right' ? stack.clientWidth * 1.4 : -stack.clientWidth * 1.4;
  const rotate = direction === 'right' ? 24 : -24;

  card.style.transition = 'transform 0.32s ease, opacity 0.32s ease';
  card.style.transform = `translate(${travelX}px, -40px) rotate(${rotate}deg)`;
  card.style.opacity = '0';

  setTimeout(() => {
    card.classList.add('hidden');
    card.style.transform = '';
    card.style.opacity = '';
    card.style.transition = '';
    card.__resetPreview?.();

    registerDecision(deckItem.photo, direction === 'right');
    currentIndex += 1;
    refreshPositions();
    isAnimating = false;

    if (currentIndex >= deck.length) {
      concludeSession();
    }
  }, 320);
}

function registerDecision(photo, accepted) {
  if (accepted) {
    yesPhotos.push(photo);
  } else {
    noPhotos.push(photo);
  }

  storage.update((prev) => ({
    ...prev,
    yesPhotos,
    noPhotos
  }));
}

acceptBtn.addEventListener('click', () => actOnTopCard(true));
rejectBtn.addEventListener('click', () => actOnTopCard(false));

function actOnTopCard(accept) {
  if (isAnimating) return;
  const top = deck[currentIndex];
  if (!top) return;
  top.card.__resetPreview?.();
  finalizeSwipe(accept ? 'right' : 'left', top.card);
}

function concludeSession() {
  const duplicates = dedupeCandidates(yesPhotos);
  
  console.log('[swipe] Yes photos:', yesPhotos);
  console.log('[swipe] Detected duplicates:', duplicates);
  
  storage.update((prev) => ({
    ...prev,
    duplicateGroups: duplicates
  }));

  const yesCount = yesPhotos.length;
  const noCount = noPhotos.length;
  const duplicateGroupCount = duplicates.length;
  const duplicatePhotoCount = duplicates.reduce((sum, group) => sum + group.photos.length, 0);

  resultSummary.innerHTML = `You approved <strong>${yesCount}</strong> photo${yesCount === 1 ? '' : 's'} and skipped <strong>${noCount}</strong>.`;

  if (duplicateGroupCount > 0) {
    duplicateList.innerHTML = `
      <p style="margin:0;font-size:14px;color:var(--text-muted);">
        Found <strong style="color:var(--primary);">${duplicateGroupCount}</strong> duplicate group${duplicateGroupCount === 1 ? '' : 's'} 
        with <strong style="color:var(--primary);">${duplicatePhotoCount}</strong> photo${duplicatePhotoCount === 1 ? '' : 's'} total.
      </p>
    `;
  } else {
    duplicateList.innerHTML = `<p style="margin:0;font-size:14px;color:var(--text-muted);">No duplicate patterns detected. Nice!</p>`;
  }

  setTimeout(() => resultModal.open(), 240);
}

proceedBtn.addEventListener('click', () => {
  const { duplicateGroups } = storage.read();
  if (duplicateGroups && duplicateGroups.length) {
    navigateTo('./pairwise.html');
  } else {
    navigateTo('./summary.html');
  }
});
