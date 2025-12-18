// V1/js/main.js
import { showModal } from "./modules/ui-modal.js";
import { initTheme } from "./modules/theme-fx.js";
import { watchAuth, login, signup, logout, loginGooglePopup } from "./modules/auth.js";
import { submitChallengeScore, loadRankingTop } from "./modules/ranking.js";
import { loadUserProfile, upsertUserProfile } from "./modules/profile.js";

const $ = (id)=>document.getElementById(id);

const screens = {
  loading: $("screenLoading"),
  home: $("screenHome"),
  game: $("screenGame"),
  final: $("screenFinal"),
};

function showScreen(name){
  Object.entries(screens).forEach(([k,el])=>{
    if(!el) return;
    el.classList.toggle("hidden", k!==name);
  });
}

const LS_KEY = "missaoNatal_v1_state";

const state = {
  user: null,
  guest: { name:"", sector:"", optIn:true },
  progress: { tutorialDone:false, d1Done:false, d2Done:false, d3Done:false },
  challenge: 1,
  task: 1,
  score: 0,
  pending: [],
  solved: new Set(),
  fixes: [],
  challengeFixes: [],
  autoHintsUsed: 0,
  mode: "home", // home | game | tutorial
};

function saveLS(){
  const payload = {
    guest: state.guest,
    progress: state.progress
  };
  localStorage.setItem(LS_KEY, JSON.stringify(payload));
}
function loadLS(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return;
    const p = JSON.parse(raw);
    if(p?.guest) state.guest = { ...state.guest, ...p.guest };
    if(p?.progress) state.progress = { ...state.progress, ...p.progress };
  }catch{}
}

function setHomeNote(){
  const el = $("homeNote");
  const logged = !!state.user;
  el.textContent = logged
    ? `Logado como ${state.user.email || "usuário"}. Desafios 2 e 3 liberam ao concluir o anterior.`
    : "Você está como visitante. Para ranking e desafios 2/3, faça login no ícone 👤.";
}

function computeLocks(){
  const logged = !!state.user;
  $("btnD2").disabled = !logged || !state.progress.d1Done;
  $("btnD3").disabled = !logged || !state.progress.d2Done;
  $("btnSpecial").disabled = !(logged && state.progress.d3Done);
  setHomeNote();
}

function requireGuest(){
  state.guest.name = $("guestName").value.trim();
  state.guest.sector = $("guestSector").value.trim();
  state.guest.optIn = $("optInRanking").checked;
  if(state.guest.name.length<2) throw new Error("Informe seu nome.");
  if(state.guest.sector.length<2) throw new Error("Selecione seu setor.");
  saveLS();
}

function flyScoreNear(el, delta){
  const r = el.getBoundingClientRect();
  const d = document.createElement("div");
  d.className = "float-score";
  d.textContent = (delta>0?`+${delta}`:`${delta}`);
  d.style.left = (r.left + r.width/2) + "px";
  d.style.top = (r.top) + "px";
  d.style.color = delta>=0 ? "#63ffb8" : "#ff6a6a";
  document.body.appendChild(d);
  setTimeout(()=>d.remove(), 1100);
}

/* =========================
   Conteúdo (placeholders) — você troca depois
   ========================= */
