// Desafio 2 — Tarefa 2
// Regras: SOMENTE remover pontuações indevidas (sem inserir nada).

export default {
  punctuationOnly: true,
  id: "d2-t2",
  name: "Tarefa 2 — Pontuação",
  intro: "Aqui você só precisa REMOVER pontuações indevidas. Clique apenas na vírgula que estiver sobrando.",
  raw: "Façamos de nossa vida, uma extensão da noite, de Natal, renascendo continuamente, em amor, e fraternidade. Natal, noite de alegria, canções, festejos, bonança. Que seu coração floresça, em amor e esperança!",
  rules: [
    {
      id: "d2t2_1",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: "vida, uma",
      correct: "vida uma",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "Não se separa o sujeito/complemento direto com vírgula aqui."
    },
    {
      id: "d2t2_2",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: "noite, de",
      correct: "noite de",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "A vírgula quebra a locução " + '"noite de Natal"' + "."
    },
    {
      id: "d2t2_3",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: "continuamente, em",
      correct: "continuamente em",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "Não há necessidade de pausa entre o advérbio e o complemento."
    },
    {
      id: "d2t2_4",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: "amor, e",
      correct: "amor e",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "Em enumeração simples, a vírgula antes de " + '"e"' + " geralmente é indevida."
    },
    {
      id: "d2t2_5",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: "floresça, em",
      correct: "floresça em",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "A vírgula separa o verbo do seu complemento."
    }
  ]
};
