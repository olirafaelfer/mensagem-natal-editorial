// admin/admin.js — console simples p/ reset
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore,
  collection, getDocs, query, orderBy, limit,
  doc, deleteDoc, writeBatch, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// ⚠️ Console básico (você pediu sem segurança “de verdade”)
// Por trás, usamos um usuário do Firebase Auth (Email/Senha) para passar pelas rules.
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "canada1996";
const ADMIN_EMAIL = "admin@missao-natal.local";

// Copiado do js/main.js
const firebaseConfig = {
  apiKey: "AIzaSyD_-M7m1R2-FKzOHg356vb_IN7bPb6hqJM",
  authDomain: "missao-natal-ranking.firebaseapp.com",
  projectId: "missao-natal-ranking",
  storageBucket: "missao-natal-ranking.appspot.com",
  messagingSenderId: "175157868358",
  appId: "1:175157868358:web:690742496c05983d1c1747"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id)=>document.getElementById(id);

function setStatus(el, msg){
  if (!el) return;
  el.textContent = msg || "";
}

async function deleteAllDocsInCollection(collRef, batchSize=350){
  // apaga em batches para não estourar limite
  while (true){
    const q = query(collRef, orderBy("createdAt","desc"), limit(batchSize));
    const snap = await getDocs(q);
    if (snap.empty) break;

    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

async function clearChatGlobal(){
  const messagesRef = collection(db, "chatRooms", "global", "messages");

  while (true){
    const q = query(messagesRef, orderBy("createdAt","desc"), limit(200));
    const snap = await getDocs(q);
    if (snap.empty) break;

    // Apaga reactions e mensagens em batches
    // Fazemos 1 batch por “página” para simplificar.
    const batch = writeBatch(db);

    for (const msgDoc of snap.docs){
      // apagar subcoleção reactions/{uid}
      const reactionsRef = collection(db, "chatRooms", "global", "messages", msgDoc.id, "reactions");
      const rs = await getDocs(query(reactionsRef, limit(500)));
      rs.docs.forEach(r => batch.delete(r.ref));

      // apagar a própria mensagem
      batch.delete(msgDoc.ref);
    }
    await batch.commit();
  }
}

async function clearRanking(){
  // rankingByEmail
  await deleteAllDocsInCollection(collection(db, "rankingByEmail"), 350);

  // individualRanking
  await deleteAllDocsInCollection(collection(db, "individualRanking"), 350);

  // sectorStats
  await deleteAllDocsInCollection(collection(db, "sectorStats"), 350);
}

async function bumpResetEpoch(){
  // marcador que o app lê e, se mudou, limpa o localStorage de progresso
  const ref = doc(db, "appConfig", "global");
  await setDoc(ref, { resetEpoch: serverTimestamp() }, { merge: true });
}

function confirmDanger(label){
  return window.confirm(`Confirmar: ${label}\n\n⚠️ Isso é destrutivo e não tem desfazer.`);
}

async function requireLogin(){
  const user = auth.currentUser;
  if (!user) throw new Error("Você não está autenticado no Firebase.");
  const email = user.email || "";
  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()){
    throw new Error("Você está autenticado, mas NÃO como admin@missao-natal.local.");
  }
}

function wire(){
  const loginCard = $("loginCard");
  const actionsCard = $("actionsCard");
  const loginStatus = $("loginStatus");
  const actionStatus = $("actionStatus");

  $("btnLogin")?.addEventListener("click", async ()=>{
    setStatus(loginStatus,"");
    const u = ($("admUser")?.value || "").trim();
    const p = ($("admPass")?.value || "");
    if (u !== ADMIN_USERNAME || p !== ADMIN_PASSWORD){
      setStatus(loginStatus, "Usuário/senha inválidos.");
      return;
    }
    try{
      setStatus(loginStatus, "Entrando no Firebase...");
      await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      setStatus(loginStatus, "OK. Logado.");
    }catch(e){
      console.error(e);
      setStatus(loginStatus,
        "Falha no Firebase Auth.\n" +
        "➡️ Confirme se Email/Senha está habilitado no Firebase e se existe o usuário admin@missao-natal.local com a senha canada1996.\n\n" +
        (e?.message || String(e))
      );
    }
  });

  $("btnClearChat")?.addEventListener("click", async ()=>{
    setStatus(actionStatus,"");
    if (!confirmDanger("Apagar TODO o chat")) return;
    try{
      await requireLogin();
      setStatus(actionStatus, "Apagando chat...");
      await clearChatGlobal();
      setStatus(actionStatus, "✅ Chat apagado.");
    }catch(e){
      console.error(e);
      setStatus(actionStatus, "❌ Falha ao apagar chat:\n" + (e?.message || String(e)));
    }
  });

  $("btnClearRanking")?.addEventListener("click", async ()=>{
    setStatus(actionStatus,"");
    if (!confirmDanger("Apagar TODO o ranking")) return;
    try{
      await requireLogin();
      setStatus(actionStatus, "Apagando ranking...");
      await clearRanking();
      setStatus(actionStatus, "✅ Ranking apagado.");
    }catch(e){
      console.error(e);
      setStatus(actionStatus, "❌ Falha ao apagar ranking:\n" + (e?.message || String(e)));
    }
  });

  $("btnResetProgress")?.addEventListener("click", async ()=>{
    setStatus(actionStatus,"");
    if (!confirmDanger("Forçar reset de progresso (localStorage)")) return;
    try{
      await requireLogin();
      setStatus(actionStatus, "Publicando resetEpoch...");
      await bumpResetEpoch();
      setStatus(actionStatus, "✅ Reset de progresso publicado. (Usuários zeram no próximo carregamento)");
    }catch(e){
      console.error(e);
      setStatus(actionStatus, "❌ Falha ao publicar reset:\n" + (e?.message || String(e)));
    }
  });

  $("btnNuke")?.addEventListener("click", async ()=>{
    setStatus(actionStatus,"");
    if (!confirmDanger("RESET TOTAL (chat + ranking + progresso)")) return;
    try{
      await requireLogin();
      setStatus(actionStatus, "Reset total: apagando chat...");
      await clearChatGlobal();
      setStatus(actionStatus, "Reset total: apagando ranking...");
      await clearRanking();
      setStatus(actionStatus, "Reset total: publicando resetEpoch...");
      await bumpResetEpoch();
      setStatus(actionStatus, "✅ RESET TOTAL concluído.");
    }catch(e){
      console.error(e);
      setStatus(actionStatus, "❌ Falha no reset total:\n" + (e?.message || String(e)));
    }
  });

  onAuthStateChanged(auth, (user)=>{
    const ok = !!user;
    if (ok){
      loginCard?.classList.add("hidden");
      actionsCard?.classList.remove("hidden");
    }else{
      loginCard?.classList.remove("hidden");
      actionsCard?.classList.add("hidden");
    }
  });
}

wire();
