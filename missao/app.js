/* Cartão personalizável + compartilhável (link + imagem)
   - Sem bibliotecas externas
   - Render de PNG via SVG -> Canvas (mais consistente no mobile)
*/
const $ = (sel, root=document) => root.querySelector(sel);

// Mensagens fixas (o usuário escolhe 1 das opções)
// Observação: são frases comuns de cartão, inspiradas em listas públicas e levemente adaptadas.
const MESSAGE_OPTIONS = [
  {
    id: "m1",
    title: "Paz e amor",
    text: "Feliz Natal!\n\nQue a paz e o amor preencham o seu coração hoje e em todos os dias do ano. 🎄✨"
  },
  {
    id: "m2",
    title: "Magia do Natal",
    text: "Boas Festas!\n\nQue a magia do Natal ilumine sua casa com alegria, união e esperança. ✨"
  },
  {
    id: "m3",
    title: "Gratidão",
    text: "Feliz Natal!\n\nQue este tempo seja de gratidão, carinho e momentos simples que viram memórias. 🎁"
  },
  {
    id: "m4",
    title: "Saúde e luz",
    text: "Boas Festas!\n\nDesejo um Natal com saúde, luz e sorrisos — e um novo ano cheio de boas notícias. 🕊️"
  },
  {
    id: "m5",
    title: "Presença",
    text: "Feliz Natal!\n\nQue o melhor presente seja estar perto de quem importa. Muito amor e boas festas! ❤️"
  }
];

// Temas prontos (mais rápido e mais bonito do que ficar só em 2 inputs de cor)
const THEMES = [
  { id: "t1", name: "Noite Aurora", bg1: "#071626", bg2: "#1b9aaa", text: "#ffffff", pattern: "stars" },
  { id: "t2", name: "Vermelho Clássico", bg1: "#7a0b1a", bg2: "#d62828", text: "#ffffff", pattern: "snow" },
  { id: "t3", name: "Verde Natal", bg1: "#0b3d2e", bg2: "#2a9d8f", text: "#ffffff", pattern: "snow" },
  { id: "t4", name: "Doce Neve", bg1: "#0a2a66", bg2: "#b5179e", text: "#ffffff", pattern: "dots" },
  { id: "t5", name: "Champanhe", bg1: "#2b2d42", bg2: "#f2cc8f", text: "#0b0f1a", pattern: "none" },
  { id: "t6", name: "Candy", bg1: "#2ec4b6", bg2: "#ff6b6b", text: "#0b0f1a", pattern: "dots" },
  { id: "t7", name: "Ametista", bg1: "#240046", bg2: "#7b2cbf", text: "#ffffff", pattern: "stars" },
  { id: "t8", name: "Neve Minimal", bg1: "#111827", bg2: "#334155", text: "#ffffff", pattern: "snow" }
];

const PATTERNS = [
  { id: "none", name: "Sem" },
  { id: "snow", name: "Neve" },
  { id: "stars", name: "Estrelas" },
  { id: "dots", name: "Pontos" },
];

const DEFAULT_STATE = {
  messageId: "m1",
  font: "system",
  fontSize: 16,
  textColor: "#ffffff",
  themeId: "t4",
  bg1: "#0a2a66",
  bg2: "#b5179e",
  patternId: "dots",
  showLogo: false,
  stickers: [] // {id, xPct, yPct, scale}
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));
let selectedStickerId = null;

let logoDataUrl = null;
async function ensureLogoDataUrl(){
  if(logoDataUrl) return logoDataUrl;
  try{
    const r = await fetch("assets/logo-natal.png", { cache: "force-cache" });
    const b = await r.blob();
    logoDataUrl = await blobToDataUrl(b);
    return logoDataUrl;
  }catch(_){
    logoDataUrl = null;
    return null;
  }
}
function blobToDataUrl(blob){
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}


