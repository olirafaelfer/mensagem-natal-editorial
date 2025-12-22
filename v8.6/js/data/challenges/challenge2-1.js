// js/data/challenges/challenge2-1.js
// Desafio 2 — Tarefa 1 (erros de pontuação: 5)

const RULES = [
  {
    id: "d2t1_1",
    label: "Vírgula",
    wrong: "novas metas de",
    flags: "g",
    correct: "novas metas, de",
    hint: "Falta uma vírgula." 
  },
  {
    id: "d2t1_2",
    label: "Vírgula indevida",
    wrong: "ações, e aproveitar",
    flags: "g",
    correct: "ações e aproveitar",
    hint: "Não se usa vírgula antes de 'e' neste caso." 
  },
  {
    id: "d2t1_3",
    label: "Ponto",
    wrong: "oportunidades Que",
    flags: "g",
    correct: "oportunidades. Que",
    hint: "Duas frases precisam ser separadas." 
  },
  {
    id: "d2t1_4",
    label: "Vírgula",
    wrong: "boas energias saúde",
    flags: "g",
    correct: "boas energias, saúde",
    hint: "Enumeração pede vírgula." 
  },
  {
    id: "d2t1_5",
    label: "Vírgula indevida",
    wrong: "saúde, e amor",
    flags: "g",
    correct: "saúde e amor",
    hint: "Vírgula antes de 'e' não é necessária aqui." 
  }
];

export default {
  name: "Desafio 2 — Tarefa 1",
  intro: "Pontuação mais chata: atenção às vírgulas e aos pontos.",
  instruction: "Encontre 5 erros de pontuação e corrija.",
  raw: "É tempo de traçar novas metas de transformar desejos em ações, e aproveitar as novas oportunidades Que esse Natal venha cheio de boas energias saúde, e amor. Feliz Natal e Boas Festas!",
  rules: RULES
};
