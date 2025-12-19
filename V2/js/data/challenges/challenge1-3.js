// js/data/challenges/challenge1-3.js
// Desafio 1 — Atividade 3 (Difícil)

export default {
  name: "Desafio 1 — Atividade 3",
  intro: "Uma frase natalina com um erro mais sutil.",
  instruction: "Clique no trecho destacado e corrija.",
  raw: "Que a luz do Natal ilumine corações e traga paz para tods.",
  rules: []
};

export const RULES = [
  {
    id: "w1",
    label: "Ortografia",
    wrong: "\\btods\\b",
    flags: "gi",
    correct: "todos",
    reason: "O correto é “todos”."
  }
];
