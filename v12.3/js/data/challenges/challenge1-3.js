// js/data/challenges/challenge1-3.js
// Desafio 1 — Tarefa 3

const RULES = [
  {
    id: "d1t3_1",
    label: "Ortografia",
    wrong: "\\babencoe\\b",
    flags: "gi",
    correct: "abençoe",
    hint: "Falta cedilha."
  },
  {
    id: "d1t3_2",
    label: "Acentuação",
    wrong: "\\bvoce\\b",
    flags: "gi",
    correct: "você",
    hint: "Falta acento circunflexo."
  },
  {
    id: "d1t3_3",
    label: "Acentuação",
    wrong: "\\bfamilia\\b",
    flags: "gi",
    correct: "família",
    hint: "Falta acento agudo no \"i\"."
  },
  {
    id: "d1t3_4",
    label: "Acentuação",
    wrong: "\\brenóve\\b",
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
  raw: "O Natal é o momento de renascimento e de novos começos. Que a luz desta data especial ilumine seus caminhos e abencoe voce e sua familia. Que a luz desta data especial ilumine seus caminhos e renóve suas forças para enfrentar os desafios do amanhã.",
  correctText: "O Natal é o momento de renascimento e de novos começos. Que a luz desta data especial ilumine seus caminhos e abençoe você e sua família. Que a luz desta data especial ilumine seus caminhos e renove suas forças para enfrentar os desafios do amanhã.",
  rules: RULES
};
