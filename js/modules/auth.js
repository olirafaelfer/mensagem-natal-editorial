import { fb, firebaseApp } from "../core/firebase.js";

function nowTs(){
  return new Date();
}

export async function createAuth({ dom, modal, store, show }){
  const state = () => store.load();

  const auth = firebaseApp ? fb.getAuth(firebaseApp) : null;
  const db = firebaseApp ? fb.getFirestore(firebaseApp) : null;

  async function sha256hex(input){
    const data = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,"0")).join("");
  }

  async function loadProfile(uid){
    if (!db) return null;
    const ref = fb.doc(db, "users", uid);
    const snap = await fb.getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  async function upsertProfile({ uid, email, name, sector }){
    const ref = fb.doc(db, "users", uid);
    const snap = await fb.getDoc(ref);
    const base = {
      uid, email,
      name: name.trim(),
      sector: sector.trim(),
      updatedAt: fb.Timestamp.fromDate(nowTs()),
    };
    if (!snap.exists()){
      base.createdAt = fb.Timestamp.fromDate(nowTs());
      await fb.setDoc(ref, base);
    }else{
      const cur = snap.data();
      await fb.setDoc(ref, { ...cur, ...base, createdAt: cur.createdAt || fb.Timestamp.fromDate(nowTs()) });
    }
  }

  function getIdentity(){
    const s = state();
    return {
      uid: s.uid || null,
      email: s.email || null,
      loggedIn: !!s.uid,
      name: s.visitorName || "",
      sector: s.visitorSector || "",
      visible: s.visible !== false
    };
  }

  function setIdentity({ name, sector, visible }){
    return store.patch({
      visitorName: (name||"").trim(),
      visitorSector: (sector||"").trim(),
      visible: visible !== false
    });
  }

  function requireGate(){
    const name = dom.gate.name.value.trim();
    const sector = dom.gate.sector.value.trim();
    if (name.length < 2){
      modal.open({ title:"Nome obrigatório", html:"<p>Informe seu nome para continuar.</p>", buttons:[{label:"Ok", variant:"primary", onClick: modal.close}] , dismissible:true});
      return false;
    }
    if (sector.length < 2){
      modal.open({ title:"Setor obrigatório", html:"<p>Selecione seu setor para continuar.</p>", buttons:[{label:"Ok", variant:"primary", onClick: modal.close}] , dismissible:true});
      return false;
    }
    setIdentity({ name, sector, visible: dom.gate.visible.checked });
    return true;
  }

  async function ensureProfileIfLogged(){
    const s = state();
    if (!s.uid || !db) return;
    const name = dom.gate.name.value.trim();
    const sector = dom.gate.sector.value.trim();
    if (name.length >= 2 && sector.length >= 2){
      await upsertProfile({ uid: s.uid, email: s.email || "", name, sector });
    }
  }

  function openAuthModal(){
    const html = `
      <div class="grid2">
        <div>
          <label>Email</label>
          <input id="authEmail" type="email" placeholder="seu@email.com" autocomplete="email"/>
        </div>
        <div>
          <label>Senha</label>
          <input id="authPass" type="password" placeholder="••••••" autocomplete="current-password"/>
        </div>
      </div>
      <p class="muted tiny" style="margin-top:10px">Login por e-mail/senha (Firebase Auth).</p>
    `;
    modal.open({
      title: "Entrar",
      html,
      buttons: [
        { label: "Cancelar", onClick: modal.close },
        { label: "Criar conta", onClick: async () => {
            const email = document.getElementById("authEmail").value.trim();
            const pass = document.getElementById("authPass").value;
            try{
              await fb.createUserWithEmailAndPassword(auth, email, pass);
              modal.close();
            }catch(e){
              modal.open({ title:"Erro", html:`<p>${String(e.message||e)}</p>`, dismissible:true });
            }
          }
        },
        { label: "Entrar", variant:"primary", onClick: async () => {
            const email = document.getElementById("authEmail").value.trim();
            const pass = document.getElementById("authPass").value;
            try{
              await fb.signInWithEmailAndPassword(auth, email, pass);
              modal.close();
            }catch(e){
              modal.open({ title:"Erro", html:`<p>${String(e.message||e)}</p>`, dismissible:true });
            }
          }
        }
      ],
      dismissible: true
    });
  }

  async function bindAuth(){
    if (!auth) return;

    fb.onAuthStateChanged(auth, async (user) => {
      if (!user){
        store.patch({ uid:null, email:null, emailHash:null });
        return;
      }
      const email = user.email || "";
      const emailHash = email ? await sha256hex(email.trim().toLowerCase()) : null;
      store.patch({ uid: user.uid, email, emailHash });

      // carregar perfil
      const prof = await loadProfile(user.uid);
      if (prof?.name) dom.gate.name.value = prof.name;
      if (prof?.sector) dom.gate.sector.value = prof.sector;

      // sincronizar identidade local
      setIdentity({ name: dom.gate.name.value, sector: dom.gate.sector.value, visible: dom.gate.visible.checked });
    });
  }

  // top profile: login / logout
  dom.top.btnProfile?.addEventListener("click", async () => {
    const s = state();
    if (!auth){
      modal.open({ title:"Firebase", html:"<p>Firebase não inicializado (config ausente).</p>", dismissible:true });
      return;
    }
    if (s.uid){
      modal.open({
        title:"Conta",
        html:`<p class="muted">Logado como <b>${s.email||"(sem email)"}</b></p>`,
        buttons:[
          { label:"Fechar", onClick: modal.close },
          { label:"Sair", variant:"primary", onClick: async ()=>{ await fb.signOut(auth); modal.close(); } }
        ],
        dismissible:true
      });
      return;
    }
    openAuthModal();
  });

  // gate continue: valida + se logado grava perfil
  dom.gate.cont.addEventListener("click", async () => {
    if (!requireGate()) return;
    await ensureProfileIfLogged();
  });

  await bindAuth();

  return {
    isLoggedIn(){ return !!state().uid; },
    uid(){ return state().uid; },
    email(){ return state().email; },
    emailHash(){ return state().emailHash; },
    getName(){ return state().visitorName || ""; },
    getSector(){ return state().visitorSector || ""; },
    isVisible(){ return state().visible !== false; },
    requireGate
  };
}