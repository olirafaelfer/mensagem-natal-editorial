// js/data/challenges/challenge3-3.js
// Desafio 3 — Tarefa 3 (erros difíceis: concordância/colocação pronominal etc.)

const RULES = [
  { id: "d3t3_1", label: "Concordância", wrong: "Para isso fomos feito:", flags: "g", correct: "Para isso fomos feitos:", hint: "Plural." },
  { id: "d3t3_2", label: "Concordância", wrong: "ser lembrado", flags: "g", correct: "ser lembrados", hint: "Plural." },
  { id: "d3t3_3", label: "Concordância", wrong: "fazer chora", flags: "g", correct: "fazer chorar", hint: "Forma verbal." },
  { id: "d3t3_4", label: "Concordância", wrong: "braços longo", flags: "g", correct: "braços longos", hint: "Adjetivo no plural." },
  { id: "d3t3_5", label: "Colocação pronominal", wrong: "Uma estrela se apagar", flags: "g", correct: "Uma estrela a se apagar", hint: "Falta um 'a'." },
  { id: "d3t3_6", label: "Crase", wrong: "Hoje a noite", flags: "g", correct: "Hoje à noite", hint: "Crase: 'à noite'." },
  { id: "d3t3_7", label: "Pontuação", wrong: "De repente nunca, mais", flags: "g", correct: "De repente, nunca mais", hint: "Vírgula após expressão adverbial." }
];

export default {
  name: "Desafio 3 — Tarefa 3",
  intro: "Texto longo com 7 correções (bem difíceis).",
  instruction: "Encontre 7 erros (concordância/colocação pronominal etc.) e corrija.",
  raw: `Para isso fomos feito:
Para lembrar e ser lembrado
Para chorar e fazer chora
Para enterrar os nossos mortos —
Por isso temos braços longo para os adeuses
Mãos para colher o que foi dado
Dedos para cavar a terra.

Assim será nossa vida:
Uma tarde sempre a esquecer
Uma estrela se apagar na treva
Um caminho entre dois túmulos —
Por isso precisamos velar
Falar baixo, pisar leve, ver
A noite dormir em silêncio.

Não há muito o que dizer:
Uma canção sobre um berço
Um verso, talvez de amor
Uma prece por quem se vai —
Mas que essa hora não esqueça
E por ela os nossos corações
Se deixem, graves e simples.

Pois para isso fomos feitos:
Para a esperança no milagre
Para a participação da poesia
Para ver a face da morte —
De repente nunca, mais esperaremos...
Hoje a noite é jovem; da morte, apenas
Nascemos, imensamente.
Vinicius de Moraes`,
correctText: `Para isso fomos feitos:
Para lembrar e ser lembrados
Para chorar e fazer chorar
Para enterrar os nossos mortos —
Por isso temos braços longos para os adeuses
Mãos para colher o que foi dado
Dedos para cavar a terra.

Assim será nossa vida:
Uma tarde sempre a esquecer
Uma estrela a se apagar na treva
Um caminho entre dois túmulos —
Por isso precisamos velar
Falar baixo, pisar leve, ver
A noite dormir em silêncio.

Não há muito o que dizer:
Uma canção sobre um berço
Um verso, talvez de amor
Uma prece por quem se vai —
Mas que essa hora não esqueça
E por ela os nossos corações
Se deixem, graves e simples.

Pois para isso fomos feitos:
Para a esperança no milagre
Para a participação da poesia
Para ver a face da morte —
De repente, nunca mais esperaremos...
Hoje à noite é jovem; da morte, apenas
Nascemos, imensamente.
Vinicius de Moraes`,
  rules: RULES
};
