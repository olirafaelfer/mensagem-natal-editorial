export const tutorialLevels = [
  {
    label: "Tutorial 1/3 — Ortografia",
    intro: "Clique no erro destacado e corrija.",
    text: "Neste Natal, a mesa terá refeissões deliciosas e muita alegria.",
    targets: [
      { id:"t1", wrong:"refeissões", correct:"refeições", reason:"O correto é “refeições”." }
    ],
    guide: { focusId:"t1", stepHint:false, stepAuto:false, stepMisclick:true }
  },
  {
    label: "Tutorial 2/3 — Dica",
    intro: "Agora clique direto em “Me dê uma dica” e veja a correção automática.",
    text: "O Natal, é um tempo de amor e esperança.",
    targets: [
      { id:"t2", wrong:",", correct:"", reason:"Vírgula indevida: não se separa sujeito e verbo." }
    ],
    guide: { focusId:null, stepHint:true, stepAuto:true, stepMisclick:false }
  },
  {
    label: "Tutorial 3/3 — Ação errada",
    intro: "Agora clique em uma palavra correta e confirme para ver a perda de pontos.",
    text: "Boas festas para todos e muita paz.",
    targets: [
      { id:"t3", wrong:"festas", correct:"festas", reason:"Aqui está tudo certo — o objetivo é mostrar a penalidade." }
    ],
    guide: { focusId:null, stepHint:false, stepAuto:false, stepMisclick:true }
  }
];