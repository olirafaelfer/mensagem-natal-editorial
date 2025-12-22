const openBtn = document.getElementById("openMission");

const BASE_CARD_TEXT = `Obrigado por você existir na minha vida. Este não é só um cartão, mas o início de uma corrente de amor e mudança.

Ame quem está ao seu lado, faça uma doação neste natal, ore por quem precisa e o mais importante, sinta isso no seu coração.

Se cada um de nós fizermos só um pouquinho, transformaremos o mundo ao nosso redor.`;

let selected = null;
let tutorialStep = 0;
let lastExportDataUrl = null;

openBtn.onclick = async () => {
  const r = await fetch("missao.html");
  document.body.insertAdjacentHTML("beforeend", await r.text());
  document.getElementById("cardText").textContent = BASE_CARD_TEXT;
};

function $(s){ return document.querySelector(s); }
function $all(s){ return Array.from(document.querySelectorAll(s)); }

function closeMission(){
  const o = document.getElementById("missionOverlay");
  if(o) o.remove();
}

function goToCard(){
  $(".step-1").classList.add("hidden");
  $(".step-2").classList.remove("hidden");
}

function openCustomizer(){
  $("#customizer").classList.remove("hidden");
  $("#previewText").textContent = BASE_CARD_TEXT;
  applyStyle();
  mountDecorations();
  bindControlsOnce();
  startTutorialAuto();
}

function closeCustomizer(){
  $("#customizer").classList.add("hidden");
  setSelected(null);
}

function shareTextOnly(){
  shareText(BASE_CARD_TEXT);
}

/* SVG palette */
const SVG_ITEMS = [
  { id:"tree",  svg:`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="#2ec4b6" d="M32 6 20 22h8l-10 14h10L16 54h32L36 36h10L34 22h8z"/><rect x="28" y="50" width="8" height="10" rx="2" fill="#8d5a3c"/><circle cx="32" cy="20" r="2" fill="#e63946"/><circle cx="26" cy="30" r="2" fill="#ffd166"/><circle cx="38" cy="30" r="2" fill="#ffd166"/><circle cx="30" cy="40" r="2" fill="#e63946"/><circle cx="34" cy="44" r="2" fill="#ffd166"/></svg>`},
  { id:"gift",  svg:`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="26" width="44" height="30" rx="6" fill="#e63946"/><rect x="10" y="26" width="44" height="10" fill="#c1121f"/><rect x="29" y="26" width="6" height="30" fill="#ffd166"/><rect x="10" y="38" width="44" height="6" fill="#ffd166"/><path fill="#2ec4b6" d="M32 26c-8 0-12-12-3-12 3 0 3 4 3 6 0-2 0-6 3-6 9 0 5 12-3 12z"/></svg>`},
  { id:"bell",  svg:`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="#ffd166" d="M32 8c-8 0-14 6-14 14v10c0 2-1 4-3 6l-3 3h40l-3-3c-2-2-3-4-3-6V22c0-8-6-14-14-14z"/><path fill="#e9c46a" d="M12 41h40v4a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z"/><circle cx="32" cy="54" r="4" fill="#8d5a3c"/><circle cx="32" cy="12" r="3" fill="#8d5a3c"/></svg>`},
  { id:"star",  svg:`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="#ffd166" d="M32 6l7 18h19L43 36l6 20-17-11-17 11 6-20L6 24h19z"/><path fill="rgba(255,255,255,.35)" d="M32 6l7 18h-7z"/></svg>`},
  { id:"heart", svg:`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="#ff4d6d" d="M32 54S10 40 10 24c0-7 6-12 13-12 5 0 8 3 9 6 1-3 4-6 9-6 7 0 13 5 13 12 0 16-22 30-22 30z"/></svg>`},
  { id:"snow",  svg:`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><g stroke="#ffffff" stroke-width="3" stroke-linecap="round"><path d="M32 8v48"/><path d="M12 20l40 24"/><path d="M52 20L12 44"/><path d="M20 12l24 40"/><path d="M44 12L20 52"/></g></svg>`},
  { id:"candy", svg:`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path fill="#ffffff" d="M26 22c-6-6-18 6-12 12l6-6 6 6 6-6z"/><path fill="#ffffff" d="M38 42c6 6 18-6 12-12l-6 6-6-6-6 6z"/><path fill="#e63946" d="M24 18l22 22-6 6-22-22z"/><path fill="#ffd166" d="M28 22l22 22-2 2-22-22z"/></svg>`},
  { id:"wreath",svg:`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="18" fill="none" stroke="#2ec4b6" stroke-width="8" stroke-linecap="round" stroke-dasharray="6 6"/><circle cx="32" cy="14" r="3" fill="#e63946"/><circle cx="18" cy="24" r="3" fill="#ffd166"/><circle cx="46" cy="24" r="3" fill="#ffd166"/><circle cx="22" cy="46" r="3" fill="#e63946"/><circle cx="42" cy="46" r="3" fill="#e63946"/><path d="M26 50c4 3 8 3 12 0" stroke="#ffd166" stroke-width="4" stroke-linecap="round"/></svg>`},
];

