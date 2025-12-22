import { initRankingUI } from './modules/ranking.js';
import { applySpecialButton } from './game-core.js';

window.addEventListener('DOMContentLoaded', () => {
  initRankingUI();

  try {
    const progress = JSON.parse(localStorage.getItem('progress')) || {};
    applySpecialButton(progress);
  } catch (e) {
    console.warn('[main] falha ao aplicar missão especial', e);
  }
});