// js/auth.js — Login/Cadastro/Anônimo + Perfil (Sair / Deletar conta)
// - Gate abre automaticamente no início (sem botão fechar)
// - Tabs e botões funcionam via delegação dentro do #modalBody (ui-modal)
// - Logado trava nome/setor
// - Anônimo não participa do ranking
//
// Correções importantes:
// ✅ evita listeners duplicados (handler fixo + root.onclick)
// ✅ evita double click (busy lock)
// ✅ evita boot duplicado (app.__AUTH_BOOTED__)
//
// Ajustes solicitados agora:
// ✅ Logout efetivo + ao sair vira anônimo (desmarca ranking / libera nome+setor)
// ✅ Ao deletar conta: apaga também ranking individual do usuário (individualRanking)
// ✅ Ao deslogar (logout/delete): bloqueia ranking e libera nome+setor

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

  const auth = getAuth();

  const { openModal, closeModal } = app.modal || {};
  if (typeof openModal !== "function" || typeof closeModal !== "function") {
    console.warn("[auth] app.modal não disponível (ui-modal).");
    return;
  }

  // --- DOM principal (form do jogo) ---
  const nameEl = document.getElementById("userName");
  const sectorEl = document.getElementById("userSector");
  const optRankingEl = document.getElementById("optRanking");

  // botão do topo (se você tiver)
  const authBtn =
    document.getElementById("authBtn") ||
    document.getElementById("loginBtn") ||
    document.getElementById("userBtn") ||
    document.getElementById("accountBtn");

  let currentUser = null;
  let currentProfile = null;
  let gateOpen = false;
  let busy = false; // ✅ trava para evitar clique duplo

  // API p/ outros módulos
  app.auth = {
    isLogged: () => !!currentUser,
    getProfile: () => currentProfile,
    openGate: () => openAuthGate({ force: false }),
    openAccount: () => (currentUser ? openAccountPanel() : openAuthGate({ force: false })),
  };

  authBtn?.addEventListener("click", () => {
    if (currentUser) openAccountPanel();
    else openAuthGate({ force: false });
  });

  onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;
    currentProfile = null;

    if (currentUser) {
      currentProfile = await fetchOrCreateProfile(currentUser).catch((e) => {
        console.warn("[auth] falha ao carregar/criar profile:", e);
        return null;
      });

      if (currentProfile) applyLoggedProfileToForm(currentProfile);
      else lockIdentityFields(true);

      // se gate estava aberto, fecha
      if (gateOpen) {
        gateOpen = false;
        unlockModalCloseUI();
        closeModal();
      }
    } else {
      // ✅ ao deslogar (logout/delete): volta para anônimo (sem ranking)
      setAnonymousMode({ reopenGate: false });
    }

    // ✅ garante que não fique "travado" por clique anterior
    busy = false;
  });

  // bloqueia ranking no anônimo
  optRankingEl?.addEventListener("change", () => {
    if (!optRankingEl) return;

    // Se marcou ranking e NÃO está logado -> bloqueia
    if (optRankingEl.checked && !currentUser) {
      optRankingEl.checked = false;
      localStorage.setItem("mission_optout_ranking", "1");

      openModal({
        title: "Ranking requer cadastro",
        bodyHTML: `
          <p>Para participar do ranking, é necessário <strong>criar uma conta</strong> ou <strong>fazer login</strong>.</p>
          <p class="muted" style="margin-top:10px">Você pode continuar no modo anônimo, mas sem ranking.</p>
        `,
        buttons: [
          { label: "Ok", onClick: closeModal },
          { label: "Fazer login", onClick: () => { closeModal(); openAuthGate({ force: true }); } },
        ],
      });
    }
  });

  // =============================
  // GATE
  // =============================
  function openAuthGate({ force } = { force: false }) {
    if (currentUser && !force) {
      openAccountPanel();
      return;
    }

    gateOpen = true;
    busy = false;

    openModal({
      title: "🔐 Entrar ou criar conta",
      bodyHTML: renderAuthHTML(),
      buttons: [], // sem fechar no gate inicial
    });

    lockModalCloseUI();

    afterModalPaint(() => {
      wireAuthDelegationHandlers();
      focusInGate();
    });
  }

  function renderAuthHTML() {
    const sectorsHTML = buildSectorOptionsHTML();
    return `
      <div class="auth-head">
        <h4 class="auth-title" style="margin:0">Acesse para entrar no ranking</h4>
        <p class="auth-sub" style="margin:0">
          Se preferir, você pode usar o modo anônimo (sem ranking).
        </p>
      </div>

      <div class="auth-tabs" role="tablist" aria-label="Autenticação">
        <div class="auth-tab active" data-tab="login" role="tab" aria-selected="true">Login</div>
        <div class="auth-tab" data-tab="signup" role="tab" aria-selected="false">Criar conta</div>
      </div>

      <div data-auth="status" class="auth-status"></div>

      <div data-pane="login">
        <div class="auth-grid onecol">
          <label class="field">
            <span>E-mail</span>
            <input class="input" data-auth="loginEmail" type="email" autocomplete="email" placeholder="seu@email.com"/>
          </label>
          <label class="field">
            <span>Senha</span>
            <input class="input" data-auth="loginPass" type="password" autocomplete="current-password" placeholder="••••••••"/>
          </label>
        </div>

        <div class="auth-actions">
          <button class="btn" data-action="login" type="button">Entrar</button>
          <button class="btn ghost" data-action="forgot" type="button">Esqueci minha senha</button>
        </div>
      </div>

      <div data-pane="signup" class="hidden">
        <div class="auth-grid">
          <label class="field">
            <span>Nome</span>
            <input class="input" data-auth="signupName" type="text" maxlength="60" placeholder="Seu nome"/>
          </label>
          <label class="field">
            <span>Setor</span>
            <select class="input" data-auth="signupSector">${sectorsHTML}</select>
          </label>
        </div>

        <div class="auth-grid onecol" style="margin-top:12px">
          <label class="field">
            <span>E-mail</span>
            <input class="input" data-auth="signupEmail" type="email" autocomplete="email" placeholder="seu@email.com"/>
          </label>
          <label class="field">
            <span>Senha</span>
            <input class="input" data-auth="signupPass" type="password" autocomplete="new-password" placeholder="Crie uma senha"/>
          </label>
        </div>

        <div class="auth-actions">
          <button class="btn" data-action="signup" type="button">Criar conta</button>
        </div>
      </div>

      <hr class="auth-divider"/>

      <div class="auth-note">
        <b>Modo anônimo</b><br/>
        Você pode fazer a missão sem cadastro, mas <b>não participa do ranking</b>.
        <div class="auth-actions" style="margin-top:10px">
          <button class="btn ghost" data-action="anon" type="button">Prefiro não me cadastrar</button>
        </div>
      </div>
    `;
  }

  // ✅ handler fixo (referência estável)
  function gateClickHandler(ev) {
    const root = getModalBody();
    if (!root) return;

    const t = ev.target instanceof HTMLElement ? ev.target : null;
    if (!t) return;

    // Tabs
    const tab = t.closest(".auth-tab");
    if (tab) {
      const key = tab.getAttribute("data-tab");
      if (key === "login") setGateTab("login");
      if (key === "signup") setGateTab("signup");
      return;
    }

    // Actions
    const actBtn = t.closest("[data-action]");
    if (actBtn) {
      const action = actBtn.getAttribute("data-action");

      if (action === "login") doLogin();
      if (action === "signup") doSignup();
      if (action === "forgot") openForgotPassword();
      if (action === "anon") enterAnonymous();

      return;
    }
  }

  function wireAuthDelegationHandlers() {
    const root = getModalBody();
    if (!root) {
      console.warn("[auth] #modalBody não encontrado para wire.");
      return;
    }

    // ✅ evita acumular listeners: sobrescreve onclick
    root.onclick = gateClickHandler;
  }

  function setGateTab(which) {
    const root = getModalBody();
    if (!root) return;

    const tabs = Array.from(root.querySelectorAll(".auth-tab"));
    for (const el of tabs) {
      const is = el.getAttribute("data-tab") === which;
      el.classList.toggle("active", is);
      el.setAttribute("aria-selected", String(is));
    }

    const paneLogin = root.querySelector('[data-pane="login"]');
    const paneSignup = root.querySelector('[data-pane="signup"]');

    if (paneLogin) paneLogin.classList.toggle("hidden", which !== "login");
    if (paneSignup) paneSignup.classList.toggle("hidden", which !== "signup");

    clearStatus();

    if (which === "login") {
      setTimeout(() => root.querySelector('[data-auth="loginEmail"]')?.focus(), 30);
    } else {
      setTimeout(() => root.querySelector('[data-auth="signupName"]')?.focus(), 30);
    }
  }

  function enterAnonymous() {
    if (busy) return;
    busy = true;

    gateOpen = false;
    unlockModalCloseUI();
    closeModal();

    setAnonymousMode({ reopenGate: false });

    busy = false;
  }

  function focusInGate() {
    const root = getModalBody();
    if (!root) return;
    root.querySelector('[data-auth="loginEmail"]')?.focus();
  }

  // =============================
  // LOGIN
  // =============================
  async function doLogin() {
    if (busy) return;
    busy = true;

    const root = getModalBody();
    const email = (root?.querySelector('[data-auth="loginEmail"]')?.value || "").trim();
    const pass = (root?.querySelector('[data-auth="loginPass"]')?.value || "").trim();

    if (!email || !pass) {
      showStatus("Preencha e-mail e senha.", "error");
      busy = false;
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, pass);
      showStatus("Login realizado ✅", "ok");
      // onAuthStateChanged fecha o gate
    } catch (e) {
      showStatus(humanAuthError(e), "error");
      busy = false;
    }
  }

  // =============================
  // CADASTRO
  // =============================
  async function doSignup() {
    if (busy) return;
    busy = true;

    const root = getModalBody();
    const name = (root?.querySelector('[data-auth="signupName"]')?.value || "").trim();
    const sector = (root?.querySelector('[data-auth="signupSector"]')?.value || "").trim();
    const email = (root?.querySelector('[data-auth="signupEmail"]')?.value || "").trim();
    const pass = (root?.querySelector('[data-auth="signupPass"]')?.value || "").trim();

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

      await setDoc(doc(db, "users", cred.user.uid), payload, { merge: true });

      showStatus("Conta criada ✅ Você já está logado.", "ok");
      // onAuthStateChanged fecha o gate
    } catch (e) {
      showStatus(humanAuthError(e), "error");
      busy = false;
    }
  }

  // =============================
  // RECUPERAÇÃO (SÓ EMAIL)
  // =============================
  function openForgotPassword() {
    if (busy) return;
    busy = false;

    unlockModalCloseUI();
    gateOpen = false;

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

        <div id="authResetStatus" class="auth-status show"></div>
      `,
      buttons: [
        { label: "Voltar", variant: "ghost", onClick: () => { closeModal(); openAuthGate({ force: true }); } },
        {
          label: "Enviar link",
          onClick: async () => {
            const email = (document.getElementById("authResetEmail")?.value || "").trim();
            const st = document.getElementById("authResetStatus");
            if (!email) {
              if (st) {
                st.className = "auth-status show error";
                st.textContent = "Digite seu e-mail.";
              }
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
            }
          },
        },
      ],
    });

    setTimeout(() => document.getElementById("authResetEmail")?.focus(), 60);
  }

  // =============================
  // CONTA LOGADA
  // =============================
  function openAccountPanel() {
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
          Ao deletar a conta, seu ranking individual será removido.
          Se aparecer erro de segurança ao deletar, faça login novamente e tente de novo.
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

      // ✅ reforço (caso onAuthStateChanged demore): já volta anônimo agora
      setAnonymousMode({ reopenGate: true });

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
        <p class="muted">Isso remove seu perfil, seu ranking individual e encerra seu acesso.</p>
      `,
      buttons: [
        { label: "Cancelar", variant: "ghost", onClick: closeModal },
        { label: "Sim, deletar", onClick: async () => { closeModal(); await doDeleteAccount(); } },
      ],
    });
  }

  async function doDeleteAccount() {
    if (!currentUser) return;

    openModal({
      title: "Deletando…",
      bodyHTML: `<p class="muted" style="margin-top:0">Aguarde…</p>`,
      buttons: [{ label: "Fechar", onClick: closeModal }],
    });

    try {
      // ✅ 1) apagar ranking individual do usuário (best effort)
      await deleteMyIndividualRanking().catch((e) => {
        console.warn("[auth] falha ao apagar individualRanking do usuário:", e);
      });

      // ✅ 2) apagar profile
      await deleteDoc(doc(db, "users", currentUser.uid));

      // ✅ 3) apagar usuário do Auth
      await deleteUser(currentUser);

      // ✅ encerra tudo e volta para modo anônimo, sem ranking
      gateOpen = false;
      unlockModalCloseUI();

      setAnonymousMode({ reopenGate: true });

      closeModal();

      // opcional: reabrir gate já
      setTimeout(() => {
        openAuthGate({ force: true });
      }, 80);

    } catch (e) {
      const msg = humanAuthError(e);
      openModal({
        title: "Não foi possível deletar",
        bodyHTML: `
          <p>${escapeHtml(msg)}</p>
          <p class="muted" style="margin-top:10px">
            Se aparecer <code>requires-recent-login</code>, saia e entre novamente e tente deletar.
          </p>
        `,
        buttons: [{ label: "Ok", onClick: closeModal }],
      });
    }
  }

  // =============================
  // Deletar ranking individual do usuário
  // =============================
  async function deleteMyIndividualRanking() {
    // A forma mais confiável no seu projeto atual é pelo docId determinístico:
    // individualDocId(name, sector) (mesma ideia que você já usa no main/ranking)
    const name = currentProfile?.name || (nameEl?.value || localStorage.getItem("mission_name") || "").trim();
    const sector = currentProfile?.sector || (sectorEl?.value || localStorage.getItem("mission_sector") || "").trim();
    if (!name || !sector) return;

    const makeId = app.utils?.individualDocId;
    if (typeof makeId !== "function") {
      console.warn("[auth] app.utils.individualDocId não disponível. Não consegui inferir docId do ranking.");
      return;
    }

    const docId = makeId(name, sector);
    await deleteDoc(doc(db, "individualRanking", docId));
  }

  // =============================
  // PROFILE
  // =============================
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

  function applyLoggedProfileToForm(profile) {
    if (nameEl) nameEl.value = profile.name || "";
    if (sectorEl) sectorEl.value = profile.sector || "";

    if (profile.name) localStorage.setItem("mission_name", profile.name);
    if (profile.sector) localStorage.setItem("mission_sector", profile.sector);

    // ✅ logado: pode escolher participar ou não do ranking (mantém toggle)
    lockIdentityFields(true);
  }

  function lockIdentityFields(locked) {
    if (nameEl) {
      if (locked) {
        nameEl.setAttribute("disabled", "disabled");
        nameEl.classList.add("auth-locked");
      } else {
        nameEl.removeAttribute("disabled");
        nameEl.classList.remove("auth-locked");
      }
    }

    if (sectorEl) {
      if (locked) {
        sectorEl.setAttribute("disabled", "disabled");
        sectorEl.classList.add("auth-locked");
      } else {
        sectorEl.removeAttribute("disabled");
        sectorEl.classList.remove("auth-locked");
      }
    }
  }

  // =============================
  // Modo anônimo (centralizado)
  // =============================
  function setAnonymousMode({ reopenGate } = { reopenGate: false }) {
    // desabilita ranking e marca optout
    localStorage.setItem("mission_optout_ranking", "1");
    if (optRankingEl) optRankingEl.checked = false;

    // libera nome / setor
    lockIdentityFields(false);

    // garante que "user" local do módulo não faça parecer logado
    currentProfile = null;

    // opcional: reabrir gate (útil no logout/delete)
    if (reopenGate) {
      // nada a fazer aqui por enquanto
    }
  }

  // =============================
  // STATUS + SETORES
  // =============================
  function getModalBody() {
    return document.getElementById("modalBody");
  }

  function showStatus(msg, kind) {
    const root = getModalBody();
    const box = root?.querySelector('[data-auth="status"]');
    if (!box) return;
    box.className = `auth-status show ${kind === "ok" ? "ok" : "error"}`;
    box.textContent = msg;
  }

  function clearStatus() {
    const root = getModalBody();
    const box = root?.querySelector('[data-auth="status"]');
    if (!box) return;
    box.className = "auth-status";
    box.textContent = "";
  }

  function buildSectorOptionsHTML() {
    const sectors = app.data?.SECTORS;
    if (Array.isArray(sectors) && sectors.length) {
      return sectors
        .map((s) => {
          const v = (s === "Selecione…" || s === "Selecione") ? "" : s;
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
    if (code.includes("permission-denied")) return "Sem permissão no Firestore. Ajuste as rules para /users.";
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

  // =============================
  // MODAL CLOSE LOCK (gate inicial)
  // =============================
  function lockModalCloseUI() {
    const closeX = document.getElementById("closeModal");
    if (closeX) closeX.style.display = "none";

    window.__AUTH_ESC_BLOCK__ = (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
      }
    };
    document.addEventListener("keydown", window.__AUTH_ESC_BLOCK__, true);
  }

  function unlockModalCloseUI() {
    const closeX = document.getElementById("closeModal");
    if (closeX) closeX.style.display = "";

    if (window.__AUTH_ESC_BLOCK__) {
      document.removeEventListener("keydown", window.__AUTH_ESC_BLOCK__, true);
      window.__AUTH_ESC_BLOCK__ = null;
    }
  }

  function afterModalPaint(fn) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try { fn(); } catch (e) { console.warn("[auth] afterModalPaint error:", e); }
      });
    });
  }

  // =============================
  // ABRIR AUTOMÁTICO NO START
  // =============================
  setTimeout(() => {
    if (!currentUser) openAuthGate({ force: true });
  }, 50);
}