const content = {
  tutorial: [
    // 1) Uma correção (obrigatória)
    { text: "No Natal, a mesa terá refeissões deliciosas.", targets: [{ wrong:"refeissões", correct:"refeições", expl:"Ortografia: refeições." }], scripted:"fix-one" },
    // 2) Clicar em uma palavra correta e ser penalizado
    { text: "Neste texto, clique em uma palavra correta para ver a penalidade.", targets: [], scripted:"penalize-correct" },
    // 3) Usar dica (com correção automática) e perder pontos
    { text: "Use a cola para corrigir natall para natal.", targets: [{ wrong:"natall", correct:"natal", expl:"Ortografia: natal." }], scripted:"use-hint" },
    // 4) Avançar sem concluir (-5)
    { text: "Agora avance sem concluir para entender a penalidade.", targets: [{ wrong:"errado", correct:"certo", expl:"Exemplo." }], scripted:"use-skip" },
  ],
  d1: [
    { text:"Neste Natal, a mesa terá refeissões deliciosas, e muita alegria.", targets:[{wrong:"refeissões",correct:"refeições",expl:"Ortografia."},{wrong:",",correct:"",expl:"Pontuação: remover vírgula."}] },
    { text:"Um abraço carinhoso para todus da equipe.", targets:[{wrong:"todus",correct:"todos",expl:"Ortografia."}] },
    { text:"Que a paz esteje com você.", targets:[{wrong:"esteje",correct:"esteja",expl:"Conjugação."}] },
  ],
  d2: [
    { text:"(Desafio 2 — placeholder) Clique em erroo para erro.", targets:[{wrong:"erroo",correct:"erro",expl:"Ortografia."}] },
    { text:"(Desafio 2 — placeholder) Clique em acentuaçao para acentuação.", targets:[{wrong:"acentuaçao",correct:"acentuação",expl:"Acentuação."}] },
    { text:"(Desafio 2 — placeholder) Clique em pontuacao, para pontuação.", targets:[{wrong:"pontuacao",correct:"pontuação",expl:"Acentuação."}] },
  ],
  d3: [
    { text:"(Desafio 3 — placeholder) Clique em concerteza para com certeza.", targets:[{wrong:"concerteza",correct:"com certeza",expl:"Expressão correta."}] },
    { text:"(Desafio 3 — placeholder) Clique em a gente vamos para a gente vai.", targets:[{wrong:"vamos",correct:"vai",expl:"Concordância."}] },
    { text:"(Desafio 3 — placeholder) Clique em excessão para exceção.", targets:[{wrong:"excessão",correct:"exceção",expl:"Ortografia."}] },
  ]
};

/* =========================
   Render/tokenização
   ========================= */
function splitText(text){
  // Mantém pontuação como tokens (vírgula, ponto etc.)
  return text.split(/(\s+|[.,!?:;])/g).filter(p=>p!==undefined && p!=="");
}

function buildPending(parts, targets){
  const pending = [];
  parts.forEach((p,idx)=>{
    const t = targets.find(t=>t.wrong===p);
    if(t) pending.push({ idx, wrong:t.wrong, correct:t.correct, expl:t.expl });
  });
  return pending;
}

function renderText(parts){
  const box = $("gameText");
  box.innerHTML = "";
  parts.forEach((p,idx)=>{
    const s = document.createElement("span");
    s.className = "token";
    s.textContent = p;
    s.dataset.idx = String(idx);
    box.appendChild(s);
  });
}

function bindTokenClicks(){
  $("gameText").querySelectorAll(".token").forEach(sp=>{
    sp.addEventListener("click", ()=> onTokenClick(sp));
  });
}

function setHUD(title){
  $("hudLevel").textContent = title;
  updateHUD();
}

function updateHUD(){
  const left = state.pending.length - state.solved.size;
  $("hudLeft").textContent = `Correções: ${left} / ${state.pending.length}`;
  $("hudScore").textContent = `Pontos: ${state.score}`;
  $("btnNext").disabled = left !== 0;
  $("btnSkip").disabled = (left === 0);
}

function startLevel({ title, text, targets }){
  state.skipThisLevel = false;
  state.autoHintsUsed = 0;
  state.solved = new Set();
  state.fixes = [];
  // mantemos um acumulado por desafio/tutorial
  if(!Array.isArray(state.challengeFixes)) state.challengeFixes = [];
  const parts = splitText(text);
  state.pending = buildPending(parts, targets);
  renderText(parts);

  // marca pending de forma discreta
  state.pending.forEach(p=>{
    const el = $("gameText").querySelector(`.token[data-idx="${p.idx}"]`);
    if(el) el.classList.add("pending");
  });

  bindTokenClicks();
  setHUD(title);

  $("hintText").textContent = "Dica aparecerá aqui.";
  $("btnNext").disabled = true;
  $("btnSkip").disabled = false;

  // Tutorial spotlight por etapa
  if(state.mode==="tutorial") setupTutorialSpotlight();
}

