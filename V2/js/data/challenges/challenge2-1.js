// js/data/challenges/challenge2-1.js
// Desafio 2 — Atividade 1

const RULES = [
  {
    "id": "d2a1_1",
    "label": "Ortografia",
    "wrong": "\\bcelebracao\\b",
    "flags": "gi",
    "correct": "celebração",
    "hint": "Acento."
  },
  {
    "id": "d2a1_2",
    "label": "Ortografia",
    "wrong": "\\buna\\b",
    "flags": "gi",
    "correct": "uma",
    "hint": "Uma letra muda."
  },
  {
    "id": "d2a1_3",
    "label": "Ortografia",
    "wrong": "\\bfamilia\\b",
    "flags": "gi",
    "correct": "família",
    "hint": "Acento."
  }
];

export default {
  name: "Desafio 2 — Atividade 1",
  intro: "Agora o texto fica maior e com mais detalhes.",
  instruction: "Corrija todos os erros (não há destaque prévio).",
  raw: "Que a celebracao do Natal una a familia e espalhe esperança.",
  rules: RULES
};
