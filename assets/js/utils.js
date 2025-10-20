import { storage } from './storage.js';

export function enforceMobileViewport() {
  function adjust() {
    const prefersMobileWidth = 420;
    const frame = document.querySelector('.mobile-frame');
    if (!frame) return;

    if (window.innerWidth <= prefersMobileWidth + 20) {
      frame.style.transform = 'none';
      frame.style.height = 'min(900px, 100vh)';
      frame.style.borderRadius = '42px';
      return;
    }

    const scale = 375 / prefersMobileWidth;
    frame.style.transform = `scale(${scale})`;
    frame.style.transformOrigin = 'top center';
    frame.style.height = `calc(min(900px, 100vh) / ${scale})`;
    frame.style.borderRadius = '60px';
  }

  adjust();
  window.addEventListener('resize', adjust);
}

export function createModalController(id) {
  const backdrop = document.getElementById(id);
  const modal = backdrop?.querySelector('.modal');
  if (!backdrop || !modal) {
    throw new Error(`Modal ${id} not found`);
  }

  const open = () => {
    requestAnimationFrame(() => backdrop.classList.add('active'));
  };

  const close = () => {
    backdrop.classList.remove('active');
  };

  return { backdrop, modal, open, close };
}

export async function loadPhotosManifest() {
  const cached = storage.read();
  if (cached.photos && cached.photos.length) return cached.photos;

  try {
    const response = await fetch('./photos/manifest.json', {
      cache: 'no-cache'
    });
    if (!response.ok) throw new Error('Manifest not found');
    const { photos } = await response.json();
    const mapped = photos.map((src, index) => ({
      id: `photo-${index}`,
      src,
      filename: src.split('/').pop() || `photo-${index}`
    }));

    storage.update((state) => ({
      ...state,
      photos: mapped
    }));

    return mapped;
  } catch (err) {
    console.error('Unable to load manifest', err);
    return [];
  }
}

export function navigateTo(url) {
  window.location.href = url;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function showToast(message, duration = 1800) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

export function dedupeCandidates(photos) {
  const groups = [];
  const map = new Map();

  photos.forEach((photo) => {
    const normalized = normalizeFilename(photo.filename);
    if (!map.has(normalized)) {
      map.set(normalized, []);
    }
    map.get(normalized).push(photo);
  });

  for (const [key, values] of map.entries()) {
    if (values.length > 1) {
      groups.push({ key, photos: values });
    }
  }

  return groups;
}

function normalizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .replace(/\d+/g, '')
    .replace(/[_\-\s]+/g, '');
}
