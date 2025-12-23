// js/data/challenges/challenge3-2.js
// Desafio 3 — Tarefa 2 (erros difíceis: concordância/colocação pronominal)

const RULES = [
  { id: "d3t2_1", label: "Concordância", wrong: "Vêm", flags: "g", correct: "Vem", hint: "Verbo vir no singular." },
  { id: "d3t2_2", label: "Concordância", wrong: "virão", flags: "g", correct: "virá, hint: "Verbo vir no singular e tempo verbal futuro." },
  { id: "d3t2_3", label: "Concordância", wrong: "vem a", flags: "g", correct: "vêm a", hint: "Verbo vir precisa concordar com o sujeito posposto no plural, juntamente com o artigo." },
  { id: "d3t2_4", label: "Concordância", wrong: "Essas recordação", flags: "g", correct: "Essas recordações", hint: "Uma palavra precisa estar no plural." },
  { id: "d3t2_5", label: "Colocação pronominal", wrong: "aos que", flags: "g", correct: "às quais", hint: "O pronome correto é 'nos'." },
  { id: "d3t2_6", label: "Concordância", wrong: "se agarramos", flags: "g", correct: "se agarram", hint: "Plural." },
  { id: "d3t2_7", label: "Concordância", wrong: "seus coração", flags: "g", correct: "seu coração", hint: "Possessivo no singular." }
];

export default {
  name: "Desafio 3 — Tarefa 2",
  intro: "Texto reflexivo com correções bem sutis (7).",
  instruction: "Encontre 7 erros (concordância/colocação pronominal) e corrija.",
  raw: `Vêm em cada ano e virão para sempre. E com o Natal vem as recordações e os costumes. Essas recordação cotidianas humildes aos que todas as mães se agarramos. Como a Virgem Maria, nos rincões secretos de seus coração.
(Marjorie Holmes)`,
  rules: RULES
};