/* =========================
   Correção: manual e automática
   ========================= */
function getPendingByIdx(idx){
  return state.pending.find(p=>p.idx===idx) || null;
}

function lockToken(el, cls){
  el.classList.remove("pending");
  el.classList.add(cls);
  el.style.cursor = "default";
}

function markFix({ before, after, explanation }){
  state.fixes.push({ before, after, explanation });
  state.challengeFixes.push({ before, after, explanation });
}

function award(delta, atEl){
  state.score += delta;
  if(atEl) flyScoreNear(atEl, delta);
  updateHUD();
}

function showTryAgainModal({ tokenEl, expected, onApplyAuto }){
  showModal({
    title:"Ops…",
    message:`A correção não está certa! Você perdeu 2 pontos.\n\nQuer tentar de novo ou prefere correção automática? (Perde pontos)`,
    buttons:[
      { label:"Tentar de novo", close:true },
      { label:`Correção automática (-${2 + state.autoHintsUsed})`, close:true, onClick: ()=> onApplyAuto() },
    ]
  });
}

function showCorrectionModal({ tokenEl, pending }){
  const before = tokenEl.textContent;
  const expected = pending.correct;

  // input inline dentro do modal
  const layer = document.getElementById("modalLayer");
  const modalObj = showModal({
    title:"Correção",
    message:`Trecho selecionado: "${before}"\n\nDigite a correção:`,
    buttons:[
      { label:"Conferir", close:false, onClick: ({close})=>{
          const inp = layer.querySelector("input[data-corr='1']");
          const val = (inp?.value ?? "").trim();
          if(val === expected){
            tokenEl.textContent = expected;
            lockToken(tokenEl, "correct");
            state.solved.add(Number(tokenEl.dataset.idx));
            markFix({ before, after: expected, explanation: pending.expl });
            award(+3, tokenEl);
            close();
          } else {
            award(-2, tokenEl);
            // mantém modal aberto com botão "auto"
            const helpBtn = layer.querySelector("button[data-auto='1']");
            if(helpBtn) helpBtn.disabled = false;
            const msg = layer.querySelector("p");
            if(msg) msg.innerHTML = `Ops, a correção não está certa!\n\nVocê perdeu 2 pontos.\n\nTente de novo ou use a correção automática.`.replace(/\n/g,"<br>");
          }
        }
      },
      { label:`Correção automática (-${2 + state.autoHintsUsed})`, close:true, onClick: ()=>{
          state.autoHintsUsed += 1;
          tokenEl.textContent = expected;
          lockToken(tokenEl, "correct");
          state.solved.add(Number(tokenEl.dataset.idx));
          markFix({ before, after: expected, explanation: pending.expl + " (auto)" });
          award(-(2 + (state.autoHintsUsed-1)), tokenEl);
        }, disabled:true, attr:"data-auto"
      },
      { label:"Cancelar", close:true }
    ]
  });

  // injeta input
  const modal = layer.querySelector(".modal");
  const p = modal.querySelector("p");
  const inp = document.createElement("input");
  inp.type="text";
  inp.placeholder="Digite aqui";
  inp.style.width="100%";
  inp.style.margin="8px 0 12px";
  inp.setAttribute("data-corr","1");
  p.insertAdjacentElement("afterend", inp);

  // marca botão auto
  const buttons = layer.querySelectorAll("button.pill");
  buttons.forEach(b=>{
    if(b.textContent.startsWith("Correção automática")){
      b.dataset.auto="1";
      b.disabled = true;
    }
  });
}

