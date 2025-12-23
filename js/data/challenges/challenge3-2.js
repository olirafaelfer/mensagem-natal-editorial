// js/data/challenges/challenge3-2.js
// Desafio 3 — Tarefa 2 (erros difíceis: concordância/colocação pronominal)

const RULES = [
  { id: "d3t2_1", label: "Concordância", wrong: "Ele vêm", flags: "g", correct: "Ele vem", hint: "Verbo no singular." },
  { id: "d3t2_2", label: "Concordância", wrong: "virão", flags: "g", correct: "virá", hint: "Concordância verbal." },
  { id: "d3t2_3", label: "Concordância", wrong: "Natal vem", flags: "g", correct: "Natal vêm", hint: "O sujeito está no plural." },
  { id: "d3t2_4", label: "Concordância", wrong: "Essas recordação", flags: "g", correct: "Essas recordações", hint: "Plural." },
  { id: "d3t2_5", label: "Pronomes e conjugação", wrong: "mães se agarramos", flags: "g", correct: "mães se agarram", hint: "O pronome correto é 'nos'." },
  { id: "d3t2_6", label: "Concordância", wrong: "secreto", flags: "g", correct: "secretos", hint: "Plural." },
  { id: "d3t2_7", label: "Concordância", wrong: "seus coração", flags: "g", correct: "seu coração", hint: "Possessivo no singular." }
];

export default {
  name: "Desafio 3 — Tarefa 2",
  intro: "Texto reflexivo com correções bem sutis (7).",
  instruction: "Encontre 7 erros (concordância/colocação pronominal) e corrija.",
  raw: `Ele vêm em cada ano e virão para sempre. E com o Natal vem as recordações e os costumes. Essas recordação cotidianas humildes às quais todas as mães se agarramos. Como a Virgem Maria, nos rincões secreto de seus coração.
(Marjorie Holmes)`,
correctText: `Ele vem em cada ano e virá para sempre. E com o Natal vêm as recordações e os costumes. Essas recordações cotidianas humildes às quais todas as mães se agarram. Como a Virgem Maria, nos rincões secretos de seu coração.
(Marjorie Holmes)`,
  rules: RULES
};
