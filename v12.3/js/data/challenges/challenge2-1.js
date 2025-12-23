// Desafio 2 — Tarefa 1
// Regras: SOMENTE remover pontuações indevidas (sem inserir nada).

export default {
  punctuationOnly: true,
  id: "d2-t1",
  name: "Tarefa 1 — Pontuação",
  intro: "Nesta tarefa, só existe um tipo de correção: REMOVER pontuações indevidas (principalmente vírgulas). Clique apenas na pontuação para removê-la.",
  // Texto com vírgulas indevidas inseridas (5 erros)
  raw: "É tempo de traçar, novas metas, de transformar desejos em ações, e aproveitar, as novas oportunidades. Que esse Natal venha, cheio de boas energias, saúde e amor. Feliz Natal e Boas Festas!",
  rules: [
    {
      id: "d2t1_1",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: ", novas",
      correct: " novas",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "Após o verbo \"traçar\", não há pausa obrigatória aqui."
    },
    {
      id: "d2t1_2",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: " metas, de",
      correct: " metas de",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "Não se separa o termo \"metas\" do complemento \"de transformar...\"."
    },
    {
      id: "d2t1_3",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: " ações, e",
      correct: " ações e",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "Em geral, não se usa vírgula antes de \"e\" em enumeração simples."
    },
    {
      id: "d2t1_4",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: " aproveitar, as",
      correct: " aproveitar as",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "Não se separa o verbo do seu complemento direto."
    },
    {
      id: "d2t1_5",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: " venha, cheio",
      correct: " venha cheio",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "A vírgula aqui quebra a ligação natural entre o verbo e o predicativo."
    }
  ]
};
