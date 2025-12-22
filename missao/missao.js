const openBtn = document.getElementById("openMission");

const BASE_MISSION_TEXT = `Neste Natal a sua missão especial é compartilhar o amor, carinho e ajudar na criação de uma rede que realmente faz a diferença neste mundo.
Muitas vezes a diferença que podemos fazer está muito mais perto do que imaginamos.
Dê um abraço em quem você ama, doe 1kg de alimento ou ore pela paz e saúde de todos.
Todas essas atitudes são valiosíssimas para mudarmos o mundo.
O espírito natalino deve ser de partilha e não de egoísmo, por isso personalize esta mensagem e envie para alguém que você ame e queira que faça parte desta corrente`;

const BASE_CARD_TEXT = `Obrigado por você existir na minha vida. Este não é só um cartão, mas o início de uma corrente de amor e mudança.

Ame quem está ao seu lado, faça uma doação neste natal, ore por quem precisa e o mais importante, sinta isso no seu coração.

Se cada um de nós fizermos só um pouquinho, transformaremos o mundo ao nosso redor.`;

let selectedEl = null;
let tutorialStep = 0;
let lastExportDataUrl = null;

openBtn.onclick = async () => {
  const r = await fetch("missao.html");
  document.body.insertAdjacentHTML("beforeend", await r.text());
  // Fill overlay base text in customizer
  safe(() => {
    document.getElementById("baseTextOverlay").textContent = BASE_CARD_TEXT;
  });
};

function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

function closeMission(){
  // autosave draft before closing
  safe(saveDraft);
  const o = document.getElementById("missionOverlay");
  if(o) o.remove();
}

function goToCard(){
  $(".step-1").classList.add("hidden");
  $(".step-2").classList.remove("hidden");
}

function openCustomizer(){
  const c = document.getElementById("customizer");
  c.classList.remove("hidden");
  // ensure textarea only exists/used here (requirement)
  setupCustomizerOnce();
  restoreDraft();
  syncOverlayText();
}

function closeCustomizer(){
  safe(saveDraft);
  const c = document.getElementById("customizer");
  c.classList.add("hidden");
}

function setupCustomizerOnce(){
  const ta = document.getElementById("customText");
  if(ta.dataset.ready === "1") return;
  ta.dataset.ready = "1";

  // Counter + live overlay sync
  const count = document.getElementById("customCount");
  ta.addEventListener("input", () => {
    count.textContent = ta.value.length;
    syncOverlayText();
  });

  // Also sync initial base text overlay
  document.getElementById("baseTextOverlay").textContent = BASE_CARD_TEXT;

  // Tap empty area clears selection
  const area = document.getElementById("canvasArea");
  area.addEventListener("pointerdown", (e) => {
    if(e.target.id === "canvasArea"){
      setSelected(null);
    }
  });

  // Prevent scroll on touch drag in stage
  area.addEventListener("touchmove", (e) => {
    if(selectedEl) e.preventDefault();
  }, {passive:false});
}

function syncOverlayText(){
  const extra = document.getElementById("customText").value || "";
  const extraBox = document.getElementById("extraTextOverlay");
  extraBox.textContent = extra.trim() ? extra.trim() : "";
}

function allowDrop(e){ e.preventDefault(); }
function drag(e){ e.dataTransfer.setData("src", e.target.src); }

function drop(e){
  e.preventDefault();
  const src = e.dataTransfer.getData("src");
  if(!src) return;

  const area = document.getElementById("canvasArea");
  const rect = area.getBoundingClientRect();
  const x = (e.clientX || (e.touches && e.touches[0]?.clientX) || 0) - rect.left;
  const y = (e.clientY || (e.touches && e.touches[0]?.clientY) || 0) - rect.top;

  const img = document.createElement("img");
  img.src = src;
  img.className = "placed";
  img.style.left = `${x}px`;
  img.style.top = `${y}px`;
  img.dataset.scale = "1";
  img.dataset.x = String(x);
  img.dataset.y = String(y);
  img.draggable = false;

  // pointer-drag to move
  img.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    setSelected(img);
    const startX = ev.clientX;
    const startY = ev.clientY;
    const baseX = parseFloat(img.dataset.x);
    const baseY = parseFloat(img.dataset.y);

    img.setPointerCapture(ev.pointerId);
    const onMove = (mv) => {
      const dx = mv.clientX - startX;
      const dy = mv.clientY - startY;
      setPos(img, baseX + dx, baseY + dy);
    };
    const onUp = () => {
      img.removeEventListener("pointermove", onMove);
      img.removeEventListener("pointerup", onUp);
    };
    img.addEventListener("pointermove", onMove);
    img.addEventListener("pointerup", onUp);
  });

  area.appendChild(img);
  setSelected(img);
  safe(saveDraft);
}

function setPos(el, x, y){
  const area = document.getElementById("canvasArea");
  const rect = area.getBoundingClientRect();
  // constrain a bit inside area
  const pad = 10;
  const cx = Math.max(pad, Math.min(x, rect.width - pad));
  const cy = Math.max(pad, Math.min(y, rect.height - pad));

  el.dataset.x = String(cx);
  el.dataset.y = String(cy);
  el.style.left = `${cx}px`;
  el.style.top = `${cy}px`;
}

