import { APP_VERSION } from "./config/version.js";

// js/main.js — BOOTSTRAP (módulos + Firebase) — versão refatorada em pastas
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
// (v8.2) Sem Firebase Storage: avatar é salvo como dataURL (base64) no Firestore.
import {
  getFirestore,
  doc, getDoc, runTransaction, serverTimestamp,
  collection, getDocs, setDoc,
  query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";


// App factory (DOM + helpers)
// App factory (DOM + helpers) — carregamento robusto (import ESM + fallback global)
let createAppFn = null;
try { ({ createApp: createAppFn } = await import("./app/app.js")); } catch (e) {
  console.warn("⚠️ Falha ao importar ./app/app.js (ESM). Tentando fallback global window.createApp", e);
  createAppFn = window.createApp;
}

import { bootSnow } from "./ui/snow.js";
// =========================
// THEME PRESETS + CONSTANTS
// =========================
const THEME_PRESETS = {
  classic: { name:"Clássico", accent:"#e53935", bg:"#0b1020" },
  candy:   { name:"Candy Cane", accent:"#ff2e63", bg:"#140a12" },
  neon:    { name:"Neon Noel", accent:"#00ffd5", bg:"#001016" },
  aurora:  { name:"Aurora", accent:"#7c4dff", bg:"#071022" },
  gold:    { name:"Dourado", accent:"#ffcc00", bg:"#140f02" },
};

const SECTORS = [
  "Selecione…",
  "Produção (CTP, PCP, Offset, Acabamento...)",
  "Administrativo (CTB, Fin, Adm...)",
  "Editorial",
  "Serviços gerais (Manutenção, Xerox, Portaria...)",
  "Outros..."
];

const SCORE_RULES = {
  correct: +5,
  wrong: -3,
  skip: -5,
  hint: -1,
  auto: -2
};

// =========================
// Firebase config
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyD_-M7m1R2-FKzOHg356vb_IN7bPb6hqJM",
  authDomain: "missao-natal-ranking.firebaseapp.com",
  projectId: "missao-natal-ranking",
  // ✅ IMPORTANTE: storageBucket deve ser <project-id>.appspot.com (não *.firebasestorage.app)
  storageBucket: "missao-natal-ranking.appspot.com",
  messagingSenderId: "175157868358",
  appId: "1:175157868358:web:690742496c05983d1c1747"
};

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
const auth = getAuth(fbApp);
// const storage = getStorage(fbApp);


// helpers exportáveis p/ módulos legados (auth/ranking/admin)
const firebase = {
  db, auth,

  doc, getDoc, runTransaction, serverTimestamp,
  collection, getDocs, setDoc,
  query, orderBy, limit,
  // legado: alguns módulos antigos referenciam fb.fs
  fs: { db, auth, doc, getDoc, runTransaction, serverTimestamp, collection, getDocs, setDoc, query, orderBy, limit }
};

// =========================
// Cria app e faz boot
// =========================
const app = (createAppFn ?? window.createApp)({ firebase, THEME_PRESETS, SECTORS, SCORE_RULES });
  app.populateSectors?.();
  bootSnow(app);
// versão no rodapé
const vEl = document.getElementById("appVersion");
if (vEl) vEl.textContent = APP_VERSION;


function pickBoot(mod, candidates){
  if (!mod) return null;
  for (const k of candidates){
    if (typeof mod[k] === "function") return mod[k];
  }
  if (typeof mod.default === "function") return mod.default;
  if (mod.default && typeof mod.default === "object"){
    for (const k of candidates){
      if (typeof mod.default[k] === "function") return mod.default[k];
    }
  }
  return null;
}

async function safeImport(path, name){
  // Usa a versão como cache-buster para evitar que o browser prenda assets antigos
  try { return await import(`${path}?v=${encodeURIComponent(APP_VERSION)}`); }
  catch (e){
    console.error(`❌ Falha ao importar ${name} (${path}):`, e);
    throw e;
  }
}

async function safeImportOptional(path, name){
  try { return await import(`${path}?v=${encodeURIComponent(APP_VERSION)}`); }
  catch (e){
    console.warn(`⚠️ Módulo opcional não carregado: ${name} (${path})`, e);
    return null;
  }
}

/* =========================================================
   ✅ Welcome Gate (somente visitantes)
   - Mostra modal de boas-vindas com CTA de login/cadastro
   - NÃO aparece se estiver logado
   - Só uma vez por sessão
   ========================================================= */
