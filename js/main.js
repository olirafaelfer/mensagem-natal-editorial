// js/main.js (module)

// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore,
  doc, getDoc, runTransaction, serverTimestamp,
  collection, getDocs, setDoc,
  query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/* firebaseConfig */
const firebaseConfig = {
  apiKey: "AIzaSyD_-M7m1R2-FKzOHg356vb_IN7bPb6hqJM",
  authDomain: "missao-natal-ranking.firebaseapp.com",
  projectId: "missao-natal-ranking",
  storageBucket: "missao-natal-ranking.firebasestorage.app",
  messagingSenderId: "175157868358",
  appId: "1:175157868358:web:690742496c05983d1c1747"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/** Setores */
const SECTORS = [
  "Selecione…",
  "Produção (CTP, PCP, Offset, Acabamento...)",
  "Administrativo (CTB, Fin, Adm...)",
  "Editorial",
  "Serviços gerais (Manutenção, Xerox, Portaria...)",
  "Outros..."
];

/** Pontuação */
const SCORE_RULES = {
  correct: +5,
  wrong: -3,
  skip: -5,
  hint: -1,
  auto: -2
};
let autoUsed = 0;

/** Levels */
const levels = [
  {
    name: "Fácil",
    intro: `O Papai Noel, editor-chefe, pediu sua ajuda para revisar a Mensagem de Natal.
Ele escreveu tão rápido que acabou deixando três errinhos para trás.`,
    instruction: `Os erros podem envolver acentuação, ortografia, gramática etc. Clique nos trechos incorretos para corrigir!`,
    raw: `Mais do que presentes e refeissões caprichadas, o Natal é a época de lembrar o valor de um abraço apertado e de um sorriso sincero! Que para voces, meus amigos, seja uma época xeia de carinho e amor, preenchida pelo que realmente importa nessa vida!`,
    rules: [
      { id:"f1", label:"Ortografia",  wrong:/\brefeissões\b/g, correct:"refeições" },
      { id:"f2", label:"Acentuação", wrong:/\bvoces\b/g,      correct:"vocês" },
      { id:"f3", label:"Ortografia", wrong:/\bxeia\b/g,       correct:"cheia" },
    ]
  },
  {
    name: "Médio",
    intro: `Nível médio: erros editoriais objetivos — vírgulas mal colocadas e concordância.`,
    instruction: `Atenção: os erros podem envolver pontuação (inclusive vírgulas indevidas), concordância, acentuação e ortografia.`,
    raw: `O Natal, é um momento especial para celebrar a união e a esperança. As mensagens, que circulam nessa época, precisam transmitir carinho e acolhimento, mas muitas vezes, acabam sendo escritas de forma apressada. Os textos natalinos, exige atenção aos detalhes, para que a mensagem chegue clara ao leitor.`,
    rules: [
      { id:"m1", label:"Pontuação",  wrong:/(?<=\bNatal),/g,        correct:"" },
      { id:"m2", label:"Pontuação",  wrong:/(?<=\bmensagens),/g,    correct:"" },
      { id:"m3", label:"Pontuação",  wrong:/(?<=\bvezes),/g,        correct:"" },
      { id:"m4", label:"Pontuação",  wrong:/(?<=\bnatalinos),/g,    correct:"" },
      { id:"m5", label:"Concordância", wrong:/\bexige\b/g, correct:"exigem" },
    ]
  },
  {
    name: "Difícil",
    intro: `Nível difícil: desafios reais de edição — colocação pronominal, pontuação e paralelismo.`,
    instruction: `Erros podem envolver pontuação, gramática e colocação pronominal. Clique no trecho inteiro que precisa ser reescrito.`,
    raw: `No Natal, se deve pensar no amor ao próximo e na importância da empatia. Aos pais, respeite-os; aos filhos, os ame; aos necessitados, ajude-os. Essas atitudes, reforçam os valores natalinos e mostram que o amor, em todas as suas formas e meios de manifestação, é a peça-chave para uma vida boa, feliz e luz nos tempos de escuridão.
Aos que estão em guerra, peço a paz; aos que não a encontram, que Deus acalme seus corações inquietos; aos que nada disso sirva, ofereço um caloroso abraço, o maior conforto da alma.
Pensadores cientificistas pensam que o tempo é só um passar, que datas e símbolos são itens meramente psicológicos, que a linearidade intrínseca ao mensurável e durável tempo é uma prisão (ou mesmo um castigo). Chamam este tempo "chronos" e negam que é o "kairós", que é aquele tempo espiritual, profundo, com significado. Aquele tempo em que paramos para respirar e, sim, sentimos que algo está ali presente. Não enxergo um tempo tão "kairós" quanto o Natal e, o mais incrível, isso independe de crenças ou religiões. É época de partilhar, festejar, refletir; é oportunidade para planejar, remodelar e desconstruir.
Recomece quantas vezes precisar, pois, enquanto estivermos no "kairós", não seremos reféns do "chronos".`,
    rules: [
      { id:"d1", label:"Colocação pronominal", wrong:/No Natal,\s*se deve pensar/g, correct:"No Natal, deve-se pensar" },
      { id:"d2", label:"Colocação pronominal", wrong:/aos filhos,\s*os ame/gi, correct:"aos filhos, ame-os" },

      // vírgulas indevidas (sujeito + verbo / termos essenciais)
      { id:"d3", label:"Pontuação", wrong:/(?<=\batitudes),/g, correct:"" },
      { id:"d4", label:"Pontuação", wrong:/o amor,\s*em todas/gi, correct:"o amor em todas" },
      { id:"d5", label:"Pontuação", wrong:/quanto o Natal\s*e,/gi, correct:"quanto o Natal e" },

      // melhoria pontual (mais editorial e objetiva)
      { id:"d6", label:"Pontuação", wrong:/ofereço um caloroso abraço,\s*o maior conforto da alma/gi, correct:"ofereço um caloroso abraço: o maior conforto da alma" },
    ]
  }
];

const explanations = [
  {
    title: "Atividade 1 — Nível Fácil",
    items: [
      { wrong: "refeissões", correct: "refeições", reason: "Erro ortográfico. A forma correta do substantivo é 'refeições'." },
      { wrong: "voces", correct: "vocês", reason: "Erro de acentuação gráfica. O pronome 'vocês' é acentuado." },
      { wrong: "xeia", correct: "cheia", reason: "Erro ortográfico. A palavra correta é 'cheia', com dígrafo 'ch'." }
    ]
  },
  {
    title: "Atividade 2 — Nível Médio",
    items: [
      { wrong: "O Natal, é um momento", correct: "O Natal é um momento", reason: "Vírgula indevida separando sujeito e predicado." },
      { wrong: "As mensagens, que circulam", correct: "As mensagens que circulam", reason: "Vírgula indevida isolando oração restritiva (sem necessidade aqui)." },
      { wrong: "mas muitas vezes, acabam", correct: "mas muitas vezes acabam", reason: "Vírgula indevida entre adjunto e verbo." },
      { wrong: "Os textos natalinos, exige", correct: "Os textos natalinos exigem", reason: "Erro de concordância verbal: sujeito plural exige verbo no plural." }
    ]
  },
  {
    title: "Atividade 3 — Nível Difícil",
    items: [
      { wrong: "No Natal, se deve pensar", correct: "No Natal, deve-se pensar", reason: "Colocação pronominal: a forma adequada é 'deve-se'." },
      { wrong: "aos filhos, os ame", correct: "aos filhos, ame-os", reason: "Colocação pronominal: forma recomendada 'ame-os'." },
      { wrong: "Essas atitudes, reforçam", correct: "Essas atitudes reforçam", reason: "Vírgula indevida entre sujeito e predicado." },
      { wrong: "o amor, em todas", correct: "o amor em todas", reason: "Vírgula indevida separando termo essencial." },
      { wrong: "quanto o Natal e,", correct: "quanto o Natal e", reason: "Vírgula indevida quebrando coordenação." },
      { wrong: "abraço, o maior conforto", correct: "abraço: o maior conforto", reason: "Melhoria editorial: dois-pontos para aposto explicativo." }
    ]
  }
];

/** =========================
 * Elementos
 * ========================= */
const toggleFinalMsgsBtn = document.getElementById("toggleFinalMsgs");
const finalMsgsWrap = document.getElementById("finalMsgsWrap");

toggleFinalMsgsBtn?.addEventListener("click", () => {
  const isHidden = finalMsgsWrap?.classList.contains("hidden");
  finalMsgsWrap?.classList.toggle("hidden", !isHidden);
  toggleFinalMsgsBtn.textContent = isHidden ? "Ocultar mensagens" : "Ver mensagens corrigidas";
});

const screenLoading = document.getElementById("screenLoading");
const screenForm = document.getElementById("screenForm");
const screenGame = document.getElementById("screenGame");
const screenFinal = document.getElementById("screenFinal");

const headerTitle = document.getElementById("headerTitle");
const userNameEl = document.getElementById("userName");
const userSectorEl = document.getElementById("userSector");
const startBtn = document.getElementById("startBtn");

const levelLabel = document.getElementById("levelLabel");
const remainingCount = document.getElementById("remainingCount");
const totalFixEl = document.getElementById("totalFix");
const wrongCountEl = document.getElementById("wrongCount");
const scoreCountEl = document.getElementById("scoreCount");

const instruction = document.getElementById("instruction");
const messageArea = document.getElementById("messageArea");

const hintBtn = document.getElementById("hintBtn");
const nextLevelBtn = document.getElementById("nextLevelBtn");
const autoFixBtn = document.getElementById("autoFixBtn");

const finalCongrats = document.getElementById("finalCongrats");
const finalStats = document.getElementById("finalStats");
const finalRecado = document.getElementById("finalRecado");
const finalBox1 = document.getElementById("finalBox1");
const finalBox2 = document.getElementById("finalBox2");
const finalBox3 = document.getElementById("finalBox3");
const restartBtn = document.getElementById("restartBtn");
const finalRankingBtn = document.getElementById("finalRankingBtn");

const rankingBtn = document.getElementById("rankingBtn");
const customizeBtn = document.getElementById("customizeBtn");
const openCustomizeInline = document.getElementById("openCustomizeInline");
const lgpdMoreBtn = document.getElementById("lgpdMoreBtn");

const reindeerLayer = document.getElementById("reindeerLayer");

const reviewBtn1 = document.getElementById("reviewBtn1");
const reviewBtn2 = document.getElementById("reviewBtn2");
const reviewBtn3 = document.getElementById("reviewBtn3");
const reviewBtn = document.getElementById("reviewBtn");

const optRankingEl = document.getElementById("optRanking");

/** =========================
 * Modal (FIXED + trava scroll no lugar certo)
 * ========================= */
// =========================
// Modal (abre no scroll atual, mobile-safe)
// =========================
const overlay = document.getElementById("overlay");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalFoot = document.getElementById("modalFoot");

document.getElementById("closeModal")?.addEventListener("click", closeModal);
overlay?.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && overlay && !overlay.classList.contains("hidden")) closeModal();
});

