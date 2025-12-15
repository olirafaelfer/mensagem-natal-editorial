// js/main.js (module)

// Firebase opcional (ranking não quebra se não configurar)
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

/** Setores (substitua depois com sua lista real) */
const SECTORS = [
  "Selecione…",
  "Financeiro",
  "RH",
  "TI",
  "Jurídico",
  "Comercial"
];

/**
 * Motor novo:
 * - Cada erro vira um “trecho” clicável (errchunk) com start/len
 * - Vírgulas podem ser o próprio erro (regex que casa só a vírgula)
 * - Colocação pronominal seleciona trecho inteiro (“No Natal, se deve pensar”)
 */
const levels = [
  {
    name: "Fácil",
    intro: `O Papai Noel, editor-chefe, pediu sua ajuda para revisar a Mensagem de Natal.
Ele escreveu tão rápido que acabou deixando três errinhos para trás.`,
    instruction: `Os erros podem envolver acentuação, ortografia, gramática e outros detalhes editoriais. Clique nos trechos incorretos para corrigir!`,
    raw: `Mais do que presentes e refeissões caprichadas, o Natal é a época de lembrar o valor de um abraço apertado e de um sorriso sincero! Que para voces, meus amigos, seja uma época xeia de carinho e amor, preenchida pelo que realmente importa nessa vida!`,
    rules: [
      { id:"f1", label:"Ortografia",  wrong:/\brefeissões\b/g, correct:"refeições" },
      { id:"f2", label:"Acentuação", wrong:/\bvoces\b/g,      correct:"vocês" },
      { id:"f3", label:"Ortografia", wrong:/\bxeia\b/g,       correct:"cheia" },
    ]
  },
  {
    name: "Médio",
    intro: `Nível médio: aqui aparecem erros editoriais objetivos, especialmente vírgulas mal colocadas e concordância.`,
    instruction: `Atenção: os erros podem envolver pontuação (inclusive vírgulas indevidas), concordância, acentuação e ortografia.`,
    raw: `O Natal, é um momento especial para celebrar a união e a esperança. As mensagens, que circulam nessa época, precisam transmitir carinho e acolhimento, mas muitas vezes, acabam sendo escritas de forma apressada. Os textos natalinos, exige atenção aos detalhes, para que a mensagem chegue clara ao leitor.`,
    rules: [
      // vírgulas indevidas — aqui você consegue clicar NA VÍRGULA
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
      // colocação pronominal (trecho inteiro clicável)
      { id:"d1", label:"Colocação pronominal", wrong:/No Natal,\s*se deve pensar/g, correct:"No Natal, deve-se pensar" },

      // paralelismo/colocação pronominal (trecho clicável)
      { id:"d2", label:"Colocação pronominal", wrong:/aos filhos,\s*os ame/gi, correct:"aos filhos, ame-os" },

      // vírgula separando sujeito do verbo (clicar na vírgula)
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

const instruction = document.getElementById("instruction");
const messageArea = document.getElementById("messageArea");
const autoBtn = document.getElementById("autoBtn");
const nextLevelBtn = document.getElementById("nextLevelBtn");

const finalCongrats = document.getElementById("finalCongrats");
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
const rudolph = document.getElementById("rudolph");

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

/** LGPD em popup */
lgpdMoreBtn.addEventListener("click", () => {
  openModal({
    title: "LGPD — Informações sobre tratamento de dados",
    bodyHTML: `
      <p class="muted">
        Esta dinâmica é recreativa e foi criada para destacar a importância da revisão editorial.
      </p>

      <h3 style="margin:14px 0 6px">Quais dados são coletados?</h3>
      <ul style="margin:0; padding-left:18px; color:rgba(255,255,255,.74); line-height:1.6">
        <li><strong>Nome</strong>: usado apenas para exibir a mensagem de parabéns no final.</li>
        <li><strong>Setor</strong>: usado para consolidar o ranking de forma <strong>agregada por setor</strong>.</li>
      </ul>

      <h3 style="margin:14px 0 6px">Compartilhamento</h3>
      <p class="muted">
        Não há compartilhamento de informações pessoais no ranking. O ranking mostra apenas números por setor.
      </p>

      <h3 style="margin:14px 0 6px">Dúvidas</h3>
      <p class="muted">
        Em caso de dúvidas sobre o tratamento de dados, procure o responsável interno por privacidade/controles da sua organização.
      </p>
    `,
    buttons: [{ label: "Fechar", onClick: closeModal }]
  });
});

/** =========================
 *  Estado do jogo
 *  ========================= */
let levelIndex = 0;
let fixedRuleIds = new Set();
let wrongAttempts = 0;
let allowAuto = false;

let currentText = "";
let currentRules = [];
const correctedHTMLByLevel = [];

function normalize(str){
  return (str || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function showOnly(screen){
  for (const el of [screenLoading, screenForm, screenGame, screenFinal]){
    el.classList.toggle("hidden", el !== screen);
  }
}

function updateCounters(){
  progressCount.textContent = String(fixedRuleIds.size);
  wrongCount.textContent = String(wrongAttempts);
}

function unlockAutoIfNeeded(){
  if (wrongAttempts >= 3 && !allowAuto){
    allowAuto = true;
    autoBtn.classList.remove("is-disabled");
    autoBtn.setAttribute("aria-disabled", "false");
  }
}

function resetLevelState(){
  fixedRuleIds = new Set();
  wrongAttempts = 0;
  allowAuto = false;
  autoBtn.classList.add("is-disabled");
  autoBtn.setAttribute("aria-disabled", "true");
  updateCounters();
  nextLevelBtn.disabled = true;
}

/** =========================
 *  Render: erros como trechos clicáveis
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

function tokenizePlainSegment(segText){
  // mantém palavras e pontuações em spans clicáveis
  // separa por espaços mas também “quebra” pontuação básica
  const out = [];
  let buf = "";

  const pushBuf = () => { if (buf){ out.push({type:"word", val:buf}); buf=""; } };

  for (let i=0;i<segText.length;i++){
    const ch = segText[i];

    if (ch === " " || ch === "\n" || ch === "\t"){
      pushBuf();
      out.push({type:"ws", val:ch});
      continue;
    }

    // pontuação clicável
    if (",.;:!?".includes(ch)){
      pushBuf();
      out.push({type:"punct", val:ch});
      continue;
    }

    buf += ch;
  }
  pushBuf();
  return out;
}

function renderMessage(){
  messageArea.classList.remove("show");
  messageArea.innerHTML = "";

  const frag = document.createDocumentFragment();
  const text = currentText;
  let pos = 0;

  while (pos < text.length){
    // acha o próximo erro não corrigido
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
      // resto é texto normal
      appendPlain(frag, text.slice(pos));
      break;
    }

    // texto normal antes do erro
    if (best.index > pos){
      appendPlain(frag, text.slice(pos, best.index));
    }

    // erro: trecho clicável
    const errSpan = document.createElement("span");
    errSpan.className = "errchunk";
    errSpan.textContent = best.text;
    errSpan.dataset.ruleid = bestRule.id;
    errSpan.dataset.start = String(best.index);
    errSpan.dataset.len = String(best.len);
    errSpan.addEventListener("click", () => onErrorChunkClick(errSpan, bestRule));
    frag.appendChild(errSpan);

    pos = best.index + best.len;
  }

  messageArea.appendChild(frag);
  requestAnimationFrame(() => messageArea.classList.add("show"));
}

function appendPlain(frag, plainText){
  const tokens = tokenizePlainSegment(plainText);
  for (const t of tokens){
    if (t.type === "ws"){
      frag.appendChild(document.createTextNode(t.val));
      continue;
    }

    const span = document.createElement("span");
    span.textContent = t.val;
    span.className = (t.type === "punct") ? "punct" : "word";
    span.addEventListener("click", () => onPlainTokenClick(span));
    frag.appendChild(span);
  }
}

function onPlainTokenClick(span){
  // clicou em algo que NÃO é erro: conta como erro e marca vermelho
  if (span.dataset.misclick !== "1"){
    span.dataset.misclick = "1";
    wrongAttempts += 1;
    updateCounters();
    unlockAutoIfNeeded();
    span.classList.add("error");
  }

  openModal({
    title: "Revisão",
    bodyHTML: `<p><strong>Hmmm...</strong> O trecho que você clicou já está correto...</p>`,
    buttons: [{ label: "Entendi", onClick: closeModal }]
  });
}

function onErrorChunkClick(errSpan, rule){
  const wrongText = errSpan.textContent || "";
  const expected = rule.correct;

  const hint =
    expected === ""
      ? `<p class="muted" style="margin:10px 0 0">Dica: deixe em branco para <strong>remover</strong> este sinal.</p>`
      : `<p class="muted" style="margin:10px 0 0">Erros podem envolver acentuação, ortografia, gramática, pontuação e colocação pronominal.</p>`;

  openModal({
    title: `Corrigir (${rule.label})`,
    bodyHTML: `
      <p>Trecho selecionado:</p>
      <p style="margin:8px 0 0"><strong>${escapeHtml(wrongText)}</strong></p>

      <p style="margin:12px 0 6px">Digite a forma correta:</p>
      <input class="input" id="fixInput" type="text" autocomplete="off" placeholder="${expected === "" ? "Deixe em branco para remover" : "Digite aqui..."}" />

      ${hint}
    `,
    buttons: [
      {
        label: "Confirmar correção",
        onClick: () => confirmCorrection(errSpan, rule)
      }
    ]
  });

  setTimeout(() => document.getElementById("fixInput")?.focus(), 30);
}

function confirmCorrection(errSpan, rule){
  const typed = document.getElementById("fixInput")?.value ?? "";
  const expected = rule.correct;

  let ok = false;
  if (expected === ""){
    ok = typed.trim() === "" || normalize(typed) === normalize("remover");
  } else {
    ok = normalize(typed) === normalize(expected);
  }

  if (!ok){
    wrongAttempts += 1;
    updateCounters();
    unlockAutoIfNeeded();

    openModal({
      title: "Ops!",
      bodyHTML: `<p>Ops, você errou. O correto seria <strong>${escapeHtml(expected === "" ? "(remover)" : expected)}</strong>.</p>`,
      buttons: [{ label: "Ok", onClick: closeModal }]
    });
    return;
  }

  // aplica no texto por posição (só aquele trecho)
  const start = Number(errSpan.dataset.start);
  const len = Number(errSpan.dataset.len);

  currentText = currentText.slice(0, start) + expected + currentText.slice(start + len);

  fixedRuleIds.add(rule.id);
  updateCounters();

  // re-render para mostrar a correção
  renderMessage();

  closeModal();
  checkLevelDone();
}

function checkLevelDone(){
  const total = currentRules.length;
  if (fixedRuleIds.size >= total){
    nextLevelBtn.disabled = false;
  }
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/** =========================
 *  Corretor automático
 *  ========================= */
autoBtn.addEventListener("click", () => {
  if (!allowAuto){
    openModal({
      title: "Atenção",
      bodyHTML: `<p>Este botão só será liberado depois de 3 tentativas erradas.</p>`,
      buttons: [{ label: "Entendi", onClick: closeModal }]
    });
    return;
  }

  // aplica as correções restantes “em lote”
  for (const rule of currentRules){
    if (fixedRuleIds.has(rule.id)) continue;

    // aplica a primeira ocorrência do erro (suficiente porque cada regra é única aqui)
    const re = ensureGlobal(rule.wrong);
    const m = re.exec(currentText);
    if (m){
      currentText = currentText.slice(0, m.index) + rule.correct + currentText.slice(m.index + m[0].length);
    }
    fixedRuleIds.add(rule.id);
  }

  updateCounters();
  renderMessage();
  nextLevelBtn.disabled = false;

  openModal({
    title: "Corretor automático",
    bodyHTML: `<p>Pronto! As correções restantes foram aplicadas automaticamente. ✨</p>`,
    buttons: [{ label: "Continuar", onClick: closeModal }]
  });
});

/** =========================
 *  Fluxo: loading -> form -> níveis -> final
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

  showOnly(screenGame);
  levelIndex = 0;
  correctedHTMLByLevel.length = 0;

  startLevel();
});

function startLevel(){
  const lvl = levels[levelIndex];

  resetLevelState();

  headerTitle.textContent = `Revisão da Mensagem de Natal — ${lvl.name}`;
  levelLabel.textContent = lvl.name;

  currentText = lvl.raw;
  currentRules = lvl.rules;

  totalFixEl.textContent = String(currentRules.length);

  instruction.textContent = "";

  // intro com countdown 3s
  let countdown = 3;
  let interval;

  openModal({
    title: `🎅 ${lvl.name}`,
    bodyHTML: `
      <p style="white-space:pre-line">${lvl.intro}</p>
      <p style="margin-top:12px" class="muted">
        Você poderá avançar em <strong><span id="countdown">${countdown}</span></strong> segundos…
      </p>
    `,
    buttons: [{ label: "Avançar", disabled: true, onClick: closeModal }]
  });

  interval = setInterval(() => {
    countdown -= 1;
    const el = document.getElementById("countdown");
    if (el) el.textContent = String(countdown);
    if (countdown <= 0){
      clearInterval(interval);
      const btn = modalFoot.querySelector("button");
      if (btn) btn.disabled = false;
    }
  }, 1000);

  const obs = new MutationObserver(() => {
    if (overlay.classList.contains("hidden")){
      obs.disconnect();
      clearInterval(interval);

      instruction.textContent = lvl.instruction;
      renderMessage();
    }
  });
  obs.observe(overlay, { attributes:true, attributeFilter:["class"] });
}

nextLevelBtn.addEventListener("click", async () => {
  // guardar versão corrigida com destaque das correções deste nível
  correctedHTMLByLevel[levelIndex] = highlightCorrections(levels[levelIndex], currentText);

  // ranking agregado (opcional)
  await updateSectorStats({ sector: getUserSector(), wrong: wrongAttempts });

  levelIndex += 1;
  if (levelIndex < levels.length){
    startLevel();
  } else {
    showFinal();
  }
});

function highlightCorrections(levelDef, correctedText){
  let html = correctedText;
  for (const rule of levelDef.rules){
    const c = String(rule.correct);
    if (!c) continue; // remoções não destacamos
    const safe = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(new RegExp(safe, "g"), `@@${c}@@`);
  }
  html = html.replaceAll(/@@(.*?)@@/g, `<span class="final-highlight">$1</span>`);
  return html;
}

function showFinal(){
  const name = getUserName();

  finalCongrats.textContent =
    `Parabéns, ${name}! Você ajudou o editor-chefe a publicar a mensagem de Natal no prazo!`;

  finalRecado.textContent =
    `Recado editorial: revisão, editoração, diagramação e preparação textual — com atenção à ortografia, pontuação, concordância e colocação pronominal — fazem toda a diferença para a clareza e a qualidade do texto.`;

  finalBox1.innerHTML = `<p style="margin:0">${correctedHTMLByLevel[0] ?? ""}</p>`;
  finalBox2.innerHTML = `<p style="margin:0">${correctedHTMLByLevel[1] ?? ""}</p>`;
  finalBox3.innerHTML = `<p style="margin:0">${correctedHTMLByLevel[2] ?? ""}</p>`;

  headerTitle.textContent = "Missão concluída 🎄";
  showOnly(screenFinal);
}

restartBtn.addEventListener("click", () => showOnly(screenForm));

/** =========================
 *  Ranking (opcional)
 *  ========================= */
rankingBtn.addEventListener("click", () => openRankingModal());
finalRankingBtn.addEventListener("click", () => openRankingModal());

async function updateSectorStats({ sector, wrong }){
  if (!db) return;
  if (!sector) return;

  const ref = doc(db, "sectorStats", sector);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists() ? snap.data() : { count: 0, totalWrong: 0 };
    tx.set(ref, {
      count: (data.count || 0) + 1,
      totalWrong: (data.totalWrong || 0) + (wrong || 0),
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
    const d = snap.exists() ? snap.data() : { count: 0, totalWrong: 0 };
    rows.push({
      sector: s,
      count: d.count || 0,
      avgWrong: d.count ? (d.totalWrong / d.count) : 0
    });
  }
  rows.sort((a,b) => a.avgWrong - b.avgWrong || b.count - a.count);

  openModal({
    title: "🏆 Ranking por setor",
    bodyHTML: `
      <div style="overflow:auto">
        <table style="width:100%; border-collapse:collapse">
          <thead>
            <tr>
              <th style="text-align:left; padding:8px; border-bottom:1px solid rgba(255,255,255,.12)">Setor</th>
              <th style="text-align:right; padding:8px; border-bottom:1px solid rgba(255,255,255,.12)">Participações</th>
              <th style="text-align:right; padding:8px; border-bottom:1px solid rgba(255,255,255,.12)">Média de erros</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td style="padding:8px; border-bottom:1px solid rgba(255,255,255,.08)">${r.sector}</td>
                <td style="padding:8px; text-align:right; border-bottom:1px solid rgba(255,255,255,.08)">${r.count}</td>
                <td style="padding:8px; text-align:right; border-bottom:1px solid rgba(255,255,255,.08)">${r.avgWrong.toFixed(2)}</td>
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
 *  Personalização (ao vivo, chamativa)
 *  ========================= */
customizeBtn.addEventListener("click", openCustomizeModal);
openCustomizeInline.addEventListener("click", openCustomizeModal);

function saveTheme(obj){ localStorage.setItem("mission_theme", JSON.stringify(obj)); }
function loadTheme(){
  try { return JSON.parse(localStorage.getItem("mission_theme")||"null") || { snow:true, lights:false, reindeer:false, theme:"neon" }; }
  catch { return { snow:true, lights:false, reindeer:false, theme:"neon" }; }
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
        ${toggleHTML("optReindeer", "Renas interativas", "Rudolph segue o mouse", saved.reindeer)}

        <label style="display:grid; gap:6px">
          <span class="muted">Tema chamativo</span>
          <select class="input" id="optTheme">
            <option value="neon">Neon (bem vibrante)</option>
            <option value="candy">Candy (pastel vivo)</option>
            <option value="aurora">Aurora (verde/azul forte)</option>
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

let mouseHandler = null;

function applyTheme({ snow, lights, reindeer, theme }){
  // neve
  const snowCanvas = document.getElementById("snow");
  if (snowCanvas) snowCanvas.style.display = snow ? "block" : "none";

  // pisca-pisca
  const lightsElSafe = document.getElementById("lights");
  if (lightsElSafe) lightsElSafe.classList.toggle("hidden", !lights);

  // renas
  const reindeerLayerSafe = document.getElementById("reindeerLayer");
  if (reindeerLayerSafe){
    if (reindeer){
      spawnReindeer();
    } else {
      reindeerLayerSafe.innerHTML = "";
    }
  }

  // rudolph interativo
  const rudolphSafe = document.getElementById("rudolph");
  if (rudolphSafe){
    if (reindeer){
      rudolphSafe.classList.remove("hidden");
      enableRudolphFollow();
    } else {
      rudolphSafe.classList.add("hidden");
      disableRudolphFollow();
    }
  }

  // tema
  const root = document.documentElement.style;

  if (theme === "neon"){
    root.setProperty("--bgA", "rgba(0, 255, 180, .42)");
    root.setProperty("--bgB", "rgba(255, 0, 220, .40)");
    root.setProperty("--bgC", "rgba(255, 230, 0, .28)");
    root.setProperty("--bgBaseTop", "#030013");
    root.setProperty("--bgBaseMid", "#070018");
    root.setProperty("--bgBaseBot", "#020014");
  } else if (theme === "candy"){
    root.setProperty("--bgA", "rgba(255, 105, 180, .40)");
    root.setProperty("--bgB", "rgba(120, 190, 255, .36)");
    root.setProperty("--bgC", "rgba(170, 255, 200, .28)");
    root.setProperty("--bgBaseTop", "#08051a");
    root.setProperty("--bgBaseMid", "#0a0620");
    root.setProperty("--bgBaseBot", "#060514");
  } else if (theme === "aurora"){
    root.setProperty("--bgA", "rgba(0, 255, 140, .42)");
    root.setProperty("--bgB", "rgba(0, 150, 255, .36)");
    root.setProperty("--bgC", "rgba(180, 255, 120, .26)");
    root.setProperty("--bgBaseTop", "#010c10");
    root.setProperty("--bgBaseMid", "#03121a");
    root.setProperty("--bgBaseBot", "#01070b");
  } else if (theme === "inferno"){
    root.setProperty("--bgA", "rgba(255, 30, 30, .52)");
    root.setProperty("--bgB", "rgba(255, 120, 0, .36)");
    root.setProperty("--bgC", "rgba(255, 220, 60, .22)");
    root.setProperty("--bgBaseTop", "#120101");
    root.setProperty("--bgBaseMid", "#1a0303");
    root.setProperty("--bgBaseBot", "#0b0101");
  } else if (theme === "ocean"){
    root.setProperty("--bgA", "rgba(0, 200, 255, .46)");
    root.setProperty("--bgB", "rgba(0, 80, 255, .40)");
    root.setProperty("--bgC", "rgba(0, 255, 200, .24)");
    root.setProperty("--bgBaseTop", "#010612");
    root.setProperty("--bgBaseMid", "#020a1a");
    root.setProperty("--bgBaseBot", "#01040c");
  } else { // classic
    root.setProperty("--bgA", "rgba(255, 60, 60, .42)");
    root.setProperty("--bgB", "rgba(0, 170, 255, .34)");
    root.setProperty("--bgC", "rgba(255, 210, 60, .30)");
    root.setProperty("--bgBaseTop", "#050611");
    root.setProperty("--bgBaseMid", "#05091a");
    root.setProperty("--bgBaseBot", "#04050f");
  }
}


function spawnReindeer(){
  reindeerLayer.innerHTML = "";
  const count = 12;
  const emojis = ["🦌","🛷","🦌","🦌","🦌"];
  for (let i=0; i<count; i++){
    const d = document.createElement("div");
    d.className = "reindeer";
    d.textContent = emojis[i % emojis.length];
    d.style.setProperty("--y", `${Math.floor(Math.random()*70)+5}vh`);
    d.style.left = "0px";
    d.style.top = "0px";
    d.style.fontSize = `${22 + Math.random()*18}px`;
    d.style.animationDelay = `${i * 0.55}s`;
    d.style.animationDuration = `${6.5 + Math.random()*5.5}s`;
    reindeerLayer.appendChild(d);
  }
}

function enableRudolphFollow(){
  if (mouseHandler) return;
  mouseHandler = (e) => {
    rudolph.style.left = `${e.clientX}px`;
    rudolph.style.top = `${e.clientY}px`;
  };
  window.addEventListener("mousemove", mouseHandler);
}
function disableRudolphFollow(){
  if (!mouseHandler) return;
  window.removeEventListener("mousemove", mouseHandler);
  mouseHandler = null;
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

applyTheme(loadTheme());

showOnly(screenLoading);
setTimeout(() => {
  showOnly(screenForm);
  userNameEl.value = localStorage.getItem("mission_name") || "";
  userSectorEl.value = localStorage.getItem("mission_sector") || "";
}, 1100);
