// js/theme-fx.js — Personalização do tema + efeitos visuais (neve, renas)
// Requer:
// - app.firebase: { db, doc, getDoc, setDoc, serverTimestamp }
// - app.modal: { openModal, closeModal }
// - app.gameState: getters de nome/setor/pontuação
// - app.theme-fx: efeitos visuais e personalização do tema

export function bootThemeFx(app) {
  const PRESETS =
  app?.data?.THEME_PRESETS ||
  app?.themePresets ||
  {
    classic: { name:"Clássico", accent:"#e53935", bg:"#0b1020" },
    candy:   { name:"Candy Cane", accent:"#ff2e63", bg:"#140a12" },
    neon:    { name:"Neon Noel", accent:"#00ffd5", bg:"#001016" },
    aurora:  { name:"Aurora", accent:"#7c4dff", bg:"#071022" },
    gold:    { name:"Dourado", accent:"#ffcc00", bg:"#140f02" },
  };

  const { openModal, closeModal } = app.modal;
  const fb = app.firebase;
  const THEME_PRESETS = app.THEME_PRESETS;

  if (!fb?.db) {
    console.warn("[theme-fx] Firebase não inicializado em app.firebase");
    return;
  }

  const customizeBtn = document.getElementById("customizeBtn");
  const openCustomizeInline = document.getElementById("openCustomizeInline");

  customizeBtn?.addEventListener("click", openCustomizeModal);
  openCustomizeInline?.addEventListener("click", openCustomizeModal);

  // Salvar tema
  function saveTheme(obj) {
    localStorage.setItem("mission_theme", JSON.stringify(obj));
  }

  // Carregar tema
  function loadTheme() {
    try {
      return JSON.parse(localStorage.getItem("mission_theme") || "null") || {
        snow: true,
        reindeer: true,
        preset: "classic",
        intensity: 1
      };
    } catch {
      return { snow: true, reindeer: true, preset: "classic", intensity: 1 };
    }
  }

  // Aplicar o tema (paleta de cores, intensidade, etc.)
  function applyTheme({ snow, reindeer, preset = "classic", intensity = 1 }) {
    const p = THEME_PRESETS[preset] || THEME_PRESETS.classic;
    const root = document.documentElement;
    root.style.setProperty("--accent", p.accent);
    root.style.setProperty("--bg", p.bg);
    root.style.setProperty("--intensity", String(intensity));

    const snowCanvas = document.getElementById("snow");
    if (snowCanvas) snowCanvas.style.display = snow ? "block" : "none";

    if (reindeer) {
      startReindeer();
    } else {
      stopReindeer();
    }
  }

  // Começar o efeito de renas
  let reindeerTimer = null;
  function startReindeer() {
    const reindeerLayer = document.getElementById("reindeerLayer");
    if (!reindeerLayer) return;
    reindeerLayer.innerHTML = "";
    spawnReindeerWave();
    if (reindeerTimer) clearInterval(reindeerTimer);
    reindeerTimer = setInterval(spawnReindeerWave, 3200);
  }

  function stopReindeer() {
    if (reindeerTimer) clearInterval(reindeerTimer);
    reindeerTimer = null;
    const reindeerLayer = document.getElementById("reindeerLayer");
    if (reindeerLayer) reindeerLayer.innerHTML = "";
  }

  // Criar ondas de renas no efeito
  function spawnReindeerWave() {
    const reindeerLayer = document.getElementById("reindeerLayer");
    if (!reindeerLayer) return;
    const emojis = ["🦌", "🦌", "🦌", "🛷", "🦌"];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const d = document.createElement("div");
      d.className = "reindeer";
      d.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      d.style.setProperty("--y", `${Math.floor(Math.random() * 75) + 5}vh`);
      d.style.fontSize = `${22 + Math.random() * 18}px`;
      d.style.animationDuration = `${7.5 + Math.random() * 6.0}s`;
      d.style.animationDelay = `${Math.random() * 1.2}s`;
      reindeerLayer.appendChild(d);
      const ttl = parseFloat(d.style.animationDuration) * 1000 + 1500;
      setTimeout(() => d.remove(), ttl);
    }
  }

  // Neve (Efeito de neve no fundo)
  function snowInit() {
    const canvas = document.getElementById("snow");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w, h, dpr;
    const flakes = [];
    const FLAKES = 160;

    function resize() {
      dpr = Math.max(1, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const rand = (min, max) => Math.random() * (max - min) + min;

    function makeFlake() {
      return {
        x: rand(0, w),
        y: rand(-h, 0),
        r: rand(1.2, 4.0),
        vy: rand(0.7, 2.4),
        vx: rand(-0.6, 0.8),
        sway: rand(0.002, 0.014),
        phase: rand(0, Math.PI * 2)
      };
    }

    function refill() {
      flakes.length = 0;
      for (let i = 0; i < FLAKES; i++) flakes.push(makeFlake());
    }

    function tick() {
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.phase += f.sway * 60;
        f.x += f.vx + Math.sin(f.phase) * 0.4;
        f.y += f.vy;
        if (f.y > h + 10) {
          f.y = rand(-40, -10);
          f.x = rand(0, w);
        }
        if (f.x < -10) f.x = w + 10;
        if (f.x > w + 10) f.x = -10;

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.90)";
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }

    window.addEventListener("resize", () => { resize(); refill(); });
    resize();
    refill();
    tick();
  }

  // Abrir modal de personalização
  function openCustomizeModal() {
    const saved = loadTheme();
    const presetOptions = Object.entries(THEME_PRESETS).map(([k, v]) =>
      `<option value="${k}" ${saved.preset === k ? "selected" : ""}>${escapeHtml(v.name)}</option>`
    ).join("");

    openModal({
      title: "⚙️ Personalizar página",
      bodyHTML: `
        <p class="muted">As alterações são aplicadas imediatamente.</p>

        <div style="display:grid; gap:10px; margin-top:12px">
          ${toggleHTML("optSnow", "Neve", "Clima clássico de Natal", saved.snow)}
          ${toggleHTML("optReindeer", "Renas", "Várias renas passando", saved.reindeer)}
        </div>

        <hr style="border:0; border-top:1px solid rgba(255,255,255,.12); margin:14px 0"/>

        <div style="display:grid; gap:10px">
          <div>
            <b>Paleta</b>
            <div class="muted" style="margin:2px 0 8px">Escolha uma cor principal.</div>
            <select class="input" id="optPreset">${presetOptions}</select>
          </div>

          <div>
            <b>Intensidade</b>
            <div class="muted" style="margin:2px 0 8px">Quanto mais alto, mais vivo.</div>
            <input id="optIntensity" type="range" min="0.8" max="1.6" step="0.05" value="${saved.intensity ?? 1}" style="width:100%"/>
          </div>
        </div>
      `,
      buttons: [{ label:"Fechar", onClick: closeModal }]
    });

    setTimeout(() => {
      const optSnow = document.getElementById("optSnow");
      const optReindeer = document.getElementById("optReindeer");
      const optPreset = document.getElementById("optPreset");
      const optIntensity = document.getElementById("optIntensity");

      const applyNow = () => {
        const cfg = {
          snow: !!optSnow?.checked,
          reindeer: !!optReindeer?.checked,
          preset: optPreset?.value || "classic",
          intensity: Number(optIntensity?.value || 1)
        };
        applyTheme(cfg);
        saveTheme(cfg);
      };

      optSnow?.addEventListener("change", applyNow);
      optReindeer?.addEventListener("change", applyNow);
      optPreset?.addEventListener("change", applyNow);
      optIntensity?.addEventListener("input", applyNow);

      applyNow();
    }, 0);
  }

  function toggleHTML(id, title, subtitle, checked) {
    return `
      <div class="toggle-row">
        <div class="toggle-text">
          <b>${escapeHtml(title)}</b>
          <small class="muted">${escapeHtml(subtitle)}</small>
        </div>
        <label class="switch" aria-label="${escapeHtml(title)}">
          <input type="checkbox" id="${id}" ${checked ? "checked" : ""}/>
          <span class="slider"></span>
        </label>
      </div>
    `;
  }

  // Inicialização da neve
  snowInit();
}


