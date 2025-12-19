// js/data/challenges/challenge2-3.js
// Desafio 2 — Atividade 3

export default {
  name: "Desafio 2 — Atividade 3",
  intro: "Ajuste final do Desafio 2: duas correções rápidas.",
  instruction: "Corrija os dois trechos destacados.",
  raw: "Que o Natal traga paz, saude e união.",
  rules: []
};

export const RULES = [
  {
    id: "w1",
    label: "Ortografia",
    wrong: "\\bsaude\\b",
    flags: "gi",
    correct: "saúde",
    reason: "O correto é “saúde”."
  },
  {
    id: "p1",
    label: "Pontuação",
    wrong: ",\\s+saúde",
    flags: "g",
    correct: " saúde",
    reason: "Evite vírgula separando termos simples na enumeração curta aqui."
  }
];
