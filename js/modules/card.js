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
        <p style="margin:0 0 8px">🚧 <b>Em desenvolvimento</b></p>
        <p class="muted" style="margin:0">Estamos refinando o editor de cartões para ficar perfeito no mobile e no PC. Em breve estará disponível aqui.</p>
      `,
      buttons: [{ label: "Ok", variant: "ghost", onClick: closeModal }]
    });
  });
}
