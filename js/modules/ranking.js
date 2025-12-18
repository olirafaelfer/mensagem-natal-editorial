// js/modules/ranking.js — Ranking (individual + destaque do usuário)
//
// Coleções (sem Cloud Function):
// /individualRanking/{uid}
//  { uid, name, sector, c1Score, c2Score, c3Score, overallAvg, createdAt, updatedAt }
//
// Observação: por enquanto usa UID (mesmo modelo das rules atuais).
// Depois você migra para hash do e-mail.

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

export function bootRanking(app){
  const { firebase, dom } = app;
  const { openModal, closeModal } = app.modal || {};

  async function submitChallengeScore(ch, score){
    if (!firebase?.auth?.currentUser) return;
    const u = firebase.auth.currentUser;
    const uid = u.uid;

    const profile = await app.auth?.getProfile?.();
    const name = profile?.name || app.user?.getUserName?.() || "Usuário";
    const sector = profile?.sector || app.user?.getUserSector?.() || "(Sem setor)";

    const ref = firebase.doc(firebase.db, "individualRanking", uid);
    const snap = await firebase.getDoc(ref);
    const d = snap.exists() ? snap.data() : {};

    const payload = {
      uid,
      name,
      sector,
      updatedAt: firebase.serverTimestamp(),
      ["c"+ch+"Score"]: Number(score || 0),
    };

    const c1 = (ch===1 ? Number(score||0) : Number(d.c1Score||0));
    const c2 = (ch===2 ? Number(score||0) : Number(d.c2Score||0));
    const c3 = (ch===3 ? Number(score||0) : Number(d.c3Score||0));
    const have = [c1,c2,c3].filter(v => v > 0);
    payload.overallAvg = have.length ? Math.round(have.reduce((a,b)=>a+b,0)/have.length) : 0;

    if (!snap.exists()) payload.createdAt = firebase.serverTimestamp();

    await firebase.setDoc(ref, { ...d, ...payload }, { merge:true });
  }

  async function openRanking(){
    if (!openModal){
      console.warn("[ranking] modal não inicializado.");
      return;
    }

    // busca top 50 por média
    const q = firebase.query(
      firebase.collection(firebase.db, "individualRanking"),
      firebase.orderBy("overallAvg", "desc"),
      firebase.limit(50)
    );

    const snap = await firebase.getDocs(q);
    const rows = snap.docs.map(d => d.data());

    const meUid = firebase.auth?.currentUser?.uid || null;
    const myIndex = meUid ? rows.findIndex(r => r.uid === meUid) : -1;

    const body = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:10px">
        <div><b>Ranking geral (média dos desafios)</b></div>
        ${myIndex>=0 ? `<div class="muted">Sua posição: <b>#${myIndex+1}</b></div>` : `<div class="muted">Entre para aparecer</div>`}
      </div>
      <div style="max-height:55vh; overflow:auto; border-radius:12px;">
        <table class="rank-table" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left; padding:8px 10px">#</th>
              <th style="text-align:left; padding:8px 10px">Nome</th>
              <th style="text-align:left; padding:8px 10px">Setor</th>
              <th style="text-align:right; padding:8px 10px">Média</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r,i)=>`
              <tr style="${r.uid===meUid ? "background: rgba(255,255,255,.08);" : ""}">
                <td style="padding:8px 10px">${i+1}</td>
                <td style="padding:8px 10px"><b>${escapeHtml(r.name||"")}</b></td>
                <td style="padding:8px 10px">${escapeHtml(r.sector||"")}</td>
                <td style="padding:8px 10px; text-align:right"><b>${Number(r.overallAvg||0)}</b></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="muted" style="margin-top:10px">
        * Desafios: D1=${rows[myIndex]?.c1Score||0} · D2=${rows[myIndex]?.c2Score||0} · D3=${rows[myIndex]?.c3Score||0}
      </div>
    `;

    openModal({
      title: "🏆 Ranking",
      bodyHTML: body,
      buttons: [{ label:"Fechar", onClick: closeModal }]
    });
  }

  // wires
  dom.rankingBtn?.addEventListener("click", openRanking);
  dom.finalRankingBtn?.addEventListener("click", openRanking);

  app.ranking = { openRanking, submitChallengeScore };
}
