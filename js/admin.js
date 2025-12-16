// js/admin.js — Admin login (Firebase Auth) + reset ranking (Firestore)
//
// Requer:
// - app.modal: { openModal, closeModal }
// - app.firebase: { db, auth }
// Coleções:
// - individualRanking
// - sectorStats

import {
  collection,
  getDocs,
  writeBatch,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

export function bootAdmin(app) {
  // ✅ seu admin
  const ADMIN_EMAIL = "oli.rafael.fer@gmail.com";

  // ✅ “gate” local (opcional). Mantive porque você pediu.
  const ADMIN_GATE_PASSWORD = "admin123";
  const ADMIN_GATE_KEY = "mission_admin_gate_ok";
  const ADMIN_GATE_LAST_AT = "mission_admin_gate_last_ms";
  const ADMIN_GATE_TTL_MS = 12 * 60 * 60 * 1000; // 12h

  const { openModal, closeModal } = app.modal || {};
  const db = app.firebase?.db;
  const auth = app.firebase?.auth;

  if (!openModal || !closeModal) {
    console.warn("[admin] app.modal não disponível. Verifique ui-modal.js bootado antes.");
    return;
  }
  if (!db) {
    console.warn("[admin] Firestore (app.firebase.db) não disponível.");
    return;
  }
  if (!auth) {
    console.warn("[admin] Firebase Auth (app.firebase.auth) não disponível. Ajuste main.js para expor auth.");
    return;
  }

  // Botão no topo (id="adminBtn" no HTML)
  const btn = document.getElementById("adminBtn");
  btn?.addEventListener("click", () => openAdminEntry());

  // Mantém estado simples do auth
  let currentUserEmail = null;
  onAuthStateChanged(auth, (u) => {
    currentUserEmail = u?.email || null;
  });

  function isGateOk() {
    const ok = localStorage.getItem(ADMIN_GATE_KEY) === "1";
    if (!ok) return false;

    const last = Number(localStorage.getItem(ADMIN_GATE_LAST_AT) || "0");
    if (!last) return false;

    if (Date.now() - last > ADMIN_GATE_TTL_MS) {
      localStorage.removeItem(ADMIN_GATE_KEY);
      localStorage.removeItem(ADMIN_GATE_LAST_AT);
      return false;
    }
    return true;
  }

  function setGateOk() {
    localStorage.setItem(ADMIN_GATE_KEY, "1");
    localStorage.setItem(ADMIN_GATE_LAST_AT, String(Date.now()));
  }

  function isFirebaseAdminAuthed() {
    return !!currentUserEmail && currentUserEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  }

  async function ensureFirebaseLogin() {
    if (isFirebaseAdminAuthed()) return true;

    return await new Promise((resolve) => {
      openModal({
        title: "🔐 Login Admin (Firebase)",
        bodyHTML: `
          <p class="muted" style="margin-top:0">
            Entre com sua conta admin do Firebase para liberar o reset do ranking.
          </p>

          <div style="display:grid; gap:10px; margin-top:12px">
            <label class="field" style="gap:6px">
              <span style="font-weight:800; font-size:13px; color:rgba(255,255,255,.78)">E-mail</span>
              <input class="input" id="adminEmail" type="email" value="${escapeHtml(ADMIN_EMAIL)}" disabled />
            </label>

            <label class="field" style="gap:6px">
              <span style="font-weight:800; font-size:13px; color:rgba(255,255,255,.78)">Senha</span>
              <input class="input" id="adminFirebasePass" type="password" autocomplete="current-password" placeholder="Senha do Firebase Auth" />
            </label>
          </div>

          <p class="muted" style="margin:10px 0 0; font-size:13px">
            Dica: crie/ative essa conta em <b>Authentication → Users</b> no Firebase.
          </p>
        `,
        buttons: [
          { label: "Cancelar", variant: "ghost", onClick: () => { closeModal(); resolve(false); } },
          {
            label: "Entrar",
            onClick: async () => {
              const pass = document.getElementById("adminFirebasePass")?.value || "";
              if (!pass) {
                openModal({ title: "Atenção", bodyHTML: `<p>Digite a senha do Firebase.</p>`, buttons: [{ label:"Ok", onClick: closeModal }] });
                return;
              }

              try {
                await signInWithEmailAndPassword(auth, ADMIN_EMAIL, pass);
                closeModal();
                resolve(true);
              } catch (e) {
                openModal({
                  title: "Falha no login",
                  bodyHTML: `<p>Não foi possível autenticar no Firebase.</p><p class="muted"><code>${escapeHtml(e?.message || String(e))}</code></p>`,
                  buttons: [{ label:"Ok", onClick: closeModal }]
                });
                resolve(false);
              }
            }
          }
        ]
      });

      setTimeout(() => document.getElementById("adminFirebasePass")?.focus(), 50);
    });
  }

  function openAdminEntry() {
    // gate local primeiro (admin123)
    if (!isGateOk()) {
      openModal({
        title: "🔒 Admin",
        bodyHTML: `
          <p class="muted" style="margin-top:0">Digite a senha de administrador.</p>
          <input class="input" id="adminGatePass" type="password" placeholder="Senha" />
          <p class="muted" style="margin:10px 0 0; font-size:13px">Sessão expira automaticamente.</p>
        `,
        buttons: [
          { label: "Cancelar", variant: "ghost", onClick: closeModal },
          {
            label: "Continuar",
            onClick: async () => {
              const v = document.getElementById("adminGatePass")?.value || "";
              if (v !== ADMIN_GATE_PASSWORD) {
                openModal({ title: "Senha incorreta", bodyHTML: `<p>Senha inválida.</p>`, buttons: [{ label:"Ok", onClick: closeModal }] });
                return;
              }
              setGateOk();
              closeModal();

              // agora garante login no Firebase
              const ok = await ensureFirebaseLogin();
              if (!ok) return;

              openAdminPanel();
            }
          }
        ]
      });

      setTimeout(() => document.getElementById("adminGatePass")?.focus(), 50);
      return;
    }

    // gate ok → garante login firebase
    (async () => {
      const ok = await ensureFirebaseLogin();
      if (!ok) return;
      openAdminPanel();
    })();
  }

  function openAdminPanel() {
    openModal({
      title: "🛠️ Painel Admin",
      bodyHTML: `
        <p style="margin-top:0">Ações administrativas (uso interno).</p>

        <div style="display:grid; gap:10px; margin-top:12px">
          <button class="btn" id="adminResetRankingBtn" type="button">🧹 Zerar ranking (individual + setor)</button>
          <button class="btn ghost" id="adminLogoutBtn" type="button">Sair (Firebase)</button>
        </div>

        <p class="muted" style="margin:12px 0 0; font-size:13px">
          Você está logado como: <strong>${escapeHtml(currentUserEmail || "—")}</strong>
        </p>
      `,
      buttons: [{ label: "Fechar", onClick: closeModal }]
    });

    setTimeout(() => {
      document.getElementById("adminResetRankingBtn")?.addEventListener("click", () => confirmResetRanking());
      document.getElementById("adminLogoutBtn")?.addEventListener("click", async () => {
        try {
          await signOut(auth);
          openModal({ title:"Ok", bodyHTML:`<p>Você saiu do Firebase.</p>`, buttons:[{label:"Fechar", onClick: closeModal}] });
        } catch (e) {
          openModal({ title:"Erro", bodyHTML:`<p class="muted"><code>${escapeHtml(e?.message || String(e))}</code></p>`, buttons:[{label:"Fechar", onClick: closeModal}] });
        }
      });
    }, 0);
  }

  function confirmResetRanking() {
    if (!isFirebaseAdminAuthed()) {
      openModal({
        title: "Sem permissão",
        bodyHTML: `<p>Você precisa estar autenticado no Firebase como <strong>${escapeHtml(ADMIN_EMAIL)}</strong>.</p>`,
        buttons: [{ label:"Ok", onClick: closeModal }]
      });
      return;
    }

    openModal({
      title: "Confirmar reset",
      bodyHTML: `
        <p><strong>Tem certeza?</strong></p>
        <p class="muted">Isso vai apagar o ranking individual e as estatísticas por setor no Firestore.</p>
      `,
      buttons: [
        { label: "Cancelar", variant: "ghost", onClick: closeModal },
        {
          label: "Sim, zerar agora",
          onClick: async () => {
            closeModal();
            await runResetRanking();
          }
        }
      ]
    });
  }

  async function runResetRanking() {
    openModal({
      title: "Zerando ranking…",
      bodyHTML: `<p class="muted" style="margin-top:0">Aguarde…</p>`,
      buttons: [{ label: "Fechar", onClick: closeModal }]
    });

    try {
      const r1 = await deleteAllDocsInCollection("individualRanking");
      const r2 = await deleteAllDocsInCollection("sectorStats");

      openModal({
        title: "✅ Ranking zerado",
        bodyHTML: `
          <p>Concluído.</p>
          <p class="muted" style="margin-top:10px; font-size:13px">
            individualRanking: <strong>${r1}</strong><br/>
            sectorStats: <strong>${r2}</strong>
          </p>
        `,
        buttons: [{ label: "Ok", onClick: closeModal }]
      });
    } catch (err) {
      console.error("[admin] reset ranking falhou:", err);

      openModal({
        title: "❌ Falha ao zerar ranking",
        bodyHTML: `
          <p>Não foi possível concluir o reset.</p>
          <p class="muted"><code>${escapeHtml(err?.message || String(err))}</code></p>
          <p class="muted" style="margin-top:10px">
            Se aparecer <code>permission-denied</code>, confira:
            <br>1) Rules publicadas
            <br>2) Você está logado no Firebase como <strong>${escapeHtml(ADMIN_EMAIL)}</strong>
          </p>
        `,
        buttons: [{ label: "Ok", onClick: closeModal }]
      });
    }
  }

  // --------- helpers ---------

  async function deleteAllDocsInCollection(colName) {
    const snap = await getDocs(collection(db, colName));
    const docs = snap.docs;
    if (!docs.length) return "0 docs (já vazio)";

    // batch limit 500 → usa 450 com folga
    const CHUNK = 450;
    let deleted = 0;

    for (let i = 0; i < docs.length; i += CHUNK) {
      const batch = writeBatch(db);
      const slice = docs.slice(i, i + CHUNK);
      for (const d of slice) batch.delete(d.ref);
      await batch.commit();
      deleted += slice.length;
    }

    return `${deleted} docs apagados`;
  }

  // fallback opcional (se você quiser “zerar” em vez de “apagar”)
  // OBS: só use se suas rules permitirem os campos.
  async function softResetSectorStatsOnly() {
    const snap = await getDocs(collection(db, "sectorStats"));
    const docs = snap.docs;
    if (!docs.length) return;

    const CHUNK = 450;
    for (let i = 0; i < docs.length; i += CHUNK) {
      const batch = writeBatch(db);
      const slice = docs.slice(i, i + CHUNK);
      for (const d of slice) {
        batch.set(doc(db, "sectorStats", d.id), {
          missions: 0,
          totalOverall: 0,
          totalT1: 0,
          totalT2: 0,
          totalT3: 0,
          totalCorrect: 0,
          totalWrong: 0,
          totalAuto: 0,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      await batch.commit();
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}