/* ---------- Sticker SVGs (simples, leves) ---------- */
const STICKERS = [
  {
    id: "star",
    label: "Estrela",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M32 4l7.6 17.6L58 24l-14 12 4.2 18L32 44.8 15.8 54 20 36 6 24l18.4-2.4L32 4z" fill="currentColor"/>
    </svg>`
  },
  {
    id: "snow",
    label: "Neve",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M31 6h2v52h-2zM6 31h52v2H6z" fill="currentColor"/>
      <path d="M12 12l40 40M52 12L12 52" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: "heart",
    label: "Coração",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M32 56S8 41 8 24c0-7 5-12 12-12 5 0 9 3 12 7 3-4 7-7 12-7 7 0 12 5 12 12 0 17-24 32-24 32z" fill="currentColor"/>
    </svg>`
  },
  {
    id: "bell",
    label: "Sino",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M32 6c-8 0-14 6-14 14v11c0 4-2 8-6 11v4h40v-4c-4-3-6-7-6-11V20c0-8-6-14-14-14z" fill="currentColor"/>
      <path d="M26 54a6 6 0 0 0 12 0" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: "tree",
    label: "Árvore",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M32 6l-10 14h6L16 36h8L12 52h40L40 36h8L36 20h6L32 6z" fill="currentColor"/>
      <path d="M28 52h8v8h-8z" fill="currentColor"/>
    </svg>`
  },
  {
    id: "gift",
    label: "Presente",
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M8 28h48v10H8z" fill="currentColor"/>
      <path d="M10 38h44v20H10z" fill="currentColor" opacity=".9"/>
      <path d="M30 28h4v30h-4z" fill="#fff" opacity=".35"/>
      <path d="M24 16c0 4 4 6 8 6-2-4-2-10-8-10-2 0-4 2-4 4 0 1 1 2 2 2z" fill="currentColor"/>
      <path d="M40 16c0 4-4 6-8 6 2-4 2-10 8-10 2 0 4 2 4 4 0 1-1 2-2 2z" fill="currentColor"/>
    </svg>`
  },
];

function fontFamilyFromKey(k){
  if(k === "serif") return "ui-serif, Georgia, 'Times New Roman', serif";
  if(k === "mono") return "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";
  return "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
}

/* ---------- Base64URL helpers ---------- */
function b64urlEncode(str){
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function b64urlDecode(str){
  const pad = str.length % 4 ? '='.repeat(4 - (str.length % 4)) : '';
  const s = (str + pad).replace(/-/g,'+').replace(/_/g,'/');
  return decodeURIComponent(escape(atob(s)));
}

/* ---------- Modal open/close ---------- */
const modal = $("#modal");
const btnOpen = $("#btnOpen");
const btnOpenFromUrl = $("#btnOpenFromUrl");

function openModal(){
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function closeModal(){
  modal.classList.add("hidden");
  document.body.style.overflow = "";
  selectedStickerId = null;
  updateSelectionUI();
}

btnOpen.addEventListener("click", () => { openModal(); });
btnOpenFromUrl.addEventListener("click", () => {
  loadStateFromUrl(true);
  openModal();
});

modal.addEventListener("click", (e) => {
  const t = e.target;
  if(t && t.matches("[data-close]")) closeModal();
});

/* ---------- Bind controls ---------- */
const card = $("#card");
const cardMsg = $("#cardMessage");
const cardLogo = $("#cardLogo");
const stickerLayer = $("#stickerLayer");
const tray = $("#stickerTray");
const messagePills = $("#messagePills");
const themeGrid = $("#themeGrid");
const patternPills = $("#patternPills");
const selFont = $("#selFont");
const rngFontSize = $("#rngFontSize");
const colText = $("#colText");
const colBg1 = $("#colBg1");
const colBg2 = $("#colBg2");
const chkLogo = $("#chkLogo");

const btnExport = $("#btnExport");
const btnShareImg = $("#btnShareImg");
const btnShareLink = $("#btnShareLink");

const btnMinus = $("#btnMinus");
const btnPlus = $("#btnPlus");
const btnDelete = $("#btnDelete");
const selStatus = $("#selStatus");

/* ---------- Rendering ---------- */
function applyState(){
  const msg = MESSAGE_OPTIONS.find(m => m.id === state.messageId) || MESSAGE_OPTIONS[0];
  cardMsg.textContent = msg.text;
  cardMsg.style.fontFamily = fontFamilyFromKey(state.font);
  cardMsg.style.fontSize = `${Number(state.fontSize)||16}px`;
  cardMsg.style.color = state.textColor || "#fff";
  card.style.background = `linear-gradient(135deg, ${state.bg1}, ${state.bg2})`;

  // pattern as CSS variable (data-uri svg)
  card.style.setProperty("--pattern", patternCssUrl(state.patternId));

  if(state.showLogo) cardLogo.classList.remove("hidden");
  else cardLogo.classList.add("hidden");

  renderStickers();
}

function renderStickers(){
  stickerLayer.innerHTML = "";
  for(const s of state.stickers){
    const def = STICKERS.find(x => x.id === s.id) || STICKERS[0];
    const el = document.createElement("div");
    el.className = "sticker" + (s._uid === selectedStickerId ? " sticker--selected" : "");
    el.dataset.uid = s._uid;
    el.style.left = `${s.xPct}%`;
    el.style.top = `${s.yPct}%`;
    el.style.transform = `translate(-50%,-50%) scale(${s.scale})`;
    el.style.color = "#ffffff";
    el.innerHTML = def.svg;

    el.addEventListener("pointerdown", onStickerPointerDown);
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      selectSticker(s._uid);
    });

    stickerLayer.appendChild(el);
  }
}

