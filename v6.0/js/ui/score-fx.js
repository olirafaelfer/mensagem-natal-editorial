// js/ui/score-fx.js — animação de pontuação (+x / -y) ancorada no clique
let layer = null;

function ensureLayer(){
  if (layer) return layer;
  layer = document.getElementById("scoreFloatLayer");
  if (!layer){
    layer = document.createElement("div");
    layer.id = "scoreFloatLayer";
    document.body.appendChild(layer);
  }
  return layer;
}

export function scoreFloat(delta, anchorEl){
  if (!delta) return;
  const l = ensureLayer();
  const el = document.createElement("div");
  const isPlus = delta > 0;
  el.className = "score-float " + (isPlus ? "plus" : "minus");
  el.textContent = (isPlus ? "+" : "") + String(delta);

  // posição: centro do elemento clicado; fallback centro superior
  let x = window.innerWidth * 0.5;
  let y = window.innerHeight * 0.18;
  if (anchorEl?.getBoundingClientRect){
    const r = anchorEl.getBoundingClientRect();
    x = r.left + r.width/2;
    y = r.top + r.height/2;
  }
  el.style.left = x + "px";
  el.style.top = y + "px";
  el.style.transform = "translate(-50%, -50%)";

  l.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}