function openModal({ title, bodyHTML, buttons = [] }){
  if (!overlay) return;

  // ✅ fixa o overlay na “altura” atual do scroll (não pula para o topo)
  const y = window.scrollY || 0;
  overlay.style.position = "absolute";
  overlay.style.top = `${y}px`;
  overlay.style.left = "0";
  overlay.style.right = "0";
  overlay.style.height = `${window.innerHeight}px`;

  if (modalTitle) modalTitle.textContent = title || "";
  if (modalBody) modalBody.innerHTML = bodyHTML || "";
  if (modalFoot) modalFoot.innerHTML = "";

  for (const btn of buttons){
    const b = document.createElement("button");
    b.className = "btn" + (btn.variant ? ` ${btn.variant}` : "");
    b.textContent = btn.label;
    b.disabled = !!btn.disabled;
    b.addEventListener("click", btn.onClick);
    modalFoot?.appendChild(b);
  }

  overlay.classList.remove("hidden");
  requestAnimationFrame(() => overlay.classList.add("show"));
}

function closeModal(){
  if (!overlay) return;
  overlay.classList.remove("show");
  setTimeout(() => {
    overlay.classList.add("hidden");
    overlay.style.top = "";
    overlay.style.height = "";
    overlay.style.position = "";
  }, 180);
}

/** =========================
 * Score float
 * ========================= */
