// js/data/challenges/challenge3-3.js
// Desafio 3 — Atividade 3

export default {
  name: "Desafio 3 — Atividade 3",
  intro: "Última atividade: dois acentos para ajustar em uma frase da editora.",
  instruction: "Corrija os dois trechos destacados.",
  raw: "Que a editora espalhe historias que aquecem o coracao neste Natal.",
  rules: []
};

export const RULES = [
  {
    id: "w1",
    label: "Ortografia",
    wrong: "\\bhistorias\\b",
    flags: "gi",
    correct: "histórias",
    reason: "O correto é “histórias”."
  },
  {
    id: "w2",
    label: "Ortografia",
    wrong: "\\bcoracao\\b",
    flags: "gi",
    correct: "coração",
    reason: "O correto é “coração”."
  }
];
