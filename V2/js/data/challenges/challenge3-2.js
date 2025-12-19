// js/data/challenges/challenge3-2.js
// Desafio 3 — Atividade 2

export default {
  name: "Desafio 3 — Atividade 2",
  intro: "Agora, atenção aos acentos e a uma vírgula indevida.",
  instruction: "Corrija os dois trechos destacados.",
  raw: "Natal é tempo de empatia; que ninguem fique sozinho, jamais.",
  rules: []
};

export const RULES = [
  {
    id: "w1",
    label: "Ortografia",
    wrong: "\\bninguem\\b",
    flags: "gi",
    correct: "ninguém",
    reason: "O correto é “ninguém”."
  },
  {
    id: "p1",
    label: "Pontuação",
    wrong: ",\\s+jamais",
    flags: "g",
    correct: " jamais",
    reason: "Vírgula indevida antes de “jamais” aqui."
  }
];