function showScoreFloat(delta, anchorEl = null){
  const el = document.createElement("div");
  el.className = "score-float " + (delta >= 0 ? "plus" : "minus");
  el.textContent = delta >= 0 ? `+${delta}` : `${delta}`;

  let x = window.innerWidth * 0.5;
  let y = window.innerHeight * 0.45;

  if (anchorEl){
    const r = anchorEl.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top;
  } else {
    const hud = document.getElementById("scoreCount");
    if (hud){
      const r = hud.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top;
    }
  }

  el.style.left = `${x}px`;
  el.style.top = `${y}px`;

  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

/** =========================
 * Utils
 * ========================= */
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

/* ✅ ID determinístico para não duplicar ranking (nome+setor) */
function keyify(s){
  return normalize(String(s || ""))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}
function individualDocId(name, sector){
  const n = keyify(name);
  const s = keyify(sector);
  return `n_${n}__s_${s}`;
}

/** =========================
 * Estado
 * ========================= */
let levelIndex = 0;
let fixedRuleIds = new Set();
let currentText = "";
let currentRules = [];
let levelLocked = false;

let score = 0;
let wrongCount = 0;
let correctCount = 0;
let hintsUsed = 0;

const taskScore = [0,0,0];
const taskCorrect = [0,0,0];
const taskWrong = [0,0,0];

const currentTextByLevel = ["", "", ""];
const correctedSegmentsByRule = new Map();

/** =========================
 * Review (final)
 * ========================= */
function openReviewModal(levelIdx){
  const block = explanations[levelIdx];
  if (!block) return;

  let html = `<h3 style="margin:0 0 10px">${escapeHtml(block.title)}</h3>
              <ul style="padding-left:18px; line-height:1.6">`;

  for (const item of block.items){
    html += `
      <li style="margin-bottom:10px">
        <strong>Erro:</strong> ${escapeHtml(item.wrong)}<br>
        <strong>Correção:</strong> ${escapeHtml(item.correct)}<br>
        <span class="muted">${escapeHtml(item.reason)}</span>
      </li>
    `;
  }
  html += `</ul>`;

  openModal({
    title: "Correções e justificativas",
    bodyHTML: html,
    buttons: [{ label:"Fechar", onClick: closeModal }]
  });
}

reviewBtn1?.addEventListener("click", () => openReviewModal(0));
reviewBtn2?.addEventListener("click", () => openReviewModal(1));
reviewBtn3?.addEventListener("click", () => openReviewModal(2));
reviewBtn?.addEventListener("click", () => openReviewModal(levelIndex));

/** =========================
 * HUD
 * ========================= */
function updateHUD(){
  const total = currentRules.length;
  const done = fixedRuleIds.size;

  if (remainingCount) remainingCount.textContent = String(total - done);
  if (totalFixEl) totalFixEl.textContent = String(total);

  if (wrongCountEl) wrongCountEl.textContent = String(wrongCount);
  if (scoreCountEl) scoreCountEl.textContent = String(score);

  const isDone = done >= total;
  nextLevelBtn?.classList.toggle("btn-disabled", !isDone);
  nextLevelBtn?.setAttribute("aria-disabled", String(!isDone));
}

/** =========================
 * Render
 * ========================= */
function findNextMatch(text, pos, rule){
  const re = ensureGlobal(rule.wrong);
  re.lastIndex = pos;
  const m = re.exec(text);
  if (!m) return null;
  return { index: m.index, text: m[0], len: m[0].length };
}

function tokenize(seg){
  const out = [];
  let buf = "";
  const flush = () => { if (buf){ out.push({t:"w", v:buf}); buf=""; } };

  for (let i=0;i<seg.length;i++){
    const ch = seg[i];
    if (ch === " " || ch === "\n" || ch === "\t"){
      flush();
      out.push({t:"s", v:ch});
      continue;
    }
    if (",.;:!?".includes(ch)){
      flush();
      out.push({t:"p", v:ch});
      continue;
    }
    buf += ch;
  }
  flush();
  return out;
}

function appendPlain(frag, seg){
  const tokens = tokenize(seg);
  for (const t of tokens){
    if (t.t === "s" || t.t === "p"){
      frag.appendChild(document.createTextNode(t.v));
      continue;
    }
    const span = document.createElement("span");
    span.className = "token";
    span.textContent = t.v;
    span.dataset.kind = "plain";
    span.addEventListener("click", () => onPlainClick(span));
    frag.appendChild(span);
  }
}

function appendCorrected(frag, seg){
  const tokens = tokenize(seg);
  for (const t of tokens){
    if (t.t === "s" || t.t === "p"){
      frag.appendChild(document.createTextNode(t.v));
      continue;
    }
    const span = document.createElement("span");
    span.className = "token corrected";
    span.textContent = t.v;
    span.dataset.kind = "corrected";
    span.addEventListener("click", () => onLockedTextClick());
    frag.appendChild(span);
  }
}

function renderMessage(){
  if (!messageArea) return;
  messageArea.classList.remove("show");
  messageArea.innerHTML = "";

  const frag = document.createDocumentFragment();
  const text = currentText;

  const correctedSegs = [];
  for (const info of correctedSegmentsByRule.values()){
    correctedSegs.push({ start: info.start, end: info.start + info.lenNew });
  }
  correctedSegs.sort((a,b)=>a.start-b.start);

  let pos = 0;
  const nextCorrected = (p) => correctedSegs.find(s => s.start >= p) || null;

  while (pos < text.length){
    const cseg = nextCorrected(pos);

    if (cseg && cseg.start === pos){
      appendCorrected(frag, text.slice(cseg.start, cseg.end));
      pos = cseg.end;
      continue;
    }

    const limit = cseg ? cseg.start : text.length;

    if (levelLocked){
      appendPlain(frag, text.slice(pos, limit));
      pos = limit;
      continue;
    }

    let best = null;
    let bestRule = null;
    for (const rule of currentRules){
      if (fixedRuleIds.has(rule.id)) continue;
      const m = findNextMatch(text, pos, rule);
      if (!m) continue;
      if (m.index >= limit) continue;
      if (!best || m.index < best.index){
        best = m;
        bestRule = rule;
      }
    }

    if (!best){
      appendPlain(frag, text.slice(pos, limit));
      pos = limit;
      continue;
    }

    if (best.index > pos){
      appendPlain(frag, text.slice(pos, best.index));
    }

    const span = document.createElement("span");
    span.className = "token" + (",.;:!?".includes(best.text) ? " punct" : "");
    span.textContent = best.text;
    span.dataset.kind = "error";
    span.dataset.ruleid = bestRule.id;
    span.dataset.start = String(best.index);
    span.dataset.len = String(best.len);
    span.addEventListener("click", () => onErrorClick(span, bestRule));
    frag.appendChild(span);

    pos = best.index + best.len;
  }

  messageArea.appendChild(frag);
  requestAnimationFrame(() => messageArea.classList.add("show"));
}

/** =========================
 * Interação / correção
 * ========================= */
function addScore(delta, anchorEl=null){
  score += delta;
  taskScore[levelIndex] += delta;
  showScoreFloat(delta, anchorEl);
}

function registerWrong(anchorEl=null){
  wrongCount += 1;
  taskWrong[levelIndex] += 1;
  addScore(SCORE_RULES.wrong, anchorEl);
}

function registerCorrect(anchorEl=null){
  correctCount += 1;
  taskCorrect[levelIndex] += 1;
  addScore(SCORE_RULES.correct, anchorEl);
}

function registerAutoCorrect(anchorEl=null){
  correctCount += 1;
  taskCorrect[levelIndex] += 1;
  autoUsed += 1;
  addScore(SCORE_RULES.auto, anchorEl);
}

function onLockedTextClick(){
  openModal({
    title: "Tudo certinho!",
    bodyHTML: `<p>A tarefa já foi finalizada e o texto está todo certinho! Parabéns! Avance para a próxima tarefa para continuar a sua missão natalina.</p>`,
    buttons: [{ label:"Ok", onClick: closeModal }]
  });
}

function onPlainClick(span){
  if (levelLocked){
    onLockedTextClick();
    return;
  }

  if (span.dataset.misclick !== "1"){
    span.dataset.misclick = "1";
    span.classList.add("error");
    registerWrong(span);
    updateHUD();
  }

  openModal({
    title: "Revisão",
    bodyHTML: `<p><strong>Hmmm…</strong> Esse trecho já está correto.</p>`,
    buttons: [{ label:"Entendi", onClick: closeModal }]
  });
}

function applyReplacementAt(start, len, replacement){
  const before = currentText.slice(0, start);
  const after = currentText.slice(start + len);
  currentText = before + replacement + after;

  const delta = replacement.length - len;
  for (const info of correctedSegmentsByRule.values()){
    if (info.start > start){
      info.start += delta;
    }
  }
}

function markCorrected(ruleId, start, newText){
  correctedSegmentsByRule.set(ruleId, { start, lenNew: newText.length });
}

function confirmCommaRemoval(errSpan, rule){
  const start = Number(errSpan.dataset.start);
  const len = Number(errSpan.dataset.len);

  applyReplacementAt(start, len, "");
  fixedRuleIds.add(rule.id);
  registerCorrect(errSpan);

  renderMessage();
  finalizeIfDone();
}

function confirmTyped(errSpan, rule){
  const typed = document.getElementById("fixInput")?.value ?? "";
  const expected = rule.correct;

  const ok = expected === ""
    ? typed.trim() === ""
    : normalize(typed) === normalize(expected);

  if (!ok){
    registerWrong(errSpan);
    updateHUD();

    openModal({
      title: "Ops!",
      bodyHTML: `<p>Ops, você errou. O correto seria <strong>${escapeHtml(expected === "" ? "(remover)" : expected)}</strong>.</p>`,
      buttons: [{ label:"Ok", onClick: closeModal }]
    });
    return;
  }

  const start = Number(errSpan.dataset.start);
  const len = Number(errSpan.dataset.len);

  applyReplacementAt(start, len, expected);
  fixedRuleIds.add(rule.id);

  if (expected !== "") markCorrected(rule.id, start, expected);

  registerCorrect(errSpan);
  closeModal();
  renderMessage();
  finalizeIfDone();
}

function onErrorClick(errSpan, rule){
  if (levelLocked){
    onLockedTextClick();
    return;
  }

  const wrongText = errSpan.textContent || "";
  const expected = rule.correct;

  if (expected === "" && wrongText === ","){
    openModal({
      title: "Remover vírgula",
      bodyHTML: `<p>Você quer <strong>remover</strong> esta vírgula?</p>`,
      buttons: [
        { label:"Cancelar", variant:"ghost", onClick: closeModal },
        { label:"Remover", onClick: () => { closeModal(); confirmCommaRemoval(errSpan, rule); } }
      ]
    });
    return;
  }

  openModal({
    title: `Corrigir (${rule.label})`,
    bodyHTML: `
      <p>Trecho selecionado:</p>
      <p style="margin:8px 0 0"><strong>${escapeHtml(wrongText)}</strong></p>

      <p style="margin:12px 0 6px">Digite a forma correta:</p>
      <input class="input" id="fixInput" type="text" autocomplete="off" placeholder="${expected === "" ? "Deixe em branco para remover" : "Digite aqui..."}" />

      <p class="muted" style="margin:10px 0 0">Erros podem ser de acentuação, ortografia, gramática, pontuação etc.</p>
    `,
    buttons: [
      { label:"Confirmar correção", onClick: () => confirmTyped(errSpan, rule) }
    ]
  });

  setTimeout(() => document.getElementById("fixInput")?.focus(), 30);
}

function finalizeIfDone(){
  updateHUD();
  const done = fixedRuleIds.size >= currentRules.length;
  if (done){
    levelLocked = true;
    renderMessage();
    nextLevelBtn?.classList.remove("btn-disabled");
    nextLevelBtn?.setAttribute("aria-disabled", "false");
  }
}

/** =========================
 * Auto-fix (1 correção por clique)
 * ========================= */
function autoFixOne(){
  if (levelLocked){
    onLockedTextClick();
    return;
  }

  const rule = currentRules.find(r => !fixedRuleIds.has(r.id));
  if (!rule){
    openModal({
      title: "Tudo certo!",
      bodyHTML: `<p>Você já corrigiu tudo neste nível ✅</p>`,
      buttons: [{ label:"Fechar", onClick: closeModal }]
    });
    return;
  }

  const m = findNextMatch(currentText, 0, rule);
  if (!m){
    fixedRuleIds.add(rule.id);
    finalizeIfDone();
    return;
  }

  const start = m.index;
  const len = m.len;
  const expected = rule.correct;

  applyReplacementAt(start, len, expected);
  fixedRuleIds.add(rule.id);
  if (expected !== "") markCorrected(rule.id, start, expected);

  registerAutoCorrect(autoFixBtn);
  renderMessage();
  finalizeIfDone();
}

autoFixBtn?.addEventListener("click", () => {
  if (levelLocked){
    onLockedTextClick();
    return;
  }

  openModal({
    title: "Correção automática",
    bodyHTML: `
      <p>Se você usar a correção automática, você perde <strong>${Math.abs(SCORE_RULES.auto)}</strong> pontos.</p>
      <p class="muted" style="margin-top:10px">Deseja continuar?</p>
    `,
    buttons: [
      { label:"Cancelar", variant:"ghost", onClick: closeModal },
      { label:"Sim, corrigir", onClick: () => { closeModal(); autoFixOne(); } }
    ]
  });
});

/** =========================
 * Próximo nível / Finalizar
 * ========================= */
nextLevelBtn?.addEventListener("click", async () => {
  const done = fixedRuleIds.size >= currentRules.length;
  const isLast = levelIndex === (levels.length - 1);

  if (!done){
    openModal({
      title: "Você ainda não concluiu o nível",
      bodyHTML: `<p>Você ainda não concluiu o nível. Se avançar sem concluí-lo perderá <strong>5</strong> pontos. Tem certeza que deseja prosseguir?</p>`,
      buttons: [
        { label:"Cancelar", variant:"ghost", onClick: closeModal },
        { label:"Prosseguir", onClick: async () => { closeModal(); await skipLevel(); } }
      ]
    });
    return;
  }

  currentTextByLevel[levelIndex] = currentText;

  if (isLast){
    await finishMission();
    return;
  }

  levelIndex += 1;
  startLevel();
});

async function skipLevel(){
  addScore(SCORE_RULES.skip, nextLevelBtn);
  currentTextByLevel[levelIndex] = currentText;
  await goNext();
}

async function finishMission(){
  try {
    await maybeCommitMissionToRanking();
    await commitIndividualRanking();
  } catch (err) {
    console.error("Falha ao salvar ranking:", err);
  } finally {
    showFinal();
  }
}

async function goNext(){
  levelIndex += 1;
  if (levelIndex < levels.length){
    startLevel();
    return;
  }
  try {
    await maybeCommitMissionToRanking();
    await commitIndividualRanking();
  } catch (err) {
    console.error("Falha ao salvar ranking:", err);
  } finally {
    showFinal();
  }
}

/** =========================
 * Cola
 * ========================= */
hintBtn?.addEventListener("click", () => {
  if (levelLocked){
    onLockedTextClick();
    return;
  }

  const remaining = currentRules.filter(r => !fixedRuleIds.has(r.id));
  if (remaining.length === 0){
    openModal({
      title: "Cola",
      bodyHTML: `<p>Você já corrigiu tudo neste nível! ✅</p>`,
      buttons: [{ label:"Fechar", onClick: closeModal }]
    });
    return;
  }

  hintsUsed += 1;
  addScore(SCORE_RULES.hint, hintBtn);

  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  const msg = pick.correct === ""
    ? `Procure um sinal que deve ser removido (pontuação indevida).`
    : `Procure um trecho que deve virar: <strong>${escapeHtml(pick.correct)}</strong>.`;

  openModal({
    title: "Me dê uma cola!",
    bodyHTML: `<p>${msg}</p><p class="muted" style="margin-top:10px">Colas têm custo de ${SCORE_RULES.hint} ponto.</p>`,
    buttons: [{ label:"Entendi", onClick: closeModal }]
  });

  updateHUD();
});

/** =========================
 * Final
 * ========================= */
function buildFinalColoredHTML(levelDef, userText){
  const text = String(userText ?? "");
  let html = escapeHtml(text);

  for (const rule of levelDef.rules){
    const reWrong = ensureGlobal(rule.wrong);
    html = html.replace(reWrong, (m) => `<span class="final-wrong">${escapeHtml(m)}</span>`);
  }

  for (const rule of levelDef.rules){
    const c = String(rule.correct ?? "");
    if (!c) continue;
    const safe = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const reCorrect = new RegExp(safe, "g");
    html = html.replace(reCorrect, (m) => `<span class="final-correct">${escapeHtml(m)}</span>`);
  }

  return html;
}

function showFinal(){
  const name = getUserName();
  const finalStatGrid = document.getElementById("finalStatGrid");
  const epigraphBox = document.getElementById("epigraphBox");

  if (epigraphBox){
    epigraphBox.innerHTML = `
      <blockquote>
        “A luta contra o erro tipográfico tem algo de homérico. Durante a revisão os erros se escondem, fazem-se positivamente invisíveis.
        Mas, assim que o texto é publicado, tornam-se visibilíssimos, verdadeiros sacis a nos botar a língua em todas as páginas.”
      </blockquote>
      <div class="who">Monteiro Lobato</div>
    `;
  }

  if (finalRecado) finalRecado.innerHTML = "";

  if (finalCongrats){
    finalCongrats.textContent =
      `Parabéns, ${name}! Você ajudou o editor-chefe a publicar a mensagem de Natal no prazo!`;
  }

  const optOut = localStorage.getItem("mission_optout_ranking") === "1";
  if (finalStatGrid){
    finalStatGrid.innerHTML = `
      <div class="stat-card"><p class="stat-k">Pontos</p><p class="stat-v">${score}</p></div>
      <div class="stat-card"><p class="stat-k">Acertos</p><p class="stat-v">${correctCount}</p></div>
      <div class="stat-card"><p class="stat-k">Erros</p><p class="stat-v">${wrongCount}</p></div>
      <div class="stat-card"><p class="stat-k">Ranking</p><p class="stat-v">${optOut ? "Não" : "Sim"}</p></div>
    `;
  } else if (finalStats){
    finalStats.textContent = `Pontos: ${score} | Acertos: ${correctCount} | Erros: ${wrongCount}`;
  }

  // render textos
  if (finalBox1) finalBox1.innerHTML = `<p style="margin:0">${buildFinalColoredHTML(levels[0], currentTextByLevel[0] || levels[0].raw)}</p>`;
  if (finalBox2) finalBox2.innerHTML = `<p style="margin:0">${buildFinalColoredHTML(levels[1], currentTextByLevel[1] || levels[1].raw)}</p>`;
  if (finalBox3) finalBox3.innerHTML = `<p style="margin:0">${buildFinalColoredHTML(levels[2], currentTextByLevel[2] || levels[2].raw)}</p>`;

  // ✅ esconder caixas + botão para abrir
  finalBox1?.classList.add("hidden");
  finalBox2?.classList.add("hidden");
  finalBox3?.classList.add("hidden");

  if (finalRecado){
    finalRecado.innerHTML = `
      <div class="final-toggle">
        <button class="btn" id="toggleFinalBoxes" type="button" aria-expanded="false">
          Ver as mensagens que você corrigiu
        </button>
        <button class="btn ghost" id="hideFinalBoxes" type="button" aria-expanded="true" style="display:none">
          Ocultar mensagens
        </button>
      </div>
    `;

    setTimeout(() => {
      const btnShow = document.getElementById("toggleFinalBoxes");
      const btnHide = document.getElementById("hideFinalBoxes");

      const showBoxes = () => {
        finalBox1?.classList.remove("hidden");
        finalBox2?.classList.remove("hidden");
        finalBox3?.classList.remove("hidden");
        btnShow?.setAttribute("aria-expanded","true");
        if (btnHide) btnHide.style.display = "inline-flex";
      };

      const hideBoxes = () => {
        finalBox1?.classList.add("hidden");
        finalBox2?.classList.add("hidden");
        finalBox3?.classList.add("hidden");
        btnShow?.setAttribute("aria-expanded","false");
        if (btnHide) btnHide.style.display = "none";
      };

      btnShow?.addEventListener("click", showBoxes);
      btnHide?.addEventListener("click", hideBoxes);
    }, 0);
  }

  if (headerTitle) headerTitle.textContent = "Missão concluída 🎄";
  showOnly(screenFinal);
}

restartBtn?.addEventListener("click", () => showOnly(screenForm));

/** =========================
 * Início / nível
 * ========================= */
startBtn?.addEventListener("click", () => {
  const name = getUserName();
  const sector = getUserSector();

  if (!name){
    openModal({ title:"Atenção", bodyHTML:`<p>Por favor, informe seu nome.</p>`, buttons:[{label:"Ok", onClick: closeModal}] });
    return;
  }
  if (!sector){
    openModal({ title:"Atenção", bodyHTML:`<p>Por favor, selecione seu setor.</p>`, buttons:[{label:"Ok", onClick: closeModal}] });
    return;
  }

  localStorage.setItem("mission_name", name);
  localStorage.setItem("mission_sector", sector);

  levelIndex = 0;

  score = 0;
  wrongCount = 0;
  correctCount = 0;
  hintsUsed = 0;
  autoUsed = 0;

  taskScore[0]=taskScore[1]=taskScore[2]=0;
  taskCorrect[0]=taskCorrect[1]=taskCorrect[2]=0;
  taskWrong[0]=taskWrong[1]=taskWrong[2]=0;

  currentTextByLevel[0] = currentTextByLevel[1] = currentTextByLevel[2] = "";

  openModal({
    title: "Pontuação da missão",
    bodyHTML: `
      <ul style="margin:0; padding-left:18px; color:rgba(255,255,255,.78); line-height:1.7">
        <li>Correção correta: <strong>+${SCORE_RULES.correct}</strong></li>
        <li>Correção incorreta: <strong>${SCORE_RULES.wrong}</strong></li>
        <li>Avançar sem concluir: <strong>${SCORE_RULES.skip}</strong></li>
        <li>Colas utilizadas: <strong>${SCORE_RULES.hint}</strong></li>
        <li>Correção automática: <strong>${SCORE_RULES.auto}</strong></li>
      </ul>
    `,
    buttons: [{ label:"Começar", onClick: () => { closeModal(); showOnly(screenGame); startLevel(); } }]
  });
});

function startLevel(){
  const lvl = levels[levelIndex];

  fixedRuleIds = new Set();
  currentText = lvl.raw;
  currentRules = lvl.rules;

  correctedSegmentsByRule.clear();
  levelLocked = false;

  if (headerTitle) headerTitle.textContent = `Revisão da Mensagem de Natal — ${lvl.name}`;
  if (levelLabel) levelLabel.textContent = lvl.name;
  if (instruction) instruction.textContent = lvl.instruction;

  if (nextLevelBtn){
    nextLevelBtn.textContent = (levelIndex === levels.length - 1)
      ? "Finalizar tarefa natalina"
      : "Próximo nível";
  }

  updateHUD();
  renderMessage();

  openModal({
    title: `🎅 ${lvl.name}`,
    bodyHTML: `
      <p style="white-space:pre-line">${escapeHtml(lvl.intro)}</p>
      <p class="muted" style="margin-top:12px">Os erros serão explicados e detalhados ao término da atividade.</p>
    `,
    buttons: [{ label:"Entendi", onClick: closeModal }]
  });
}

/** =========================
 * Ranking (abas + individual + setor)
 * ========================= */
rankingBtn?.addEventListener("click", () => openRankingModal());
finalRankingBtn?.addEventListener("click", () => openRankingModal());

async function maybeCommitMissionToRanking(){
  const optOut = localStorage.getItem("mission_optout_ranking") === "1";
  if (optOut) return;

  const sector = getUserSector();
  if (!sector) return;

  const ref = doc(db, "sectorStats", sector);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists() ? snap.data() : {
      missions: 0,
      totalOverall: 0,
      totalT1: 0,
      totalT2: 0,
      totalT3: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalAuto: 0
    };

    tx.set(ref, {
      missions: (d.missions || 0) + 1,
      totalOverall: (d.totalOverall || 0) + score,
      totalT1: (d.totalT1 || 0) + (taskScore?.[0] || 0),
      totalT2: (d.totalT2 || 0) + (taskScore?.[1] || 0),
      totalT3: (d.totalT3 || 0) + (taskScore?.[2] || 0),
      totalCorrect: (d.totalCorrect || 0) + correctCount,
      totalWrong: (d.totalWrong || 0) + wrongCount,
      totalAuto: (d.totalAuto || 0) + (autoUsed || 0),
      updatedAt: serverTimestamp()
    }, { merge:true });
  });
}

