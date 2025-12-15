// js/main.js (module)

// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, doc, getDoc, runTransaction, serverTimestamp } from
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/* COLE AQUI O SEU firebaseConfig (o seu já está funcionando) */
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

/** Setores*/
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
  correct: +5,    // ✅ mudou para 5
  wrong: -3,
  skip: -5,
  hint: -1
};

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
    raw: `No Natal, se deve pensar no amor ao próximo e na importância da empatia. Aos pais, respeite-os; aos filhos, os ame; aos necessitados, ajude-os. Essas atitudes, reforçam os valores natalinos e mostram como a revisão textual é essencial para evitar ruídos na comunicação.`,
    rules: [
      { id:"d1", label:"Colocação pronominal", wrong:/No Natal,\s*se deve pensar/g, correct:"No Natal, deve-se pensar" },
      { id:"d2", label:"Colocação pronominal", wrong:/aos filhos,\s*os ame/gi, correct:"aos filhos, ame-os" },
      { id:"d3", label:"Pontuação", wrong:/(?<=\batitudes),/g, correct:"" },
    ]
  }
];

/** =========================
 *  Elementos
 *  ========================= */
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

const lightsEl = document.getElementById("lights");
const reindeerLayer = document.getElementById("reindeerLayer");

/** =========================
 *  Modal
 *  ========================= */
const overlay = document.getElementById("overlay");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalFoot = document.getElementById("modalFoot");
document.getElementById("closeModal").addEventListener("click", closeModal);
overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlay.classList.contains("hidden")) closeModal();
});

function openModal({ title, bodyHTML, buttons=[] }){
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHTML;
  modalFoot.innerHTML = "";
  for (const btn of buttons){
    const b = document.createElement("button");
    b.className = "btn" + (btn.variant ? ` ${btn.variant}` : "");
    b.textContent = btn.label;
    b.disabled = !!btn.disabled;
    b.addEventListener("click", btn.onClick);
    modalFoot.appendChild(b);
  }
  overlay.classList.remove("hidden");
  requestAnimationFrame(() => overlay.classList.add("show"));
}
function closeModal(){
  overlay.classList.remove("show");
  setTimeout(() => overlay.classList.add("hidden"), 180);
}
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

/** LGPD */
lgpdMoreBtn.addEventListener("click", () => {
  openModal({
    title: "LGPD — Informações sobre tratamento de dados",
    bodyHTML: `
      <p class="muted">Esta dinâmica é recreativa e foi criada para destacar a importância da revisão editorial.</p>
      <h3 style="margin:14px 0 6px">Quais dados são coletados?</h3>
      <ul style="margin:0; padding-left:18px; color:rgba(255,255,255,.74); line-height:1.6">
        <li><strong>Nome</strong>: usado apenas para exibir a mensagem de parabéns no final.</li>
        <li><strong>Setor</strong>: usado para consolidar o ranking de forma <strong>agregada por setor</strong>.</li>
      </ul>
      <h3 style="margin:14px 0 6px">Compartilhamento</h3>
      <p class="muted">Não há compartilhamento de informações pessoais no ranking. O ranking mostra apenas números por setor.</p>
    `,
    buttons: [{ label: "Fechar", onClick: closeModal }]
  });
});

/** =========================
 *  Estado
 *  ========================= */
let levelIndex = 0;
let fixedRuleIds = new Set();
let currentText = "";
let currentRules = [];

let levelLocked = false;

let score = 0;
let wrongCount = 0;
let correctCount = 0;
let hintsUsed = 0;

let missionValidForRanking = true; // vira false se pular nível sem concluir

// por tarefa (para ranking detalhado)
const taskScore = [0,0,0];
const taskCorrect = [0,0,0];
const taskWrong = [0,0,0];

const correctedHTMLByLevel = [];
const correctedSegmentsByRule = new Map(); // ruleId -> {start, lenNew}

/** =========================
 *  HUD
 *  ========================= */
function updateHUD(){
  const total = currentRules.length;
  const done = fixedRuleIds.size;
  remainingCount.textContent = String(total - done);
  totalFixEl.textContent = String(total);

  wrongCountEl.textContent = String(wrongCount);
  scoreCountEl.textContent = String(score);

  // botão “inativo visualmente” quando não concluiu
  const isDone = done >= total;
  nextLevelBtn.classList.toggle("btn-disabled", !isDone);
  nextLevelBtn.setAttribute("aria-disabled", String(!isDone));
}

