// js/data/challenges/challenge1-3.js
// Desafio 1 — Tarefa 3

const RULES = [
  {
    id: "d1t3_1",
    label: "Ortografia",
    wrong: "abencoe",
    flags: "gi",
    correct: "abençoe",
    hint: "Falta cedilha."
  },
  {
    id: "d1t3_2",
    label: "Acentuação",
    wrong: "voce",
    flags: "gi",
    correct: "você",
    hint: "Falta acento circunflexo."
  },
  {
    id: "d1t3_3",
    label: "Acentuação",
    wrong: "familia",
    flags: "gi",
    correct: "família",
    hint: "Falta acento agudo no \"i\"."
  },
  {
    id: "d1t3_4",
    label: "Acentuação",
    wrong: "renóve",
    flags: "gi",
    correct: "renove",
    hint: "Não tem acento agudo no \"o\"."
  }
];

export default {
  id: "challenge1-3",
  name: "Desafio 1 — Tarefa 3",
  difficulty: "Difícil",
  goal: "Encontre os erros no texto e corrija.",
  raw: "O Natal é o momento de renascimento e de novos começos. Que a luz desta data especial ilumine seus caminhos e abencoe voce e sua familia. Desejamos que você renóve suas forças para enfrentar os desafios do amanhã.",
  correctText: "O Natal é o momento de renascimento e de novos começos. Que a luz desta data especial ilumine seus caminhos e abençoe você e sua família. Desejamos que você renove suas forças para enfrentar os desafios do amanhã.",
  rules: RULES
};
