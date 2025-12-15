// js/main.js (ESM)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/** =========================
 *  Firebase config
 *  =========================
 *  Cole aqui o firebaseConfig do seu app Web (Firebase Console -> Project settings -> Your apps).
 */
const firebaseConfig = {
  // TODO: cole suas chaves aqui
};

let db = null;

function hasFirebaseConfig(cfg){
  return !!(cfg && cfg.apiKey && cfg.projectId && cfg.appId);
}

try{
  if (hasFirebaseConfig(firebaseConfig)){
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } else {
    console.warn("[Modo local] Firebase config não preenchido. Ranking ficará indisponível até configurar.");
  }
} catch (err){
  console.warn("[Modo local] Falha ao inicializar Firebase. Ranking ficará indisponível.", err);
  db = null;
}


/** =========================
 *  Setores (VOCÊ vai me passar a lista oficial)
 *  ========================= */
const SECTORS = [
  "Selecione…",
  "Financeiro",
  "RH",
  "TI",
  "Jurídico",
  "Comercial"
];

/** =========================
 *  Conteúdo dos 3 níveis
 *  (Você pode trocar depois com facilidade)
 *  Cada nível: 3 erros
 *  ========================= */
const levels = [
  {
    name: "Fácil",
    intro: `O Papai Noel, editor-chefe, pediu sua ajuda para revisar a Mensagem de Natal.
Ele escreveu tão rápido que acabou deixando três errinhos para trás.`,
    instruction: `Revisor, clique a nos erros a serem corrigidos para ajudar o Papai Noel nesta importante missão!`,
    raw: `Mais do que presentes e refeissões caprichadas, o Natal é a época de lembrar o valor de um abraço apertado e de um sorriso sincero! Que para voces, meus amigos, seja uma época xeia de carinho e amor, preenchida pelo que realmente importa nessa vida!`,
    corrections: {
      "refeissões": "refeições",
      "voces": "vocês",
      "xeia": "cheia"
    }
  },
  {
    name: "Médio",
    intro: `Nível intermediário! A equipe editorial encontrou mais um rascunho.`,
    instruction: `Clique nos erros e corrija para manter a qualidade da publicação!`,
    raw: `Que o Natal traga paz, saude e muita esperança! Que a união da família seja sempre valorizada e que cada dia seja uma nova oportuinidade de fazer o bem!`,
    corrections: {
      "saude": "saúde",
      "oportuinidade": "oportunidade",
      "família": "família" // (exemplo “pegadinha”: aqui está correto; você pode remover e colocar outro erro real)
    }
  },
  {
    name: "Difícil",
    intro: `Agora é o nível difícil: revisão de última hora!`,
    instruction: `Atenção total: clique apenas onde for necessário e corrija com precisão.`,
    raw: `Neste fim de ano, que possamos renovar os votos de gratidão e seguir com corajem, generosidade e resiliencia. Boas festas a todos!`,
    corrections: {
      "corajem": "coragem",
      "resiliencia": "resiliência",
      "fim": "fim" // (troque por um erro real se preferir; deixei placeholder)
    }
  }
];

/**
 * IMPORTANTE:
 * Nos níveis Médio/Difícil eu deixei 2 “placeholders” onde você pode trocar por erros reais.
 * Se você me mandar as frases médias/difíceis prontas com 3 erros cada, eu ajusto 100% redondo.
 */

/** =========================
 *  Elementos / telas
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
const finalBox1 = document.getElementById("finalBox1");
const finalBox2 = document.getElementById("finalBox2");
const finalBox3 = document.getElementById("finalBox3");
const restartBtn = document.getElementById("restartBtn");
const finalRankingBtn = document.getElementById("finalRankingBtn");

const rankingBtn = document.getElementById("rankingBtn");
const customizeBtn = document.getElementById("customizeBtn");
const openCustomizeInline = document.getElementById("openCustomizeInline");

const lightsEl = document.getElementById("lights");
const reindeerLayer = document.getElementById("reindeerLayer");

/** =========================
 *  Modal genérico
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

/** =========================
 *  Estado do jogo
 *  ========================= */
