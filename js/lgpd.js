// js/lgpd.js — handler LGPD (delegação; resistente a mudanças de DOM)
export function bootLgpd(app){
  if (app.__LGPD_BOOTED__) return;
  app.__LGPD_BOOTED__ = true;

  const { openModal, closeModal } = app.modal || {};
  if (typeof openModal !== "function" || typeof closeModal !== "function") {
    console.warn("[lgpd] app.modal não disponível.");
    return;
  }

  // Delegação: funciona mesmo se #lgpdMoreBtn for recriado/movido
  document.addEventListener("click", (ev) => {
    const t = ev.target instanceof HTMLElement ? ev.target : null;
    const btn = t?.closest?.("#lgpdMoreBtn");
    if (!btn) return;

    ev.preventDefault();

    openModal({
      title: "LGPD e privacidade",
      bodyHTML: `
        <p style="margin-top:0">
          <strong>O que coletamos:</strong> apenas dados necessários para o jogo (ex.: nome e setor informados).
        </p>
        <p>
          <strong>Ranking por setor:</strong> exibimos somente dados <strong>agregados</strong>.
        </p>
        <p>
          <strong>Ranking individual:</strong> aparece apenas para usuários <strong>logados</strong> e que optam por participar.
        </p>
        <p class="muted" style="margin-bottom:0">
          Você pode jogar no modo anônimo normalmente (sem ranking individual).
        </p>
      `,
      buttons: [{ label: "Fechar", onClick: closeModal }]
    });
  }, true);
}