function setSelected(el){
  if(selectedEl) selectedEl.classList.remove("selected");
  selectedEl = el;
  if(selectedEl) selectedEl.classList.add("selected");
}

function sizeSelected(mult){
  if(!selectedEl) return;
  let s = parseFloat(selectedEl.dataset.scale || "1");
  s = Math.max(0.5, Math.min(2.2, s * mult));
  selectedEl.dataset.scale = String(s);
  selectedEl.style.transform = `translate(-50%,-50%) scale(${s})`;
  safe(saveDraft);
}

function removeSelected(){
  if(!selectedEl) return;
  const toRemove = selectedEl;
  setSelected(null);
  toRemove.remove();
  safe(saveDraft);
}

function clearAll(){
  const area = document.getElementById("canvasArea");
  $all("#canvasArea .placed").forEach(n => n.remove());
  document.getElementById("customText").value = "";
  document.getElementById("customCount").textContent = "0";
  syncOverlayText();
  setSelected(null);
  safe(saveDraft);
}

/* Tutorial (guided, blurred, arrows) */
function startTutorial(){
  tutorialStep = 0;
  $("#tutorial").classList.remove("hidden");
  renderTutorial();
}
function skipTutorial(){
  $("#tutorial").classList.add("hidden");
}
function nextTutorial(){
  tutorialStep++;
  if(tutorialStep > 2){ skipTutorial(); return; }
  renderTutorial();
}
function renderTutorial(){
  const body = document.getElementById("coachBody");
  const a1 = document.querySelector(".arrow.a1");
  const a2 = document.querySelector(".arrow.a2");
  a1.style.display = "none";
  a2.style.display = "none";

  if(tutorialStep === 0){
    body.textContent = "1) Escreva uma mensagem extra (opcional). Ela aparece abaixo do texto padrão.";
    a2.style.display = "block";
  } else if(tutorialStep === 1){
    body.textContent = "2) Arraste um item natalino para o cartão. Depois, toque nele e mova com o dedo.";
    a1.style.display = "block";
  } else {
    body.textContent = "3) Toque no item para selecionar e use ➖ / ➕ para ajustar o tamanho. Depois exporte a imagem!";
    a2.style.display = "block";
  }
}

/* Draft persistence */
function saveDraft(){
  const ta = document.getElementById("customText");
  if(!ta) return;

  const items = $all("#canvasArea .placed").map(el => ({
    src: el.src,
    x: parseFloat(el.dataset.x),
    y: parseFloat(el.dataset.y),
    scale: parseFloat(el.dataset.scale || "1")
  }));

  const payload = {
    extra: ta.value,
    items
  };
  localStorage.setItem("missao_especial_draft_v3", JSON.stringify(payload));
}

function restoreDraft(){
  const raw = localStorage.getItem("missao_especial_draft_v3");
  if(!raw) {
    // seed overlay base
    document.getElementById("baseTextOverlay").textContent = BASE_CARD_TEXT;
    return;
  }
  const data = JSON.parse(raw);
  const ta = document.getElementById("customText");
  ta.value = data.extra || "";
  document.getElementById("customCount").textContent = String(ta.value.length);
  syncOverlayText();

  const area = document.getElementById("canvasArea");
  $all("#canvasArea .placed").forEach(n => n.remove());
  (data.items || []).forEach(it => {
    const img = document.createElement("img");
    img.src = it.src;
    img.className = "placed";
    img.dataset.x = String(it.x);
    img.dataset.y = String(it.y);
    img.dataset.scale = String(it.scale || 1);
    img.style.left = `${it.x}px`;
    img.style.top = `${it.y}px`;
    img.style.transform = `translate(-50%,-50%) scale(${it.scale || 1})`;
    img.draggable = false;

    img.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      setSelected(img);
      const startX = ev.clientX;
      const startY = ev.clientY;
      const baseX = parseFloat(img.dataset.x);
      const baseY = parseFloat(img.dataset.y);

      img.setPointerCapture(ev.pointerId);
      const onMove = (mv) => {
        const dx = mv.clientX - startX;
        const dy = mv.clientY - startY;
        setPos(img, baseX + dx, baseY + dy);
      };
      const onUp = () => {
        img.removeEventListener("pointermove", onMove);
        img.removeEventListener("pointerup", onUp);
      };
      img.addEventListener("pointermove", onMove);
      img.addEventListener("pointerup", onUp);
    });

    area.appendChild(img);
  });
}

/* Share flow */
function shareQuick(){
  const text = BASE_CARD_TEXT;
  shareText(text);
}

