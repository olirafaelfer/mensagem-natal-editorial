// js/tutorial.js — dados do tutorial (3 níveis)
// O motor do jogo consome este array como se fossem níveis normais.
// Regras:
// - Se correct === "" => remove o trecho capturado (ex.: vírgula indevida)

export function getTutorialLevels(){
  return [
    {
      name: "Tutorial 1/3 — Como corrigir",
      instruction: "Clique no trecho destacado e confirme. Depois, aplique a correção sugerida.",
      raw: "Neste Natal, desejamos que você revise esta frase: A equipe trabalha com atenção e carinho.",
      rules: [
        { id:"t1", label:"Ortografia", wrong:/\bcarinho\b/g, correct:"carinho", reason:"Exemplo simples (aqui não muda, apenas demonstra o fluxo)." }
      ]
    },
    {
      name: "Tutorial 2/3 — Pontuação",
      instruction: "Agora remova a vírgula indevida clicando nela.",
      raw: "O Natal, é um tempo de amor e esperança.",
      rules: [
        // vírgula como token clicável (len 1)
        { id:"t2", label:"Pontuação", wrong:/,/g, correct:"", reason:"Vírgula indevida entre sujeito e verbo." }
      ]
    },
    {
      name: "Tutorial 3/3 — Clique equivocado",
      instruction: "Clique em uma palavra CORRETA (por exemplo: “amor”) e confirme para ver a penalidade. Depois, conclua o nível.",
      raw: "O Natal é um tempo de amor ao próximo.",
      rules: [
        { id:"t3", label:"Acentuação", wrong:/\bproximo\b/g, correct:"próximo", reason:"A palavra precisa de acento: próximo." }
      ]
    }
  ];
}
