// js/data/challenges/challenge1-3.js
// Desafio 1 — Atividade 3

const RULES = [
  {
    "id": "d1a3_1",
    "label": "Ortografia",
    "wrong": "\\bcaridadee\\b",
    "flags": "gi",
    "correct": "caridade",
    "hint": "Há uma letra sobrando."
  }
];

export default {
  name: "Desafio 1 — Atividade 3",
  intro: "Correções simples para aquecer.",
  instruction: "Use a dica e a correção automática quando disponível.",
  raw: "A missão de Natal é praticar caridadee e compartilhar histórias.",
  rules: RULES
};
