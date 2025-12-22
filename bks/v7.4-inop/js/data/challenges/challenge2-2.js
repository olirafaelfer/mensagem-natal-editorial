// js/data/challenges/challenge2-2.js
// Desafio 2 — Atividade 2

const RULES = [
  {
    "id": "d2a2_1",
    "label": "Ortografia",
    "wrong": "\\bgenerozidade\\b",
    "flags": "gi",
    "correct": "generosidade",
    "hint": "Troca de letra."
  },
  {
    "id": "d2a2_2",
    "label": "Pontuação",
    "wrong": ",",
    "flags": "g",
    "correct": "",
    "hint": "Retire essa vírgula."
  }
];

export default {
  name: "Desafio 2 — Atividade 2",
  intro: "Agora o texto fica maior e com mais detalhes.",
  instruction: "Remova a vírgula indevida e corrija a palavra.",
  raw: "No Natal compartilhamos generozidade , e lembranças boas.",
  rules: RULES
};
