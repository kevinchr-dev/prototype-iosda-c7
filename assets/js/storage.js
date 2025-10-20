const STORAGE_KEY = 'photoFlowState';

const defaultState = {
  hasVisited: false,
  targetCount: null,
  yesPhotos: [],
  noPhotos: [],
  duplicateGroups: [],
  pairwiseDecisions: [],
  photos: [],
  lastUpdated: null
};

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch (err) {
    console.warn('Failed to parse state, resetting.', err);
    localStorage.removeItem(STORAGE_KEY);
    return { ...defaultState };
  }
}

function writeState(state) {
  const snapshot = {
    ...state,
    lastUpdated: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function updateState(mutator) {
  const current = readState();
  const next = mutator(current) || current;
  writeState(next);
  return next;
}

function resetState(partial = {}) {
  const merged = { ...defaultState, ...partial };
  writeState(merged);
  return merged;
}

export const storage = {
  read: readState,
  write: writeState,
  update: updateState,
  reset: resetState
};
