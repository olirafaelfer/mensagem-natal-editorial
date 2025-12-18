// js/ui/score-fx.js — +pts/-pts animado
export function ensureScoreFloatLayer(){
  let layer = document.getElementById("scoreFloatLayer");
  if (!layer){
    layer = document.createElement("div");
    layer.id = "scoreFloatLayer";
    document.body.appendChild(layer);
  }
  return layer;
}

export function scoreFloat(delta){
  const layer = ensureScoreFloatLayer();
  const el = document.createElement("div");
  el.className = "score-float";
  el.textContent = (delta > 0 ? `+${delta}` : `${delta}`) + " pts";
  layer.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => { el.classList.remove("show"); setTimeout(()=>el.remove(), 240); }, 1100);
}
