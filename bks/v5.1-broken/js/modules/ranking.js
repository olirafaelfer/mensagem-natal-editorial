// js/modules/ranking.js — Ranking V2 (rankingByEmail)
// Regras principais:
// - Visitante NÃO grava
// - Logado SEMPRE grava (visible controla apenas exibição pública)
// - Ranking Geral = média simples dos 3 desafios (só conta quando os 3 concluídos; senão 0)

export function bootRanking(app){
  const fb = app.firebase;
  const modal = app.modal;
  const domBtn = app.dom?.rankingBtn || document.getElementById("rankingBtn");

  if (!fb?.db || !fb?.auth){
    console.warn("[ranking] firebase indisponível");
    const api = {
      open(){ modal?.openModal?.({ title:"Ranking", bodyHTML:"<p>Ranking indisponível (Firebase não inicializado).</p>", buttons:[{label:"Ok", onClick: modal?.closeModal}] }); },
      submitChallengeScore(){},
      setMyVisibility(){},
      getMyEntry: async () => null,
    };
    try { domBtn?.addEventListener("click", () => api.open()); } catch {}
    app.ranking = api;
    return api;
  }

  const { db, auth, doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit, serverTimestamp } = fb;
  const COL = "rankingByEmail";

  function getVisiblePref(){
    return localStorage.getItem("mission_visible_in_ranking") !== "0";
  }
  function setVisiblePref(v){
    localStorage.setItem("mission_visible_in_ranking", v ? "1" : "0");
  }

  async function sha256Hex(str){
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(String(str || "").trim().toLowerCase()));
    const arr = Array.from(new Uint8Array(buf));
    return arr.map(b => b.toString(16).padStart(2,"0")).join("");
  }

  function normName(s){ return String(s || "").trim().slice(0, 60) || "Jogador"; }
  function normSector(s){ return String(s || "").trim().slice(0, 120) || "Setor"; }

  function normScoreMap(existing){
    const base = { score: 0, correct: 0, wrong: 0, updatedAt: serverTimestamp() };
    if (!existing || typeof existing !== "object") return base;
    return {
      score: Number(existing.score ?? 0),
      correct: Number(existing.correct ?? 0),
      wrong: Number(existing.wrong ?? 0),
      updatedAt: existing.updatedAt || serverTimestamp()
    };
  }

  function hasAllDone(d1,d2,d3){
    const s1 = Number(d1?.score ?? -1);
    const s2 = Number(d2?.score ?? -1);
    const s3 = Number(d3?.score ?? -1);
    return s1 > 0 || s1 === 0 ? (s2 > 0 || s2 === 0) && (s3 > 0 || s3 === 0) : false;
  }

  function computeOverallAvg(d1,d2,d3){
    if (!hasAllDone(d1,d2,d3)) return 0;
    return Math.round((Number(d1.score||0) + Number(d2.score||0) + Number(d3.score||0)) / 3);
  }

  async function getMyEntry(){
    const u = auth.currentUser;
    const email = u?.email;
    if (!u || !email) return null;
    const emailHash = await sha256Hex(email);
    const snap = await getDoc(doc(db, COL, emailHash));
    if (!snap.exists()) return null;
    return snap.data();
  }

  async function upsertMyRanking({ ch, score, correct, wrong }){
    const u = auth.currentUser;
    const email = u?.email;
    if (!u || !email) return;

    const emailHash = await sha256Hex(email);
    const ref = doc(db, COL, emailHash);
    const nowTs = serverTimestamp();

    const prevSnap = await getDoc(ref);
    const prev = prevSnap.exists() ? (prevSnap.data() || {}) : {};

    const d1 = normScoreMap(prev.d1);
    const d2 = normScoreMap(prev.d2);
    const d3 = normScoreMap(prev.d3);

    const nextMap = { score: Math.max(0, Number(score ?? 0)), correct: Number(correct ?? 0), wrong: Number(wrong ?? 0), updatedAt: nowTs };
    if (ch === 1) Object.assign(d1, nextMap);
    if (ch === 2) Object.assign(d2, nextMap);
    if (ch === 3) Object.assign(d3, nextMap);

    const payload = {
      emailHash,
      email,
      uid: u.uid,
      name: normName(app.user?.getUserName?.() || u.displayName || prev.name),
      sector: normSector(app.user?.getUserSector?.() || prev.sector),
      visible: getVisiblePref(),
      d1, d2, d3,
      overallAvg: computeOverallAvg(d1,d2,d3),
      createdAt: prev.createdAt || nowTs,
      updatedAt: nowTs
    };

    await setDoc(ref, payload, { merge: false });
  }

  async function setMyVisibility(visible){
    const u = auth.currentUser;
    const email = u?.email;
    if (!u || !email) return;
    setVisiblePref(!!visible);

    // regrava doc completo para respeitar rules (keys().hasOnly)
    const prev = await getMyEntry();
    if (!prev) return;
    const emailHash = await sha256Hex(email);
    const ref = doc(db, COL, emailHash);
    const nowTs = serverTimestamp();

    const d1 = normScoreMap(prev.d1);
    const d2 = normScoreMap(prev.d2);
    const d3 = normScoreMap(prev.d3);

    const payload = {
      emailHash,
      email,
      uid: u.uid,
      name: normName(prev.name),
      sector: normSector(prev.sector),
      visible: !!visible,
      d1, d2, d3,
      overallAvg: computeOverallAvg(d1,d2,d3),
      createdAt: prev.createdAt || nowTs,
      updatedAt: nowTs
    };

    await setDoc(ref, payload, { merge: false });
  }

  function calcAproveitamento(row){
    // Aproveitamento = score / maxScore (quando disponível)
    // fallback: usa score como numerador e considera max=score (100%)
    const score = Number(row?.score ?? 0);
    const max = Number(row?.maxScore ?? score);
    if (!max) return 0;
    return Math.max(0, Math.min(100, Math.round((score / max) * 100)));
  }

  async function fetchTopBy(field, topN=20){
    // Rankings são públicos (rules read true); o app pode filtrar visible==true, mas isso exige índice.
    // Para evitar depender de índice composto, buscamos mais e filtramos client-side.
    const q = query(collection(db, COL), orderBy(field, "desc"), limit(topN));
    const snap = await getDocs(q);
    const rows = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      if (d && d.visible === true) rows.push(d);
    });
    return rows;
  }

  function avatarHTML(entry){
    // Prioridade: photoURL no Auth (não no ranking), ou inicial do nome.
    const name = normName(entry?.name);
    const initial = (name[0] || "?").toUpperCase();
    // Se no futuro você guardar photoURL no ranking (não está nas rules atuais), aqui é o lugar.
    return `<div class="avatar">${initial}</div>`;
  }

  function rowHTML(entry, rank, metricLabel){
    const name = normName(entry?.name);
    const sector = normSector(entry?.sector);
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "";
    const metric = metricLabel(entry);
    return `
      <div class="rank-row">
        <div class="rank-pos">${medal || rank}</div>
        ${avatarHTML(entry)}
        <div class="rank-who">
          <div class="rank-name">${escapeHtml(name)}</div>
          <div class="rank-sector">${escapeHtml(sector)}</div>
        </div>
        <div class="rank-score">${metric}</div>
      </div>
    `;
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
  }

  function renderTabs(active){
    const tabs = [
      { id:"d1", label:"Desafio 1" },
      { id:"d2", label:"Desafio 2" },
      { id:"d3", label:"Desafio 3" },
      { id:"overall", label:"Geral" },
    ];
    return `
      <div class="rank-tabs">
        ${tabs.map(t => `<button class="rank-tab ${t.id===active?'active':''}" data-tab="${t.id}" type="button">${t.label}</button>`).join("")}
      </div>
    `;
  }

  function myCardHTML(me){
    if (!me){
      return `<div class="rank-me muted">Entre com uma conta para ver seu desempenho e aparecer no ranking.</div>`;
    }
    const doneAll = hasAllDone(me.d1, me.d2, me.d3);
    const overall = doneAll ? `${Number(me.overallAvg||0)}` : `<span class="muted">X</span> <span class="rank-help" title="Você só entra no ranking geral após concluir os 3 desafios.">ⓘ</span>`;
    return `
      <div class="rank-me">
        <div class="rank-me-title">Seu desempenho</div>
        <div class="rank-me-grid">
          <div><span class="muted">D1</span><b>${Number(me.d1?.score||0)}</b></div>
          <div><span class="muted">D2</span><b>${Number(me.d2?.score||0)}</b></div>
          <div><span class="muted">D3</span><b>${Number(me.d3?.score||0)}</b></div>
          <div><span class="muted">Geral</span><b>${overall}</b></div>
        </div>
        <div class="rank-vis">
          <span class="muted">Participando do ranking:</span>
          <button class="btn tiny" id="rankToggleVis" type="button">${me.visible ? "Sim" : "Não"}</button>
          <span class="muted">Você pode ocultar seu nome a qualquer momento.</span>
        </div>
      </div>
    `;
  }

  async function renderTabBody(tabId){
    const bodyEl = document.getElementById("rankBody");
    if (!bodyEl) return;
    bodyEl.innerHTML = `<div class="muted">Carregando...</div>`;

    const field = tabId === "d1" ? "d1.score" : tabId === "d2" ? "d2.score" : tabId === "d3" ? "d3.score" : "overallAvg";
    const rows = await fetchTopBy(field, 30);

    const labelFn = (entry) => {
      if (tabId === "d1") return `${Number(entry?.d1?.score||0)}`;
      if (tabId === "d2") return `${Number(entry?.d2?.score||0)}`;
      if (tabId === "d3") return `${Number(entry?.d3?.score||0)}`;
      return `${Number(entry?.overallAvg||0)}`;
    };

    const html = rows.length
      ? rows.map((r, idx) => rowHTML(r, idx+1, labelFn)).join("")
      : `<div class="muted">Ainda não há jogadores visíveis neste ranking.</div>`;

    bodyEl.innerHTML = `<div class="rank-list">${html}</div>`;
  }

  async function open(initialTab="d1"){
    modal?.openModal?.({
      title: "🏆 Ranking",
      bodyHTML: `
        <div class="rank-wrap">
          ${renderTabs(initialTab)}
          <div id="rankMeBox" style="margin-top:10px"></div>
          <div id="rankBody" style="margin-top:10px"></div>
        </div>
      `,
      buttons: [{ label:"Fechar", variant:"ghost", onClick: modal?.closeModal }]
    });

    // Meu card
    const meBox = document.getElementById("rankMeBox");
    let me = null;
    try { me = await getMyEntry(); } catch {}
    if (meBox) meBox.innerHTML = myCardHTML(me);

    // toggle visible
    const tBtn = document.getElementById("rankToggleVis");
    if (tBtn){
      tBtn.addEventListener("click", async () => {
        if (!auth.currentUser) return;
        const next = !(me?.visible === true);
        try{
          await setMyVisibility(next);
          me = await getMyEntry();
          meBox.innerHTML = myCardHTML(me);
        }catch(e){
          console.warn("[ranking] setMyVisibility falhou", e);
        }
      });
    }

    // Tabs
    const tabBtns = Array.from(document.querySelectorAll(".rank-tab"));
    tabBtns.forEach(btn => btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab") || "d1";
      tabBtns.forEach(b => b.classList.toggle("active", b===btn));
      renderTabBody(tab);
    }));

    // Render initial
    renderTabBody(initialTab);
  }

  // API
  const api = {
    open,
    openRanking: open,
    getMyEntry,
    submitChallengeScore: async (ch, data) => {
      try{
        await upsertMyRanking({ ch, score: data?.score, correct: data?.correct, wrong: data?.wrong });
      }catch(e){
        console.warn("[ranking] submitChallengeScore falhou", e);
      }
    },
    setMyVisibility
  };

  try { domBtn?.addEventListener("click", () => api.open()); } catch {}

  app.ranking = api;
  return api;
}
