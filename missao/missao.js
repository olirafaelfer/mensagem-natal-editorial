const openBtn = document.getElementById("openMission");

const CARD_TEXT = `Obrigado por você existir na minha vida. Este não é só um cartão, mas o início de uma corrente de amor e mudança.

Ame quem está ao seu lado, faça uma doação neste natal, ore por quem precisa e o mais importante, sinta isso no seu coração.

Se cada um de nós fizermos só um pouquinho, transformaremos o mundo ao nosso redor.`;

let selected = null;
let lastPngBlob = null;

openBtn.onclick = async () => {
  const r = await fetch("missao.html");
  document.body.insertAdjacentHTML("beforeend", await r.text());
  document.getElementById("cardBodyText").textContent = CARD_TEXT;
};

function closeMission(){ document.getElementById("missionOverlay")?.remove(); }
function goToCard(){
  document.querySelector(".step-1").classList.add("hidden");
  document.querySelector(".step-2").classList.remove("hidden");
}

function openCustomizer(){
  document.getElementById("customizer").classList.remove("hidden");
  initCustomizerOnce();
  applyTypography();
  applyBackground();
}
function closeCustomizer(){ document.getElementById("customizer").classList.add("hidden"); }

function initCustomizerOnce(){
  if(window.__v42_ready) return;
  window.__v42_ready = true;

  const tray = document.getElementById("svgTray");
  getSvgs().forEach(({svg}) => {
    const chip = document.createElement("div");
    chip.className = "svg-chip";
    chip.draggable = true;
    chip.innerHTML = svg;
    chip.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", svg));
    tray.appendChild(chip);
  });

  document.getElementById("fontSelect").addEventListener("change", applyTypography);
  document.getElementById("textColor").addEventListener("input", applyTypography);
  document.getElementById("fontSize").addEventListener("input", applyTypography);
  document.getElementById("bg1").addEventListener("input", applyBackground);
  document.getElementById("bg2").addEventListener("input", applyBackground);

  const canvas = document.getElementById("canvas");
  canvas.addEventListener("pointerdown", (e) => {
    if(e.target.id === "canvas") setSelected(null);
  });
  canvas.addEventListener("touchmove", (e) => {
    if(selected) e.preventDefault();
  }, {passive:false});
}

function applyTypography(){
  const layer = document.getElementById("textLayer");
  layer.style.fontFamily = document.getElementById("fontSelect").value;
  layer.style.color = document.getElementById("textColor").value;
  layer.style.fontSize = document.getElementById("fontSize").value + "px";
  layer.textContent = CARD_TEXT;
}
function applyBackground(){
  const c1 = document.getElementById("bg1").value;
  const c2 = document.getElementById("bg2").value;
  document.getElementById("canvas").style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
}

function allowDrop(e){ e.preventDefault(); }

function dropSvg(e){
  e.preventDefault();
  const svg = e.dataTransfer.getData("text/plain");
  if(!svg) return;

  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX || 0) - rect.left;
  const y = (e.clientY || 0) - rect.top;

  const wrap = document.createElement("div");
  wrap.className = "placed";
  wrap.innerHTML = svg;
  wrap.dataset.x = String(x);
  wrap.dataset.y = String(y);
  wrap.dataset.s = "1";
  wrap.style.left = `${x}px`;
  wrap.style.top = `${y}px`;

  wrap.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    setSelected(wrap);

    const startX = ev.clientX;
    const startY = ev.clientY;
    const baseX = parseFloat(wrap.dataset.x);
    const baseY = parseFloat(wrap.dataset.y);

    wrap.setPointerCapture(ev.pointerId);
    const onMove = (mv) => setPos(wrap, baseX + (mv.clientX - startX), baseY + (mv.clientY - startY));
    const onUp = () => {
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
    };
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
  });

  canvas.appendChild(wrap);
  setSelected(wrap);
}

function setPos(el, x, y){
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const pad = 12;
  const cx = Math.max(pad, Math.min(x, rect.width - pad));
  const cy = Math.max(pad, Math.min(y, rect.height - pad));
  el.dataset.x = String(cx);
  el.dataset.y = String(cy);
  el.style.left = `${cx}px`;
  el.style.top = `${cy}px`;
}

function setSelected(el){
  if(selected) selected.classList.remove("selected");
  selected = el;
  if(selected) selected.classList.add("selected");
}

function nudgeSelected(dx, dy){
  if(!selected) return;
  setPos(selected, parseFloat(selected.dataset.x) + dx, parseFloat(selected.dataset.y) + dy);
}
function scaleSelected(mult){
  if(!selected) return;
  let s = parseFloat(selected.dataset.s || "1");
  s = Math.max(0.5, Math.min(2.2, s * mult));
  selected.dataset.s = String(s);
  selected.style.transform = `translate(-50%,-50%) scale(${s})`;
}
function removeSelected(){
  if(!selected) return;
  const el = selected;
  setSelected(null);
  el.remove();
}

/* Share text fallback */
function shareTextOnly(){
  if(navigator.share) navigator.share({text: CARD_TEXT}).catch(()=>{});
  else window.open(`https://wa.me/?text=${encodeURIComponent(CARD_TEXT)}`, "_blank");
}

