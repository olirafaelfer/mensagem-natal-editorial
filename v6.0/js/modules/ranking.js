// js/modules/ranking.js — Ranking V2 (rankingByEmail)
// - leitura pública (visible==true)
// - gravação só para logados (rules)
// - avatar: string opcional guardada no doc:
//    * dataURL pequeno (upload comprimido) OU
//    * emoji (ex: 🎅) OU
//    * "icon:<id>" (opcional)
//
// Requer que Firestore rules permitam o campo opcional 'avatar' (string).

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

export function bootRanking(app){
  const db = getFirestore(app.firebaseApp);
  const colRef = collection(db, "rankingByEmail");

  function esc(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }

  function isDataUrl(x){ return typeof x === "string" && x.startsWith("data:image/"); }
  function isIconToken(x){ return typeof x === "string" && x.startsWith("icon:"); }
  function isEmoji(x){ return typeof x === "string" && x.length > 0 && x.length <= 4 && !x.includes(" "); }

  function renderAvatar(entry){
    const name = entry?.name || "";
    const avatar = entry?.avatar || "";
    if (isDataUrl(avatar)){
      return `<img class="avatar" src="${avatar}" alt="${esc(name)}"/>`;
    }
    if (isEmoji(avatar)){
      return `<div class="avatar avatar-emoji" aria-label="avatar">${esc(avatar)}</div>`;
    }
    if (isIconToken(avatar)){
      const id = avatar.slice(5);
      const map = { tree:"🎄", santa:"🎅", gift:"🎁", star:"⭐", bell:"🔔", snow:"❄️", book:"📚" };
      const emo = map[id] || "🙂";
      return `<div class="avatar avatar-emoji" aria-label="${esc(id)}">${emo}</div>`;
    }
    const initial = (name.trim()[0] || "?").toUpperCase();
    return `<div class="avatar avatar-initial">${esc(initial)}</div>`;
  }

  async function getMyEntry(){
    const u = app.auth?.getUser?.();
    if (!u?.email) return null;
    const email = (u.email || "").trim().toLowerCase();
    const emailHash = await app.user?.getEmailHash?.(email);
    if (!emailHash) return null;
    const ref = doc(db, "rankingByEmail", emailHash);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  function computeOverallAvg(d1,d2,d3){
    if (Number(d1?.score ?? -1) < 0 || Number(d2?.score ?? -1) < 0 || Number(d3?.score ?? -1) < 0) return -1;
    const s1 = Number(d1?.score ?? 0);
    const s2 = Number(d2?.score ?? 0);
    const s3 = Number(d3?.score ?? 0);
    return Math.round((s1+s2+s3)/3);
  }

  async function upsertMyDoc(patch){
    const u = app.auth?.getUser?.();
    if (!u?.email) throw new Error("Sem usuário logado com e-mail");
    const email = (u.email || "").trim().toLowerCase();
    const emailHash = await app.user?.getEmailHash?.(email);
    if (!emailHash) throw new Error("Falha ao gerar emailHash");

    const ref = doc(db, "rankingByEmail", emailHash);
    const now = serverTimestamp();

    let base = null;
    try{
      const snap = await getDoc(ref);
      base = snap.exists() ? snap.data() : null;
    }catch{}

    const docData = {
      emailHash,
      email,
      uid: u.uid || "",
      name: app.user?.getUserName?.() || base?.name || "Jogador",
      sector: app.user?.getUserSector?.() || base?.sector || "Setor",
      visible: (typeof base?.visible === "boolean") ? base.visible : true,
      avatar: base?.avatar || "",
      d1: base?.d1 || { score:-1, correct:0, wrong:0, updatedAt: now },
      d2: base?.d2 || { score:-1, correct:0, wrong:0, updatedAt: now },
      d3: base?.d3 || { score:-1, correct:0, wrong:0, updatedAt: now },
      overallAvg: base?.overallAvg ?? -1,
      createdAt: base?.createdAt || now,
      updatedAt: now,
      ...patch,
    };

    docData.overallAvg = computeOverallAvg(docData.d1, docData.d2, docData.d3);
    await setDoc(ref, docData, { merge: false });
    return docData;
  }

  async function submitChallengeScore(ch, payload){
    if (!app.auth?.isLogged?.()) return;
    const key = "d"+ch;
    const now = serverTimestamp();
    const score = Math.max(0, Number(payload?.score ?? payload?.s ?? 0));
    const correct = Math.max(0, Number(payload?.correct ?? payload?.c ?? 0));
    const wrong = Math.max(0, Number(payload?.wrong ?? payload?.w ?? 0));
    const patch = {};
    patch[key] = { score, correct, wrong, updatedAt: now };
    await upsertMyDoc(patch);
  }

  async function setMyAvatar(avatar){
    if (!app.auth?.isLogged?.()) {
      try{ localStorage.setItem("guestAvatar", avatar || ""); }catch{}
      return;
    }
    if (typeof avatar === "string" && avatar.startsWith("data:image/") && avatar.length > 200000){
      throw new Error("Avatar muito grande. Use uma imagem menor.");
    }
    await upsertMyDoc({ avatar: avatar || "" });
  }

  async function fetchTop(kind, max=50){
    let qref;
    if (kind === "overall"){
      qref = query(colRef, where("visible","==",true), where("overallAvg",">=",0), orderBy("overallAvg","desc"), limit(max));
    }else{
      qref = query(colRef, where("visible","==",true), orderBy(`${kind}.score`,"desc"), limit(max));
    }
    const snap = await getDocs(qref);
    return snap.docs.map(d => d.data());
  }

  function renderTable(rows, kind){
    const isOverall = kind === "overall";
    return `
      <div class="rank-table">
        ${rows.map((r, i)=>{
          const pos = i+1;
          const score = isOverall ? Number(r.overallAvg ?? 0) : Number(r?.[kind]?.score ?? 0);
          const trophy = pos===1?"🏆":pos===2?"🥈":pos===3?"🥉":"";
          return `
            <div class="rank-row">
              <div class="rank-pos">${pos} ${trophy}</div>
              <div class="rank-who">
                ${renderAvatar(r)}
                <div class="rank-meta">
                  <div class="rank-name">${esc(r.name || "Jogador")}</div>
                  <div class="rank-sector">${esc(r.sector || "")}</div>
                </div>
              </div>
              <div class="rank-score">${score}</div>
            </div>`;
        }).join("")}
      </div>`;
  }

  async function open(){
    const body = `
      <div class="rank-tiles">
        <button class="rank-tile" data-kind="d1">Desafio 1</button>
        <button class="rank-tile" data-kind="d2">Desafio 2</button>
        <button class="rank-tile" data-kind="d3">Desafio 3</button>
        <button class="rank-tile" data-kind="overall">Ranking geral <span class="rank-help" title="A média simples dos 3 desafios. Só aparece quando o usuário conclui os 3.">?</span></button>
      </div>
      <div id="rankBody" style="margin-top:12px">Carregando...</div>
      <div class="rank-footer" style="margin-top:12px">
        <button class="btn" id="rankRefreshBtn">Atualizar</button>
      </div>
    `;
    app.ui?.openModal?.({ title:"Ranking", bodyHTML: body, size:"lg" });

    const modal = document.getElementById("modalBody");
    const rankBody = document.getElementById("rankBody");

    let currentKind = "overall";

    async function load(){
      if (!rankBody) return;
      rankBody.innerHTML = "Carregando...";
      try{
        const kind = currentKind === "overall" ? "overall" : currentKind;
        const rows = await fetchTop(kind === "overall" ? "overall" : kind);
        rankBody.innerHTML = renderTable(rows, kind === "overall" ? "overall" : kind);
      }catch(e){
        console.warn("[ranking] falha ao carregar", e);
        rankBody.innerHTML = `<div class="muted">Falha ao carregar ranking.</div>`;
      }
    }

    await load();

    modal?.addEventListener("click", (ev)=>{
      const btn = ev.target.closest?.(".rank-tile");
      if (btn){
        currentKind = btn.dataset.kind || "overall";
        load();
      }
      if (ev.target?.id === "rankRefreshBtn") load();
    }, { once:false });
  }

  app.ranking = {
    open,
    submitChallengeScore,
    setMyAvatar,
    getMyEntry,
  };
}
