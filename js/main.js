// js/main.js — BOOT LIMPO E SEGURO
import { initGame } from "./game-core.js";

window.addEventListener("DOMContentLoaded", () => {
  try {
    initGame();
  } catch (e) {
    console.error("❌ Erro ao iniciar o jogo:", e);
  }
});
