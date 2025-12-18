// js/a
    populateSectors,pp/app.js — contexto global (DOM + helpers)
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
    challenge2Btn: document.getElementById("challenge2Btn"),
    challenge3Btn: document.getElementById("challenge3Btn"),

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
    finalMsgsWrap: document.getElementById("finalMsgsWrap"),
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
    if (!dom.userSector) return;
    dom.userSector.innerHTML = '<option value="">Selecione...</option>' + (SECTORS||[]).map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  }

function getUserSector(){
    return (dom.userSectorEl?.value || localStorage.getItem("mission_sector") || "").trim();
  }

  const app = {
    firebase,
    dom,
    data: { THEME_PRESETS, SECTORS, SCORE_RULES },
    ui: { showOnly },
    user: { getUserName, getUserSector },
    utils: { clampName }
  };

  window.__MISSION_APP__ = app;
  return app;
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
