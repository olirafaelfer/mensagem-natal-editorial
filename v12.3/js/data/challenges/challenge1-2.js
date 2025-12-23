// js/data/challenges/challenge1-2.js
// Desafio 1 — Tarefa 2

const RULES = [
  {
    id: "d1t2_1",
    label: "Ortografia",
    wrong: "\\bnacimento\\b",
    flags: "gi",
    correct: "nascimento",
    hint: "Está faltando uma letra s."
  },
  {
    id: "d1t2_2",
    label: "Acentuação",
    wrong: "\\bvoce\\b",
    flags: "gi",
    correct: "você",
    hint: "Falta acento circunflexo."
  },
  {
    id: "d1t2_3",
    label: "Ortografia",
    wrong: "\\bforca\\b",
    flags: "gi",
    correct: "força",
    hint: "Falta cedilha."
  },
  {
    id: "d1t2_4",
    label: "Ortografia",
    wrong: "\\bbriliar\\b",
    flags: "gi",
    correct: "brilhar",
    hint: "A escrita correta é com \"lh\", não com \"li\"."
  }
];

export default {
  id: "challenge1-2",
  name: "Desafio 1 — Tarefa 2",
  difficulty: "Médio",
  goal: "Encontre os erros no texto e corrija.",
  raw: "Que o nacimento de Jesus inspire voce a acreditar na forca dos novos ciclos, nas segundas chances e na luz que sempre volta a briliar.",
  correctText: "Que o nascimento de Jesus inspire você a acreditar na força dos novos ciclos, nas segundas chances e na luz que sempre volta a brilhar.",
  rules: RULES
};
