// js/modules/ranking.js — Ranking V2 (rankingByEmail)
// - Apenas logados salvam (visitante nunca entra no ranking)
// - DocId = sha256(email normalizado) (hex 64)
// - Sem where() para evitar índice composto; filtramos visible no client
// - Compatível com suas rules (rankingByEmail)

export function bootRanking(app){
  const { firebase, dom } = app;

  async function sha256Hex(text){
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const arr = Array.from(new Uint8Array(buf));
    return arr.map(b => b.toString(16).padStart(2,"0")).join("");
  }

  function isOptedOut(){
    return localStorage.getItem("mission_optout_ranking") === "1";
  }

  async function submitChallengeScore(challenge, metrics){
    if (!app.auth?.isLogged?.()) return;

    const u = firebase.auth.currentUser;
    const email = (u?.email || "").trim().toLowerCase();
    if (!email) return;

    const emailHash = await sha256Hex(email);

    const profile = await app.auth.getProfile?.();
    const name = profile?.name || app.user.getUserName?.() || "Usuário";
    const sector = profile?.sector || app.user.getUserSector?.() || "(Sem setor)";

    const score = Number(metrics?.score ?? 0);
    const correct = Number(metrics?.correct ?? 0);
    const wrong = Number(metrics?.wrong ?? 0);

    const ref = firebase.doc(firebase.db, "rankingByEmail", emailHash);

    // carrega existente para calcular média e preservar campos
    const snap = await firebase.getDoc(ref);
    const prev = snap.exists() ? (snap.data() || {}) : {};

    const now = new Date();
    const key = challenge === 1 ? "d1" : (challenge === 2 ? "d2" : "d3");

    // Importante: desafios ainda não jogados NÃO devem ganhar updatedAt “agora”,
    // senão parecem concluídos e quebram elegibilidade do Ranking Geral.
    const empty = { score:-1, correct:0, wrong:0, updatedAt: now };
    const d1 = key === "d1" ? { score, correct, wrong, updatedAt: now } : (prev.d1 ? {score:Number(prev.d1.score||0), correct:Number(prev.d1.correct||0), wrong:Number(prev.d1.wrong||0), updatedAt: prev.d1.updatedAt || now} : empty);
    const d2 = key === "d2" ? { score, correct, wrong, updatedAt: now } : (prev.d2 ? {score:Number(prev.d2.score||0), correct:Number(prev.d2.correct||0), wrong:Number(prev.d2.wrong||0), updatedAt: prev.d2.updatedAt || now} : empty);
    const d3 = key === "d3" ? { score, correct, wrong, updatedAt: now } : (prev.d3 ? {score:Number(prev.d3.score||0), correct:Number(prev.d3.correct||0), wrong:Number(prev.d3.wrong||0), updatedAt: prev.d3.updatedAt || now} : empty);

    const scoresPlayed = [d1,d2,d3].map(d => Math.max(0, Number(d?.score ?? 0)));
    // Ranking Geral: média simples dos 3 desafios (faltante = 0)
    const overallAvg = (scoresPlayed[0] + scoresPlayed[1] + scoresPlayed[2]) / 3;

    const isComplete = [d1,d2,d3].every(d => Number(d?.score ?? -1) >= 0);

    const payload = {
      emailHash,
      email,
      uid: u.uid,
      name: String(name).slice(0,60),
      sector: String(sector).slice(0,120),
      visible: !isOptedOut(),

      d1, d2, d3,
      overallAvg,
      updatedAt: now
    };
    payload.createdAt = (snap.exists() ? (snap.data()?.createdAt || now) : now);

    await firebase.setDoc(ref, payload);
  }

  async function loadTop(){
    const col = firebase.collection(firebase.db, "rankingByEmail");
    const q = firebase.query(col, firebase.orderBy("overallAvg","desc"), firebase.limit(50));
    const snap = await firebase.getDocs(q);
    const rows = [];
    snap.forEach(docu => {
      const d = docu.data() || {};
      if (d.visible === false) return;
      rows.push({
        name: d.name||"",
        email: d.email||"",
        sector: d.sector||"",
        d1: d.d1 || { score:0 },
        d2: d.d2 || { score:0 },
        d3: d.d3 || { score:0 },
        overallAvg: Number(d.overallAvg||0),
        isComplete: (Number(d?.d1?.updatedAt?.seconds||0)>0 && Number(d?.d2?.updatedAt?.seconds||0)>0 && Number(d?.d3?.updatedAt?.seconds||0)>0)
      });
    });
    return rows;
  }

  function escapeAttr(s){ return String(s||"").replace(/"/g,'&quot;'); }

function escapeHtml(s){
    return String(s??"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // API pública usada pelo game-core
  
  async function open(){
    // Modal com "janelinhas" clicáveis (abre detalhes em popup interno)
    app.modal.openModal({
      title: "🏆 Rankings",
      bodyHTML: `
        <div class="rank-tiles">
          <button class="rank-tile" type="button" data-rank="d1" onclick="window.__rankOpen?.('d1')">
            <div class="rt-title">Desafio 1</div>
            <div class="rt-sub muted">Top do Desafio 1</div>
          </button>
          <button class="rank-tile" type="button" data-rank="d2" onclick="window.__rankOpen?.('d2')">
            <div class="rt-title">Desafio 2</div>
            <div class="rt-sub muted">Top do Desafio 2</div>
          </button>
          <button class="rank-tile" type="button" data-rank="d3" onclick="window.__rankOpen?.('d3')">
            <div class="rt-title">Desafio 3</div>
            <div class="rt-sub muted">Top do Desafio 3</div>
          </button>
          <button class="rank-tile" type="button" data-rank="overall" onclick="window.__rankOpen?.('overall')">
            <div class="rt-title">Ranking geral <span class="rank-help" onclick="window.__rankHelp?.(); event.stopPropagation();">❓</span></div>
            <div class="rt-sub muted">Média dos 3 desafios</div>
          </button>
        </div>
        <div class="muted" style="margin-top:10px; font-size:.95em">
          Dica: o <strong>Ranking geral</strong> é calculado pela <strong>média simples</strong> dos 3 desafios. Mostramos também a <strong>% de acertos</strong>.
        </div>
      `,
      actions: [{ label:"Fechar", variant:"primary", onClick: () => app.modal.closeModal?.() }]
    });

    // expõe handlers globais (simples e resiliente em GH Pages)
    window.__rankHelp = () => {
      app.modal.openModal({
        title:"ℹ️ Ranking geral",
        body:`<p>O <strong>Ranking geral</strong> é calculado pela <strong>média simples</strong> dos pontos dos 3 desafios.</p>
              <p>Se você ainda não concluiu os 3, verá um <strong>❌</strong> no lugar do valor no geral.</p>`,
        actions:[{label:"Ok", variant:"primary", onClick: () => app.modal.closeModal?.()}]
      });
    };

    window.__rankOpen = async (kind) => {
      const map = { d1:"Ranking — Desafio 1", d2:"Ranking — Desafio 2", d3:"Ranking — Desafio 3", overall:"Ranking geral" };
      const title = map[kind] || "Ranking";
      app.modal.openModal({
        title,
        bodyHTML: `<div class="muted" id="rankMeta">Carregando...</div><div id="rankTableWrap"></div>`,
        actions:[{label:"Voltar", variant:"ghost", onClick: () => { app.modal.closeModal?.(); open(); } },
                 {label:"Fechar", variant:"primary", onClick: () => app.modal.closeModal?.()}]
      });

      const meta = document.getElementById("rankMeta");
      const wrap = document.getElementById("rankTableWrap");
      try{
        const top = await loadTop(kind === "overall" ? "overall" : kind);
        const my = await getMyEntry();
        // monta tabela
        if (wrap){
          wrap.innerHTML = `<table class="rank-table">
            <thead><tr><th>#</th><th>Jogador</th><th>Setor</th><th style="text-align:right">Pontuação</th></tr></thead>
            <tbody id="rankTBody"></tbody>
          </table>`;
          const getPts = (r) => {
            if (kind === "d1") return r?.d1?.score || 0;
            if (kind === "d2") return r?.d2?.score || 0;
            if (kind === "d3") return r?.d3?.score || 0;
            // overall: média simples (faltante=0)
            const s1 = Number(r?.d1?.score||0);
            const s2 = Number(r?.d2?.score||0);
            const s3 = Number(r?.d3?.score||0);
            return Math.round((s1+s2+s3)/3);
          };
          fillRankTable("rankTBody", top, getPts, kind === "overall");
        }

        if (meta){
          // status do ranking geral (❌ quando incompleto)
          if (kind === "overall" && my && my.isComplete === false){
            meta.innerHTML = `❌ <strong>Você só entra no Ranking geral</strong> ao concluir os 3 desafios.`;
          } else if (my){
            meta.textContent = `Você: ${my.name || "—"} • ${my.sector || "—"}`;
          } else {
            meta.textContent = "—";
          }
        }
      }catch(err){
        console.error("[ranking] erro ao abrir", err);
        if (meta) meta.textContent = "Falha ao carregar ranking.";
      }
    };
  }

  function rankCardHTML(title, bodyId){
    return `<div class="glass" style="padding:10px">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px">
        <div style="font-weight:800">${title}</div>
      </div>
      <div style="overflow:auto; max-height:32vh">
        <table class="rank-table" style="width:100%; border-collapse:collapse">
          <thead>
            <tr>
              <th style="text-align:left; padding:6px 4px">#</th>
              <th style="text-align:left; padding:6px 4px">Jogador</th>
              <th style="text-align:left; padding:6px 4px">Setor</th>
              <th style="text-align:right; padding:6px 4px">Pontos</th>
            </tr>
          </thead>
          <tbody id="${bodyId}">
            <tr><td colspan="4" class="muted" style="padding:10px 4px">Carregando...</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
  }

  function trophy(i){
    if (i===0) return "🥇";
    if (i===1) return "🥈";
    if (i===2) return "🥉";
    return String(i+1);
  }

  function fillRankTable(bodyId, rows, getPoints, isOverall=false){
    const body = document.getElementById(bodyId);
    if (!body) return;
    if (!rows.length){
      body.innerHTML = `<tr><td colspan="4" class="muted" style="padding:10px 4px">Ainda não há resultados.</td></tr>`;
      return;
    }
    body.innerHTML = rows.slice(0,50).map((r,i)=>{
      const pts = Number(getPoints(r)||0);
      const c = Number(r?.d1?.correct||0) + Number(r?.d2?.correct||0) + Number(r?.d3?.correct||0);
      const w = Number(r?.d1?.wrong||0) + Number(r?.d2?.wrong||0) + Number(r?.d3?.wrong||0);
      const acc = (c+w)>0 ? Math.round((c/(c+w))*100) : 0;
      const photoData = (r.photoDataUrl || "").trim();
      const photo = (r.photoURL || "").trim();
      const icon = (r.photoIcon || "").trim();
      const avatar = photoData
        ? `<img src="${escapeAttr(photoData)}" alt="" class="rank-avatar" />`
        : photo
        ? `<img src="${escapeAttr(photo)}" alt="" class="rank-avatar" />`
        : (icon ? `<div class="rank-avatar placeholder">${escapeHtml(icon)}</div>` : `<div class="rank-avatar placeholder">🎄</div>`);
      const badge = trophy(i);
      return `<tr>
        <td style="padding:6px 4px; width:38px">${badge}</td>
        <td style="padding:6px 4px">
          <div style="display:flex; align-items:center; gap:8px">
            ${avatar}
            <div>
              <div style="font-weight:700">${escapeHtml(r.name)}</div>
              <div class="muted" style="font-size:12px">${escapeHtml(r.email || "")}</div>
            </div>
          </div>
        </td>
        <td style="padding:6px 4px">${escapeHtml(r.sector)}</td>
        <td style="padding:6px 4px; text-align:right">${(isOverall && !r.isComplete) ? "❌" : pts.toFixed(0)}<div class="muted" style="font-size:11px; line-height:1.1">${acc}% acertos</div></td>
      </tr>`;
    }).join("");
  }

  async function getMyEntry(){
    try{
      if (!app.auth?.isLogged?.()) return null;
      const u = firebase.auth.currentUser;
      if (!u?.email) return null;
      const email = String(u.email).trim().toLowerCase();
      const emailHash = await sha256Hex(email);
      const ref = firebase.doc(firebase.db, "rankingByEmail", emailHash);
      const snap = await firebase.getDoc(ref);
      return snap.exists() ? snap.data() : null;
    } catch(e){
      console.warn("[ranking] getMyEntry falhou", e);
      return null;
    }
  }

  // compat com versões antigas
  const openRanking = open;

  // botão no topo (se existir)
  dom?.rankingBtn?.addEventListener?.("click", () => open());

  return {
    open,
    openRanking,
    submitChallengeScore,
    loadTop,
    getMyEntry
  };

}