// js/ranking.js — ranking individual (logados) + por setor (Firestore)
// - Individual: /individualRanking/{uid} (docId = uid) + campo uid no payload (rules)
// - Setor: /sectorStats/{sectorId} (agregado)
// - Destaque do usuário logado no ranking individual
//
// Requer:
// - app.modal (openModal/closeModal)
// - app.firebase.* helpers (db, doc, getDoc, setDoc, runTransaction, serverTimestamp, collection, getDocs, query, orderBy, limit)
// - app.auth (opcional, vindo do auth.js): isLogged(), getProfile()

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

export function bootRanking(app){
  const { openModal, closeModal } = app.modal || {};
  const fb = app.firebase;

  if (!openModal || !closeModal) {
    console.warn("[ranking] modal não inicializado (ui-modal.js precisa bootar antes).");
    return;
  }

  if (!fb?.db) {
    console.warn("[ranking] Firebase não inicializado em app.firebase");
    return;
  }

  const rankingBtn = document.getElementById("rankingBtn");
  const finalRankingBtn = document.getElementById("finalRankingBtn");

  rankingBtn?.addEventListener("click", () => openRankingModal());
  finalRankingBtn?.addEventListener("click", () => openRankingModal());

  // ✅ API para outros módulos (ex: auth.js "Minha conta")
  app.ranking = {
    // snapshot simples do ranking do usuário (se existir)
    // retorna: { uid, name, sector, score, correct, wrong } | null
    getMyRankingSnapshot: async () => {
      const uid = getLoggedUid();
      if (!uid) return null;
      try {
        const ref = fb.doc(fb.db, "individualRanking", uid);
        const snap = await fb.getDoc(ref);
        if (!snap.exists()) return null;
        const d = snap.data() || {};
        return {
          uid,
          name: String(d.name || "").trim(),
          sector: String(d.sector || "").trim(),
          score: Number(d.score || 0),
          correct: Number(d.correct || 0),
          wrong: Number(d.wrong || 0),
        };
      } catch (e) {
        console.warn("[ranking] getMyRankingSnapshot falhou:", e);
        return null;
      }
    },
  };

  // game-core chama isso ao finalizar
  app.finishMission = async (payload) => {
    try {
      await maybeCommitMissionToSectorRanking(payload);
      await commitIndividualRanking(payload);
    } catch (err) {
      console.error("Falha ao salvar ranking:", err);
    }
  };

  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function normalize(str){
    return (str || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  }

  function clampName(name){
    const n = (name || "").trim().replace(/\s+/g, " ");
    return n.length > 60 ? n.slice(0,60) : n;
  }

  function medalFor(i){
    if (i === 0) return { t:"🥇", top:true };
    if (i === 1) return { t:"🥈", top:true };
    if (i === 2) return { t:"🥉", top:true };
    return { t:`${i+1}º`, top:false };
  }

  function isOptedOut(){
    return localStorage.getItem("mission_optout_ranking") === "1";
  }

  function getUserName(){
    const n =
      app.user?.getUserName?.() ||
      (app.gameState?.getUserName?.() ?? "") ||
      localStorage.getItem("mission_name") ||
      "";
    return clampName(n);
  }

  function getUserSector(){
    return String(
      app.user?.getUserSector?.() ||
      (app.gameState?.getUserSector?.() ?? "") ||
      localStorage.getItem("mission_sector") ||
      ""
    ).trim();
  }

  function getLoggedUid(){
    // prioriza app.auth (se existir) e cai no firebase auth
    const auth = getAuth();
    const uid = auth?.currentUser?.uid || null;
    return uid;
  }

  function getLoggedProfileSafe(){
    // tenta obter do auth.js
    const p = app.auth?.getProfile?.() || null;
    if (p && (p.name || p.sector)) return p;
    return null;
  }

  async function maybeCommitMissionToSectorRanking(payload){
    // ranking por setor continua respeitando opt-out.
    // (se anônimo não consegue habilitar optRanking, essa função já não roda na prática)
    if (isOptedOut()) return;

    const sector = getUserSector();
    if (!sector) return;

    const ref = fb.doc(fb.db, "sectorStats", sector);

    const score = Number(payload?.score ?? app.gameState?.score ?? 0);
    const correctCount = Number(payload?.correctCount ?? app.gameState?.correctCount ?? 0);
    const wrongCount = Number(payload?.wrongCount ?? app.gameState?.wrongCount ?? 0);
    const autoUsed = Number(payload?.autoUsed ?? app.gameState?.autoUsed ?? 0);
    const tScore = payload?.taskScore ?? app.gameState?.taskScore ?? [0,0,0];

    await fb.runTransaction(fb.db, async (tx) => {
      const snap = await tx.get(ref);
      const d = snap.exists() ? snap.data() : {
        missions: 0,
        totalOverall: 0,
        totalT1: 0,
        totalT2: 0,
        totalT3: 0,
        totalCorrect: 0,
        totalWrong: 0,
        totalAuto: 0
      };

      tx.set(ref, {
        missions: (d.missions || 0) + 1,
        totalOverall: (d.totalOverall || 0) + score,
        totalT1: (d.totalT1 || 0) + Number(tScore?.[0] || 0),
        totalT2: (d.totalT2 || 0) + Number(tScore?.[1] || 0),
        totalT3: (d.totalT3 || 0) + Number(tScore?.[2] || 0),
        totalCorrect: (d.totalCorrect || 0) + correctCount,
        totalWrong: (d.totalWrong || 0) + wrongCount,
        totalAuto: (d.totalAuto || 0) + autoUsed,
        updatedAt: fb.serverTimestamp()
      }, { merge:true });
    });
  }

  async function commitIndividualRanking(payload){
    // ✅ regras novas: individual somente logado e com uid
    if (isOptedOut()) return;

    const uid = getLoggedUid();
    if (!uid) return; // sem login, não salva individual

    // nome/setor: preferir profile (mais confiável), senão pega do form/localStorage
    const prof = getLoggedProfileSafe();
    const name = clampName((prof?.name || getUserName() || "").trim());
    const sector = (prof?.sector || getUserSector() || "").trim();

    if (!name || !sector) return;

    const score = Number(payload?.score ?? app.gameState?.score ?? 0);
    const correct = Number(payload?.correctCount ?? app.gameState?.correctCount ?? 0);
    const wrong = Number(payload?.wrongCount ?? app.gameState?.wrongCount ?? 0);

    // docId = uid
    const ref = fb.doc(fb.db, "individualRanking", uid);

    // checa score anterior para não piorar
    const snap = await fb.getDoc(ref);
    const prevScore = snap.exists() ? Number(snap.data()?.score || 0) : -Infinity;
    if (score < prevScore) return;

    // createdAt só na primeira vez
    const base = {
      uid,
      name,
      sector,
      score,
      correct,
      wrong,
      updatedAt: fb.serverTimestamp(),
    };

    if (!snap.exists()) {
      base.createdAt = fb.serverTimestamp();
    }

    await fb.setDoc(ref, base, { merge:true });
  }

  async function openRankingModal(){
    openModal({
      title: "🏆 Ranking",
      bodyHTML: `
        <div class="ranking-tabs" id="rankingTabs">
          <button class="ranking-tab active" data-tab="ind">🧑 Individual</button>
          <button class="ranking-tab" data-tab="sec">🏢 Por setor</button>
        </div>

        <div class="ranking-panel show" id="panel-ind">
          <p class="muted" style="margin-top:0">Carregando ranking individual…</p>
        </div>

        <div class="ranking-panel" id="panel-sec">
          <p class="muted" style="margin-top:0">Carregando ranking por setor…</p>
        </div>

        <p class="muted" style="margin-top:12px">
          Ranking individual aparece apenas para quem está logado e optou por participar.
          Ranking por setor é agregado (LGPD).
        </p>
      `,
      buttons: [{ label:"Fechar", onClick: closeModal }]
    });

    setTimeout(() => {
      const wrap = document.getElementById("rankingTabs");
      const btns = wrap?.querySelectorAll(".ranking-tab");
      const ind = document.getElementById("panel-ind");
      const sec = document.getElementById("panel-sec");

      btns?.forEach(b => {
        b.addEventListener("click", () => {
          btns.forEach(x => x.classList.remove("active"));
          b.classList.add("active");

          const tab = b.dataset.tab;
          if (tab === "ind"){
            ind?.classList.add("show");
            sec?.classList.remove("show");
          } else {
            sec?.classList.add("show");
            ind?.classList.remove("show");
          }
        });
      });
    }, 0);

    await Promise.allSettled([renderIndividualRanking(), renderSectorRanking()]);
  }

  async function renderIndividualRanking(){
    const panel = document.getElementById("panel-ind");
    if (!panel) return;

    try {
      const q = fb.query(
        fb.collection(fb.db, "individualRanking"),
        fb.orderBy("score", "desc"),
        fb.limit(50)
      );

      const snap = await fb.getDocs(q);

      const rows = [];
      snap.forEach(docu => {
        const d = docu.data() || {};
        rows.push({
          docId: docu.id, // uid
          uid: String(d.uid || docu.id || ""),
          name: String(d.name || "").trim(),
          sector: String(d.sector || "").trim(),
          score: Number(d.score || 0),
          createdAtMs: d.createdAt?.toMillis ? d.createdAt.toMillis() : 0
        });
      });

      rows.sort((a,b) =>
        (b.score - a.score) ||
        (a.createdAtMs - b.createdAtMs) ||
        a.name.localeCompare(b.name)
      );

      if (rows.length === 0){
        panel.innerHTML = `<p class="muted">Ainda não há resultados no ranking individual.</p>`;
        return;
      }

      const myUid = getLoggedUid();
      const myIndex = myUid ? rows.findIndex(r => (r.uid === myUid || r.docId === myUid)) : -1;

      panel.innerHTML = `
        <div style="overflow:auto; border-radius:14px">
          <table class="rank-table">
            <thead>
              <tr>
                <th style="width:56px">#</th>
                <th>Nome</th>
                <th class="num">Pontos</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r,i) => {
                const m = medalFor(i);
                const delay = Math.min(i * 30, 420);
                const isMe = (myIndex === i);
                return `
                  <tr class="rank-row ${isMe ? "rank-me" : ""}" style="animation-delay:${delay}ms">
                    <td><span class="medal ${m.top ? "top":""}">${m.t}</span></td>
                    <td>
                      <span class="rank-name">${escapeHtml(r.name || "—")}${isMe ? ' <span class="muted">(você)</span>' : ""}</span>
                      <span class="rank-sub">${escapeHtml(r.sector || "")}</span>
                    </td>
                    <td class="num"><strong>${r.score}</strong></td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>

        ${myIndex === -1 && myUid ? `
          <p class="muted" style="margin-top:12px">
            Você está logado, mas ainda não apareceu no top 50 (ou ainda não enviou resultado com ranking ligado).
          </p>
        ` : ``}
      `;
    } catch (err) {
      console.error("Ranking individual falhou:", err);
      panel.innerHTML = `
        <p>Não foi possível carregar o ranking individual.</p>
        <p class="muted"><code>${escapeHtml(err?.message || String(err))}</code></p>
      `;
    }
  }

  async function renderSectorRanking(){
    const panel = document.getElementById("panel-sec");
    if (!panel) return;

    try {
      const sectors = (app.data?.SECTORS || []).filter(s => s && s !== "Selecione…");
      const map = new Map();

      try {
        const snapAll = await fb.getDocs(fb.collection(fb.db, "sectorStats"));
        snapAll.forEach(d => map.set(d.id, d.data()));
      } catch {
        // ok, fallback abaixo
      }

      const rows = [];
      for (const s of sectors){
        let d = map.get(s);
        if (!d){
          const ref = fb.doc(fb.db, "sectorStats", s);
          const snap = await fb.getDoc(ref);
          d = snap.exists() ? snap.data() : null;
        }

        const missions = Number(d?.missions || 0);
        const avg = (num) => missions ? (Number(num || 0) / missions) : 0;

        rows.push({
          sector: s,
          avgT1: avg(d?.totalT1),
          avgT2: avg(d?.totalT2),
          avgT3: avg(d?.totalT3),
          avgOverall: avg(d?.totalOverall),
          avgCorrect: avg(d?.totalCorrect),
          avgWrong: avg(d?.totalWrong),
        });
      }

      const hasAny = rows.some(r => r.avgOverall !== 0 || r.avgCorrect !== 0 || r.avgWrong !== 0);
      if (!hasAny){
        panel.innerHTML = `<p class="muted">Ainda não há dados suficientes para o ranking por setor.</p>`;
        return;
      }

      rows.sort((a,b) =>
        b.avgOverall - a.avgOverall ||
        b.avgCorrect - a.avgCorrect ||
        a.avgWrong - b.avgWrong
      );

      panel.innerHTML = `
        <div style="overflow:auto; border-radius:14px">
          <table class="rank-table">
            <thead>
              <tr>
                <th style="width:56px">#</th>
                <th>Setor</th>
                <th class="num">Ativ. 1</th>
                <th class="num">Ativ. 2</th>
                <th class="num">Ativ. 3</th>
                <th class="num">Média geral</th>
                <th class="num">Acertos</th>
                <th class="num">Erros</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r,i) => {
                const m = medalFor(i);
                const delay = Math.min(i * 30, 420);
                return `
                  <tr class="rank-row" style="animation-delay:${delay}ms">
                    <td><span class="medal ${m.top ? "top":""}">${m.t}</span></td>
                    <td><span class="rank-name">${escapeHtml(r.sector)}</span></td>
                    <td class="num">${r.avgT1.toFixed(2)}</td>
                    <td class="num">${r.avgT2.toFixed(2)}</td>
                    <td class="num">${r.avgT3.toFixed(2)}</td>
                    <td class="num"><strong>${r.avgOverall.toFixed(2)}</strong></td>
                    <td class="num">${r.avgCorrect.toFixed(2)}</td>
                    <td class="num">${r.avgWrong.toFixed(2)}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      console.error("Ranking setor falhou:", err);
      panel.innerHTML = `
        <p>Não foi possível carregar o ranking por setor.</p>
        <p class="muted"><code>${escapeHtml(err?.message || String(err))}</code></p>
      `;
    }
  }
}
