export default {
  id: "1-3",
  title: "Desafio 1 • Tarefa 3",
  textWrong: `O Natal é o momento de renascimento e de novos começos. Que a luz desta data especial ilumine seus caminhos e renóve suas forças para enfrentar os desafios do amanhã. Que Deus abencoe voce e sua familia.`,
  textCorrect: `O Natal é o momento de renascimento e de novos começos. Que a luz desta data especial ilumine seus caminhos e renove suas forças para enfrentar os desafios do amanhã. Que Deus abençoe você e sua família.`,
  rules: [
    { type: "word", wrong: "abencoe", correct: "abençoe", hint: "Falta cedilha." },
    { type: "word", wrong: "voce", correct: "você", hint: "Falta acento circunflexo." },
    { type: "word", wrong: "familia", correct: "família", hint: "Falta acento agudo no \"i\"." },
    { type: "word", wrong: "renóve", correct: "renove", hint: "Não tem acento agudo no \"o\"." }
  ]
};
