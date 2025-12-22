const openBtn = document.getElementById("openMission");

const CARD_TEXT = `Obrigado por você existir na minha vida. Este não é só um cartão, mas o início de uma corrente de amor e mudança.

Ame quem está ao seu lado, faça uma doação neste natal, ore por quem precisa e o mais importante, sinta isso no seu coração.

Se cada um de nós fizermos só um pouquinho, transformaremos o mundo ao nosso redor.`;

const EMOJIS = [
  {name:"Presente", ch:"🎁"},
  {name:"Árvore", ch:"🎄"},
  {name:"Estrela", ch:"⭐"},
  {name:"Rena", ch:"🦌"},
  {name:"Papai Noel", ch:"🎅"},
  {name:"Neve", ch:"❄️"},
  {name:"Biscoito", ch:"🍪"},
  {name:"Bolo (panetone)", ch:"🍰"},
];

let selected = null;
let tutorialStep = 0;
let lastPngBlob = null;

// Prevent double-binding even if overlay reopened
let tutorialBound = false;

openBtn.onclick = async () => {
  const r = await fetch("missao.html");
  document.body.insertAdjacentHTML("beforeend", await r.text());
  document.getElementById("cardBodyText").textContent = CARD_TEXT;
};

function closeMission(){
  const o = document.getElementById("missionOverlay");
  if(o) o.remove();
}
function goToCard(){
  document.querySelector(".step-1").classList.add("hidden");
  document.querySelector(".step-2").classList.remove("hidden");
}

function openCustomizer(){
  const c = document.getElementById("customizer");
  c.classList.remove("hidden");
  initCustomizer();
  applyTypography();
  applyBackground();
  startTutorialAuto();
}

function closeCustomizer(){
  document.getElementById("customizer").classList.add("hidden");
  endTutorial();
}

function initCustomizer(){
  if(window.__mission_v6_ready) return;
  window.__mission_v6_ready = true;

  // Emoji tray
  const tray = document.getElementById("emojiTray");
  EMOJIS.forEach(e => {
    const chip = document.createElement("div");
    chip.className = "emoji-chip";
    chip.textContent = e.ch;
    chip.title = e.name;

    chip.draggable = true; // desktop
    chip.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.setData("text/plain", e.ch);
    });

    // tap/click to add
    chip.addEventListener("click", () => addSticker(e.ch));

    tray.appendChild(chip);
  });

  // Controls
  document.getElementById("fontSelect").addEventListener("change", applyTypography);
  document.getElementById("textColor").addEventListener("input", applyTypography);
  document.getElementById("fontSize").addEventListener("input", applyTypography);
  document.getElementById("bg1").addEventListener("input", applyBackground);
  document.getElementById("bg2").addEventListener("input", applyBackground);

  // Canvas DnD for desktop
  const canvas = document.getElementById("canvas");
  canvas.addEventListener("dragover", (e)=>e.preventDefault());
  canvas.addEventListener("drop", (e)=>{
    e.preventDefault();
    const ch = e.dataTransfer.getData("text/plain");
    if(!ch) return;
    addSticker(ch, e.clientX, e.clientY);
  });

  // Clear selection when clicking empty canvas
  canvas.addEventListener("pointerdown", (e) => {
    if(e.target.id === "canvas") setSelected(null);
  });

  // Prevent scroll while dragging a sticker
  canvas.addEventListener("touchmove", (e) => {
    if(selected) e.preventDefault();
  }, {passive:false});
}

function applyTypography(){
  const font = document.getElementById("fontSelect").value;
  const color = document.getElementById("textColor").value;
  const size = document.getElementById("fontSize").value;

  const layer = document.getElementById("textLayer");
  layer.style.fontFamily = font;
  layer.style.color = color;
  layer.style.fontSize = `${size}px`;
  layer.textContent = CARD_TEXT;
}

function applyBackground(){
  const c1 = document.getElementById("bg1").value;
  const c2 = document.getElementById("bg2").value;
  document.getElementById("canvas").style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
}

