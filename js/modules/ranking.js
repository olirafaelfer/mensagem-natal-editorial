// js/modules/ranking.js — Ranking simples (compatível com suas rules atuais)
// Coleção: /individualRanking/{uid}
// Campos permitidos pelas rules:
// uid, name, sector, score, correct, wrong, createdAt, updatedAt

export function bootRanking(app){
  const { firebase, dom } = app;
  const state = { lastRows: [] };

  async function submitScore({ score, correct, wrong }){
    if (!app.auth?.isLogged?.()) return;
    const u = firebase.auth.currentUser;
    const uid = u.uid;
    const profile = await app.auth.getProfile?.();
    const name = profile?.name || app.user.getUserName() || "Usuário";
    const sector = profile?.sector || app.user.getUserSector() || "(Sem setor)";

    const ref = firebase.doc(firebase.db, "individualRanking", uid);
    const snap = await firebase.getDoc(ref);
    const payload = {
      uid, name, sector,
      score: Number(score||0),
      correct: Number(correct||0),
      wrong: Number(wrong||0),
      updatedAt: firebase.serverTimestamp(),
    };
    if (!snap.exists()) payload.createdAt = firebase.serverTimestamp();
    await firebase.setDoc(ref, payload, { merge: true });
  }

  function renderRows(rows, meUid){
    if (!dom.rankingBody) return;
    dom.rankingBody.innerHTML = rows.map((r, idx)=> {
      const me = (meUid && r.uid === meUid);
      return `
        <div class="rank-row ${me ? "me" : ""}">
          <div class="rank-pos">${idx+1}</div>
          <div class="rank-main">
            <div class="rank-name">${escapeHtml(r.name||"")}</div>
            <div class="rank-sector">${escapeHtml(r.sector||"")}</div>
          </div>
          <div class="rank-score">${Number(r.score||0)}</div>
        </div>
      `;
    }).join("");
  }

  async function openRanking(){
    try{
      const snap = await firebase.getDocs(firebase.collection(firebase.db, "individualRanking"));
      const rows = [];
      snap.forEach(d=> rows.push(d.data()));
      rows.sort((a,b)=> (Number(b.score||0) - Number(a.score||0)) || (String(a.name||"").localeCompare(String(b.name||""))));
      state.lastRows = rows;
      const meUid = firebase.auth.currentUser?.uid || null;
      renderRows(rows, meUid);

      // setor (média) client-side
      if (dom.rankingSectorBody){
        const by = new Map();
        for (const r of rows){
          const s = r.sector || "(Sem setor)";
          const arr = by.get(s) || [];
          arr.push(Number(r.score||0));
          by.set(s, arr);
        }
        const sectorRows = Array.from(by.entries()).map(([sector, arr])=>{
          const avg = arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
          return { sector, avg, count: arr.length };
        }).sort((a,b)=> b.avg - a.avg);

        dom.rankingSectorBody.innerHTML = sectorRows.map((r, i)=>`
          <div class="rank-row">
            <div class="rank-pos">${i+1}</div>
            <div class="rank-main">
              <div class="rank-name">${escapeHtml(r.sector)}</div>
              <div class="rank-sector">${r.count} participantes</div>
            </div>
            <div class="rank-score">${r.avg}</div>
          </div>
        `).join("");
      }

      app.modal.openModal({
        title: "🏆 Ranking",
        bodyHTML: dom.rankingPanel?.outerHTML || "<p>Ranking indisponível.</p>",
        buttons: [{ label:"Fechar", variant:"ghost", onClick: app.modal.closeModal }],
        dismissible: true
      });
    }catch(e){
      console.error(e);
      app.modal.openModal({
        title:"Ranking",
        bodyHTML:`<p>Não foi possível carregar o ranking.</p><p class="muted">${escapeHtml(String(e?.message||e))}</p>`,
        buttons:[{label:"Ok", onClick: app.modal.closeModal}],
        dismissible: true
      });
    }
  }

  // helpers
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  // wire topbar button
  dom.rankingBtn?.addEventListener("click", ()=> openRanking());

  app.ranking = { submitScore, openRanking };
}
