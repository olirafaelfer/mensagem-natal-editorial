// js/data/tutorial.js — Tutorial guiado (conteúdo somente)
export function getTutorialLevels(){
  return [
    {
      name: "Tutorial 1/5 — Ortografia",
      intro: "Bem-vindo! Vamos aprender o básico da missão.",
      instruction: "Clique em “refeissões” (destacado) e corrija para “refeições”.",
      raw: "Neste Natal, a mesa terá refeissões deliciosas e muita alegria.",
      focusRuleId: "t1",
      hintEnabled: false,
      rules: [
        { id:"t1", label:"Ortografia", wrong:/\brefeissões\b/g, correct:"refeições", reason:"O correto é “refeições”." }
      ]
    },
    {
      name: "Tutorial 2/5 — Pontuação",
      intro: "Agora vamos remover uma vírgula indevida.",
      instruction: "Clique na vírgula destacada e remova-a.",
      raw: "Que o seu Natal seja de paz, alegria, e união.",
      focusRuleId: "t2",
      hintEnabled: false,
      rules: [
        { id:"t2", label:"Pontuação", wrong:/,/g, correct:"", reason:"Aqui a vírgula não é necessária." }
      ]
    },
    {
      name: "Tutorial 3/5 — Dica e correção automática",
      tutorialMode: "force-auto",
      intro: "Quando bater dúvida, use a dica — e aprenda a correção automática.",
      instruction: "Clique em “Me dê uma cola!” (dedinho) e aplique a correção automática.",
      raw: "No Natal, praticar caridadee e compaixão transforma o dia de alguém.",
      focusHintBtn: true,
      hintEnabled: true,
      rules: [
        { id:"t3", label:"Dica", wrong:/\bcaridadee\b/g, correct:"caridade", reason:"O correto é “caridade”." }
      ]
    },
    {
      name: "Tutorial 4/5 — Clique errado (penalidade)",
      tutorialMode: "force-misclick",
      intro: "Se você tentar corrigir algo que já está certo, perde pontos.",
      instruction: "Clique na palavra “alegria” (ela já está certa) para ver a penalidade.",
      raw: "Que o seu Natal seja de paz, alegria e união.",
      focusMisclickWord: "alegria",
      hintEnabled: false,
      rules: [
        // Esta regra existe só para tornar a palavra clicável no tutorial
        { id:"t4", label:"Treino", wrong:/\balegria\b/g, correct:"alegria", reason:"A palavra já estava correta." }
      ]
    },
    {
      name: "Tutorial 5/5 — Avançar sem concluir (-5)",
      tutorialMode: "force-skip",
      allowSkipInTutorial: true,
      intro: "Às vezes você pode avançar sem concluir, mas perde pontos.",
      instruction: "Clique em “Avançar sem concluir (-5)” para entender a penalidade.",
      raw: "Você pode pular uma tarefa, mas terá um custo.",
      hintEnabled: false,
      rules: []
    }
  ];
}
