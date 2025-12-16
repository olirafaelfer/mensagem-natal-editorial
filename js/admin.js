// js/admin.js — Admin login + reset ranking (Firestore)
// Requer:
// - app.modal: { openModal, closeModal }
// - app.firebase.db (Firestore instance)
//
// Coleções atuais do projeto (conforme ranking.js):
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

export function bootAdmin(app) {
  const ADMIN_PASSWORD = "admin123";
  const ADMIN_FLAG_KEY = "mission_admin_logged";
  const ADMIN_LAST_AT = "mission_admin_last_login_ms";
  const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

  const { openModal, closeModal } = app.modal || {};
  const db = app.firebase?.db;

  if (!openModal || !closeModal) {
    console.warn("[admin] app.modal não disponível. Verifique se ui-modal foi bootado antes.");
    return;
  }
  if (!db) {
    console.warn("[admin] Firestore (app.firebase.db) não disponível.");
    return;
  }

  // cria/ativa botão de admin no topo, se existir no HTML
  const btn = document.getElementById("adminBtn");
  btn?.addEventListener("click", () => openAdminGate());

  function isAdminLogged() {
    const ok = localStorage.getItem(ADMIN_FLAG_KEY) === "1";
    if (!ok) return false;

    const last = Number(localStorage.getItem(ADMIN_LAST_AT) || "0");
    if (!last) return false;

    // expira sessão
    if (Date.now() - last > ADMIN_SESSION_TTL_MS) {
      localStorage.removeItem(ADMIN_FLAG_KEY);
      localStorage.removeItem(ADMIN_LAST_AT);
      return false;
    }
    return true;
  }

  function setAdminLogged() {
    localStorage.setItem(ADMIN_FLAG_KEY, "1");
    localStorage.setItem(ADMIN_LAST_AT, String(Date.now()));
  }

  function openAdminGate() {
    if (isAdminLogged()) {
      openAdminPanel();
      return;
    }

    openModal({
      title: "🔒 Admin",
      bodyHTML: `
        <p class="muted" style="margin-top:0">Digite a senha de administrador.</p>
        <input class="input" id="adminPassInput" type="password" autocomplete="current-password" placeholder="Senha" />
        <p class="muted" style="margin:10px 0 0; font-size:13px">
          Dica: esta sessão expira automaticamente.
        </p>
      `,
      buttons: [
        { label: "Cancelar", variant: "ghost", onClick: closeModal },
        {
          label: "Entrar",
          onClick: () => {
            const v = document.getElementById("adminPassInput")?.value || "";
            if (v !== ADMIN_PASSWORD) {
              openModal({
                title: "Senha incorreta",
                bodyHTML: `<p>Senha inválida.</p>`,
                buttons: [{ label: "Ok", onClick: closeModal }],
              });
              return;
            }
            setAdminLogged();
            closeModal();
            openAdminPanel();
          },
        },
      ],
    });

    setTimeout(() => document.getElementById("adminPassInput")?.focus(), 50);
  }

  function openAdminPanel() {
    openModal({
      title: "🛠️ Painel Admin",
      bodyHTML: `
        <p style="margin-top:0">
          Ações administrativas (uso interno).
        </p>

        <div style="display:grid; gap:10px; margin-top:12px">
          <button class="btn" id="adminResetRankingBtn" type="button">🧹 Zerar ranking (individual + setor)</button>
        </div>

        <p class="muted" style="margin:12px 0 0; font-size:13px">
          Isso apaga/zera as coleções <code>individualRanking</code> e <code>sectorStats</code>.
        </p>
      `,
      buttons: [{ label: "Fechar", onClick: closeModal }],
    });

    setTimeout(() => {
      document.getElementById("adminResetRankingBtn")?.addEventListener("click", () => confirmResetRanking());
    }, 0);
  }

  function confirmResetRanking() {
    openModal({
      title: "Confirmar reset",
      bodyHTML: `
        <p><strong>Tem certeza?</strong></p>
        <p class="muted">Esta ação remove os resultados do ranking (individual e por setor).</p>
      `,
      buttons: [
        { label: "Cancelar", variant: "ghost", onClick: closeModal },
        {
          label: "Sim, zerar agora",
          onClick: async () => {
            closeModal();
            await runResetRanking();
          },
        },
      ],
    });
  }

  async function runResetRanking() {
    // modal de status
    openModal({
      title: "Zerando ranking…",
      bodyHTML: `<p class="muted" style="margin-top:0">Aguarde…</p>`,
      buttons: [{ label: "Fechar", onClick: closeModal }],
    });

    try {
      const res1 = await clearCollectionPreferDelete("individualRanking", zeroIndividualDoc);
      const res2 = await clearCollectionPreferDelete("sectorStats", zeroSectorDoc);

      openModal({
        title: "✅ Ranking zerado",
        bodyHTML: `
          <p>Concluído.</p>
          <p class="muted" style="margin-top:10px; font-size:13px">
            individualRanking: <strong>${res1}</strong><br/>
            sectorStats: <strong>${res2}</strong>
          </p>
        `,
        buttons: [{ label: "Ok", onClick: closeModal }],
      });
    } catch (err) {
      console.error("[admin] reset ranking falhou:", err);
      openModal({
        title: "❌ Falha ao zerar ranking",
        bodyHTML: `
          <p>Não foi possível concluir o reset.</p>
          <p class="muted"><code>${escapeHtml(err?.message || String(err))}</code></p>
          <p class="muted" style="margin-top:10px">
            Se o erro for <code>permission-denied</code>, precisamos ajustar as regras do Firestore para permitir admin.
          </p>
        `,
        buttons: [{ label: "Ok", onClick: closeModal }],
      });
    }
  }

  // --------- Core reset helpers ---------

  async function clearCollectionPreferDelete(colName, zeroFn) {
    const snap = await getDocs(collection(db, colName));
    const docs = snap.docs;

    if (!docs.length) return "0 docs (já vazio)";

    // Firestore batch: limite 500. Vou usar 450 por margem.
    const CHUNK = 450;

    // 1) tenta deletar em batch
    try {
      let deleted = 0;
      for (let i = 0; i < docs.length; i += CHUNK) {
        const batch = writeBatch(db);
        const slice = docs.slice(i, i + CHUNK);
        for (const d of slice) batch.delete(d.ref);
        await batch.commit();
        deleted += slice.length;
      }
      return `${deleted} docs apagados`;
    } catch (e) {
      // 2) fallback: zera docs (se delete não for permitido)
      console.warn(`[admin] delete falhou em ${colName}. Tentando fallback de zerar docs…`, e);

      let zeroed = 0;
      for (let i = 0; i < docs.length; i += CHUNK) {
        const batch = writeBatch(db);
        const slice = docs.slice(i, i + CHUNK);
        for (const d of slice) {
          const payload = zeroFn(d.id);
          batch.set(doc(db, colName, d.id), payload, { merge: true });
        }
        await batch.commit();
        zeroed += slice.length;
      }

      return `${zeroed} docs zerados (fallback)`;
    }
  }

  function zeroIndividualDoc() {
    return {
      score: 0,
      correct: 0,
      wrong: 0,
      resetAt: serverTimestamp(),
      // opcionalmente: manter name/sector; merge:true mantém campos existentes
    };
  }

  function zeroSectorDoc() {
    return {
      missions: 0,
      totalOverall: 0,
      totalT1: 0,
      totalT2: 0,
      totalT3: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalAuto: 0,
      updatedAt: serverTimestamp(),
      resetAt: serverTimestamp(),
    };
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
