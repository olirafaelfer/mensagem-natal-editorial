// =====================
// Conteúdo
// =====================
const introText = `O Papai Noel, editor-chefe, pediu sua ajuda para revisar a Mensagem de Natal.
Ele escreveu tão rápido que acabou deixando três errinhos para trás.`;

const rawMessage = `Mais do que presentes e refeissões caprichadas, o Natal é a época de lembrar o valor de um abraço apertado e de um sorriso sincero! Que para voces, meus amigos, seja uma época xeia de carinho e amor, preenchida pelo que realmente importa nessa vida!`;

const instructionText = `Revisor, clique nos erros a serem corrigidos para ajudar o Papai Noel nesta importante missão!`;

// palavras erradas -> corretas
const corrections = {
  "refeissões": "refeições",
  "voces": "vocês",
  "xeia": "cheia"
};

const totalToFix = Object.keys(corrections).length;

let fixedSet = new Set();
let wrongAttempts = 0;
let currentTarget = null;
let allowAuto = false;

// =====================
// Elementos
// =====================
const messageArea = document.getElementById("messageArea");
const instruction = document.getElementById("instruction");

const overlay = document.getElementById("overlay");
const modalBody = document.getElementById("modalBody");
const modalFoot = document.getElementById("modalFoot");
const modalTitle = document.getElementById("modalTitle");
const closeModalBtn = document.getElementById("closeModal");

const autoBtn = document.getElementById("autoBtn");
const autoWrap = document.getElementById("autoWrap");

autoWrap.addEventListener("click", () => {
  if (autoBtn.disabled) {
    openModal({
      title: "Atenção",
      bodyHTML: `<p>Este botão só será liberado depois de 3 tentativas erradas.</p>`,
      buttons: [{ label: "Entendi", onClick: closeModal }]
    });
  }
});

const progressCount = document.getElementById("progressCount");
const wrongCount = document.getElementById("wrongCount");

const page1 = document.getElementById("page1");
const page2 = document.getElementById("page2");
const restartBtn = document.getElementById("restartBtn");

const finalBox = document.getElementById("finalBox");


