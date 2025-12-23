// Desafio 2 — Tarefa 3
// Regras: SOMENTE remover pontuações indevidas.

export default {
  id: "d2-t3",
  name: "Tarefa 3 — Pontuação",
  intro: "Só remover: clique apenas na vírgula que estiver sobrando.",
  raw: "O Natal é um tempo, de benevolência, perdão, generosidade, e alegria. A única época, em que homens, e mulheres parecem, de comum acordo, abrir livremente, seus corações.",
  rules: [
    {
      id: "d2t3_1",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: "tempo, de",
      correct: "tempo de",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "Não se separa " + '"tempo"' + " de " + '"de benevolência"' + " com vírgula."
    },
    {
      id: "d2t3_2",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: "generosidade, e",
      correct: "generosidade e",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "Em geral, não se usa vírgula antes de " + '"e"' + " em enumeração simples."
    },
    {
      id: "d2t3_3",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: "época, em",
      correct: "época em",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "A vírgula não é necessária entre o substantivo e a oração iniciada por " + '"em que"' + "."
    },
    {
      id: "d2t3_4",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: "homens, e",
      correct: "homens e",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "Não se separa " + '"homens"' + " de " + '"e mulheres"' + " com vírgula."
    },
    {
      id: "d2t3_5",
      label: "Remover vírgula indevida",
      token: ",",
      clickTokenOnly: true,
      fast: true,
      wrong: "livremente, seus",
      correct: "livremente seus",
      labelWrong: ",",
      labelCorrect: "(remover)",
      hint: "Não se separa o advérbio do termo seguinte quando não há pausa necessária."
    }
  ]
};
