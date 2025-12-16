// js/ui-modal.js — Modal/Overlay (mobile-safe, sem pular pro topo)

export function bootModal(app){
  const overlay = document.getElementById("overlay");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalFoot = document.getElementById("modalFoot");
  const closeBtn = document.getElementById("closeModal");

  if (!overlay) return;

  function lockBodyScroll(){
    const y = window.scrollY || 0;
    document.body.dataset.scrollY = String(y);
    document.body.classList.add("modal-open");
    document.body.style.top = `-${y}px`;
  }

  function unlockBodyScroll(){
    const y = Number(document.body.dataset.scrollY || "0");
    document.body.classList.remove("modal-open");
    document.body.style.top = "";
    window.scrollTo(0, y);
  }

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

  closeBtn?.addEventListener("click", closeModal);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.classList.contains("hidden")) closeModal();
  });

  app.modal = { openModal, closeModal };
}