/** =========================
 *  Render com marcação verde das correções feitas
 *  (sem destacar erros ao carregar)
 *  ========================= */
function ensureGlobal(re){
  const flags = re.flags.includes("g") ? re.flags : (re.flags + "g");
  return new RegExp(re.source, flags);
}

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
    if (t.t === "s"){
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
    if (t.t === "s"){
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
  messageArea.classList.remove("show");
  messageArea.innerHTML = "";

  const frag = document.createDocumentFragment();
  const text = currentText;

  // lista de segmentos “corrigidos” (para ficar verde)
  const correctedSegs = [];
  for (const [ruleId, info] of correctedSegmentsByRule.entries()){
    correctedSegs.push({ start: info.start, end: info.start + info.lenNew });
  }
  correctedSegs.sort((a,b)=>a.start-b.start);

  let pos = 0;

  const nextCorrected = (p) => correctedSegs.find(s => s.start >= p) || null;

  while (pos < text.length){
    // se nível travado, só renderiza tudo normal/corrigido, mas sem erros clicáveis
    const cseg = nextCorrected(pos);

    if (cseg && cseg.start === pos){
      appendCorrected(frag, text.slice(cseg.start, cseg.end));
      pos = cseg.end;
      continue;
    }

    // antes do próximo segmento corrigido, ainda pode ter erros (se não travado)
    const limit = cseg ? cseg.start : text.length;

    if (levelLocked){
      appendPlain(frag, text.slice(pos, limit));
      pos = limit;
      continue;
    }

    // procura próximo erro não corrigido
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
    span.className = "token";
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
 *  Interação / correção
 *  ========================= */
function addScore(delta){
  score += delta;
  taskScore[levelIndex] += delta;
}

function registerWrong(){
  wrongCount += 1;
  taskWrong[levelIndex] += 1;
  addScore(SCORE_RULES.wrong);
}

function registerCorrect(){
  correctCount += 1;
  taskCorrect[levelIndex] += 1;
  addScore(SCORE_RULES.correct);
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
    registerWrong();
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

  // atualiza posições dos segmentos já corrigidos
  const delta = replacement.length - len;
  for (const [rid, info] of correctedSegmentsByRule.entries()){
    if (info.start > start){
      info.start += delta;
    }
  }
}

function markCorrected(ruleId, start, newText){
  correctedSegmentsByRule.set(ruleId, { start, lenNew: newText.length });
}

function onErrorClick(errSpan, rule){
  if (levelLocked){
    onLockedTextClick();
    return;
  }

  const wrongText = errSpan.textContent || "";
  const expected = rule.correct;

  // ✅ vírgula indevida: confirmação de remoção
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

function confirmCommaRemoval(errSpan, rule){
  const start = Number(errSpan.dataset.start);
  const len = Number(errSpan.dataset.len);

  // Remove a vírgula do texto
  const before = currentText.slice(0, start);
  const after = currentText.slice(start + len);
  currentText = before + after;

  // Marca a regra como corrigida
  fixedRuleIds.add(rule.id);

  // Pontuação
  registerCorrect();

  // Fecha modal ANTES de re-renderizar
  closeModal();

  // Re-renderiza o texto
  renderMessage();

  // Verifica se terminou o nível
  finalizeIfDone();
}


function confirmTyped(errSpan, rule){
  const typed = document.getElementById("fixInput")?.value ?? "";
  const expected = rule.correct;

  const ok = expected === ""
    ? typed.trim() === ""
    : normalize(typed) === normalize(expected);

  if (!ok){
    registerWrong();
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

// Remover a vírgula do texto sem marcar
if (expected === "") {
  // No caso de remoção de pontuação (vírgula), apenas faz a remoção
  applyReplacementAt(start, len, ""); // Remover a vírgula
} else {
  // Para qualquer outro tipo de correção, marca como corrigido
  markCorrected(rule.id, start, expected);
}

  registerCorrect();

  closeModal();
  renderMessage();
  finalizeIfDone();
}

function finalizeIfDone(){
  updateHUD();

  const done = fixedRuleIds.size >= currentRules.length;
  if (done){
    levelLocked = true;
    renderMessage(); // re-render travado (só verde/normal, sem erros clicáveis)

    // botão final/next liberado
    nextLevelBtn.classList.remove("btn-disabled");
    nextLevelBtn.setAttribute("aria-disabled", "false");
  }
}

/** =========================
 *  Botão “Próximo nível / Finalizar”
 *  (sem botão de pular separado)
 *  ========================= */
nextLevelBtn.addEventListener("click", async () => {
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

  // concluído: salva o texto corrigido
  correctedHTMLByLevel[levelIndex] = highlightCorrections(levels[levelIndex], currentText);

  // ✅ Se for o último nível, finaliza a missão aqui (mais robusto)
  if (isLast){
    await finishMission();
    return;
  }

  // senão, vai para o próximo nível
  levelIndex += 1;
  startLevel();
});


async function skipLevel(){
  // perde pontos e invalida ranking da missão
  missionValidForRanking = false;
  addScore(SCORE_RULES.skip);

  // salva “como está”
  correctedHTMLByLevel[levelIndex] = highlightCorrections(levels[levelIndex], currentText);

  await goNext();
}

async function finishLevelAndGoNext(madeAllFixes){
  correctedHTMLByLevel[levelIndex] = highlightCorrections(levels[levelIndex], currentText);
  await goNext();
}
async function finishMission(){
  await maybeCommitMissionToRanking();
  showFinal();
}

async function goNext(){
  levelIndex += 1;
  if (levelIndex < levels.length){
    startLevel();
    return;
  }

  // acabou a missão
  await maybeCommitMissionToRanking();
  showFinal();
}

/** =========================
 *  Cola
 *  ========================= */
hintBtn.addEventListener("click", () => {
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
  addScore(SCORE_RULES.hint);

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
 *  Final / destaque
 *  ========================= */
function highlightCorrections(levelDef, correctedText){
  let html = correctedText;
  for (const rule of levelDef.rules){
    const c = String(rule.correct);
    if (!c) continue;
    const safe = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(new RegExp(safe, "g"), `@@${c}@@`);
  }
  return html.replaceAll(/@@(.*?)@@/g, `<span class="final-highlight">$1</span>`);
}

function showFinal(){
  const name = getUserName();

  finalCongrats.textContent =
    `Parabéns, ${name}! Você ajudou o editor-chefe a publicar a mensagem de Natal no prazo!`;

  finalStats.textContent =
    `Pontos: ${score} | Acertos: ${correctCount} | Erros: ${wrongCount} | Colas: ${hintsUsed}` +
    (missionValidForRanking ? "" : " (missão não contabilizada no ranking)");

  finalRecado.textContent =
    `Recado editorial: revisão, editoração, diagramação e preparação textual — com atenção à ortografia, pontuação, concordância e colocação pronominal — elevam a clareza, evitam ruídos e valorizam a experiência do leitor.`;

  finalBox1.innerHTML = `<p style="margin:0">${correctedHTMLByLevel[0] ?? ""}</p>`;
  finalBox2.innerHTML = `<p style="margin:0">${correctedHTMLByLevel[1] ?? ""}</p>`;
  finalBox3.innerHTML = `<p style="margin:0">${correctedHTMLByLevel[2] ?? ""}</p>`;

  headerTitle.textContent = "Missão concluída 🎄";
  showOnly(screenFinal);
}

restartBtn.addEventListener("click", () => showOnly(screenForm));

/** =========================
 *  Início / nível
 *  ========================= */
startBtn.addEventListener("click", () => {
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

  // reset missão
  levelIndex = 0;
  missionValidForRanking = true;

  score = 0;
  wrongCount = 0;
  correctCount = 0;
  hintsUsed = 0;

  taskScore[0]=taskScore[1]=taskScore[2]=0;
  taskCorrect[0]=taskCorrect[1]=taskCorrect[2]=0;
  taskWrong[0]=taskWrong[1]=taskWrong[2]=0;

  correctedHTMLByLevel.length = 0;

  openModal({
    title: "Pontuação da missão",
    bodyHTML: `
      <ul style="margin:0; padding-left:18px; color:rgba(255,255,255,.78); line-height:1.7">
        <li>Correção correta: <strong>+${SCORE_RULES.correct}</strong></li>
        <li>Correção incorreta: <strong>${SCORE_RULES.wrong}</strong></li>
        <li>Avançar sem concluir: <strong>${SCORE_RULES.skip}</strong></li>
        <li>Colas utilizadas: <strong>${SCORE_RULES.hint}</strong></li>
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

  headerTitle.textContent = `Revisão da Mensagem de Natal — ${lvl.name}`;
  levelLabel.textContent = lvl.name;
  instruction.textContent = lvl.instruction;

  // texto do botão
  nextLevelBtn.textContent = (levelIndex === levels.length - 1)
    ? "Finalizar tarefa natalina"
    : "Próximo nível";

  updateHUD();
  renderMessage();

  openModal({
    title: `🎅 ${lvl.name}`,
    bodyHTML: `<p style="white-space:pre-line">${lvl.intro}</p>`,
    buttons: [{ label:"Entendi", onClick: closeModal }]
  });
}

/** =========================
 *  Ranking: 1 participação por missão COMPLETA
 *  + colunas T1/T2/T3/Média geral + acertos/erros
 *  ========================= */
rankingBtn.addEventListener("click", () => openRankingModal());
finalRankingBtn.addEventListener("click", () => openRankingModal());

async function maybeCommitMissionToRanking(){
  if (!missionValidForRanking) return;

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
      totalWrong: 0
    };

    tx.set(ref, {
      missions: (d.missions || 0) + 1,
      totalOverall: (d.totalOverall || 0) + score,
      totalT1: (d.totalT1 || 0) + taskScore[0],
      totalT2: (d.totalT2 || 0) + taskScore[1],
      totalT3: (d.totalT3 || 0) + taskScore[2],
      totalCorrect: (d.totalCorrect || 0) + correctCount,
      totalWrong: (d.totalWrong || 0) + wrongCount,
      updatedAt: serverTimestamp()
    }, { merge:true });
  });
}

async function openRankingModal(){
  const sectors = SECTORS.filter(s => s !== "Selecione…");
  const rows = [];

  for (const s of sectors){
    const ref = doc(db, "sectorStats", s);
    const snap = await getDoc(ref);
    const d = snap.exists() ? snap.data() : null;

    const missions = d?.missions || 0;
    const avg = (num) => missions ? (num / missions) : 0;

    rows.push({
      sector: s,
      missions,
      avgT1: avg(d?.totalT1 || 0),
      avgT2: avg(d?.totalT2 || 0),
      avgT3: avg(d?.totalT3 || 0),
      avgOverall: avg(d?.totalOverall || 0),
      avgCorrect: avg(d?.totalCorrect || 0),
      avgWrong: avg(d?.totalWrong || 0),
    });
  }

  rows.sort((a,b) => b.avgOverall - a.avgOverall || b.missions - a.missions);

  openModal({
    title: "🏆 Ranking por setor (missões completas)",
    bodyHTML: `
      <div style="overflow:auto">
        <table style="width:100%; border-collapse:collapse">
          <thead>
            <tr>
              <th style="text-align:left; padding:8px; border-bottom:1px solid rgba(255,255,255,.12)">Setor</th>
              <th style="text-align:right; padding:8px; border-bottom:1px solid rgba(255,255,255,.12)">Missões</th>
              <th style="text-align:right; padding:8px; border-bottom:1px solid rgba(255,255,255,.12)">Tarefa 1</th>
              <th style="text-align:right; padding:8px; border-bottom:1px solid rgba(255,255,255,.12)">Tarefa 2</th>
              <th style="text-align:right; padding:8px; border-bottom:1px solid rgba(255,255,255,.12)">Tarefa 3</th>
              <th style="text-align:right; padding:8px; border-bottom:1px solid rgba(255,255,255,.12)">Média geral</th>
              <th style="text-align:right; padding:8px; border-bottom:1px solid rgba(255,255,255,.12)">Acertos</th>
              <th style="text-align:right; padding:8px; border-bottom:1px solid rgba(255,255,255,.12)">Erros</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td style="padding:8px; border-bottom:1px solid rgba(255,255,255,.08)">${r.sector}</td>
                <td style="padding:8px; text-align:right; border-bottom:1px solid rgba(255,255,255,.08)">${r.missions}</td>
                <td style="padding:8px; text-align:right; border-bottom:1px solid rgba(255,255,255,.08)">${r.avgT1.toFixed(2)}</td>
                <td style="padding:8px; text-align:right; border-bottom:1px solid rgba(255,255,255,.08)">${r.avgT2.toFixed(2)}</td>
                <td style="padding:8px; text-align:right; border-bottom:1px solid rgba(255,255,255,.08)">${r.avgT3.toFixed(2)}</td>
                <td style="padding:8px; text-align:right; border-bottom:1px solid rgba(255,255,255,.08)">${r.avgOverall.toFixed(2)}</td>
                <td style="padding:8px; text-align:right; border-bottom:1px solid rgba(255,255,255,.08)">${r.avgCorrect.toFixed(2)}</td>
                <td style="padding:8px; text-align:right; border-bottom:1px solid rgba(255,255,255,.08)">${r.avgWrong.toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <p class="muted" style="margin:12px 0 0">
        Ranking agregado por setor (sem nomes), conforme LGPD. Conta <strong>1 participação por missão completa</strong>.
      </p>
    `,
    buttons: [{ label:"Fechar", onClick: closeModal }]
  });
}

/** =========================
 *  Personalização + renas (mantido simples)
 *  ========================= */
customizeBtn.addEventListener("click", openCustomizeModal);
openCustomizeInline.addEventListener("click", openCustomizeModal);

function saveTheme(obj){ localStorage.setItem("mission_theme", JSON.stringify(obj)); }
function loadTheme(){
  try { return JSON.parse(localStorage.getItem("mission_theme")||"null") || { snow:true, lights:false, reindeer:true }; }
  catch { return { snow:true, lights:false, reindeer:true }; }
}

function toggleHTML(id, title, subtitle, checked){
  return `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px; border-radius:14px; border:1px solid rgba(255,255,255,.12); background: rgba(0,0,0,.18)">
      <div style="display:flex; flex-direction:column; gap:2px">
        <b>${title}</b>
        <small style="color:rgba(255,255,255,.62)">${subtitle}</small>
      </div>
      <label class="switch" style="position:relative; width:52px; height:30px">
        <input type="checkbox" id="${id}" ${checked ? "checked":""} style="opacity:0;width:0;height:0"/>
        <span class="slider" style="position:absolute; inset:0; border-radius:999px; background: rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.18)"></span>
      </label>
    </div>
  `;
}

let reindeerTimer = null;

function openCustomizeModal(){
  const saved = loadTheme();

  openModal({
    title: "⚙️ Personalizar página",
    bodyHTML: `
      <p class="muted">As alterações são aplicadas imediatamente.</p>
      <div style="display:grid; gap:10px; margin-top:12px">
        ${toggleHTML("optSnow","Neve","Clima clássico de Natal", saved.snow)}
        ${toggleHTML("optLights","Pisca-pisca","Mais brilho e energia", saved.lights)}
        ${toggleHTML("optReindeer","Renas","Várias renas passando", saved.reindeer)}
      </div>
    `,
    buttons: [{ label:"Fechar", onClick: closeModal }]
  });

  setTimeout(() => {
    const optSnow = document.getElementById("optSnow");
    const optLights = document.getElementById("optLights");
    const optReindeer = document.getElementById("optReindeer");

    const applyNow = () => {
      const cfg = { snow: !!optSnow.checked, lights: !!optLights.checked, reindeer: !!optReindeer.checked };
      applyTheme(cfg);
      saveTheme(cfg);
    };

    optSnow.addEventListener("change", applyNow);
    optLights.addEventListener("change", applyNow);
    optReindeer.addEventListener("change", applyNow);
    applyNow();
  }, 0);
}

function applyTheme({ snow, lights, reindeer }){
  const snowCanvas = document.getElementById("snow");
  if (snowCanvas) snowCanvas.style.display = snow ? "block" : "none";
  if (lightsEl) lightsEl.classList.toggle("hidden", !lights);

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
 *  Neve
 *  ========================= */
(function snowInit(){
  const canvas = document.getElementById("snow");
  const ctx = canvas.getContext("2d");
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
 *  Setores + boot
 *  ========================= */
function populateSectors(){
  userSectorEl.innerHTML = "";
  for (const s of SECTORS){
    const opt = document.createElement("option");
    opt.value = s === "Selecione…" ? "" : s;
    opt.textContent = s;
    userSectorEl.appendChild(opt);
  }
}

function getUserName(){
  return (userNameEl.value || localStorage.getItem("mission_name") || "").trim();
}
function getUserSector(){
  return (userSectorEl.value || localStorage.getItem("mission_sector") || "").trim();
}

function showOnly(screen){
  for (const el of [screenLoading, screenForm, screenGame, screenFinal]){
    el.classList.toggle("hidden", el !== screen);
  }
}

populateSectors();
applyTheme(loadTheme());

showOnly(screenLoading);
setTimeout(() => {
  showOnly(screenForm);
  userNameEl.value = localStorage.getItem("mission_name") || "";
  userSectorEl.value = localStorage.getItem("mission_sector") || "";
}, 1100);
