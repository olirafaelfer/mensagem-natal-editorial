// js/data/challenges/challenge1-1.js
// Desafio 1 — Atividade 1 (Fácil)

export default {
  name: "Desafio 1 — Atividade 1",
  intro: "Começamos com um erro simples de grafia em uma frase natalina.",
  instruction: "Clique no trecho destacado e corrija.",
  raw: "No Natal, cada refeissão em família vira memória e carinho.",
  rules: []
};

// Regras como objetos simples. O engine converte para RegExp.
export const RULES = [
  {
    id: "w1",
    label: "Ortografia",
    wrong: "\\brefeissão\\b",
    flags: "gi",
    correct: "refeição",
    reason: "O correto é “refeição”."
  }
];
