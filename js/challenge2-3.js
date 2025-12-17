// js/challenge2-3.js — Desafio 2 / Atividade 3 (placeholder - copie e edite)
// Conteúdo puro (sem lógica). Pode editar livremente.
// Exporta um objeto no mesmo formato que o game-core já espera em app.data.levels[i].
export default {
    name: "Difícil",
    intro: `Nível difícil: desafios reais de edição.`,
    instruction: `Pontuação, gramática e colocação pronominal.`,
    raw: `No Natal, se deve pensar no amor ao próximo e na importância da empatia. Aos pais, respeite-os; aos filhos, os ame; aos necessitados, ajude-os. Essas atitudes, reforçam os valores natalinos.`,
    rules: [
      { id:"d1", label:"Colocação pronominal", wrong:/No Natal,\s*se deve pensar/g, correct:"No Natal, deve-se pensar", reason:"Colocação pronominal correta: deve-se." },
      { id:"d2", label:"Colocação pronominal", wrong:/aos filhos,\s*os ame/gi, correct:"aos filhos, ame-os", reason:"Colocação pronominal adequada." },
      { id:"d3", label:"Pontuação", wrong:/(?<=\batitudes),/g, correct:"", reason:"Vírgula indevida entre sujeito e predicado." }
    ]
  };
