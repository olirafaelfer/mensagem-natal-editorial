// Desafio 1 — Atividade 3
export default {
  name: "Desafio 1 \u2014 Atividade 3",
  intro: "Mais alguns ajustes antes de avan\u00e7ar.",
  instruction: "Corrija todos os erros para liberar a pr\u00f3xima tarefa.",
  raw: "Entre hist\u00f3rias e abra\u00e7os, o Natal fica mais bonitO \u2014 e a gentE fica mais grata.",
  rules: [
    { id:"d1a3_r1", label:"Caixa alta/baixa", wrong:/\bbonitO\b/g, correct:"bonito", reason:"Use caixa baixa: \u201cbonito\u201d." },
    { id:"d1a3_r2", label:"Caixa alta/baixa", wrong:/\bgentE\b/g, correct:"gente", reason:"Use caixa baixa: \u201cgente\u201d." },
  ]
};
