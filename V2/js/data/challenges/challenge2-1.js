// js/data/challenges/challenge2-1.js
// ✅ Conteúdo somente (sem lógica). Substitua livremente raw/rules/reason.

export default {
  name: "Desafio 2 — Atividade 1",
  intro: "Texto provisório (substitua depois).",
  instruction: "Clique nos trechos destacados e corrija.",
  raw: "Neste Natal, a mesa terá refeissões deliciosas, e muita alegria.",
  rules: [
    
  ]
};

// Regras como objetos simples. O engine converte para RegExp.
export const RULES = [
  {
    "id": "w1",
    "label": "Ortografia",
    "wrong": "\\\\brefeissões\\\\b",
    "flags": "g",
    "correct": "refeições",
    "reason": "O correto é “refeições”."
  },
  {
    "id": "p1",
    "label": "Pontuação",
    "wrong": ",\\\\s+e",
    "flags": "g",
    "correct": " e",
    "reason": "Vírgula indevida antes de “e” em coordenação simples."
  }
];
