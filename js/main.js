// js/main.js (module)

// Firebase opcional (não quebra se não configurar)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, doc, getDoc, runTransaction, serverTimestamp } from
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const firebaseConfig = {
  // apiKey: "...",
  // authDomain: "...",
  // projectId: "...",
  // appId: "..."
};

let db = null;
function hasFirebaseConfig(cfg){ return !!(cfg && cfg.apiKey && cfg.projectId && cfg.appId); }
try{
  if (hasFirebaseConfig(firebaseConfig)){
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } else {
    console.warn("[Modo local] Firebase não configurado. Ranking indisponível.");
  }
} catch(e){
  console.warn("[Modo local] Firebase falhou. Ranking indisponível.", e);
  db = null;
}

/** Setores (troque depois pela sua lista real) */
const SECTORS = [
  "Selecione…",
  "Financeiro",
  "RH",
  "TI",
  "Jurídico",
  "Comercial"
];

/** Pontuação */
const SCORE_RULES = {
  correct: +10,
  wrong: -3,
  auto: -2,
  skip: -5,
  hint: -1
};

/**
 * Regras:
 * - rule.wrong = regex que encontra o trecho errado (pode ser vírgula, frase, palavra)
 * - rule.correct = texto correto ("" significa remover)
 * OBS: Não destacamos erros no texto. Só fica verde/vermelho após interação.
 */
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
      // vírgulas indevidas: clicáveis (o erro é a vírgula)
      { id:"m1", label:"Pontuação",  wrong:/(?<=\bNatal),/g,        correct:"" },
      { id:"m2", label:"Pontuação",  wrong:/(?<=\bmensagens),/g,    correct:"" },
      { id:"m3", label:"Pontuação",  wrong:/(?<=\bvezes),/g,        correct:"" },
      { id:"m4", label:"Pontuação",  wrong:/(?<=\bnatalinos),/g,    correct:"" },
      // concordância
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
const progressCount = document.getElementById("progressCount");
const totalFixEl = document.getElementById("totalFix");
const wrongCount = document.getElementById("wrongCount");

const scoreCount = document.getElementById("scoreCount");
const hintCountEl = document.getElementById("hintCount");
const autoCountEl = document.getElementById("autoCount");

const instruction = document.getElementById("instruction");
const messageArea = document.getElementById("messageArea");

const hintBtn = document.getElementById("hintBtn");
const skipBtn = document.getElementById("skipBtn");
const nextLevelBtn = document.getElementById("nextLevelBtn");

const finalCongrats = document.getElementById("finalCongrats");
const finalScoreLine = document.getElementById("finalScoreLine");
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
 *  Estado do jogo / pontuação
 *  ========================= */
let levelIndex = 0;
let fixedRuleIds = new Set();

let wrongAttempts = 0;
let score = 0;

let hintsUsed = 0;
let autosUsed = 0;

let anySkipped = false;           // se avançou sem concluir alguma vez, não grava ranking
let currentText = "";
let currentRules = [];
const correctedHTMLByLevel = [];

function updateHUD(){
  progressCount.textContent = String(fixedRuleIds.size);
  wrongCount.textContent = String(wrongAttempts);
  scoreCount.textContent = String(score);
  hintCountEl.textContent = String(hintsUsed);
  autoCountEl.textContent = String(autosUsed);
}

function addScore(delta){
  score += delta;
  updateHUD();
}

function showOnly(screen){
  for (const el of [screenLoading, screenForm, screenGame, screenFinal]){
    el.classList.toggle("hidden", el !== screen);
  }
}

