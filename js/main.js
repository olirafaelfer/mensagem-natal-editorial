// js/main.js (module) — BOOTSTRAP / CONTEXTO GLOBAL DO APP

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore,
  doc, getDoc, runTransaction, serverTimestamp,
  collection, getDocs, setDoc,
  query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

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

/* =========================
   Firebase helpers exportáveis
========================= */
const firebase = {
  db,

  // ✅ atalho direto (ranking.js e outros módulos antigos costumam chamar fb.collection, fb.query etc.)
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

  // ✅ mantém também o namespace fs, caso algum módulo use fb.fs.*
  fs: {
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
   Levels / Conteúdo
========================= */
const levels = [
  {
    name: "Fácil",
    intro: `O Papai Noel, editor-chefe, pediu sua ajuda para revisar a Mensagem de Natal.
Ele escreveu tão rápido que acabou deixando três errinhos para trás.`,
    instruction: `Os erros podem envolver acentuação, ortografia, gramática etc. Clique nos trechos incorretos para corrigir!`,
    raw: `Mais do que presentes e refeissões caprichadas, o Natal é a época de lembrar o valor de um abraço apertado e de um sorriso sincero! Que para voces, meus amigos, seja uma época xeia de carinho e amor, preenchida pelo que realmente importa nessa vida!`,
    rules: [
      { id:"f1", label:"Ortografia", wrong:/\brefeissões\b/g, correct:"refeições", explain:"Erro ortográfico. A forma correta do substantivo é 'refeições'." },
      { id:"f2", label:"Acentuação", wrong:/\bvoces\b/g, correct:"vocês", explain:"Erro de acentuação gráfica." },
      { id:"f3", label:"Ortografia", wrong:/\bxeia\b/g, correct:"cheia", explain:"Erro ortográfico. A palavra correta é 'cheia'." }
    ]
  },
  {
    name: "Médio",
    intro: `Nível médio: erros editoriais objetivos.`,
    instruction: `Atenção a vírgulas indevidas e concordância.`,
    raw: `O Natal, é um momento especial para celebrar a união e a esperança. As mensagens, que circulam nessa época, precisam transmitir carinho e acolhimento, mas muitas vezes, acabam sendo escritas de forma apressada. Os textos natalinos, exige atenção aos detalhes, para que a mensagem chegue clara ao leitor.`,
    rules: [
      { id:"m1", label:"Pontuação", wrong:/(?<=\bNatal),/g, correct:"", explain:"Vírgula indevida entre sujeito e verbo." },
      { id:"m2", label:"Pontuação", wrong:/(?<=\bmensagens),/g, correct:"", explain:"Vírgula indevida em oração restritiva." },
      { id:"m3", label:"Pontuação", wrong:/(?<=\bvezes),/g, correct:"", explain:"Vírgula indevida entre adjunto e verbo." },
      { id:"m4", label:"Pontuação", wrong:/(?<=\bnatalinos),/g, correct:"", explain:"Vírgula indevida separando termos essenciais." },
      { id:"m5", label:"Concordância", wrong:/\bexige\b/g, correct:"exigem", explain:"Sujeito plural exige verbo no plural." }
    ]
  },
  {
    name: "Difícil",
    intro: `Nível difícil: desafios reais de edição.`,
    instruction: `Pontuação, gramática e colocação pronominal.`,
    raw: `No Natal, se deve pensar no amor ao próximo e na importância da empatia. Aos pais, respeite-os; aos filhos, os ame; aos necessitados, ajude-os. Essas atitudes, reforçam os valores natalinos.`,
    rules: [
      { id:"d1", label:"Colocação pronominal", wrong:/No Natal,\s*se deve pensar/g, correct:"No Natal, deve-se pensar", explain:"Colocação pronominal correta: deve-se." },
      { id:"d2", label:"Colocação pronominal", wrong:/aos filhos,\s*os ame/gi, correct:"aos filhos, ame-os", explain:"Colocação pronominal adequada." },
      { id:"d3", label:"Pontuação", wrong:/(?<=\batitudes),/g, correct:"", explain:"Vírgula indevida entre sujeito e predicado." }
    ]
  }
];

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
  screenForm: document.getElementById("screenForm"),
  screenGame: document.getElementById("screenGame"),
  screenFinal: document.getElementById("screenFinal"),

  headerTitle: document.getElementById("headerTitle"),
  rankingBtn: document.getElementById("rankingBtn"),
  customizeBtn: document.getElementById("customizeBtn"),

  userNameEl: document.getElementById("userName"),
  userSectorEl: document.getElementById("userSector"),
  startBtn: document.getElementById("startBtn"),
  optRankingEl: document.getElementById("optRanking"),
  lgpdMoreBtn: document.getElementById("lgpdMoreBtn"),

  levelLabel: document.getElementById("levelLabel"),
  remainingCount: document.getElementById("remainingCount"),
  totalFixEl: document.getElementById("totalFix"),
  wrongCountEl: document.getElementById("wrongCount"),
  scoreCountEl: document.getElementById("scoreCount"),
  instruction: document.getElementById("instruction"),
  messageArea: document.getElementById("messageArea"),

  hintBtn: document.getElementById("hintBtn"),
  nextLevelBtn: document.getElementById("nextLevelBtn"),
  autoFixBtn: document.getElementById("autoFixBtn"),
  openCustomizeInline: document.getElementById("openCustomizeInline"),

  finalCongrats: document.getElementById("finalCongrats"),
  finalStats: document.getElementById("finalStats"),
  finalRecado: document.getElementById("finalRecado"),
  finalBox1: document.getElementById("finalBox1"),
  finalBox2: document.getElementById("finalBox2"),
  finalBox3: document.getElementById("finalBox3"),
  restartBtn: document.getElementById("restartBtn"),
  finalRankingBtn: document.getElementById("finalRankingBtn"),
  reviewBtn1: document.getElementById("reviewBtn1"),
  reviewBtn2: document.getElementById("reviewBtn2"),
  reviewBtn3: document.getElementById("reviewBtn3"),

  toggleFinalMsgsBtn: document.getElementById("toggleFinalMsgs"),
  finalMsgsWrap: document.getElementById("finalMsgsWrap"),

  reindeerLayer: document.getElementById("reindeerLayer"),
  snowCanvas: document.getElementById("snow")
};

/* =========================
   Helpers UI
========================= */
function showOnly(screen){
  [dom.screenLoading, dom.screenForm, dom.screenGame, dom.screenFinal]
    .forEach(el => el && el.classList.toggle("hidden", el !== screen));
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
    levels,

    // ✅ para o theme-fx não quebrar em Object.entries(...)
    THEME_PRESETS
  },

  // ✅ opcional: alguns módulos podem preferir este nome
  themePresets: THEME_PRESETS,

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


// opcional para debug
window.__MISSION_APP__ = app;

/* =========================
   Boot seguro (NÃO trava tudo se um módulo vier com nome diferente)
========================= */
function pickBoot(mod, candidates){
  if (!mod) return null;

  // export nomeado
  for (const k of candidates){
    if (typeof mod[k] === "function") return mod[k];
  }

  // default pode ser função
  if (typeof mod.default === "function") return mod.default;

  // default pode ser objeto com função
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

    const bootModal   = pickBoot(modalMod,   ["bootModal", "boot", "init"]);
    const bootThemeFx = pickBoot(themeMod,   ["bootThemeFx", "bootTheme", "boot", "init"]);
    const bootRanking = pickBoot(rankingMod, ["bootRanking", "boot", "init"]);
    const bootGame    = pickBoot(gameMod,    ["bootGame", "bootGameCore", "boot", "init"]);

    // chama na ordem
    if (!bootModal)   console.warn("⚠️ ui-modal.js sem função de boot exportada (esperado: bootModal/boot/init).");
    else bootModal(app);

    if (!bootThemeFx) console.warn("⚠️ theme-fx.js sem função de boot exportada (esperado: bootThemeFx/bootTheme/boot/init).");
    else bootThemeFx(app);

    if (!bootRanking) console.warn("⚠️ ranking.js sem função de boot exportada (esperado: bootRanking/boot/init).");
    else bootRanking(app);

    if (!bootGame) {
      console.error("❌ game-core.js não exportou função de boot (bootGame/bootGameCore/boot/init).");
      // não explode tudo: deixa ao menos Form aparecer
      app.ui.showOnly(app.dom.screenForm);
      return;
    }
    bootGame(app);

  } catch (err) {
    console.error("❌ Falha no boot dos módulos:", err);
    // fallback mínimo: mostra tela de formulário
    app.ui.showOnly(app.dom.screenForm);
  }
}

bootAll();