/* ✅ sem duplicar: 1 doc por nome+setor (sobrescreve se score maior) */
async function commitIndividualRanking(){
  const optOut = localStorage.getItem("mission_optout_ranking") === "1";
  if (optOut) return;

  const name = clampName(getUserName());
  const sector = getUserSector();
  if (!name || !sector) return;

  const id = individualDocId(name, sector);
  const ref = doc(db, "individualRanking", id);

  const snap = await getDoc(ref);
  const prevScore = snap.exists() ? Number(snap.data()?.score || 0) : -Infinity;

  if (score < prevScore) return;

  await setDoc(ref, {
    name,
    sector,
    score,
    correct: correctCount,
    wrong: wrongCount,
    createdAt: serverTimestamp()
  }, { merge:true });
}

async function openRankingModal(){
  openModal({
    title: "🏆 Ranking",
    bodyHTML: `
      <div class="ranking-tabs" id="rankingTabs">
        <button class="ranking-tab active" data-tab="ind">🧑 Individual</button>
        <button class="ranking-tab" data-tab="sec">🏢 Por setor</button>
      </div>

      <div class="ranking-panel show" id="panel-ind">
        <p class="muted" style="margin-top:0">Carregando ranking individual…</p>
      </div>

      <div class="ranking-panel" id="panel-sec">
        <p class="muted" style="margin-top:0">Carregando ranking por setor…</p>
      </div>

      <p class="muted" style="margin-top:12px">
        Ranking individual exibe nomes apenas de quem optou por participar. Ranking por setor é agregado (LGPD).
      </p>
    `,
    buttons: [{ label:"Fechar", onClick: closeModal }]
  });

  // tabs
  setTimeout(() => {
    const wrap = document.getElementById("rankingTabs");
    const btns = wrap?.querySelectorAll(".ranking-tab");
    const ind = document.getElementById("panel-ind");
    const sec = document.getElementById("panel-sec");

    btns?.forEach(b => {
      b.addEventListener("click", () => {
        btns.forEach(x => x.classList.remove("active"));
        b.classList.add("active");

        const tab = b.dataset.tab;
        if (tab === "ind"){
          ind?.classList.add("show");
          sec?.classList.remove("show");
        } else {
          sec?.classList.add("show");
          ind?.classList.remove("show");
        }
      });
    });
  }, 0);

  await Promise.allSettled([renderIndividualRanking(), renderSectorRanking()]);
}

