export default {
  id: "1-1",
  title: "Desafio 1 • Tarefa 1",
  textWrong: `Que o espirito do Natal renovee sua alma e traga um recomeco repleto de paz e esperança.`,
  textCorrect: `Que o espírito do Natal renove sua alma e traga um recomeço repleto de paz e esperança.`,
  rules: [
    { type: "word", wrong: "espirito", correct: "espírito", hint: "Falta acento agudo na letra \"i\"." },
    { type: "word", wrong: "renovee", correct: "renove", hint: "Tem uma letra \"e\" a mais." },
    { type: "word", wrong: "recomeco", correct: "recomeço", hint: "Falta cedilha." }
  ]
};
