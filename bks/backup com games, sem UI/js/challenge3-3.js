// Auto-generated activity module
const base = {
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

export default {
  ...base,
  name: "Desafio 3 \u2014 Atividade 3",
};
