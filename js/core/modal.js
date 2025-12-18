export function createModal(dom){
  const layer = document.getElementById("modalLayer");
  const titleEl = document.getElementById("modalTitle");
  const bodyEl = document.getElementById("modalBody");
  const btnsEl = document.getElementById("modalBtns");
  const xBtn = document.getElementById("modalX");

  let current = null;

  function close(){
    if (!current) return;
    layer.classList.add("hidden");
    layer.setAttribute("aria-hidden","true");
    titleEl.textContent = "";
    bodyEl.innerHTML = "";
    btnsEl.innerHTML = "";
    current = null;
  }

  function open({ title, html, buttons, dismissible=false }){
    current = { dismissible };
    titleEl.textContent = title || "";
    bodyEl.innerHTML = html || "";
    btnsEl.innerHTML = "";
    (buttons || [{ label:"Ok", variant:"primary", onClick: close }]).forEach(b => {
      const btn = document.createElement("button");
      btn.className = "btn" + (b.variant==="primary" ? " primary" : "");
      btn.textContent = b.label;
      btn.addEventListener("click", () => b.onClick?.());
      btnsEl.appendChild(btn);
    });
    layer.classList.remove("hidden");
    layer.setAttribute("aria-hidden","false");
  }

  // NÃO fecha clicando fora (para evitar o bug que você reclamou)
  layer.addEventListener("click", (e) => {
    if (e.target === layer && current?.dismissible) close();
  });
  xBtn.addEventListener("click", () => {
    if (current?.dismissible) close();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && current?.dismissible) close();
  });

  return { open, close };
}