// Desafio 2 — Tarefa 2
// Mistura de remoção de vírgulas indevidas + 2 correções de ortografia.

const RULES = [
  {
    id: "d2t2_1",
    label: "Remover vírgula indevida",
    token: ",",
    clickTokenOnly: true,
    fast: true,
    wrong: "extensão, da",
    correct: "extensão da",
    labelWrong: ",",
    labelCorrect: "(remover)",
    hint: "A vírgula não deve separar o nome do complemento aqui."
  },
  {
    id: "d2t2_2",
    label: "Remover vírgula indevida",
    token: ",",
    clickTokenOnly: true,
    fast: true,
    wrong: "amor, e",
    correct: "amor e",
    labelWrong: ",",
    labelCorrect: "(remover)",
    hint: "A vírgula antes de 'e' é indevida neste caso."
  },
  {
    id: "d2t2_3",
    label: "Ortografia",
    wrong: "bonanssa",
    flags: "gi",
    correct: "bonança",
    hint: "A forma correta é com 'ç': bonança."
  },
  {
    id: "d2t2_4",
    label: "Remover vírgula indevida",
    token: ",",
    clickTokenOnly: true,
    fast: true,
    wrong: "Que, seu",
    correct: "Que seu",
    labelWrong: ",",
    labelCorrect: "(remover)",
    hint: "Não se separa a conjunção do restante da oração com vírgula."
  },
  {
    id: "d2t2_5",
    label: "Ortografia",
    wrong: "floreça",
    flags: "gi",
    correct: "floresça",
    hint: "A escrita correta é 'floresça'."
  }
];

export default {
  id: "d2-t2",
  name: "Desafio 2 — Tarefa 2",
  intro: "Encontre 5 erros (vírgulas indevidas e ortografia) e corrija.",
  raw:
    "Façamos de nossa vida uma extensão, da noite de Natal, renascendo continuamente em amor, e fraternidade.\n" +
    "Natal: noite de alegria, canções, festejos e bonanssa.\n" +
    "Que, seu coração floreça em amor e esperança!",
  correctText:
    "Façamos de nossa vida uma extensão da noite de Natal, renascendo continuamente em amor e fraternidade.\n" +
    "Natal: noite de alegria, canções, festejos e bonança.\n" +
    "Que seu coração floresça em amor e esperança!",
  rules: RULES
};