/* Stickers */
function addSticker(ch, clientX=null, clientY=null){
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const x = clientX == null ? rect.width/2 : (clientX - rect.left);
  const y = clientY == null ? rect.height/2 : (clientY - rect.top);

  const el = document.createElement("div");
  el.className = "sticker";
  el.textContent = ch;
  el.dataset.x = String(x);
  el.dataset.y = String(y);
  el.dataset.scale = "1";
  placeEl(el, x, y, 1);

  el.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    setSelected(el);

    const startX = ev.clientX;
    const startY = ev.clientY;
    const baseX = parseFloat(el.dataset.x);
    const baseY = parseFloat(el.dataset.y);

    el.setPointerCapture(ev.pointerId);
    const onMove = (mv) => {
      const dx = mv.clientX - startX;
      const dy = mv.clientY - startY;
      setPos(el, baseX + dx, baseY + dy);
    };
    const onUp = () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
  });

  canvas.appendChild(el);
  setSelected(el);
}

function placeEl(el, x, y, scale){
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.transform = `translate(-50%,-50%) scale(${scale})`;
}

function setPos(el, x, y){
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const pad = 18;
  const cx = Math.max(pad, Math.min(x, rect.width - pad));
  const cy = Math.max(pad, Math.min(y, rect.height - pad));
  el.dataset.x = String(cx);
  el.dataset.y = String(cy);
  placeEl(el, cx, cy, parseFloat(el.dataset.scale||"1"));
}

function setSelected(el){
  if(selected) selected.classList.remove("selected");
  selected = el;
  if(selected) selected.classList.add("selected");
}

function scaleSelected(mult){
  if(!selected) return;
  let s = parseFloat(selected.dataset.scale || "1");
  s = Math.max(0.55, Math.min(2.4, s * mult));
  selected.dataset.scale = String(s);
  placeEl(selected, parseFloat(selected.dataset.x), parseFloat(selected.dataset.y), s);
}

function removeSelected(){
  if(!selected) return;
  const el = selected;
  setSelected(null);
  el.remove();
}

/* Share text only */
function shareTextOnly(){
  const text = CARD_TEXT;
  if(navigator.share){
    navigator.share({text}).catch(()=>{});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank");
  }
}

/* Export PNG */
async function exportPNG(){
  const stage = document.getElementById("canvas");
  const rect = stage.getBoundingClientRect();
  const W = 1400;
  const H = Math.round(W * (rect.height / rect.width));
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  const bg = stage.style.background || "linear-gradient(135deg,#0b1b3a,#070b14)";
  const {c1,c2} = parseCssGradient(bg);
  const grad = ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,c1); grad.addColorStop(1,c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,H);

  drawGlow(ctx, W*0.26, H*0.22, Math.min(W,H)*0.30, "rgba(46,196,182,.22)");
  drawGlow(ctx, W*0.78, H*0.72, Math.min(W,H)*0.30, "rgba(233,196,106,.18)");

  const font = document.getElementById("fontSelect").value;
  const color = document.getElementById("textColor").value;
  const size = parseInt(document.getElementById("fontSize").value,10);
  const fontPx = Math.round(size * (W / rect.width));

  ctx.fillStyle = color;
  ctx.font = `${fontPx}px ${font}`;
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,.45)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 3;

  const pad = Math.round(W*0.06);
  const maxW = W - pad*2;
  let y = pad;
  y = wrapText(ctx, CARD_TEXT, pad, y, maxW, Math.round(fontPx*1.35));

  // stickers
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 6;
  ctx.shadowColor = "rgba(0,0,0,.55)";
  const stickers = Array.from(document.querySelectorAll("#canvas .sticker"));
  for(const el of stickers){
    const x = parseFloat(el.dataset.x) / rect.width * W;
    const y2 = parseFloat(el.dataset.y) / rect.height * H;
    const scale = parseFloat(el.dataset.scale || "1");
    const sPx = Math.round(56 * (W / rect.width) * scale);
    ctx.font = `${sPx}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui`;
    ctx.fillText(el.textContent, x - sPx/2, y2 - sPx/2);
  }

  // logo
  const logo = document.querySelector("#canvas img.logo.corner");
  if(logo && logo.src){
    try{
      const dataUrl = await toDataURL(logo.src);
      const img = await loadImage(dataUrl);
      const lh = Math.round(H*0.10);
      const lw = Math.round(lh * (img.width / img.height));
      ctx.shadowBlur = 18;
      ctx.shadowColor = "rgba(0,0,0,.45)";
      ctx.drawImage(img, W - pad - lw, H - pad - lh, lw, lh);
    }catch(e){}
  }

  const blob = await new Promise(res => canvas.toBlob(res,"image/png",1));
  lastPngBlob = blob;

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "cartao-natal.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 2000);

  return blob;
}

