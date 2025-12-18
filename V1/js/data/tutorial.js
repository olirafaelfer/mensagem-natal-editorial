// V2/js/data/tutorial.js
// Tutorial em 4 etapas (não pontua no ranking).
// goal:
//  - correct: corrigir 1 erro manualmente (libera próxima quando corrigir certo)
//  - misclick: tentar corrigir algo certo (penaliza e libera próxima)
//  - hint: usar "Me dê uma dica" e aplicar correção automática (penaliza e libera próxima)
//  - skip: usar "Avançar sem concluir" (-5) (libera próxima)

export default [
  {
    id: "t1",
    title: "1) Corrija um erro simples",
    text: "Hoje é um dia especial. Vamos praticar: "refeiissões" está errado neste texto.",
    rules: [
      { id: "t1_ref", wrong: "\\brefeiissões\\b", correct: "refeições", explain: "Duplo 'i' não existe aqui." }
    ],
    goal: "correct",
    focus: { type: "rule", ruleId: "t1_ref" }
  },
  {
    id: "t2",
    title: "2) Erre de propósito (pra entender a penalidade)",
    text: "Agora clique em uma palavra que JÁ está correta, tente corrigir e veja a penalidade. Ex.: clique em "Natal".",
    rules: [],
    goal: "misclick",
    focus: { type: "plainWord", word: "Natal" }
  },
  {
    id: "t3",
    title: "3) Use a dica + correção automática",
    text: "Se você não souber a correção, use "Me dê uma dica". Aqui, corrija "caridadee" usando a opção automática.",
    rules: [
      { id: "t3_car", wrong: "\\bcaridadee\\b", correct: "caridade", explain: "Letra extra no final." }
    ],
    goal: "hint",
    focus: { type: "hintButton" }
  },
  {
    id: "t4",
    title: "4) Avance sem concluir",
    text: "Às vezes você prefere seguir. Clique em "Avançar sem concluir" (você perde 5 pontos).",
    rules: [],
    goal: "skip",
    focus: { type: "skipButton" }
  }
];
