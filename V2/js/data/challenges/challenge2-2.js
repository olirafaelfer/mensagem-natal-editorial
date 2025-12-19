// js/data/challenges/challenge2-2.js
// Desafio 2 — Atividade 2

export default {
  name: "Desafio 2 — Atividade 2",
  intro: "Pontuação e uma palavra com grafia errada.",
  instruction: "Remova a vírgula indevida e corrija a palavra.",
  raw: "No Natal, compartilhamos generozidade, e lembranças boas.",
  rules: []
};

export const RULES = [
  {
    id: "w1",
    label: "Ortografia",
    wrong: "\\bgenerozidade\\b",
    flags: "gi",
    correct: "generosidade",
    reason: "O correto é “generosidade”."
  },
  {
    id: "p1",
    label: "Pontuação",
    wrong: ",\\s+e",
    flags: "g",
    correct: " e",
    reason: "Vírgula indevida antes de “e” em coordenação simples."
  }
];
