// js/challenge1-1.js — Desafio 1 / Atividade 1
// Conteúdo puro (sem lógica). Pode editar livremente.
// Exporta um objeto no mesmo formato que o game-core já espera em app.data.levels[i].
export default {
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
