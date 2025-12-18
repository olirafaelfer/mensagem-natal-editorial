const layer = document.getElementById("modalLayer");
export function showModal({ title="Aviso", body="", actions=[] }){
  layer.classList.remove("hidden");
  layer.setAttribute("aria-hidden","false");
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `<h3>${title}</h3><p>${body}</p><div class="actions"></div>`;
  const actionsWrap = modal.querySelector(".actions");
  const close = () => {
    try { document.activeElement?.blur?.(); } catch {}
    layer.classList.add("hidden");
    layer.setAttribute("aria-hidden","true");
    layer.innerHTML = "";
  };
  actions.forEach(a=>{
    const btn=document.createElement("button");
    btn.className = "btn" + (a.primary ? " primary":"");
    btn.textContent=a.label;
    btn.disabled=!!a.disabled;
    btn.addEventListener("click", async ()=>{
      if (a.onClick) await a.onClick({ close });
      if (a.closeOnClick !== false) close();
    });
    actionsWrap.appendChild(btn);
  });
  layer.innerHTML="";
  layer.appendChild(modal);
  return { close };
}
