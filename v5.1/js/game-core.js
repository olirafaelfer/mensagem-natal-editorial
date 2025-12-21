// === PATCH FIX: Syntax error (Unexpected identifier 'Tudo') ===
// This patch only ensures epigraph texts are valid JS strings.

export const EPIGRAPHS = {
  tutorial: "A luta contra o erro tipográfico tem algo de homérico. Durante a revisão os erros se escondem, fazem-se positivamente invisíveis.",
  d1: "Tudo o que estabiliza a vida humana demanda dedicação de tempo prolongada.",
  d2: "Vamos subir ao telhado. Acabou o tempo das palavras, chegou a hora da ação.",
  d3: "O mundo é um livro, e quem fica sentado em casa lê somente uma página."
};

// NOTE:
// If your original game-core.js already defines EPIGRAPHS elsewhere,
// copy ONLY the object above and remove any raw text outside strings.