function mountDecorations(){
  const grid = document.getElementById("decGrid");
  if(grid.dataset.ready === "1") return;
  grid.dataset.ready = "1";

  for(const item of SVG_ITEMS){
    const box = document.createElement("div");
    box.className = "dec-item";
    box.innerHTML = item.svg;
    box.setAttribute("draggable","true");
    box.addEventListener("dragstart", (e)=> e.dataTransfer.setData("svg", item.svg));
    box.addEventListener("click", ()=> addPlacedFromSVG(item.svg, 0.5, 0.45)); // mobile tap-to-add
    grid.appendChild(box);
  }

  const preview = document.getElementById("previewCard");
  preview.addEventListener("dragover", (e)=>e.preventDefault());
  preview.addEventListener("drop", (e)=>{
    e.preventDefault();
    const svg = e.dataTransfer.getData("svg");
    if(!svg) return;
    const rect = preview.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    addPlacedFromSVG(svg, x, y);
  });
}

function addPlacedFromSVG(svg, relX, relY){
  const layer = document.getElementById("dropLayer");
  const holder = document.createElement("div");
  holder.className = "placed";
  holder.innerHTML = svg;
  holder.dataset.scale = "1";
  holder.dataset.relX = String(relX);
  holder.dataset.relY = String(relY);
  positionPlaced(holder);

  holder.addEventListener("pointerdown", (ev)=>{
    ev.preventDefault();
    ev.stopPropagation();
    setSelected(holder);

    const startX = ev.clientX;
    const startY = ev.clientY;
    const parentRect = layer.getBoundingClientRect();
    const baseRelX = parseFloat(holder.dataset.relX);
    const baseRelY = parseFloat(holder.dataset.relY);

    holder.setPointerCapture(ev.pointerId);

    const onMove = (mv)=>{
      const dx = mv.clientX - startX;
      const dy = mv.clientY - startY;
      const newX = (baseRelX * parentRect.width + dx) / parentRect.width;
      const newY = (baseRelY * parentRect.height + dy) / parentRect.height;
      holder.dataset.relX = String(clamp(newX, 0.08, 0.92));
      holder.dataset.relY = String(clamp(newY, 0.14, 0.90));
      positionPlaced(holder);
    };
    const onUp = ()=>{
      holder.removeEventListener("pointermove", onMove);
      holder.removeEventListener("pointerup", onUp);
    };
    holder.addEventListener("pointermove", onMove);
    holder.addEventListener("pointerup", onUp);
  });

  holder.addEventListener("click",(e)=>{ e.stopPropagation(); setSelected(holder); });

  layer.appendChild(holder);
  setSelected(holder);
}

function positionPlaced(el){
  const layer = document.getElementById("dropLayer");
  const rect = layer.getBoundingClientRect();
  const x = parseFloat(el.dataset.relX) * rect.width;
  const y = parseFloat(el.dataset.relY) * rect.height;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  const s = parseFloat(el.dataset.scale || "1");
  el.style.transform = `translate(-50%,-50%) scale(${s})`;
}

function setSelected(el){
  if(selected) selected.classList.remove("selected");
  selected = el;
  if(selected) selected.classList.add("selected");
}

