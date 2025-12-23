// js/data/challenges/challenge1-3.js
// Desafio 1 — Tarefa 3 (erros fáceis: ortografia/acentuação)

const RULES = [
  {
    id: "d1t3_1",
    label: "Acentuação",
    wrong: "\\bNatal e o\\b",
    flags: "g",
    correct: "Natal é o",
    hint: "Verbo 'ser' com acento." 
  },
  {
    id: "d1t3_2",
    label: "Ortografia",
    wrong: "\\bcomecos\\b",
    flags: "gi",
    correct: "começos",
    hint: "Falta cedilha." 
  },
  {
    id: "d1t3_3",
    label: "Ortografia",
    wrong: "\\bforcas\\b",
    flags: "gi",
    correct: "forças",
    hint: "Falta cedilha." 
  },
  {
    id: "d1t3_4",
    label: "Acentuação",
    wrong: "\\bamanha\\b",
    flags: "gi",
    correct: "amanhã",
    hint: "Falta til." 
  }
];

export default {
  name: "Desafio 1 — Tarefa 3",
  intro: "Erros simples (4) em um texto um pouco maior.",
  instruction: "Encontre os erros no texto e corrija.",
  raw: "O Natal e o momento de renascimento e de novos comecos. Que a luz desta data especial ilumine seus caminhos e renove suas forcas para enfrentar os desafios do amanha.",
  rules: RULES
};
