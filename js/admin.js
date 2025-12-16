// js/admin.js — Admin login + ações (Firestore)
// - Não mexe no game-core nem no ranking.js
// - Usa app.modal (se existir) para UX consistente
// - Zera ranking apagando docs no Firestore

import {
  collection,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

export function bootAdmin(app){
  const adminBtn = document.getElementById("adminBtn");
  if (!adminBtn) return;

  const fb = app?.firebase;
  const modal = app?.modal;

  // ✅ senha simples por enquanto (depois você troca por Auth/roles)
  const ADMIN_PASSWORD = "admin123";

  // sessão local (não persistente tipo “login de usuário”, só pra admin por sessão)
  const SESSION_KEY = "mission_admin_session";
  const isAdmin = () => sessionStorage.getItem(SESSION_KEY) === "1";
  const setAdmin = (v) => sessionStorage.setItem(SESSION_KEY, v ? "1" : "0");

  // badge visual
  function syncBadge(){
    adminBtn.classList.toggle("is-admin", isAdmin());
  }
  syncBadge();

  // Helpers de modal (usa o seu modal se existir; fallback para prompt/alert)
  function open({ title, bodyHTML, buttons }){
    if (modal?.openModal) return modal.openModal({ title, bodyHTML, buttons });
    // fallback simples
    alert(title + "\n\n" + bodyHTML.replace(/<[^>]*>/g, ""));
  }
  function close(){
    if (modal?.closeModal) return modal.closeModal();
  }

  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  // ============
  // UI: Login
  // ============
  function askPassword(){
    // com seu modal
    if (modal?.openModal){
      open({
        title: "🔒 Admin",
        bodyHTML: `
          <p class="muted" style="margin-top:0">Digite a senha de administrador.</p>
          <input class="input" id="adminPassInput" type="password" autocomplete="current-password" placeholder="Senha" />
          <p class="muted" style="margin:10px 0 0; font-size:13px">Dica: depois vamos trocar isso por login real.</p>
        `,
        buttons: [
          { label:"Cancelar", variant:"ghost", onClick: close },
          { label:"Entrar", onClick: () => {
              const v = document.getElementById("adminPassInput")?.value ?? "";
              if (v === ADMIN_PASSWORD){
                setAdmin(true);
                syncBadge();
                close();
                openAdminPanel();
              } else {
                close();
                open({
                  title: "Senha incorreta",
                  bodyHTML: `<p>Senha incorreta. Tente novamente.</p>`,
                  buttons: [{ label:"Ok", onClick: close }]
                });
              }
            }
          }
        ]
      });

      setTimeout(() => document.getElementById("adminPassInput")?.focus(), 30);
      return;
    }

    // fallback sem modal (não recomendado, mas não quebra)
    const v = prompt("Senha de administrador:");
    if (v === ADMIN_PASSWORD){
      setAdmin(true);
      syncBadge();
      openAdminPanel();
    } else if (v !== null){
      alert("Senha incorreta.");
    }
  }

  // ============
  // Ação: Zerar ranking (Firestore)
  // ============
  async function clearCollection(collName){
    const db = fb?.db;
    if (!db) throw new Error("Firebase DB não disponível em app.firebase.db");

    const snap = await getDocs(collection(db, collName));
    const deletions = [];
    snap.forEach(d => {
      deletions.push(deleteDoc(doc(db, collName, d.id)));
    });
    await Promise.all(deletions);
    return deletions.length;
  }

  async function confirmAndResetRanking(){
    if (!isAdmin()){
      askPassword();
      return;
    }

    open({
      title: "⚠️ Zerar ranking",
      bodyHTML: `
        <p><strong>Isso vai apagar os dados do ranking no Firestore.</strong></p>
        <p class="muted" style="margin-top:10px">
          Coleções afetadas:
          <br>• <code>individualRanking</code>
          <br>• <code>sectorStats</code>
        </p>
        <p class="muted" style="margin-top:10px">
          Essa ação não tem “desfazer”.
        </p>
      `,
      buttons: [
        { label:"Cancelar", variant:"ghost", onClick: close },
        { label:"Sim, zerar", onClick: async () => {
            close();
            try {
              // feedback
              open({
                title: "Zerando…",
                bodyHTML: `<p class="muted">Apagando documentos do ranking…</p>`,
                buttons: []
              });

              const delInd = await clearCollection("individualRanking");
              const delSec = await clearCollection("sectorStats");

              close();
              open({
                title: "✅ Ranking zerado",
                bodyHTML: `
                  <p>Pronto! Dados apagados.</p>
                  <p class="muted" style="margin-top:10px">
                    individualRanking: <strong>${delInd}</strong> docs<br>
                    sectorStats: <strong>${delSec}</strong> docs
                  </p>
                `,
                buttons: [{ label:"Ok", onClick: close }]
              });

            } catch (err) {
              close();
              open({
                title: "❌ Falha ao zerar",
                bodyHTML: `<p class="muted"><code>${escapeHtml(err?.message || String(err))}</code></p>`,
                buttons: [{ label:"Ok", onClick: close }]
              });
            }
          }
        }
      ]
    });
  }

  // ============
  // Painel Admin (modal)
  // ============
  function openAdminPanel(){
    if (!isAdmin()){
      askPassword();
      return;
    }

    open({
      title: "🔒 Painel do Admin",
      bodyHTML: `
        <p class="muted" style="margin-top:0">
          (Temporário) Em breve aqui entra login de usuários, estatísticas e painel completo.
        </p>

        <div style="display:grid; gap:10px; margin-top:12px">
          <button class="btn" id="adminResetBtn" type="button">🧹 Zerar ranking</button>
          <button class="btn ghost" id="adminLogoutBtn" type="button">Sair do admin</button>
        </div>
      `,
      buttons: [{ label:"Fechar", onClick: close }]
    });

    setTimeout(() => {
      document.getElementById("adminResetBtn")?.addEventListener("click", confirmAndResetRanking);
      document.getElementById("adminLogoutBtn")?.addEventListener("click", () => {
        setAdmin(false);
        syncBadge();
        close();
      });
    }, 0);
  }

  // ============
  // Click do botão 🔒
  // ============
  adminBtn.addEventListener("click", () => {
    if (isAdmin()) openAdminPanel();
    else askPassword();
  });
}
