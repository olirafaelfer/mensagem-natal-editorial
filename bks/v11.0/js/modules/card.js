// js/modules/card.js — abre o mini-app de cartões em um modal (iframe)
export function bootCard(app){
  const btn = document.getElementById("cardBtn");
  if (!btn) return;
  if (btn.__bound) return;
  btn.__bound = true;

  btn.addEventListener("click", () => {
    const { openModal, closeModal } = app.modal || {};
    if (!openModal) return;

    openModal({
      title: "✉️ Cartão personalizado",
      bodyHTML: `
        <div class="card-embed">
          <iframe
            class="card-iframe"
            src="cards/card3/index.html"
            title="Cartão de Natal"
            loading="lazy"
            referrerpolicy="no-referrer"
          ></iframe>
        </div>
        <p class="muted" style="margin:10px 0 0; font-size:12px">
          Dica: use o botão de exportar do cartão para gerar a imagem e enviar no WhatsApp.
        </p>
      `,
      buttons: [{ label: "Fechar", variant: "ghost", onClick: closeModal }]
    });
  });
}
