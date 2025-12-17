// js/tutorial.js — Tutorial (dados)
// 3 passos guiados (demonstração, não teste):
// 1) Corrigir palavra errada
// 2) Remover vírgula indevida (pontuação)
// 3) Clique em trecho correto (penalidade) + uso de dica

export function getTutorialLevels(){
  return [
    {
      name: "Tutorial 1/3 — Corrigir palavra",
      intro: `Bem-vindo! Vamos treinar rapidinho.
Clique no trecho incorreto e aplique a correção sugerida.`,
      instruction: `Objetivo: corrigir uma palavra errada. Dica: procure “refeissões”.`,
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
      instruction: `Objetivo: clique na vírgula após “Natal” para removê-la.`,
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
      name: "Tutorial 3/3 — Cuidado com o clique",
      intro: `Por fim, veja o que acontece ao tentar corrigir algo que já está certo.
Isso custa pontos.`,
      instruction: `Objetivo: clique em um trecho correto (por exemplo, “amor”) e confirme — você verá a penalidade. Depois, use o botão “Me dê uma dica” para ver a opção de correção automática.`,
      raw: `O Natal é um tempo de amor, carinho e solidariedade.`,
      // não dá para isolar “amor” como token no motor atual (sem word-tokenizer),
      // então apenas destacamos a palavra no texto de instrução.
      rules: [
        {
          id: "t3a",
          label: "Acentuação (exemplo)",
          wrong: /\bsolidariedade\b/g,
          correct: "solidariedade",
          reason: "Aqui é só um exemplo: esta palavra já está correta."
        }
      ]
    }
  ];
}
