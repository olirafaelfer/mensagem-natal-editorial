
// js/game-core.js — núcleo do jogo (níveis, render, correções, final interativo)

export function bootGameCore(app){
  function populateSectors(){
  const select = app.dom?.userSectorEl;
  const sectors = app.data?.SECTORS;

  if (!select) return;
  if (!Array.isArray(sectors)) return;

  select.innerHTML = "";
  for (const s of sectors){
    const opt = document.createElement("option");
    opt.value = (s === "Selecione…") ? "" : s;
    opt.textContent = s;
    select.appendChild(opt);
  }

  // tenta restaurar valor salvo
  const saved = localStorage.getItem("mission_sector") || "";
  if (saved && !select.value) select.value = saved;
}

// ✅ chama no boot
populateSectors();

// (opcional) salva em tempo real
app.dom?.userSectorEl?.addEventListener("change", () => {
  localStorage.setItem("mission_sector", app.dom.userSectorEl.value || "");
});

  const { openModal, closeModal } = app.modal;

  /** Pontuação */
  const SCORE_RULES = {
    correct: +5,
    wrong: -3,
    skip: -5,
    hint: -1,
    auto: -2
  };
  app.SCORE_RULES = SCORE_RULES;

  let autoUsed = 0;

  /** Levels (mantém seu formato; pode adicionar/remover regras sem dor) */
  const levels = app.levels || [
    {
      name: "Fácil",
      intro: `O Papai Noel, editor-chefe, pediu sua ajuda para revisar a Mensagem de Natal.
Ele escreveu tão rápido que acabou deixando três errinhos para trás.`,
      instruction: `Os erros podem envolver acentuação, ortografia, gramática etc. Clique nos trechos incorretos para corrigir!`,
      raw: `Mais do que presentes e refeissões caprichadas, o Natal é a época de lembrar o valor de um abraço apertado e de um sorriso sincero! Que para voces, meus amigos, seja uma época xeia de carinho e amor, preenchida pelo que realmente importa nessa vida!`,
      rules: [
        { id:"f1", label:"Ortografia",  wrong:/\brefeissões\b/g, correct:"refeições", reason:"Erro ortográfico. A forma correta do substantivo é “refeições”." },
        { id:"f2", label:"Acentuação", wrong:/\bvoces\b/g,      correct:"vocês",    reason:"Erro de acentuação gráfica. O pronome “vocês” é acentuado." },
        { id:"f3", label:"Ortografia", wrong:/\bxeia\b/g,       correct:"cheia",     reason:"Erro ortográfico. A palavra correta é “cheia”, com dígrafo “ch”." },
      ]
    },
    {
      name: "Médio",
      intro: `Nível médio: erros editoriais objetivos — vírgulas mal colocadas e concordância.`,
      instruction: `Atenção: os erros podem envolver pontuação (inclusive vírgulas indevidas), concordância, acentuação e ortografia.`,
      raw: `O Natal, é um momento especial para celebrar a união e a esperança. As mensagens, que circulam nessa época, precisam transmitir carinho e acolhimento, mas muitas vezes, acabam sendo escritas de forma apressada. Os textos natalinos, exige atenção aos detalhes, para que a mensagem chegue clara ao leitor.`,
      rules: [
        { id:"m1", label:"Pontuação",  wrong:/(?<=\bNatal),/g,        correct:"",      reason:"Vírgula indevida separando sujeito e predicado." },
        { id:"m2", label:"Pontuação",  wrong:/(?<=\bmensagens),/g,    correct:"",      reason:"Vírgula indevida isolando oração restritiva (sem necessidade aqui)." },
        { id:"m3", label:"Pontuação",  wrong:/(?<=\bvezes),/g,        correct:"",      reason:"Vírgula indevida entre adjunto e verbo." },
        { id:"m4", label:"Pontuação",  wrong:/(?<=\bnatalinos),/g,    correct:"",      reason:"Vírgula indevida entre sujeito e verbo." },
        { id:"m5", label:"Concordância", wrong:/\bexige\b/g, correct:"exigem",        reason:"Concordância verbal: sujeito plural pede verbo no plural." },
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
        { id:"d1", label:"Colocação pronominal", wrong:/No Natal,\s*se deve pensar/g, correct:"No Natal, deve-se pensar", reason:"Colocação pronominal: forma recomendada “deve-se”." },
        { id:"d2", label:"Colocação pronominal", wrong:/aos filhos,\s*os ame/gi,     correct:"aos filhos, ame-os",     reason:"Colocação pronominal: forma recomendada “ame-os”." },

        { id:"d3", label:"Pontuação", wrong:/(?<=\batitudes),/g, correct:"", reason:"Vírgula indevida entre sujeito e predicado." },
        { id:"d4", label:"Pontuação", wrong:/o amor,\s*em todas/gi, correct:"o amor em todas", reason:"Vírgula indevida separando termo essencial." },
        { id:"d5", label:"Pontuação", wrong:/quanto o Natal\s*e,/gi, correct:"quanto o Natal e", reason:"Vírgula indevida quebrando coordenação." },

        { id:"d6", label:"Pontuação", wrong:/ofereço um caloroso abraço,\s*o maior conforto da alma/gi,
          correct:"ofereço um caloroso abraço: o maior conforto da alma",
          reason:"Melhoria editorial: dois-pontos para introduzir aposto explicativo." },
      ]
    }
  ];
  app.levels = levels;

  /** =========================
   * Elementos
   * ========================= */
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

  const reviewBtn1 = document.getElementById("reviewBtn1");
  const reviewBtn2 = document.getElementById("reviewBtn2");
  const reviewBtn3 = document.getElementById("reviewBtn3");

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
  const correctedSegmentsByRule = new Map(); // ruleId -> {start, lenNew}

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

  function getUserName(){
    return clampName((userNameEl?.value || localStorage.getItem("mission_name") || "").trim());
  }

  function showOnly(screen){
    for (const el of [screenLoading, screenForm, screenGame, screenFinal]){
      if (!el) continue;
      el.classList.toggle("hidden", el !== screen);
    }
  }

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
   * Render (mensagem clicável)
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
   * Pontuação + feedback simples
   * ========================= */
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

  function registerAutoCorrect(){
    correctCount += 1;
    taskCorrect[levelIndex] += 1;
    autoUsed += 1;
    addScore(SCORE_RULES.auto);
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
    registerCorrect();

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

    if (expected !== "") markCorrected(rule.id, start, expected);

    registerCorrect();
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
        <input class="input" id="fixInput" type="text" autocomplete="off"
          placeholder="${expected === "" ? "Deixe em branco para remover" : "Digite aqui..."}" />

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

    registerAutoCorrect();
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
   * Próximo nível / (o save do ranking fica no módulo ranking)
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
      // ranking/salvamento será chamado por app.finishMission (módulo ranking)
      await app.finishMission?.({ score, correctCount, wrongCount, taskScore, taskCorrect, taskWrong, autoUsed });
      showFinal();
      return;
    }

    levelIndex += 1;
    startLevel();
  });

  async function skipLevel(){
    addScore(SCORE_RULES.skip);
    currentTextByLevel[levelIndex] = currentText;

    levelIndex += 1;
    if (levelIndex < levels.length){
      startLevel();
      return;
    }

    await app.finishMission?.({ score, correctCount, wrongCount, taskScore, taskCorrect, taskWrong, autoUsed });
    showFinal();
  }

  /** =========================
   * Final interativo
   * ========================= */
  function getRuleById(levelIdx, ruleId){
    return levels[levelIdx]?.rules?.find(r => r.id === ruleId) || null;
  }

  function explainFor(levelIdx, ruleId){
    const r = getRuleById(levelIdx, ruleId);
    if (!r) return null;

    const wrongSample = (r.wrong instanceof RegExp) ? r.wrong.toString() : "";
    const correct = String(r.correct ?? "");
    const reason = String(r.reason || "").trim();

    return {
      title: `${levels[levelIdx]?.name || "Atividade"} — ${r.label || "Revisão"}`,
      wrongSample,
      correct,
      reason: reason || "Correção aplicada conforme regra de revisão do exercício."
    };
  }

  function buildFinalInteractiveHTML(levelIdx, userText){
    const levelDef = levels[levelIdx];
    const text = String(userText ?? "");
    let html = escapeHtml(text);

    // marca erros (vermelho) com data-ruleid
    for (const rule of levelDef.rules){
      const reWrong = ensureGlobal(rule.wrong);
      html = html.replace(reWrong, (m) => {
        return `<span class="final-wrong final-mark" data-level="${levelIdx}" data-rule="${escapeHtml(rule.id)}">${escapeHtml(m)}</span>`;
      });
    }

    // marca correções (verde) com data-ruleid (se houver correct)
    for (const rule of levelDef.rules){
      const c = String(rule.correct ?? "");
      if (!c) continue;

      const safe = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const reCorrect = new RegExp(safe, "g");

      html = html.replace(reCorrect, (m) => {
        return `<span class="final-correct final-mark" data-level="${levelIdx}" data-rule="${escapeHtml(rule.id)}">${escapeHtml(m)}</span>`;
      });
    }

    return html;
  }

  function attachFinalExplainClicks(boxEl){
    if (!boxEl) return;

    boxEl.addEventListener("click", (ev) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement)) return;

      const mark = t.closest(".final-mark");
      if (!mark) return;

      const levelIdx = Number(mark.getAttribute("data-level") || "0");
      const ruleId = String(mark.getAttribute("data-rule") || "");

      const ex = explainFor(levelIdx, ruleId);
      if (!ex) return;

      openModal({
        title: "Explicação",
        bodyHTML: `
          <p style="margin:0 0 10px"><strong>${escapeHtml(ex.title)}</strong></p>
          <p style="margin:0 0 8px"><span class="muted">Regra:</span> <strong>${escapeHtml(ruleId)}</strong></p>
          ${ex.correct ? `<p style="margin:0 0 8px"><span class="muted">Forma correta:</span> <strong>${escapeHtml(ex.correct)}</strong></p>` : `<p style="margin:0 0 8px"><span class="muted">Ação:</span> <strong>Remover</strong></p>`}
          <p class="muted" style="margin:0; line-height:1.6">${escapeHtml(ex.reason)}</p>
        `,
        buttons: [{ label:"Fechar", onClick: closeModal }]
      });
    });
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

    // textos finais (interativos)
    if (finalBox1) finalBox1.innerHTML = `<p style="margin:0">${buildFinalInteractiveHTML(0, currentTextByLevel[0] || levels[0].raw)}</p>`;
    if (finalBox2) finalBox2.innerHTML = `<p style="margin:0">${buildFinalInteractiveHTML(1, currentTextByLevel[1] || levels[1].raw)}</p>`;
    if (finalBox3) finalBox3.innerHTML = `<p style="margin:0">${buildFinalInteractiveHTML(2, currentTextByLevel[2] || levels[2].raw)}</p>`;

    // clique nas marcações abre explicação
    attachFinalExplainClicks(finalBox1);
    attachFinalExplainClicks(finalBox2);
    attachFinalExplainClicks(finalBox3);

    // esconder por padrão + botão
    finalBox1?.classList.add("hidden");
    finalBox2?.classList.add("hidden");
    finalBox3?.classList.add("hidden");

    if (finalRecado){
      finalRecado.innerHTML = `
        <div class="actions center-actions" style="margin-top:8px">
          <button class="btn" id="toggleFinalBoxes" type="button" aria-expanded="false">
            Ver as mensagens que você corrigiu
          </button>
          <button class="btn ghost" id="hideFinalBoxes" type="button" aria-expanded="true" style="display:none">
            Ocultar mensagens
          </button>
        </div>
        <p class="muted" style="margin:10px 0 0">
          Dica: no texto abaixo, toque nos trechos <span class="final-correct">verdes</span> e <span class="final-wrong">vermelhos</span> para ver a explicação.
        </p>
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

  /** =========================
   * Review (botões finais)
   * ========================= */
  function openReviewModal(levelIdx){
    const lvl = levels[levelIdx];
    if (!lvl) return;

    let html = `<h3 style="margin:0 0 10px">Atividade ${levelIdx+1} — ${escapeHtml(lvl.name)}</h3>
                <ul style="padding-left:18px; line-height:1.6">`;

    for (const r of (lvl.rules || [])){
      html += `
        <li style="margin-bottom:10px">
          <strong>${escapeHtml(r.label || "Regra")}:</strong><br>
          <span class="muted">Correção:</span> <strong>${escapeHtml(String(r.correct ?? "(remover)"))}</strong><br>
          <span class="muted">${escapeHtml(String(r.reason || "—"))}</span>
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

  /** =========================
   * Início / nível
   * ========================= */
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

  startBtn?.addEventListener("click", () => {
    const name = getUserName();
    const sector = (userSectorEl?.value || "").trim();

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

    // reset
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

  restartBtn?.addEventListener("click", () => showOnly(screenForm));

  /** =========================
   * Boot visual
   * ========================= */
  showOnly(screenLoading);
  setTimeout(() => {
    showOnly(screenForm);
    if (userNameEl) userNameEl.value = localStorage.getItem("mission_name") || "";
    if (userSectorEl) userSectorEl.value = localStorage.getItem("mission_sector") || "";
  }, 1100);

  // expõe estado necessário pros outros módulos (ranking)
  app.gameState = {
    get score(){ return score; },
    get correctCount(){ return correctCount; },
    get wrongCount(){ return wrongCount; },
    get taskScore(){ return taskScore; },
    get taskCorrect(){ return taskCorrect; },
    get taskWrong(){ return taskWrong; },
    get autoUsed(){ return autoUsed; },
    getUserName,
    getUserSector: () => (userSectorEl?.value || localStorage.getItem("mission_sector") || "").trim(),
  };
}
