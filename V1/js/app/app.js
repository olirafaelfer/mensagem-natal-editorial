// V2/js/app/app.js
// Responsável por: estado de UI geral (telas), seleção de nome/setor do visitante,
// e utilitários de perfil que o resto do app consome.
//
// Mantém-se intencionalmente "bobo": não conhece regras do jogo (engine).


function collectDom(){
  const $ = (id)=>document.getElementById(id);
  return {
    // topbar
    userNameEl: $("userName"),
    userSectorEl: $("userSector"),
    // guest / auth profile inputs (ids usados no V2)
    guestNameInput: $("guestName"),
    guestSectorSel: $("guestSector"),
    authSignupNameInput: $("signupName"),
    authSignupSectorSel: $("signupSector"),
  };
}

export function createApp(cfg = {}) {
  // Compat: o main.js chama createApp({ firebase, THEME_PRESETS, SECTORS, SCORE_RULES })
  // Este módulo aceita também createApp({ dom, data }).
  const dom = cfg.dom || collectDom();
  const data = cfg.data || { SECTORS: cfg.SECTORS || cfg.sectors || [] };

  const state = {
    guestName: "",
    guestSector: "",
    // auth profile (quando logado)
    user: null, // { uid, email, name, sector, photoURL }
  };

  const LS_GUEST_NAME = "mn_guest_name";
  const LS_GUEST_SECTOR = "mn_guest_sector";

  function loadGuest(){
    state.guestName = localStorage.getItem(LS_GUEST_NAME) || "";
    state.guestSector = localStorage.getItem(LS_GUEST_SECTOR) || "";
  }

  function saveGuest(){
    localStorage.setItem(LS_GUEST_NAME, state.guestName || "");
    localStorage.setItem(LS_GUEST_SECTOR, state.guestSector || "");
  }

  function fillSelect(sel, sectors){
    if (!sel) return;
    const curr = sel.value;
    sel.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "Selecione…";
    sel.appendChild(opt0);
    for (const s of sectors){
      const o = document.createElement("option");
      o.value = s;
      o.textContent = s;
      sel.appendChild(o);
    }
    // restaura se ainda existir
    if (curr && sectors.includes(curr)) sel.value = curr;
  }

  function populateSectors(){
    const sectors = (data && Array.isArray(data.SECTORS)) ? data.SECTORS : [];
    if(dom && dom.guestSectorSel) fillSelect(dom.guestSectorSel, sectors);
    if(dom && dom.authSignupSectorSel) fillSelect(dom.authSignupSectorSel, sectors);
  }

  function setUserProfile(u){
    state.user = u || null;
    renderTopbar();
  }

  function setGuestProfile(name, sector){
    state.guestName = String(name||"").trim();
    state.guestSector = String(sector||"").trim();
    saveGuest();
    renderTopbar();
  }

  function getEffectiveProfile(){
    if (state.user && state.user.email){
      return {
        mode: "auth",
        uid: state.user.uid,
        email: state.user.email,
        name: state.user.name || (state.user.email.split("@")[0] || "Usuário"),
        sector: state.user.sector || "",
        photoURL: state.user.photoURL || ""
      };
    }
    return {
      mode: "guest",
      uid: null,
      email: "",
      name: state.guestName || "Visitante",
      sector: state.guestSector || ""
    };
  }

  function ensureGuestFilled(){
    // visitante precisa ter nome e setor
    const p = getEffectiveProfile();
    if (p.mode !== "guest") return true;
    if (p.name && p.name !== "Visitante" && p.sector) return true;
    // mostra form
    showOnly(dom.screenForm);
    if (dom.formHint){
      dom.formHint.textContent = "Preencha nome e setor para jogar como visitante.";
    }
    return false;
  }

  function showOnly(el){
    const screens = [dom.screenLoading, dom.screenForm, dom.screenGame, dom.screenRanking, dom.screenProfile];
    for (const s of screens){
      if (!s) continue;
      s.classList.toggle("hidden", s !== el);
    }
  }

  function renderTopbar(){
    if (!dom.userNameEl || !dom.userSectorEl) return;
    const p = getEffectiveProfile();
    dom.userNameEl.textContent = p.name || "";
    dom.userSectorEl.textContent = p.sector || "";
  }

  function bindGuestInputs(){
    if (dom.guestNameInput){
      dom.guestNameInput.value = state.guestName;
      dom.guestNameInput.addEventListener("input", () => {
        state.guestName = dom.guestNameInput.value.trim();
        saveGuest();
        renderTopbar();
      });
    }
    if (dom.guestSectorSel){
      if (state.guestSector) dom.guestSectorSel.value = state.guestSector;
      dom.guestSectorSel.addEventListener("change", () => {
        state.guestSector = dom.guestSectorSel.value;
        saveGuest();
        renderTopbar();
      });
    }
  }

  // init
  loadGuest();
  populateSectors();
  bindGuestInputs();
  renderTopbar();

  return {
    dom,
    data,
    state,
    showOnly,
    populateSectors,
    setUserProfile,
    setGuestProfile,
    getEffectiveProfile,
    ensureGuestFilled
  };
}
