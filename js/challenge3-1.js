// js/challenge3-1.js
// Conteúdo da Atividade 1 do Desafio 3
// (por enquanto, espelha as atividades originais; basta substituir este objeto depois)

const level = {
    name: "Fácil",
    intro: `O Papai Noel, editor-chefe, pediu sua ajuda para revisar a Mensagem de Natal.
Ele escreveu tão rápido que acabou deixando três errinhos para trás.`,
    instruction: `Os erros podem envolver acentuação, ortografia, gramática etc. Clique nos trechos incorretos para corrigir!`,
    raw: `Mais do que presentes e refeissões caprichadas, o Natal é a época de lembrar o valor de um abraço apertado e de um sorriso sincero! Que para voces, meus amigos, seja uma época xeia de carinho e amor, preenchida pelo que realmente importa nessa vida!`,
    rules: [
      { id:"f1", label:"Ortografia", wrong:/\brefeissões\b/g, correct:"refeições", reason:"Erro ortográfico. A forma correta do substantivo é 'refeições'." },
      { id:"f2", label:"Acentuação", wrong:/\bvoces\b/g, correct:"vocês", reason:"Erro de acentuação gráfica." },
      { id:"f3", label:"Ortografia", wrong:/\bxeia\b/g, correct:"cheia", reason:"Erro ortográfico. A palavra correta é 'cheia'." }
    ]
  };

export default level;
export { level };
