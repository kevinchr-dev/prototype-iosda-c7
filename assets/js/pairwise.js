import { storage } from './storage.js';
import { enforceMobileViewport, navigateTo, loadPhotosManifest } from './utils.js';

enforceMobileViewport();

const groupPill = document.getElementById('group-pill');
const roundPill = document.getElementById('round-pill');
const pairOptions = document.getElementById('pair-options');
const leftCard = document.querySelector('.pair-card[data-choice="left"]');
const rightCard = document.querySelector('.pair-card[data-choice="right"]');
const leftImg = document.getElementById('left-img');
const rightImg = document.getElementById('right-img');
const leftName = document.getElementById('left-name');
const rightName = document.getElementById('right-name');

const state = storage.read();
const duplicateGroups = state.duplicateGroups || [];

if (!duplicateGroups.length) {
  navigateTo('./summary.html');
}

let groupsMeta = [];
let groupIndex = 0;
let roundIndex = 1;
let champion = null;
let opponentIdx = 1;
let decisions = [];
const finalSelections = new Map();
let activePair = { left: null, right: null };
const manifestById = new Map();
const manifestByFilename = new Map();

init();

async function init() {
  console.log('[pairwise] Init starting...');
  console.log('[pairwise] DOM elements:', { leftImg, rightImg, leftName, rightName });

  const manifestPhotos = await loadPhotosManifest();
  manifestById.clear();
  manifestByFilename.clear();
  manifestPhotos.forEach((photo) => {
    manifestById.set(photo.id, photo);
    if (photo.filename) {
      manifestByFilename.set(photo.filename, photo);
    }
  });

  console.log('[pairwise] Loaded manifest:', manifestPhotos.length, 'photos');
  console.log('[pairwise] Duplicate groups from storage:', duplicateGroups.length);
  
  duplicateGroups.forEach((group, idx) => {
    console.log(`[pairwise] Group ${idx}:`, group.key, 'has', group.photos.length, 'photos');
    group.photos.forEach((photo, pidx) => {
      console.log(`  Photo ${pidx}:`, photo);
    });
  });

  groupsMeta = await Promise.all(
    duplicateGroups.map(async (group) => {
      const photosMeta = await Promise.all(group.photos.map((photo) => loadPhotoMeta(rehydratePhoto(photo))));
      return { key: group.key, photos: photosMeta };
    })
  );

  console.log('[pairwise] Processed groupsMeta:', groupsMeta);

  storage.update((prev) => ({
    ...prev,
    pairwiseDecisions: []
  }));

  console.log('[pairwise] About to start first group...');
  
  // Ensure DOM is ready before starting
  if (document.readyState === 'loading') {
    await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
  }
  
  startGroup(0);
}

function startGroup(idx) {
  if (!groupsMeta || !groupsMeta.length) {
    console.error('[pairwise] groupsMeta not ready');
    finalizeFlow();
    return;
  }

  const group = groupsMeta[idx];
  if (!group) {
    finalizeFlow();
    return;
  }

  groupIndex = idx;
  roundIndex = 1;
  champion = group.photos[0];
  opponentIdx = 1;

  if (!champion) {
    startGroup(idx + 1);
    return;
  }

  if (group.photos.length === 1) {
    finalSelections.set(group.key, [champion]);
    startGroup(idx + 1);
    return;
  }

  const opponent = group.photos[opponentIdx];
  renderPair(champion, opponent, group);
}

function renderPair(left, right, currentGroup = null) {
  const group = currentGroup || groupsMeta[groupIndex];
  if (!group) {
    console.error('[pairwise] No group available in renderPair');
    finalizeFlow();
    return;
  }

  if (!right) {
    // reached end of group
    finalizeGroup();
    return;
  }

  activePair = { left, right };

  groupPill.textContent = `Group ${groupIndex + 1} / ${groupsMeta.length}`;
  roundPill.textContent = `Round ${roundIndex} / ${group.photos.length - 1}`;

  const leftPhoto = ensureDisplayPhoto(left);
  const rightPhoto = ensureDisplayPhoto(right);

  console.log('[pairwise] Rendering pair:', {
    groupIndex,
    roundIndex,
    leftPhoto,
    rightPhoto,
    leftImgSrc: leftPhoto.src,
    rightImgSrc: rightPhoto.src,
    leftImgElement: leftImg,
    rightImgElement: rightImg
  });

  if (!leftImg || !rightImg) {
    console.error('[pairwise] IMG elements not found!');
    return;
  }

  leftImg.src = leftPhoto.src;
  rightImg.src = rightPhoto.src;
  leftName.textContent = leftPhoto.filename;
  rightName.textContent = rightPhoto.filename;

  console.log('[pairwise] After setting src:', {
    leftImgSrcSet: leftImg.src,
    rightImgSrcSet: rightImg.src
  });
  
  // Force image load check
  leftImg.onerror = (e) => console.error('[pairwise] Left image failed to load:', leftPhoto.src, e);
  rightImg.onerror = (e) => console.error('[pairwise] Right image failed to load:', rightPhoto.src, e);
  leftImg.onload = () => console.log('[pairwise] Left image loaded successfully');
  rightImg.onload = () => console.log('[pairwise] Right image loaded successfully');
}

