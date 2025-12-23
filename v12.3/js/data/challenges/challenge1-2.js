// js/data/challenges/challenge1-2.js
// Desafio 1 — Tarefa 2 (erros fáceis: ortografia/acentuação)

const RULES = [
  {
    id: "d1t2_1",
    label: "Ortografia",
    wrong: "\\bnacimento\\b",
    flags: "gi",
    correct: "nascimento",
    hint: "Está faltando uma letra s em uma palavra."
  },
  {
    id: "d1t2_2",
    label: "Acentuação",
    wrong: "\\bvoce\\b",
    flags: "gi",
    correct: "você",
    hint: "Falta acento em uma palavra."
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
    wrong: "\\bbrilar\\b",
    flags: "gi",
    correct: "brilhar",
    hint: "Falta uma letra h em uma palavra."
  }
];

export default {
  name: "Desafio 1 — Tarefa 2",
  intro: "Erros simples.",
  instruction: "Encontre os erros no texto e corrija.",
  raw: "Que o nacimento de Jesus inspire voce a acreditar na forca dos novos ciclos, nas segundas chances e na luz que sempre volta a brilar.",
  rules: RULES
};
