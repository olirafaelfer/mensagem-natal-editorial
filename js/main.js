// js/main.js (module)

// Firebase (opcional; não quebra se não configurar)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore, doc, getDoc, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/** =========================
 *  Firebase config (cole aqui quando for configurar)
 *  ========================= */
const firebaseConfig = {
  // apiKey: "...",
  // authDomain: "...",
  // projectId: "...",
  // appId: "..."
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
    console.warn("[Modo local] Firebase não configurado. Ranking ficará indisponível.");
  }
} catch (e){
  console.warn("[Modo local] Falha ao inicializar Firebase. Ranking ficará indisponível.", e);
  db = null;
}

/** =========================
 *  Setores (substitua aqui com sua lista real)
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
 *  Níveis (ÚLTIMOS que você testou)
 *  - Médio: vírgulas crassas + concordância
 *  - Difícil: colocação pronominal + vírgula indevida + “os ame”
 *  ========================= */
const levels = [
  {
    name: "Fácil",
    intro: `O Papai Noel, editor-chefe, pediu sua ajuda para revisar a Mensagem de Natal.
Ele escreveu tão rápido que acabou deixando três errinhos para trás.`,
    instruction: `Os erros podem envolver acentuação, ortografia, gramática e outros detalhes editoriais. Clique nas palavras incorretas para ajudar o Papai Noel nesta importante missão!`,
    raw: `Mais do que presentes e refeissões caprichadas, o Natal é a época de lembrar o valor de um abraço apertado e de um sorriso sincero! Que para voces, meus amigos, seja uma época xeia de carinho e amor, preenchida pelo que realmente importa nessa vida!`,
    // regras de correção (regex)
    rules: [
      { id:"f1", type:"word", trigger:"refeissões", wrong:/\brefeissões\b/g, correct:"refeições" },
      { id:"f2", type:"word", trigger:"voces",     wrong:/\bvoces\b/g,     correct:"vocês" },
      { id:"f3", type:"word", trigger:"xeia",      wrong:/\bxeia\b/g,      correct:"cheia" }
    ]
  },
  {
    name: "Médio",
    intro: `Agora o desafio aumenta. Aqui aparecem erros editoriais objetivos: vírgulas mal colocadas e concordância.`,
    instruction: `Atenção: os erros podem envolver pontuação, concordância, acentuação e ortografia. Clique nos pontos problemáticos e corrija.`,
    raw: `O Natal, é um momento especial para celebrar a união e a esperança. As mensagens, que circulam nessa época, precisam transmitir carinho e acolhimento, mas muitas vezes, acabam sendo escritas de forma apressada. Os textos natalinos, exige atenção aos detalhes, para que a mensagem chegue clara ao leitor.`,
    rules: [
      { id:"m1", type:"word", trigger:"Natal",      wrong:/\bNatal,\b/g,      correct:"Natal" },
      { id:"m2", type:"word", trigger:"mensagens",  wrong:/\bmensagens,\b/g,  correct:"mensagens" },
      { id:"m3", type:"word", trigger:"vezes",      wrong:/\bvezes,\b/g,      correct:"vezes" },
      { id:"m4", type:"word", trigger:"natalinos",  wrong:/\bnatalinos,\b/g,  correct:"natalinos" },
      { id:"m5", type:"word", trigger:"exige",      wrong:/\bexige\b/g,       correct:"exigem" }
    ]
  },
  {
    name: "Difícil",
    intro: `Nível difícil: além de ortografia e pontuação, entram escolhas editoriais como colocação pronominal e paralelismo.`,
    instruction: `Os erros podem envolver pontuação, gramática e colocação pronominal. Leia com atenção e corrija com precisão.`,
    raw: `No Natal, se deve pensar no amor ao próximo e na importância da empatia. Aos pais, respeite-os; aos filhos, os ame; aos necessitados, ajude-os. Essas atitudes, reforçam os valores natalinos e mostram como a revisão textual é essencial para evitar ruídos na comunicação.`,
    rules: [
      // colocação pronominal: "No Natal, se deve pensar" -> "No Natal, deve-se pensar"
      { id:"d1", type:"phrase", trigger:"se", wrong:/No Natal,\s*se deve pensar/g, correct:"No Natal, deve-se pensar" },

      // após vírgula: "aos filhos, os ame" -> "aos filhos, ame-os"
      { id:"d2", type:"phrase", trigger:"os", wrong:/aos filhos,\s*os ame/gi, correct:"aos filhos, ame-os" },

      // vírgula separando sujeito do verbo: "Essas atitudes, reforçam" -> "Essas atitudes reforçam"
      { id:"d3", type:"word", trigger:"atitudes", wrong:/\b(atitudes),\b/g, correct:"$1" }
    ]
  }
];

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
 *  LGPD modal (funciona no Opera)
 *  ========================= */
