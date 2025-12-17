// js/main.js (module) — BOOTSTRAP / CONTEXTO GLOBAL DO APP

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  getFirestore,
  doc, getDoc, runTransaction, serverTimestamp,
  collection, getDocs, setDoc,
  query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import c11 from "./challenge1-1.js";
import c12 from "./challenge1-2.js";
import c13 from "./challenge1-3.js";
import c21 from "./challenge2-1.js";
import c22 from "./challenge2-2.js";
import c23 from "./challenge2-3.js";
import c31 from "./challenge3-1.js";
import c32 from "./challenge3-2.js";
import c33 from "./challenge3-3.js";
import { getTutorialLevels } from "./tutorial.js";


/* =========================
   THEME PRESETS
========================= */
const THEME_PRESETS = {
  classic: { name:"Clássico", accent:"#e53935", bg:"#0b1020" },
  candy:   { name:"Candy Cane", accent:"#ff2e63", bg:"#140a12" },
  neon:    { name:"Neon Noel", accent:"#00ffd5", bg:"#001016" },
  aurora:  { name:"Aurora", accent:"#7c4dff", bg:"#071022" },
  gold:    { name:"Dourado", accent:"#ffcc00", bg:"#140f02" },
};

/* =========================
   Firebase config
========================= */
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

/* =========================
   Firebase helpers exportáveis
========================= */
const firebase = {
  db,
  auth,

  // atalhos (módulos chamam fb.collection/fb.query/...)
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  collection,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,

  // mantém também namespace fs (caso algum módulo use fb.fs.*)
  fs: {
    db,
    auth,
    doc,
    getDoc,
    runTransaction,
    serverTimestamp,
    collection,
    getDocs,
    setDoc,
    query,
    orderBy,
    limit
  }
};

/* =========================
   Constantes globais
========================= */
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

/* =========================
   Levels / Conteúdo (o game-core usa app.data.levels)
========================= */
/* =========================
   Desafios / Atividades (3x3)
   O game-core trabalha com app.data.levels (sempre 3 atividades por desafio).
========================= */
const CHALLENGES = {
  1: { id:1, title:"Desafio 1", requiresLogin:false, requiresPrev:false, correctMult:1.0, levels:[c11, c12, c13] },
  2: { id:2, title:"Desafio 2", requiresLogin:true,  requiresPrev:true,  correctMult:1.2, levels:[c21, c22, c23] },
  3: { id:3, title:"Desafio 3", requiresLogin:true,  requiresPrev:true,  correctMult:1.2, levels:[c31, c32, c33] }
};

const PROGRESS_KEY = "mission_progress_v2";
function loadProgress(){
  try{
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { completedTasks:{1:0,2:0,3:0}, missionSpecialUnlocked:false };
    const p = JSON.parse(raw);
    return {
      completedTasks: {1:Number(p?.completedTasks?.[1]||0),2:Number(p?.completedTasks?.[2]||0),3:Number(p?.completedTasks?.[3]||0)},
      missionSpecialUnlocked: !!p?.missionSpecialUnlocked
    };
  }catch(_){ return { completedTasks:{1:0,2:0,3:0}, missionSpecialUnlocked:false }; }
}
function saveProgress(p){
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}
function prevChallengeDone(p, challengeId){
  if (challengeId <= 1) return true;
  return Number(p.completedTasks[challengeId-1]||0) >= 3;
}