async function renderIndividualRanking(){
  const panel = document.getElementById("panel-ind");
  if (!panel) return;

  try {
const q = query(
  collection(db, "individualRanking"),
  orderBy("score", "desc"),
  limit(50)
);

const snap = await getDocs(q);

const rows = [];
snap.forEach(docu => {
  const d = docu.data() || {};
  rows.push({
    name: String(d.name || "").trim(),
    sector: String(d.sector || "").trim(),
    score: Number(d.score || 0),
    correct: Number(d.correct || 0),
    wrong: Number(d.wrong || 0),
    // createdAt pode vir undefined; guardo como number pra ordenar
    createdAtMs: d.createdAt?.toMillis ? d.createdAt.toMillis() : 0
  });
});

// desempate no cliente (não exige índice composto)
rows.sort((a,b) =>
  (b.score - a.score) ||
  (a.createdAtMs - b.createdAtMs) ||
  a.name.localeCompare(b.name)
);

    if (rows.length === 0){
      panel.innerHTML = `<p class="muted">Ainda não há resultados no ranking individual.</p>`;
      return;
    }

    panel.innerHTML = `
      <div style="overflow:auto; border-radius:14px">
        <table class="rank-table">
          <thead>
            <tr>
              <th style="width:56px">#</th>
              <th>Nome</th>
              <th class="num">Pontos</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r,i) => {
              const m = medalFor(i);
              const delay = Math.min(i * 30, 420);
              return `
                <tr class="rank-row" style="animation-delay:${delay}ms">
                  <td>
                    <span class="medal ${m.top ? "top":""}">${m.t}</span>
                  </td>
                  <td>
                    <span class="rank-name">${escapeHtml(r.name || "—")}</span>
                    <span class="rank-sub">${escapeHtml(r.sector || "")}</span>
                  </td>
                  <td class="num"><strong>${r.score}</strong></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error("Ranking individual falhou:", err);
    panel.innerHTML = `
      <p>Não foi possível carregar o ranking individual.</p>
      <p class="muted"><code>${escapeHtml(err?.message || String(err))}</code></p>
      <p class="muted">Se aparecer erro de índice, crie o índice sugerido pelo Firebase Console (score desc + createdAt asc).</p>
    `;
  }
}

