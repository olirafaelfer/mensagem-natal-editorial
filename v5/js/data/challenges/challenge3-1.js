// js/data/challenges/challenge3-1.js
// Desafio 3 — Atividade 1

const RULES = [
  {
    "id": "d3a1_1",
    "label": "Acentuação",
    "wrong": "\\bsaude\\b",
    "flags": "gi",
    "correct": "saúde",
    "hint": "Acento."
  },
  {
    "id": "d3a1_2",
    "label": "Acentuação",
    "wrong": "\\bhistoria\\b",
    "flags": "gi",
    "correct": "história",
    "hint": "Acento."
  },
  {
    "id": "d3a1_3",
    "label": "Pontuação",
    "wrong": ",\\s+e",
    "flags": "g",
    "correct": " e",
    "hint": "Vírgula indevida antes de “e”."
  }
];

export default {
  name: "Desafio 3 — Atividade 1",
  intro: "Último desafio: texto mais longo e mais erros.",
  instruction: "Corrija múltiplos erros em um parágrafo.",
  raw: "Neste fim de ano, desejamos saude, prosperidade e muita paz aos nossos leitores, e que cada historia inspire bons encontros.",
  rules: RULES
};