function rehydratePhoto(photo) {
  if (!photo) return null;

  console.log('[pairwise] Rehydrating photo:', photo);

  const byId = photo.id ? manifestById.get(photo.id) : null;
  const byFilename = photo.filename ? manifestByFilename.get(photo.filename) : null;
  
  console.log('[pairwise] Found by ID:', byId);
  console.log('[pairwise] Found by filename:', byFilename);
  
  const fallbackSrc = photo.filename ? `./photos/${photo.filename}` : photo.src;

  const merged = {
    ...(byId || byFilename || {}),
    ...photo
  };

  if (!merged.src && fallbackSrc) {
    merged.src = fallbackSrc;
  }

  if (!merged.filename && merged.src) {
    merged.filename = merged.src.split('/').pop() || merged.id || 'photo';
  }

  console.log('[pairwise] Rehydrated result:', merged);

  return merged;
}

function ensureDisplayPhoto(photo) {
  const base = rehydratePhoto(photo) || {
    id: photo?.id ?? crypto.randomUUID?.() ?? `photo-${Date.now()}`,
    src: '',
    filename: '—'
  };

  return {
    id: base.id,
    src: base.src || (base.filename ? `./photos/${base.filename}` : ''),
    filename: base.filename || '—'
  };
}

leftCard.addEventListener('click', () => choose('left'));
rightCard.addEventListener('click', () => choose('right'));

function choose(selection) {
  const group = groupsMeta[groupIndex];
  if (!group) {
    console.error('[pairwise] No group in choose');
    return;
  }

  const picked = selection === 'left' ? activePair.left : activePair.right;
  const dropped = selection === 'left' ? activePair.right : activePair.left;

  decisions.push({
    group: group.key,
    round: roundIndex,
    pickedId: picked.id,
    droppedId: dropped.id,
    action: 'pick'
  });

  champion = picked;
  opponentIdx += 1;
  roundIndex += 1;
  
  const nextOpponent = group.photos[opponentIdx];
  renderPair(champion, nextOpponent, group);
}

function finalizeGroup() {
  const group = groupsMeta[groupIndex];
  if (!group) {
    console.error('[pairwise] No group in finalizeGroup');
    finalizeFlow();
    return;
  }

  const chosen = finalSelections.get(group.key) || [];
  chosen.push(champion);

  const allEliminated = group.photos.filter((p) => p.id !== champion.id);
  decisions.push({
    group: group.key,
    round: roundIndex,
    action: 'winner',
    pickedId: champion.id,
    dropped: allEliminated.map((p) => p.id)
  });

  finalSelections.set(group.key, dedupeById(chosen));
  startGroup(groupIndex + 1);
}

function finalizeFlow() {
  const latest = storage.read();
  const originalYes = latest.yesPhotos || [];
  const refined = originalYes.filter((photo) => {
    const belongingGroup = duplicateGroups.find((group) => group.photos.some((p) => p.id === photo.id));
    return !belongingGroup;
  });

  for (const [key, photos] of finalSelections.entries()) {
    photos.forEach((photo) => {
      if (!refined.some((item) => item.id === photo.id)) {
        refined.push(photo);
      }
    });
  }

  storage.update((prev) => ({
    ...prev,
    pairwiseDecisions: decisions,
    refinedYesPhotos: refined
  }));

  navigateTo('./summary.html');
}

function dedupeById(items) {
  const map = new Map();
  items.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

function loadPhotoMeta(photo) {
  return new Promise((resolve) => {
    const hydrated = ensureDisplayPhoto(photo);
    if (!hydrated.src) {
      resolve({ ...hydrated, width: 3, height: 4 });
      return;
    }

    const img = new Image();
    img.onload = () => {
      resolve({ ...hydrated, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve({ ...hydrated, width: 3, height: 4 });
    };
    img.src = hydrated.src;
  });
}
