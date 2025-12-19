// Desafio 1 — Atividade 2
export default {
  name: "Desafio 1 \u2014 Atividade 2",
  intro: "Agora uma pontua\u00e7\u00e3o fora do lugar + uma palavra errada.",
  instruction: "Encontre e corrija as ocorr\u00eancias.",
  raw: "Que a noite de Natal seja leve, e que os livros tragam luz para tods n\u00f3s.",
  rules: [
    { id:"d1a2_r1", label:"Pontua\u00e7\u00e3o", wrong:/,/g, correct:"", reason:"Remova a v\u00edrgula indevida." },
    { id:"d1a2_r2", label:"Ortografia", wrong:/\btods\b/g, correct:"todos", reason:"O correto \u00e9 \u201ctodos\u201d." },
  ]
};