function penalizeCorrectAttempt(tokenEl){
  // Não revela antes; só depois de confirmar.
  const before = tokenEl.textContent;
  showModal({
    title:"Confirmação",
    message:`Tem certeza que deseja corrigir este trecho?\n\n"${before}"`,
    dismissible:false,
    buttons:[
      { label:"Confirmar", onClick: ()=>{
          lockToken(tokenEl, "wrong");
          markFix({ before, after: before, explanation: `A palavra "${before}" já estava correta.` });
          award(-2, tokenEl);
        }
      },
      { label:"Cancelar" }
    ]
  });
}

function onTokenClick(tokenEl){
  // token já travado
  if(tokenEl.classList.contains("correct") || tokenEl.classList.contains("wrong")) return;

  const idx = Number(tokenEl.dataset.idx);
  const pending = getPendingByIdx(idx);

  // Tutorial scripted steps:
  if(state.mode==="tutorial"){
    if(!tutorialAllowsClick(tokenEl, pending)) return;
  }

  if(!pending){
    // palavra "certa" (não é target) -> penaliza se confirmar
    penalizeCorrectAttempt(tokenEl);
    return;
  }

  // abre modal de correção
  showModal({
    title:"Confirmação",
    message:`Tem certeza que deseja corrigir este trecho?\n\n"${tokenEl.textContent}"`,
    dismissible:false,
    buttons:[
      { label:"Corrigir", close:false, onClick: ({close})=>{ close(); showCorrectionModal({ tokenEl, pending }); } },
      { label:"Cancelar" }
    ]
  });
}

/* =========================
   Dica / Cola
   ========================= */
function currentExpectedHints(){
  // retorna a próxima correção pendente (para tutorial ou para ajudar)
  const left = state.pending.filter(p=>!state.solved.has(p.idx));
  if(left.length===0) return null;
  const p = left[0];
  const el = $("gameText").querySelector(`.token[data-idx="${p.idx}"]`);
  return { p, el };
}

$("btnHint").addEventListener("click", ()=>{
  const h = currentExpectedHints();
  if(!h){
    $("hintText").textContent = "Não há nada pendente aqui.";
    return;
  }
  $("hintText").textContent = `Sugestão: corrija "${h.p.wrong}" para "${h.p.correct}".`;

  // Tutorial step 3 exige usar dica
  if(state.mode==="tutorial"){
    tutorialNotify("hint-used");
  }

  // Oferece "corrigir automaticamente" dentro da dica
  showModal({
    title:"Cola",
    message:`Quer aplicar automaticamente a correção de "${h.p.wrong}" → "${h.p.correct}"?\n\nVocê perderá pontos.`,
    dismissible:false,
    buttons:[
      { label:`Aplicar automaticamente (-${2 + state.autoHintsUsed})`, onClick: ()=>{
          // aplica auto na primeira pendência
          state.autoHintsUsed += 1;
          const before = h.el.textContent;
          h.el.textContent = h.p.correct;
          lockToken(h.el, "correct");
          state.solved.add(h.p.idx);
          markFix({ before, after: h.p.correct, explanation: h.p.expl + " (auto pela cola)" });
          award(-(2 + (state.autoHintsUsed-1)), h.el);
          if(state.mode==="tutorial") tutorialNotify("auto-applied");
        }
      },
      { label:"Cancelar" }
    ]
  });
});

/* =========================
   Skip
   ========================= */
$("btnSkip").addEventListener("click", ()=>{
  state.skipThisLevel = true;
  award(-5, $("btnSkip"));
  $("btnNext").disabled = false;
  if(state.mode==="tutorial") tutorialNotify("skipped");
});
/* =========================
   Próxima tarefa
   ========================= */