async function renderSectorRanking(){
  const panel = document.getElementById("panel-sec");
  if (!panel) return;

  try {
    const sectors = SECTORS.filter(s => s !== "Selecione…");
    const map = new Map();

    try {
      const snapAll = await getDocs(collection(db, "sectorStats"));
      snapAll.forEach(d => map.set(d.id, d.data()));
    } catch {
      // fallback via getDoc por setor
    }

    const rows = [];
    for (const s of sectors){
      let d = map.get(s);
      if (!d){
        const ref = doc(db, "sectorStats", s);
        const snap = await getDoc(ref);
        d = snap.exists() ? snap.data() : null;
      }

      const missions = Number(d?.missions || 0);
      const avg = (num) => missions ? (Number(num || 0) / missions) : 0;

      rows.push({
        sector: s,
        avgT1: avg(d?.totalT1),
        avgT2: avg(d?.totalT2),
        avgT3: avg(d?.totalT3),
        avgOverall: avg(d?.totalOverall),
        avgCorrect: avg(d?.totalCorrect),
        avgWrong: avg(d?.totalWrong),
      });
    }

    const hasAny = rows.some(r => r.avgOverall !== 0 || r.avgCorrect !== 0 || r.avgWrong !== 0);
    if (!hasAny){
      panel.innerHTML = `<p class="muted">Ainda não há dados suficientes para o ranking por setor.</p>`;
      return;
    }

    rows.sort((a,b) =>
      b.avgOverall - a.avgOverall ||
      b.avgCorrect - a.avgCorrect ||
      a.avgWrong - b.avgWrong
    );

    panel.innerHTML = `
      <div style="overflow:auto; border-radius:14px">
        <table class="rank-table">
          <thead>
            <tr>
              <th style="width:56px">#</th>
              <th>Setor</th>
              <th class="num">Ativ. 1</th>
              <th class="num">Ativ. 2</th>
              <th class="num">Ativ. 3</th>
              <th class="num">Média geral</th>
              <th class="num">Acertos</th>
              <th class="num">Erros</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r,i) => {
              const m = medalFor(i);
              const delay = Math.min(i * 30, 420);
              return `
                <tr class="rank-row" style="animation-delay:${delay}ms">
                  <td><span class="medal ${m.top ? "top":""}">${m.t}</span></td>
                  <td><span class="rank-name">${escapeHtml(r.sector)}</span></td>
                  <td class="num">${r.avgT1.toFixed(2)}</td>
                  <td class="num">${r.avgT2.toFixed(2)}</td>
                  <td class="num">${r.avgT3.toFixed(2)}</td>
                  <td class="num"><strong>${r.avgOverall.toFixed(2)}</strong></td>
                  <td class="num">${r.avgCorrect.toFixed(2)}</td>
                  <td class="num">${r.avgWrong.toFixed(2)}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error("Ranking setor falhou:", err);
    panel.innerHTML = `
      <p>Não foi possível carregar o ranking por setor.</p>
      <p class="muted"><code>${escapeHtml(err?.message || String(err))}</code></p>
    `;
  }
}

