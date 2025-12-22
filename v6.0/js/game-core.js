// === PATCH: unify special mission unlock ===

// call this after finishing challenge 3
export function unlockSpecialMission(progress) {
  if (!progress) return;
  progress.specialUnlocked = true;
  try {
    localStorage.setItem('progress', JSON.stringify(progress));
  } catch (e) {
    console.warn('[special] failed to persist unlock', e);
  }
}

// call on home load
export function isSpecialUnlocked() {
  try {
    const p = JSON.parse(localStorage.getItem('progress') || '{}');
    return p.specialUnlocked === true || p?.d3?.done === true;
  } catch {
    return false;
  }
}