async function finishChallengeIfNeeded(){
  const logged = !!state.user;
  const optIn = $("optInRanking").checked;

  const finishUI = (title, subtitle, nextLabel)=>{
    showScreen("final");
    $("finalTitle").textContent = title;
    $("finalSub").textContent = subtitle;
    $("finalFixes").classList.add("hidden");
    $("btnShowFixes").disabled = false;
    $("btnNextTask").textContent = nextLabel;
    $("btnNextTask").disabled = false;
  };

  // Tutorial (4 etapas)
  if(state.challenge===0 && state.task===4){
    state.progress.tutorialDone = true;
    saveLS();
    showScreen("home");
    computeLocks();
    return true;
  }

  // Desafios 1..3 (3 atividades cada)
  if(state.task===3 && (state.challenge===1 || state.challenge===2 || state.challenge===3)){
    const ch = state.challenge;

    if(ch===1) state.progress.d1Done = true;
    if(ch===2) state.progress.d2Done = true;
    if(ch===3) state.progress.d3Done = true;
    saveLS();

    const name = state.guest.name || "jogador";
    const subtitle = `Parabéns, ${name}! Você ajudou o editor-chefe.`;
    const nextLabel =
      ch===1 ? (logged ? "Próximo desafio" : "Início") :
      ch===2 ? "Próximo desafio" :
      "Missão especial";

    finishUI("Missão concluída!", subtitle, nextLabel);

    // submit ranking por desafio (apenas logado + opt-in)
    if(logged && optIn){
      await submitChallengeScore({
        user: state.user,
        name: state.guest.name,
        sector: state.guest.sector,
        visible: true,
        challenge: ch,
        score: state.score,
        correct: state.solved.size,
        wrong: 0
      }).catch(e=> console.warn("Ranking submit falhou:", e));
    }

    computeLocks();
    return true;
  }

  return false;
}

$("btnNext").addEventListener("click", async ()=>{
  const left = state.pending.length - state.solved.size;
  if(left !== 0 && !state.skipThisLevel){
    showModal({ title:"Ainda falta", message:"Resolva as pendências ou use \"Avançar sem concluir\".", buttons:[{label:"OK"}] });
    return;
  }
  // se pulou, consideramos a etapa concluída para fins de navegação
  state.skipThisLevel = false;
// avançar tutorial
  if(state.challenge===0){
    state.task += 1;
    if(await finishChallengeIfNeeded()) return;
    startLevel({ title:`Tutorial — Etapa ${state.task}`, ...content.tutorial[state.task-1] });
    return;
  }

  // avançar desafio
  state.task += 1;
  if(await finishChallengeIfNeeded()) return;

  const arr = state.challenge===1 ? content.d1 : state.challenge===2 ? content.d2 : content.d3;
  startLevel({ title:`Desafio ${state.challenge} — Atividade ${state.task}`, ...arr[state.task-1] });
});

$("btnShowFixes").addEventListener("click", ()=>{
  const box = $("finalFixes");
  box.innerHTML = "";
  const fixes = state.challengeFixes || state.fixes || [];
  if(fixes.length===0){
    box.innerHTML = "<div class='fixItem'>Sem correções registradas.</div>";
  } else {
    fixes.forEach(f=>{
      const div = document.createElement("div");
      div.className = "fixItem";
      div.innerHTML = `<div><strong>${f.before}</strong> → <strong>${f.after}</strong></div><div class="sub">${f.explanation||""}</div>`;
      box.appendChild(div);
    });
  }
  box.classList.toggle("hidden");
});

$("btnHome").addEventListener("click", ()=>{
  showScreen("home");
  computeLocks();
});
$("btnRanking2").addEventListener("click", ()=> $("btnRanking").click());

