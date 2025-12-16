// js/auth.js — Login / Cadastro de usuários
// Usa Firebase Authentication + Firestore
// Integra com ranking e jogo sem quebrar fluxo existente

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

export function bootAuth(app){

  const auth = getAuth();
  const db   = app.firebase.db;

  /* =========================
     DOM
  ========================= */
  const screenAuth = document.getElementById("screenAuth");
  const loginBtnTop = document.getElementById("loginBtn");

  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");

  const authLogin = document.getElementById("authLogin");
  const authRegister = document.getElementById("authRegister");

  const authStatus = document.getElementById("authStatus");

  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const loginSubmit = document.getElementById("loginSubmit");
  const forgotPassword = document.getElementById("forgotPassword");
  const continueNoLogin = document.getElementById("continueNoLogin");

  const regName = document.getElementById("regName");
  const regSector = document.getElementById("regSector");
  const regEmail = document.getElementById("regEmail");
  const regPassword = document.getElementById("regPassword");
  const registerSubmit = document.getElementById("registerSubmit");
  const backToLogin = document.getElementById("backToLogin");

  /* =========================
     Helpers UI
  ========================= */
  function showAuth(){
    app.ui.showOnly(screenAuth);
  }

  function status(msg, type="ok"){
    if (!authStatus) return;
    authStatus.classList.remove("hidden", "ok", "err");
    authStatus.classList.add(type === "err" ? "err" : "ok");
    authStatus.innerHTML = msg;
  }

  function clearStatus(){
    authStatus?.classList.add("hidden");
  }

  function switchToLogin(){
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    authLogin.classList.remove("hidden");
    authRegister.classList.add("hidden");
    clearStatus();
  }

  function switchToRegister(){
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    authRegister.classList.remove("hidden");
    authLogin.classList.add("hidden");
    clearStatus();
  }

  /* =========================
     Tabs
  ========================= */
  tabLogin?.addEventListener("click", switchToLogin);
  tabRegister?.addEventListener("click", switchToRegister);
  backToLogin?.addEventListener("click", switchToLogin);

  /* =========================
     Abrir tela de login
  ========================= */
  loginBtnTop?.addEventListener("click", () => {
    showAuth();
    switchToLogin();
  });

  /* =========================
     LOGIN
  ========================= */
  loginSubmit?.addEventListener("click", async () => {
    const email = loginEmail.value.trim();
    const pass  = loginPassword.value;

    if (!email || !pass){
      status("Informe e-mail e senha.", "err");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, pass);
      status("Login realizado com sucesso! 🎉");
      setTimeout(() => app.ui.showOnly(app.dom.screenForm), 600);
    } catch (e){
      status("E-mail ou senha inválidos.", "err");
    }
  });

  forgotPassword?.addEventListener("click", async () => {
    const email = loginEmail.value.trim();
    if (!email){
      status("Informe seu e-mail para recuperar a senha.", "err");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      status("E-mail de recuperação enviado.");
    } catch {
      status("Não foi possível enviar o e-mail.", "err");
    }
  });

  continueNoLogin?.addEventListener("click", () => {
    localStorage.setItem("mission_optout_ranking", "1");
    app.ui.showOnly(app.dom.screenForm);
  });

  /* =========================
     CADASTRO
  ========================= */
  registerSubmit?.addEventListener("click", async () => {
    const name = regName.value.trim();
    const sector = regSector.value;
    const email = regEmail.value.trim();
    const pass = regPassword.value;

    if (!name || !sector || !email || !pass){
      status("Preencha todos os campos.", "err");
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);

      // cria perfil do usuário
      await setDoc(doc(db, "users", cred.user.uid), {
        name,
        sector,
        email,
        createdAt: serverTimestamp(),
        role: "user"
      });

      // sincroniza com jogo
      localStorage.setItem("mission_name", name);
      localStorage.setItem("mission_sector", sector);
      localStorage.removeItem("mission_optout_ranking");

      status("Conta criada com sucesso! 🎄");
      setTimeout(() => app.ui.showOnly(app.dom.screenForm), 800);

    } catch (e){
      status("Erro ao criar conta. Verifique o e-mail ou a senha.", "err");
    }
  });

  /* =========================
     Estado global de auth
  ========================= */
  onAuthStateChanged(auth, (user) => {
    if (user){
      app.userAuth = user;
      loginBtnTop.textContent = "👤";
    } else {
      app.userAuth = null;
      loginBtnTop.textContent = "👤";
    }
  });
}
