// js/data/challenges/challenge2-3.js
// Desafio 2 — Tarefa 3 (erros de pontuação: 5)

const RULES = [
  {
    id: "d2t3_1",
    label: "Vírgula",
    wrong: "benevolência perdão",
    flags: "g",
    correct: "benevolência, perdão",
    hint: "Enumeração pede vírgula." 
  },
  {
    id: "d2t3_2",
    label: "Vírgula indevida",
    wrong: "generosidade, e alegria",
    flags: "g",
    correct: "generosidade e alegria",
    hint: "Não se usa vírgula antes de 'e' neste caso." 
  },
  {
    id: "d2t3_3",
    label: "Ponto",
    wrong: "alegria A única época",
    flags: "g",
    correct: "alegria. A única época",
    hint: "Duas frases devem ser separadas por ponto." 
  },
  {
    id: "d2t3_4",
    label: "Vírgula",
    wrong: "parecem de comum acordo",
    flags: "g",
    correct: "parecem, de comum acordo",
    hint: "Expressão intercalada deve ficar entre vírgulas." 
  },
  {
    id: "d2t3_5",
    label: "Vírgula",
    wrong: "acordo abrir",
    flags: "g",
    correct: "acordo, abrir",
    hint: "Falta uma vírgula após a expressão intercalada." 
  }
];

export default {
  name: "Desafio 2 — Tarefa 3",
  intro: "Pontuação: enumeração e expressões intercaladas.",
  instruction: "Encontre 5 erros de pontuação e corrija.",
  raw: "O Natal é um tempo de benevolência perdão, generosidade, e alegria A única época em que homens e mulheres parecem de comum acordo abrir livremente seus corações.",
  rules: RULES
};