function sizeSelected(mult){
  if(!selected) return;
  let s = parseFloat(selected.dataset.scale || "1");
  s = clamp(s * mult, 0.55, 2.2);
  selected.dataset.scale = String(s);
  positionPlaced(selected);
}

function removeSelected(){
  if(!selected) return;
  const rm = selected;
  setSelected(null);
  rm.remove();
}

function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }

/* Style controls */
function bindControlsOnce(){
  const root = document.getElementById("customizer");
  if(root.dataset.bound === "1") return;
  root.dataset.bound = "1";

  $("#previewCard").addEventListener("pointerdown", ()=> setSelected(null));
  $("#fontSelect").addEventListener("change", applyStyle);
  $("#textColor").addEventListener("input", applyStyle);
  $("#borderColor").addEventListener("input", applyStyle);
  $("#bgPreset").addEventListener("change", applyStyle);
  $("#logoMode").addEventListener("change", applyStyle);

  window.addEventListener("resize", ()=> $all("#dropLayer .placed").forEach(positionPlaced), {passive:true});
}

function applyStyle(){
  const font = $("#fontSelect").value;
  const textColor = $("#textColor").value;
  const borderColor = $("#borderColor").value;
  const preset = $("#bgPreset").value;
  const logoMode = $("#logoMode").value;

  const inner = $("#previewInner");
  const card = $("#previewCard");
  const text = $("#previewText");
  const logo = $("#previewCard .logo");

  text.style.color = textColor;
  card.style.borderColor = hexToRgba(borderColor, 0.55);
  text.style.fontFamily = fontFamily(font);
  inner.style.background = presetBackground(preset);

  if(logo){
    logo.style.display = (logoMode === "on") ? "block" : "none";
  }
}

function fontFamily(key){
  if(key === "serif") return "ui-serif, Georgia, 'Times New Roman', serif";
  if(key === "hand") return "'Comic Sans MS', 'Bradley Hand', 'Segoe Script', cursive";
  if(key === "mono") return "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  return "system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
}
function presetBackground(key){
  if(key === "warm") return "linear-gradient(135deg,#2b1b0f,#7a4b1a)";
  if(key === "mint") return "linear-gradient(135deg,#052a2a,#0e3d2f)";
  if(key === "snow") return "linear-gradient(135deg,#1a2233,#3a4b6a)";
  return "linear-gradient(135deg,#14213d,#0e1625)";
}
function hexToRgba(hex, a){
  const h = hex.replace("#","");
  const r = parseInt(h.slice(0,2),16);
  const g = parseInt(h.slice(2,4),16);
  const b = parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}

/* Mandatory tutorial */
function startTutorialAuto(){
  tutorialStep = 0;
  const t = document.getElementById("tutorial");
  t.style.display = "block";
  renderTutorial();
}
function nextTutorial(){
  tutorialStep++;
  if(tutorialStep >= 3){
    document.getElementById("tutorial").style.display = "none";
    return;
  }
  renderTutorial();
}
function renderTutorial(){
  const body = document.getElementById("tBody");
  const prog = document.getElementById("tProg");
  const arrow = document.getElementById("tArrow");
  prog.textContent = `Passo ${tutorialStep+1} de 3`;

  if(tutorialStep === 0){
    body.textContent = "Escolha fonte e cores. O cartão muda na hora.";
    arrow.textContent = "⬇️";
    arrow.style.top = "250px";
  } else if(tutorialStep === 1){
    body.textContent = "Arraste (ou toque) em um item SVG para colocar no cartão. Depois, mova com o dedo.";
    arrow.textContent = "⬇️";
    arrow.style.top = "600px";
  } else {
    body.textContent = "Toque no item para selecionar e use ➖ ➕ 🗑️. Depois exporte e compartilhe.";
    arrow.textContent = "⬆️";
    arrow.style.top = "210px";
  }
}

