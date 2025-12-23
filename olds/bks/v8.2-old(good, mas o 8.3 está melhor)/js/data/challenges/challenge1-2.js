// js/data/challenges/challenge1-2.js
// Desafio 1 — Atividade 2

const RULES = [
  {
    "id": "d1a2_1",
    "label": "Pontuação",
    "wrong": ",",
    "flags": "g",
    "correct": "",
    "hint": "Remova a vírgula indevida."
  },
  {
    "id": "d1a2_2",
    "label": "Ortografia",
    "wrong": "\\buniao\\b",
    "flags": "gi",
    "correct": "união",
    "hint": "Falta acento."
  }
];

export default {
  name: "Desafio 1 — Atividade 2",
  intro: "Correções simples para aquecer.",
  instruction: "Remova a vírgula indevida e corrija a palavra errada.",
  raw: "Que o espírito do Natal traga alegria, e uniao para todos.",
  rules: RULES
};
