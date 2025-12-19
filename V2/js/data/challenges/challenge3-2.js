// js/data/challenges/challenge3-2.js
// Desafio 3 — Atividade 2

const RULES = [
  {
    "id": "d3a2_1",
    "label": "Concordância",
    "wrong": "\\bilumine\\b",
    "flags": "gi",
    "correct": "iluminem",
    "hint": "Verbo no plural."
  }
];

export default {
  name: "Desafio 3 — Atividade 2",
  intro: "Último desafio: texto mais longo e mais erros.",
  instruction: "Texto com erro de concordância.",
  raw: "Que as luzes do Natal ilumine nossos caminhos e renove as esperanças.",
  rules: RULES
};
