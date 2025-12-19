// Desafio 1 — Atividade 1
export default {
  name: "Desafio 1 \u2014 Atividade 1",
  intro: "Vamos aquecer! Corrija erros simples em uma frase natalina mais longa.",
  instruction: "Clique em um trecho e corrija. (Sem dicas visuais \u2014 voc\u00ea precisa achar os erros.)",
  raw: "Neste Natal, que a sua refeiss\u00e3o em fam\u00edlia seja cheia de paz e inspirac\u00e3o, e que cada p\u00e1gina lida aque\u00e7a o cora\u00e7\u00e3o.",
  rules: [
    { id:"d1a1_r1", label:"Ortografia", wrong:/\brefeissão\b/g, correct:"refei\u00e7\u00e3o", reason:"O correto \u00e9 \u201crefei\u00e7\u00e3o\u201d." },
    { id:"d1a1_r2", label:"Acentua\u00e7\u00e3o", wrong:/\binspiracão\b/g, correct:"inspira\u00e7\u00e3o", reason:"O correto \u00e9 \u201cinspira\u00e7\u00e3o\u201d." },
  ]
};