function updateSelectionUI(){
  if(!selectedStickerId){
    selStatus.textContent = "Nenhum enfeite selecionado";
    return;
  }
  const idx = state.stickers.findIndex(x => x._uid === selectedStickerId);
  if(idx === -1){
    selectedStickerId = null;
    selStatus.textContent = "Nenhum enfeite selecionado";
    return;
  }
  selStatus.textContent = `Enfeite selecionado: ${state.stickers[idx].id}`;
}

function selectSticker(uid){
  selectedStickerId = uid;
  updateSelectionUI();
  renderStickers();
}

/* click empty area to clear selection */
card.addEventListener("click", () => {
  selectedStickerId = null;
  updateSelectionUI();
  renderStickers();
});

/* ---------- Sticker Tray ---------- */
function buildTray(){
  tray.innerHTML = "";
  for(const s of STICKERS){
    const b = document.createElement("button");
    b.className = "trayBtn";
    b.type = "button";
    b.title = s.label;
    b.style.color = "#ffffff";
    b.innerHTML = s.svg;
    b.addEventListener("click", () => addSticker(s.id));
    tray.appendChild(b);
  }
}

/* ---------- Add / move stickers ---------- */
function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function addSticker(id){
  // center-ish
  state.stickers.push({
    _uid: uid(),
    id,
    xPct: 78,
    yPct: 20,
    scale: 1
  });
  selectSticker(state.stickers[state.stickers.length - 1]._uid);
  persistToUrl();
  applyState();
}

let drag = null;

function onStickerPointerDown(e){
  e.preventDefault();
  e.stopPropagation();
  const uid = e.currentTarget.dataset.uid;
  selectSticker(uid);

  const rect = card.getBoundingClientRect();
  const s = state.stickers.find(x => x._uid === uid);
  if(!s) return;

  drag = {
    uid,
    rect,
    startX: e.clientX,
    startY: e.clientY,
    startXPct: s.xPct,
    startYPct: s.yPct
  };

  e.currentTarget.setPointerCapture(e.pointerId);
}

window.addEventListener("pointermove", (e) => {
  if(!drag) return;
  const s = state.stickers.find(x => x._uid === drag.uid);
  if(!s) return;

  const dx = e.clientX - drag.startX;
  const dy = e.clientY - drag.startY;

  const x = (drag.startXPct/100)*drag.rect.width + dx;
  const y = (drag.startYPct/100)*drag.rect.height + dy;

  s.xPct = clamp((x / drag.rect.width) * 100, 0, 100);
  s.yPct = clamp((y / drag.rect.height) * 100, 0, 100);

  renderStickers();
});