function showWelcomeGateIfNeeded(){
  // Só para visitantes (não logados)
  try {
    if (app?.auth?.isLogged?.()) return;
  } catch {}

  // Evita repetir na mesma sessão
  try {
    if (sessionStorage.getItem("welcome_gate_seen") === "1") return;
    sessionStorage.setItem("welcome_gate_seen", "1");
  } catch {}

  // Evita duplicar
  if (document.getElementById("welcomeGateOverlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "welcomeGateOverlay";
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(0,0,0,.62);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    z-index: 999999;
  `;

  const card = document.createElement("div");
  card.style.cssText = `
    width: min(560px, 100%);
    background: rgba(14,18,28,.96);
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 18px;
    padding: 16px 16px 14px;
    box-shadow: 0 18px 50px rgba(0,0,0,.45);
    color: #fff;
    backdrop-filter: blur(10px);
  `;

  card.innerHTML = `
    <div style="font-weight:900; font-size:18px; margin-bottom:10px;">🎄 Bem-vindo ao nosso cartão de natal interativo!</div>

    <div style="line-height:1.45; font-size:14px; opacity:.95;">
      <p style="margin:0 0 10px;"><b>Ajude o Noel</b> com a missão de corrigir os textos natalinos antes que seja tarde!</p>

      <p style="margin:0 0 10px;">
        Para participar de <b>toda a experiência natalina</b>, basta criar a sua conta ou fazer o login se já for cadastrado.
      </p>
      <p style="margin:0 0 10px;">
        Os <b>Desafios 2, 3</b>, a <b>Missão Especial</b>, <b>chat</b> e <b>ranking</b> só estarão liberados para usuários cadastrados.
      </p>
<hr>
      <p style="margin:0; opacity:.8;">
        <b>Spoiler:</b> o desafio 3 é de alto nível — realmente desafiador e difícil!
        Não se preocupe com o seu desempenho quando chegar nele. A intenção é mostrar os desafios que os revisores enfrentam todos os dias!
      </p>
      <hr>
        <p style="margin:0; opacity:.8;">
        <b>Obs:</b> <i>se encontrar bugs ou alguma falha de correção e similares, desconsidere. O intuito do app é trazer interatividade e dinanismo para atividades relacionadas à revisão textual e ainda estamos em uma versão experimental.</i>
      </p>
    </div>

    <div style="display:flex; gap:10px; margin-top:14px; justify-content:flex-end; flex-wrap:wrap;">
      <button id="welcomeGateLoginBtn"
        style="padding:10px 14px; border-radius:12px; border:1px solid rgba(255,255,255,.18);
               background: rgba(255,255,255,.10); color:#fff; font-weight:800; cursor:pointer;">
        Criar conta / Login
      </button>
      <button id="welcomeGateCloseBtn"
        style="padding:10px 14px; border-radius:12px; border:1px solid rgba(255,255,255,.12);
               background: transparent; color:#fff; opacity:.85; cursor:pointer;">
        Agora não
      </button>
    </div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  card.querySelector("#welcomeGateCloseBtn")?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  card.querySelector("#welcomeGateLoginBtn")?.addEventListener("click", () => {
    close();
    // abre seu gate de login/cadastro
    app?.auth?.openAuthGate?.();
  });
}


async function bootAll(){
  try {
    const modalMod   = await safeImport("./ui/ui-modal.js", "ui-modal.js");
    const progressMod= await safeImport("./modules/progress-store.js","progress-store.js");
    const themeMod   = await safeImport("./modules/theme-fx.js", "theme-fx.js");
    const authMod    = await safeImport("./modules/auth.js", "auth.js");
    const rankingMod = await safeImport("./modules/ranking.js", "ranking.js");
    const gameMod    = await safeImport("./game-core.js", "game-core.js");
    const adminMod   = await safeImport("./modules/admin.js", "admin.js");
    const googleMod  = await safeImportOptional("./modules/google-auth.js", "google-auth.js");
    const chatMod    = await safeImportOptional("./modules/chat.js", "chat.js");
    const cardMod    = await safeImportOptional("./modules/card.js", "card.js");

    const bootModal   = pickBoot(modalMod,   ["bootModal", "boot", "init"]);
    const bootThemeFx = pickBoot(themeMod,   ["bootThemeFx", "bootTheme", "boot", "init"]); 
    const bootProgress= pickBoot(progressMod,["bootProgress","boot","init"]);
    const bootRanking = pickBoot(rankingMod, ["bootRanking", "boot", "init"]);
    const bootGame    = pickBoot(gameMod,    ["bootGame", "bootGameCore", "initGame", "init"]);
    const bootAdmin   = pickBoot(adminMod,   ["bootAdmin", "boot", "init"]);
    const bootAuth    = pickBoot(authMod,    ["bootAuth", "boot", "init"]); 
    const bootGoogle  = googleMod ? pickBoot(googleMod,  ["bootGoogleAuth", "boot", "init"]) : null;
    const bootChat    = chatMod ? pickBoot(chatMod, ["bootChat", "boot", "init"]) : null;
    const bootCard    = cardMod ? pickBoot(cardMod, ["bootCard", "boot", "init"]) : null;

    bootModal?.(app);
    bootProgress?.(app);
    // (Admin) reset global do progresso local via appConfig/global.resetEpoch
    try {
      const cfgSnap = await getDoc(doc(db, "appConfig", "global"));
      if (cfgSnap.exists()){
        const cfg = cfgSnap.data() || {};
        app.progress?.applyResetEpoch?.(cfg.resetEpoch);
      }
    } catch (e){ console.warn("⚠️ appConfig/global não acessível:", e); }
    bootThemeFx?.(app);
    // render versão no rodapé
    try { const el=document.getElementById("appVersion"); if(el) el.textContent=APP_VERSION; } catch {}
    app.ranking = bootRanking?.(app) || {};
    bootGame?.(app);
    bootAdmin?.(app);
    bootAuth?.(app);
    bootGoogle?.(app);
    bootChat?.(app);
    bootCard?.(app);

    // Garante rolagem vertical habilitada (alguns modais podem travar o scroll)
    try{
      document.documentElement.style.overflowY = "auto";
      document.body.style.overflowY = "auto";
    }catch(e){}

    // ✅ Mostra boas-vindas depois do auth bootar
    setTimeout(showWelcomeGateIfNeeded, 450);

  } catch (err){
    console.error("❌ Falha no boot dos módulos:", err);
    app.ui.showOnly(app.dom.screenForm);
  }
}

bootAll();
