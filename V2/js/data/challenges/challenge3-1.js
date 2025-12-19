// js/data/challenges/challenge3-1.js
// Desafio 3 — Atividade 1

export default {
  name: "Desafio 3 — Atividade 1",
  intro: "No Desafio 3, os erros ficam mais discretos.",
  instruction: "Corrija o trecho destacado.",
  raw: "E que as crianças ganhem presentis e sorrisos sinceros.",
  rules: []
};

export const RULES = [
  {
    id: "w1",
    label: "Ortografia",
    wrong: "\\bpresentis\\b",
    flags: "gi",
    correct: "presentes",
    reason: "O correto é “presentes”."
  }
];