function normalize(str){
  return (str || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function resetLevelState(){
  fixedRuleIds = new Set();
  wrongAttempts = 0;
  nextLevelBtn.disabled = true;
  updateHUD();
}

/** =========================
 *  Render (sem grifar erros!)
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
  return { index: m.index, text: m[0], len: m[0].length, ruleId: rule.id };
}

function tokenizeChars(seg){
  // cria tokens por palavra/pontuação/espaço, todos clicáveis
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

function renderMessage(){
  messageArea.classList.remove("show");
  messageArea.innerHTML = "";

  const frag = document.createDocumentFragment();
  const text = currentText;
  let pos = 0;

  while (pos < text.length){
    let best = null;
    let bestRule = null;

    for (const rule of currentRules){
      if (fixedRuleIds.has(rule.id)) continue;
      const m = findNextMatch(text, pos, rule);
      if (!m) continue;
      if (!best || m.index < best.index){
        best = m;
        bestRule = rule;
      }
    }

    if (!best){
      appendPlain(frag, text.slice(pos));
      break;
    }

    if (best.index > pos){
      appendPlain(frag, text.slice(pos, best.index));
    }

    // erro vira token clicável, mas SEM destaque
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

function appendPlain(frag, seg){
  const tokens = tokenizeChars(seg);
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

function onPlainClick(span){
  // conta como erro e marca vermelho (uma vez)
  if (span.dataset.misclick !== "1"){
    span.dataset.misclick = "1";
    wrongAttempts += 1;
    addScore(SCORE_RULES.wrong);
    span.classList.add("error");
  }

  openModal({
    title: "Revisão",
    bodyHTML: `<p><strong>Hmmm…</strong> Esse trecho já está correto.</p>`,
    buttons: [{ label: "Entendi", onClick: closeModal }]
  });
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function onErrorClick(errSpan, rule){
  const wrongText = errSpan.textContent || "";
  const expected = rule.correct;

  const placeholder = expected === "" ? "Deixe em branco para remover" : "Digite aqui...";
  const hintLine = `<p class="muted" style="margin:10px 0 0">
    Lembrete: os erros podem ser de acentuação, ortografia, gramática, pontuação, colocação pronominal etc.
  </p>`;

  openModal({
    title: `Corrigir (${rule.label})`,
    bodyHTML: `
      <p>Trecho selecionado:</p>
      <p style="margin:8px 0 0"><strong>${escapeHtml(wrongText)}</strong></p>

      <p style="margin:12px 0 6px">Digite a forma correta:</p>
      <input class="input" id="fixInput" type="text" autocomplete="off" placeholder="${placeholder}" />

      ${hintLine}
    `,
    buttons: [
      {
        label: `Corrigir automaticamente (${SCORE_RULES.auto})`,
        variant: "ghost",
        onClick: () => applyAutoCorrection(errSpan, rule)
      },
      {
        label: "Confirmar correção",
        onClick: () => confirmCorrection(errSpan, rule)
      }
    ]
  });

  setTimeout(() => document.getElementById("fixInput")?.focus(), 30);
}

function applyAutoCorrection(errSpan, rule){
  autosUsed += 1;
  addScore(SCORE_RULES.auto);

  // aplica por posição
  const start = Number(errSpan.dataset.start);
  const len = Number(errSpan.dataset.len);
  const expected = rule.correct;

  currentText = currentText.slice(0, start) + expected + currentText.slice(start + len);

  fixedRuleIds.add(rule.id);
  renderMessage();
  updateHUD();

  closeModal();
  checkLevelDone();
}

function confirmCorrection(errSpan, rule){
  const typed = document.getElementById("fixInput")?.value ?? "";
  const expected = rule.correct;

  const ok = expected === ""
    ? typed.trim() === ""
    : normalize(typed) === normalize(expected);

  if (!ok){
    wrongAttempts += 1;
    addScore(SCORE_RULES.wrong);

    openModal({
      title: "Ops!",
      bodyHTML: `<p>Ops, você errou. O correto seria <strong>${escapeHtml(expected === "" ? "(remover)" : expected)}</strong>.</p>`,
      buttons: [{ label: "Ok", onClick: closeModal }]
    });
    return;
  }

  // acertou
  addScore(SCORE_RULES.correct);

  const start = Number(errSpan.dataset.start);
  const len = Number(errSpan.dataset.len);

  currentText = currentText.slice(0, start) + expected + currentText.slice(start + len);

  fixedRuleIds.add(rule.id);
  renderMessage();
  updateHUD();

  closeModal();
  checkLevelDone();
}

function checkLevelDone(){
  if (fixedRuleIds.size >= currentRules.length){
    nextLevelBtn.disabled = false;
  }
}

/** =========================
 *  Cola
 *  ========================= */
hintBtn.addEventListener("click", () => {
  const remaining = currentRules.filter(r => !fixedRuleIds.has(r.id));
  if (remaining.length === 0){
    openModal({
      title: "Cola",
      bodyHTML: `<p>Você já corrigiu tudo neste nível! ✅</p>`,
      buttons: [{ label: "Fechar", onClick: closeModal }]
    });
    return;
  }

  hintsUsed += 1;
  addScore(SCORE_RULES.hint);

  const pick = remaining[Math.floor(Math.random() * remaining.length)];
  const msg = pick.correct === ""
    ? `Procure um sinal que deve ser removido. (Dica: é uma pontuação indevida.)`
    : `Procure um trecho que deve virar: <strong>${escapeHtml(pick.correct)}</strong>.`;

  openModal({
    title: "Me dê uma cola!",
    bodyHTML: `
      <p>${msg}</p>
      <p class="muted" style="margin-top:10px">Colas têm custo de ${SCORE_RULES.hint} ponto.</p>
    `,
    buttons: [{ label: "Entendi", onClick: closeModal }]
  });
});

/** =========================
 *  Avançar sem concluir
 *  ========================= */
skipBtn.addEventListener("click", () => {
  if (fixedRuleIds.size >= currentRules.length){
    openModal({
      title: "Tudo certo!",
      bodyHTML: `<p>Você já concluiu esta atividade. Use o botão de continuar para avançar. ✅</p>`,
      buttons: [{ label: "Ok", onClick: closeModal }]
    });
    return;
  }

  openModal({
    title: "Atenção",
    bodyHTML: `
      <p>Se você avançar sem concluir esta atividade:</p>
      <ul style="margin:8px 0 0; padding-left:18px; color:rgba(255,255,255,.75)">
        <li>Você perde <strong>${SCORE_RULES.skip}</strong> pontos.</li>
        <li>Esta tentativa <strong>não contará para o ranking</strong>.</li>
      </ul>
    `,
    buttons: [
      { label: "Cancelar", variant:"ghost", onClick: closeModal },
      { label: "Avançar mesmo assim", onClick: () => { closeModal(); forceAdvanceLevel(); } }
    ]
  });
});

function forceAdvanceLevel(){
  anySkipped = true;
  addScore(SCORE_RULES.skip);

  // salva texto “como está” (sem destaque do que ficou errado)
  correctedHTMLByLevel[levelIndex] = highlightCorrections(levels[levelIndex], currentText);

  goNextOrFinish();
}

/** =========================
 *  Próximo nível / Finalizar
 *  ========================= */
nextLevelBtn.addEventListener("click", async () => {
  // chegou aqui concluído
  correctedHTMLByLevel[levelIndex] = highlightCorrections(levels[levelIndex], currentText);

  // só registra ranking se NUNCA pulou
  if (!anySkipped){
    await updateSectorStats({ sector: getUserSector(), score });
  }

  goNextOrFinish();
});

function goNextOrFinish(){
  levelIndex += 1;
  if (levelIndex < levels.length){
    startLevel();
  } else {
    showFinal();
  }
}

/** =========================
 *  Final (mensagens + recado editorial)
 *  ========================= */
function highlightCorrections(levelDef, correctedText){
  // destaca apenas inserções (rule.correct != "")
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

  finalScoreLine.textContent =
    `Seu desempenho: ${score} pontos — Colas: ${hintsUsed} — Correções automáticas: ${autosUsed}` +
    (anySkipped ? " (tentativa não contabilizada no ranking)" : "");

  finalRecado.textContent =
    `Recado editorial: revisão, editoração, diagramação e preparação textual — com atenção à ortografia, pontuação, concordância e colocação pronominal — elevam a clareza, evitam ruídos e valorizam a experiência do leitor.`;

  finalBox1.innerHTML = `<p style="margin:0">${correctedHTMLByLevel[0] ?? ""}</p>`;
  finalBox2.innerHTML = `<p style="margin:0">${correctedHTMLByLevel[1] ?? ""}</p>`;
  finalBox3.innerHTML = `<p style="margin:0">${correctedHTMLByLevel[2] ?? ""}</p>`;

  headerTitle.textContent = "Missão concluída 🎄";
  showOnly(screenFinal);
}

restartBtn.addEventListener("click", () => {
  showOnly(screenForm);
});

/** =========================
 *  Início / apresentação da pontuação
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

  // reset campanha
  levelIndex = 0;
  correctedHTMLByLevel.length = 0;
  anySkipped = false;
  score = 0;
  hintsUsed = 0;
  autosUsed = 0;

  openModal({
    title: "Pontuação da missão",
    bodyHTML: `
      <ul style="margin:0; padding-left:18px; color:rgba(255,255,255,.78); line-height:1.7">
        <li>Correção correta: <strong>+10</strong></li>
        <li>Correção incorreta: <strong>-3</strong></li>
        <li>Correção automática: <strong>-2</strong></li>
        <li>Avançar sem concluir: <strong>-5</strong></li>
        <li>Colas utilizadas: <strong>-1</strong></li>
      </ul>
      <p class="muted" style="margin-top:12px">
        Dica: você pode personalizar a página pelo botão ⚙️ a qualquer momento.
      </p>
    `,
    buttons: [
      { label: "Começar", onClick: () => { closeModal(); showOnly(screenGame); startLevel(); } }
    ]
  });
});

function startLevel(){
  const lvl = levels[levelIndex];

  resetLevelState();
  headerTitle.textContent = `Revisão da Mensagem de Natal — ${lvl.name}`;
  levelLabel.textContent = lvl.name;

  currentText = lvl.raw;
  currentRules = lvl.rules;

  instruction.textContent = lvl.instruction;
  totalFixEl.textContent = String(currentRules.length);

  // Botão principal: último nível vira “Finalizar”
  nextLevelBtn.textContent = (levelIndex === levels.length - 1)
    ? "Finalizar tarefa natalina"
    : "Próximo nível";

  updateHUD();
  renderMessage();

  // Popup leve de introdução do nível (sem travar)
  openModal({
    title: `🎅 ${lvl.name}`,
    bodyHTML: `<p style="white-space:pre-line">${lvl.intro}</p>`,
    buttons: [{ label: "Entendi", onClick: closeModal }]
  });
}

/** =========================
 *  Setores / helpers
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

/** =========================
 *  Ranking (opcional) — aqui grava por setor
 *  ========================= */
rankingBtn.addEventListener("click", () => openRankingModal());
finalRankingBtn.addEventListener("click", () => openRankingModal());

async function updateSectorStats({ sector, score }){
  if (!db) return;
  if (!sector) return;

  const ref = doc(db, "sectorStats", sector);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists() ? snap.data() : { count: 0, totalScore: 0 };

    tx.set(ref, {
      count: (data.count || 0) + 1,
      totalScore: (data.totalScore || 0) + (score || 0),
      updatedAt: serverTimestamp()
    }, { merge:true });
  });
}

