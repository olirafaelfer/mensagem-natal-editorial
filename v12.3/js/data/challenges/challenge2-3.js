export default {
  id: "2-3",
  title: "Desafio 2 • Tarefa 3",
  textWrong: `O Natal, é um tempo de benevolência, perdão, generozidade e alegria.
A única época, em que homens e mulheres parecem, de comum acordo abrir livrimente seus corações.`,
  textCorrect: `O Natal é um tempo de benevolência, perdão, generosidade e alegria.
A única época em que homens e mulheres parecem de comum acordo abrir livremente seus corações.`,
  rules: [
    { type: "comma", wrong: "Natal,", correct: "Natal", hint: "Não se separa o sujeito do predicado." },
    { type: "word",  wrong: "generozidade", correct: "generosidade", hint: "A palavra correta é escrita com “s”." },
    { type: "comma", wrong: "época,", correct: "época", hint: "Não se separa o núcleo da oração." },
    { type: "comma", wrong: "parecem,", correct: "parecem", hint: "Não se separa o verbo do complemento." },
    { type: "word",  wrong: "livrimente", correct: "livremente", hint: "A escrita correta é com “e”." }
  ]
};