window.addEventListener("pointerup", () => {
  if(!drag) return;
  drag = null;
  persistToUrl();
});

/* ---------- Controls ---------- */
selFont.addEventListener("change", () => {
  state.font = selFont.value;
  persistToUrl();
  applyState();
});
rngFontSize.addEventListener("input", () => {
  state.fontSize = Number(rngFontSize.value);
  persistToUrl();
  applyState();
});
colText.addEventListener("input", () => {
  state.textColor = colText.value;
  state.themeId = "custom";
  persistToUrl();
  buildThemeGrid();
  applyState();
});
colBg1.addEventListener("input", () => {
  state.bg1 = colBg1.value;
  state.themeId = "custom";
  persistToUrl();
  buildThemeGrid();
  applyState();
});
colBg2.addEventListener("input", () => {
  state.bg2 = colBg2.value;
  state.themeId = "custom";
  persistToUrl();
  buildThemeGrid();
  applyState();
});
chkLogo.addEventListener("change", () => {
  state.showLogo = chkLogo.checked;
  persistToUrl();
  applyState();
});

btnMinus.addEventListener("click", () => scaleSelected(0.9));
btnPlus.addEventListener("click", () => scaleSelected(1.1));
btnDelete.addEventListener("click", removeSelected);

function scaleSelected(mult){
  if(!selectedStickerId) return;
  const s = state.stickers.find(x => x._uid === selectedStickerId);
  if(!s) return;
  s.scale = clamp(s.scale * mult, 0.5, 2.5);
  persistToUrl();
  renderStickers();
}
function removeSelected(){
  if(!selectedStickerId) return;
  state.stickers = state.stickers.filter(x => x._uid !== selectedStickerId);
  selectedStickerId = null;
  updateSelectionUI();
  persistToUrl();
  applyState();
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

/* ---------- URL state (shareable link) ---------- */
function persistToUrl(){
  // don't persist runtime-only fields
  const clean = {
    ...state,
    stickers: state.stickers.map(({_uid, ...rest}) => rest) // omit uid; regenerated on load
  };
  const json = JSON.stringify(clean);
  location.hash = "s=" + b64urlEncode(json);
}

function loadStateFromUrl(showToastOnFail=false){
  const h = location.hash || "";
  const m = h.match(/s=([^&]+)/);
  if(!m) return false;

  try{
    const raw = b64urlDecode(m[1]);
    const parsed = JSON.parse(raw);
    state = mergeState(parsed);
    // regenerate uids
    state.stickers = (state.stickers || []).map(s => ({ _uid: uid(), ...s }));
    selectedStickerId = null;
    syncControlsFromState();
    applyState();
    return true;
  }catch(err){
    if(showToastOnFail) alert("Não consegui carregar o estado do link.");
    return false;
  }
}

function mergeState(p){
  const merged = JSON.parse(JSON.stringify(DEFAULT_STATE));
  if(typeof p !== "object" || !p) return merged;

  // message is fixed: accept either messageId or (legacy) message string
  if(typeof p.messageId === "string" && MESSAGE_OPTIONS.some(m => m.id === p.messageId)) merged.messageId = p.messageId;
  merged.font = ["system","serif","mono"].includes(p.font) ? p.font : merged.font;
  merged.fontSize = Number.isFinite(Number(p.fontSize)) ? clamp(Number(p.fontSize), 12, 22) : merged.fontSize;
  merged.textColor = typeof p.textColor === "string" ? p.textColor : merged.textColor;
  merged.bg1 = typeof p.bg1 === "string" ? p.bg1 : merged.bg1;
  merged.bg2 = typeof p.bg2 === "string" ? p.bg2 : merged.bg2;
  merged.themeId = typeof p.themeId === "string" ? p.themeId : merged.themeId;
  merged.patternId = typeof p.patternId === "string" ? p.patternId : merged.patternId;
  merged.showLogo = !!p.showLogo;

  merged.stickers = Array.isArray(p.stickers) ? p.stickers
    .filter(x => x && typeof x === "object")
    .map(x => ({
      id: STICKERS.some(s => s.id === x.id) ? x.id : "star",
      xPct: clamp(Number(x.xPct ?? 50), 0, 100),
      yPct: clamp(Number(x.yPct ?? 50), 0, 100),
      scale: clamp(Number(x.scale ?? 1), 0.5, 2.5)
    })) : [];

  return merged;
}

/* ---------- Share link ---------- */
btnShareLink.addEventListener("click", async () => {
  persistToUrl();
  const url = location.href;

  try{
    if(navigator.share){
      await navigator.share({ title: "Cartão", text: "Abre meu cartão:", url });
      return;
    }
  }catch(_){ /* user canceled */ }

  try{
    await navigator.clipboard.writeText(url);
    alert("Link copiado!");
  }catch(_){
    prompt("Copie o link:", url);
  }
});

/* ---------- Export / Share image ---------- */
btnExport.addEventListener("click", async () => {
  const blob = await renderPngBlob();
  downloadBlob(blob, "cartao.png");
});

btnShareImg.addEventListener("click", async () => {
  const blob = await renderPngBlob();
  const file = new File([blob], "cartao.png", { type: "image/png" });

  if(navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share){
    try{
      await navigator.share({ files: [file], title: "Cartão", text: "Feliz Natal! 🎄" });
      return;
    }catch(_){
      // user canceled
    }
  }

  // fallback: download
  downloadBlob(blob, "cartao.png");
  alert("Seu navegador não permite compartilhar arquivos. Fiz o download do PNG.");
});

function downloadBlob(blob, filename){
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function renderPngBlob(){
  if(state.showLogo) await ensureLogoDataUrl();
  // target export size (good for social)
  const W = 1080;
  const H = 1350;

  const svg = buildCardSvg(W, H);
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  const img = await loadImage(svgUrl);
  URL.revokeObjectURL(svgUrl);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, W, H);

  return await new Promise((res) => canvas.toBlob(res, "image/png", 1));
}

function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function escapeXml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&apos;");
}

