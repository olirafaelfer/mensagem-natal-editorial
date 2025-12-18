// js/game-core.js — CORE LIMPO (BOOT SEGURO)

let currentLevel = null;
let currentText = "";

export function initGame() {
  bindUI();
  console.log("✅ Game core inicializado");
}

function bindUI() {
  const btn = document.querySelector("#startBtn, #challenge1Btn");
  if (btn) {
    btn.addEventListener("click", () => {
      startLevel({
        raw: "Teste inicial: o Natal é um tempo de amor e esperança.",
        rules: []
      });
    });
  }
}

function startLevel(level) {
  currentLevel = level;
  currentText = level.raw;
  renderText();
}

function renderText() {
  const area = document.getElementById("messageArea");
  if (!area) return;
  area.innerHTML = "";
  currentText.split(" ").forEach(word => {
    const span = document.createElement("span");
    span.textContent = word + " ";
    span.className = "token";
    area.appendChild(span);
  });
}
