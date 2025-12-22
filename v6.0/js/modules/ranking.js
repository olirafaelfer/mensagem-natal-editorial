let rankingOpen = false;

export function initRankingUI() {
  const btn = document.getElementById('rankingBtn');
  if (!btn) {
    console.warn('[ranking] botão #rankingBtn não encontrado');
    return;
  }

  btn.onclick = () => {
    toggleRanking();
  };
}

function toggleRanking() {
  const panel = document.getElementById('rankingPanel');
  if (!panel) {
    console.warn('[ranking] painel #rankingPanel não encontrado');
    return;
  }

  rankingOpen = !rankingOpen;
  panel.style.display = rankingOpen ? 'block' : 'none';
}