// js/tutorial.js — tutorial guiado (dados)
// Objetivo: demonstrar a dinâmica (não é para “testar” conhecimento).

export function getTutorialLevels(){
  return [
    {
      name: "Tutorial 1/3 — Correção",
      intro: "Vamos começar! Clique no trecho destacado e corrija.",
      instruction: "Clique em “refeissões” e corrija para “refeições”.",
      raw: "Neste Natal, a mesa terá refeissões deliciosas e muita alegria.",
      focusRuleId: "t1",
      rules: [
        { id:"t1", label:"Ortografia", wrong:/\brefeissões\b/g, correct:"refeições", reason:"O correto é “refeições”." }
      ]
    },
    {
      name: "Tutorial 2/3 — Pontuação",
      intro: "Agora uma vírgula indevida. Você vai removê-la.",
      instruction: "Clique na vírgula destacada após “Natal” para removê-la.",
      raw: "O Natal, é um tempo de amor e esperança.",
      focusRuleId: "t2",
      rules: [
        { id:"t2", label:"Pontuação", wrong:/,/g, correct:"", reason:"Vírgula indevida: não se separa sujeito e verbo." }
      ]
    },
    {
      name: "Tutorial 3/3 — Clique equivocado + dica",
      intro: "Por fim: clicar em trecho correto também penaliza. Depois, use “Me dê uma dica” e veja a correção automática.",
      instruction: "Clique em “amor” (está correto) e confirme para ver a penalidade. Depois clique em “Me dê uma dica”.",
      raw: "O Natal é um tempo de amor, carinho e solidariedade.",
      focusPlain: "amor",
      allowAdvanceWithoutComplete: true,
      rules: []
    }
  ];
}
