// js/tutorial.js — conteúdo do tutorial (dados + textos)
// Mantém o tutorial fora do motor para reduzir riscos de regressão.

export function getTutorialLevels() {
  return [
    {
      name: "Tutorial — 1/3",
      intro: "Bem-vindo(a)! Vamos treinar rapidinho a dinâmica do jogo.",
      instruction: "Clique no trecho INCORRETO e confirme. Depois corrija conforme pedido.",
      raw: "Neste Natal, a alegria esta em pequenos gestos, de amor ao próximo.",
      rules: [
        { id: "t1", label: "Acentuação", wrong: /\besta\b/g, correct: "está", reason: "Aqui é verbo (estar): 'está' leva acento." }
      ]
    },
    {
      name: "Tutorial — 2/3",
      intro: "Agora um caso de pontuação.",
      instruction: "Procure o trecho que precisa ser removido.",
      raw: "Que a sua noite seja, cheia de paz e esperança.",
      rules: [
        { id: "t2", label: "Pontuação", wrong: /(?<=se),/g, correct: "", reason: "Vírgula indevida separando verbo e complemento." }
      ]
    },
    {
      name: "Tutorial — 3/3",
      intro: "Por fim, um erro ortográfico.",
      instruction: "Clique no trecho incorreto e digite a correção.",
      raw: "Desejamos um Natal com muita caridade e fraternidade, para todos.",
      rules: [
        { id: "t3", label: "Ortografia", wrong: /\bfraternidade,\b/g, correct: "fraternidade", reason: "A vírgula aqui é desnecessária." }
      ]
    }
  ];
}
