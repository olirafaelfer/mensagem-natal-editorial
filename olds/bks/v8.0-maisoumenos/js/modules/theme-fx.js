// js/theme-fx.js — Personalização do tema + efeitos visuais (neve, renas)

export function bootThemeFx(app) {
  const { openModal, closeModal } = app.modal || {};
  if (!openModal || !closeModal) {
    console.warn("[theme-fx] modal não inicializado (ui-modal.js precisa bootar antes).");
    return;
  }

  const escapeHtml = app.utils?.escapeHtml || ((s)=>String(s));

  // ✅ fonte única e garantida
  const PRESETS =
    app?.data?.THEME_PRESETS ||
    {
      classic: { name:"Clássico", accent:"#e53935", bg:"#0b1020" },
      candy:   { name:"Candy Cane", accent:"#ff2e63", bg:"#140a12" },
      neon:    { name:"Neon Noel", accent:"#00ffd5", bg:"#001016" },
      aurora:  { name:"Aurora", accent:"#7c4dff", bg:"#071022" },
      gold:    { name:"Dourado", accent:"#ffcc00", bg:"#140f02" },
    };

  const customizeBtn = document.getElementById("customizeBtn");
  const openCustomizeInline = document.getElementById("openCustomizeInline");

  customizeBtn?.addEventListener("click", openCustomizeModal);
  openCustomizeInline?.addEventListener("click", openCustomizeModal);

  function saveTheme(obj) {
    localStorage.setItem("mission_theme", JSON.stringify(obj));
  }

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

  let reindeerTimer = null;

  function applyTheme({ snow, reindeer, preset = "classic", intensity = 1 }) {
    const p = PRESETS[preset] || PRESETS.classic;

    const root = document.documentElement;
    root.style.setProperty("--accent", p.accent);
    root.style.setProperty("--bg", p.bg);
    root.style.setProperty("--intensity", String(intensity));

    app.snow?.setEnabled?.(snow);

    const reindeerLayer = document.getElementById("reindeerLayer");
    if (reindeer) {
      if (reindeerLayer) reindeerLayer.classList.remove("hidden");
      startReindeer();
    } else {
      stopReindeer();
      if (reindeerLayer) reindeerLayer.classList.add("hidden");
    }
  }

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

  function openCustomizeModal() {
    const saved = loadTheme();

    const presetOptions = Object.entries(PRESETS).map(([k, v]) =>
      `<option value="${escapeHtml(k)}" ${saved.preset === k ? "selected" : ""}>${escapeHtml(v.name)}</option>`
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
            <b>Intensidade dos efeitos</b>
            <div class="muted" style="margin:2px 0 10px">Escolha um nível:</div>
            <div class="intensity-pills" id="optIntensityPills" role="group" aria-label="Intensidade">
              <button type="button" class="pill" data-int="0.9">Tímido</button>
              <button type="button" class="pill" data-int="1.1">Normal</button>
              <button type="button" class="pill" data-int="1.35">Super natalino</button>
            </div>
            <input id="optIntensity" type="hidden" value="${saved.intensity ?? 1.1}"/>
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
      const pills = Array.from(document.querySelectorAll("#optIntensityPills .pill"));
      const markPills = (val) => {
        const v = Number(val) || 1.1;
        pills.forEach(btn => {
          const bi = Number(btn.getAttribute("data-int"));
          btn.classList.toggle("active", Math.abs(bi - v) < 0.06);
        });
      };
      markPills(optIntensity?.value);

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
      applyNow();
    }, 0);
  }

  // ✅ aplica tema salvo na inicialização
  applyTheme(loadTheme());
  snowInit();
}
