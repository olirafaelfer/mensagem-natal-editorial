// js/auth.js — Login/Cadastro/Recuperação + modo anônimo
// Requer:
// - app.ui.showOnly (do main.js)
// - app.dom (do main.js) com screenAuth/screenForm/userNameEl/userSectorEl/optRankingEl etc.
// - app.modal { openModal, closeModal } (ui-modal.js)
// - Firebase já inicializado no main.js (initializeApp), pois aqui usamos getAuth(getApp())

import { getApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

export function bootAuth(app) {
  const { openModal, closeModal } = app.modal || {};
  if (!openModal || !closeModal) {
    console.warn("[auth] app.modal não disponível (ui-modal precisa bootar antes).");
    return;
  }

  // Firebase instances (usa o app default criado no main.js)
  const fbApp = getApp();
  const auth = getAuth(fbApp);
  const db = app.firebase?.db || getFirestore(fbApp);

  // Persistência (mantém logado)
  setPersistence(auth, browserLocalPersistence).catch(() => {});

  // ---- Chaves locais ----
  const ANON_KEY = "mission_auth_anon"; // "1" se escolheu modo anônimo
  const USER_CACHE_KEY = "mission_user_cache"; // cache simples do perfil

  // ---- DOM base (do seu main.js) ----
  const dom = app.dom || {};
  const screenAuth = dom.screenAuth || document.getElementById("screenAuth");
  const screenForm = dom.screenForm || document.getElementById("screenForm");
  const loginTopBtn =
    document.getElementById("loginBtn") ||
    document.getElementById("authBtn") ||
    document.getElementById("userLoginBtn"); // fallback

  const userNameEl = dom.userNameEl || document.getElementById("userName");
  const userSectorEl = dom.userSectorEl || document.getElementById("userSector");
  const optRankingEl = dom.optRankingEl || document.getElementById("optRanking");

  // ---- DOM do Auth (IDs esperados) ----
  const $ = (sel) => screenAuth?.querySelector(sel) || document.querySelector(sel);

  const tabLogin = $("#authTabLogin");
  const tabSignup = $("#authTabSignup");

  const panelLogin = $("#authPanelLogin");
  const panelSignup = $("#authPanelSignup");

  const statusBox = $("#authStatus");

  const loginEmail = $("#authLoginEmail");
  const loginPass = $("#authLoginPass");
  const loginBtn = $("#authLoginBtn");

  const forgotBtn = $("#authForgotBtn");

  const signupName = $("#authSignupName");
  const signupSector = $("#authSignupSector"); // pode ser select ou input
  const signupEmail = $("#authSignupEmail");
  const signupPass = $("#authSignupPass");
  const signupBtn = $("#authSignupBtn");

  const anonBtn = $("#authAnonBtn");

  const logoutBtn = $("#authLogoutBtn");

  // ---- Helpers UI ----
  function showStatus(kind, msg) {
    if (!statusBox) {
      // fallback: modal
      openModal({
        title: kind === "error" ? "Erro" : "Info",
        bodyHTML: `<p>${escapeHtml(msg)}</p>`,
        buttons: [{ label: "Ok", onClick: closeModal }],
      });
      return;
    }
    statusBox.classList.remove("show", "error", "ok");
    statusBox.classList.add("show", kind === "error" ? "error" : "ok");
    statusBox.innerHTML = `<p style="margin:0">${escapeHtml(msg)}</p>`;
  }

  function clearStatus() {
    if (!statusBox) return;
    statusBox.classList.remove("show", "error", "ok");
    statusBox.innerHTML = "";
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function isLoggedIn() {
    return !!auth.currentUser;
  }

  function isAnonMode() {
    return localStorage.getItem(ANON_KEY) === "1";
  }

  function setAnonMode(on) {
    if (on) localStorage.setItem(ANON_KEY, "1");
    else localStorage.removeItem(ANON_KEY);
  }

  function goAuthScreen() {
    if (!screenAuth) {
      openModal({
        title: "Auth",
        bodyHTML: `<p>Não encontrei <code>#screenAuth</code> no HTML.</p>`,
        buttons: [{ label: "Ok", onClick: closeModal }],
      });
      return;
    }
    app.ui?.showOnly?.(screenAuth);
  }

  function goFormScreen() {
    if (!screenForm) return;
    app.ui?.showOnly?.(screenForm);
  }

  function setTab(which) {
    // which: "login" | "signup"
    if (tabLogin && tabSignup) {
      tabLogin.classList.toggle("active", which === "login");
      tabSignup.classList.toggle("active", which === "signup");
    }
    if (panelLogin && panelSignup) {
      panelLogin.classList.toggle("hidden", which !== "login");
      panelSignup.classList.toggle("hidden", which !== "signup");
    }
    clearStatus();
  }

  function setFormFieldsFromProfile(profile) {
    if (userNameEl && profile?.name) userNameEl.value = profile.name;
    if (userSectorEl && profile?.sector) userSectorEl.value = profile.sector;

    // guarda também nos locals que o game-core usa
    if (profile?.name) localStorage.setItem("mission_name", profile.name);
    if (profile?.sector) localStorage.setItem("mission_sector", profile.sector);
  }

  async function fetchUserProfile(uid) {
    // cache rápido
    try {
      const cached = JSON.parse(localStorage.getItem(USER_CACHE_KEY) || "null");
      if (cached?.uid === uid && cached?.profile) return cached.profile;
    } catch {}

    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const profile = snap.data();
    try {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ uid, profile }));
    } catch {}
    return profile;
  }

  async function upsertUserProfile(uid, profile) {
    const ref = doc(db, "users", uid);
    await setDoc(
      ref,
      {
        ...profile,
        updatedAt: serverTimestamp(),
        createdAt: profile.createdAt || serverTimestamp(),
      },
      { merge: true }
    );

    try {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ uid, profile }));
    } catch {}
  }

  // ---- Regras: ranking só para logado ----
  function enforceRankingRule() {
    if (!optRankingEl) return;

    // Se marcou ranking, precisa estar logado
    optRankingEl.addEventListener("change", () => {
      if (!optRankingEl.checked) return;

      if (!isLoggedIn()) {
        optRankingEl.checked = false;
        localStorage.setItem("mission_optout_ranking", "1");

        openModal({
          title: "Ranking exige cadastro",
          bodyHTML: `
            <p>Para participar do ranking, você precisa estar logado.</p>
            <p class="muted" style="margin-top:10px">Você pode jogar no modo anônimo, mas sem contabilizar no ranking.</p>
          `,
          buttons: [
            { label: "Continuar anônimo", variant: "ghost", onClick: closeModal },
            { label: "Fazer login", onClick: () => { closeModal(); goAuthScreen(); } }
          ],
        });
      }
    });
  }

  // ---- Handlers Auth ----
  async function handleLogin() {
    clearStatus();
    const email = String(loginEmail?.value || "").trim();
    const pass = String(loginPass?.value || "").trim();

    if (!email || !pass) {
      showStatus("error", "Preencha e-mail e senha.");
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);

      // saiu do modo anônimo
      setAnonMode(false);

      // carrega perfil
      const profile = await fetchUserProfile(cred.user.uid);

      // fallback: se não existir profile ainda, cria o mínimo
      if (!profile) {
        const fallbackName = cred.user.displayName || localStorage.getItem("mission_name") || "";
        const fallbackSector = localStorage.getItem("mission_sector") || "";
        await upsertUserProfile(cred.user.uid, {
          uid: cred.user.uid,
          email: cred.user.email || email,
          name: fallbackName,
          sector: fallbackSector,
        });
      }

      const finalProfile = (profile || (await fetchUserProfile(cred.user.uid))) || null;
      if (finalProfile) setFormFieldsFromProfile(finalProfile);

      showStatus("ok", "Login realizado. Você já pode iniciar a missão.");
      // volta pro form
      goFormScreen();
    } catch (err) {
      console.error("[auth] login error:", err);
      showStatus("error", friendlyAuthError(err));
    }
  }

  async function handleSignup() {
    clearStatus();

    const name = String(signupName?.value || "").trim();
    const sector = String(signupSector?.value || "").trim();
    const email = String(signupEmail?.value || "").trim();
    const pass = String(signupPass?.value || "").trim();

    if (!name || name.length < 2) {
      showStatus("error", "Informe seu nome (mínimo 2 caracteres).");
      return;
    }
    if (!sector || sector.length < 2) {
      showStatus("error", "Informe seu setor.");
      return;
    }
    if (!email) {
      showStatus("error", "Informe seu e-mail.");
      return;
    }
    if (!pass || pass.length < 6) {
      showStatus("error", "A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);

      // define displayName
      try { await updateProfile(cred.user, { displayName: name }); } catch {}

      await upsertUserProfile(cred.user.uid, {
        uid: cred.user.uid,
        email,
        name,
        sector,
      });

      setAnonMode(false);
      setFormFieldsFromProfile({ name, sector });

      showStatus("ok", "Conta criada com sucesso. Você já pode iniciar a missão.");
      goFormScreen();
    } catch (err) {
      console.error("[auth] signup error:", err);
      showStatus("error", friendlyAuthError(err));
    }
  }

  async function handleForgotPassword() {
    clearStatus();
    const email =
      String(loginEmail?.value || signupEmail?.value || "").trim();

    if (!email) {
      showStatus("error", "Digite seu e-mail (na aba Login) para recuperar a senha.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showStatus("ok", "Enviamos um e-mail de recuperação. Verifique sua caixa de entrada.");
    } catch (err) {
      console.error("[auth] forgot error:", err);
      showStatus("error", friendlyAuthError(err));
    }
  }

  async function handleAnon() {
    // mantém como anônimo, mas pode jogar
    setAnonMode(true);

    // garante ranking desligado
    if (optRankingEl) {
      optRankingEl.checked = false;
      localStorage.setItem("mission_optout_ranking", "1");
    }

    showStatus("ok", "Modo anônimo ativado. Você pode jogar, mas sem entrar no ranking.");
    goFormScreen();
  }

  async function handleLogout() {
    clearStatus();
    try {
      await signOut(auth);
      // opcional: mantém o nome/setor do form, mas remove cache de usuário
      localStorage.removeItem(USER_CACHE_KEY);
      showStatus("ok", "Você saiu da conta.");
    } catch (err) {
      console.error("[auth] logout error:", err);
      showStatus("error", "Não foi possível sair.");
    }
  }

  function friendlyAuthError(err) {
    const code = err?.code || "";
    if (code.includes("auth/invalid-credential")) return "E-mail ou senha inválidos.";
    if (code.includes("auth/user-not-found")) return "Usuário não encontrado.";
    if (code.includes("auth/wrong-password")) return "Senha incorreta.";
    if (code.includes("auth/email-already-in-use")) return "Este e-mail já está em uso.";
    if (code.includes("auth/weak-password")) return "Senha fraca. Use pelo menos 6 caracteres.";
    if (code.includes("auth/invalid-email")) return "E-mail inválido.";
    if (code.includes("auth/too-many-requests")) return "Muitas tentativas. Tente novamente mais tarde.";
    return err?.message ? String(err.message) : "Erro inesperado.";
  }

  // ---- Wiring de UI ----
  loginTopBtn?.addEventListener("click", () => {
    // se estiver logado, abre auth como “perfil”
    goAuthScreen();
    setTab("login");
  });

  tabLogin?.addEventListener("click", () => setTab("login"));
  tabSignup?.addEventListener("click", () => setTab("signup"));

  loginBtn?.addEventListener("click", handleLogin);
  signupBtn?.addEventListener("click", handleSignup);
  forgotBtn?.addEventListener("click", handleForgotPassword);
  anonBtn?.addEventListener("click", handleAnon);
  logoutBtn?.addEventListener("click", handleLogout);

  enforceRankingRule();

  // ---- Estado: quando o auth muda, atualiza o form ----
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      setAnonMode(false);
      const profile = await fetchUserProfile(user.uid);
      if (profile) setFormFieldsFromProfile(profile);

      // se o usuário quiser, ainda pode desligar ranking manualmente.
      // (não forçamos ligado)
    } else {
      // deslogado: não mexe no form automaticamente (deixa user decidir)
      // mas se estiver anônimo, ranking continua proibido
      if (isAnonMode() && optRankingEl) {
        optRankingEl.checked = false;
        localStorage.setItem("mission_optout_ranking", "1");
      }
    }
  });

  // ---- API exposta pro resto do app (opcional) ----
  app.auth = {
    auth,
    db,
    isLoggedIn,
    isAnonMode,
    goAuthScreen,
    goFormScreen,
    getCurrentUser: () => auth.currentUser,
  };
}