$("btnNextTask").addEventListener("click", ()=>{
  // Navegação pós-final
  if(state.challenge===1 && state.progress.d1Done && state.user){
    if(!$("btnD2").disabled) return beginChallenge(2);
  }
  if(state.challenge===2 && state.progress.d2Done && state.user){
    if(!$("btnD3").disabled) return beginChallenge(3);
  }
  if(state.challenge===3 && state.progress.d3Done && state.user){
    showModal({ title:"Missão especial", message:"Em breve: uma mensagem natalina emocionante. 🎄

Por enquanto: obrigado por participar!", buttons:[{label:"OK"}] });
    return showScreen("home"), computeLocks();
  }
  showScreen("home");
  computeLocks();
});
/* =========================
   Tutorial spotlight (simples)
   ========================= */
const spotlight = {
  layer: $("spotlightLayer"),
  cutout: document.querySelector("#spotlightLayer .spotlight-cutout"),
  hand: document.querySelector("#spotlightLayer .spotlight-hand"),
  text: $("spotlightText"),
  next: $("spotlightNext"),
};

function hideSpotlight(){
  spotlight.layer.classList.add("hidden");
  spotlight.layer.setAttribute("aria-hidden","true");
}

function showSpotlightFor(el, text){
  const r = el.getBoundingClientRect();
  spotlight.cutout.style.left = (r.left-8)+"px";
  spotlight.cutout.style.top = (r.top-8)+"px";
  spotlight.cutout.style.width = (r.width+16)+"px";
  spotlight.cutout.style.height = (r.height+16)+"px";

  spotlight.hand.style.left = (r.left + r.width/2)+"px";
  spotlight.hand.style.top = (r.top - 12)+"px";

  spotlight.text.innerHTML = text;
  spotlight.layer.classList.remove("hidden");
  spotlight.layer.setAttribute("aria-hidden","false");
}

let tutorialGate = { allowSelector:null, completed:false };

function tutorialAllowsClick(tokenEl, pending){
  // trava cliques fora do alvo durante spotlight
  if(!tutorialGate.allowSelector) return true;
  const allowed = tokenEl.matches(tutorialGate.allowSelector);
  return allowed;
}

function tutorialNotify(evt){
  // libera Next quando condição é satisfeita pela etapa atual
  const step = content.tutorial[state.task-1]?.scripted;
  if(step==="use-hint" && (evt==="hint-used" || evt==="auto-applied")){
    tutorialGate.completed = true;
    $("btnNext").disabled = false;
  }
  if(step==="use-skip" && evt==="skipped"){
    tutorialGate.completed = true;
    $("btnNext").disabled = false;
  }
}

function setupTutorialSpotlight(){
  const step = content.tutorial[state.task-1]?.scripted;

  // Por padrão, Next travado até completar
  $("btnNext").disabled = true;
  tutorialGate = { allowSelector:null, completed:false };

  if(step==="fix-one"){
    // permitir clicar apenas no primeiro pending
    const h = currentExpectedHints();
    if(!h) { $("btnNext").disabled=false; return; }
    tutorialGate.allowSelector = `.token[data-idx="${h.p.idx}"]`;
    showSpotlightFor(h.el, "Clique aqui para corrigir. Depois, confirme e corrija.");
    spotlight.next.onclick = ()=> hideSpotlight();
    // liberar Next só quando corrigir
    const origAward = award;
  } else if(step==="penalize-correct"){
    // escolha uma palavra correta específica (primeiro token)
    const el = $("gameText").querySelector(".token[data-idx='0']");
    tutorialGate.allowSelector = `.token[data-idx="0"]`;
    showSpotlightFor(el, "Agora clique nesta palavra (ela está correta). Você será penalizado ao confirmar a correção.");
    spotlight.next.onclick = ()=> hideSpotlight();
  } else if(step==="use-hint"){
    const btn = $("btnHint");
    showSpotlightFor(btn, "Clique em “Me dê uma cola!” para ver a dica e a opção de correção automática.");
    spotlight.next.onclick = ()=> hideSpotlight();
  } else if(step==="use-skip"){
    const btn = $("btnSkip");
    showSpotlightFor(btn, "Clique em “Avançar sem concluir (-5)” para entender a penalidade.");
    spotlight.next.onclick = ()=> hideSpotlight();
    // permite clicar no botão apenas
    tutorialGate.allowSelector = null;
  } else {
    hideSpotlight();
    $("btnNext").disabled=false;
  }
}

/* =========================
   Fluxo iniciar
   ========================= */
function beginTutorial(force=false){
  state.mode = "tutorial";
  state.challenge = 0;
  state.task = 1;
  state.score = 0;
  state.challengeFixes = [];
  showScreen("game");
  startLevel({ title:"Tutorial — Etapa 1", ...content.tutorial[0] });
}

function beginChallenge(n){
  requireGuest();
  state.mode = "game";
  state.challenge = n;
  state.task = 1;
  state.score = 0;
  state.challengeFixes = [];
  showScreen("game");
  const arr = n===1 ? content.d1 : n===2 ? content.d2 : content.d3;
  startLevel({ title:`Desafio ${n} — Atividade 1`, ...arr[0] });
}

function startD1Flow(){
  // tutorial obrigatório até marcar feito, mas pode pular e já liberar
  if(!state.progress.tutorialDone){
    showModal({
      title:"Tutorial rápido",
      message:"Antes de jogar, vou te mostrar a dinâmica em 4 passos. Você pode pular e ir direto.",
      buttons:[
        { label:"Ver tutorial", onClick: ()=> beginTutorial(true) },
        { label:"Pular e jogar", onClick: ()=>{
            state.progress.tutorialDone = true;
            saveLS();
            beginChallenge(1);
          }
        }
      ]
    });
    return;
  }
  beginChallenge(1);
}

$("btnD1").addEventListener("click", ()=>{
  try{
    startD1Flow();
  }catch(e){
    showModal({ title:"Atenção", message:e.message || String(e), buttons:[{label:"OK"}] });
  }
});

function blockedMsg(which){
  if(!state.user){
    showModal({ title:"Desafio bloqueado", message:"Crie uma conta e conclua as tarefas anteriores para participar das demais.", buttons:[{label:"OK"}] });
    return;
  }
  showModal({ title:"Ainda não", message:"Primeiro cumpra as tarefas anteriores para liberar este desafio.", buttons:[{label:"OK"}] });
}

$("btnD2").addEventListener("click", ()=>{
  if($("btnD2").disabled) return blockedMsg(2);
  beginChallenge(2);
});
$("btnD3").addEventListener("click", ()=>{
  if($("btnD3").disabled) return blockedMsg(3);
  beginChallenge(3);
});
$("btnSpecial").addEventListener("click", ()=> blockedMsg("special"));

/* =========================
   Ranking modal (sem index)
   ========================= */
$("btnRanking").addEventListener("click", async ()=>{
  try{
    const rows = await loadRankingTop();
    const msg = rows.map((r,i)=>`${i+1}. ${r.name} — ${Math.round(r.overallAvg||0)} pts (Setor: ${r.sector||"-"})`).join("\n") || "Sem dados ainda.";
    showModal({ title:"Ranking (Top)", message: msg, dismissible:true, buttons:[{label:"OK"}] });
  }catch(e){
    showModal({ title:"Ranking indisponível", message: e.message || String(e), buttons:[{label:"OK"}] });
  }
});

/* =========================
   Conta (login/signup/google)
   ========================= */
async function openAccount(){
  const logged = !!state.user;
  if(logged){
    showModal({
      title:"Conta",
      message:`Logado como: ${state.user.email || "(sem email)"}\n\nDeseja sair?`,
      buttons:[
        { label:"Sair", onClick: async ()=>{
            await logout();
          }
        },
        { label:"Fechar" }
      ],
      dismissible:true
    });
    return;
  }

  // login/signup
  const layer = document.getElementById("modalLayer");
  showModal({
    title:"Entrar / Criar conta",
    message:"Informe e-mail e senha. Você também pode usar Google.",
    buttons:[
      { label:"Entrar", close:false, onClick: async ({close})=>{
          const email = layer.querySelector("input[data-email='1']")?.value ?? "";
          const pass = layer.querySelector("input[data-pass='1']")?.value ?? "";
          try{
            await login(email, pass);
            close();
          }catch(e){
            const p = layer.querySelector("p");
            if(p) p.innerHTML = `Erro: ${e.message||e}`.replace(/\n/g,"<br>");
          }
        }
      },
      { label:"Criar conta", close:false, onClick: async ({close})=>{
          const email = layer.querySelector("input[data-email='1']")?.value ?? "";
          const pass = layer.querySelector("input[data-pass='1']")?.value ?? "";
          try{
            await signup(email, pass);
            close();
          }catch(e){
            const p = layer.querySelector("p");
            if(p) p.innerHTML = `Erro: ${e.message||e}`.replace(/\n/g,"<br>");
          }
        }
      },
      { label:"Google", onClick: async ()=>{
          try{ await loginGooglePopup(); } catch(e){
            showModal({ title:"Google login", message: e.message||String(e), buttons:[{label:"OK"}] });
          }
        }
      },
      { label:"Fechar" }
    ],
    dismissible:true
  });

  const modal = layer.querySelector(".modal");
  const p = modal.querySelector("p");
  const email = document.createElement("input");
  email.type="email"; email.placeholder="E-mail"; email.style.width="100%"; email.style.margin="8px 0";
  email.dataset.email="1";
  const pass = document.createElement("input");
  pass.type="password"; pass.placeholder="Senha (6+ caracteres)"; pass.style.width="100%"; pass.style.margin="0 0 12px";
  pass.dataset.pass="1";
  p.insertAdjacentElement("afterend", pass);
  p.insertAdjacentElement("afterend", email);
}

$("btnUser").addEventListener("click", ()=> openAccount());

/* =========================
   Boot
   ========================= */
loadLS();
$("guestName").value = state.guest.name || "";
$("guestSector").value = state.guest.sector || "";
$("optInRanking").checked = state.guest.optIn !== false;

initTheme();

watchAuth(async (user)=>{
  state.user = user;
  computeLocks();

  if(user){
    // tenta puxar perfil (setor/nome) e sincroniza com os campos
    try{
      const prof = await loadUserProfile(user.uid);
      if(prof?.name) { state.guest.name = prof.name; $("guestName").value = prof.name; }
      if(prof?.sector) { state.guest.sector = prof.sector; $("guestSector").value = prof.sector; }
      saveLS();
    }catch(e){
      console.warn("Falha ao carregar perfil:", e);
    }
  }
});

// salva perfil no Firestore quando logado e o usuário começa jogo
async function ensureProfileIfLogged(){
  if(!state.user) return;
  try{
    requireGuest();
    await upsertUserProfile({ user: state.user, name: state.guest.name, sector: state.guest.sector });
  }catch(e){
    // não trava o jogo, mas avisa
    console.warn("Perfil não salvo:", e);
  }
}

// intercepta início de desafios para salvar perfil
const _beginChallenge = beginChallenge;
beginChallenge = async (n)=>{
  await ensureProfileIfLogged();
  _beginChallenge(n);
};

showScreen("home");
computeLocks();function setLogoSrc(){
  const img = document.getElementById("logoImg") || document.querySelector(".topbar img");
  if(!img) return;
  const candidates = [
    "../asset/logo-natal.png",
    "./asset/logo-natal.png",
    "../../asset/logo-natal.png",
    "/asset/logo-natal.png"
  ];
  const tryNext = (i)=>{
    if(i>=candidates.length) return;
    const test = new Image();
    test.onload = ()=>{ img.src = candidates[i]; };
    test.onerror = ()=>tryNext(i+1);
    test.src = candidates[i];
  };
  tryNext(0);
}


