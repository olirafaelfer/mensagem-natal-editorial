// js/tutorial.js — tutorial guiado (demonstração, não teste)
export function getTutorialLevels(){
  return [
    {
      name: "Tutorial 1/3 — Corrigir palavra",
      intro: "Bem-vindo! Vamos treinar rapidinho.",
      instruction: "Clique no trecho destacado e corrija para “refeições”.",
      raw: "Neste Natal, a mesa terá refeissões deliciosas e muita alegria.",
      focusRuleId: "t1",
      rules: [
        { id:"t1", label:"Ortografia", wrong:/\brefeissões\b/g, correct:"refeições", reason:"Erro ortográfico. O correto é “refeições”." }
      ]
    },
    {
      name: "Tutorial 2/3 — Pontuação",
      intro: "Agora um exemplo de pontuação: remover vírgula indevida.",
      instruction: "Clique na vírgula destacada após “Natal” para removê-la.",
      raw: "O Natal, é um tempo de amor e esperança.",
      focusRuleId: "t2",
      rules: [
        { id:"t2", label:"Pontuação", wrong:/,/g, correct:"", reason:"Vírgula indevida: não se separa sujeito e verbo." }
      ]
    },
    {
      name: "Tutorial 3/3 — Dica e clique equivocado",
      intro: "Agora veja: clicar em algo certo tira pontos. E a Dica pode oferecer correção automática (com penalidade).",
      instruction: "1) Clique na palavra destacada (amor) — ela está correta — e confirme.
2) Depois clique em “Me dê uma dica” e use “Corrigir automaticamente”.
3) Por fim, clique em “Avançar sem concluir (-5)” para terminar o tutorial.",
      raw: "O Natal é um tempo de amor, carinho e solidariedade.",
      focusPlain: "amor",
      allowAdvanceWithoutComplete: true,
      rules: []
    }
  ];
}
