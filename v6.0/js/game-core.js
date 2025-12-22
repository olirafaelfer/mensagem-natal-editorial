export function checkSpecialUnlock(progress) {
  return progress?.d3?.done === true;
}

export function applySpecialButton(progress) {
  const btn = document.getElementById('specialMissionBtn');
  if (!btn) return;

  if (checkSpecialUnlock(progress)) {
    btn.classList.remove('locked');
    btn.disabled = false;
  } else {
    btn.classList.add('locked');
    btn.disabled = true;
  }
}