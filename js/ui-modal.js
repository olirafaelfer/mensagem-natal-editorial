// js/ui-modal.js — Modal/Overlay (mobile-safe, sem pular pro topo)

export function bootModal(app){
  const overlay = document.getElementById("overlay");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalFoot = document.getElementById("modalFoot");
  const closeBtn = document.getElementById("closeModal");

  if (!overlay) return;

  // =========================
  // Scroll lock (correto em mobile)
  // =========================
  function lockBodyScroll(){
    const y = window.scrollY || 0;
    document.body.dataset.scrollY = String(y);

    // trava o body no lugar
    document.body.classList.add("modal-open");
    document.body.style.top = `-${y}px`;
  }

  function unlockBodyScroll(){
    const y = Number(document.body.dataset.scrollY || "0");

    document.body.classList.remove("modal-open");
    document.body.style.top = "";

    // restaura scroll exatamente onde estava
    window.scrollTo(0, y);
  }

  // =========================
  // API do modal
  // =========================
  function openModal({ title, bodyHTML, buttons = [] }){
    lockBodyScroll();

    if (modalTitle) modalTitle.textContent = title || "";
    if (modalBody) modalBody.innerHTML = bodyHTML || "";
    if (modalFoot) modalFoot.innerHTML = "";

    for (const btn of buttons){
      const b = document.createElement("button");
      b.className = "btn" + (btn.variant ? ` ${btn.variant}` : "");
      b.textContent = btn.label;
      b.disabled = !!btn.disabled;
      b.addEventListener("click", btn.onClick);
      modalFoot?.appendChild(b);
    }

    overlay.classList.remove("hidden");
    requestAnimationFrame(() => overlay.classList.add("show"));
  }

  function closeModal(){
    overlay.classList.remove("show");
    setTimeout(() => {
      overlay.classList.add("hidden");
      unlockBodyScroll();
    }, 180);
  }

  // =========================
  // Eventos
  // =========================
  closeBtn?.addEventListener("click", closeModal);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    // só fecha se estiver aberto
    if (e.key === "Escape" && !overlay.classList.contains("hidden")) closeModal();
  });

  // =========================
  // Expor no app
  // =========================
  app.modal = { openModal, closeModal };
}

