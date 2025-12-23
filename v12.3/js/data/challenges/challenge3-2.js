// js/data/challenges/challenge3-2.js
// Desafio 3 — Tarefa 2 (erros difíceis: concordância/colocação pronominal)

const RULES = [
  { id: "d3t2_1", label: "Concordância", wrong: "Vêm em cada ano", flags: "g", correct: "Vem em cada ano", hint: "Verbo no singular." },
  { id: "d3t2_2", label: "Concordância", wrong: "virão para sempre", flags: "g", correct: "virá para sempre", hint: "Concordância verbal." },
  { id: "d3t2_3", label: "Concordância", wrong: "Natal vem as recordações", flags: "g", correct: "Natal vêm as recordações", hint: "O sujeito está no plural." },
  { id: "d3t2_4", label: "Concordância", wrong: "Essas recordação", flags: "g", correct: "Essas recordações", hint: "Plural." },
  { id: "d3t2_5", label: "Colocação pronominal", wrong: "mães se agarramos", flags: "g", correct: "mães nos agarramos", hint: "O pronome correto é 'nos'." },
  { id: "d3t2_6", label: "Concordância", wrong: "rincões secreto", flags: "g", correct: "rincões secretos", hint: "Plural." },
  { id: "d3t2_7", label: "Concordância", wrong: "seus coração", flags: "g", correct: "seu coração", hint: "Possessivo no singular." }
];

export default {
  name: "Desafio 3 — Tarefa 2",
  intro: "Texto reflexivo com correções bem sutis (7).",
  instruction: "Encontre 7 erros (concordância/colocação pronominal) e corrija.",
  raw: `Vêm em cada ano e virão para sempre. E com o Natal vem as recordações e os costumes. Essas recordação cotidianas humildes aos que todas as mães se agarramos. Como a Virgem Maria, nos rincões secreto de seus coração.
(Marjorie Holmes)`,
  rules: RULES
};
