// js/auth.js — Login/Cadastro/Anônimo + Perfil (Sair / Deletar conta)
// Requer:
// - app.firebase.db (Firestore)
// - app.modal (openModal/closeModal)
// - Inputs do form principal: #userName, #userSector, #optRanking
// - Botão topo: #authBtn

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  deleteUser,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

export function bootAuth(app) {
  // ✅ blindagem contra boot duplicado
  if (app.__AUTH_BOOTED__ === true) {
    console.warn("[auth] bootAuth já executado. Ignorando segunda inicialização.");
    return;
  }
  app.__AUTH_BOOTED__ = true;

  const db = app.firebase?.db;
  if (!db) {
    console.warn("[auth] Firestore (app.firebase.db) não disponível.");
    return;
  }

  const auth = getAuth(); // usa default app já inicializado no main.js
  const { openModal, closeModal } = app.modal || {};
  const hasModal = typeof openModal === "function" && typeof closeModal === "function";
  if (!hasModal) {
    console.warn("[auth] app.modal não disponível (ui-modal).");
    return;
  }

  // --- DOM principal (form do jogo) ---
  const nameEl = document.getElementById("userName");
  const sectorEl = document.getElementById("userSector");
  const optRankingEl = document.getElementById("optRanking");
  const authBtn = document.getElementById("authBtn");

  // Estado
  let currentUser = null;
  let currentProfile = null;

  // trava para impedir double click / múltiplas ações simultâneas
  let busy = false;

  authBtn?.addEventListener("click", () => {
    if (currentUser) openAccountPanel();
    else openAuthGate({ forceNoClose: false });
  });

  onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;
    currentProfile = null;

    if (currentUser) {
      try {
        currentProfile = await fetchOrCreateProfile(currentUser);
        if (currentProfile) applyLoggedProfileToForm(currentProfile);
        else lockIdentityFields(true);
      } catch (e) {
        console.warn("[auth] falha ao carregar/criar profile:", e);
        lockIdentityFields(true);
      }
    } else {
      lockIdentityFields(false);
      // mantém o que usuário digitou/localStorage no modo anônimo
    }
  });

  // -----------------------------
  // Profile: carregar/criar
  // -----------------------------
  async function fetchOrCreateProfile(user) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data() || {};
      return {
        uid: user.uid,
        email: user.email || data.email || "",
        name: data.name || "",
        sector: data.sector || "",
      };
    }

    // cria profile com fallback do form/localStorage
    const fallbackName = (nameEl?.value || localStorage.getItem("mission_name") || "").trim();
    const fallbackSector = (sectorEl?.value || localStorage.getItem("mission_sector") || "").trim();

    const payload = {
      uid: user.uid,
      email: user.email || "",
      name: clampLen(fallbackName, 60) || "(Sem nome)",
      sector: clampLen(fallbackSector, 120) || "(Sem setor)",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, payload, { merge: true });

    return {
      uid: payload.uid,
      email: payload.email,
      name: payload.name,
      sector: payload.sector,
    };
  }

  // -----------------------------
  // Aplicar perfil no form e travar
  // -----------------------------
  function applyLoggedProfileToForm(profile) {
    if (nameEl) nameEl.value = profile.name || "";
    if (sectorEl) sectorEl.value = profile.sector || "";

    if (profile.name) localStorage.setItem("mission_name", profile.name);
    if (profile.sector) localStorage.setItem("mission_sector", profile.sector);

    lockIdentityFields(true);
  }

  function lockIdentityFields(locked) {
    if (nameEl) {
      if (locked) {
        nameEl.setAttribute("disabled", "disabled");
        nameEl.classList.add("auth-locked");
        nameEl.title = "Você está logado — nome vem do seu perfil.";
      } else {
        nameEl.removeAttribute("disabled");
        nameEl.classList.remove("auth-locked");
        nameEl.title = "";
      }
    }

    if (sectorEl) {
      if (locked) {
        sectorEl.setAttribute("disabled", "disabled");
        sectorEl.classList.add("auth-locked");
        sectorEl.title = "Você está logado — setor vem do seu perfil.";
      } else {
        sectorEl.removeAttribute("disabled");
        sectorEl.classList.remove("auth-locked");
        sectorEl.title = "";
      }
    }
  }

  // -----------------------------
  // Gate principal (login/cadastro/anon)
  // -----------------------------
  function openAuthGate({ forceNoClose } = { forceNoClose: true }) {
    busy = false;

    openModal({
      title: "🔐 Entrar ou criar conta",
      bodyHTML: renderAuthHTML({ noClose: !!forceNoClose }),
      buttons: forceNoClose
        ? [] // sem botão fechar quando for o primeiro modal do app
        : [{ label: "Fechar", onClick: closeModal }],
    });

    wireAuthModalHandlers();
  }

  function renderAuthHTML({ noClose }) {
    const sectorsHTML = buildSectorOptionsHTML();

    return `
      <div class="auth-head">
        <h4 class="auth-title" style="margin:0">Acesse para entrar no ranking</h4>
        <p class="auth-sub" style="margin:0">
          Se preferir, você pode usar o modo anônimo (sem ranking).
        </p>
      </div>

      <div class="auth-tabs" role="tablist" aria-label="Autenticação">
        <div class="auth-tab active" id="authTabLogin" role="tab" aria-selected="true">Login</div>
        <div class="auth-tab" id="authTabSignup" role="tab" aria-selected="false">Criar conta</div>
      </div>

      <div id="authStatus" class="auth-status"></div>

      <div id="authPaneLogin">
        <div class="auth-grid onecol">
          <label class="field">
            <span>E-mail</span>
            <input class="input" id="authLoginEmail" type="email" autocomplete="email" placeholder="seu@email.com"/>
          </label>
          <label class="field">
            <span>Senha</span>
            <input class="input" id="authLoginPass" type="password" autocomplete="current-password" placeholder="••••••••"/>
          </label>
        </div>

        <div class="auth-actions">
          <button class="btn" id="authLoginBtn" type="button">Entrar</button>
          <button class="btn ghost" id="authForgotBtn" type="button">Esqueci minha senha</button>
        </div>
      </div>

      <div id="authPaneSignup" class="hidden">
        <div class="auth-grid">
          <label class="field">
            <span>Nome</span>
            <input class="input" id="authSignupName" type="text" maxlength="60" placeholder="Seu nome"/>
          </label>
          <label class="field">
            <span>Setor</span>
            <select class="input" id="authSignupSector">${sectorsHTML}</select>
          </label>
        </div>

        <div class="auth-grid onecol" style="margin-top:12px">
          <label class="field">
            <span>E-mail</span>
            <input class="input" id="authSignupEmail" type="email" autocomplete="email" placeholder="seu@email.com"/>
          </label>
          <label class="field">
            <span>Senha</span>
            <input class="input" id="authSignupPass" type="password" autocomplete="new-password" placeholder="Crie uma senha"/>
          </label>
        </div>

        <div class="auth-actions">
          <button class="btn" id="authSignupBtn" type="button">Criar conta</button>
        </div>
      </div>

      <hr class="auth-divider"/>

      <div class="auth-note">
        <b>Modo anônimo</b><br/>
        Você pode fazer a missão sem cadastro, mas <b>não participa do ranking</b>.
        <div class="auth-actions" style="margin-top:10px">
          <button class="btn ghost" id="authAnonBtn" type="button">Prefiro não me cadastrar</button>
          ${noClose ? `<span class="auth-mini">Você poderá logar depois pelo botão do topo.</span>` : ""}
        </div>
      </div>
    `;
  }

  function wireAuthModalHandlers() {
    const tabLogin = document.getElementById("authTabLogin");
    const tabSignup = document.getElementById("authTabSignup");
    const paneLogin = document.getElementById("authPaneLogin");
    const paneSignup = document.getElementById("authPaneSignup");

    tabLogin?.addEventListener("click", () => {
      tabLogin.classList.add("active");
      tabSignup?.classList.remove("active");
      tabLogin.setAttribute("aria-selected", "true");
      tabSignup?.setAttribute("aria-selected", "false");
      paneLogin?.classList.remove("hidden");
      paneSignup?.classList.add("hidden");
      clearStatus();
    });

    tabSignup?.addEventListener("click", () => {
      tabSignup.classList.add("active");
      tabLogin?.classList.remove("active");
      tabSignup.setAttribute("aria-selected", "true");
      tabLogin?.setAttribute("aria-selected", "false");
      paneSignup?.classList.remove("hidden");
      paneLogin?.classList.add("hidden");
      clearStatus();
    });

    document.getElementById("authLoginBtn")?.addEventListener("click", doLogin);
    document.getElementById("authSignupBtn")?.addEventListener("click", doSignup);
    document.getElementById("authForgotBtn")?.addEventListener("click", openForgotPassword);
    document.getElementById("authAnonBtn")?.addEventListener("click", () => {
      clearStatus();
      closeModal();
    });

    setTimeout(() => document.getElementById("authLoginEmail")?.focus(), 60);
  }

  // -----------------------------
  // Login
  // -----------------------------
  async function doLogin() {
    if (busy) return;
    busy = true;

    const email = (document.getElementById("authLoginEmail")?.value || "").trim();
    const pass = (document.getElementById("authLoginPass")?.value || "").trim();

    if (!email || !pass) {
      showStatus("Preencha e-mail e senha.", "error");
      busy = false;
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, pass);
      showStatus("Login realizado ✅", "ok");
      setTimeout(() => closeModal(), 300);
    } catch (e) {
      showStatus(humanAuthError(e), "error");
      busy = false;
    }
  }

  // -----------------------------
  // Cadastro
  // -----------------------------
  async function doSignup() {
    if (busy) return;
    busy = true;

    const name = (document.getElementById("authSignupName")?.value || "").trim();
    const sector = (document.getElementById("authSignupSector")?.value || "").trim();
    const email = (document.getElementById("authSignupEmail")?.value || "").trim();
    const pass = (document.getElementById("authSignupPass")?.value || "").trim();

    if (!name || !sector || !email || !pass) {
      showStatus("Preencha nome, setor, e-mail e senha.", "error");
      busy = false;
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);

      const payload = {
        uid: cred.user.uid,
        email,
        name: clampLen(name, 60),
        sector: clampLen(sector, 120),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // ✅ 1 profile por uid (não duplica)
      await setDoc(doc(db, "users", cred.user.uid), payload, { merge: true });

      showStatus("Conta criada ✅", "ok");
      setTimeout(() => closeModal(), 300);
    } catch (e) {
      showStatus(humanAuthError(e), "error");
      busy = false;
    }
  }

  // -----------------------------
  // Esqueci minha senha (SÓ EMAIL)
  // -----------------------------
  function openForgotPassword() {
    busy = false;

    openModal({
      title: "🔁 Recuperar senha",
      bodyHTML: `
        <p class="muted" style="margin-top:0">
          Informe seu e-mail. Você receberá um link para redefinir a senha.
        </p>

        <label class="field">
          <span>E-mail</span>
          <input class="input" id="authResetEmail" type="email" autocomplete="email" placeholder="seu@email.com"/>
        </label>

        <div id="authResetStatus" class="auth-status show" style="display:block"></div>
      `,
      buttons: [
        { label: "Voltar", variant: "ghost", onClick: () => { closeModal(); openAuthGate({ forceNoClose: false }); } },
        {
          label: "Enviar link",
          onClick: async () => {
            if (busy) return;
            busy = true;

            const email = (document.getElementById("authResetEmail")?.value || "").trim();
            const st = document.getElementById("authResetStatus");

            if (!email) {
              if (st) {
                st.className = "auth-status show error";
                st.textContent = "Digite seu e-mail.";
              }
              busy = false;
              return;
            }

            try {
              await sendPasswordResetEmail(auth, email);
              if (st) {
                st.className = "auth-status show ok";
                st.textContent = "Link enviado! Verifique sua caixa de entrada (e spam).";
              }
            } catch (e) {
              if (st) {
                st.className = "auth-status show error";
                st.textContent = humanAuthError(e);
              }
            } finally {
              busy = false;
            }
          },
        },
      ],
    });

    setTimeout(() => document.getElementById("authResetEmail")?.focus(), 60);
  }

  // -----------------------------
  // Painel de conta (logado)
  // -----------------------------
  function openAccountPanel() {
    busy = false;

    const name = currentProfile?.name || currentUser?.displayName || "(sem nome)";
    const email = currentProfile?.email || currentUser?.email || "(sem e-mail)";
    const sector = currentProfile?.sector || "(sem setor)";

    openModal({
      title: "👤 Minha conta",
      bodyHTML: `
        <div class="auth-profile">
          <div class="who">
            <b>${escapeHtml(name)}</b>
            <small>${escapeHtml(email)}</small>
            <small class="muted">Setor: ${escapeHtml(sector)}</small>
          </div>
        </div>

        <div class="auth-actions" style="margin-top:14px">
          <button class="btn ghost" id="authLogoutBtn" type="button">Sair</button>
          <button class="btn" id="authDeleteBtn" type="button">Deletar conta</button>
        </div>

        <p class="auth-mini" style="margin-top:12px">
          Ao deletar a conta, seu perfil e seu usuário de autenticação serão removidos.
        </p>
      `,
      buttons: [{ label: "Fechar", onClick: closeModal }],
    });

    setTimeout(() => {
      document.getElementById("authLogoutBtn")?.addEventListener("click", doLogout);
      document.getElementById("authDeleteBtn")?.addEventListener("click", confirmDeleteAccount);
    }, 0);
  }

  async function doLogout() {
    if (busy) return;
    busy = true;

    try {
      await signOut(auth);
      closeModal();
    } catch (e) {
      openModal({
        title: "Erro",
        bodyHTML: `<p class="muted"><code>${escapeHtml(e?.message || String(e))}</code></p>`,
        buttons: [{ label: "Ok", onClick: closeModal }],
      });
    } finally {
      busy = false;
    }
  }

  function confirmDeleteAccount() {
    openModal({
      title: "⚠️ Deletar conta",
      bodyHTML: `
        <p><strong>Tem certeza?</strong></p>
        <p class="muted">
          Isso remove seu perfil e seu acesso. Você poderá criar outra conta depois.
        </p>
      `,
      buttons: [
        { label: "Cancelar", variant: "ghost", onClick: closeModal },
        {
          label: "Sim, deletar",
          onClick: async () => {
            closeModal();
            await doDeleteAccount();
          },
        },
      ],
    });
  }

  async function doDeleteAccount() {
    if (!currentUser) return;

    openModal({
      title: "Deletando…",
      bodyHTML: `<p class="muted" style="margin-top:0">Aguarde…</p>`,
      buttons: [],
    });

    try {
      // 1) apaga profile no Firestore
      await deleteDoc(doc(db, "users", currentUser.uid));

      // 2) apaga usuário do Auth
      await deleteUser(currentUser);

      openModal({
        title: "Conta removida ✅",
        bodyHTML: `<p>Conta deletada com sucesso.</p>`,
        buttons: [{ label: "Ok", onClick: closeModal }],
      });
    } catch (e) {
      const msg = humanAuthError(e);
      openModal({
        title: "Não foi possível deletar",
        bodyHTML: `
          <p>${escapeHtml(msg)}</p>
          <p class="muted" style="margin-top:10px">
            Se aparecer <code>requires-recent-login</code>, faça logout, login novamente e tente deletar.
          </p>
        `,
        buttons: [{ label: "Ok", onClick: closeModal }],
      });
    } finally {
      busy = false;
    }
  }

  // -----------------------------
  // Ranking toggle: aviso quando anônimo tentar participar
  // -----------------------------
  optRankingEl?.addEventListener("change", () => {
    if (!currentUser && optRankingEl.checked) {
      optRankingEl.checked = false;
      localStorage.setItem("mission_optout_ranking", "1");

      openModal({
        title: "Ranking requer cadastro",
        bodyHTML: `
          <p>Para participar do ranking, é necessário criar uma conta ou fazer login.</p>
          <p class="muted" style="margin-top:10px">Você pode continuar no modo anônimo, mas sem ranking.</p>
        `,
        buttons: [
          { label: "Ok", onClick: closeModal },
          { label: "Fazer login", onClick: () => { closeModal(); openAuthGate({ forceNoClose: false }); } }
        ],
      });
    }
  });

  // -----------------------------
  // Helpers
  // -----------------------------
  function buildSectorOptionsHTML() {
    const sectors = app.data?.SECTORS;

    if (Array.isArray(sectors) && sectors.length) {
      return sectors
        .map((s) => {
          const v = (s === "Selecione…") ? "" : s;
          return `<option value="${escapeHtml(v)}">${escapeHtml(s)}</option>`;
        })
        .join("");
    }

    if (sectorEl && sectorEl.options?.length) {
      return Array.from(sectorEl.options)
        .map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.textContent || "")}</option>`)
        .join("");
    }

    return `<option value="">Selecione…</option>`;
  }

  function showStatus(msg, kind) {
    const box = document.getElementById("authStatus");
    if (!box) return;
    box.className = `auth-status show ${kind === "ok" ? "ok" : "error"}`;
    box.textContent = msg;
  }

  function clearStatus() {
    const box = document.getElementById("authStatus");
    if (!box) return;
    box.className = "auth-status";
    box.textContent = "";
  }

  function humanAuthError(e) {
    const code = String(e?.code || "");
    if (code.includes("auth/invalid-email")) return "E-mail inválido.";
    if (code.includes("auth/user-not-found")) return "Usuário não encontrado.";
    if (code.includes("auth/wrong-password")) return "Senha incorreta.";
    if (code.includes("auth/invalid-credential")) return "Credenciais inválidas.";
    if (code.includes("auth/email-already-in-use")) return "Este e-mail já está em uso.";
    if (code.includes("auth/weak-password")) return "Senha fraca. Use uma senha mais forte.";
    if (code.includes("auth/too-many-requests")) return "Muitas tentativas. Tente novamente em alguns minutos.";
    if (code.includes("auth/requires-recent-login")) return "Por segurança, faça login novamente e tente deletar a conta.";
    return e?.message ? String(e.message) : "Erro inesperado.";
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function clampLen(s, max) {
    const v = String(s || "").trim().replace(/\s+/g, " ");
    return v.length > max ? v.slice(0, max) : v;
  }

  // ✅ Se você quiser que o login abra sozinho ao iniciar o app:
  // chame app.auth.openGate() no final do bootAll() ou aqui:
  // openAuthGate({ forceNoClose: true });

  // Opcional: expor helpers para outros módulos
  app.auth = app.auth || {};
  app.auth.openAuthGate = openAuthGate;
  app.auth.openAccountPanel = openAccountPanel;
}
