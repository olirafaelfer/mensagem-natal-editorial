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

    const d1 = key === "d1" ? { score, correct, wrong, updatedAt: now } : (prev.d1 || { score:0, correct:0, wrong:0, updatedAt: now });
    const d2 = key === "d2" ? { score, correct, wrong, updatedAt: now } : (prev.d2 || { score:0, correct:0, wrong:0, updatedAt: now });
    const d3 = key === "d3" ? { score, correct, wrong, updatedAt: now } : (prev.d3 || { score:0, correct:0, wrong:0, updatedAt: now });

    const scores = [Number(d1.score||0), Number(d2.score||0), Number(d3.score||0)];
    const completed = scores.filter(s => s > 0);
    const overallAvg = completed.length ? (completed.reduce((a,b)=>a+b,0) / completed.length) : 0;

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
    if (!snap.exists()) payload.createdAt = now;

    await firebase.setDoc(ref, payload, { merge: true });
  }

  async function loadTop(){
    if (!dom.rankingBody) return;
    const col = firebase.collection(firebase.db, "rankingByEmail");
    // Sem where visible==true (evita índice composto); filtra no client
    const q = firebase.query(col, firebase.orderBy("overallAvg","desc"), firebase.limit(50));
    const snap = await firebase.getDocs(q);

    const rows = [];
    snap.forEach(docSnap => {
      const d = docSnap.data() || {};
      if (d.visible === false) return;
      rows.push(d);
    });

    render(rows);
  }

  function render(rows){
    if (!dom.rankingBody) return;
    dom.rankingBody.innerHTML = "";

    const me = firebase.auth.currentUser;
    const myEmail = (me?.email || "").trim().toLowerCase();

    rows.forEach((r, idx) => {
      const tr = document.createElement("tr");
      const isMe = myEmail && r.email && String(r.email).trim().toLowerCase() === myEmail;
      if (isMe) tr.classList.add("me");

      tr.innerHTML = `
        <td class="rankpos">${idx+1}</td>
        <td class="rankname">${escapeHtml(r.name||"")}</td>
        <td class="ranksector">${escapeHtml(r.sector||"")}</td>
        <td class="rankscore">${Number(r.overallAvg||0).toFixed(0)}</td>
      `;
      dom.rankingBody.appendChild(tr);
    });
  }

  function escapeHtml(s){
    return String(s??"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // API pública usada pelo game-core
  return {
    submitChallengeScore,
    loadTop
  };
}
