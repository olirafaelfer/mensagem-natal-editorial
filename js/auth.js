// js/auth.js — Login / Cadastro / Recuperação / Anônimo
// Requer:
// - app.modal (openModal, closeModal)
// - app.firebase.db (Firestore)
// - app.data.SECTORS
// - style.css + auth.css

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

export function bootAuth(app){

  const { openModal, closeModal } = app.modal || {};
  const db = app.firebase?.db;

  if (!openModal || !closeModal || !db) {
    console.warn("[auth] Dependências não disponíveis");
    return;
  }

  /* =========================
     Estado
  ========================= */
  let currentUser = null; // { uid, name, email, sector }

  const LS_USER_KEY = "mission_auth_user";

  /* =========================
     Utils
  ========================= */
  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function normalize(str){
    return (str || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  }

  function uidFromEmail(email){
    return normalize(email).replace(/[^a-z0-9]+/g, "_");
  }

  function setStatus(el, msg, type){
    if (!el) return;
    el.textContent = msg;
    el.className = `auth-status show ${type || ""}`;
  }

  function clearStatus(el){
    if (!el) return;
    el.textContent = "";
    el.className = "auth-status";
  }

  /* =========================
     Persistência local
  ========================= */
  function saveSession(user){
    currentUser = user;
    localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
  }

  function loadSession(){
    try{
      const raw = localStorage.getItem(LS_USER_KEY);
      if (!raw) return null;
      currentUser = JSON.parse(raw);
      return currentUser;
    }catch{
      return null;
    }
  }

  function clearSession(){
    currentUser = null;
    localStorage.removeItem(LS_USER_KEY);
  }

  loadSession();

  /* =========================
     UI Builders
  ========================= */

  function sectorOptionsHTML(selected=""){
    return app.data.SECTORS
      .filter(s => s && s !== "Selecione…")
      .map(s => `<option value="${escapeHtml(s)}" ${s===selected?"selected":""}>${escapeHtml(s)}</option>`)
      .join("");
  }

  function openAuthGate(){
    renderLogin();
  }

  function renderLogin(){
    openModal({
      title: "🔐 Acesso",
      bodyHTML: `
        <div class="auth-card">
          <div class="auth-inner">

            <div class="auth-head">
              <h3 class="auth-title">Entrar</h3>
              <p class="auth-sub">Acesse sua conta ou continue sem cadastro.</p>
            </div>

            <div class="auth-grid onecol">
              <input class="input" id="authEmail" type="email" placeholder="E-mail" />
              <input class="input" id="authPass" type="password" placeholder="Senha" />
            </div>

            <div class="auth-status" id="authStatus"></div>

            <div class="auth-actions">
              <button class="btn" id="authLoginBtn">Entrar</button>
              <button class="btn ghost" id="authGoRegister">Criar conta</button>
              <button class="btn ghost" id="authGoForgot">Esqueci minha senha</button>
            </div>

            <hr class="auth-divider">

            <div class="auth-actions">
              <button class="btn ghost" id="authAnonBtn">Prefiro continuar como anônimo</button>
            </div>

          </div>
        </div>
      `,
      buttons: []
    });

    setTimeout(bindLoginEvents, 0);
  }

  function renderRegister(){
    openModal({
      title: "📝 Criar conta",
      bodyHTML: `
        <div class="auth-card">
          <div class="auth-inner">

            <div class="auth-head">
              <h3 class="auth-title">Cadastro</h3>
              <p class="auth-sub">Crie sua conta para participar do ranking.</p>
            </div>

            <div class="auth-grid">
              <input class="input" id="regName" placeholder="Nome completo" />
              <select class="input" id="regSector">
                <option value="">Selecione o setor</option>
                ${sectorOptionsHTML()}
              </select>
              <input class="input" id="regEmail" type="email" placeholder="E-mail" />
              <input class="input" id="regPass" type="password" placeholder="Senha" />
            </div>

            <div class="auth-status" id="regStatus"></div>

            <div class="auth-actions">
              <button class="btn" id="regCreateBtn">Criar conta</button>
              <button class="btn ghost" id="regBackBtn">Voltar</button>
            </div>

          </div>
        </div>
      `,
      buttons: []
    });

    setTimeout(bindRegisterEvents, 0);
  }

  function renderForgot(){
    openModal({
      title: "🔑 Recuperar senha",
      bodyHTML: `
        <div class="auth-card">
          <div class="auth-inner">

            <div class="auth-head">
              <h3 class="auth-title">Recuperação</h3>
              <p class="auth-sub">Informe seu e-mail para redefinir a senha.</p>
            </div>

            <div class="auth-grid onecol">
              <input class="input" id="forgotEmail" type="email" placeholder="E-mail cadastrado" />
            </div>

            <div class="auth-status" id="forgotStatus"></div>

            <div class="auth-actions">
              <button class="btn" id="forgotSendBtn">Redefinir senha</button>
              <button class="btn ghost" id="forgotBackBtn">Voltar</button>
            </div>

          </div>
        </div>
      `,
      buttons: []
    });

    setTimeout(bindForgotEvents, 0);
  }

  function openAccountPanel(){
    if (!currentUser) return;

    openModal({
      title: "👤 Minha conta",
      bodyHTML: `
        <div class="auth-card">
          <div class="auth-inner">

            <div class="auth-profile">
              <div class="who">
                <b>${escapeHtml(currentUser.name)}</b>
                <small>${escapeHtml(currentUser.email)}</small>
                <small>${escapeHtml(currentUser.sector)}</small>
              </div>
            </div>

            <div class="auth-actions" style="margin-top:14px">
              <button class="btn ghost" id="authLogoutBtn">Sair</button>
              <button class="btn ghost" id="authDeleteBtn">Excluir conta</button>
            </div>

          </div>
        </div>
      `,
      buttons: []
    });

    setTimeout(bindAccountEvents, 0);
  }

  /* =========================
     Eventos
  ========================= */

  function bindLoginEvents(){
    const status = document.getElementById("authStatus");

    document.getElementById("authLoginBtn")?.addEventListener("click", async () => {
      clearStatus(status);

      const email = document.getElementById("authEmail")?.value || "";
      const pass  = document.getElementById("authPass")?.value || "";

      if (!email || !pass){
        setStatus(status, "Preencha e-mail e senha.", "error");
        return;
      }

      try{
        const uid = uidFromEmail(email);
        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);

        if (!snap.exists()){
          setStatus(status, "Usuário não encontrado.", "error");
          return;
        }

        const data = snap.data();
        if (data.password !== pass){
          setStatus(status, "Senha incorreta.", "error");
          return;
        }

        saveSession({
          uid,
          name: data.name,
          email: data.email,
          sector: data.sector
        });

        // preenche form principal
        app.dom.userNameEl.value = data.name;
        app.dom.userSectorEl.value = data.sector;

        closeModal();

      }catch(e){
        console.error(e);
        setStatus(status, "Erro ao realizar login.", "error");
      }
    });

    document.getElementById("authGoRegister")?.addEventListener("click", renderRegister);
    document.getElementById("authGoForgot")?.addEventListener("click", renderForgot);
    document.getElementById("authAnonBtn")?.addEventListener("click", () => closeModal());
  }

  function bindRegisterEvents(){
    const status = document.getElementById("regStatus");

    document.getElementById("regCreateBtn")?.addEventListener("click", async () => {
      clearStatus(status);

      const name   = document.getElementById("regName")?.value || "";
      const sector = document.getElementById("regSector")?.value || "";
      const email  = document.getElementById("regEmail")?.value || "";
      const pass   = document.getElementById("regPass")?.value || "";

      if (!name || !sector || !email || !pass){
        setStatus(status, "Preencha todos os campos.", "error");
        return;
      }

      const uid = uidFromEmail(email);

      try{
        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);

        if (snap.exists()){
          setStatus(status, "Este e-mail já está cadastrado.", "error");
          return;
        }

        await setDoc(ref, {
          name,
          sector,
          email,
          password: pass,
          createdAt: serverTimestamp()
        });

        setStatus(status, "Conta criada com sucesso! Faça login.", "ok");

        setTimeout(renderLogin, 800);

      }catch(e){
        console.error(e);
        setStatus(status, "Erro ao criar conta.", "error");
      }
    });

    document.getElementById("regBackBtn")?.addEventListener("click", renderLogin);
  }

  function bindForgotEvents(){
    const status = document.getElementById("forgotStatus");

    document.getElementById("forgotSendBtn")?.addEventListener("click", async () => {
      clearStatus(status);

      const email = document.getElementById("forgotEmail")?.value || "";
      if (!email){
        setStatus(status, "Informe o e-mail.", "error");
        return;
      }

      const uid = uidFromEmail(email);

      try{
        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);

        if (!snap.exists()){
          setStatus(status, "E-mail não encontrado.", "error");
          return;
        }

        setStatus(
          status,
          "Solicitação registrada. Contate o administrador para redefinir a senha.",
          "ok"
        );

      }catch(e){
        console.error(e);
        setStatus(status, "Erro na recuperação.", "error");
      }
    });

    document.getElementById("forgotBackBtn")?.addEventListener("click", renderLogin);
  }

  function bindAccountEvents(){
    document.getElementById("authLogoutBtn")?.addEventListener("click", () => {
      clearSession();
      closeModal();
    });

    document.getElementById("authDeleteBtn")?.addEventListener("click", async () => {
      if (!currentUser) return;

      const uid = currentUser.uid;

      await updateDoc(doc(db, "users", uid), {
        deletedAt: serverTimestamp()
      });

      clearSession();
      closeModal();
    });
  }

  /* =========================
     Exposição global
  ========================= */
  app.auth = {
    openAuthGate,
    openAccountPanel,
    isLogged: () => !!currentUser
  };
}
