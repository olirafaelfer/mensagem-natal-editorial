// js/data/challenges/challenge2-2.js
// Desafio 2 — Tarefa 2 (erros de pontuação: 5)

const RULES = [
  {
    id: "d2t2_1",
    label: "Vírgula",
    wrong: "noite de Natal renascendo",
    flags: "g",
    correct: "noite de Natal, renascendo",
    hint: "Falta vírgula para isolar a oração reduzida." 
  },
  {
    id: "d2t2_2",
    label: "Vírgula",
    wrong: "Natal noite de alegria",
    flags: "g",
    correct: "Natal, noite de alegria",
    hint: "Apósito pede vírgula." 
  },
  {
    id: "d2t2_4",
    label: "Ponto",
    wrong: "bonança Que",
    flags: "g",
    correct: "bonança. Que",
    hint: "Separe as frases com ponto." 
  },
  {
    id: "d2t2_3",
    label: "Vírgula",
    wrong: "alegria canções",
    flags: "g",
    correct: "alegria, canções",
    hint: "Após 'alegria' deve haver vírgula." 
  },
  {
    id: "d2t2_5",
    label: "Vírgulas na enumeração",
    wrong: "canções festejos bonança",
    flags: "g",
    correct: "canções, festejos, bonança",
    hint: "Os itens da enumeração devem ser separados por vírgulas." 
  }
];

export default {
  name: "Desafio 2 — Tarefa 2",
  intro: "Pontuação: enumeração e frases justapostas.",
  instruction: "Encontre 5 erros de pontuação e corrija.",
  raw: "Façamos de nossa vida uma extensão da noite de Natal renascendo continuamente em amor e fraternidade. Natal noite de alegria canções festejos bonança Que seu coração floresça em amor e esperança!",
  rules: RULES
};
