// js/tutorial.js — conteúdo do tutorial (dados + textos)
// Mantém o tutorial fora do motor para reduzir riscos de regressão.

export function getTutorialLevels() {
  return [
    {
      name: "Tutorial — 1/3",
      intro:
        "Bem-vindo(a)! Aqui você vai aprender a dinâmica: clicar no trecho, confirmar e corrigir.",
      instruction:
        "Clique na palavra destacada e confirme. Depois, digite a correção.",
      raw: "Neste Natal, a alegria esta em pequenos gestos, de amor ao próximo.",
      focusRuleId: "t1",
      rules: [
        {
          id: "t1",
          label: "Acentuação",
          wrong: /\besta\b/g,
          correct: "está",
          reason:
            "Aqui é o verbo 'estar' (3ª pessoa): a forma correta é 'está' (com acento).",
        },
      ],
    },
    {
      name: "Tutorial — 2/3",
      intro:
        "Agora um exemplo de pontuação: vamos remover uma vírgula indevida.",
      instruction:
        "Clique na vírgula destacada e confirme que deseja removê-la.",
      raw: "Que a sua noite seja, cheia de paz e esperança.",
      focusRuleId: "t2",
      rules: [
        {
          id: "t2",
          label: "Pontuação",
          // vírgula depois de 'seja'
          wrong: /(?<=\bseja),/g,
          correct: "",
          reason:
            "A vírgula separa indevidamente o verbo do complemento. Aqui, o ideal é remover.",
        },
      ],
    },
    {
      name: "Tutorial — 3/3",
      intro:
        "Por fim, vamos ver o comportamento ao clicar em uma palavra que já está correta.",
      instruction:
        "Clique na palavra 'Natal' (que está correta) para ver a penalidade por tentativa indevida.",
      raw: "Desejamos um Natal com muita caridade e fraternidade para todos.",
      focusPlain: "Natal",
      rules: [],
      endNote:
        "Fim do tutorial! A pontuação do tutorial não entra no ranking. Agora, bora para a missão!",
    },
  ];
}