function buildCardSvg(W, H){
  const pad = 72;
  const msgMaxW = W - pad*2;
  const fontSize = Number(state.fontSize)||16;

  // scale font for export size (preview uses 16px on ~mobile)
  const scale = W / 420; // rough baseline
  const exportFontSize = Math.round(fontSize * scale);

  const family = fontFamilyFromKey(state.font);
  const fill = state.textColor || "#fff";

  // simple wrapping
  const msg = MESSAGE_OPTIONS.find(m => m.id === state.messageId) || MESSAGE_OPTIONS[0];
  const lines = wrapText(msg.text || "", msgMaxW, exportFontSize);
  const lineH = Math.round(exportFontSize * 1.28);
  const totalTextH = lines.length * lineH;
  const startY = H - pad - totalTextH + Math.round(lineH * 0.1);

  const textSvg = lines.map((ln, i) => {
    const y = startY + i*lineH;
    return `<tspan x="${pad}" y="${y}">${escapeXml(ln)}</tspan>`;
  }).join("");

  // stickers
  const stickerGs = (state.stickers || []).map((s) => {
    const def = STICKERS.find(x => x.id === s.id) || STICKERS[0];
    // position in px
    const x = (s.xPct/100) * W;
    const y = (s.yPct/100) * H;
    const size = 160; // base
    const sc = (s.scale || 1) * (W / 1080);
    const tx = x - (size/2)*sc;
    const ty = y - (size/2)*sc;

    // convert currentColor to white-ish; let user customize later if needed
    const svgInner = def.svg.replaceAll("currentColor", "#ffffff");
    return `<g transform="translate(${tx},${ty}) scale(${sc})">
      ${svgInner.replace("<svg", "<svg width=\""+size+"\" height=\""+size+"\"" )}
    </g>`;
  }).join("");

  // logo (optional)
  const logoHref = (state.showLogo && logoDataUrl) ? logoDataUrl : null;
  const logo = logoHref ? `<image href="${escapeXml(logoHref)}" x="${pad-16}" y="${pad-16}" width="140" height="140" />` : "";

  const patternDef = buildPatternDef(state.patternId);
  const patternRect = state.patternId && state.patternId !== "none"
    ? `<rect x="0" y="0" width="${W}" height="${H}" rx="60" fill="url(#pat)" opacity="0.28" style="mix-blend-mode:overlay"/>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${escapeXml(state.bg1)}"/>
      <stop offset="100%" stop-color="${escapeXml(state.bg2)}"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="rgba(0,0,0,.45)"/>
    </filter>
    ${patternDef}
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" rx="60" fill="url(#bg)"/>

  ${patternRect}

  ${logo}

  <g filter="url(#shadow)">${stickerGs}</g>

  <text xml:space="preserve" font-family="${escapeXml(family)}" font-size="${exportFontSize}" font-weight="800" fill="${escapeXml(fill)}"
        style="paint-order: stroke; stroke: rgba(0,0,0,.28); stroke-width: 8px;">
    ${textSvg}
  </text>
</svg>`;
}

