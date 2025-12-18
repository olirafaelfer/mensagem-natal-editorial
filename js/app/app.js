// js/app/app.js — contexto global do app (DOM + helpers + navegação)
// Mantém IDs do HTML. Sem dependências de Firebase.

function qs(id){ return document.getElementById(id); }

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}

export function createApp({ firebase, THEME_PRESETS, SECTORS, SCORE_RULES }){
  const dom = {
    // Screens
    screenLoading: qs("screenLoading"),
    screenAuth: qs("screenAuth"),
    screenForm: qs("screenForm"),
    screenGame: qs("screenGame"),
    screenFinal: qs("screenFinal"),

    // Top buttons
    challenge1Btn: qs("challenge1Btn"),
    challenge2Btn: qs("challenge2Btn"),
    challenge3Btn: qs("challenge3Btn"),
    rankingBtn: qs("rankingBtn"),
    loginBtn: qs("loginBtn"),
    missionSpecialHomeBtn: qs("missionSpecialHomeBtn"),

    // Visitor profile
    userNameEl: qs("userName"),
    userSectorEl: qs("userSector"),

    // HUD
    hudScore: qs("hudScore"),
    hudStreak: qs("hudStreak"),
    hudLevel: qs("hudLevel"),

    // Game area
    messageBox: qs("messageBox"),
    messageTokens: qs("messageTokens"),
    hintBtn: qs("hintBtn"),
    skipLevelBtn: qs("skipLevelBtn"),
    nextLevelBtn: qs("nextLevelBtn"),
    challengeActions: qs("challengeActions"),

    // Final buttons
    finalHomeBtn: qs("finalHomeBtn"),
    finalRankingBtn: qs("finalRankingBtn"),
    finalNextTaskBtn: qs("finalNextTaskBtn"),
    finalMissionSpecialBtn: qs("finalMissionSpecialBtn"),
    reviewBtn1: qs("reviewBtn1"),
    reviewBtn2: qs("reviewBtn2"),
    reviewBtn3: qs("reviewBtn3"),
  };

  function showOnly(screen){
    [dom.screenLoading, dom.screenAuth, dom.screenForm, dom.screenGame, dom.screenFinal].forEach(el=>{
      if (!el) return;
      el.style.display = (el === screen) ? "block" : "none";
    });
  }

  function populateSectors(){
    const sel = dom.userSectorEl;
    if (!sel) return;
    const opts = (SECTORS || []).filter(s => s && s !== "Selecione…" && s !== "Selecione...");
    const html = ['<option value="">Selecione…</option>']
      .concat(opts.map(s => '<option value="'+escapeHtml(s)+'">'+escapeHtml(s)+'</option>'))
      .join("");
    sel.innerHTML = html;
  }

  function getUserName(){
    return (dom.userNameEl?.value || localStorage.getItem("mission_name") || "").trim();
  }
  function getUserSector(){
    return (dom.userSectorEl?.value || localStorage.getItem("mission_sector") || "").trim();
  }
  function setUserDraft(name, sector){
    if (typeof name === "string") localStorage.setItem("mission_name", name.trim());
    if (typeof sector === "string") localStorage.setItem("mission_sector", sector.trim());
    if (dom.userNameEl) dom.userNameEl.value = localStorage.getItem("mission_name") || "";
    if (dom.userSectorEl) dom.userSectorEl.value = localStorage.getItem("mission_sector") || "";
  }

  function clampName(s){
    const t = (s||"").trim();
    return t.length > 60 ? t.slice(0,60) : t;
  }

  const ui = { showOnly, populateSectors };

  populateSectors();
  setUserDraft(localStorage.getItem("mission_name")||"", localStorage.getItem("mission_sector")||"");

  const app = {
    firebase,
    dom,
    ui,
    THEME_PRESETS,
    SECTORS,
    SCORE_RULES,
    user: { getUserName, getUserSector, setUserDraft },
    utils: { clampName, escapeHtml }
  };

  window.__MISSION_APP__ = app;
  return app;
}