/* =========================
   Utils compartilhados
========================= */
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function normalize(str){
  return (str || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function ensureGlobal(re){
  const flags = re.flags.includes("g") ? re.flags : (re.flags + "g");
  return new RegExp(re.source, flags);
}

function clampName(name){
  const n = (name || "").trim().replace(/\s+/g, " ");
  return n.length > 60 ? n.slice(0,60) : n;
}

function medalFor(i){
  if (i === 0) return { t:"🥇", top:true };
  if (i === 1) return { t:"🥈", top:true };
  if (i === 2) return { t:"🥉", top:true };
  return { t:`${i+1}º`, top:false };
}

function keyify(s){
  return normalize(String(s || ""))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

function individualDocId(name, sector){
  return `n_${keyify(name)}__s_${keyify(sector)}`;
}

/* =========================
   DOM centralizado
========================= */
const dom = {
  screenLoading: document.getElementById("screenLoading"),
  screenAuth: document.getElementById("screenAuth"), // ✅ NOVO
  screenForm: document.getElementById("screenForm"),
  screenGame: document.getElementById("screenGame"),
  screenFinal: document.getElementById("screenFinal"),


  headerTitle: document.getElementById("headerTitle"),
  rankingBtn: document.getElementById("rankingBtn"),
  customizeBtn: document.getElementById("customizeBtn"),

  userNameEl: document.getElementById("userName"),
  userSectorEl: document.getElementById("userSector"),
  optRankingEl: document.getElementById("optRanking"),
  challenge1Btn: document.getElementById("challenge1Btn"),
  challenge2Btn: document.getElementById("challenge2Btn"),
  challenge3Btn: document.getElementById("challenge3Btn"),
  missionSpecialHomeBtn: document.getElementById("missionSpecialHomeBtn"),
  finalHomeBtn: document.getElementById("finalHomeBtn"),
  finalNextTaskBtn: document.getElementById("finalNextTaskBtn"),
  finalMissionSpecialBtn: document.getElementById("finalMissionSpecialBtn"),

  finalRankingBtn: document.getElementById("finalRankingBtn"),
  openCustomizeInline: document.getElementById("openCustomizeInline"),

  reindeerLayer: document.getElementById("reindeerLayer"),
  snowCanvas: document.getElementById("snow")
};

/* =========================
   Helpers UI
========================= */
function showOnly(screen){
  [
    dom.screenLoading,
    dom.screenAuth,   // ✅ NOVO
    dom.screenForm,
    dom.screenGame,
    dom.screenFinal
  ].forEach(el => el && el.classList.toggle("hidden", el !== screen));
}


function getUserName(){
  return clampName((dom.userNameEl?.value || localStorage.getItem("mission_name") || "").trim());
}
function getUserSector(){
  return (dom.userSectorEl?.value || localStorage.getItem("mission_sector") || "").trim();
}

/* =========================
   Contexto global do app
========================= */
const app = {
  firebase,
  dom,

  data: {
    SECTORS,
    SCORE_RULES,
    levels: [],
    tutorialLevels: getTutorialLevels(),
    challenges: CHALLENGES,
    THEME_PRESETS
  },

  utils: {
    escapeHtml,
    normalize,
    ensureGlobal,
    clampName,
    medalFor,
    individualDocId
  },

  user: { getUserName, getUserSector },
  ui: { showOnly }
};

// debug opcional
window.__MISSION_APP__ = app;
window.app = app; // alias para debug/console

/* =========================
   Boot seguro
========================= */
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

async function bootAll(){
  try {
    const modalMod   = await import("./ui-modal.js");
    const themeMod   = await import("./theme-fx.js");
    const rankingMod = await import("./ranking.js");
    const gameMod    = await import("./game-core.js");
    const adminMod   = await import("./admin.js");
    const authMod    = await import("./auth.js"); // ✅ auth

    const bootModal   = pickBoot(modalMod,   ["bootModal", "boot", "init"]);
    const bootThemeFx = pickBoot(themeMod,   ["bootThemeFx", "bootTheme", "boot", "init"]);
    const bootRanking = pickBoot(rankingMod, ["bootRanking", "boot", "init"]);
    const bootGame    = pickBoot(gameMod,    ["bootGame", "bootGameCore", "boot", "init"]);
    const bootAdmin   = pickBoot(adminMod,   ["bootAdmin", "boot", "init"]);
    const bootAuth    = pickBoot(authMod,    ["bootAuth", "boot", "init"]); // ✅ auth

    bootModal?.(app);
    bootThemeFx?.(app);
    bootRanking?.(app);
    bootGame?.(app);
    bootAdmin?.(app);
    bootAuth?.(app); // ✅ inicializa auth


// =========================
// Desafios / Progressão
// =========================
const progress = loadProgress();

function refreshChallengeButtons(){
  const p = loadProgress();
  const logged = !!app.auth?.isLogged?.();
  const b1 = app.dom.challenge1Btn;
  const b2 = app.dom.challenge2Btn;
  const b3 = app.dom.challenge3Btn;
  if (b1) b1.classList.remove("ghost");
  if (b2){
    const locked = !logged || !prevChallengeDone(p, 2);
    b2.classList.toggle("btn-disabled", locked);
    b2.textContent = locked ? "Desafio 2 🔒" : "Desafio 2";
  }
  if (b3){
    const locked = !logged || !prevChallengeDone(p, 3);
    b3.classList.toggle("btn-disabled", locked);
    b3.textContent = locked ? "Desafio 3 🔒" : "Desafio 3";
  }

  // Missão especial (home)
  const ms = app.dom.missionSpecialHomeBtn;
  if (ms){
    const unlocked = !!p.missionSpecialUnlocked;
    ms.classList.toggle("btn-disabled", !unlocked);
    ms.textContent = unlocked ? "Missão especial 🎁" : "Missão especial 🔒";
  }
}

function setActiveChallengeButton(chId){
  [app.dom.challenge1Btn, app.dom.challenge2Btn, app.dom.challenge3Btn].forEach((b) => {
    if (!b) return;
    b.classList.toggle("active", b === (chId===1?app.dom.challenge1Btn:chId===2?app.dom.challenge2Btn:app.dom.challenge3Btn));
  });
}

function confirmStartChallenge(chId){
  const ch = CHALLENGES[chId];
  if (!ch) return;

  const p = loadProgress();
  const logged = !!app.auth?.isLogged?.();

  if (ch.requiresLogin && !logged){
    app.modal?.openModal?.({
      title: "Desafio bloqueado",
      bodyHTML: `<p>Desafio bloqueado, crie uma conta e cumpra as tarefas anteriores para participar das demais.</p>`,
      buttons: [{ label:"Entendi", onClick: app.modal.closeModal }]
    });
    return;
  }
  if (ch.requiresPrev && !prevChallengeDone(p, chId)){
    app.modal?.openModal?.({
      title: "Ainda não liberado",
      bodyHTML: `<p>Primeiro cumpra as tarefas anteriores para desbloquear este desafio.</p>`,
      buttons: [{ label:"Entendi", onClick: app.modal.closeModal }]
    });
    return;
  }

  app.modal?.openModal?.({
    title: ch.title,
    bodyHTML: `<p>Deseja iniciar agora?</p>`,
    buttons: [
      { label:"Cancelar", variant:"ghost", onClick: app.modal.closeModal },
      { label:"Iniciar", onClick: () => { app.modal.closeModal(); startChallenge(chId); } }
    ]
  });
}

function startChallenge(chId){
  const ch = CHALLENGES[chId];
  if (!ch) return;

  setActiveChallengeButton(chId);

  app.gameState = app.gameState || {};
  app.gameState.currentChallenge = chId;
  app.data = app.data || {};
  app.data.correctMult = ch.correctMult;

  // injeta 3 atividades deste desafio
  app.data.levels = ch.levels.map((lvl) => ({ ...lvl }));

  // tutorial: apenas antes do desafio 1 e só se não visto
  if (chId === 1 && localStorage.getItem("mission_tutorial_done") !== "1"){
    app.modal?.openModal?.({
      title: "Tutorial",
      bodyHTML: `<p>Este tutorial explicará brevemente a dinâmica do jogo. Você pode pular se preferir.</p>`,
      buttons: [
        { label:"Pular", variant:"ghost", onClick: () => { localStorage.setItem("mission_tutorial_done","1"); app.modal.closeModal(); app.game?.start?.(); } },
        { label:"Ver tutorial", onClick: () => { app.modal.closeModal(); app.game?.startTutorial?.(); } }
      ]
    });
    return;
  }

  app.game?.start?.();
}

// Expor para debug
app.game = app.game || {};
app.game.setChallenge = confirmStartChallenge; // mantém sua API, mas agora com confirmação + gates

// Wire buttons
app.dom.challenge1Btn?.addEventListener("click", () => confirmStartChallenge(1));
app.dom.challenge2Btn?.addEventListener("click", () => confirmStartChallenge(2));
app.dom.challenge3Btn?.addEventListener("click", () => confirmStartChallenge(3));

app.dom.missionSpecialHomeBtn?.addEventListener("click", () => {
  const p = loadProgress();
  if (!p.missionSpecialUnlocked){
    app.modal?.openModal?.({
      title: "Missão especial",
      bodyHTML: `<p>Conclua os 3 desafios para liberar a Missão especial.</p>`,
      buttons: [{ label:"Entendi", onClick: app.modal.closeModal }]
    });
    return;
  }
  app.game?.showMissionSpecial?.();
});

// Atualiza botões no boot + quando auth mudar (auth.js deve chamar app.auth.onChange se existir)
refreshChallengeButtons();
app.auth?.onChange?.(() => refreshChallengeButtons());

    
  } catch (err) {
    console.error("❌ Falha no boot dos módulos:", err);
    app.ui.showOnly(app.dom.screenForm);
  }
}

bootAll();






