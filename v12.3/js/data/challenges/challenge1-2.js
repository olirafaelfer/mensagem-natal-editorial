export default {
  id: "1-2",
  title: "Desafio 1 • Tarefa 2",
  textWrong: `Que o nacimento de Jesus inspire voce a acreditar na forca dos novos ciclos, nas segundas chances e na luz que sempre volta a briliar.`,
  textCorrect: `Que o nascimento de Jesus inspire você a acreditar na força dos novos ciclos, nas segundas chances e na luz que sempre volta a brilhar.`,
  rules: [
    { type: "word", wrong: "nacimento", correct: "nascimento", hint: "Está faltando uma letra s." },
    { type: "word", wrong: "voce", correct: "você", hint: "Falta acento circunflexo." },
    { type: "word", wrong: "forca", correct: "força", hint: "Falta cedilha." },
    { type: "word", wrong: "briliar", correct: "brilhar", hint: "A escrita correta é com \"lh\", não com \"li\"." }
  ]
};
