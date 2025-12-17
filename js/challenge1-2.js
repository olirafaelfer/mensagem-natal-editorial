// js/challenge1-2.js
// Conteúdo da atividade 2 do Desafio 1
// (Por enquanto, cópia das atividades originais. Depois é só editar este arquivo.)

export default {
    name: "Médio",
    intro: `Nível médio: erros editoriais objetivos.`,
    instruction: `Atenção a vírgulas indevidas e concordância.`,
    raw: `O Natal, é um momento especial para celebrar a união e a esperança. As mensagens, que circulam nessa época, precisam transmitir carinho e acolhimento, mas muitas vezes, acabam sendo escritas de forma apressada. Os textos natalinos, exige atenção aos detalhes, para que a mensagem chegue clara ao leitor.`,
    rules: [
      { id:"m1", label:"Pontuação", wrong:/(?<=\bNatal),/g, correct:"", reason:"Vírgula indevida entre sujeito e verbo." },
      { id:"m2", label:"Pontuação", wrong:/(?<=\bmensagens),/g, correct:"", reason:"Vírgula indevida em oração restritiva." },
      { id:"m3", label:"Pontuação", wrong:/(?<=\bvezes),/g, correct:"", reason:"Vírgula indevida entre adjunto e verbo." },
      { id:"m4", label:"Pontuação", wrong:/(?<=\bnatalinos),/g, correct:"", reason:"Vírgula indevida separando termos essenciais." },
      { id:"m5", label:"Concordância", wrong:/\bexige\b/g, correct:"exigem", reason:"Sujeito plural exige verbo no plural." }
    ]
  };