// =====================
// Helpers
// =====================
function normalize(str){
  return (str || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
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

function openModal({ title, bodyHTML, buttons=[] }){
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHTML;
  modalFoot.innerHTML = "";

  buttons.forEach(btn => {
    const b = document.createElement("button");
    b.className = "btn" + (btn.variant ? ` ${btn.variant}` : "");
    b.textContent = btn.label;
    b.disabled = !!btn.disabled;
    b.addEventListener("click", btn.onClick);
    modalFoot.appendChild(b);
  });

  overlay.classList.remove("hidden");
  requestAnimationFrame(() => overlay.classList.add("show"));
}

function closeModal(){
  overlay.classList.remove("show");
  setTimeout(() => overlay.classList.add("hidden"), 180);
  currentTarget = null;
}

function markWordCorrected(wordSpan){
  wordSpan.classList.remove("error");
  wordSpan.classList.add("corrected");
  wordSpan.dataset.fixed = "1";
  // troca para a forma correta
  const wrong = wordSpan.dataset.word;
  wordSpan.textContent = corrections[wrong] || wordSpan.textContent;
}

function markWordError(wordSpan){
  wordSpan.classList.add("error");
}

function getCorrectedMessageHTML(){
  // cria uma versão final com destaque somente nas palavras corrigidas
  let corrected = rawMessage;

  for (const [wrong, right] of Object.entries(corrections)){
    corrected = corrected.replaceAll(wrong, `@@${right}@@`);
  }

  corrected = corrected.replaceAll(/@@(.*?)@@/g, `<span class="final-highlight">$1</span>`);
  return corrected;
}

function goToFinal(){
  page1.classList.add("hidden");
  page2.classList.remove("hidden");
  finalBox.innerHTML = `<p style="margin:0">${getCorrectedMessageHTML()}</p>`;
}

function maybeFinish(){
  if (fixedSet.size === totalToFix){
    goToFinal();
  }
}

// =====================
// Monta mensagem clicável (SEM destacar erros inicialmente)
// =====================
function buildClickableMessage(text){
  const tokens = text.split(/(\s+)/); // preserva espaços
  const frag = document.createDocumentFragment();

  tokens.forEach(tok => {
    if (/^\s+$/.test(tok)) {
      frag.appendChild(document.createTextNode(tok));
      return;
    }

    // separa pontuação “grudada”
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
}

// =====================
// Clique nas palavras
// =====================
function onWordClick(span){
  const word = span.dataset.word;
  const isWrong = Object.prototype.hasOwnProperty.call(corrections, word);

  // se for uma das erradas, mas já corrigida
  if (isWrong && span.dataset.fixed === "1"){
    openModal({
      title: "Tudo certo!",
      bodyHTML: `<p>Essa já foi corrigida. ✅</p>`,
      buttons: [{ label: "Fechar", onClick: closeModal }]
    });
    return;
  }

  // clicou numa palavra correta => conta como erro e marca vermelho
  if (!isWrong){
    // conta 1 vez por palavra correta clicada (evita liberar o auto com spam no mesmo lugar)
    if (span.dataset.misclick !== "1"){
      span.dataset.misclick = "1";
      wrongAttempts += 1;
      updateCounters();
      unlockAutoIfNeeded();
      markWordError(span);
    }

    openModal({
      title: "Revisão",
      bodyHTML: `<p><strong>Hmmm...</strong> A palavra que você clicou já está correta...</p>`,
      buttons: [{ label: "Entendi", onClick: closeModal }]
    });
    return;
  }

  // palavra errada (ainda não corrigida): pedir correção
  currentTarget = word;
  const correct = corrections[word];

  openModal({
    title: "Corrigir palavra",
    bodyHTML: `
      <p>Você clicou em: <strong>${word}</strong></p>
      <p>Digite a forma correta:</p>
      <input class="input" id="fixInput" type="text" autocomplete="off" placeholder="Digite aqui..." />
      <div style="height:10px"></div>
      <p class="hint">Dica: use acentos se necessário 😉</p>
    `,
    buttons: [
      { label: "Confirmar correção", onClick: () => confirmCorrection(span, correct) }
    ]
  });

  setTimeout(() => {
    const input = document.getElementById("fixInput");
    if (input) input.focus();
  }, 50);
}

function confirmCorrection(span, correct){
  const input = document.getElementById("fixInput");
  const typed = input ? input.value : "";

  // compara com tolerância a acentos/caixa (você pode exigir acento removendo normalize)
  const ok = normalize(typed) === normalize(correct);

  if (ok){
    fixedSet.add(currentTarget);
    updateCounters();
    markWordCorrected(span);

    openModal({
      title: "Perfeito!",
      bodyHTML: `<p><strong>Obrigado, sua correção está certinha!</strong> ✅</p>`,
      buttons: [{ label: "Continuar", onClick: () => { closeModal(); maybeFinish(); } }]
    });
    return;
  }

  // errou a correção
  wrongAttempts += 1;
  updateCounters();
  unlockAutoIfNeeded();

  // marca a palavra errada clicada de vermelho também (feedback visual)
  markWordError(span);

  openModal({
    title: "Ops!",
    bodyHTML: `<p>Ops, você errou. O correto seria <strong>${correct}</strong>.</p>`,
    buttons: [{ label: "Tentar outra", onClick: closeModal }]
  });
}

// =====================
// Corretor automático (aplica o que falta)
// =====================
autoBtn.addEventListener("click", () => {
  if (!allowAuto) {
    openModal({
      title: "Atenção",
      bodyHTML: `<p>Este botão só será liberado depois de 3 tentativas erradas.</p>`,
      buttons: [{ label: "Entendi", onClick: closeModal }]
    });
    return;
  }

  // (se liberado, executa o corretor automático normal)
  document.querySelectorAll(".word").forEach(span => {
    const w = span.dataset.word;
    if (corrections[w] && span.dataset.fixed !== "1"){
      fixedSet.add(w);
      markWordCorrected(span);
    }
  });

  updateCounters();

  openModal({
    title: "Corretor automático",
    bodyHTML: `<p>Pronto! As correções restantes foram aplicadas automaticamente. ✨</p>`,
    buttons: [{ label: "Finalizar", onClick: () => { closeModal(); maybeFinish(); } }]
  });
});
// =====================
// Intro + fluxo inicial
// =====================
function startFlow(){
  instruction.textContent = "";
  messageArea.classList.remove("show");
  messageArea.innerHTML = "";

  let countdown = 3;
  let countdownInterval;

  openModal({
    title: "🎅 Missão de Natal",
    bodyHTML: `
      <p style="white-space:pre-line">${introText}</p>
      <p style="margin-top:12px; color:var(--muted)">
        Você poderá avançar em <strong><span id="countdown">${countdown}</span></strong> segundos...
      </p>
    `,
    buttons: [
      { label: "Avançar", disabled: true, onClick: closeModal }
    ]
  });

  const countdownEl = () => document.getElementById("countdown");

  countdownInterval = setInterval(() => {
    countdown -= 1;
    if (countdownEl()) countdownEl().textContent = countdown;

    if (countdown <= 0){
      clearInterval(countdownInterval);
      const btn = modalFoot.querySelector("button");
      if (btn) btn.disabled = false;
    }
  }, 1000);

  // quando a modal fechar, mostra a mensagem principal
  const observer = new MutationObserver(() => {
    const isHidden = overlay.classList.contains("hidden");
    if (isHidden){
      observer.disconnect();
      clearInterval(countdownInterval);

      instruction.textContent = instructionText;
      buildClickableMessage(rawMessage);

      requestAnimationFrame(() => {
        messageArea.classList.add("show");
      });
    }
  });

  observer.observe(overlay, { attributes:true, attributeFilter:["class"] });
}

// =====================
// Fechar modal (ESC / clique fora / botão X)
// =====================
closeModalBtn.addEventListener("click", closeModal);

overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlay.classList.contains("hidden")) closeModal();
});

// =====================
// Recomeçar
// =====================
restartBtn.addEventListener("click", () => {
  fixedSet = new Set();
  wrongAttempts = 0;
  currentTarget = null;
  allowAuto = false;
  autoBtn.disabled = true;

  // volta para a página 1
  page2.classList.add("hidden");
  page1.classList.remove("hidden");

  updateCounters();
  startFlow();
});

// =====================
// Neve (canvas)
// =====================
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

      if (f.y > h + 10){
        f.y = rand(-40, -10);
        f.x = rand(0, w);
      }
      if (f.x < -10) f.x = w + 10;
      if (f.x > w + 10) f.x = -10;

      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", () => {
    resize();
    refill();
  });

  resize();
  refill();
  tick();
})();

// =====================
// Start
// =====================
updateCounters();
startFlow();