async function openRankingModal(){
  if (!db){
    openModal({
      title: "🏆 Ranking",
      bodyHTML: `<p>O ranking ainda não está disponível porque o Firebase não foi configurado.</p>`,
      buttons: [{ label: "Entendi", onClick: closeModal }]
    });
    return;
  }

  const sectors = SECTORS.filter(s => s !== "Selecione…");
  const rows = [];
  for (const s of sectors){
    const ref = doc(db, "sectorStats", s);
    const snap = await getDoc(ref);
    const d = snap.exists() ? snap.data() : { count: 0, totalScore: 0 };
    rows.push({
      sector: s,
      count: d.count || 0,
      avgScore: d.count ? (d.totalScore / d.count) : 0
    });
  }
  rows.sort((a,b) => b.avgScore - a.avgScore || b.count - a.count);

  openModal({
    title: "🏆 Ranking por setor",
    bodyHTML: `
      <div style="overflow:auto">
        <table style="width:100%; border-collapse:collapse">
          <thead>
            <tr>
              <th style="text-align:left; padding:8px; border-bottom:1px solid rgba(255,255,255,.12)">Setor</th>
              <th style="text-align:right; padding:8px; border-bottom:1px solid rgba(255,255,255,.12)">Participações</th>
              <th style="text-align:right; padding:8px; border-bottom:1px solid rgba(255,255,255,.12)">Média de pontos</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td style="padding:8px; border-bottom:1px solid rgba(255,255,255,.08)">${r.sector}</td>
                <td style="padding:8px; text-align:right; border-bottom:1px solid rgba(255,255,255,.08)">${r.count}</td>
                <td style="padding:8px; text-align:right; border-bottom:1px solid rgba(255,255,255,.08)">${r.avgScore.toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <p class="muted" style="margin:12px 0 0">Ranking exibido por setor (sem nomes), conforme LGPD.</p>
    `,
    buttons: [{ label:"Fechar", onClick: closeModal }]
  });
}

