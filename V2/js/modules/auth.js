// js/auth.js — Login/Cadastro/Anônimo + Perfil (Sair / Deletar conta)
// - Gate abre automaticamente no início (sem botão fechar)
// - Tabs e botões funcionam via delegação dentro do #modalBody (ui-modal)
// - Logado trava nome/setor
// - Anônimo não participa do ranking
//
// ✅ Fix: ranking para logados volta a funcionar (optout sync)
// ✅ Fix: ao sair/deletar -> desativa ranking e libera nome/setor
// ✅ Fix: ao deletar -> apaga também o ranking individual (individualRanking/{uid})
// ✅ Novo: "Minha conta" mostra pontuação + posição no ranking

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
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
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

  // botão do topo (se existir)
  const authBtn =
    document.getElementById("authBtn") ||
    document.getElementById("loginBtn") ||
    document.getElementById("userBtn") ||
    document.getElementById("accountBtn");

  // Estado
  let currentUser = null;
  let currentProfile = null;
  let gateOpen = false;
function cleanEmail(e){
  return String(e||"").trim().toLowerCase();
}
function isValidEmail(e){
  const s = cleanEmail(e);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
  let busy = false;
  let suppressAutoGate = false;

  // API p/ outros módulos
  app.auth = {
    isLogged: () => !!currentUser,
    getProfile: () => currentProfile,
    getUser: () => currentUser,
    openGate: () => openAuthGate({ force: false }),
    openAccount: () => (currentUser ? openAccountPanel() : openAuthGate({ force: false })),
    canRank: () =>
      !!currentUser &&
      !!optRankingEl?.checked &&
      localStorage.getItem("mission_optout_ranking") !== "1",
  };

  authBtn?.addEventListener("click", () => {
    if (currentUser) openAccountPanel();
    else openAuthGate({ force: false });
  });

  // =============================
  // Auth state
  // =============================
  onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;
    currentProfile = null;

    // ✅ evita busy “grudar”
    busy = false;

    if (currentUser) {
      currentProfile = await fetchOrCreateProfile(currentUser).catch((e) => {
        console.warn("[auth] falha ao carregar/criar profile:", e);
        return null;
      });

      if (currentProfile) applyLoggedProfileToForm(currentProfile);
      else lockIdentityFields(true);

      // ✅ sincroniza optout com checkbox quando logado
      if (optRankingEl) {
        localStorage.setItem("mission_optout_ranking", optRankingEl.checked ? "0" : "1");
      } else {
        localStorage.setItem("mission_optout_ranking", "0");
      }

      // fecha gate se estava aberto
      if (gateOpen) {
        gateOpen = false;
        unlockModalCloseUI();
        closeModal();
      }
    } else {
      lockIdentityFields(false);
      forceAnonymousNoRanking();
    }
  });

  // =============================
  // Ranking toggle
  // =============================
  optRankingEl?.addEventListener("change", () => {
    if (!optRankingEl) return;

    // Se NÃO logado e tentou LIGAR ranking -> bloqueia e abre gate
    if (!currentUser && optRankingEl.checked) {
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
          {
            label: "Fazer login",
onClick: () => {
  suppressAutoGate = true;
  closeModal();
  setTimeout(() => {
    openAuthGate({ force: true });
    suppressAutoGate = false;
  }, 200);
},
          },
        ],
      });

      return;
    }

    // Logado: respeita toggle
    localStorage.setItem("mission_optout_ranking", optRankingEl.checked ? "0" : "1");
  });

  // =============================
  // GATE (login/cadastro/anon)
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
          <button class="btn ghost" data-action="googleLogin" type="button">Entrar com Google</button>
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

  function wireAuthDelegationHandlers() {
    const root = getModalBody();
    if (!root) {
      console.warn("[auth] #modalBody não encontrado para wire.");
      return;
    }
    root.onclick = gateClickHandler;
  }

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
    }
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

  function focusInGate() {
    const root = getModalBody();
    if (!root) return;
    root.querySelector('[data-auth="loginEmail"]')?.focus();
  }

  function enterAnonymous() {
    if (busy) return;
    busy = true;

    gateOpen = false;
    unlockModalCloseUI();
    closeModal();

    forceAnonymousNoRanking();
    lockIdentityFields(false);

    busy = false;
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
      // fecha via onAuthStateChanged
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

    
const emailClean = cleanEmail(email);

if (!name || !sector || !emailClean || !pass) {
  showStatus("Preencha nome, setor, e-mail e senha.", "error");
  busy = false;
  return;
}

if (!isValidEmail(emailClean)) {
  showStatus("E-mail inválido. Verifique e tente novamente.", "error");
  busy = false;
  return;
}

if (String(pass).length < 6) {
  showStatus("A senha deve ter pelo menos 6 caracteres.", "error");
  busy = false;
  return;
}

try {
  const cred = await createUserWithEmailAndPassword(auth, emailClean, pass);

      const payload = {
        uid: cred.user.uid,
        email: emailClean,
        name: clampLen(name, 60),
        sector: clampLen(sector, 120),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", cred.user.uid), payload, { merge: true });

      showStatus("Conta criada ✅ Você já está logado.", "ok");
      // fecha via onAuthStateChanged
    } catch (e) {
      showStatus(humanAuthError(e), "error");
      busy = false;
    }
  }

  // =============================
  // RECUPERAÇÃO (SÓ EMAIL)
  // =============================
  function openForgotPassword() {
    unlockModalCloseUI();
    gateOpen = false;
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

        <div id="authResetStatus" class="auth-status show"></div>
      `,
      buttons: [
        { label: "Voltar", variant: "ghost", onClick: () => { closeModal(); setTimeout(() => openAuthGate({ force: true }), 80); } },
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
  // CONTA LOGADA (com meu ranking)
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

        <div class="auth-note" style="margin-top:12px">
          <b>Meu ranking</b><br/>
          <div class="auth-mini" id="myRankLine">Carregando…</div>
        </div>

        <div class="auth-actions" style="margin-top:14px">
          <button class="btn ghost" id="authLogoutBtn" type="button">Sair</button>
          <button class="btn" id="authDeleteBtn" type="button">Deletar conta</button>
        </div>

        <p class="auth-mini" style="margin-top:12px">
          Ao deletar a conta, o ranking pessoal também será removido.
        </p>
      `,
      buttons: [{ label: "Fechar", onClick: closeModal }],
    });

    setTimeout(() => {
      document.getElementById("authLogoutBtn")?.addEventListener("click", doLogout);
      document.getElementById("authDeleteBtn")?.addEventListener("click", confirmDeleteAccount);

      loadMyRankingIntoAccount().catch((e) => {
        console.warn("[auth] loadMyRankingIntoAccount falhou:", e);
        const el = document.getElementById("myRankLine");
        if (el) el.textContent = "Não foi possível carregar seu ranking agora.";
      });
    }, 0);
  }

  async function loadMyRankingIntoAccount() {
    const el = document.getElementById("myRankLine");
    if (!el) return;

    if (!currentUser) {
      el.innerHTML = `Você não está logado.`;
      return;
    }
    if (localStorage.getItem("mission_optout_ranking") === "1") {
      el.innerHTML = `Ranking desativado nesta conta.`;
      return;
    }

    // Busca o mesmo doc usado no ranking visual (rankingByEmail)
    // Mostra D1/D2/D3 e Média
    (async () => {
      try {
        const entry = await app.ranking?.getMyEntry?.();
        if (!entry) {
          el.innerHTML = `Você ainda não tem pontuação registrada no ranking.`;
          return;
        }
        const d1 = Number(entry.d1?.score || 0);
        const d2 = Number(entry.d2?.score || 0);
        const d3 = Number(entry.d3?.score || 0);
        const avg = Number(entry.overallAvg || 0);

        el.innerHTML = `
          <div>Pontuação por desafio: <b>D1 ${d1.toFixed(0)}</b> · <b>D2 ${d2.toFixed(0)}</b> · <b>D3 ${d3.toFixed(0)}</b></div>
          <div>Média geral: <b>${avg.toFixed(0)}</b></div>
          <div class="muted" style="margin-top:6px; font-size:12px">A posição no ranking é calculada na tela de Ranking.</div>
        `;
      } catch (e) {
        console.warn("[auth] loadMyRankingIntoAccount falhou", e);
        el.textContent = `Pontuação indisponível agora.`;
      }
    })();
  }

  async function doLogout() {
    if (busy) return;
    busy = true;

    try {
      await signOut(auth);

      forceAnonymousNoRanking();
      lockIdentityFields(false);

      closeModal();
      setTimeout(() => openAuthGate({ force: true }), 120);
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
        <p class="muted">Isso remove seu perfil e também seu ranking pessoal.</p>
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
      const uid = currentUser.uid;

      await deleteDoc(doc(db, "users", uid));
      await deleteDoc(doc(db, "individualRanking", uid)); // ✅ ranking pessoal
      await deleteUser(currentUser);

      gateOpen = false;
      unlockModalCloseUI();

      forceAnonymousNoRanking();
      lockIdentityFields(false);

      closeModal();
      setTimeout(() => openAuthGate({ force: true }), 120);
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
  // Helpers
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
    if (code.includes("permission-denied")) return "Sem permissão no Firestore. Ajuste as rules (delete/owner).";
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
  // Modal close lock (gate inicial)
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

  function forceAnonymousNoRanking() {
    localStorage.setItem("mission_optout_ranking", "1");
    if (optRankingEl) optRankingEl.checked = false;
  }

  // =============================
  // Abrir automático no start
  // =============================
setTimeout(() => {
  if (!currentUser && !suppressAutoGate) {
    openAuthGate({ force: true });
  }
}, 80);
}