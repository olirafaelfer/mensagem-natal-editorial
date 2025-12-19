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

    const now = firebase.serverTimestamp();
    const key = challenge === 1 ? "d1" : (challenge === 2 ? "d2" : "d3");

    // Importante: desafios ainda não jogados NÃO devem ganhar updatedAt “agora”,
    // senão parecem concluídos e quebram elegibilidade do Ranking Geral.
    const empty = { score:0, correct:0, wrong:0, updatedAt: null };
    const d1 = key === "d1" ? { score, correct, wrong, updatedAt: now } : (prev.d1 || empty);
    const d2 = key === "d2" ? { score, correct, wrong, updatedAt: now } : (prev.d2 || empty);
    const d3 = key === "d3" ? { score, correct, wrong, updatedAt: now } : (prev.d3 || empty);

    const scores = [Number(d1.score||0), Number(d2.score||0), Number(d3.score||0)];
    // Ranking Geral: média dos 3 desafios (faltante = 0)
    const overallAvg = scores.reduce((a,b)=>a+b,0) / 3;

    const isComplete = !!(d1.updatedAt && d2.updatedAt && d3.updatedAt);

    const payload = {
      emailHash,
      email,
      uid: u.uid,
      photoURL: u.photoURL || "",
      name: String(name).slice(0,60),
      sector: String(sector).slice(0,120),
      visible: !isOptedOut(),

      d1, d2, d3,
      overallAvg,
      isComplete,

      updatedAt: now
    };
    if (!snap.exists()) payload.createdAt = now;

    await firebase.setDoc(ref, payload, { merge: true });
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
        photoURL: d.photoURL||"",
        d1: d.d1 || { score:0 },
        d2: d.d2 || { score:0 },
        d3: d.d3 || { score:0 },
        overallAvg: Number(d.overallAvg||0),
        isComplete: !!d.isComplete
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
    // Modal com “janelinhas” separadas: D1, D2, D3 e Ranking Geral
    app.modal.openModal({
      title: "🏆 Rankings",
      bodyHTML: `<div class="rank-wrap">
        <div id="rankMeta" class="muted" style="margin-bottom:10px">Carregando...</div>

        <div class="rank-cards" style="display:grid; gap:10px">
          ${rankCardHTML("Ranking Desafio 1","rankBodyD1")}
          ${rankCardHTML("Ranking Desafio 2","rankBodyD2")}
          ${rankCardHTML("Ranking Desafio 3","rankBodyD3")}
          ${rankCardHTML("Ranking geral <span class=\"rank-help\" title=\"Calculado pela média dos 3 desafios.\">❔</span>","rankBodyAll")}
        </div>
      </div>`,
      buttons: [{ label:"Fechar", variant:"ghost", onClick: app.modal.closeModal }]
    });

    try{
      const rows = await loadTop();

      const meta = document.getElementById("rankMeta");
      const my = await getMyEntry();
      const eligible = !!(my?.isComplete);
      if (meta){
        meta.innerHTML = eligible
          ? `Você já concluiu os 3 desafios ✅ — participa do <strong>Ranking geral</strong>.`
          : `Você ainda não concluiu os 3 desafios. <span id="rankWhy" style="cursor:pointer; text-decoration:underline">❌</span>`;
        const why = document.getElementById("rankWhy");
        if (why){
          why.addEventListener("click", () => {
            app.modal.openModal({
              title: "Ranking geral",
              bodyHTML: `<p>O <strong>Ranking geral</strong> é calculado pela <strong>média dos 3 desafios</strong>.</p>
                        <p class="muted" style="margin-top:8px">Você só entra no Ranking geral após concluir os 3.</p>`,
              buttons: [{ label:"Entendi", onClick: app.modal.closeModal }]
            });
          });
        }
      }

      // ordenações
      const byD1 = [...rows].sort((a,b)=>Number(b.d1?.score||0)-Number(a.d1?.score||0));
      const byD2 = [...rows].sort((a,b)=>Number(b.d2?.score||0)-Number(a.d2?.score||0));
      const byD3 = [...rows].sort((a,b)=>Number(b.d3?.score||0)-Number(a.d3?.score||0));
      const byAll = [...rows].filter(r=>r.isComplete).sort((a,b)=>Number(b.overallAvg||0)-Number(a.overallAvg||0));

      fillRankTable("rankBodyD1", byD1, (r)=>Number(r.d1?.score||0));
      fillRankTable("rankBodyD2", byD2, (r)=>Number(r.d2?.score||0));
      fillRankTable("rankBodyD3", byD3, (r)=>Number(r.d3?.score||0));
      fillRankTable("rankBodyAll", byAll, (r)=>Number(r.overallAvg||0), true);
    } catch(e){
      ["rankBodyD1","rankBodyD2","rankBodyD3","rankBodyAll"].forEach(id=>{
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<tr><td colspan="4" class="muted" style="padding:10px 4px">Erro ao carregar.</td></tr>`;
      });
      console.error(e);
    }
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