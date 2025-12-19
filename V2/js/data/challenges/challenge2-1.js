// js/data/challenges/challenge2-1.js
// Desafio 2 — Atividade 1

export default {
  name: "Desafio 2 — Atividade 1",
  intro: "Agora a frase tem dois pontos para ajustar.",
  instruction: "Corrija os dois trechos destacados.",
  raw: "Que a celebracao do Natal una a familia e espalhe esperança.",
  rules: []
};

export const RULES = [
  {
    id: "w1",
    label: "Ortografia",
    wrong: "\\bcelebracao\\b",
    flags: "gi",
    correct: "celebração",
    reason: "O correto é “celebração”."
  },
  {
    id: "w2",
    label: "Ortografia",
    wrong: "\\bfamilia\\b",
    flags: "gi",
    correct: "família",
    reason: "O correto é “família”."
  }
];
