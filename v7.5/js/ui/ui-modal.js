// js/ui/ui-modal.js — Modal/Overlay (V7.5)
// Objetivo: app.modal SEMPRE existir (evita erros de boot/ordem), e depois ser "promovido" quando o DOM estiver pronto.

window.app = window.app || {};
const app = window.app;

// fila para chamadas antes do boot real
const __queue = [];
function __stubOpen(opts){ __queue.push({ t:"open", opts }); }
function __stubClose(){ __queue.push({ t:"close" }); }

// Garante API mínima cedo (para theme-fx/auth/admin/game-core não quebrarem)
if (!app.modal) {
  app.modal = { openModal: __stubOpen, closeModal: __stubClose };
}

// Back-compat exports: alguns módulos importam openModal/closeModal diretamente.
let __modalApi = app.modal;
export function openModal(opts){ return __modalApi?.openModal?.(opts); }
export function closeModal(){ return __modalApi?.closeModal?.(); }

export function bootModal(appRef){
  const app2 = appRef || app;

  const overlay    = document.getElementById("overlay");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody  = document.getElementById("modalBody");
  const modalFoot  = document.getElementById("modalFoot");
  const closeBtn   = document.getElementById("closeModal");

  // Se ainda não tem DOM (carregando), mantém stub e sai silenciosamente.
  if (!overlay || !modalTitle || !modalBody || !modalFoot) {
    // mantém app.modal stub
    __modalApi = app2.modal || app.modal;
    return app2.modal;
  }

  // ========= scroll lock helpers =========
  let scrollYBefore = 0;
  let closeTimer = null;
  let currentDismissible = false;
  let lastActiveEl = null;

  function lockBodyScroll(){
    scrollYBefore = window.scrollY || 0;
    lastActiveEl = document.activeElement;
    document.body.style.overflow = "hidden";
  }
  function unlockBodyScroll(){
    document.body.style.overflow = "";
  }

  function clearFoot(){ modalFoot.innerHTML = ""; }

  function closeModalImpl(){
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    overlay.classList.add("hidden");
    unlockBodyScroll();
    try { window.scrollTo(0, scrollYBefore); } catch {}
    if (lastActiveEl && typeof lastActiveEl.focus === "function"){
      try { lastActiveEl.focus({ preventScroll: true }); } catch {}
    }
  }

  function openModalImpl({ title="Mensagem", bodyHTML="", buttons=[], dismissible=false } = {}){
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    overlay.classList.remove("hidden");
    lockBodyScroll();
    currentDismissible = !!dismissible;

    modalTitle.textContent = title || "";
    modalBody.innerHTML = bodyHTML || "";
    clearFoot();

    for (const b of (buttons||[])){
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn " + (b.variant === "primary" ? "primary" : "");
      btn.textContent = b.label || "OK";
      btn.addEventListener("click", () => {
        try { b.onClick?.(); } finally { if (b.autoClose !== false) closeModalImpl(); }
      });
      modalFoot.appendChild(btn);
    }
    // fallback close button
    if (closeBtn && !closeBtn.__wired){
      closeBtn.__wired = true;
      closeBtn.addEventListener("click", closeModalImpl);
    }
  }

  // clique fora fecha se dismissible
  if (!overlay.__wired){
    overlay.__wired = true;
    overlay.addEventListener("click", (e)=>{
      if (!currentDismissible) return;
      if (e.target === overlay) closeModalImpl();
    });
  }

  // promove API
  app2.modal = { openModal: openModalImpl, closeModal: closeModalImpl };
  __modalApi = app2.modal;

  // Flush fila pendente (se alguém chamou stub antes)
  try {
    while (__queue.length){
      const it = __queue.shift();
      if (it.t === "open") openModalImpl(it.opts || {});
      else closeModalImpl();
    }
  } catch {}

  // expõe globais compatíveis
  window.openModal = (opts)=>openModalImpl(opts || {});
  window.closeModal = ()=>closeModalImpl();

  return app2.modal;
}
