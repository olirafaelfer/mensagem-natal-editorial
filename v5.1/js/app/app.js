// js/app/app.js — contexto global (DOM + helpers)
export function createApp({ firebase, THEME_PRESETS, SECTORS, SCORE_RULES }){
  const dom = {
    // Screens
    screenLoading: document.getElementById("screenLoading"),
    screenAuth: document.getElementById("screenAuth"),
    screenForm: document.getElementById("screenForm"),
    screenGame: document.getElementById("screenGame"),
    screenFinal: document.getElementById("screenFinal"),

    // Topbar buttons
    rankingBtn: document.getElementById("rankingBtn"),
    customizeBtn: document.getElementById("customizeBtn"),
    challenge1Btn: document.getElementById("challenge1Btn"),
    tutorialBtn: document.getElementById("tutorialBtn"),
    challenge2Btn: document.getElementById("challenge2Btn"),
    challenge3Btn: document.getElementById("challenge3Btn"),
    missionSpecialHomeBtn: document.getElementById("missionSpecialHomeBtn"),

    // Form fields (nome/setor)
    userNameEl: document.getElementById("userName"),
    userSectorEl: document.getElementById("userSector"),
    optRankingEl: document.getElementById("optRanking"),

    // Game HUD
    levelLabel: document.getElementById("levelLabel"),
    instruction: document.getElementById("instruction"),
    remainingCount: document.getElementById("remainingCount"),
    totalFixEl: document.getElementById("totalFix"),
    scoreCountEl: document.getElementById("scoreCount"),

    // Game area/buttons
    messageArea: document.getElementById("messageArea"),
    hintBtn: document.getElementById("hintBtn"),
    skipLevelBtn: document.getElementById("skipLevelBtn"),
    nextLevelBtn: document.getElementById("nextLevelBtn"),

    // Final screen
    finalHomeBtn: document.getElementById("finalHomeBtn"),
    finalRankingBtn: document.getElementById("finalRankingBtn"),
    finalMissionSpecialBtn: document.getElementById("finalMissionSpecialBtn"),
    finalMsgsWrap: document.getElementById("finalMsgsWrap"),
    finalBox1: document.getElementById("finalBox1"),
    finalBox2: document.getElementById("finalBox2"),
    finalBox3: document.getElementById("finalBox3"),
    toggleFinalMsgs: document.getElementById("toggleFinalMsgs"),
  };

  function showOnly(screen){
    [dom.screenLoading, dom.screenAuth, dom.screenForm, dom.screenGame, dom.screenFinal]
      .forEach(el => el && el.classList.toggle("hidden", el !== screen));
  }

  function clampName(name){
    const n = (name || "").trim().replace(/\s+/g, " ");
    return n.length > 60 ? n.slice(0,60) : n;
  }

  function getUserName(){
    return clampName((dom.userNameEl?.value || localStorage.getItem("mission_name") || "").trim());
  }

  function populateSectors(){
    if (!dom.userSectorEl) return;
    const list = (SECTORS || []).filter(s => {
      const t = String(s||"").trim();
      return t && !/^Selecione/i.test(t);
    });
    const opts = ['<option value="">Selecione...</option>']
      .concat(list.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`));
    dom.userSectorEl.innerHTML = opts.join("");
    const saved = (localStorage.getItem("mission_sector") || "").trim();
    if (saved) dom.userSectorEl.value = saved;
  }


  // Persistir nome/setor localmente para não perder (e para ranking por setor)
  dom.userNameEl?.addEventListener("input", () => {
    const v = (dom.userNameEl.value || "").trim();
    if (v) localStorage.setItem("mission_name", v);
  });
  dom.userSectorEl?.addEventListener("change", () => {
    const v = (dom.userSectorEl.value || "").trim();
    if (v) localStorage.setItem("mission_sector", v);
  });

function getUserSector(){
    return (dom.userSectorEl?.value || localStorage.getItem("mission_sector") || "").trim();
  }

  const app = {
    firebase,
    dom,
    data: { THEME_PRESETS, SECTORS, SCORE_RULES },
    ui: { showOnly },
    user: { getUserName, getUserSector },
    utils: { clampName },
    populateSectors
  };

  window.__MISSION_APP__ = app;
  return app;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;"
  }[c]));
}


// Fallback global (para páginas que carregam scripts fora do contexto de módulos)
try { window.createApp = createApp; } catch(e) {}