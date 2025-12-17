// js/tutorial.js — Tutorial (dados guiados)
// 3 passos (demonstração, não teste):
// 1) Corrigir palavra errada (com alvo destacado)
// 2) Remover vírgula indevida (pontuação) — vírgula clicável
// 3) Mostrar penalidade ao clicar em trecho correto + mostrar Dica + correção automática

export function getTutorialLevels(){
  return [
    {
      name: "Tutorial 1/3 — Corrigir palavra",
      intro: `Bem-vindo! Vamos treinar rapidinho.
Clique no trecho incorreto e aplique a correção.`,
      instruction: `Clique no trecho destacado (refeissões) e corrija para “refeições”.`,
      raw: `Neste Natal, a mesa terá refeissões deliciosas e muita alegria.`,
      focusRuleId: "t1",
      rules: [
        {
          id: "t1",
          label: "Ortografia",
          wrong: /\brefeissões\b/g,
          correct: "refeições",
          reason: "Erro ortográfico. O correto é “refeições”."
        }
      ]
    },
    {
      name: "Tutorial 2/3 — Pontuação",
      intro: `Agora, um exemplo de pontuação.
Você vai remover uma vírgula indevida.`,
      instruction: `Clique na vírgula destacada após “Natal” e confirme para removê-la.`,
      raw: `O Natal, é um tempo de amor e esperança.`,
      focusRuleId: "t2",
      rules: [
        {
          id: "t2",
          label: "Pontuação",
          wrong: /,/g,
          correct: "",
          reason: "Vírgula indevida: não se separa sujeito e verbo."
        }
      ]
    },
    {
      name: "Tutorial 3/3 — Dica e clique equivocado",
      intro: `Agora veja dois comportamentos:
(1) clicar num trecho correto tira pontos;
(2) “Me dê uma dica” pode oferecer correção automática (com penalidade).`,
      instruction: `1) Clique na palavra “amor” (ela está correta) e confirme — você perderá pontos.
2) Depois clique em “Me dê uma dica” e escolha “Corrigir automaticamente” para ver como funciona.`,
      raw: `O Natal é um tempo de amor, carinho e solidariedade.`,
      focusPlain: "amor",
      // esta fase não exige correção para concluir — encerra quando você clicar em Próximo nível (sem pontuação do tutorial contar).
      allowAdvanceWithoutComplete: true,
      rules: []
    }
  ];
}
