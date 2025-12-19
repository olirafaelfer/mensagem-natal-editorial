// js/data/challenges/challenge2-3.js
// Desafio 2 — Atividade 3

const RULES = [
  {
    "id": "d2a3_1",
    "label": "Acentuação",
    "wrong": "\\bsaude\\b",
    "flags": "gi",
    "correct": "saúde",
    "hint": "Acento agudo."
  },
  {
    "id": "d2a3_2",
    "label": "Acentuação",
    "wrong": "\\buniao\\b",
    "flags": "gi",
    "correct": "união",
    "hint": "Acento/til."
  }
];

export default {
  name: "Desafio 2 — Atividade 3",
  intro: "Agora o texto fica maior e com mais detalhes.",
  instruction: "Duas correções de acento.",
  raw: "Que o Natal traga paz, saude e uniao.",
  rules: RULES
};
