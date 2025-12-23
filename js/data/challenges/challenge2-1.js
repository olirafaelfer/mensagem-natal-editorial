// Desafio 2 — Tarefa 1
// Regras: SOMENTE remover pontuações indevidas (sem inserir nada).

export default {
  punctuationOnly: true,
  id: "d2-t1",
  name: "Desafio 2 — Tarefa 1",
  intro: "Aqui você só precisa REMOVER pontuações indevidas. Clique apenas na vírgula que estiver sobrando.",
  // Observação: a vírgula após \"metas\" é considerada correta nesta tarefa.
  raw: "É tempo de traçar, novas metas, de transformar desejos, em ações, e aproveitar, as novas oportunidades. Que este Natal venha, cheio de boas energias, saúde e amor. Feliz Natal e Boas Festas!",
  rules: [
    {
      id: "d2t1_1",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: "traçar, novas",
      correct: "traçar novas",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "Não se separa o verbo do complemento com vírgula aqui."
    },
    {
      id: "d2t1_2",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: "desejos, em",
      correct: "desejos em",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "A vírgula não deve separar o termo do seu complemento imediato."
    },
    {
      id: "d2t1_3",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: "ações, e",
      correct: "ações e",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "A vírgula antes de 'e' geralmente é indevida em enumeração simples."
    },
    {
      id: "d2t1_4",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: "aproveitar, as",
      correct: "aproveitar as",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "Não se separa o verbo do objeto direto com vírgula."
    },
    {
      id: "d2t1_5",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: "venha, cheio",
      correct: "venha cheio",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "A vírgula separa indevidamente o verbo do predicativo/adjunto."
    }
  ]
};
