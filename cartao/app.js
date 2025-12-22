
/* Cartão Natalino - versão v4 (layout estável, sem scroll, mobile-first)
   - SVG-only (leve), stickers com drag via pointer events
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
    msgText: $("#msgText"),
    signText: $("#signText"),
    stickersLayer: $("#stickersLayer"),
    toast: $("#toast"),
    floating: $("#floatingTools"),
    hint: $("#hint"),

    messagePills: $("#messagePills"),
    fontSelect: $("#fontSelect"),
    fontSizeSelect: $("#fontSizeSelect"),
    showLogo: $("#showLogo"),

    themeGrid: $("#themeGrid"),
    bgA: $("#bgA"),
    bgB: $("#bgB"),
    textColor: $("#textColor"),
    patternSelect: $("#patternSelect"),

    decoGrid: $("#decoGrid"),
    btnClearDecor: $("#btnClearDecor"),
    btnRandomTheme: $("#btnRandomTheme"),

    btnScaleDown: $("#btnScaleDown"),
    btnScaleUp: $("#btnScaleUp"),
    btnDelete: $("#btnDelete"),
    btnExport: $("#btnExport"),
    btnShare: $("#btnShare"),
  };

  const MSGS = [
    { title: "Feliz Natal!", text: "Que seu Natal seja cheio de luz, paz e amor." },
    { title: "Boas Festas", text: "Que a alegria do Natal aqueça o seu coração." },
    { title: "Com carinho", text: "Um Natal abençoado e um Ano Novo incrível para você!" },
    { title: "Gratidão", text: "Que não falte esperança, saúde e bons encontros." },
    { title: "Renove", text: "Que o Natal renove sua fé e seus melhores sonhos." },
  ];

  const THEMES = [
    { id: "noite", name: "Noite elegante", a: "#0b1220", b: "#0f2a4a", t: "#ffffff", pattern: "stars" },
    { id: "pinheiro", name: "Verde pinheiro", a: "#052e1a", b: "#14532d", t: "#f8fafc", pattern: "snow" },
    { id: "rubi", name: "Rubi", a: "#3b0a1a", b: "#b91c1c", t: "#fff7ed", pattern: "dots" },
    { id: "champagne", name: "Champagne", a: "#2b1f12", b: "#a16207", t: "#fff7ed", pattern: "waves" },
    { id: "aurora", name: "Aurora", a: "#0a1f2e", b: "#0f766e", t: "#e6fffb", pattern: "snow" },
    { id: "neve", name: "Neve", a: "#0b1220", b: "#334155", t: "#ffffff", pattern: "snow" },
  ];

  // Stickers (SVG path + gradient/fills)
  const STICKERS = [
    {
      id: "star",
      name: "Estrela",
      svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#fde047"/><stop offset="1" stop-color="#fb7185"/>
          </linearGradient>
        </defs>
        <path d="M32 6l7.6 16.2 17.8 2.5-13 12.6 3.1 17.8L32 46.8 16.5 55l3.1-17.8-13-12.6 17.8-2.5L32 6z"
              fill="url(#g1)" stroke="rgba(255,255,255,.22)" stroke-width="2" />
      </svg>`
    },
    {
      id: "bell",
      name: "Sino",
      svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#fbbf24"/><stop offset="1" stop-color="#f97316"/>
          </linearGradient>
        </defs>
        <path d="M32 8c-8 0-14 6-14 14v10c0 4-2 7-4 9h36c-2-2-4-5-4-9V22c0-8-6-14-14-14z"
              fill="url(#g2)" stroke="rgba(255,255,255,.22)" stroke-width="2" />
        <path d="M24 50c1.2 4 4.2 6 8 6s6.8-2 8-6H24z" fill="#fde68a" opacity=".9"/>
        <circle cx="32" cy="22" r="4" fill="#fff" opacity=".55"/>
      </svg>`
    },
    {
      id: "candy",
      name: "Bengala",
      svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#fecaca"/>
          </linearGradient>
        </defs>
        <path d="M40 10c-9 0-16 7-16 16v18c0 6 4 10 10 10h2c7 0 12-5 12-12V26c0-9-7-16-16-16z"
              fill="url(#g3)" stroke="#fb7185" stroke-width="3" />
        <path d="M28 26h20" stroke="#fb7185" stroke-width="6" stroke-linecap="round"/>
        <path d="M28 36h20" stroke="#fb7185" stroke-width="6" stroke-linecap="round" opacity=".9"/>
        <path d="M28 46h16" stroke="#fb7185" stroke-width="6" stroke-linecap="round" opacity=".8"/>
      </svg>`
    },
    {
      id: "gift",
      name: "Presente",
      svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g4" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#22c55e"/><stop offset="1" stop-color="#16a34a"/>
          </linearGradient>
        </defs>
        <rect x="10" y="26" width="44" height="30" rx="6" fill="url(#g4)" stroke="rgba(255,255,255,.22)" stroke-width="2"/>
        <rect x="10" y="20" width="44" height="10" rx="5" fill="#ef4444" opacity=".95"/>
        <rect x="30" y="20" width="4" height="36" fill="#fee2e2" opacity=".9"/>
        <path d="M32 18c-7-8-16-2-10 6h10V18z" fill="#fb7185"/>
        <path d="M32 18c7-8 16-2 10 6H32V18z" fill="#f472b6"/>
      </svg>`
    },
    {
      id: "heart",
      name: "Coração",
      svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g5" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#fb7185"/><stop offset="1" stop-color="#e11d48"/>
          </linearGradient>
        </defs>
        <path d="M32 56s-20-12-26-26c-5-12 6-22 16-18 4 2 7 6 10 10 3-4 6-8 10-10 10-4 21 6 16 18-6 14-26 26-26 26z"
              fill="url(#g5)" stroke="rgba(255,255,255,.22)" stroke-width="2"/>
      </svg>`
    },
    {
      id: "holly",
      name: "Azevinho",
      svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g6" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#16a34a"/>
          </linearGradient>
        </defs>
        <path d="M20 42c-10-2-14-14-4-20 6-4 12 0 16 6-2-8 2-16 10-16 10 0 14 12 6 20-6 6-18 10-28 10z"
              fill="url(#g6)" stroke="rgba(255,255,255,.18)" stroke-width="2"/>
        <path d="M44 46c10-2 14-14 4-20-6-4-12 0-16 6 2-8-2-16-10-16-10 0-14 12-6 20 6 6 18 10 28 10z"
              fill="url(#g6)" opacity=".95" stroke="rgba(255,255,255,.18)" stroke-width="2"/>
        <circle cx="32" cy="38" r="6" fill="#ef4444" stroke="rgba(255,255,255,.22)" stroke-width="2"/>
      </svg>`
    },
    {
      id: "snow",
      name: "Neve",
      svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g7" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#93c5fd"/><stop offset="1" stop-color="#e0f2fe"/>
          </linearGradient>
        </defs>
        <path d="M32 8v48M16 16l32 32M48 16L16 48" stroke="url(#g7)" stroke-width="4" stroke-linecap="round"/>
        <path d="M32 8l-6 6M32 8l6 6M32 56l-6-6M32 56l6-6" stroke="url(#g7)" stroke-width="4" stroke-linecap="round"/>
        <path d="M16 16l8 0M16 16l0 8M48 16l-8 0M48 16l0 8M16 48l8 0M16 48l0-8M48 48l-8 0M48 48l0-8"
              stroke="url(#g7)" stroke-width="4" stroke-linecap="round"/>
      </svg>`
    },
  ];

  const state = {
    msgIndex: 0,
    fontFamily: "Inter",
    fontSize: 76,
    showLogo: false,

    bgA: "#0b1220",
    bgB: "#0f2a4a",
    textColor: "#ffffff",
    pattern: "stars",

    stickers: [], // {id, x, y, s, r, key}
    selectedKey: null,
    themeId: "noite",
  };

  function toast(text){
    els.toast.textContent = text;
    els.toast.classList.add("is-visible");
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(()=>els.toast.classList.remove("is-visible"), 1400);
  }

  function uid(){
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function setTab(id){
    $$(".tab").forEach(btn => {
      const active = btn.dataset.tab === id;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    $$(".tabpanel").forEach(p => p.classList.toggle("is-active", p.id === id));
  }

  function buildMessagePills(){
    els.messagePills.innerHTML = "";
    MSGS.forEach((m, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pill" + (idx === state.msgIndex ? " is-active" : "");
      b.innerHTML = `${escapeHtml(m.title)}<small>${escapeHtml(m.text)}</small>`;
      b.addEventListener("click", () => {
        state.msgIndex = idx;
        $$(".pill", els.messagePills).forEach((x,i)=>x.classList.toggle("is-active", i===idx));
        renderText();
        saveToHash();
      });
      els.messagePills.appendChild(b);
    });
  }

  function buildThemes(){
    els.themeGrid.innerHTML = "";
    THEMES.forEach(th => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "theme" + (th.id === state.themeId ? " is-active" : "");
      const sw = document.createElement("div");
      sw.className = "theme__swatch";
      sw.style.background = `linear-gradient(135deg, ${th.a}, ${th.b})`;
      const lbl = document.createElement("div");
      lbl.className = "theme__label";
      lbl.textContent = th.name;
      el.appendChild(sw);
      el.appendChild(lbl);
      el.addEventListener("click", () => {
        state.themeId = th.id;
        state.bgA = th.a; state.bgB = th.b; state.textColor = th.t; state.pattern = th.pattern;
        syncControls();
        renderAll();
        $$(".theme", els.themeGrid).forEach(btn => btn.classList.toggle("is-active", btn === el));
        saveToHash();
      });
      els.themeGrid.appendChild(el);
    });
  }

  function buildDecos(){
    els.decoGrid.innerHTML = "";
    STICKERS.forEach(s => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "deco";
      btn.title = s.name;
      btn.innerHTML = s.svg;
      btn.addEventListener("click", () => {
        addSticker(s.id);
      });
      els.decoGrid.appendChild(btn);
    });
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function syncControls(){
    els.fontSelect.value = state.fontFamily;
    els.fontSizeSelect.value = String(state.fontSize);
    els.showLogo.checked = !!state.showLogo;

    els.bgA.value = state.bgA;
    els.bgB.value = state.bgB;
    els.textColor.value = state.textColor;
    els.patternSelect.value = state.pattern;
  }

  function renderBackground(){
    // defs: gradient
    const gradId = "bgGrad";
    const existing = $("#"+gradId, els.defs);
    if (existing) existing.remove();

    const lg = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    lg.setAttribute("id", gradId);
    lg.setAttribute("x1", "0"); lg.setAttribute("y1", "0");
    lg.setAttribute("x2", "1"); lg.setAttribute("y2", "1");
    const s1 = document.createElementNS(lg.namespaceURI,"stop");
    s1.setAttribute("offset","0%"); s1.setAttribute("stop-color", state.bgA);
    const s2 = document.createElementNS(lg.namespaceURI,"stop");
    s2.setAttribute("offset","100%"); s2.setAttribute("stop-color", state.bgB);
    lg.appendChild(s1); lg.appendChild(s2);
    els.defs.appendChild(lg);

    els.bgRect.setAttribute("fill", `url(#${gradId})`);
  }

  function renderPattern(){
    els.patternLayer.innerHTML = "";
    const p = state.pattern;
    if (!p || p === "none") return;

    // draw a repeated pattern manually (fast enough)
    const g = document.createElementNS("http://www.w3.org/2000/svg","g");
    g.setAttribute("fill","rgba(255,255,255,.9)");
    g.setAttribute("stroke","none");

    const W=1080, H=1350;
    if (p === "snow") {
      for (let y=80; y<H; y+=110){
        for (let x=80; x<W; x+=110){
          const c = document.createElementNS(g.namespaceURI,"circle");
          c.setAttribute("cx", x + (y%220 ? 26:0));
          c.setAttribute("cy", y);
          c.setAttribute("r", "6");
          c.setAttribute("opacity", (0.25 + ((x+y)%7)/20).toFixed(2));
          g.appendChild(c);
        }
      }
    } else if (p === "stars") {
      for (let y=90; y<H; y+=140){
        for (let x=90; x<W; x+=140){
          const s = document.createElementNS(g.namespaceURI,"path");
          const cx = x + (y%280 ? 30:0), cy = y;
          s.setAttribute("d", starPath(cx, cy, 10, 5));
          s.setAttribute("opacity", (0.18 + ((x*y)%9)/30).toFixed(2));
          g.appendChild(s);
        }
      }
    } else if (p === "dots") {
      for (let y=80; y<H; y+=90){
        for (let x=80; x<W; x+=90){
          const c = document.createElementNS(g.namespaceURI,"circle");
          c.setAttribute("cx", x + (y%180 ? 24:0));
          c.setAttribute("cy", y);
          c.setAttribute("r", "4");
          c.setAttribute("opacity", (0.18 + ((x+y)%11)/50).toFixed(2));
          g.appendChild(c);
        }
      }
    } else if (p === "waves") {
      for (let y=140; y<H; y+=160){
        const path = document.createElementNS(g.namespaceURI,"path");
        path.setAttribute("d", wavePath(y));
        path.setAttribute("fill","none");
        path.setAttribute("stroke","rgba(255,255,255,.7)");
        path.setAttribute("stroke-width","6");
        path.setAttribute("opacity","0.16");
        g.appendChild(path);
      }
    }

    els.patternLayer.appendChild(g);
  }

  function starPath(cx, cy, r, inner){
    const pts=[];
    for(let i=0;i<10;i++){
      const a = (Math.PI*2*i)/10 - Math.PI/2;
      const rr = (i%2===0)?r:inner;
      pts.push([cx + Math.cos(a)*rr, cy + Math.sin(a)*rr]);
    }
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for(let i=1;i<pts.length;i++) d += ` L ${pts[i][0]} ${pts[i][1]}`;
    return d + " Z";
  }

  function wavePath(y){
    const W=1080;
    let d = `M 0 ${y}`;
    const amp = 22;
    const step = 180;
    for (let x=0; x<=W; x+=step){
      const x1 = x + step/2;
      const y1 = y + (x/step % 2 === 0 ? amp : -amp);
      const x2 = x + step;
      const y2 = y;
      d += ` Q ${x1} ${y1} ${x2} ${y2}`;
    }
    return d;
  }

  function renderText(){
    const msg = MSGS[state.msgIndex];
    els.msgText.textContent = msg.text;
    els.signText.textContent = msg.title;

    const font = state.fontFamily;
    const size = state.fontSize;

    els.msgText.setAttribute("fill", state.textColor);
    els.signText.setAttribute("fill", state.textColor);

    els.msgText.setAttribute("font-family", font);
    els.signText.setAttribute("font-family", font);

    els.msgText.setAttribute("font-size", String(size));
    els.signText.setAttribute("font-size", String(Math.round(size*0.78)));

    els.msgText.setAttribute("font-weight", font === "Pacifico" || font === "Great Vibes" ? "400" : "800");
    els.signText.setAttribute("font-weight", font === "Pacifico" || font === "Great Vibes" ? "400" : "900");

    // improved line wrapping for message: split into 2 lines if needed
    wrapSvgText(els.msgText, 860);

    // position based on wrapped lines
    const lines = els.msgText.querySelectorAll("tspan").length || 1;
    const baseY = 560;
    const lineH = Math.round(size * 1.12);
    const startY = baseY - (lines-1) * (lineH/2);
    let i=0;
    els.msgText.querySelectorAll("tspan").forEach(t => {
      t.setAttribute("x","540");
      t.setAttribute("y", String(Math.round(startY + (i*lineH))));
      i++;
    });

    els.signText.setAttribute("x","540");
    els.signText.setAttribute("y", String(Math.round(startY + (lines*lineH) + 58)));

    renderLogo();
  }

  function wrapSvgText(textEl, maxWidth){
    // simple wrap based on character count approximation
    // (works well enough for these short phrases)
    const original = textEl.textContent || "";
    textEl.textContent = "";

    const words = original.split(/\s+/).filter(Boolean);
    if (words.length === 0) return;

    const approxCharsPerLine = Math.max(10, Math.floor(maxWidth / (state.fontSize * 0.55)));
    const lines = [];
    let cur = "";
    for (const w of words){
      const next = cur ? (cur + " " + w) : w;
      if (next.length > approxCharsPerLine && cur){
        lines.push(cur);
        cur = w;
      } else {
        cur = next;
      }
    }
    if (cur) lines.push(cur);

    lines.slice(0,3).forEach((ln, idx) => {
      const t = document.createElementNS("http://www.w3.org/2000/svg","tspan");
      t.textContent = ln;
      textEl.appendChild(t);
    });
  }

  function renderLogo(){
    // logo as SVG image element inside card for export reliability
    const existing = $("#exportLogo", els.svg);
    if (existing) existing.remove();
    if (!state.showLogo) return;

    const img = document.createElementNS("http://www.w3.org/2000/svg","image");
    img.setAttribute("id","exportLogo");
    img.setAttribute("href","assets/logo-natal.svg");
    img.setAttribute("x","66"); img.setAttribute("y","70");
    img.setAttribute("width","86"); img.setAttribute("height","86");
    img.setAttribute("opacity","0.95");
    els.svg.insertBefore(img, $("#patternLayer"));
  }

  function addSticker(stickerId){
    const s = STICKERS.find(x => x.id === stickerId);
    if (!s) return;

    const key = uid();
    // center-ish
    const obj = { id: s.id, x: 540, y: 980, s: 1.0, r: 0, key };
    state.stickers.push(obj);
    renderStickers();
    selectSticker(key);
    saveToHash();
    toast("Enfeite adicionado");
  }

  function renderStickers(){
    els.stickersLayer.innerHTML = "";
    state.stickers.forEach(st => {
      const s = STICKERS.find(x => x.id === st.id);
      if (!s) return;

      const g = document.createElementNS("http://www.w3.org/2000/svg","g");
      g.setAttribute("data-key", st.key);
      g.setAttribute("cursor","grab");
      g.style.transformBox = "fill-box";
      g.style.transformOrigin = "center";

      // embed sticker SVG as <g> via parsing
      const wrap = document.createElementNS("http://www.w3.org/2000/svg","g");
      wrap.innerHTML = s.svg.replace(/^<svg[^>]*>|<\/svg>$/g,"");
      // normalize size
      wrap.setAttribute("transform", "translate(-32,-32) scale(1)");
      g.appendChild(wrap);

      applyStickerTransform(g, st);

      // selection outline (added as a rect around 64x64)
      if (st.key === state.selectedKey){
        const sel = document.createElementNS("http://www.w3.org/2000/svg","rect");
        sel.setAttribute("x","-40"); sel.setAttribute("y","-40");
        sel.setAttribute("width","80"); sel.setAttribute("height","80");
        sel.setAttribute("rx","16");
        sel.setAttribute("fill","none");
        sel.setAttribute("stroke","rgba(255,255,255,.65)");
        sel.setAttribute("stroke-width","3");
        sel.setAttribute("stroke-dasharray","8 7");
        sel.setAttribute("opacity",".9");
        g.appendChild(sel);
      }

      // pointer handlers
      g.addEventListener("pointerdown", (ev) => onStickerPointerDown(ev, st.key));
      els.stickersLayer.appendChild(g);
    });

    updateFloating();
  }

  function applyStickerTransform(g, st){
    // map to SVG coords
    const scale = 2.4 * st.s; // base scale
    const tr = `translate(${st.x} ${st.y}) rotate(${st.r}) scale(${scale})`;
    g.setAttribute("transform", tr);
  }

  function selectSticker(key){
    state.selectedKey = key;
    renderStickers();
  }

  function deleteSelected(){
    if (!state.selectedKey) return;
    state.stickers = state.stickers.filter(s => s.key !== state.selectedKey);
    state.selectedKey = null;
    renderStickers();
    saveToHash();
    toast("Enfeite removido");
  }

  function scaleSelected(delta){
    if (!state.selectedKey) return;
    const st = state.stickers.find(s => s.key === state.selectedKey);
    if (!st) return;
    st.s = clamp(st.s + delta, 0.35, 2.25);
    renderStickers();
    saveToHash();
  }

  function updateFloating(){
    const visible = !!state.selectedKey;
    els.floating.classList.toggle("is-visible", visible);
  }

  // Dragging
  const drag = {
    key: null,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  };

  function svgPointFromEvent(ev){
    const pt = els.svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    const ctm = els.svg.getScreenCTM();
    if (!ctm) return {x:0,y:0};
    const inv = ctm.inverse();
    const p = pt.matrixTransform(inv);
    return { x: p.x, y: p.y };
  }

  function onStickerPointerDown(ev, key){
    ev.preventDefault();
    ev.stopPropagation();
    selectSticker(key);

    const st = state.stickers.find(s => s.key === key);
    if (!st) return;

    drag.key = key;
    const p = svgPointFromEvent(ev);
    drag.startX = p.x; drag.startY = p.y;
    drag.origX = st.x; drag.origY = st.y;

    ev.currentTarget.setPointerCapture(ev.pointerId);
    ev.currentTarget.style.cursor = "grabbing";

    ev.currentTarget.addEventListener("pointermove", onStickerPointerMove);
    ev.currentTarget.addEventListener("pointerup", onStickerPointerUp, { once: true });
    ev.currentTarget.addEventListener("pointercancel", onStickerPointerUp, { once: true });

    els.hint.style.display = "none";
  }

  function onStickerPointerMove(ev){
    if (!drag.key) return;
    const st = state.stickers.find(s => s.key === drag.key);
    if (!st) return;

    const p = svgPointFromEvent(ev);
    st.x = clamp(drag.origX + (p.x - drag.startX), 90, 990);
    st.y = clamp(drag.origY + (p.y - drag.startY), 140, 1240);

    // update transform directly for performance
    const g = els.stickersLayer.querySelector(`[data-key="${drag.key}"]`);
    if (g) applyStickerTransform(g, st);
  }

  function onStickerPointerUp(ev){
    const g = ev.currentTarget;
    g.style.cursor = "grab";
    g.removeEventListener("pointermove", onStickerPointerMove);
    drag.key = null;
    saveToHash();
  }

  // Hash state (shareable)
  function saveToHash(){
    const payload = {
      m: state.msgIndex,
      f: state.fontFamily,
      fs: state.fontSize,
      l: state.showLogo ? 1 : 0,
      a: state.bgA,
      b: state.bgB,
      tc: state.textColor,
      p: state.pattern,
      s: state.stickers.map(x => [x.id, round(x.x), round(x.y), round2(x.s), round(x.r), x.key]),
      th: state.themeId
    };
    const str = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    location.hash = str;
  }

  function loadFromHash(){
    if (!location.hash || location.hash.length < 2) return false;
    try{
      const raw = location.hash.slice(1);
      const json = decodeURIComponent(escape(atob(raw)));
      const payload = JSON.parse(json);

      if (typeof payload.m === "number") state.msgIndex = clamp(payload.m, 0, MSGS.length-1);
      if (typeof payload.f === "string") state.fontFamily = payload.f;
      if (typeof payload.fs === "number") state.fontSize = clamp(payload.fs, 56, 110);
      state.showLogo = payload.l === 1;

      if (typeof payload.a === "string") state.bgA = payload.a;
      if (typeof payload.b === "string") state.bgB = payload.b;
      if (typeof payload.tc === "string") state.textColor = payload.tc;
      if (typeof payload.p === "string") state.pattern = payload.p;
      if (typeof payload.th === "string") state.themeId = payload.th;

      if (Array.isArray(payload.s)){
        state.stickers = payload.s.map(arr => ({
          id: arr[0],
          x: +arr[1],
          y: +arr[2],
          s: +arr[3],
          r: +arr[4] || 0,
          key: arr[5] || uid(),
        })).filter(x => STICKERS.some(s => s.id === x.id));
      }
      return true;
    } catch(e){
      console.warn("hash inválido", e);
      return false;
    }
  }

  function round(n){ return Math.round(Number(n) || 0); }
  function round2(n){ return Math.round((Number(n)||0)*100)/100; }

  function renderAll(){
    renderBackground();
    renderPattern();
    renderText();
    renderStickers();
  }

  async function exportPng(){
    // serialize SVG and render to canvas
    const svgEl = els.svg.cloneNode(true);

    // ensure background rect has rx/ry
    // inline computed styles are already attributes in SVG
    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.decoding = "async";
    img.src = url;

    await img.decode().catch(()=>{});

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    const dataUrl = canvas.toDataURL("image/png");

    // download
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "cartao-natal.png";
    a.click();
  }

  async function share(){
    const url = location.href;
    const title = "Cartão Natalino";
    const text = "Criei um cartão natalino pra você 🎄✨";
    if (navigator.share){
      try{
        await navigator.share({ title, text, url });
        toast("Compartilhado");
        return;
      }catch(e){}
    }
    await navigator.clipboard?.writeText?.(url).catch(()=>{});
    toast("Link copiado");
  }

  // Wire controls
  function wire(){
    // tabs
    $$(".tab").forEach(btn => {
      btn.addEventListener("click", () => setTab(btn.dataset.tab));
    });

    // background controls
    els.bgA.addEventListener("input", () => { state.bgA = els.bgA.value; renderBackground(); saveToHash(); });
    els.bgB.addEventListener("input", () => { state.bgB = els.bgB.value; renderBackground(); saveToHash(); });
    els.textColor.addEventListener("input", () => { state.textColor = els.textColor.value; renderText(); saveToHash(); });

    els.patternSelect.addEventListener("change", () => { state.pattern = els.patternSelect.value; renderPattern(); saveToHash(); });

    // text controls
    els.fontSelect.addEventListener("change", () => { state.fontFamily = els.fontSelect.value; renderText(); saveToHash(); });
    els.fontSizeSelect.addEventListener("change", () => { state.fontSize = Number(els.fontSizeSelect.value) || 76; renderText(); saveToHash(); });
    els.showLogo.addEventListener("change", () => { state.showLogo = !!els.showLogo.checked; renderLogo(); saveToHash(); });

    // sticker tools
    els.btnDelete.addEventListener("click", deleteSelected);
    els.btnScaleDown.addEventListener("click", () => scaleSelected(-0.08));
    els.btnScaleUp.addEventListener("click", () => scaleSelected(0.08));

    // click outside to deselect
    els.svg.addEventListener("pointerdown", (ev) => {
      // if clicked on background (not sticker)
      const target = ev.target;
      const inSticker = target && target.closest && target.closest("#stickersLayer g");
      if (!inSticker){
        state.selectedKey = null;
        renderStickers();
      }
    });

    els.btnClearDecor.addEventListener("click", () => {
      state.stickers = [];
      state.selectedKey = null;
      renderStickers();
      saveToHash();
      toast("Enfeites removidos");
    });

    els.btnRandomTheme.addEventListener("click", () => {
      const th = THEMES[Math.floor(Math.random()*THEMES.length)];
      state.themeId = th.id;
      state.bgA = th.a; state.bgB = th.b; state.textColor = th.t; state.pattern = th.pattern;
      syncControls();
      buildThemes();
      renderAll();
      saveToHash();
      toast("Tema aplicado");
    });

    els.btnExport.addEventListener("click", exportPng);
    els.btnShare.addEventListener("click", share);
  }

  // Init
  function init(){
    buildMessagePills();
    buildThemes();
    buildDecos();

    const loaded = loadFromHash();
    syncControls();
    renderAll();

    // reflect selection in UI after load
    $$(".pill", els.messagePills).forEach((x,i)=>x.classList.toggle("is-active", i===state.msgIndex));

    // choose theme active
    buildThemes();

    wire();

    if (!loaded) saveToHash(); // first load: make shareable URL
  }

  init();
})();