/** =========================
 * Personalização (paleta + intensidade + neve/renas)
 * ========================= */
customizeBtn?.addEventListener("click", openCustomizeModal);
openCustomizeInline?.addEventListener("click", openCustomizeModal);

const THEME_PRESETS = {
  classic: { name:"Clássico", accent:"#e53935", bg:"#0b1020" },
  candy:   { name:"Candy Cane", accent:"#ff2e63", bg:"#140a12" },
  neon:    { name:"Neon Noel", accent:"#00ffd5", bg:"#001016" },
  aurora:  { name:"Aurora", accent:"#7c4dff", bg:"#071022" },
  gold:    { name:"Dourado", accent:"#ffcc00", bg:"#140f02" },
};

function saveTheme(obj){ localStorage.setItem("mission_theme", JSON.stringify(obj)); }
function loadTheme(){
  try {
    return JSON.parse(localStorage.getItem("mission_theme")||"null") || {
      snow:true, reindeer:true, preset:"classic", intensity: 1
    };
  } catch {
    return { snow:true, reindeer:true, preset:"classic", intensity: 1 };
  }
}

function toggleHTML(id, title, subtitle, checked){
  return `
    <div class="toggle-row">
      <div class="toggle-text">
        <b>${escapeHtml(title)}</b>
        <small class="muted">${escapeHtml(subtitle)}</small>
      </div>
      <label class="switch" aria-label="${escapeHtml(title)}">
        <input type="checkbox" id="${id}" ${checked ? "checked":""}/>
        <span class="slider"></span>
      </label>
    </div>
  `;
}

function openCustomizeModal(){
  const saved = loadTheme();

  const presetOptions = Object.entries(THEME_PRESETS).map(([k,v]) =>
    `<option value="${k}" ${saved.preset === k ? "selected":""}>${escapeHtml(v.name)}</option>`
  ).join("");

  openModal({
    title: "⚙️ Personalizar página",
    bodyHTML: `
      <p class="muted">As alterações são aplicadas imediatamente.</p>

      <div style="display:grid; gap:10px; margin-top:12px">
        ${toggleHTML("optSnow","Neve","Clima clássico de Natal", saved.snow)}
        ${toggleHTML("optReindeer","Renas","Várias renas passando", saved.reindeer)}
      </div>

      <hr style="border:0; border-top:1px solid rgba(255,255,255,.12); margin:14px 0"/>

      <div style="display:grid; gap:10px">
        <div>
          <b>Paleta</b>
          <div class="muted" style="margin:2px 0 8px">Escolha uma cor principal.</div>
          <select class="input" id="optPreset">${presetOptions}</select>
        </div>

        <div>
          <b>Intensidade</b>
          <div class="muted" style="margin:2px 0 8px">Quanto mais alto, mais vivo.</div>
          <input id="optIntensity" type="range" min="0.8" max="1.6" step="0.05" value="${saved.intensity ?? 1}" style="width:100%"/>
        </div>
      </div>
    `,
    buttons: [{ label:"Fechar", onClick: closeModal }]
  });

  setTimeout(() => {
    const optSnow = document.getElementById("optSnow");
    const optReindeer = document.getElementById("optReindeer");
    const optPreset = document.getElementById("optPreset");
    const optIntensity = document.getElementById("optIntensity");

    const applyNow = () => {
      const cfg = {
        snow: !!optSnow?.checked,
        reindeer: !!optReindeer?.checked,
        preset: optPreset?.value || "classic",
        intensity: Number(optIntensity?.value || 1),
      };
      applyTheme(cfg);
      saveTheme(cfg);
    };

    optSnow?.addEventListener("change", applyNow);
    optReindeer?.addEventListener("change", applyNow);
    optPreset?.addEventListener("change", applyNow);
    optIntensity?.addEventListener("input", applyNow);

    applyNow();
  }, 0);
}

