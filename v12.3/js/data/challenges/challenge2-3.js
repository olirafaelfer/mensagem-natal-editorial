// Desafio 2 — Tarefa 3
// Regras: remover vírgulas indevidas + 2 palavras com ortografia.

const RULES = [
  {
    id: "d2t3_1",
    label: "Remover vírgula indevida",
    token: ",",
    clickTokenOnly: true,
    fast: true,
    wrong: "Natal, é",
    correct: "Natal é",
    labelWrong: ",",
    labelCorrect: "(remover)",
    hint: "Não se usa vírgula entre sujeito e verbo."
  },
  {
    id: "d2t3_2",
    label: "Ortografia",
    wrong: "\bgenerozidade\b",
    flags: "gi",
    correct: "generosidade",
    hint: "A escrita correta é com 's'."
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
    hint: "Não se separa por vírgula a expressão 'época em que'."
  },
  {
    id: "d2t3_4",
    label: "Remover vírgula indevida",
    token: ",",
    clickTokenOnly: true,
    fast: true,
    wrong: "parecem, de",
    correct: "parecem de",
    labelWrong: ",",
    labelCorrect: "(remover)",
    hint: "A vírgula não deve separar o verbo do complemento."
  },
  {
    id: "d2t3_5",
    label: "Ortografia",
    wrong: "\blivrimente\b",
    flags: "gi",
    correct: "livremente",
    hint: "A forma correta é 'livremente'."
  }
];

export default {
  id: "challenge2-3",
  title: "Atividade 3 — Difícil",
  difficulty: "Difícil",
  goal: "Remova as vírgulas indevidas e corrija duas palavras.",
  raw: "O Natal, é um tempo de benevolência, perdão, generozidade e alegria.
A única época, em que homens e mulheres parecem, de comum acordo abrir livrimente seus corações.",
  correctText: "O Natal é um tempo de benevolência, perdão, generosidade e alegria.
A única época em que homens e mulheres parecem de comum acordo abrir livremente seus corações.",
  rules: RULES
};
