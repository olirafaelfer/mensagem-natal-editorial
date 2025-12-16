// js/game-core.js — núcleo do jogo (níveis, render, correções, final interativo)

export function bootGame(app){
  const { openModal, closeModal } = app.modal || {};
  if (!openModal || !closeModal) {
    console.warn("[game-core] modal não inicializado (ui-modal.js precisa bootar antes).");
    return;
  }

  const SCORE_RULES = app.data?.SCORE_RULES || {
    correct: +5,
    wrong: -3,
    skip: -5,
    hint: -1,
    auto: -2
  };

  const levels = app.data?.levels || [];

  // =========================
  // POPULA SETORES (fix do seu problema principal)
  // =========================
  function populateSectors(){
    const select = document.getElementById("userSector");
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

    const saved = localStorage.getItem("mission_sector") || "";
    if (saved) select.value = saved;
  }

  populateSectors();

  document.getElementById("userSector")?.addEventListener("change", (e) => {
    const v = e.target?.value || "";
    localStorage.setItem("mission_sector", v);
  });

  // =========================
  // Elementos
  // =========================
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

  // =========================
  // Utils
  // =========================
  const escapeHtml = app.utils?.escapeHtml || ((s)=>String(s));
  const normalize = app.utils?.normalize || ((s)=>String(s).toLowerCase());
  const ensureGlobal = app.utils?.ensureGlobal || ((re)=>re);

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

  // =========================
  // Estado
  // =========================
  let levelIndex = 0;
  let fixedRuleIds = new Set();
  let currentText = "";
  let currentRules = [];
  let levelLocked = false;

  let score = 0;
  let wrongCount = 0;
  let correctCount = 0;
  let hintsUsed = 0;
  let autoUsed = 0;

  const taskScore = [0,0,0];
  const taskCorrect = [0,0,0];
  const taskWrong = [0,0,0];

  const currentTextByLevel = ["", "", ""];
  const correctedSegmentsByRule = new Map();

  // =========================
  // HUD
  // =========================
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

  // =========================
  // Render
  // =========================
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

  // =========================
  // Pontuação
  // =========================
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
      bodyHTML: `<p>A tarefa já foi finalizada e o texto está todo certinho! Parabéns! Avance para a próxima tarefa.</p>`,
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
      buttons: [{ label:"Confirmar correção", onClick: () => confirmTyped(errSpan, rule) }]
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

  nextLevelBtn?.addEventListener("click", async () => {
    const done = fixedRuleIds.size >= currentRules.length;
    const isLast = levelIndex === (levels.length - 1);

    if (!done){
      openModal({
        title: "Você ainda não concluiu o nível",
        bodyHTML: `<p>Você ainda não concluiu o nível. Se avançar sem concluí-lo perderá <strong>5</strong> pontos. Tem certeza?</p>`,
        buttons: [
          { label:"Cancelar", variant:"ghost", onClick: closeModal },
          { label:"Prosseguir", onClick: async () => { closeModal(); await skipLevel(); } }
        ]
      });
      return;
    }

    currentTextByLevel[levelIndex] = currentText;

    if (isLast){
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

  function showFinal(){
    const name = getUserName();
    const finalStatGrid = document.getElementById("finalStatGrid");

    if (finalCongrats){
      finalCongrats.textContent = `Parabéns, ${name}! Você ajudou o editor-chefe a publicar a mensagem de Natal no prazo!`;
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

    if (headerTitle) headerTitle.textContent = "Missão concluída 🎄";
    showOnly(screenFinal);
  }

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

  function startLevel(){
    const lvl = levels[levelIndex];
    if (!lvl) return;

    fixedRuleIds = new Set();
    currentText = lvl.raw;
    currentRules = lvl.rules || [];
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
        <p class="muted" style="margin-top:12px">Os erros serão explicados ao término da atividade.</p>
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

  // Boot visual
  showOnly(screenLoading);
  setTimeout(() => {
    showOnly(screenForm);
    if (userNameEl) userNameEl.value = localStorage.getItem("mission_name") || "";
    if (userSectorEl) userSectorEl.value = localStorage.getItem("mission_sector") || "";
  }, 300);

  // expõe estado pros outros módulos (ranking)
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