/** =========================
 *  Personalização (ao vivo) + renas
 *  ========================= */
customizeBtn.addEventListener("click", openCustomizeModal);
openCustomizeInline.addEventListener("click", openCustomizeModal);

function saveTheme(obj){ localStorage.setItem("mission_theme", JSON.stringify(obj)); }
function loadTheme(){
  try { return JSON.parse(localStorage.getItem("mission_theme")||"null") || { snow:true, lights:false, reindeer:true, theme:"neon" }; }
  catch { return { snow:true, lights:false, reindeer:true, theme:"neon" }; }
}

function toggleHTML(id, title, subtitle, checked){
  return `
    <div class="toggle-row">
      <div class="label">
        <b>${title}</b>
        <small>${subtitle}</small>
      </div>
      <label class="switch">
        <input type="checkbox" id="${id}" ${checked ? "checked":""}/>
        <span class="slider"></span>
      </label>
    </div>
  `;
}

function openCustomizeModal(){
  const saved = loadTheme();

  openModal({
    title: "⚙️ Personalizar página",
    bodyHTML: `
      <p class="muted">As alterações são aplicadas imediatamente (ao vivo).</p>

      <div style="display:grid; gap:10px; margin-top:12px">
        ${toggleHTML("optSnow", "Neve", "Clima clássico de Natal", saved.snow)}
        ${toggleHTML("optLights", "Pisca-pisca", "Mais brilho e energia", saved.lights)}
        ${toggleHTML("optReindeer", "Renas", "Várias renas passando", saved.reindeer)}

        <label style="display:grid; gap:6px">
          <span class="muted">Tema chamativo</span>
          <select class="input" id="optTheme">
            <option value="neon">Neon (bem vibrante)</option>
            <option value="candy">Candy</option>
            <option value="aurora">Aurora</option>
            <option value="inferno">Vermelho intenso</option>
            <option value="ocean">Azul elétrico</option>
            <option value="classic">Clássico</option>
          </select>
        </label>
      </div>
    `,
    buttons: [{ label:"Fechar", onClick: closeModal }]
  });

  setTimeout(() => {
    const optSnow = document.getElementById("optSnow");
    const optLights = document.getElementById("optLights");
    const optReindeer = document.getElementById("optReindeer");
    const optTheme = document.getElementById("optTheme");
    optTheme.value = saved.theme || "neon";

    const applyNow = () => {
      const snow = !!optSnow.checked;
      const lights = !!optLights.checked;
      const reindeer = !!optReindeer.checked;
      const theme = optTheme.value || "neon";
      applyTheme({ snow, lights, reindeer, theme });
      saveTheme({ snow, lights, reindeer, theme });
    };

    optSnow.addEventListener("change", applyNow);
    optLights.addEventListener("change", applyNow);
    optReindeer.addEventListener("change", applyNow);
    optTheme.addEventListener("change", applyNow);

    applyNow();
  }, 0);
}