async function shareExport(){
  // ensure export exists
  if(!lastExportDataUrl){
    await exportPNG();
  }
  if(navigator.share){
    // Try file share
    try{
      const blob = dataUrlToBlob(lastExportDataUrl);
      const file = new File([blob], "cartao-natal.png", {type:"image/png"});
      await navigator.share({ files: [file], text: "Meu cartão de Natal 🎄" });
      return;
    }catch(e){
      // fallback to text
      shareText(buildShareText());
      return;
    }
  }
  // Fallback: open whatsapp with text
  shareText(buildShareText());
}

function buildShareText(){
  const extra = (document.getElementById("customText")?.value || "").trim();
  return BASE_CARD_TEXT + (extra ? "\n\n" + extra : "");
}

function shareText(text){
  if(navigator.share){
    navigator.share({ text }).catch(()=>{});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
}

/* Export to PNG by drawing an offscreen canvas */
async function exportPNG(){
  const area = document.getElementById("canvasArea");
  const rect = area.getBoundingClientRect();
  const w = Math.round(rect.width * 2);   // retina-ish
  const h = Math.round(rect.height * 2);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  // background
  const grad = ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0, "#14213d");
  grad.addColorStop(1, "#0e1625");
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,w,h);

  // soft glows
  drawGlow(ctx, w*0.25, h*0.2, Math.min(w,h)*0.35, "rgba(233,196,106,.18)");
  drawGlow(ctx, w*0.75, h*0.7, Math.min(w,h)*0.35, "rgba(46,196,182,.16)");

  // text
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = `${Math.floor(w*0.032)}px system-ui, -apple-system, Segoe UI, Roboto`;
  ctx.textBaseline = "top";

  const pad = Math.floor(w * 0.055);
  const textBoxW = w - pad*2;
  let y = pad;

  y = wrapText(ctx, BASE_CARD_TEXT, pad, y, textBoxW, Math.floor(w*0.040));
  const extra = (document.getElementById("customText")?.value || "").trim();
  if(extra){
    y += Math.floor(w*0.02);
    ctx.fillStyle = "rgba(255,255,255,.96)";
    y = wrapText(ctx, extra, pad, y, textBoxW, Math.floor(w*0.040));
  }

  // decorations
  const placed = $all("#canvasArea .placed");
  for(const el of placed){
    const img = await loadImage(el.src);
    const sx = parseFloat(el.dataset.x) * 2;
    const sy = parseFloat(el.dataset.y) * 2;
    const scale = parseFloat(el.dataset.scale || "1");
    const baseSize = 64 * 2; // matches CSS width-ish
    const size = baseSize * scale;
    ctx.drawImage(img, sx - size/2, sy - size/2, size, size);
  }

  // logo (optional on export - enabled)
  const logoEl = area.querySelector("img.logo.corner");
  if(logoEl && logoEl.src){
    try{
      const logo = await loadImage(logoEl.src);
      const lh = Math.floor(h * 0.11);
      const lw = Math.floor(lh * (logo.width / logo.height));
      ctx.globalAlpha = 0.95;
      ctx.drawImage(logo, w - pad - lw, h - pad - lh, lw, lh);
      ctx.globalAlpha = 1;
    }catch(e){}
  }

  lastExportDataUrl = canvas.toDataURL("image/png");

  // initiate download
  const a = document.createElement("a");
  a.href = lastExportDataUrl;
  a.download = "cartao-natal.png";
  document.body.appendChild(a);
  a.click();
  a.remove();

  return lastExportDataUrl;
}

function drawGlow(ctx, x, y, r, color){
  const g = ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,ctx.canvas.width, ctx.canvas.height);
}

function wrapText(ctx, text, x, y, maxW, lineH){
  const lines = [];
  const parts = (text || "").split("\n");
  for(const part of parts){
    const words = part.split(" ");
    let line = "";
    for(const w of words){
      const test = line ? line + " " + w : w;
      if(ctx.measureText(test).width > maxW && line){
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    lines.push(line);
    // blank line between paragraphs
    lines.push("");
  }
  // remove last extra blank line
  if(lines.length && lines[lines.length-1] === "") lines.pop();

  for(const ln of lines){
    if(ln === ""){ y += lineH; continue; }
    ctx.fillText(ln, x, y);
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

function dataUrlToBlob(dataUrl){
  const [head, body] = dataUrl.split(",");
  const mime = head.match(/:(.*?);/)[1];
  const bin = atob(body);
  const len = bin.length;
  const arr = new Uint8Array(len);
  for(let i=0;i<len;i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], {type:mime});
}

function safe(fn){
  try{ fn(); } catch(e){ /* noop */ }
}

// expose functions used by inline handlers
window.closeMission = closeMission;
window.goToCard = goToCard;
window.openCustomizer = openCustomizer;
window.closeCustomizer = closeCustomizer;
window.allowDrop = allowDrop;
window.drag = drag;
window.drop = drop;
window.sizeSelected = sizeSelected;
window.removeSelected = removeSelected;
window.clearAll = clearAll;
window.saveDraft = saveDraft;
window.startTutorial = startTutorial;
window.skipTutorial = skipTutorial;
window.nextTutorial = nextTutorial;
window.shareQuick = shareQuick;
window.exportPNG = exportPNG;
window.shareExport = shareExport;
