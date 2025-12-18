// js/ui-modal.js — Modal/Overlay (mobile-safe, sem “pular pro topo”)
// Estratégia: NÃO fixar o body com top negativo (isso causa modal “no topo” no 1º paint).
// Em vez disso: trava scroll via overflow hidden + preserva largura (scrollbar) + restaura foco.

export function bootModal(app){
  const overlay   = document.getElementById("overlay");
  const modal     = overlay?.querySelector(".modal") || null;
  const modalTitle = document.getElementById("modalTitle");
  const modalBody  = document.getElementById("modalBody");
  const modalFoot  = document.getElementById("modalFoot");
  const closeBtn   = document.getElementById("closeModal");

  if (!overlay) return;

  let lastActiveEl = null;
  let closeTimer = null;
  let currentDismissible = false;
  let scrollYBefore = 0;

  // =========================
  // Scroll lock (estável em desktop + mobile)
  // =========================
  function getScrollbarWidth(){
    // largura da barra de rolagem para evitar “pulo” do layout ao travar
    return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  }

  function lockBodyScroll(){
    lastActiveEl = document.activeElement;
    scrollYBefore = window.scrollY || 0;

    const sbw = getScrollbarWidth();
    document.body.style.overflow = "hidden";
    if (sbw) document.body.style.paddingRight = sbw + "px";
  }

  function unlockBodyScroll(){
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  }

  // =========================
  // Helpers
  // =========================
  function clearFoot(){
    if (!modalFoot) return;
    modalFoot.innerHTML = "";
  }

  function focusFirstAction(){
    // tenta focar o primeiro botão, senão o botão fechar
    const firstBtn = modalFoot?.querySelector("button");
    if (firstBtn) {
      firstBtn.focus({ preventScroll: true });
      return;
    }
    closeBtn?.focus({ preventScroll: true });
  }

  // =========================
  // API do modal
  // =========================
  function openModal({ title, bodyHTML, buttons = [], dismissible = false }){
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    // garante overlay visível caso um close anterior esteja animando
    overlay.classList.remove("hidden");
    lockBodyScroll();
    currentDismissible = !!dismissible;

    if (modalTitle) modalTitle.textContent = title || "";
    if (modalBody)  modalBody.innerHTML = bodyHTML || "";
    clearFoot();

    for (const btn of buttons){
      const b = document.createElement("button");
      b.className = "btn" + (btn.variant ? ` ${btn.variant}` : "");
      b.textContent = btn.label;
      b.disabled = !!btn.disabled;

      // evita “submit” acidental caso alguém coloque modal dentro de form
      b.type = "button";

      b.addEventListener("click", (ev) => {
        ev.preventDefault();
        btn.onClick?.();
      });

      modalFoot?.appendChild(b);
    }

    // mostra overlay
    overlay.classList.remove("hidden");

    // ✅ garante centralização no frame atual (sem “pular pro topo”)
    // requestAnimationFrame para pegar layout já aplicado
    requestAnimationFrame(() => {
      overlay.classList.add("show");

      // garante que o modal esteja visível sem scroll interno estranho
      // (mas NÃO rola a página!)
      modal?.scrollIntoView?.({ block: "center", inline: "nearest" });

      // foco (sem scroll)
      setTimeout(() => focusFirstAction(), 0);
    });
  }

  function closeModal(){
    overlay.classList.remove("show");

    // fecha com animação
    closeTimer = setTimeout(() => {
      overlay.classList.add("hidden");
      closeTimer = null;
      unlockBodyScroll();
    currentDismissible = !!dismissible;

      // restaura posição do scroll exatamente onde estava
      window.scrollTo(0, scrollYBefore);

      // restaura foco do elemento anterior (sem scroll)
      if (lastActiveEl && typeof lastActiveEl.focus === "function"){
        try { lastActiveEl.focus({ preventScroll: true }); } catch {}
      }
      lastActiveEl = null;
    }, 180);
  }

  // =========================
  // Eventos
  // =========================
  closeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeModal();
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay && currentDismissible) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.classList.contains("hidden") && currentDismissible) closeModal();
  });

  // =========================
  // Expor no app
  // =========================
  app.modal = { openModal, closeModal };
}