let reindeerTimer = null;

function applyTheme({ snow, lights, reindeer, theme }){
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

  const root = document.documentElement.style;

  if (theme === "neon"){
    root.setProperty("--bgA", "rgba(0, 255, 180, .44)");
    root.setProperty("--bgB", "rgba(255, 0, 220, .42)");
    root.setProperty("--bgC", "rgba(255, 230, 0, .30)");
    root.setProperty("--bgBaseTop", "#030013");
    root.setProperty("--bgBaseMid", "#070018");
    root.setProperty("--bgBaseBot", "#020014");
  } else if (theme === "candy"){
    root.setProperty("--bgA", "rgba(255, 105, 180, .44)");
    root.setProperty("--bgB", "rgba(120, 190, 255, .40)");
    root.setProperty("--bgC", "rgba(170, 255, 200, .30)");
    root.setProperty("--bgBaseTop", "#08051a");
    root.setProperty("--bgBaseMid", "#0a0620");
    root.setProperty("--bgBaseBot", "#060514");
  } else if (theme === "aurora"){
    root.setProperty("--bgA", "rgba(0, 255, 140, .46)");
    root.setProperty("--bgB", "rgba(0, 150, 255, .40)");
    root.setProperty("--bgC", "rgba(180, 255, 120, .30)");
    root.setProperty("--bgBaseTop", "#010c10");
    root.setProperty("--bgBaseMid", "#03121a");
    root.setProperty("--bgBaseBot", "#01070b");
  } else if (theme === "inferno"){
    root.setProperty("--bgA", "rgba(255, 30, 30, .56)");
    root.setProperty("--bgB", "rgba(255, 120, 0, .40)");
    root.setProperty("--bgC", "rgba(255, 220, 60, .26)");
    root.setProperty("--bgBaseTop", "#120101");
    root.setProperty("--bgBaseMid", "#1a0303");
    root.setProperty("--bgBaseBot", "#0b0101");
  } else if (theme === "ocean"){
    root.setProperty("--bgA", "rgba(0, 200, 255, .50)");
    root.setProperty("--bgB", "rgba(0, 80, 255, .44)");
    root.setProperty("--bgC", "rgba(0, 255, 200, .28)");
    root.setProperty("--bgBaseTop", "#010612");
    root.setProperty("--bgBaseMid", "#020a1a");
    root.setProperty("--bgBaseBot", "#01040c");
  } else {
    root.setProperty("--bgA", "rgba(255, 60, 60, .42)");
    root.setProperty("--bgB", "rgba(0, 170, 255, .34)");
    root.setProperty("--bgC", "rgba(255, 210, 60, .30)");
    root.setProperty("--bgBaseTop", "#050611");
    root.setProperty("--bgBaseMid", "#05091a");
    root.setProperty("--bgBaseBot", "#04050f");
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

    // remove depois da animação (limpa DOM)
    const ttl = parseFloat(d.style.animationDuration) * 1000 + 1500;
    setTimeout(() => d.remove(), ttl);
  }
}

/** =========================
 *  Neve (canvas)
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

/** Boot */
populateSectors();

// aplica tema salvo
applyTheme(loadTheme());

// Loading fake -> Form
showOnly(screenLoading);
setTimeout(() => {
  showOnly(screenForm);
  userNameEl.value = localStorage.getItem("mission_name") || "";
  userSectorEl.value = localStorage.getItem("mission_sector") || "";
  updateHUD();
}, 1100);