let reindeerTimer = null;

function applyTheme({ snow, reindeer, preset="classic", intensity=1 }){
  const p = THEME_PRESETS[preset] || THEME_PRESETS.classic;
  const root = document.documentElement;
  root.style.setProperty("--accent", p.accent);
  root.style.setProperty("--bg", p.bg);
  root.style.setProperty("--intensity", String(intensity));

  const snowCanvas = document.getElementById("snow");
  if (snowCanvas) snowCanvas.style.display = snow ? "block" : "none";

  if (reindeer){
    reindeerLayer?.classList.remove("hidden");
    startReindeer();
  } else {
    stopReindeer();
    reindeerLayer?.classList.add("hidden");
  }
}

function startReindeer(){
  if (!reindeerLayer) return;
  reindeerLayer.innerHTML = "";
  spawnReindeerWave();
  if (reindeerTimer) clearInterval(reindeerTimer);
  reindeerTimer = setInterval(spawnReindeerWave, 3200);
}

function stopReindeer(){
  if (reindeerTimer) clearInterval(reindeerTimer);
  reindeerTimer = null;
  if (reindeerLayer) reindeerLayer.innerHTML = "";
}

function spawnReindeerWave(){
  if (!reindeerLayer) return;
  const emojis = ["🦌","🦌","🦌","🛷","🦌"];
  const count = 8;
  for (let i=0;i<count;i++){
    const d = document.createElement("div");
    d.className = "reindeer";
    d.textContent = emojis[Math.floor(Math.random()*emojis.length)];
    d.style.setProperty("--y", `${Math.floor(Math.random()*75)+5}vh`);
    d.style.fontSize = `${22 + Math.random()*18}px`;
    d.style.animationDuration = `${7.5 + Math.random()*6.0}s`;
    d.style.animationDelay = `${Math.random()*1.2}s`;
    reindeerLayer.appendChild(d);
    const ttl = parseFloat(d.style.animationDuration) * 1000 + 1500;
    setTimeout(() => d.remove(), ttl);
  }
}

/** =========================
 * Neve
 * ========================= */
(function snowInit(){
  const canvas = document.getElementById("snow");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let w, h, dpr;
  const flakes = [];
  const FLAKES = 160;

  function resize(){
    dpr = Math.max(1, window.devicePixelRatio || 1);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const rand = (min,max)=>Math.random()*(max-min)+min;
  function makeFlake(){
    return { x: rand(0,w), y: rand(-h,0), r: rand(1.2,4.0), vy: rand(0.7,2.4), vx: rand(-0.6,0.8), sway: rand(0.002,0.014), phase: rand(0, Math.PI*2) };
  }
  function refill(){
    flakes.length = 0;
    for (let i=0;i<FLAKES;i++) flakes.push(makeFlake());
  }
  function tick(){
    ctx.clearRect(0,0,w,h);
    for (const f of flakes){
      f.phase += f.sway*60;
      f.x += f.vx + Math.sin(f.phase)*0.4;
      f.y += f.vy;
      if (f.y > h+10){ f.y = rand(-40,-10); f.x = rand(0,w); }
      if (f.x < -10) f.x = w+10;
      if (f.x > w+10) f.x = -10;

      ctx.beginPath();
      ctx.arc(f.x,f.y,f.r,0,Math.PI*2);
      ctx.fillStyle = "rgba(255,255,255,0.90)";
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", ()=>{ resize(); refill(); });
  resize(); refill(); tick();
})();

/** =========================
 * Setores + optRanking + boot
 * ========================= */
function populateSectors(){
  if (!userSectorEl) return;
  userSectorEl.innerHTML = "";
  for (const s of SECTORS){
    const opt = document.createElement("option");
    opt.value = s === "Selecione…" ? "" : s;
    opt.textContent = s;
    userSectorEl.appendChild(opt);
  }
}

function setupRankingToggle(){
  if (!optRankingEl) return;
  const savedOptOut = localStorage.getItem("mission_optout_ranking") === "1";
  optRankingEl.checked = !savedOptOut;

  optRankingEl.addEventListener("change", () => {
    localStorage.setItem("mission_optout_ranking", optRankingEl.checked ? "0" : "1");
  });
}

function getUserName(){
  return clampName((userNameEl?.value || localStorage.getItem("mission_name") || "").trim());
}
function getUserSector(){
  return (userSectorEl?.value || localStorage.getItem("mission_sector") || "").trim();
}

function showOnly(screen){
  for (const el of [screenLoading, screenForm, screenGame, screenFinal]){
    if (!el) continue;
    el.classList.toggle("hidden", el !== screen);
  }
}

/** =========================
 * LGPD modal (se existir botão)
 * ========================= */
lgpdMoreBtn?.addEventListener("click", () => {
  openModal({
    title: "LGPD — Informações sobre tratamento de dados",
    bodyHTML: `
      <p class="muted">Esta dinâmica é recreativa e foi criada para destacar a importância da revisão editorial.</p>
      <h3 style="margin:14px 0 6px">Quais dados são coletados?</h3>
      <ul style="margin:0; padding-left:18px; color:rgba(255,255,255,.74); line-height:1.6">
        <li><strong>Nome</strong>: exibido somente no ranking individual para quem optou por participar.</li>
        <li><strong>Setor</strong>: usado para consolidar o ranking por setor (agregado).</li>
      </ul>
      <h3 style="margin:14px 0 6px">Compartilhamento</h3>
      <p class="muted">Não há compartilhamento de informações pessoais no ranking por setor. Ele mostra apenas números por setor.</p>
    `,
    buttons: [{ label: "Fechar", onClick: closeModal }]
  });
});

// Boot
populateSectors();
setupRankingToggle();
applyTheme(loadTheme());

showOnly(screenLoading);
setTimeout(() => {
  showOnly(screenForm);
  if (userNameEl) userNameEl.value = localStorage.getItem("mission_name") || "";
  if (userSectorEl) userSectorEl.value = localStorage.getItem("mission_sector") || "";
}, 1100);
if (finalMsgsWrap) finalMsgsWrap.classList.add("hidden");
if (toggleFinalMsgsBtn) toggleFinalMsgsBtn.textContent = "Ver mensagens corrigidas";