async function shareImage(){
  try{
    const blob = lastPngBlob || await exportPNG();
    const file = new File([blob], "cartao-natal.png", {type:"image/png"});
    if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({files:[file], text:"Feliz Natal! 🎄"});
      return;
    }
  }catch(e){}
  shareTextOnly();
}

/* helpers */
function parseCssGradient(bg){
  const m = bg.match(/linear-gradient\([^,]+,\s*([^,]+),\s*([^)]+)\)/i);
  if(!m) return {c1:"#0b1b3a", c2:"#070b14"};
  return {c1:m[1].trim(), c2:m[2].trim()};
}
function drawGlow(ctx, x, y, r, color){
  const g = ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color);
  g.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,ctx.canvas.width, ctx.canvas.height);
}
function wrapText(ctx, text, x, y, maxW, lineH){
  const parts = (text||"").split("\n");
  for(const part of parts){
    if(!part.trim()){ y += lineH; continue; }
    const words = part.split(" ");
    let line = "";
    for(const w of words){
      const test = line ? line + " " + w : w;
      if(ctx.measureText(test).width > maxW && line){
        ctx.fillText(line, x, y);
        y += lineH;
        line = w;
      } else line = test;
    }
    ctx.fillText(line, x, y);
    y += lineH;
  }
  return y;
}
function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
async function toDataURL(url){
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

/* Tutorial: refactor state machine (fix 3/3 freeze) */
function startTutorialAuto(){
  tutorialStep = 0;
  const t = document.getElementById("tutorial");
  t.classList.remove("hidden");

  // Bind button exactly once, and never rely on inline onclick
  if(!tutorialBound){
    tutorialBound = true;
    const btn = document.getElementById("coachNext");
    btn.addEventListener("click", () => {
      // Always works even if overlay re-rendered; we just update content.
      advanceTutorial();
    }, {passive:true});
  }

  renderTutorial();
}

function endTutorial(){
  const t = document.getElementById("tutorial");
  if(t) t.classList.add("hidden");
}

function advanceTutorial(){
  // 0 -> 1 -> 2 -> close (robust)
  if(tutorialStep >= 2){
    endTutorial();
    return;
  }
  tutorialStep += 1;
  renderTutorial();
}

function renderTutorial(){
  const title = document.getElementById("coachTitle");
  const body = document.getElementById("coachBody");
  const btn = document.getElementById("coachNext");
  const sStage = document.getElementById("spotStage");
  const sCtrl = document.getElementById("spotControls");
  const sTray = document.getElementById("spotTray");
  [sStage,sCtrl,sTray].forEach(s => s.style.display = "none");

  if(tutorialStep === 0){
    title.textContent = "1/3 — Estilo do texto";
    body.textContent = "A mensagem já está no cartão. Ajuste fonte, cor e fundo para deixar mais bonito.";
    sCtrl.style.display = "block";
    btn.textContent = "Próximo";
  } else if(tutorialStep === 1){
    title.textContent = "2/3 — Adicione enfeites";
    body.textContent = "Clique/tap em um emoji para adicionar. No PC, você também pode arrastar para o cartão.";
    sTray.style.display = "block";
    btn.textContent = "Próximo";
  } else {
    title.textContent = "3/3 — Posicione e compartilhe";
    body.textContent = "Arraste o emoji no cartão para mover. Use ➕➖ e 🗑 para ajustar. Depois exporte ou compartilhe.";
    sStage.style.display = "block";
    btn.textContent = "Começar";
  }
}

// Backward compat: if any old inline exists
window.nextTutorial = advanceTutorial;

// expose handlers
window.closeMission = closeMission;
window.goToCard = goToCard;
window.openCustomizer = openCustomizer;
window.closeCustomizer = closeCustomizer;
window.shareTextOnly = shareTextOnly;
window.scaleSelected = scaleSelected;
window.removeSelected = removeSelected;
window.exportPNG = exportPNG;
window.shareImage = shareImage;
