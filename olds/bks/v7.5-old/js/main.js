// js/main.js — BOOTSTRAP (V7.5) — determinístico e resiliente
import { APP_VERSION, BUILD_ID } from "./config/version.js";

// Render versão
try { const el=document.getElementById("appVersion"); if (el) el.textContent = APP_VERSION; } catch {}

// Firebase imports (mantidos)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore,
  doc, getDoc, runTransaction, serverTimestamp,
  collection, getDocs, setDoc,
  query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Config Firebase (mantida do projeto)
const firebaseConfig = window.firebaseConfig || {
  apiKey: "YOUR_KEY",
  authDomain: "missao-natal-ranking.firebaseapp.com",
  projectId: "missao-natal-ranking",
  storageBucket: "missao-natal-ranking.firebasestorage.app",
  messagingSenderId: "0",
  appId: "0"
};

// App singleton global
window.app = window.app || {};
const app = window.app;

// Attach Firebase services
try {
  app.firebaseApp = initializeApp(firebaseConfig);
  app.auth = getAuth(app.firebaseApp);
  app.db = getFirestore(app.firebaseApp);
  app.fs = { doc, getDoc, runTransaction, serverTimestamp, collection, getDocs, setDoc, query, orderBy, limit };
} catch (e) {
  console.error("[boot] falha ao inicializar Firebase:", e);
}

async function safeImport(path, label){
  try {
    return await import(`${path}?v=${BUILD_ID}`);
  } catch (e) {
    console.error(`❌ Falha ao importar ${label || path}:`, e);
    throw e;
  }
}

async function safeImportOptional(path, label){
  try { return await import(`${path}?v=${BUILD_ID}`); }
  catch (e){ console.warn(`⚠️ Opcional não carregou: ${label || path}`, e); return null; }
}

async function boot(){
  // 0) Modal primeiro (cria app.modal mesmo antes do DOM pronto)
  const modalMod = await safeImport("./ui/ui-modal.js", "ui-modal.js");
  try { modalMod.bootModal?.(app); } catch (e) { console.warn("[boot] bootModal falhou (vai tentar novamente no DOMContentLoaded):", e); }

  // 1) Progress store (depende de app)
  const progressMod = await safeImport("./modules/progress-store.js", "progress-store.js");
  progressMod.bootProgress?.(app);

  // 2) Dados base (tutorial/challenges) e engine
  const gameMod = await safeImport("./game-core.js", "game-core.js");

  // 3) Ranking / Auth / Theme / Admin (nessa ordem para reduzir dependências circulares)
  const rankingMod = await safeImport("./modules/ranking.js", "ranking.js");
  const authMod    = await safeImport("./modules/auth.js", "auth.js");
  const themeMod   = await safeImport("./modules/theme-fx.js", "theme-fx.js");
  const adminMod   = await safeImportOptional("./modules/admin.js", "admin.js");
  await safeImportOptional("./modules/google-auth.js", "google-auth.js");

  // 4) Boot dos módulos
  // (Re-boota modal quando DOM está pronto)
  try { modalMod.bootModal?.(app); } catch {}
  themeMod.bootThemeFx?.(app);

  app.ranking = rankingMod.bootRanking?.(app) || {};
  gameMod.bootGame?.(app);
  adminMod?.bootAdmin?.(app);
  authMod.bootAuth?.(app);
}

window.addEventListener("DOMContentLoaded", () => {
  // Garante que modal tenha DOM
  boot().catch((e) => console.error("❌ Falha no boot dos módulos:", e));
});