/* Export PNG: SVG rasterization */
async function exportPNG(){
  const svgString = await buildExportSvg();
  const blob = new Blob([svgString], {type:"image/svg+xml;charset=utf-8"});
  const url = URL.createObjectURL(blob);

  const img = await loadImage(url);
  URL.revokeObjectURL(url);

  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  c.getContext("2d").drawImage(img, 0, 0);

  lastPngBlob = await new Promise(res => c.toBlob(res, "image/png", 1));

  const a = document.createElement("a");
  a.href = URL.createObjectURL(lastPngBlob);
  a.download = "cartao-natal.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1500);

  return lastPngBlob;
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

async function buildExportSvg(){
  const stage = document.getElementById("canvas");
  const rect = stage.getBoundingClientRect();
  const W = 1200;
  const H = Math.round(1200 * (rect.height / rect.width));
  const pad = 80;

  const bg = stage.style.background || "linear-gradient(135deg,#14213d,#0e1625)";
  const {c1, c2} = parseCssGradient(bg);

  const font = document.getElementById("fontSelect").value.replace(/"/g,"'");
  const color = document.getElementById("textColor").value;
  const size = parseInt(document.getElementById("fontSize").value,10);
  const fontPx = Math.round(size * (W / rect.width));

  const lines = wrapLines(CARD_TEXT, 46);
  const textSvg = lines.map((ln, i) => {
    const y = pad + i * (fontPx * 1.35);
    return `<text x="${pad}" y="${y}" fill="${color}" font-family="${escapeXml(font)}" font-size="${fontPx}" xml:space="preserve">${escapeXml(ln)}</text>`;
  }).join("\n");

  const placed = Array.from(document.querySelectorAll("#canvas .placed"));
  const placedSvgs = placed.map((el) => {
    const x = parseFloat(el.dataset.x) / rect.width * W;
    const y = parseFloat(el.dataset.y) / rect.height * H;
    const s = parseFloat(el.dataset.s || "1");
    const base = 160;
    const sz = base * s;
    const inner = el.innerHTML
      .replace(/width="[^"]*"/g, "")
      .replace(/height="[^"]*"/g, "")
      .replace(/<svg\b/, `<svg width="${sz}" height="${sz}"`);
    return `<g transform="translate(${x - sz/2},${y - sz/2})">${inner}</g>`;
  }).join("\n");

  // Logo (if available)
  let logoTag = "";
  const logoEl = document.querySelector("#canvas img.logo.corner");
  if(logoEl && logoEl.src){
    try{
      const dataUrl = await toDataURL(logoEl.src);
      const lh = 110, lw = 320;
      logoTag = `<image href="${dataUrl}" x="${W - pad - lw}" y="${H - pad - lh}" width="${lw}" height="${lh}" opacity="0.95" />`;
    }catch(e){}
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  ${textSvg}
  ${placedSvgs}
  ${logoTag}
</svg>`.trim();
}

function wrapLines(text, maxChars){
  const parts = (text||"").split("\n");
  const out = [];
  for(const part of parts){
    if(!part.trim()){ out.push(""); continue; }
    const words = part.split(" ");
    let line = "";
    for(const w of words){
      const test = line ? line + " " + w : w;
      if(test.length > maxChars && line){
        out.push(line);
        line = w;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

function parseCssGradient(bg){
  const m = bg.match(/linear-gradient\([^,]+,\s*([^,]+),\s*([^)]+)\)/i);
  if(!m) return {c1:"#14213d", c2:"#0e1625"};
  return {c1:m[1].trim(), c2:m[2].trim()};
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

function escapeXml(s){
  return String(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&apos;");
}

/* SVG library */
function getSvgs(){
  const c = `fill="none" stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"`;
  return [
    {svg:`<svg viewBox="0 0 128 128" aria-hidden="true">
      <path ${c} d="M64 10 L36 44 H92 Z"/>
      <path ${c} d="M64 30 L26 72 H102 Z"/>
      <path ${c} d="M64 52 L18 100 H110 Z"/>
      <path ${c} d="M56 100 V118 H72 V100"/>
      <circle cx="64" cy="10" r="6" fill="white"/>
    </svg>`},
    {svg:`<svg viewBox="0 0 128 128" aria-hidden="true">
      <rect x="18" y="52" width="92" height="62" rx="10" fill="rgba(255,255,255,.12)" stroke="white" stroke-width="8"/>
      <path ${c} d="M18 52 H110"/>
      <path ${c} d="M64 52 V114"/>
      <path ${c} d="M40 52 C26 52 26 30 44 30 C58 30 64 52 64 52"/>
      <path ${c} d="M88 52 C102 52 102 30 84 30 C70 30 64 52 64 52"/>
    </svg>`},
    {svg:`<svg viewBox="0 0 128 128" aria-hidden="true">
      <path ${c} d="M64 16 V112"/>
      <path ${c} d="M20 38 L108 90"/>
      <path ${c} d="M108 38 L20 90"/>
    </svg>`},
  ];
}

// expose for inline handlers
window.closeMission = closeMission;
window.goToCard = goToCard;
window.openCustomizer = openCustomizer;
window.closeCustomizer = closeCustomizer;
window.allowDrop = allowDrop;
window.dropSvg = dropSvg;
window.nudgeSelected = nudgeSelected;
window.scaleSelected = scaleSelected;
window.removeSelected = removeSelected;
window.shareTextOnly = shareTextOnly;
window.exportPNG = exportPNG;
window.shareImage = shareImage;