/* naive wrap: approximate chars-per-line based on font size.
   (No canvas measurement to keep it simple/fast/offline.)
*/
function wrapText(text, maxWidthPx, fontPx){
  const maxChars = Math.max(10, Math.floor(maxWidthPx / (fontPx * 0.58)));
  const paragraphs = String(text || "").split(/\n/);

  const lines = [];
  for(const p of paragraphs){
    const words = p.split(/\s+/).filter(Boolean);
    if(words.length === 0){
      lines.push("");
      continue;
    }
    let line = "";
    for(const w of words){
      const candidate = line ? (line + " " + w) : w;
      if(candidate.length > maxChars){
        if(line) lines.push(line);
        // hard break long word
        if(w.length > maxChars){
          let start = 0;
          while(start < w.length){
            lines.push(w.slice(start, start + maxChars));
            start += maxChars;
          }
          line = "";
        }else{
          line = w;
        }
      }else{
        line = candidate;
      }
    }
    if(line) lines.push(line);
  }

  // avoid too many lines (still keeps message readable)
  return lines.slice(0, 18);
}

/* ---------- Init ---------- */
function syncControlsFromState(){
  // pills grids are synced separately
  selFont.value = state.font;
  rngFontSize.value = String(state.fontSize);
  colText.value = state.textColor;
  colBg1.value = state.bg1;
  colBg2.value = state.bg2;
  chkLogo.checked = !!state.showLogo;
}

