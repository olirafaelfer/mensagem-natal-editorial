// js/modules/theme-fx.js — tema (claro/escuro) + presets
// Mantém comportamento simples e estável.
// - Botão #themeToggle alterna classe .dark no <body>
// - Persiste em localStorage("theme") = "light"|"dark"

export function bootTheme(app){
  const body = document.body;

  function applyTheme(theme){
    const t = (theme === "dark") ? "dark" : "light";
    body.classList.toggle("dark", t === "dark");
    // evita que o browser "forçe" esquema em elementos
    document.documentElement.style.colorScheme = "light";
    localStorage.setItem("theme", t);
  }

  // aplica tema salvo
  applyTheme(localStorage.getItem("theme") || "light");

  // toggle
  const toggle = document.getElementById("themeToggle");
  if (toggle){
    toggle.addEventListener("click", () => {
      const next = body.classList.contains("dark") ? "light" : "dark";
      applyTheme(next);
    });
  }

  // presets (opcional): se existir select #themePreset
  const presetSel = document.getElementById("themePreset");
  if (presetSel && app?.THEME_PRESETS){
    presetSel.addEventListener("change", () => {
      const key = presetSel.value;
      const preset = app.THEME_PRESETS[key];
      if (!preset) return;
      document.documentElement.style.setProperty("--accent", preset.accent);
      document.documentElement.style.setProperty("--bg", preset.bg);
      localStorage.setItem("theme_preset", key);
    });
    const savedPreset = localStorage.getItem("theme_preset");
    if (savedPreset && app.THEME_PRESETS[savedPreset]){
      presetSel.value = savedPreset;
      presetSel.dispatchEvent(new Event("change"));
    }
  }
}
