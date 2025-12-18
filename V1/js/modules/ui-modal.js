// V1/js/modules/ui-modal.js
// Modal simples, SEM fechar clicando fora por padrão (evita "sumir" com drag/click fora).
export function showModal({ title, message, buttons = [], dismissible = false }) {
  const layer = document.getElementById("modalLayer");
  layer.innerHTML = "";
  layer.classList.remove("hidden");
  layer.setAttribute("aria-hidden", "false");

  const modal = document.createElement("div");
  modal.className = "modal";

  const h = document.createElement("h3");
  h.textContent = title ?? "";
  const p = document.createElement("p");
  p.innerHTML = (message ?? "").replace(/\n/g, "<br>");

  const row = document.createElement("div");
  row.className = "btnrow";
  row.style.justifyContent = "flex-end";

  const close = () => {
    try { document.activeElement?.blur?.(); } catch {}
    layer.classList.add("hidden");
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = "";
  };

  if (dismissible) {
    layer.addEventListener("click", (e) => {
      if (e.target === layer) close();
    }, { once: true });
  }

  buttons.forEach((b) => {
    const btn = document.createElement("button");
    btn.className = "pill";
    btn.textContent = b.label;
    btn.disabled = !!b.disabled;
    btn.addEventListener("click", async () => {
      const shouldClose = b.close !== false;
      if (b.onClick) await b.onClick({ close });
      if (shouldClose) close();
    });
    row.appendChild(btn);
  });

  modal.appendChild(h);
  modal.appendChild(p);
  modal.appendChild(row);
  layer.appendChild(modal);
  return { close };
}
