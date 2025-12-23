
/* Cartão Natalino - v5 (reconstruído)
   - Layout estável sem rolagem da página (mobile-first)
   - Mensagens fixas (5 opções)
   - Texto arrastável + ajuste de tamanho
   - Stickers coloridos (SVG) com drag
   - Logo fixa (assets/logo-natal.png) embutida como data URI para export
   - Estado compartilhável no hash
*/
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const els = {
    svg: $("#cardSvg"),
    defs: $("#svgDefs"),
    bgRect: $("#bgRect"),
    patternLayer: $("#patternLayer"),
    logoImg: $("#logoImg"),

    msgGroup: $("#messageGroup"),
    msgText: $("#msgText"),
    signText: $("#signText"),
    stickersLayer: $("#stickersLayer"),

    hint: $("#hint"),
    toast: $("#toast"),

    // UI
    tabs: $$(".tab"),
    pages: {
      text: $("#tab-text"),
      theme: $("#tab-theme"),
      decor: $("#tab-decor"),
    },

    msgChips: $("#msgChips"),
    fontSelect: $("#fontSelect"),
    fontSize: $("#fontSize"),

    themeGrid: $("#themeGrid"),
    bgA: $("#bgA"),
    bgB: $("#bgB"),
    textColor: $("#textColor"),
    patternSelect: $("#patternSelect"),
    btnRandomTheme: $("#btnRandomTheme"),

    decoGrid: $("#decoGrid"),
    btnClearDecor: $("#btnClearDecor"),
    btnScaleDown: $("#btnScaleDown"),
    btnScaleUp: $("#btnScaleUp"),
    btnDelete: $("#btnDelete"),

    btnExport: $("#btnExport"),
    btnShare: $("#btnShare"),
  };

  const MESSAGES = [
    { title: "Feliz Natal", text: "Feliz Natal! Que sua casa transborde paz e amor." },
    { title: "Boas Festas", text: "Boas festas! Que a alegria de hoje vire um ano inteiro de esperança." },
    { title: "Luz", text: "Que o Natal ilumine seus caminhos e aqueça seu coração." },
    { title: "Gratidão", text: "Que não falte saúde, afeto e motivos para sorrir." },
    { title: "Renove", text: "Que o Natal renove sua fé e seus melhores sonhos." },
  ];

  const FONTS = [
    { id: "Inter", label: "Inter", family: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" },
    { id: "Poppins", label: "Poppins", family: "Poppins, Inter, system-ui, sans-serif" },
    { id: "Nunito", label: "Nunito", family: "Nunito, Inter, system-ui, sans-serif" },
    { id: "Montserrat", label: "Montserrat", family: "Montserrat, Inter, system-ui, sans-serif" },
    { id: "DMSans", label: "DM Sans", family: "\"DM Sans\", Inter, system-ui, sans-serif" },
    { id: "Playfair", label: "Playfair Display", family: "\"Playfair Display\", Georgia, serif" },
    { id: "Merriweather", label: "Merriweather", family: "Merriweather, Georgia, serif" },
    { id: "Pacifico", label: "Pacifico", family: "Pacifico, cursive" },
    { id: "GreatVibes", label: "Great Vibes", family: "\"Great Vibes\", cursive" },
  ];

  const THEMES = [
    { id: "noite", name: "Noite", a: "#0b1220", b: "#0f2a4a", t: "#ffffff", pattern: "stars" },
    { id: "pinheiro", name: "Pinheiro", a: "#052e1a", b: "#14532d", t: "#f8fafc", pattern: "snow" },
    { id: "rubi", name: "Rubi", a: "#3b0a1a", b: "#b91c1c", t: "#fff7ed", pattern: "dots" },
    { id: "champagne", name: "Champagne", a: "#2b1f12", b: "#a16207", t: "#fff7ed", pattern: "waves" },
    { id: "aurora", name: "Aurora", a: "#0a1f2e", b: "#0f766e", t: "#e6fffb", pattern: "snow" },
    { id: "neve", name: "Neve", a: "#0b1220", b: "#334155", t: "#ffffff", pattern: "snow" },
  ];

  // Stickers (SVG snippets). We'll embed the inner SVG as a <g> via DOMParser.
  const STICKERS = [
    { id: "star", name: "Estrela", svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde047"/><stop offset="1" stop-color="#fb7185"/></linearGradient></defs>
      <path d="M32 6l7.6 16.2 17.8 2.5-13 12.6 3.1 17.8L32 46.8 16.5 55l3.1-17.8-13-12.6 17.8-2.5L32 6z" fill="url(#g1)" stroke="rgba(255,255,255,.22)" stroke-width="2"/>
    </svg>` },
    { id: "snow", name: "Neve", svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#60a5fa"/><stop offset="1" stop-color="#a7f3d0"/></linearGradient></defs>
      <path d="M32 6v52M12 16l40 32M52 16L12 48M10 32h44" stroke="url(#g2)" stroke-width="5" stroke-linecap="round" opacity=".95"/>
      <circle cx="32" cy="32" r="4" fill="#e0f2fe"/>
    </svg>` },
    { id: "candy", name: "Bengala", svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M36 10a12 12 0 0 1 12 12c0 6.6-5.4 12-12 12H28v20a6 6 0 0 1-12 0V40h12V28h8a6 6 0 0 0 0-12H20V10h16z" fill="#ffffff"/>
      <path d="M20 10h16v6H20zM20 22h18v6H20zM20 34h14v6H20z" fill="#fb7185"/>
      <path d="M28 34v20a6 6 0 0 1-12 0V34" fill="#fff" opacity=".9"/>
    </svg>` },
    { id: "gift", name: "Presente", svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22c55e"/><stop offset="1" stop-color="#16a34a"/></linearGradient></defs>
      <rect x="10" y="26" width="44" height="28" rx="6" fill="url(#g4)"/>
      <rect x="10" y="22" width="44" height="10" rx="5" fill="#60a5fa" opacity=".95"/>
      <path d="M32 22v32" stroke="#fda4af" stroke-width="6" stroke-linecap="round"/>
      <path d="M22 22c0-6 5-10 10-6 5-4 10 0 10 6" fill="none" stroke="#fda4af" stroke-width="5" stroke-linecap="round"/>
    </svg>` },
    { id: "holly", name: "Azevinho", svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 38c-8-1-12-8-10-15 6 5 12 2 15-3 3 6 9 9 15 3-2 7-6 14-20 15z" fill="#22c55e"/>
      <path d="M44 38c8-1 12-8 10-15-6 5-12 2-15-3-3 6-9 9-15 3 2 7 6 14 20 15z" fill="#16a34a"/>
      <circle cx="32" cy="40" r="7" fill="#ef4444"/>
      <circle cx="28" cy="36" r="2.4" fill="#fff" opacity=".6"/>
    </svg>` },
    { id: "heart", name: "Coração", svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g6" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fb7185"/><stop offset="1" stop-color="#f97316"/></linearGradient></defs>
      <path d="M32 56S10 43 10 26c0-7 5-12 12-12 5 0 8 3 10 6 2-3 5-6 10-6 7 0 12 5 12 12 0 17-22 30-22 30z" fill="url(#g6)" stroke="rgba(255,255,255,.22)" stroke-width="2"/>
    </svg>` },
    { id: "bell", name: "Sino", svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs>
      <path d="M32 8c-10 0-18 8-18 18v8c0 6-3 10-6 12h48c-3-2-6-6-6-12v-8c0-10-8-18-18-18z" fill="url(#g3)" stroke="rgba(255,255,255,.20)" stroke-width="2"/>
      <circle cx="32" cy="52" r="6" fill="#fb7185"/>
      <path d="M24 18h16" stroke="rgba(255,255,255,.55)" stroke-width="5" stroke-linecap="round"/>
    </svg>` },
  ];

  const state = {
    msgIdx: 0,
    fontId: "Inter",
    fontSize: 66,
    msgX: 540,
    msgY: 640,

    themeId: "noite",
    bgA: "#0b1220",
    bgB: "#0f2a4a",
    textColor: "#ffffff",
    pattern: "stars",

    stickers: [],
    selectedStickerKey: null,

    // embedded logo
    logoDataUri: null,
  };

  // drag controllers
  const dragSticker = { key: null, startX: 0, startY: 0, origX: 0, origY: 0 };
  const dragMsg = { active: false, startX: 0, startY: 0, origX: 0, origY: 0 };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function showToast(msg){
    els.toast.textContent = msg;
    els.toast.classList.add("is-visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove("is-visible"), 1600);
  }

  function setActiveTab(tabName){
    els.tabs.forEach(b => b.classList.toggle("is-active", b.dataset.tab === tabName));
    Object.entries(els.pages).forEach(([k, el]) => el.classList.toggle("is-active", k === tabName));
  }

  // ===== SVG helpers =====
  function svgPointFromEvent(ev){
    const pt = els.svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const ctm = els.svg.getScreenCTM();
    return ctm ? pt.matrixTransform(ctm.inverse()) : { x: pt.x, y: pt.y };
  }

  function setGradientBackground(a, b){
    // define a linear gradient in defs
    let grad = $("#bgGrad", els.defs);
    if (!grad){
      grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
      grad.setAttribute("id", "bgGrad");
      grad.setAttribute("x1", "0");
      grad.setAttribute("y1", "0");
      grad.setAttribute("x2", "1");
      grad.setAttribute("y2", "1");
      els.defs.appendChild(grad);

      const s1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      s1.setAttribute("id", "bgStop1");
      s1.setAttribute("offset", "0");
      grad.appendChild(s1);

      const s2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      s2.setAttribute("id", "bgStop2");
      s2.setAttribute("offset", "1");
      grad.appendChild(s2);
    }
    $("#bgStop1", els.defs).setAttribute("stop-color", a);
    $("#bgStop2", els.defs).setAttribute("stop-color", b);
    els.bgRect.setAttribute("fill", "url(#bgGrad)");
  }

  function buildPattern(kind){
    els.patternLayer.innerHTML = "";
    if (kind === "none") return;

    if (kind === "snow"){
      for (let i=0;i<44;i++){
        const c = document.createElementNS("http://www.w3.org/2000/svg","circle");
        c.setAttribute("cx", String(40 + (i*137)%1000));
        c.setAttribute("cy", String(80 + (i*211)%1190));
        c.setAttribute("r", String(2 + (i%4)));
        c.setAttribute("fill", "rgba(255,255,255,.9)");
        c.setAttribute("opacity", String(0.16 + (i%5)*0.05));
        els.patternLayer.appendChild(c);
      }
      return;
    }

    if (kind === "stars"){
      for (let i=0;i<32;i++){
        const s = document.createElementNS("http://www.w3.org/2000/svg","path");
        const x = 60 + (i*173)%960;
        const y = 90 + (i*239)%1120;
        const r = 8 + (i%4)*4;
        s.setAttribute("d", starPath(x,y,r));
        s.setAttribute("fill", "rgba(255,255,255,.9)");
        s.setAttribute("opacity", String(0.10 + (i%4)*0.05));
        els.patternLayer.appendChild(s);
      }
      return;
    }

    if (kind === "dots"){
      for (let i=0;i<120;i++){
        const c = document.createElementNS("http://www.w3.org/2000/svg","circle");
        c.setAttribute("cx", String(40 + (i*89)%1000));
        c.setAttribute("cy", String(80 + (i*131)%1190));
        c.setAttribute("r", String(1.5 + (i%3)*0.6));
        c.setAttribute("fill", "rgba(255,255,255,.85)");
        c.setAttribute("opacity", String(0.06 + (i%4)*0.03));
        els.patternLayer.appendChild(c);
      }
      return;
    }

    if (kind === "waves"){
      for (let i=0;i<18;i++){
        const p = document.createElementNS("http://www.w3.org/2000/svg","path");
        const y = 160 + i*62;
        p.setAttribute("d", `M-20 ${y} C 160 ${y-18}, 340 ${y+18}, 520 ${y} S 880 ${y-18}, 1100 ${y}`);
        p.setAttribute("fill", "none");
        p.setAttribute("stroke", "rgba(255,255,255,.55)");
        p.setAttribute("stroke-width", String(3 + (i%3)));
        p.setAttribute("opacity", String(0.05 + (i%4)*0.03));
        els.patternLayer.appendChild(p);
      }
    }
  }

  function starPath(cx, cy, r){
    const spikes = 5;
    const step = Math.PI / spikes;
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let path = `M ${cx} ${cy - r} `;
    for (let i=0;i<spikes;i++){
      x = cx + Math.cos(rot) * r;
      y = cy + Math.sin(rot) * r;
      path += `L ${x} ${y} `;
      rot += step;

      x = cx + Math.cos(rot) * (r*0.45);
      y = cy + Math.sin(rot) * (r*0.45);
      path += `L ${x} ${y} `;
      rot += step;
    }
    path += "Z";
    return path;
  }

  function applyText(){
    const msg = MESSAGES[state.msgIdx];
    els.msgText.textContent = msg.text;
    els.signText.textContent = "🎄";

    const font = FONTS.find(f => f.id === state.fontId) || FONTS[0];
    els.msgText.setAttribute("font-family", font.family);
    els.signText.setAttribute("font-family", font.family);

    els.msgText.setAttribute("font-size", String(state.fontSize));
    els.msgText.setAttribute("fill", state.textColor);
    els.msgText.setAttribute("font-weight", "800");

    els.signText.setAttribute("font-size", String(Math.max(44, Math.round(state.fontSize*0.78))));
    els.signText.setAttribute("fill", "rgba(255,255,255,.86)");

    // message position (group transform)
    const dy = 0;
    els.msgGroup.setAttribute("transform", `translate(${state.msgX-540},${state.msgY-640 + dy})`);
    // keep sign relative
    els.signText.setAttribute("y", String(640 + Math.round(state.fontSize*1.65)));
  }

  function applyTheme(){
    setGradientBackground(state.bgA, state.bgB);
    buildPattern(state.pattern);
    applyText();
  }

  // ===== Stickers =====
  function parseStickerSvg(svgStr){
    const doc = new DOMParser().parseFromString(svgStr, "image/svg+xml");
    const svg = doc.documentElement;

    // Remove defs ids to avoid collisions (simple approach: strip id attributes in parsed snippet)
    svg.querySelectorAll("[id]").forEach(n => n.removeAttribute("id"));

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    // import children
    Array.from(svg.childNodes).forEach(n => g.appendChild(document.importNode(n, true)));
    return g;
  }

  function applyStickerTransform(g, st){
    g.setAttribute("transform", `translate(${st.x},${st.y}) scale(${st.s}) rotate(${st.r}) translate(-32,-32)`);
  }

  function selectSticker(key){
    state.selectedStickerKey = key;
    renderStickers(); // updates selection outline
  }

  function addSticker(id){
    const s = STICKERS.find(x => x.id === id);
    if (!s) return;
    const key = `${id}_${Math.random().toString(16).slice(2)}`;
    state.stickers.push({ key, id, x: 540, y: 860, s: 1.0, r: 0 });
    state.selectedStickerKey = key;
    renderStickers();
    saveToHash();
  }

  function removeSelectedSticker(){
    const key = state.selectedStickerKey;
    if (!key) return;
    state.stickers = state.stickers.filter(s => s.key !== key);
    state.selectedStickerKey = null;
    renderStickers();
    saveToHash();
  }

  function scaleSelected(delta){
    const key = state.selectedStickerKey;
    if (!key) return;
    const st = state.stickers.find(s => s.key === key);
    if (!st) return;
    st.s = clamp(st.s + delta, 0.45, 2.4);
    const g = els.stickersLayer.querySelector(`[data-key="${key}"]`);
    if (g) applyStickerTransform(g, st);
    saveToHash();
  }

  function renderStickers(){
    els.stickersLayer.innerHTML = "";
    state.stickers.forEach(st => {
      const base = STICKERS.find(x => x.id === st.id);
      if (!base) return;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("data-key", st.key);
      g.style.cursor = "grab";

      // content
      const inner = parseStickerSvg(base.svg);
      g.appendChild(inner);

      // selection outline
      if (st.key === state.selectedStickerKey){
        const sel = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        sel.setAttribute("x","6"); sel.setAttribute("y","6");
        sel.setAttribute("width","52"); sel.setAttribute("height","52");
        sel.setAttribute("rx","12"); sel.setAttribute("ry","12");
        sel.setAttribute("fill","none");
        sel.setAttribute("stroke","rgba(255,255,255,.70)");
        sel.setAttribute("stroke-width","3");
        sel.setAttribute("stroke-dasharray","8 7");
        sel.setAttribute("opacity",".95");
        g.appendChild(sel);
      }

      applyStickerTransform(g, st);

      g.addEventListener("pointerdown", (ev) => onStickerPointerDown(ev, st.key));
      els.stickersLayer.appendChild(g);
    });
  }

  // NOTE: pointer capture em elementos SVG é inconsistente em alguns navegadores mobile.
  // Para garantir que o drag funcione sempre, usamos listeners globais (window).
  function onStickerPointerDown(ev, key){
    ev.preventDefault();
    ev.stopPropagation();
    selectSticker(key);

    const st = state.stickers.find(s => s.key === key);
    if (!st) return;

    const p = svgPointFromEvent(ev);
    dragSticker.key = key;
    dragSticker.pointerId = ev.pointerId;
    dragSticker.startX = p.x; dragSticker.startY = p.y;
    dragSticker.origX = st.x; dragSticker.origY = st.y;

    // feedback visual
    const g = els.stickersLayer.querySelector(`[data-key="${key}"]`);
    if (g) g.style.cursor = "grabbing";

    window.addEventListener("pointermove", onStickerPointerMove, { passive: false });
    window.addEventListener("pointerup", onStickerPointerUp, { once: true });
    window.addEventListener("pointercancel", onStickerPointerUp, { once: true });
    els.hint.style.opacity = "0.0";
  }

  function onStickerPointerMove(ev){
    if (!dragSticker.key) return;
    if (dragSticker.pointerId != null && ev.pointerId !== dragSticker.pointerId) return;
    ev.preventDefault();
    const st = state.stickers.find(s => s.key === dragSticker.key);
    if (!st) return;

    const p = svgPointFromEvent(ev);
    st.x = clamp(dragSticker.origX + (p.x - dragSticker.startX), 80, 1000);
    st.y = clamp(dragSticker.origY + (p.y - dragSticker.startY), 140, 1240);

    const g = els.stickersLayer.querySelector(`[data-key="${dragSticker.key}"]`);
    if (g) applyStickerTransform(g, st);
  }

  function onStickerPointerUp(){
    window.removeEventListener("pointermove", onStickerPointerMove);
    const key = dragSticker.key;
    dragSticker.key = null;
    dragSticker.pointerId = null;

    if (key){
      const g = els.stickersLayer.querySelector(`[data-key="${key}"]`);
      if (g) g.style.cursor = "grab";
    }
    saveToHash();
    renderStickers();
    setTimeout(() => (els.hint.style.opacity = ""), 350);
  }

  // ===== Message drag =====
  function onMsgPointerDown(ev){
    // avoid selecting when user is dragging sticker on top (stickers are above text though)
    ev.preventDefault();
    ev.stopPropagation();
    const p = svgPointFromEvent(ev);

    dragMsg.active = true;
    dragMsg.startX = p.x; dragMsg.startY = p.y;
    dragMsg.origX = state.msgX; dragMsg.origY = state.msgY;

    dragMsg.pointerId = ev.pointerId;
    window.addEventListener("pointermove", onMsgPointerMove, { passive:false });
    window.addEventListener("pointerup", onMsgPointerUp, { once: true });
    window.addEventListener("pointercancel", onMsgPointerUp, { once: true });

    els.hint.style.opacity = "0.0";
  }

  function onMsgPointerMove(ev){
    if (!dragMsg.active) return;
    if (dragMsg.pointerId != null && ev.pointerId !== dragMsg.pointerId) return;
    ev.preventDefault();
    const p = svgPointFromEvent(ev);

    state.msgX = clamp(dragMsg.origX + (p.x - dragMsg.startX), 160, 920);
    state.msgY = clamp(dragMsg.origY + (p.y - dragMsg.startY), 320, 1040);

    applyText();
  }

  function onMsgPointerUp(){
    dragMsg.active = false;
    dragMsg.pointerId = null;
    window.removeEventListener("pointermove", onMsgPointerMove);
    saveToHash();
    setTimeout(() => (els.hint.style.opacity = ""), 350);
  }

  // ===== Hash state =====
  function saveToHash(){
    const payload = {
      m: state.msgIdx,
      f: state.fontId,
      fs: state.fontSize,
      mx: Math.round(state.msgX),
      my: Math.round(state.msgY),
      th: state.themeId,
      a: state.bgA,
      b: state.bgB,
      t: state.textColor,
      p: state.pattern,
      s: state.stickers,
    };
    const enc = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    location.hash = enc;
  }

  function loadFromHash(){
    if (!location.hash || location.hash.length < 2) return false;
    try{
      const dec = decodeURIComponent(escape(atob(location.hash.slice(1))));
      const obj = JSON.parse(dec);

      if (typeof obj.m === "number") state.msgIdx = clamp(obj.m, 0, MESSAGES.length-1);
      if (typeof obj.f === "string") state.fontId = obj.f;
      if (typeof obj.fs === "number") state.fontSize = clamp(obj.fs, 44, 92);
      if (typeof obj.mx === "number") state.msgX = clamp(obj.mx, 160, 920);
      if (typeof obj.my === "number") state.msgY = clamp(obj.my, 320, 1040);

      if (typeof obj.th === "string") state.themeId = obj.th;
      if (typeof obj.a === "string") state.bgA = obj.a;
      if (typeof obj.b === "string") state.bgB = obj.b;
      if (typeof obj.t === "string") state.textColor = obj.t;
      if (typeof obj.p === "string") state.pattern = obj.p;

      if (Array.isArray(obj.s)) state.stickers = obj.s;
      return true;
    }catch(e){
      return false;
    }
  }

  // ===== Export / Share =====
  async function exportPng(opts = { download: true }){
    // clone SVG
    const svgEl = els.svg.cloneNode(true);

    // Inline logo href if available
    if (state.logoDataUri){
      const logo = svgEl.querySelector("#logoImg");
      if (logo) logo.setAttribute("href", state.logoDataUri);
    }

    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.decoding = "async";
    const canvas = document.createElement("canvas");
    const w = 1080, h = 1350;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");

    await new Promise((res, rej) => {
      img.onload = () => res();
      img.onerror = rej;
      img.src = url;
    });

    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);

    const outBlob = await new Promise(r => canvas.toBlob(r, "image/png", 1.0));
    const fileName = "cartao-natal.png";

    if (opts && opts.download){
      const a = document.createElement("a");
      a.href = URL.createObjectURL(outBlob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1200);
      showToast("PNG salvo ✨");
    }
    return outBlob;
  }

  async function share(){
    // Compartilhar SEMPRE como imagem (PNG). Link fica só como fallback.
    const link = location.href;

    let pngBlob = null;
    try{
      pngBlob = await exportPng({ download: false });
    }catch(e){ /* ignore */ }

    // 1) Web Share com arquivo (melhor no mobile)
    if (pngBlob && navigator.share){
      try{
        const file = new File([pngBlob], "cartao-natal.png", { type: "image/png" });
        const can = !navigator.canShare || navigator.canShare({ files: [file] });
        if (can){
          await navigator.share({ title: "Cartão Natalino", files: [file] });
          return;
        }
      }catch(e){ /* segue fallback */ }
    }

    // 2) Fallback: baixar a imagem (ainda cumpre "compartilhar em imagem")
    if (pngBlob){
      await exportPng({ download: true });
      return;
    }

    // 3) Último fallback: copiar link
    try{
      await navigator.clipboard.writeText(link);
      showToast("Link copiado ✅");
    }catch(e){
      prompt("Copie o link:", link);
    }
  }

  // ===== UI rendering =====
  function renderMessageChips(){
    els.msgChips.innerHTML = "";
    MESSAGES.forEach((m, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (idx === state.msgIdx ? " is-active" : "");
      b.textContent = m.title;
      b.addEventListener("click", () => {
        state.msgIdx = idx;
        renderMessageChips();
        applyText();
        saveToHash();
      });
      els.msgChips.appendChild(b);
    });
  }

  function renderFontSelect(){
    els.fontSelect.innerHTML = "";
    FONTS.forEach(f => {
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = f.label;
      els.fontSelect.appendChild(opt);
    });
    els.fontSelect.value = state.fontId;
  }

  function renderThemes(){
    els.themeGrid.innerHTML = "";
    THEMES.forEach(th => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "theme" + (th.id === state.themeId ? " is-active" : "");
      card.title = th.name;

      const sw = document.createElement("div");
      sw.className = "theme__swatch";
      sw.style.background = `linear-gradient(135deg, ${th.a}, ${th.b})`;

      const name = document.createElement("div");
      name.className = "theme__name";
      name.textContent = th.name;

      card.appendChild(sw);
      card.appendChild(name);

      card.addEventListener("click", () => {
        state.themeId = th.id;
        state.bgA = th.a; state.bgB = th.b;
        state.textColor = th.t;
        state.pattern = th.pattern;

        syncThemeInputs();
        renderThemes();
        applyTheme();
        saveToHash();
      });

      els.themeGrid.appendChild(card);
    });
  }

  function syncThemeInputs(){
    els.bgA.value = state.bgA;
    els.bgB.value = state.bgB;
    els.textColor.value = state.textColor;
    els.patternSelect.value = state.pattern;
  }

  function renderDecorButtons(){
    els.decoGrid.innerHTML = "";
    STICKERS.forEach(s => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "deco";

      const icon = document.createElement("div");
      icon.className = "deco__icon";
      icon.innerHTML = s.svg;

      // normalize inner svg to fill the box
      const innerSvg = icon.querySelector("svg");
      if (innerSvg){
        innerSvg.setAttribute("width","30");
        innerSvg.setAttribute("height","30");
      }

      const name = document.createElement("div");
      name.className = "deco__name";
      name.textContent = s.name;

      b.appendChild(icon);
      b.appendChild(name);

      b.addEventListener("click", () => addSticker(s.id));
      els.decoGrid.appendChild(b);
    });
  }

  // ===== Logo embed =====
  async function loadLogoAsDataUri(){
    try{
      const res = await fetch("assets/logo-natal.png", { cache: "force-cache" });
      const blob = await res.blob();
      const dataUri = await blobToDataURL(blob);
      state.logoDataUri = dataUri;
      els.logoImg.setAttribute("href", dataUri);
    }catch(e){
      // fallback: still set relative href (may not export in some browsers)
      els.logoImg.setAttribute("href", "assets/logo-natal.png");
    }
  }

  function blobToDataURL(blob){
    return new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.readAsDataURL(blob);
    });
  }

  // ===== Init & bindings =====
  function bind(){
    // tabs
    els.tabs.forEach(btn => {
      btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
    });

    // message drag
    els.msgGroup.style.cursor = "grab";
    els.msgGroup.addEventListener("pointerdown", onMsgPointerDown);

    // font & size
    els.fontSelect.addEventListener("change", () => {
      state.fontId = els.fontSelect.value;
      applyText();
      saveToHash();
    });

    els.fontSize.addEventListener("input", () => {
      state.fontSize = Number(els.fontSize.value);
      applyText();
    });
    els.fontSize.addEventListener("change", saveToHash);

    // theme inputs
    els.bgA.addEventListener("input", () => { state.bgA = els.bgA.value; applyTheme(); });
    els.bgB.addEventListener("input", () => { state.bgB = els.bgB.value; applyTheme(); });
    els.textColor.addEventListener("input", () => { state.textColor = els.textColor.value; applyText(); });
    [els.bgA, els.bgB, els.textColor].forEach(i => i.addEventListener("change", saveToHash));

    els.patternSelect.addEventListener("change", () => { state.pattern = els.patternSelect.value; applyTheme(); saveToHash(); });

    els.btnRandomTheme.addEventListener("click", () => {
      const th = THEMES[Math.floor(Math.random() * THEMES.length)];
      state.themeId = th.id;
      state.bgA = th.a; state.bgB = th.b; state.textColor = th.t; state.pattern = th.pattern;
      syncThemeInputs();
      renderThemes();
      applyTheme();
      saveToHash();
      showToast("Tema aplicado ✨");
    });

    // sticker controls
    els.btnScaleDown.addEventListener("click", () => scaleSelected(-0.12));
    els.btnScaleUp.addEventListener("click", () => scaleSelected(+0.12));
    els.btnDelete.addEventListener("click", removeSelectedSticker);
    els.btnClearDecor.addEventListener("click", () => {
      state.stickers = [];
      state.selectedStickerKey = null;
      renderStickers();
      saveToHash();
      showToast("Enfeites limpos");
    });

    // export/share
    els.btnExport.addEventListener("click", exportPng);
    els.btnShare.addEventListener("click", () => { saveToHash(); share(); });

    // hash changes (when opening shared links)
    window.addEventListener("hashchange", () => {
      if (loadFromHash()){
        syncUiFromState();
        applyTheme();
        renderStickers();
      }
    });
  }

  function syncUiFromState(){
    renderMessageChips();
    renderFontSelect();
    els.fontSelect.value = state.fontId;
    els.fontSize.value = String(state.fontSize);

    syncThemeInputs();
    renderThemes();
  }

  function boot(){
    loadFromHash();

    // initial theme defaults if none loaded
    const th = THEMES.find(t => t.id === state.themeId) || THEMES[0];
    state.bgA = state.bgA || th.a;
    state.bgB = state.bgB || th.b;
    state.textColor = state.textColor || th.t;
    state.pattern = state.pattern || th.pattern;

    bind();
    renderDecorButtons();
    syncUiFromState();
    applyTheme();
    renderStickers();
    loadLogoAsDataUri();

    // ensure share state set
    saveToHash();
  }

  boot();
})();