/* Export */
async function exportPNG(){
  const card = document.getElementById("previewCard");
  const inner = document.getElementById("previewInner");
  const text = document.getElementById("previewText");
  const layer = document.getElementById("dropLayer");
  const logo = document.querySelector("#previewCard .logo");

  const rect = card.getBoundingClientRect();
  const w = Math.round(rect.width * 2);
  const h = Math.round(rect.height * 2);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  drawGradientFallback(ctx, w, h, inner.style.background || "");

  ctx.strokeStyle = card.style.borderColor || "rgba(255,255,255,.2)";
  ctx.lineWidth = 4;
  roundRect(ctx, 2, 2, w-4, h-4, 28);
  ctx.stroke();

  const pad = Math.floor(w * 0.06);
  const fontPx = Math.floor(w * 0.032);
  ctx.fillStyle = text.style.color || "rgba(255,255,255,.94)";
  ctx.font = `${fontPx}px ${text.style.fontFamily || "system-ui"}`;
  ctx.textBaseline = "top";
  wrapText(ctx, BASE_CARD_TEXT, pad, pad, w - pad*2, Math.floor(fontPx * 1.45));

  const items = Array.from(layer.querySelectorAll(".placed"));
  for(const el of items){
    const relX = parseFloat(el.dataset.relX);
    const relY = parseFloat(el.dataset.relY);
    const s = parseFloat(el.dataset.scale || "1");
    const size = 64 * 2 * s;
    const x = relX * w;
    const y = relY * h;

    const svgEl = el.querySelector("svg");
    if(!svgEl) continue;
    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
    const img = await loadImage(url);
    ctx.drawImage(img, x - size/2, y - size/2, size, size);
  }

  if(logo && getComputedStyle(logo).display !== "none"){
    try{
      const img = await loadImage(logo.src);
      const lh = Math.floor(h * 0.12);
      const lw = Math.floor(lh * (img.width / img.height));
      ctx.globalAlpha = 0.95;
      ctx.drawImage(img, w - pad - lw, h - pad - lh, lw, lh);
      ctx.globalAlpha = 1;
    }catch(e){}
  }

  lastExportDataUrl = canvas.toDataURL("image/png");

  const a = document.createElement("a");
  a.href = lastExportDataUrl;
  a.download = "cartao-natal.png";
  document.body.appendChild(a);
  a.click();
  a.remove();

  return lastExportDataUrl;
}

async function shareExport(){
  if(!lastExportDataUrl){
    await exportPNG();
  }
  if(navigator.share){
    try{
      const blob = dataUrlToBlob(lastExportDataUrl);
      const file = new File([blob], "cartao-natal.png", {type:"image/png"});
      await navigator.share({ files:[file], text:"Cartão de Natal 🎄" });
      return;
    }catch(e){
      shareText(BASE_CARD_TEXT);
      return;
    }
  }
  shareText(BASE_CARD_TEXT);
}

function shareText(text){
  if(navigator.share){
    navigator.share({ text }).catch(()=>{});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
}

/* helpers */
function loadImage(src){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = ()=>resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
function dataUrlToBlob(dataUrl){
  const [head, body] = dataUrl.split(",");
  const mime = head.match(/:(.*?);/)[1];
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], {type:mime});
}
function wrapText(ctx, text, x, y, maxW, lineH){
  const parts = String(text || "").split("\n");
  for(const p of parts){
    const words = p.split(" ");
    let line = "";
    for(const w of words){
      const test = line ? line + " " + w : w;
      if(ctx.measureText(test).width > maxW && line){
        ctx.fillText(line, x, y);
        y += lineH;
        line = w;
      } else {
        line = test;
      }
    }
    if(line){
      ctx.fillText(line, x, y);
      y += lineH;
    }
    y += Math.floor(lineH * 0.5);
  }
  return y;
}
function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}
function drawGradientFallback(ctx, w, h, css){
  const colors = (css.match(/#[0-9a-fA-F]{6}/g) || ["#14213d","#0e1625"]);
  const g = ctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0, colors[0]);
  g.addColorStop(1, colors[1] || colors[0]);
  ctx.fillStyle = g;
  ctx.fillRect(0,0,w,h);
}

/* expose handlers */
window.closeMission = closeMission;
window.goToCard = goToCard;
window.openCustomizer = openCustomizer;
window.closeCustomizer = closeCustomizer;
window.sizeSelected = sizeSelected;
window.removeSelected = removeSelected;
window.exportPNG = exportPNG;
window.shareExport = shareExport;
window.shareTextOnly = shareTextOnly;
window.nextTutorial = nextTutorial;
