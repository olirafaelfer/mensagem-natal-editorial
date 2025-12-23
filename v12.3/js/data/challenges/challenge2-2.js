export default {
  id: "2-2",
  title: "Desafio 2 • Tarefa 2",
  textWrong: `Façamos de nossa vida uma extensão, da noite de Natal, renascendo continuamente em amor, e fraternidade.
Natal: noite de alegria, canções, festejos e bonanssa.
Que, seu coração floreça em amor e esperança!`,
  textCorrect: `Façamos de nossa vida uma extensão da noite de Natal, renascendo continuamente em amor e fraternidade.
Natal: noite de alegria, canções, festejos e bonança.
Que seu coração floresça em amor e esperança!`,
  rules: [
    { type: "comma", wrong: "extensão,", correct: "extensão", hint: "Não se separa o núcleo do complemento." },
    { type: "comma", wrong: "amor,", correct: "amor", hint: "A conjunção “e” não deve ser separada por vírgula." },
    { type: "word",  wrong: "bonanssa", correct: "bonança", hint: "A palavra correta leva cedilha." },
    { type: "comma", wrong: "Que,", correct: "Que", hint: "Não se separa o termo introdutório do restante da frase." },
    { type: "word",  wrong: "floreça", correct: "floresça", hint: "A escrita correta é com “s”, não com “ç”." }
  ]
};
