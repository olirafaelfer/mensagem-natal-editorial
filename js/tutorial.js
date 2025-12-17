// js/tutorial.js — conteúdo do tutorial (dados + textos)
// Mantém o tutorial fora do motor para reduzir riscos de regressão.
//
// Observação: o motor usa `raw` + `rules`.
// Para tornar o tutorial interativo, cada nível pode declarar `focusRuleId`
// para o motor destacar o trecho que deve ser clicado.

export function getTutorialLevels() {
  return [
    {
      name: "Tutorial — 1/3",
      intro: `Bem-vindo(a)! Vamos treinar rapidinho a dinâmica do jogo.\n\nNeste tutorial, a pontuação NÃO será contabilizada no ranking.`,
      instruction: "Passo 1: clique no trecho INCORRETO (ele vai piscar) e confirme. Depois, digite a correção.",
      raw: "Neste Natal, desejamos muita refeissões e alegria para todos.",
      focusRuleId: "t1",
      rules: [
        {
          id: "t1",
          label: "Ortografia",
          wrong: /\brefeissões\b/g,
          correct: "refeições",
          reason: "Erro ortográfico. A forma correta é 'refeições'."
        }
      ]
    },
    {
      name: "Tutorial — 2/3",
      intro: `Agora vamos ver pontuação.\n\nDica: você pode tocar em qualquer trecho, mas só deve corrigir o que está errado.`,
      instruction: "Passo 2: clique na VÍRGULA piscando para removê-la.",
      raw: "O Natal, é um tempo de amor e esperança.",
      focusRuleId: "t2",
      rules: [
        {
          id: "t2",
          label: "Pontuação",
          // ⚠️ Captura a vírgula como token clicável (1 caractere)
          wrong: /,/g,
          correct: "",
          reason: "Vírgula indevida entre sujeito e verbo."
        }
      ]
    },
    {
      name: "Tutorial — 3/3",
      intro: `Último passo: vamos entender o que acontece quando você tenta corrigir algo que já está certo.`,
      instruction: "Passo 3: clique na palavra 'amor' (ela está correta) e confirme — só para ver a penalidade.",
      raw: "Que o Natal seja cheio de amor e paz.",
      focusPlain: "amor",
      rules: []
    }
  ];
}
