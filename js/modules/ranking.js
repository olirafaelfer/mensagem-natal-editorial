import { fb, firebaseApp } from "../core/firebase.js";

function tsNow(){ return fb.Timestamp.fromDate(new Date()); }

export async function createRanking({ dom, modal, store, auth, show }){
  const db = firebaseApp ? fb.getFirestore(firebaseApp) : null;

  function open(){
    modal.open({
      title: "Ranking",
      html: "<p class=\"muted\">Ranking será exibido aqui (V3). Por enquanto, exibimos o Top 10 geral.</p><div id=\"rkList\"></div>",
      buttons: [{ label:"Ok", variant:"primary", onClick: modal.close }],
      dismissible: true
    });
    setTimeout(renderTop10, 0);
  }

  async function ensureDoc(){
    if (!db || !auth.isLoggedIn() || !auth.emailHash()) return null;
    const emailHash = auth.emailHash();
    const ref = fb.doc(db, "rankingByEmail", emailHash);
    const snap = await fb.getDoc(ref);
    if (snap.exists()) return ref;

    const base = {
      emailHash,
      email: auth.email() || "",
      uid: auth.uid() || "",
      name: auth.getName(),
      sector: auth.getSector(),
      visible: auth.isVisible(),
      d1: { score:0, correct:0, wrong:0, updatedAt: tsNow() },
      d2: { score:0, correct:0, wrong:0, updatedAt: tsNow() },
      d3: { score:0, correct:0, wrong:0, updatedAt: tsNow() },
      overallAvg: 0,
      createdAt: tsNow(),
      updatedAt: tsNow()
    };
    await fb.setDoc(ref, base);
    return ref;
  }

  function computeOverall(d1,d2,d3){
    return (d1.score + d2.score + d3.score) / 3;
  }

  async function submitChallengeScore(ch, { score, correct, wrong }){
    if (!db) return;
    if (!auth.isLoggedIn()){
      // visitante não escreve ranking
      return;
    }
    if (!auth.emailHash()){
      modal.open({ title:"Ranking", html:"<p>Não foi possível identificar o e-mail para o ranking.</p>", dismissible:true });
      return;
    }
    const ref = await ensureDoc();
    const snap = await fb.getDoc(ref);
    const cur = snap.data();

    const key = ch===1?"d1": ch===2?"d2":"d3";
    const next = {
      ...cur,
      name: auth.getName(),
      sector: auth.getSector(),
      visible: auth.isVisible(),
      [key]: { score, correct, wrong, updatedAt: tsNow() },
      updatedAt: tsNow()
    };
    next.overallAvg = computeOverall(next.d1, next.d2, next.d3);
    await fb.setDoc(ref, next);
  }

  async function renderTop10(){
    const list = document.getElementById("rkList");
    if (!list) return;
    if (!db){
      list.innerHTML = "<p class='muted'>Firebase não inicializado.</p>";
      return;
    }
    const q = fb.query(
      fb.collection(db, "rankingByEmail"),
      fb.where("visible", "==", true),
      fb.orderBy("overallAvg", "desc"),
      fb.limit(10)
    );
    const snap = await fb.getDocs(q);
    const items = [];
    snap.forEach(doc => items.push(doc.data()));
    if (!items.length){
      list.innerHTML = "<p class='muted'>Ainda não há pontuações.</p>";
      return;
    }
    list.innerHTML = items.map((x,i)=>`
      <div class="fix-item">
        <div><b>#${i+1} ${x.name}</b> <span class="muted">(${x.sector})</span></div>
        <div class="muted tiny">Média: ${Math.round(x.overallAvg)}</div>
      </div>
    `).join("");
  }

  dom.top.btnRanking?.addEventListener("click", open);
  dom.final.btnOpenRanking?.addEventListener("click", open);

  return { open, submitChallengeScore };
}