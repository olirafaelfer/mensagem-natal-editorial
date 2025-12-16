// js/lgpd.js — handler LGPD (isolado)
export function bootLgpd(app){
  const btn = document.getElementById("lgpdMoreBtn");
  const { openModal, closeModal } = app.modal || {};

  if (!btn) return;
  if (typeof openModal !== "function") {
    console.warn("[lgpd] app.modal não disponível.");
    return;
  }

  btn.addEventListener("click", () => {
    openModal({
      title: "LGPD e privacidade",
      bodyHTML: `
        <p style="margin-top:0">
          <strong>O que coletamos:</strong> apenas informações necessárias para a experiência do jogo (ex.: nome e setor informados).
        </p>
        <p>
          <strong>Ranking por setor:</strong> exibimos somente dados <strong>agregados</strong> por setor.
        </p>
        <p>
          <strong>Ranking individual:</strong> aparece apenas para usuários <strong>logados</strong> e que optam por participar.
        </p>
        <p class="muted" style="margin-bottom:0">
          Você pode jogar no modo anônimo e continuar usando o app normalmente (sem ranking individual).
        </p>
      `,
      buttons: [{ label: "Fechar", onClick: closeModal }]
    });
  });
}