/* ---------- Modern UI: tabs / pills / theme grid ---------- */
function initTabs(){
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll("[data-tab-panel]");

  function setTab(id){
    tabs.forEach(t => {
      const on = t.dataset.tab === id;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    panels.forEach(p => {
      const show = p.dataset.tabPanel === id;
      p.hidden = !show;
    });
  }

  tabs.forEach(t => t.addEventListener("click", () => setTab(t.dataset.tab)));
  setTab("texto");
}

function buildMessagePills(){
  messagePills.innerHTML = "";
  for(const m of MESSAGE_OPTIONS){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pill" + (state.messageId === m.id ? " is-active" : "");
    b.textContent = m.title;
    b.addEventListener("click", () => {
      state.messageId = m.id;
      persistToUrl();
      buildMessagePills();
      applyState();
    });
    messagePills.appendChild(b);
  }
}

function buildPatternPills(){
  patternPills.innerHTML = "";
  for(const p of PATTERNS){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pill" + (state.patternId === p.id ? " is-active" : "");
    b.textContent = p.name;
    b.addEventListener("click", () => {
      state.patternId = p.id;
      persistToUrl();
      buildPatternPills();
      applyState();
    });
    patternPills.appendChild(b);
  }
}

function buildThemeGrid(){
  themeGrid.innerHTML = "";
  for(const t of THEMES){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "themeBtn" + (state.themeId === t.id ? " is-active" : "");
    const sw = document.createElement("div");
    sw.className = "themeSwatch";
    sw.style.background = `linear-gradient(135deg, ${t.bg1}, ${t.bg2})`;
    const nm = document.createElement("div");
    nm.className = "themeName";
    nm.textContent = t.name;
    b.appendChild(sw);
    b.appendChild(nm);
    b.addEventListener("click", () => {
      state.themeId = t.id;
      state.bg1 = t.bg1;
      state.bg2 = t.bg2;
      state.textColor = t.text;
      state.patternId = t.pattern;
      persistToUrl();
      syncControlsFromState();
      buildThemeGrid();
      buildPatternPills();
      applyState();
    });
    themeGrid.appendChild(b);
  }
}

/* ---------- Patterns (CSS + SVG export) ---------- */
function patternCssUrl(id){
  if(!id || id === "none") return "none";
  const svg = patternSvg(id);
  if(!svg) return "none";
  const encoded = encodeURIComponent(svg)
    .replace(/%0A/g, "")
    .replace(/%20/g, " ");
  return `url("data:image/svg+xml,${encoded}")`;
}

function patternSvg(id){
  // Use tiny SVGs for performance
  if(id === "snow"){
    return `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420' viewBox='0 0 420 420'>
      <g fill='rgba(255,255,255,0.75)'>
        <circle cx='60' cy='80' r='2'/><circle cx='120' cy='170' r='1.7'/><circle cx='210' cy='40' r='2.2'/>
        <circle cx='340' cy='110' r='1.8'/><circle cx='300' cy='240' r='2'/><circle cx='90' cy='310' r='2.1'/>
        <circle cx='220' cy='280' r='1.8'/><circle cx='380' cy='320' r='2.2'/><circle cx='150' cy='380' r='1.7'/>
      </g>
    </svg>`;
  }
  if(id === "stars"){
    return `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420' viewBox='0 0 420 420'>
      <g fill='rgba(255,255,255,0.72)'>
        <path d='M60 60l6 14 15 2-11 10 3 15-13-8-13 8 3-15-11-10 15-2z'/>
        <path d='M330 80l5 11 12 2-9 8 2 12-10-6-10 6 2-12-9-8 12-2z'/>
        <path d='M240 300l6 14 15 2-11 10 3 15-13-8-13 8 3-15-11-10 15-2z'/>
      </g>
    </svg>`;
  }
  if(id === "dots"){
    return `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420' viewBox='0 0 420 420'>
      <g fill='rgba(255,255,255,0.6)'>
        <circle cx='40' cy='60' r='2'/><circle cx='120' cy='90' r='2'/><circle cx='220' cy='70' r='2'/><circle cx='320' cy='100' r='2'/>
        <circle cx='80' cy='180' r='2'/><circle cx='170' cy='210' r='2'/><circle cx='260' cy='190' r='2'/><circle cx='360' cy='220' r='2'/>
        <circle cx='50' cy='300' r='2'/><circle cx='140' cy='330' r='2'/><circle cx='240' cy='310' r='2'/><circle cx='350' cy='340' r='2'/>
      </g>
    </svg>`;
  }
  return null;
}

function buildPatternDef(id){
  if(!id || id === "none") return "";
  // In SVG export we just embed a pattern tile as an image
  const svg = patternSvg(id);
  if(!svg) return "";
  const b64 = btoa(unescape(encodeURIComponent(svg)));
  return `<pattern id="pat" patternUnits="userSpaceOnUse" width="420" height="420">
    <image href="data:image/svg+xml;base64,${b64}" width="420" height="420" />
  </pattern>`;
}

buildTray();
loadStateFromUrl(false); // if someone opened via shared link
syncControlsFromState();

initTabs();
buildMessagePills();
buildThemeGrid();
buildPatternPills();

applyState();
updateSelectionUI();
