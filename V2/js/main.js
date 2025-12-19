const BUILD_ID = "fix15.2";
import { APP_VERSION } from "./config/version.js";

// js/main.js — BOOTSTRAP (módulos + Firebase) — versão refatorada em pastas
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
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
  storageBucket: "missao-natal-ranking.firebasestorage.app",
  messagingSenderId: "175157868358",
  appId: "1:175157868358:web:690742496c05983d1c1747"
};

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
const auth = getAuth(fbApp);

// helpers exportáveis p/ módulos legados (auth/ranking/admin)
const firebase = {
  db, auth,
  doc, getDoc, runTransaction, serverTimestamp,
  collection, getDocs, setDoc,
  query, orderBy, limit,
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
  try { return await import(`${path}?v=${BUILD_ID}`); }
  catch (e){
    console.error(`❌ Falha ao importar ${name} (${path}):`, e);
    throw e;
  }
}

async function safeImportOptional(path, name){
  try { return await import(`${path}?v=${BUILD_ID}`); }
  catch (e){
    console.warn(`⚠️ Módulo opcional não carregado: ${name} (${path})`, e);
    return null;
  }
}


async function bootAll(){
  try {
    const modalMod   = await safeImport("./ui/ui-modal.js", "ui-modal.js");
    const themeMod   = await safeImport("./modules/theme-fx.js", "theme-fx.js");
    const authMod    = await safeImport("./modules/auth.js", "auth.js");
    const rankingMod = await safeImport("./modules/ranking.js", "ranking.js");
    const gameMod    = await safeImport("./game-core.js", "game-core.js");
    const adminMod   = await safeImport("./modules/admin.js", "admin.js");
    const googleMod  = await safeImportOptional("./modules/google-auth.js", "google-auth.js");

    const bootModal   = pickBoot(modalMod,   ["bootModal", "boot", "init"]);
    const bootThemeFx = pickBoot(themeMod,   ["bootThemeFx", "bootTheme", "boot", "init"]);
    const bootRanking = pickBoot(rankingMod, ["bootRanking", "boot", "init"]);
    const bootGame    = pickBoot(gameMod,    ["bootGame", "bootGameCore", "initGame", "init"]);
    const bootAdmin   = pickBoot(adminMod,   ["bootAdmin", "boot", "init"]);
    const bootAuth    = pickBoot(authMod,    ["bootAuth", "boot", "init"]); 
    const bootGoogle  = googleMod ? pickBoot(googleMod,  ["bootGoogleAuth", "boot", "init"]) : null;

    bootModal?.(app);
    bootThemeFx?.(app);
    app.ranking = bootRanking?.(app) || {};
    bootGame?.(app);
    bootAdmin?.(app);
    bootAuth?.(app);
    bootGoogle?.(app);

    // abre auth automaticamente se não logado (comporta igual ao que você tinha)
    setTimeout(() => {
      if (app.auth?.isLogged?.()) return;
      app.auth?.openAuthGate?.();
    }, 1200);

  } catch (err){
    console.error("❌ Falha no boot dos módulos:", err);
    app.ui.showOnly(app.dom.screenForm);
  }
}

bootAll();
