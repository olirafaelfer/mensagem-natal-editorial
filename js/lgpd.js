// js/lgpd.js
export function bootLGPD(app) {
  const { openModal, closeModal } = app.modal || {};
  if (typeof openModal !== "function" || typeof closeModal !== "function") return;

  // evita boot duplicado caso main.js chame duas vezes
  if (app.__LGPD_BOOTED__ === true) return;
  app.__LGPD_BOOTED__ = true;

  // handler estável (não cria múltiplos listeners)
  function onClick(ev) {
    const t = ev.target instanceof Element ? ev.target : null;
    if (!t) return;

    // aceita clique no botão ou em qualquer filho dele
    const btn = t.closest("[data-lgpd='more']");
    if (!btn) return;

    // evita comportamento acidental se estiver dentro de link
    ev.preventDefault();
    ev.stopPropagation();

    // abre o modal após 1 tick para evitar conflito com overlays/fechamento
    setTimeout(() => {
      openModal({
        title: "🔐 LGPD — Proteção de Dados",
        bodyHTML: `
          <p>Este aplicativo coleta apenas as informações necessárias para:</p>
          <ul>
            <li>Exibir ranking individual (opcional)</li>
            <li>Gerar estatísticas agregadas por setor (dados agregados)</li>
          </ul>

          <p class="muted" style="margin-top:10px">
            Nenhum dado sensível é compartilhado com terceiros.
            O ranking individual é opcional e pode ser desativado a qualquer momento.
          </p>
        `,
        buttons: [{ label: "Entendi", onClick: closeModal }],
      });
    }, 0);
  }

  // capture=true ajuda quando algum container para propagation no bubbling
  document.addEventListener("click", onClick, true);
}
