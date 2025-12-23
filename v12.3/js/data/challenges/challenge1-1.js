// js/data/challenges/challenge1-1.js
// Desafio 1 — Tarefa 1 (erros fáceis)

const RULES = [
  {
    id: "d1t1_1",
    label: "Ortografia",
    wrong: "\\bespirito\\b",
    flags: "gi",
    correct: "espírito",
    hint: 'Falta acento agudo na letra "i".'
  },
  {
    id: "d1t1_2",
    label: "Ortografia",
    wrong: "\\brenovee\\b",
    flags: "gi",
    correct: "renove",
    hint: 'Tem uma letra "e" a mais.'
  },
  {
    id: "d1t1_3",
    label: "Ortografia",
    wrong: "\\brecomeco\\b",
    flags: "gi",
    correct: "recomeço",
    hint: "Falta cedilha."
  }
];

export default {
  id: "challenge1-1",
  title: "Atividade 1",
  subtitle: "Fácil",
  type: "replace",
  difficulty: "easy",
  points: {
    correct: 2,
    wrong: -1,
    hint: -1
  },
  required: RULES.length,
  textCorrect:
    "Que o espírito do Natal renove sua alma e traga um recomeço repleto de paz e esperança.",
  textWrong:
    "Que o espirito do Natal renovee sua alma e traga um recomeco repleto de paz e esperança.",
  rules: RULES
};
