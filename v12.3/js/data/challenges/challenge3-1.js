// js/data/challenges/challenge3-1.js
// Desafio 3 — Tarefa 1 (erros difíceis: concordância/colocação pronominal etc.)

const RULES = [
  { id: "d3t1_1", label: "Concordância", wrong: "\\btodas idade\\b", flags: "gi", correct: "toda idade", hint: "Concordância entre determinante e substantivo." },
  { id: "d3t1_2", label: "Concordância", wrong: "\\bnovo alegria\\b", flags: "gi", correct: "nova alegria", hint: "Adjetivo no feminino." },
  { id: "d3t1_3", label: "Ortografia", wrong: "\\bmais nos dons\\b", flags: "gi", correct: "mas nos dons", hint: "Conjunção x advérbio." },
  { id: "d3t1_4", label: "Ortografia", wrong: "\\bFesteija\\b", flags: "g", correct: "Festeja", hint: "Grafia correta." },
  { id: "d3t1_5", label: "Concordância", wrong: "\\bpreconceitos vão\\b", flags: "gi", correct: "preconceitos vãos", hint: "Plural do adjetivo." },
  { id: "d3t1_6", label: "Colocação pronominal", wrong: "Jesus se dizendo", flags: "g", correct: "Jesus dizendo", hint: "O 'se' está sobrando." },
  { id: "d3t1_7", label: "Concordância", wrong: "\\bsomos irmão\\b", flags: "gi", correct: "somos irmãos", hint: "Plural obrigatório." }
];

export default {
  name: "Desafio 3 — Tarefa 1",
  intro: "Agora fica mais difícil: 7 correções.",
  instruction: "Encontre 7 erros (concordância/colocação pronominal etc.) e corrija.",
  raw: `O Natal em todas idade
é sempre novo alegria,
mais nos dons da caridade,
o Natal é todo dia.
Natal! Festeija esquecendo
quaisquer preconceitos vão…
Natal é Jesus se dizendo
que todos somos irmão.
(Chico Xavier)`,
correctText: `O Natal em toda idade
é sempre nova alegria,
mas nos dons da caridade,
o Natal é todo dia.
Natal! Festeja esquecendo
quaisquer preconceitos vãos…
Natal é Jesus dizendo
que todos somos irmãos.
(Chico Xavier)`,
  rules: RULES
};
