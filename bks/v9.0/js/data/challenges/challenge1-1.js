// js/data/challenges/challenge1-1.js
// Desafio 1 — Tarefa 1 (erros fáceis: ortografia/acentuação)

const RULES = [
  {
    id: "d1t1_1",
    label: "Acentuação",
    wrong: "\\bespirito\\b",
    flags: "gi",
    correct: "espírito",
    hint: "Falta acento."
  },
  {
    id: "d1t1_2",
    label: "Ortografia",
    wrong: "\\balmaa\\b",
    flags: "gi",
    correct: "alma",
    hint: "Há uma letra a mais."
  },
  {
    id: "d1t1_3",
    label: "Ortografia",
    wrong: "\\brecomeco\\b",
    flags: "gi",
    correct: "recomeço",
    hint: "Falta cedilha e acento."
  },
  {
    id: "d1t1_4",
    label: "Acentuação",
    wrong: "\\besperanca\\b",
    flags: "gi",
    correct: "esperança",
    hint: "Falta cedilha."
  }
];

export default {
  name: "Desafio 1 — Tarefa 1",
  intro: "Erros simples para aquecer (4).",
  instruction: "Encontre os erros no texto e corrija.",
  raw: "Que o espirito do Natal renove sua almaa e traga um recomeco repleto de paz e esperanca.",
  rules: RULES
};