let levelIndex = 0;
let fixedSet = new Set();
let wrongAttempts = 0;
let allowAuto = false;

const correctedHTMLByLevel = []; // para mostrar no final

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
  progressCount.textContent = String(fixedSet.size);
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
  fixedSet = new Set();
  wrongAttempts = 0;
  allowAuto = false;
  autoBtn.classList.add("is-disabled");
  autoBtn.setAttribute("aria-disabled", "true");
  updateCounters();
  nextLevelBtn.disabled = true;
}

/** =========================
 *  Mensagem clicável
 *  ========================= */
function buildClickableMessage(text){
  const tokens = text.split(/(\s+)/);
  const frag = document.createDocumentFragment();

  tokens.forEach(tok => {
    if (/^\s+$/.test(tok)) {
      frag.appendChild(document.createTextNode(tok));
      return;
    }

    const m = tok.match(/^([“"(']*)(.+?)([”"')!?,.:;]*)$/);
    if (!m){
      frag.appendChild(document.createTextNode(tok));
      return;
    }

    const [, pre, core, post] = m;
    if (pre) frag.appendChild(document.createTextNode(pre));

    const span = document.createElement("span");
    span.className = "word";
    span.dataset.word = core;
    span.textContent = core;
    span.addEventListener("click", () => onWordClick(span));
    frag.appendChild(span);

    if (post) frag.appendChild(document.createTextNode(post));
  });

  messageArea.innerHTML = "";
  messageArea.appendChild(frag);
  requestAnimationFrame(() => messageArea.classList.add("show"));
}

function markWordCorrected(span, corrections){
  span.classList.remove("error");
  span.classList.add("corrected");
  span.dataset.fixed = "1";
  const wrong = span.dataset.word;
  span.textContent = corrections[wrong] || span.textContent;
}

function onWordClick(span){
  const lvl = levels[levelIndex];
  const corrections = lvl.corrections;
  const word = span.dataset.word;
  const isWrong = Object.prototype.hasOwnProperty.call(corrections, word);

  if (!isWrong){
    // clique em palavra correta = erro + marca vermelho (uma vez por palavra)
    if (span.dataset.misclick !== "1"){
      span.dataset.misclick = "1";
      wrongAttempts += 1;
      updateCounters();
      unlockAutoIfNeeded();
      span.classList.add("error");
    }
    openModal({
      title: "Revisão",
      bodyHTML: `<p><strong>Hmmm...</strong> A palavra que você clicou já está correta...</p>`,
      buttons: [{ label: "Entendi", onClick: closeModal }]
    });
    return;
  }

  if (span.dataset.fixed === "1"){
    openModal({
      title: "Tudo certo!",
      bodyHTML: `<p>Essa já foi corrigida. ✅</p>`,
      buttons: [{ label: "Fechar", onClick: closeModal }]
    });
    return;
  }

  const correct = corrections[word];
  openModal({
    title: "Corrigir palavra",
    bodyHTML: `
      <p>Você clicou em: <strong>${word}</strong></p>
      <p>Digite a forma correta:</p>
      <input class="input" id="fixInput" type="text" autocomplete="off" placeholder="Digite aqui..." />
    `,
    buttons: [
      {
        label: "Confirmar correção",
        onClick: () => {
          const typed = document.getElementById("fixInput")?.value ?? "";
          const ok = normalize(typed) === normalize(correct);

          if (ok){
            fixedSet.add(word);
            updateCounters();
            markWordCorrected(span, corrections);

            openModal({
              title: "Perfeito!",
              bodyHTML: `<p><strong>Obrigado, sua correção está certinha!</strong> ✅</p>`,
              buttons: [{ label: "Continuar", onClick: () => { closeModal(); checkLevelDone(); } }]
            });
          } else {
            wrongAttempts += 1;
            updateCounters();
            unlockAutoIfNeeded();
            span.classList.add("error");

            openModal({
              title: "Ops!",
              bodyHTML: `<p>Ops, você errou. O correto seria <strong>${correct}</strong>.</p>`,
              buttons: [{ label: "Tentar outra", onClick: closeModal }]
            });
          }
        }
      }
    ]
  });

  setTimeout(() => document.getElementById("fixInput")?.focus(), 30);
}

function getCorrectedMessageHTML(levelRaw, corrections){
  let corrected = levelRaw;
  for (const [wrong, right] of Object.entries(corrections)){
    corrected = corrected.replaceAll(wrong, `@@${right}@@`);
  }
  corrected = corrected.replaceAll(/@@(.*?)@@/g, `<span class="final-highlight">$1</span>`);
  return corrected;
}

function checkLevelDone(){
  const lvl = levels[levelIndex];
  const total = Object.keys(lvl.corrections).length;
  if (fixedSet.size >= total){
    nextLevelBtn.disabled = false;
  }
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

  const lvl = levels[levelIndex];
  document.querySelectorAll(".word").forEach(span => {
    const w = span.dataset.word;
    if (lvl.corrections[w] && span.dataset.fixed !== "1"){
      fixedSet.add(w);
      markWordCorrected(span, lvl.corrections);
    }
  });

  updateCounters();
  openModal({
    title: "Corretor automático",
    bodyHTML: `<p>Pronto! As correções restantes foram aplicadas automaticamente. ✨</p>`,
    buttons: [{ label: "Continuar", onClick: () => { closeModal(); checkLevelDone(); } }]
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

function startLevel(){
  const lvl = levels[levelIndex];
  resetLevelState();

  headerTitle.textContent = `Revisão da Mensagem de Natal — ${lvl.name}`;
  levelLabel.textContent = lvl.name;

  instruction.textContent = "";
  messageArea.classList.remove("show");
  messageArea.innerHTML = "";

  totalFixEl.textContent = String(Object.keys(lvl.corrections).length);

  // modal de intro com countdown 3s
  let countdown = 3;
  let interval;

  openModal({
    title: `🎅 ${lvl.name}`,
    bodyHTML: `
      <p style="white-space:pre-line">${lvl.intro}</p>
      <p style="margin-top:12px">
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
      buildClickableMessage(lvl.raw);
    }
  });
  obs.observe(overlay, { attributes:true, attributeFilter:["class"] });
}

nextLevelBtn.addEventListener("click", async () => {
  // salva HTML corrigido desse nível para mostrar no final
  const lvl = levels[levelIndex];
  correctedHTMLByLevel[levelIndex] = getCorrectedMessageHTML(lvl.raw, lvl.corrections);

  // registra estatística por setor (apenas agregado)
  await updateSectorStats({
    sector: getUserSector(),
    levelName: lvl.name,
    wrong: wrongAttempts
  });

  levelIndex += 1;
  if (levelIndex < levels.length){
    startLevel();
  } else {
    showFinal();
  }
});

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

function showFinal(){
  // garante que o último nível também ficou salvo
  const last = levels.length - 1;
  if (!correctedHTMLByLevel[last]){
    const lvl = levels[last];
    correctedHTMLByLevel[last] = getCorrectedMessageHTML(lvl.raw, lvl.corrections);
  }

  const name = getUserName();
  finalCongrats.textContent = `Parabéns, ${name}! Você ajudou o editor-chefe a publicar no prazo!`;

  finalBox1.innerHTML = `<p style="margin:0">${correctedHTMLByLevel[0] ?? ""}</p>`;
  finalBox2.innerHTML = `<p style="margin:0">${correctedHTMLByLevel[1] ?? ""}</p>`;
  finalBox3.innerHTML = `<p style="margin:0">${correctedHTMLByLevel[2] ?? ""}</p>`;

  headerTitle.textContent = "Missão concluída 🎄";
  showOnly(screenFinal);
}

restartBtn.addEventListener("click", () => {
  showOnly(screenForm);
});

finalRankingBtn.addEventListener("click", () => openRankingModal());
rankingBtn.addEventListener("click", () => openRankingModal());

/** =========================
 *  Ranking (agregado por setor) - Firestore
 *  =========================
 *  Coleção: sectorStats
 *  Documento por setor: { count, totalWrong, levelsDone }
 */
async function updateSectorStats({ sector, levelName, wrong }){
  if (!db) return;
  if (!sector) return;
  const ref = doc(db, "sectorStats", sector);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists() ? snap.data() : { count: 0, totalWrong: 0, levelsDone: 0 };

    // cada "nível concluído" conta +1 em levelsDone, e +1 em count (participação por nível)
    const next = {
      count: (data.count || 0) + 1,
      totalWrong: (data.totalWrong || 0) + (wrong || 0),
      levelsDone: (data.levelsDone || 0) + 1,
      updatedAt: serverTimestamp()
    };
    tx.set(ref, next, { merge: true });
  });
}

async function openRankingModal(){
    if (!db){
    openModal({
      title: "🏆 Ranking",
      bodyHTML: `<p>O ranking ainda não está disponível porque o Firebase não foi configurado.</p>
                <p class="muted">Assim que você colar o <strong>firebaseConfig</strong> no arquivo <code>js/main.js</code>, o ranking passa a funcionar.</p>`,
      buttons: [{ label: "Entendi", onClick: closeModal }]
    });
    return;
  }
  // carrega stats por setor (simples: tenta pegar docs dos setores do select)
  const sectors = SECTORS.filter(s => s !== "Selecione…");
  const rows = [];

  for (const s of sectors){
    const ref = doc(db, "sectorStats", s);
    const snap = await getDoc(ref);
    const d = snap.exists() ? snap.data() : { count: 0, totalWrong: 0, levelsDone: 0 };
    const avgWrong = d.count ? (d.totalWrong / d.count) : 0;
    rows.push({ sector: s, count: d.count || 0, avgWrong });
  }

  rows.sort((a,b) => a.avgWrong - b.avgWrong || b.count - a.count);

  const table = `
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
    <p style="margin:12px 0 0" class="muted">
      Ranking exibido por setor (sem nomes), conforme diretrizes da LGPD.
    </p>
  `;

  openModal({
    title: "🏆 Ranking por setor",
    bodyHTML: table,
    buttons: [{ label: "Fechar", onClick: closeModal }]
  });
}

/** =========================
 *  Personalização (modal)
 *  ========================= */
customizeBtn.addEventListener("click", () => openCustomizeModal());
openCustomizeInline.addEventListener("click", () => openCustomizeModal());

function openCustomizeModal(){
  const saved = loadTheme();

  openModal({
    title: "⚙️ Personalizar página",
    bodyHTML: `
      <p class="muted">Escolha efeitos e cores para deixar a página com a sua cara.</p>

      <div style="display:grid; gap:10px; margin-top:12px">
        <label style="display:flex; gap:10px; align-items:center">
          <input type="checkbox" id="optSnow" ${saved.snow ? "checked" : ""}/>
          <span>Neve</span>
        </label>
        <label style="display:flex; gap:10px; align-items:center">
          <input type="checkbox" id="optLights" ${saved.lights ? "checked" : ""}/>
          <span>Pisca-pisca</span>
        </label>
        <label style="display:flex; gap:10px; align-items:center">
          <input type="checkbox" id="optReindeer" ${saved.reindeer ? "checked" : ""}/>
          <span>Renas voando</span>
        </label>

        <label style="display:grid; gap:6px">
          <span class="muted">Tema</span>
          <select class="input" id="optTheme">
            <option value="classic">Clássico</option>
            <option value="cool">Gelo</option>
            <option value="warm">Quentinho</option>
          </select>
        </label>
      </div>
    `,
    buttons: [
      {
        label: "Aplicar",
        onClick: () => {
          const snow = document.getElementById("optSnow")?.checked;
          const lights = document.getElementById("optLights")?.checked;
          const reindeer = document.getElementById("optReindeer")?.checked;
          const theme = document.getElementById("optTheme")?.value || "classic";

          applyTheme({ snow, lights, reindeer, theme });
          saveTheme({ snow, lights, reindeer, theme });

          closeModal();
        }
      },
      { label: "Fechar", onClick: closeModal, variant: "ghost" }
    ]
  });

  // set select após render
  setTimeout(() => {
    const sel = document.getElementById("optTheme");
    if (sel) sel.value = saved.theme || "classic";
  }, 0);
}

function applyTheme({ snow, lights, reindeer, theme }){
  // neve
  const snowCanvas = document.getElementById("snow");
  snowCanvas.style.display = snow ? "block" : "none";

  // pisca-pisca
  lightsEl.classList.toggle("hidden", !lights);

  // renas
  if (reindeer){
    spawnReindeer();
  } else {
    reindeerLayer.innerHTML = "";
  }

  // cores
  const root = document.documentElement.style;
  if (theme === "classic"){
    root.setProperty("--accentA", "rgba(255, 80, 80, .20)");
    root.setProperty("--accentB", "rgba(0, 180, 255, .18)");
    root.setProperty("--accentC", "rgba(255, 210, 90, .14)");
  } else if (theme === "cool"){
    root.setProperty("--accentA", "rgba(120, 220, 255, .18)");
    root.setProperty("--accentB", "rgba(0, 160, 255, .20)");
    root.setProperty("--accentC", "rgba(160, 255, 230, .12)");
  } else {
    root.setProperty("--accentA", "rgba(255, 140, 90, .18)");
    root.setProperty("--accentB", "rgba(255, 90, 140, .16)");
    root.setProperty("--accentC", "rgba(255, 210, 90, .16)");
  }
}

function spawnReindeer(){
  reindeerLayer.innerHTML = "";
  const count = 6;
  for (let i=0; i<count; i++){
    const d = document.createElement("div");
    d.className = "reindeer";
    d.textContent = "🦌";
    const y = Math.floor(Math.random() * 70) + 5;
    d.style.setProperty("--y", `${y}vh`);
    d.style.animationDelay = `${i * 1.2}s`;
    d.style.animationDuration = `${9 + Math.random()*6}s`;
    reindeerLayer.appendChild(d);
  }
}

function saveTheme(obj){
  localStorage.setItem("mission_theme", JSON.stringify(obj));
}
function loadTheme(){
  try {
    return JSON.parse(localStorage.getItem("mission_theme") || "null") || {
      snow: true, lights: false, reindeer: false, theme: "classic"
    };
  } catch {
    return { snow: true, lights: false, reindeer: false, theme: "classic" };
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
  const FLAKES = 140;

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
  function rand(min, max){ return Math.random() * (max - min) + min; }
  function makeFlake(){
    return {
      x: rand(0, w),
      y: rand(-h, 0),
      r: rand(1.2, 3.6),
      vy: rand(0.6, 1.9),
      vx: rand(-0.4, 0.6),
      sway: rand(0.002, 0.01),
      phase: rand(0, Math.PI * 2)
    };
  }
  function refill(){
    flakes.length = 0;
    for (let i=0;i<FLAKES;i++) flakes.push(makeFlake());
  }
  function tick(){
    ctx.clearRect(0, 0, w, h);
    for (const f of flakes){
      f.phase += f.sway * 60;
      f.x += f.vx + Math.sin(f.phase) * 0.35;
      f.y += f.vy;

      if (f.y > h + 10){ f.y = rand(-40, -10); f.x = rand(0, w); }
      if (f.x < -10) f.x = w + 10;
      if (f.x > w + 10) f.x = -10;

      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  window.addEventListener("resize", () => { resize(); refill(); });
  resize(); refill(); tick();
})();

/** =========================
 *  Boot
 *  ========================= */
populateSectors();

// aplica tema salvo
applyTheme(loadTheme());

// Loading fake: 1.4s e vai pro form
showOnly(screenLoading);
setTimeout(() => {
  showOnly(screenForm);
  // preencher nome/setor do último uso
  userNameEl.value = localStorage.getItem("mission_name") || "";
  userSectorEl.value = localStorage.getItem("mission_sector") || "";
}, 1400);
