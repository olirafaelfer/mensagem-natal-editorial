export function createScoreFx(){
  const layer = document.getElementById("scoreLayer");
  function pop(delta, anchor){
    const rect = anchor?.getBoundingClientRect?.();
    const x = rect ? rect.left + rect.width/2 : window.innerWidth/2;
    const y = rect ? rect.top : window.innerHeight*0.25;

    const el = document.createElement("div");
    el.className = "score-float " + (delta>=0 ? "good" : "bad");
    el.textContent = (delta>=0 ? "+" : "") + String(delta);
    el.style.left = x + "px";
    el.style.top = y + "px";
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }
  return { pop };
}