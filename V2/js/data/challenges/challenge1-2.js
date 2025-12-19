// js/data/challenges/challenge1-2.js
// Desafio 1 — Atividade 2 (Médio)

export default {
  name: "Desafio 1 — Atividade 2",
  intro: "Agora vamos remover uma vírgula indevida (clique nela).",
  instruction: "Clique na vírgula destacada para removê-la.",
  raw: "Nesta noite de Natal, é tempo de agradecer e partilhar.",
  rules: []
};

export const RULES = [
  {
    id: "p1",
    label: "Pontuação",
    wrong: ",",
    flags: "g",
    correct: "",
    reason: "Vírgula indevida: não se separa sujeito e verbo."
  }
];
