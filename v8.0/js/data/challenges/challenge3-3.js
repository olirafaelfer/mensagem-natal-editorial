// js/data/challenges/challenge3-3.js
// Desafio 3 — Atividade 3

const RULES = [
  {
    "id": "d3a3_1",
    "label": "Acentuação",
    "wrong": "\\besta\\b",
    "flags": "gi",
    "correct": "está",
    "hint": "Acento."
  },
  {
    "id": "d3a3_2",
    "label": "Acentuação",
    "wrong": "\\bproximo\\b",
    "flags": "gi",
    "correct": "próximo",
    "hint": "Acento."
  }
];

export default {
  name: "Desafio 3 — Atividade 3",
  intro: "Último desafio: texto mais longo e mais erros.",
  instruction: "Vários erros em sequência. Capriche!",
  raw: "O verdadeiro sentido do Natal esta em ser gentil, partilhar o pão e reconhecer a dignidade do proximo.",
  rules: RULES
};
