// js/ranking.js — V2 (modelo) ranking por DESAFIO + geral (média)
// Estrutura sugerida:
// /rankingByEmail/{emailHashHex}
// {
//   email: "user@dominio.com",
//   emailHash: "..." (igual ao docId),
//   name, sector,
//   visible: true/false,
//   c1Score, c2Score, c3Score,
//   c1Correct, c1Wrong, ...,
//   overallAvg,  // média dos 3 desafios (quando existir)
//   createdAt, updatedAt
// }
//
// Observação importante de segurança:
// - Este modelo impede que alguém escreva no documento de outra pessoa porque exige email == request.auth.token.email.
// - Ainda assim, como as rules não calculam SHA-256, não dá para provar que docId == hash(email) apenas nas rules.
//   A solução "perfeita" (privacidade + unicidade) é usar Cloud Function para gerar o hash server-side e escrever no doc certo.
//   Se você quiser ficar 100% sem brechas, eu te passo a Function também.

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

export function bootRanking(app){
  const { openModal, closeModal } = app.modal || {};
  const fb = app.firebase;

  if (!openModal || !closeModal || !fb?.db) return;

  const rankingBtn = document.getElementById("rankingBtn");
  const finalRankingBtn = document.getElementById("finalRankingBtn");
  rankingBtn?.addEventListener("click", () => openRankingModal());
  finalRankingBtn?.addEventListener("click", () => openRankingModal());

  // API para o jogo chamar quando finalizar um desafio
  app.ranking = app.ranking || {};
  app.ranking.commitChallenge = commitChallengeScore;
  app.ranking.setVisible = setVisible;

  async function sha256Hex(str){
    const data = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function getLoggedEmail(){
    const u = getAuth().currentUser;
    return u?.email || null;
  }

  function getProfileSafe(){
    return app.auth?.getProfile?.() || null;
  }

  async function commitChallengeScore(challengeId, payload){
    const email = getLoggedEmail();
    if (!email) return;

    const emailNorm = email.trim().toLowerCase();
    const emailHash = await sha256Hex(emailNorm);

    const prof = getProfileSafe();
    const name = (prof?.name || app.user?.getUserName?.() || "").trim();
    const sector = (prof?.sector || app.user?.getUserSector?.() || "").trim();
    if (!name || !sector) return;

    const score = Number(payload?.score ?? 0);
    const correct = Number(payload?.correct ?? 0);
    const wrong = Number(payload?.wrong ?? 0);

    const ref = fb.doc(fb.db, "rankingByEmail", emailHash);

    // merge, mas garantindo "melhor pontuação por desafio"
    await fb.runTransaction(fb.db, async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists() ? snap.data() : {};

      const base = {
        email: emailNorm,
        emailHash,
        name,
        sector,
        visible: (data.visible !== false),
        updatedAt: fb.serverTimestamp(),
      };
      if (!snap.exists()) base.createdAt = fb.serverTimestamp();

      const cKey = `c${challengeId}Score`;
      const cCKey = `c${challengeId}Correct`;
      const cWKey = `c${challengeId}Wrong`;

      const prevScore = Number(data[cKey] ?? 0);
      if (score > prevScore){
        base[cKey] = score;
        base[cCKey] = correct;
        base[cWKey] = wrong;
      }

      const c1 = Number(base.c1Score ?? data.c1Score ?? 0);
      const c2 = Number(base.c2Score ?? data.c2Score ?? 0);
      const c3 = Number(base.c3Score ?? data.c3Score ?? 0);

      base.overallAvg = (c1 && c2 && c3) ? Math.round((c1 + c2 + c3) / 3) : 0;

      tx.set(ref, base, { merge:true });
    });
  }

  async function setVisible(visible){
    const email = getLoggedEmail();
    if (!email) return;

    const emailHash = await sha256Hex(email.trim().toLowerCase());
    const ref = fb.doc(fb.db, "rankingByEmail", emailHash);

    await fb.setDoc(ref, { visible: !!visible, updatedAt: fb.serverTimestamp() }, { merge:true });
  }

  function medalFor(i){
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return "•";
  }

  async function fetchTop(field){
    const q = fb.query(
      fb.collection(fb.db, "rankingByEmail"),
      fb.orderBy(field, "desc"),
      fb.limit(100)
    );
    const snap = await fb.getDocs(q);
    const out = [];
    snap.forEach(d => {
      const x = d.data();
      if (x.visible === false) return;
      out.push({ id:d.id, ...x });
    });
    return out;
  }

  async function openRankingModal(){
    openModal({
      title: "🏆 Ranking",
      bodyHTML: `
        <div class="ranking-tabs" id="rankingTabs">
          <button class="ranking-tab active" data-tab="c1">Desafio 1</button>
          <button class="ranking-tab" data-tab="c2">Desafio 2</button>
          <button class="ranking-tab" data-tab="c3">Desafio 3</button>
          <button class="ranking-tab" data-tab="all">Geral</button>
        </div>
        <div id="rankingBody" style="margin-top:12px">
          <div class="muted">Carregando…</div>
        </div>
      `,
      buttons: [{ label:"Fechar", onClick: closeModal }]
    });

    const tabs = document.getElementById("rankingTabs");
    const body = document.getElementById("rankingBody");
    let current = "c1";

    async function render(){
      const field =
        current === "c1" ? "c1Score" :
        current === "c2" ? "c2Score" :
        current === "c3" ? "c3Score" :
        "overallAvg";

      const rows = await fetchTop(field);
      let html = `<div class="ranking-list">`;
      rows.forEach((r, i) => {
        const score =
          current === "c1" ? (r.c1Score ?? 0) :
          current === "c2" ? (r.c2Score ?? 0) :
          current === "c3" ? (r.c3Score ?? 0) :
          (r.overallAvg ?? 0);

        html += `
          <div class="ranking-row">
            <div class="rk-pos">${medalFor(i)} ${i+1}</div>
            <div class="rk-main">
              <div class="rk-name">${escapeHtml(r.name || "—")}</div>
              <div class="rk-sub muted">${escapeHtml(r.sector || "")}</div>
            </div>
            <div class="rk-score"><strong>${Number(score || 0)}</strong></div>
          </div>
        `;
      });
      html += `</div>`;
      body.innerHTML = html;
    }

    tabs?.addEventListener("click", (e) => {
      const btn = e.target?.closest?.(".ranking-tab");
      if (!btn) return;
      current = btn.dataset.tab;
      tabs.querySelectorAll(".ranking-tab").forEach(b => b.classList.toggle("active", b === btn));
      render();
    });

    render();
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
    }[c]));
  }
}
