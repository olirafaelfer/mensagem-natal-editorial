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
  updateProfile,
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
  
function getLocalAvatarByEmail(email){
  try{
    const em = String(email||"").trim().toLowerCase();
    if (!em) return "";
    return localStorage.getItem(`avatar:${em}`) || "";
  }catch{ return ""; }
}
function setLocalAvatarByEmail(email, avatar){
  try{
    const em = String(email||"").trim().toLowerCase();
    if (!em) return;
    localStorage.setItem(`avatar:${em}`, avatar || "");
  }catch{}
}
let currentUser = null;
  let currentProfile = null;
  let gateOpen = false;
function cleanEmail(e){
  return String(e||"").trim().toLowerCase();
}
function getVisiblePref(){ return localStorage.getItem('mission_visible_in_ranking') !== '0'; }

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
    openAuthGate: () => openAuthGate({ force: false }),
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
  // =============================
  // Perfil (Firestore)
  // =============================
  async function fetchOrCreateProfile(user){
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data();

    // Não cria automaticamente sem setor (ex.: Google)
    const email = user.email || "";
    const nameGuess = String(user.displayName || "").trim();
    return { uid: user.uid, email, name: nameGuess, sector: "", needsCompletion: true };
  }

  async function saveProfile(uid, email, name, sector){
    const ref = doc(db, "users", uid);
    const now = new Date();
    const payload = {
      uid,
      email: String(email||"").trim(),
      name: String(name||"").trim().slice(0,60),
      sector: String(sector||"").trim().slice(0,120),
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(ref, payload);
    return payload;
  }

  // Auth state
  // =============================
  onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;
    try { app.progress?.setActive?.(currentUser?.uid || null); } catch {}
    try { if(!currentUser){ app.progress?.setActive?.(null); } } catch {}
    try { app.game?.resetRuntime?.(); app.game?.goHome?.(); app.game?.refreshAccess?.(); } catch {}
    currentProfile = null;

    // ✅ evita busy “grudar”
    busy = false;

    if (currentUser) {
      currentProfile = await fetchOrCreateProfile(currentUser).catch((e) => {
        console.warn("[auth] falha ao carregar/criar profile:", e);
        return null;
      });

      if (currentProfile && currentProfile.needsCompletion){
        // Completar cadastro: nome vem do Google, setor é obrigatório.
        // Mostra modal para confirmar/editar nome e escolher setor.
        await promptCompleteProfile(currentProfile, currentUser);
        currentProfile = await fetchOrCreateProfile(currentUser).catch(() => null);
      }

      if (currentProfile) applyLoggedProfileToForm(currentProfile);
      try { app.game?.refreshAccess?.(); } catch(e) {}



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
      // reset UI/progresso para visitante (evita liberar desafios indevidos)
      try { app.game?.resetRuntime?.(); app.game?.goHome?.(); app.game?.refreshAccess?.(); } catch(e) {}
      // Visitante pode preencher nome/setor manualmente
      lockIdentityFields(false);

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
  // Painel "Minha conta" (evita openAccountPanel undefined)
  // =============================
  async function openAccountPanel(){
    if (!currentUser){
      return openAuthGate({ force:false });
    }
    const p = currentProfile || (await fetchOrCreateProfile(currentUser).catch(() => null));
    const name = p?.name || currentUser.displayName || "";
    const email = currentUser.email || "";
    const sector = p?.sector || "";
    const participating = (localStorage.getItem('mission_visible_in_ranking') !== '0') ? "Sim" : "Não";

    const photoURL = getLocalAvatarByEmail(currentUser?.email) || currentUser.photoURL || '';
    openModal({
      title: "👤 Minha conta",
      bodyHTML: `
        <div class="account-panel">
          <div class="account-avatar">
            <div class="avatar-preview">
              ${photoURL ? `<img id="accountAvatarImg" src="${escapeHtml(photoURL)}" alt="" referrerpolicy="no-referrer"/>` : `<div id="accountAvatarImg" class="avatar-fallback">${escapeHtml((name||'U')[0]||'U')}</div>`}
            </div>
            <div class="avatar-actions">
              <input id="accountAvatarFile" type="file" accept="image/*" style="display:none" />
              <button id="accountAvatarUpload" class="btn small" type="button">Enviar foto</button>
              <button id="accountAvatarRemove" class="btn small ghost" type="button">Remover</button>
              <div class="avatar-icons" style="margin-top:8px">
                <span class="muted" style="display:block; margin-bottom:6px">Ou escolha um ícone:</span>
                <button class="btn small ghost" type="button" data-avatar-icon="🎅">🎅</button>
                <button class="btn small ghost" type="button" data-avatar-icon="🎄">🎄</button>
                <button class="btn small ghost" type="button" data-avatar-icon="❄️">❄️</button>
                <button class="btn small ghost" type="button" data-avatar-icon="🦌">🦌</button>
              </div>
            </div>
          </div>
          <div><strong>Nome:</strong> ${escapeHtml(name||"—")}</div>
          <div><strong>Email:</strong> ${escapeHtml(email||"—")}</div>
          <div><strong>Setor:</strong> ${escapeHtml(sector||"—")}</div>
          <div style="margin-top:10px">
            <strong>Participando do ranking:</strong> ${participating}
            <span class="hint" title="Para aparecer no ranking, habilite/desabilite na janela do Ranking.">❓</span>
          </div>
          <div class="muted" style="margin-top:10px">Dica: você pode ocultar seu nome no ranking sem perder suas pontuações.</div>
        </div>
      `,
      buttons: [
        { label: "Excluir conta", variant: "ghost", onClick: async () => { await handleDeleteAccount(); } },
        { label: "Fechar", variant: "ghost", onClick: closeModal },
        { label: "Sair", onClick: async () => {
            try { await signOut(auth); } catch(e){ console.warn('[auth] signOut falhou', e); }
            closeModal();
          }
        },
      ]
    });

    afterModalPaint(() => {
      wireAccountAvatarUI();
    });
  }

  // -----------------------------
  // Avatar (foto) — opção A: Base64 (dataURL) com fallback para Storage (futuro)
  // Aqui usamos o photoURL do Firebase Auth para não depender de novas rules no Firestore.
  // -----------------------------
  function wireAccountAvatarUI(){
    const uploadBtn = document.getElementById('accountAvatarUpload');
    const removeBtn = document.getElementById('accountAvatarRemove');
    const fileEl = document.getElementById('accountAvatarFile');
    const preview = document.getElementById('accountAvatarImg');

    if (uploadBtn && fileEl){
      uploadBtn.addEventListener('click', () => fileEl.click());
    }

    if (fileEl){
      fileEl.addEventListener('change', async () => {
        const f = fileEl.files?.[0];
        if (!f) return;
        try{
          const dataUrl = await imageFileToDataURL(f, 160, 0.86);
          await updateMyPhotoURL(dataUrl);
          setLocalAvatarByEmail(currentUser?.email, dataUrl);
          if (preview){
            if (preview.tagName === 'IMG') preview.src = dataUrl;
            else preview.outerHTML = `<img id="accountAvatarImg" src="${escapeHtml(dataUrl)}" alt="" referrerpolicy="no-referrer"/>`;
          }
          setStatus('Foto atualizada ✅');
        }catch(e){
          console.warn('[auth] falha ao atualizar foto', e);
          setStatus('Não foi possível atualizar a foto. Tente outra imagem.');
        }
        try { fileEl.value = ''; } catch {}
      });
    }

    if (removeBtn){
      removeBtn.addEventListener('click', async () => {
        try{
          await updateMyPhotoURL('');
          setLocalAvatarByEmail(currentUser?.email, '');
          setStatus('Foto removida ✅');
          // Atualiza UI
          if (preview){
            preview.outerHTML = `<div id="accountAvatarImg" class="avatar-fallback">${escapeHtml((currentProfile?.name || currentUser?.displayName || 'U')[0] || 'U')}</div>`;
          }
        }catch(e){
          console.warn('[auth] falha ao remover foto', e);
          setStatus('Não foi possível remover a foto agora.');
        }
      });
    }

    // Ícones rápidos
    document.querySelectorAll('[data-avatar-icon]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const icon = btn.getAttribute('data-avatar-icon') || '';
        if (!icon) return;
        // Gera um SVG dataURL simples com o emoji centralizado
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" rx="80" ry="80" fill="#1b1f2a"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-size="88">${icon}</text></svg>`;
        const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        try{
          await updateMyPhotoURL(dataUrl);
          setLocalAvatarByEmail(currentUser?.email, dataUrl);
          setStatus('Ícone definido ✅');
          const p = document.getElementById('accountAvatarImg');
          if (p) p.outerHTML = `<img id="accountAvatarImg" src="${escapeHtml(dataUrl)}" alt="" referrerpolicy="no-referrer"/>`;
        }catch(e){
          console.warn('[auth] falha ao definir ícone', e);
          setStatus('Não foi possível definir o ícone agora.');
        }
      });
    });
  }

  async function sha256Hex(text){
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  async function updateMyPhotoURL(photoDataURL){
    // ✅ Sem Firebase Storage (pago). Usamos:
    // - Ícone: salva token "icon:<id>"
    // - Upload: salva dataURL comprimido (pequeno) no rankingByEmail.avatar (público)
    if (!currentUser) throw new Error("Sem usuário");
    try{
      let avatar = photoDataURL || "";
      // limita/normaliza: se for dataURL gigante, recusa
      if (typeof avatar === "string" && avatar.startsWith("data:image/")){
        if (avatar.length > 200000){
          throw new Error("Imagem muito grande. Use uma imagem menor.");
        }
      }
      // Cache local por email (melhora load)
      try{
        const em = (currentUser.email || "").trim().toLowerCase();
        if (em) localStorage.setItem(`avatar:${em}`, avatar || "");
      }catch{}

      // Propaga pro ranking (Firestore)
      if (app.ranking?.setMyAvatar){
        await app.ranking.setMyAvatar(avatar || "");
      }
      // Atualiza UI imediata
      try{
        const img = document.getElementById("myAvatarImg");
        if (img && typeof avatar === "string" && avatar.startsWith("data:image/")) img.src = avatar;
      }catch{}
      return true;
    }catch(e){
      console.warn("[auth] falha ao atualizar foto", e);
      throw e;
    }
  }

function imageFileToDataURL(file, maxSizePx = 160, quality = 0.86){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        try{
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('no-canvas'));
            const w = img.width;
            const h = img.height;
            const s = Math.min(w,h);
            // recorte central quadrado
            const sx = Math.floor((w - s)/2);
            const sy = Math.floor((h - s)/2);
            const out = Math.min(maxSizePx, s);
            canvas.width = out;
            canvas.height = out;
            ctx.drawImage(img, sx, sy, s, s, 0, 0, out, out);
            const url = canvas.toDataURL('image/jpeg', quality);
            resolve(url);
          };
          img.onerror = reject;
          img.src = String(reader.result);
        }catch(e){ reject(e); }
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleDeleteAccount(){
    if (!currentUser) return;
    openModal({
      title: '⚠️ Excluir conta',
      bodyHTML: `<p>Isso vai excluir sua conta e ocultar seu nome do ranking.</p><p class="muted">Esta ação pode exigir que você entre novamente (reautenticação) dependendo do Firebase.</p>`,
      buttons: [
        { label: 'Cancelar', variant: 'ghost', onClick: closeModal },
        { label: 'Excluir', onClick: async () => {
          closeModal();
          try{
            // Oculta no ranking (soft delete)
            try { await app.ranking?.setMyVisibility?.(false); } catch {}
            // Apaga perfil do Firestore (permitido pelas rules)
            try { await deleteDoc(doc(db, 'users', currentUser.uid)); } catch {}
            // Deleta usuário do Auth
            await deleteUser(currentUser);
            setStatus('Conta excluída ✅');
          }catch(e){
            console.warn('[auth] deleteAccount falhou', e);
            setStatus('Não foi possível excluir agora. Talvez seja necessário entrar novamente e tentar outra vez.');
          }
        } }
      ]
    });
  }

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

  
function googleSvg(){
  // SVG simples do "G" do Google (estático)
  return `
<svg width="18" height="18" viewBox="0 0 48 48" role="img" aria-label="Google">
  <path fill="#EA4335" d="M24 9.5c3.54 0 6.73 1.22 9.25 3.6l6.9-6.9C35.99 2.52 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.04 6.24C12.42 13.02 17.74 9.5 24 9.5z"/>
  <path fill="#4285F4" d="M46.5 24c0-1.64-.15-3.22-.43-4.75H24v9.02h12.64c-.55 2.96-2.23 5.47-4.75 7.16l7.3 5.66C43.7 36.9 46.5 30.9 46.5 24z"/>
  <path fill="#FBBC05" d="M10.6 28.54A14.5 14.5 0 0 1 9.5 24c0-1.57.27-3.09.76-4.46l-8.04-6.24A23.98 23.98 0 0 0 0 24c0 3.88.93 7.55 2.56 10.78l8.04-6.24z"/>
  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.14 15.9-5.8l-7.3-5.66c-2.02 1.36-4.6 2.16-8.6 2.16-6.26 0-11.58-3.52-13.4-8.2l-8.04 6.24C6.51 42.62 14.62 48 24 48z"/>
</svg>`;
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
          <button class="btn ghost" data-action="googleLogin" type="button">
            <span class="g-badge" aria-hidden="true"><svg viewBox="0 0 48 48" width="18" height="18" style="display:block"><path fill="#EA4335" d="M24 9.5c3.54 0 6.03 1.53 7.42 2.81l5.06-5.06C33.37 4.34 29.08 2.5 24 2.5 14.92 2.5 7.07 7.66 3.26 15.2l5.96 4.63C11.27 13.19 17.18 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.57-.14-3.08-.4-4.5H24v8.51h12.7c-.55 2.97-2.2 5.49-4.69 7.18l7.1 5.5c4.15-3.83 6.39-9.48 6.39-16.69z"/><path fill="#FBBC05" d="M9.22 28.07c-.5-1.48-.79-3.06-.79-4.57s.29-3.09.79-4.57l-5.96-4.63C1.99 17.04 1.5 20.2 1.5 23.5s.49 6.46 1.76 9.2l5.96-4.63z"/><path fill="#34A853" d="M24 44.5c5.08 0 9.35-1.68 12.47-4.57l-7.1-5.5c-1.97 1.32-4.49 2.1-5.37 2.1-6.82 0-12.73-3.69-14.78-9.33l-5.96 4.63C7.07 39.34 14.92 44.5 24 44.5z"/></svg></span>
            Entrar com Google
          </button>
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
          <button class="btn ghost" data-action="googleLogin" type="button">
            <span class="glogo" aria-hidden="true">${googleSvg()}</span>
            <span>Criar com Google</span>
          </button>
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
      if (action === "googleLogin") doGoogleLogin();
      if (action === "signup") doSignup();
      if (action === "forgot") openForgotPassword();
      if (action === "anon") enterAnonymous();
    }
  }

  async function doGoogleLogin(){
    if (busy) return;
    busy = true;
    clearStatus();

    if (!app.googleAuth?.signInWithGoogle){
      showStatus("Login com Google ainda não está disponível neste build.", "error");
      busy = false;
      return;
    }
    try{
      await app.googleAuth.signInWithGoogle();
      // onAuthStateChanged fecha o gate
    }catch(e){
      console.warn("[auth] googleLogin falhou", e);
      showStatus(humanAuthError(e) || "Falha ao entrar com Google.", "error");
    }finally{
      busy = false;
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
  // =============================
  // CADASTRO
  // =============================
  async function doSignup() {
    if (busy) return;
    busy = true;
    clearStatus();

    const root = getModalBody();
    const name = (root?.querySelector('[data-auth="signupName"]')?.value || '').trim();
    const sector = (root?.querySelector('[data-auth="signupSector"]')?.value || '').trim();
    const email = (root?.querySelector('[data-auth="signupEmail"]')?.value || '').trim();
    const pass = (root?.querySelector('[data-auth="signupPass"]')?.value || '').trim();

    const emailClean = cleanEmail(email);

    if (!name || !sector || !emailClean || !pass) {
      showStatus('Preencha nome, setor, e-mail e senha.', 'error');
      busy = false;
      return;
    }

    if (!isValidEmail(emailClean)) {
      showStatus('E-mail inválido. Verifique e tente novamente.', 'error');
      busy = false;
      return;
    }

    if (String(pass).length < 6) {
      showStatus('A senha deve ter pelo menos 6 caracteres.', 'error');
      busy = false;
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, emailClean, pass);
      const user = cred.user;
      const payload = await saveProfile(user.uid, user.email || emailClean, name, sector);
      currentProfile = payload;
      applyLoggedProfileToForm(payload);
      showStatus('Conta criada! Você já pode entrar.', 'success');
      // onAuthStateChanged fecha o gate
    } catch (e) {
      console.warn('[auth] signup falhou', e);
      showStatus(humanAuthError(e) || 'Falha ao criar conta.', 'error');
    } finally {
      busy = false;
    }
  }

  
  async function promptCompleteProfile(draft, user){
    return new Promise((resolve) => {
      try{
        const opts = Array.from(sectorEl?.options || [])
          .map(o => `<option value="${String(o.value).replace(/"/g,'&quot;')}">${String(o.textContent||"")}</option>`)
          .join("");
        app.modal?.openModal?.({
          title: "Completar cadastro",
          bodyHTML: `
            <p class="muted" style="margin-top:0">Confirmar seu nome e selecione seu setor para continuar.</p>
            <label class="field" style="gap:6px;margin-top:10px">
              <span class="muted" style="font-size:13px">Nome</span>
              <input class="input" id="cpName" type="text" value="${String(draft.name||"").replace(/"/g,'&quot;')}" maxlength="60"/>
            </label>
            <label class="field" style="gap:6px;margin-top:10px">
              <span class="muted" style="font-size:13px">Setor (obrigatório)</span>
              <select class="input" id="cpSector">
                <option value="">Selecione...</option>
                ${opts}
              </select>
            </label>
          `,
          buttons:[
            {label:"Cancelar", variant:"ghost", onClick: () => { app.modal.closeModal(); resolve(); }},
            {label:"Salvar", variant:"primary", onClick: async () => {
              const nm = (document.getElementById("cpName")?.value || "").trim();
              const sc = (document.getElementById("cpSector")?.value || "").trim();
              if (nm.length < 2){
                alert("Informe um nome válido.");
                return;
              }
              if (sc.length < 2){
                alert("Selecione seu setor para continuar.");
                return;
              }
              try{
                await saveProfile(user.uid, user.email || "", nm, sc);
                app.modal.closeModal();
                resolve();
              }catch(e){
                console.warn("[auth] completar cadastro falhou:", e);
                alert("Não foi possível salvar seu perfil. Verifique permissões e tente novamente.");
              }
            }},
          ],
          dismissible: false
        });
      }catch(e){
        console.warn("[auth] promptCompleteProfile erro:", e);
        resolve();
      }
    });
  }

function applyLoggedProfileToForm(profile) {
    if (nameEl) nameEl.value = profile.name || "";
    if (sectorEl) sectorEl.value = profile.sector || "";

    if (profile.name) localStorage.setItem("mission_name", profile.name);
    if (profile.sector) localStorage.setItem("mission_sector", profile.sector);

    lockIdentityFields(true);

    // Ranking: por padrão, deixa habilitado para logados (a menos que o usuário tenha opt-out explícito)
    if (optRankingEl){
      const optedOut = localStorage.getItem("mission_optout_ranking") === "1";
      optRankingEl.checked = !optedOut;
      localStorage.setItem("mission_optout_ranking", optRankingEl.checked ? "0" : "1");
    }
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
    if (code.includes("auth/operation-not-allowed")) return "Login com Google não está habilitado no Firebase. Ative em Authentication → Sign-in method → Google (Enable) e confira Authorized domains.";
    if (code.includes("auth/requires-recent-login")) return "Por segurança, faça login novamente e tente deletar a conta.";
    if (code.includes("permission-denied")) return "Sem permissão no Firestore. Ajuste as rules (delete/owner).";
    return e?.message ? String(e.message) : "Erro inesperado.";
  }

  
function setStatus(msg){
  try{
    const el = document.getElementById('accountStatus');
    if (el) el.textContent = msg || '';
    else console.log('[status]', msg);
  }catch{}
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
}
