// js/data/tutorial.js — Tutorial guiado (conteúdo somente)
export function getTutorialLevels(){
  return [
    {
      name: "Tutorial 1/3 — Ortografia",
      intro: "Vamos começar! Você vai corrigir uma palavra com erro de grafia.",
      instruction: "Clique em “refeissões” (destacado) e corrija para “refeições”.",
      raw: "Neste Natal, a mesa terá refeissões deliciosas e muita alegria.",
      focusRuleId: "t1",
      rules: [
        { id:"t1", label:"Ortografia", wrong:/\brefeissões\b/g, correct:"refeições", reason:"O correto é “refeições”." }
      ]
    },
    {
      name: "Tutorial 2/3 — Pontuação",
      intro: "Agora uma vírgula indevida. Você vai removê-la.",
      instruction: "Clique na vírgula destacada após “Natal” para removê-la. Depois veja que o botão Próxima libera.",
      raw: "O Natal, é um tempo de amor e esperança.",
      focusRuleId: "t2",
      rules: [
        { id:"t2", label:"Pontuação", wrong:/,/g, correct:"", reason:"Vírgula indevida: não se separa sujeito e verbo." }
      ]
    },
    {
      name: "Tutorial 3/3 — Dica e correção automática",
      tutorialMode: "force-auto",
      intro: "Agora você vai ver a dica e a correção automática em ação.",
      instruction: "Clique direto em “Me dê uma dica” e escolha “Correção automática”. Depois, clique em “Natal” (palavra correta) e confirme para ver a penalidade por tentar corrigir algo certo.",
      raw: "Neste Natal, pratique a caridadee e o amor ao próximo.",
      focusRuleId: "t3",
      rules: [
        { id:"t3", label:"Ortografia", wrong:/\bcaridadee\b/g, correct:"caridade", reason:"O correto é “caridade”." }
      ]
    }
  ];
}
