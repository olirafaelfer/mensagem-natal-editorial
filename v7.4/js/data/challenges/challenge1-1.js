// js/data/challenges/challenge1-1.js
// Desafio 1 — Atividade 1

const RULES = [
  {
    "id": "d1a1_1",
    "label": "Ortografia",
    "wrong": "\\brefeissao\\b",
    "flags": "gi",
    "correct": "refeição",
    "hint": "Repare nos acentos."
  },
  {
    "id": "d1a1_2",
    "label": "Acentuação",
    "wrong": "\\binspiracao\\b",
    "flags": "gi",
    "correct": "inspiração",
    "hint": "Falta acento."
  }
];

export default {
  name: "Desafio 1 — Atividade 1",
  intro: "Correções simples para aquecer.",
  instruction: "Encontre os erros no texto e corrija. (Sem destaques antes de você agir.)",
  raw: "Neste Natal, que sua refeissao em família seja cheia de paz e inspiracao.",
  rules: RULES
};