lgpdMoreBtn.addEventListener("click", () => {
  openModal({
    title: "LGPD — Informações sobre tratamento de dados",
    bodyHTML: `
      <p class="muted">
        Esta dinâmica é recreativa e foi criada para destacar a importância da revisão editorial.
      </p>

      <h3 style="margin:14px 0 6px">Quais dados são coletados?</h3>
      <ul style="margin:0; padding-left:18px; color:rgba(255,255,255,.72); line-height:1.6">
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

let currentText = "";           // texto “vivo” do nível (vai sendo corrigido)
let currentRules = [];          // regras do nível
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
 *  Tokenização clicável (preserva pontuação como texto)
 *  ========================= */
function buildClickableMessage(text){
  const tokens = text.split(/(\s+)/);
  const frag = document.createDocumentFragment();

  tokens.forEach(tok => {
    if (/^\s+$/.test(tok)) {
      frag.appendChild(document.createTextNode(tok));
      return;
    }

    // separa pontuação “grudada”, mas mantém a palavra limpa clicável
    const m = tok.match(/^([“"(']*)(.+?)([”"')!?,.:;]*)$/);
    if (!m){
      frag.appendChild(document.createTextNode(tok));
      return;
    }

    const [, pre, core, post] = m;

    if (pre) frag.appendChild(document.createTextNode(pre));

    const span = document.createElement("span");
    span.className = "word";
    span.dataset.word = core; // sem pontuação final
    span.textContent = core;
    span.addEventListener("click", () => onWordClick(span));
    frag.appendChild(span);

    if (post) frag.appendChild(document.createTextNode(post));
  });

  messageArea.innerHTML = "";
  messageArea.appendChild(frag);
  requestAnimationFrame(() => messageArea.classList.add("show"));
}

function markWordCorrected(span){
  span.classList.remove("error");
  span.classList.add("corrected");
  span.dataset.fixed = "1";
}

function onWordClick(span){
  const clicked = span.dataset.word || "";

  // 1) procurar regra “ativa” cujo trigger combine
  const rule = currentRules.find(r =>
    !fixedRuleIds.has(r.id) &&
    normalize(r.trigger) === normalize(clicked)
  );

  // se não é erro “alvo”, conta como erro e marca vermelho (1x por palavra)
  if (!rule){
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

  // já corrigiu esse “ponto” (regra)
  if (fixedRuleIds.has(rule.id)){
    openModal({
      title: "Tudo certo!",
      bodyHTML: `<p>Essa correção já foi feita. ✅</p>`,
      buttons: [{ label: "Fechar", onClick: closeModal }]
    });
    return;
  }

  // pedir a correção
  openModal({
    title: "Corrigir",
    bodyHTML: `
      <p>Você clicou em: <strong>${clicked}</strong></p>
      <p>Digite a forma correta:</p>
      <input class="input" id="fixInput" type="text" autocomplete="off" placeholder="Digite aqui..." />
      <p class="muted" style="margin:10px 0 0">
        Lembrete: os erros podem envolver acentuação, ortografia, pontuação, concordância, colocação pronominal etc.
      </p>
    `,
    buttons: [
      {
        label: "Confirmar correção",
        onClick: () => confirmRule(rule, span)
      }
    ]
  });

  setTimeout(() => document.getElementById("fixInput")?.focus(), 30);
}

function confirmRule(rule, span){
  const typed = document.getElementById("fixInput")?.value ?? "";
  const expected = rule.correct;

  const ok = normalize(typed) === normalize(expected);

  if (ok){
    // aplica regra ao texto inteiro
    currentText = currentText.replace(rule.wrong, rule.correct);

    fixedRuleIds.add(rule.id);
    updateCounters();
    markWordCorrected(span);

    // reconstruir mensagem para refletir mudanças (principalmente em frases)
    buildClickableMessage(currentText);

    closeModal();
    checkLevelDone();
    return;
  }

  // erro
  wrongAttempts += 1;
  updateCounters();
  unlockAutoIfNeeded();
  span.classList.add("error");

  openModal({
    title: "Ops!",
    bodyHTML: `<p>Ops, você errou. O correto seria <strong>${expected}</strong>.</p>`,
    buttons: [{ label: "Ok", onClick: closeModal }]
  });
}

function checkLevelDone(){
  const total = currentRules.length;
  if (fixedRuleIds.size >= total){
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

  // aplica todas as regras restantes
  for (const rule of currentRules){
    if (!fixedRuleIds.has(rule.id)){
      currentText = currentText.replace(rule.wrong, rule.correct);
      fixedRuleIds.add(rule.id);
    }
  }

  updateCounters();
  buildClickableMessage(currentText);
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
  messageArea.classList.remove("show");
  messageArea.innerHTML = "";

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
      buildClickableMessage(currentText);
    }
  });
  obs.observe(overlay, { attributes:true, attributeFilter:["class"] });
}

nextLevelBtn.addEventListener("click", async () => {
  // salva HTML corrigido desse nível (destaca correções do nível)
  correctedHTMLByLevel[levelIndex] = highlightLevelCorrections(levels[levelIndex], currentText);

  // grava agregado por setor (opcional)
  await updateSectorStats({
    sector: getUserSector(),
    wrong: wrongAttempts
  });

  levelIndex += 1;
  if (levelIndex < levels.length){
    startLevel();
  } else {
    showFinal();
  }
});

function highlightLevelCorrections(levelDef, correctedText){
  // destacamos as formas corretas (rule.correct), mas com cuidado: só destacar as “correções” mesmo.
  // Aqui fazemos uma estratégia simples: percorre as rules e marca a ocorrência do "correct".
  let html = correctedText;
  for (const rule of levelDef.rules){
    const safe = rule.correct.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(safe, "g");
    html = html.replace(re, `@@${rule.correct}@@`);
  }
  html = html.replaceAll(/@@(.*?)@@/g, `<span class="final-highlight">$1</span>`);
  return html;
}

function showFinal(){
  const name = getUserName();

  finalCongrats.textContent =
    `Parabéns, ${name}! Você ajudou o editor-chefe a publicar a mensagem de Natal no prazo!`;

  finalRecado.textContent =
    `Recado editorial: uma boa revisão e editoração — com atenção à ortografia, pontuação, concordância, colocação pronominal e diagramação — evita ruídos e valoriza a experiência do leitor.`;

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
 *  Ranking (agregado por setor) - Firestore (opcional)
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

    const next = {
      count: (data.count || 0) + 1,
      totalWrong: (data.totalWrong || 0) + (wrong || 0),
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
                <p class="muted">Quando você colar o <strong>firebaseConfig</strong> no <code>js/main.js</code>, ele passa a funcionar.</p>`,
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
    const avgWrong = d.count ? (d.totalWrong / d.count) : 0;
    rows.push({ sector: s, count: d.count || 0, avgWrong });
  }

  rows.sort((a,b) => a.avgWrong - b.avgWrong || b.count - a.count);

  openModal({
    title: "🏆 Ranking por setor",
    bodyHTML: `
      <div style="overflow:auto">
        <table class="table">
          <thead>
            <tr>
              <th>Setor</th>
              <th class="num">Participações</th>
              <th class="num">Média de erros</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${r.sector}</td>
                <td class="num">${r.count}</td>
                <td class="num">${r.avgWrong.toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <p class="muted" style="margin:12px 0 0">
        Ranking exibido por setor (sem nomes), conforme diretrizes da LGPD.
      </p>
    `,
    buttons: [{ label:"Fechar", onClick: closeModal }]
  });
}

/** =========================
 *  Personalização (ao vivo!)
 *  ========================= */
customizeBtn.addEventListener("click", () => openCustomizeModal());
openCustomizeInline.addEventListener("click", () => openCustomizeModal());

function openCustomizeModal(){
  const saved = loadTheme();

  openModal({
    title: "⚙️ Personalizar página",
    bodyHTML: `
      <p class="muted">As alterações são aplicadas imediatamente (ao vivo).</p>

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
            <option value="classic">Clássico (vivo)</option>
            <option value="cool">Gelo (vivo)</option>
            <option value="warm">Quentinho (vivo)</option>
            <option value="neon">Neon</option>
            <option value="candy">Candy</option>
            <option value="midnight">Noite estrelada</option>
          </select>
        </label>
      </div>
    `,
    buttons: [{ label:"Fechar", onClick: closeModal }]
  });

  // set select e bind “ao vivo”
  setTimeout(() => {
    const optSnow = document.getElementById("optSnow");
    const optLights = document.getElementById("optLights");
    const optReindeer = document.getElementById("optReindeer");
    const optTheme = document.getElementById("optTheme");

    if (!optTheme) return;

    optTheme.value = saved.theme || "classic";

    const applyNow = () => {
      const snow = !!optSnow?.checked;
      const lights = !!optLights?.checked;
      const reindeer = !!optReindeer?.checked;
      const theme = optTheme.value || "classic";
      applyTheme({ snow, lights, reindeer, theme });
      saveTheme({ snow, lights, reindeer, theme });
    };

    optSnow?.addEventListener("change", applyNow);
    optLights?.addEventListener("change", applyNow);
    optReindeer?.addEventListener("change", applyNow);
    optTheme.addEventListener("change", applyNow);

    // aplica uma vez ao abrir (garante consistência)
    applyNow();
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

  // cores (bem vivas)
  const root = document.documentElement.style;

  if (theme === "classic"){
    root.setProperty("--accentA", "rgba(255, 60, 60, .34)");
    root.setProperty("--accentB", "rgba(0, 170, 255, .28)");
    root.setProperty("--accentC", "rgba(255, 210, 60, .22)");
  } else if (theme === "cool"){
    root.setProperty("--accentA", "rgba(120, 230, 255, .30)");
    root.setProperty("--accentB", "rgba(0, 140, 255, .30)");
    root.setProperty("--accentC", "rgba(160, 255, 230, .20)");
  } else if (theme === "warm"){
    root.setProperty("--accentA", "rgba(255, 120, 60, .30)");
    root.setProperty("--accentB", "rgba(255, 70, 150, .26)");
    root.setProperty("--accentC", "rgba(255, 220, 80, .24)");
  } else if (theme === "neon"){
    root.setProperty("--accentA", "rgba(0, 255, 180, .26)");
    root.setProperty("--accentB", "rgba(255, 0, 200, .22)");
    root.setProperty("--accentC", "rgba(255, 230, 0, .18)");
  } else if (theme === "candy"){
    root.setProperty("--accentA", "rgba(255, 105, 180, .26)");
    root.setProperty("--accentB", "rgba(120, 190, 255, .22)");
    root.setProperty("--accentC", "rgba(170, 255, 200, .18)");
  } else { // midnight
    root.setProperty("--accentA", "rgba(180, 120, 255, .18)");
    root.setProperty("--accentB", "rgba(80, 160, 255, .18)");
    root.setProperty("--accentC", "rgba(255, 210, 120, .12)");
  }
}

function spawnReindeer(){
  reindeerLayer.innerHTML = "";
  const count = 10;
  for (let i=0; i<count; i++){
    const d = document.createElement("div");
    d.className = "reindeer";
    d.textContent = "🦌";
    const y = Math.floor(Math.random() * 70) + 5;
    d.style.setProperty("--y", `${y}vh`);
    d.style.left = `${-10 - Math.random()*20}vw`;
    d.style.top = "0";
    d.style.fontSize = `${22 + Math.random()*14}px`;
    d.style.animationDelay = `${i * 0.9}s`;
    d.style.animationDuration = `${7.5 + Math.random()*5}s`;
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
  const FLAKES = 150;

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
      r: rand(1.2, 3.8),
      vy: rand(0.7, 2.2),
      vx: rand(-0.5, 0.7),
      sway: rand(0.002, 0.012),
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
      ctx.fillStyle = "rgba(255,255,255,0.88)";
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

// Loading fake: 1.2s e vai pro form
showOnly(screenLoading);
setTimeout(() => {
  showOnly(screenForm);
  userNameEl.value = localStorage.getItem("mission_name") || "";
  userSectorEl.value = localStorage.getItem("mission_sector") || "";
}, 1200);
