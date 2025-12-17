// js/game-core.js — núcleo do jogo (níveis, render, correções, final interativo)

export function bootGameCore(app){

  /* =========================
     Setores (preenche o select)
  ========================= */
  function populateSectors(){
    const select = app.dom?.userSectorEl || document.getElementById("userSector");
    const sectors = app.data?.SECTORS || app?.data?.SECTORS;

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

  // salva setor em tempo real
  const sectorElLive = app.dom?.userSectorEl || document.getElementById("userSector");
  sectorElLive?.addEventListener("change", () => {
    localStorage.setItem("mission_sector", sectorElLive.value || "");
  });

  const { openModal, closeModal } = app.modal;

  /** Pontuação */
  const SCORE_RULES = app.data?.SCORE_RULES || {
    correct: +5,
    wrong: -3,
    skip: -5,
    hint: -1,
    auto: -2
  };
  app.SCORE_RULES = SCORE_RULES;

  let autoUsed = 0;

  /** Levels */
  const levels = app.data?.levels || app.levels || [];
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
  const challenge1Btn = document.getElementById("challenge1Btn");
  const challenge2Btn = document.getElementById("challenge2Btn");
  const challenge3Btn = document.getElementById("challenge3Btn");

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
  const finalBox1 = document.getElementById("finalBox1");
  const finalBox2 = document.getElementById("finalBox2");
  const finalBox3 = document.getElementById("finalBox3");
  const restartBtn = document.getElementById("restartBtn");

  const reviewBtn1 = document.getElementById("reviewBtn1");
  const reviewBtn2 = document.getElementById("reviewBtn2");
  const reviewBtn3 = document.getElementById("reviewBtn3");

  const finalStatGrid = document.getElementById("finalStatGrid");
  const epigraphBox = document.getElementById("epigraphBox");

  // ✅ IDs do seu HTML atual
  const toggleFinalMsgsBtn = document.getElementById("toggleFinalMsgs");
  const finalMsgsWrap = document.getElementById("finalMsgsWrap");

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

  // ✅ NOVO: misclick persistente (para o vermelho NÃO sumir após re-render)
  // guarda ranges no TEXTO atual (start/len). Quando texto muda, reposiciona.
  const misclickRanges = []; // { start:number, len:number }

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
   * Misclick persistente (helpers)
   * ========================= */
  function hasMisclickAt(start, len){
    return misclickRanges.some(r => r.start === start && r.len === len);
  }

  function addMisclickAt(start, len){
    if (!Number.isFinite(start) || !Number.isFinite(len) || len <= 0) return;
    if (hasMisclickAt(start, len)) return;
    misclickRanges.push({ start, len });
  }

  function shiftMisclickRanges(afterIndex, delta){
    if (!delta) return;
    for (const r of misclickRanges){
      if (r.start > afterIndex){
        r.start += delta;
      }
    }
  }

  function resetMisclickRanges(){
    misclickRanges.length = 0;
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

  // tokens com índice absoluto no texto
  function tokenizeWithIndex(seg, absStart){
    const out = [];
    let buf = "";
    let bufStart = absStart;

    const flush = () => {
      if (!buf) return;
      out.push({ t:"w", v:buf, start: bufStart, len: buf.length });
      buf = "";
    };

    for (let i = 0; i < seg.length; i++){
      const ch = seg[i];
      const absPos = absStart + i;

      if (ch === " " || ch === "\n" || ch === "\t"){
        flush();
        out.push({ t:"s", v:ch });
        continue;
      }
      if (",.;:!?".includes(ch)){
        flush();
        out.push({ t:"p", v:ch });
        continue;
      }
      if (!buf){
        bufStart = absPos;
      }
      buf += ch;
    }
    flush();
    return out;
  }

  function appendPlain(frag, seg, absStart){
    const tokens = tokenizeWithIndex(seg, absStart);
    for (const t of tokens){
      if (t.t === "s" || t.t === "p"){
        frag.appendChild(document.createTextNode(t.v));
        continue;
      }
      const span = document.createElement("span");
      span.className = "token";
      span.textContent = t.v;
      span.dataset.kind = "plain";
      span.dataset.start = String(t.start);
      span.dataset.len = String(t.len);

      // ✅ reaplica vermelho persistente
      if (hasMisclickAt(t.start, t.len)){
        span.classList.add("error");
        span.dataset.misclick = "1";
      }

      span.addEventListener("click", () => onPlainClick(span));
      frag.appendChild(span);
    }
  }

  function appendCorrected(frag, seg, absStart){
    const tokens = tokenizeWithIndex(seg, absStart);
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
        appendCorrected(frag, text.slice(cseg.start, cseg.end), cseg.start);
        pos = cseg.end;
        continue;
      }

      const limit = cseg ? cseg.start : text.length;

      if (levelLocked){
        appendPlain(frag, text.slice(pos, limit), pos);
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
        appendPlain(frag, text.slice(pos, limit), pos);
        pos = limit;
        continue;
      }

      if (best.index > pos){
        appendPlain(frag, text.slice(pos, best.index), pos);
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

    // já marcado como misclick? não repune
    if (span.dataset.misclick === "1"){
      openModal({
        title: "Já marcado",
        bodyHTML: `<p>Esse trecho já foi marcado como erro.</p>`,
        buttons: [{ label:"OK", onClick: closeModal }]
      });
      return;
    }

    const selected = span.textContent || "";

    openModal({
      title: "Confirmar ação",
      bodyHTML: `
        <p><strong>Tem certeza que deseja corrigir este trecho?</strong></p>
        <p class="quote" style="margin-top:10px">“${escapeHtml(selected)}”</p>
      `,
      buttons: [
        { label:"Cancelar", variant:"ghost", onClick: closeModal },
        { label:"Sim, corrigir", onClick: () => {
            closeModal();

            // aplica penalidade e marca vermelho persistente
            const start = Number(span.dataset.start || "NaN");
            const len = Number(span.dataset.len || "NaN");

            span.dataset.misclick = "1";
            span.classList.add("error");
            addMisclickAt(start, len);
            registerWrong();
            updateHUD();

            openModal({
              title: "Trecho já correto",
              bodyHTML: `
                <p>A palavra <strong>“${escapeHtml(selected)}”</strong> já está correta!</p>
                <p>Que pena, você perdeu <strong>${Math.abs(SCORE_RULES.wrong)}</strong> pontos.</p>
              `,
              buttons: [{ label:"OK", onClick: closeModal }]
            });
          } }
      ]
    });
  }


  function applyReplacementAt(start, len, replacement){
    const before = currentText.slice(0, start);
    const after = currentText.slice(start + len);
    currentText = before + replacement + after;

    const delta = replacement.length - len;

    // move correções “verdes”
    for (const info of correctedSegmentsByRule.values()){
      if (info.start > start){
        info.start += delta;
      }
    }

    // ✅ move misclicks “vermelhos” persistentes
    shiftMisclickRanges(start, delta);
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
      // penaliza e oferece tentar de novo ou correção automática
      registerWrong();
      updateHUD();

      const selected = errSpan.textContent || "";

      openModal({
        title: "Ops, a correção não está certa!",
        bodyHTML: `
          <p>Ops, a correção não está certa! Você perdeu <strong>${Math.abs(SCORE_RULES.wrong)}</strong> pontos.</p>
          <p style="margin-top:10px">Gostaria de tentar de novo ou prefere uma correção automática?</p>
          <p class="muted" style="margin-top:8px">
            (Você perderá <strong>${Math.abs(SCORE_RULES.auto)}</strong> pontos se usar a correção automática).
          </p>
        `,
        buttons: [
          { label:"Tentar de novo", variant:"ghost", onClick: () => {
              closeModal();
              openCorrectionUI(errSpan, rule);
            } },
          { label:"Correção automática", onClick: () => {
              // aplica a correção certa com penalidade de auto
              const start = Number(errSpan.dataset.start);
              const len = Number(errSpan.dataset.len);

              applyReplacementAt(start, len, expected);
              fixedRuleIds.add(rule.id);
              if (expected !== "") markCorrected(rule.id, start, expected);

              registerAutoCorrect();
              closeModal();
              renderMessage();
              finalizeIfDone();

              openModal({
                title: "Correção automática aplicada",
                bodyHTML: `
                  <p>Aplicamos a correção correta para <strong>“${escapeHtml(selected)}”</strong>.</p>
                  <p>Você perdeu <strong>${Math.abs(SCORE_RULES.auto)}</strong> pontos por usar a correção automática.</p>
                `,
                buttons: [{ label:"OK", onClick: closeModal }]
              });
            } }
        ]
      });

      return;
    }

    // correto: aplica e confirma com OK (não fecha sozinho)
    const start = Number(errSpan.dataset.start);
    const len = Number(errSpan.dataset.len);

    applyReplacementAt(start, len, expected);
    fixedRuleIds.add(rule.id);

    if (expected !== "") markCorrected(rule.id, start, expected);

    registerCorrect();
    renderMessage();
    finalizeIfDone();

    openModal({
      title: "Correção aplicada!",
      bodyHTML: `<p>Boa! Correção registrada.</p>`,
      buttons: [{ label:"OK", onClick: closeModal }]
    });
  }


  function onErrorClick(errSpan, rule){
    if (levelLocked){
      onLockedTextClick();
      return;
    }

    const selected = errSpan.textContent || "";

    openModal({
      title: "Confirmar ação",
      bodyHTML: `
        <p><strong>Tem certeza que deseja corrigir este trecho?</strong></p>
        <p class="quote" style="margin-top:10px">“${escapeHtml(selected)}”</p>
      `,
      buttons: [
        { label:"Cancelar", variant:"ghost", onClick: closeModal },
        { label:"Sim, corrigir", onClick: () => {
            closeModal();
            // abre a UI de correção (digitada ou remover vírgula)
            openCorrectionUI(errSpan, rule);
          } }
      ]
    });
  }

  function openCorrectionUI(errSpan, rule){
    const kind = String(rule.kind || "");
    const expected = rule.correct;

    // caso especial: remover vírgula (expected = "" e token é vírgula)
    if (expected === "" && (errSpan.textContent || "").trim() === ","){
      openModal({
        title: "Remover vírgula",
        bodyHTML: `
          <p>Você deseja remover esta vírgula?</p>
          <p class="quote" style="margin-top:10px">“,”</p>
        `,
        buttons: [
          { label:"Cancelar", variant:"ghost", onClick: closeModal },
          { label:"Remover", onClick: () => confirmCommaRemoval(errSpan, rule) }
        ]
      });
      return;
    }

    // correção digitada
    openModal({
      title: "Corrigir trecho",
      bodyHTML: `
        <p>Digite a correção para:</p>
        <p class="quote" style="margin-top:10px">“${escapeHtml(errSpan.textContent || "")}”</p>
        <label class="field" style="margin-top:12px">
          <span>Correção</span>
          <input class="input" id="fixInput" placeholder="Digite aqui..." />
        </label>
        <p class="muted" style="margin:10px 0 0">Erros podem ser de acentuação, ortografia, gramática ou pontuação.</p>
      `,
      buttons: [
        { label:"Cancelar", variant:"ghost", onClick: closeModal },
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
   * Próximo nível / Final
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

    // ✅ guarda SEMPRE o texto do nível atual (mesmo com correções)
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

  /** =========================
   * Final interativo
   * ========================= */
  function getRuleById(levelIdx, ruleId){
    return levels[levelIdx]?.rules?.find(r => r.id === ruleId) || null;
  }

  function explainFor(levelIdx, ruleId){
    const r = getRuleById(levelIdx, ruleId);
    if (!r) return null;

    const correct = String(r.correct ?? "");
    const reason = String(r.reason || r.explain || "").trim();

    return {
      title: `${levels[levelIdx]?.name || "Atividade"} — ${r.label || "Revisão"}`,
      correct,
      reason: reason || "Correção aplicada conforme regra de revisão do exercício."
    };
  }

  function buildFinalInteractiveHTML(levelIdx, userText){
    const levelDef = levels[levelIdx];
    const text = String(userText ?? "");
    let html = escapeHtml(text);

    if (!levelDef?.rules?.length) return html;

    // marca "erros" (vermelho) se ainda existirem no texto final
    for (const rule of levelDef.rules){
      const reWrong = ensureGlobal(rule.wrong);
      html = html.replace(reWrong, (m) => {
        return `<span class="final-wrong final-mark" data-level="${levelIdx}" data-rule="${escapeHtml(rule.id)}">${escapeHtml(m)}</span>`;
      });
    }

    // marca "correções" (verde) se existirem no texto final
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
          ${ex.correct ? `<p style="margin:0 0 8px"><span class="muted">Forma correta:</span> <strong>${escapeHtml(ex.correct)}</strong></p>` : `<p style="margin:0 0 8px"><span class="muted">Ação:</span> <strong>Remover</strong></p>`}
          <p class="muted" style="margin:0; line-height:1.6">${escapeHtml(ex.reason)}</p>
        `,
        buttons: [{ label:"Fechar", onClick: closeModal }]
      });
    });
  }

  function showFinal(){
    const name = getUserName();

    // ✅ epígrafe Monteiro Lobato (sempre)
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

    // ✅ Preenche as caixas com o texto FINAL de cada atividade (corrigido ou não)
    if (finalBox1) finalBox1.innerHTML = `<p style="margin:0">${buildFinalInteractiveHTML(0, currentTextByLevel[0] || levels[0]?.raw || "")}</p>`;
    if (finalBox2) finalBox2.innerHTML = `<p style="margin:0">${buildFinalInteractiveHTML(1, currentTextByLevel[1] || levels[1]?.raw || "")}</p>`;
    if (finalBox3) finalBox3.innerHTML = `<p style="margin:0">${buildFinalInteractiveHTML(2, currentTextByLevel[2] || levels[2]?.raw || "")}</p>`;

    attachFinalExplainClicks(finalBox1);
    attachFinalExplainClicks(finalBox2);
    attachFinalExplainClicks(finalBox3);

    // ✅ O seu HTML que manda: abre/fecha o WRAP das mensagens
    if (finalMsgsWrap) finalMsgsWrap.classList.add("hidden");
    if (toggleFinalMsgsBtn){
      toggleFinalMsgsBtn.textContent = "Ver mensagens corrigidas";
      toggleFinalMsgsBtn.setAttribute("aria-expanded", "false");

      toggleFinalMsgsBtn.onclick = () => {
        const isHidden = finalMsgsWrap?.classList.contains("hidden");
        if (!finalMsgsWrap) return;

        if (isHidden){
          finalMsgsWrap.classList.remove("hidden");
          toggleFinalMsgsBtn.textContent = "Ocultar mensagens";
          toggleFinalMsgsBtn.setAttribute("aria-expanded", "true");
        } else {
          finalMsgsWrap.classList.add("hidden");
          toggleFinalMsgsBtn.textContent = "Ver mensagens corrigidas";
          toggleFinalMsgsBtn.setAttribute("aria-expanded", "false");
        }
      };
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

    let html = `<h3 style="margin:0 0 10px">Atividade ${levelIdx+1} — ${escapeHtml(lvl.name || "")}</h3>
                <ul style="padding-left:18px; line-height:1.6">`;

    for (const r of (lvl.rules || [])){
      html += `
        <li style="margin-bottom:10px">
          <strong>${escapeHtml(r.label || "Regra")}:</strong><br>
          <span class="muted">Correção:</span> <strong>${escapeHtml(String(r.correct ?? "(remover)"))}</strong><br>
          <span class="muted">${escapeHtml(String(r.reason || r.explain || "—"))}</span>
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
    if (!lvl) return;

    fixedRuleIds = new Set();
    currentText = String(lvl.raw || "");
    currentRules = Array.isArray(lvl.rules) ? lvl.rules : [];

    correctedSegmentsByRule.clear();
    resetMisclickRanges(); // ✅ reseta misclick por nível
    levelLocked = false;

    if (headerTitle) headerTitle.textContent = `Revisão da Mensagem de Natal — ${lvl.name}`;
    if (levelLabel) levelLabel.textContent = lvl.name;
    if (instruction) instruction.textContent = lvl.instruction || "";

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
        <p style="white-space:pre-line">${escapeHtml(lvl.intro || "")}</p>
        <p class="muted" style="margin-top:12px">Os erros serão explicados e detalhados ao término da atividade.</p>
      `,
      buttons: [{ label:"Entendi", onClick: closeModal }]
    });
  }

    function isLogged(){
      return !!(app.auth && app.auth.isLogged && app.auth.isLogged());
    }
  
    function refreshChallengeButtons(activeId = 1){
      // trava/destrava 2 e 3
      const logged = isLogged();
  
      const setLocked = (btn, locked) => {
        if (!btn) return;
        btn.disabled = !!locked;
        btn.classList.toggle("btn-disabled", !!locked);
        // manter texto consistente
        const base = btn.id === "challenge2Btn" ? "Desafio 2" : (btn.id === "challenge3Btn" ? "Desafio 3" : "Desafio 1");
        btn.textContent = locked && btn.id !== "challenge1Btn" ? `${base} 🔒` : base;
      };
  
      setLocked(challenge2Btn, !logged);
      setLocked(challenge3Btn, !logged);
  
      // estado ativo (apenas o selecionado muda visual)
      [challenge1Btn, challenge2Btn, challenge3Btn].forEach((b, i) => {
        if (!b) return;
        const id = i + 1;
        b.classList.toggle("is-active", id === activeId);
      });
    }
  
    function ensureNameSectorOrWarn(){
      const name = getUserName();
      const sector = getUserSector();
  
      if (!name){
        openModal({ 
          title:"Atenção", 
          bodyHTML:`<p>Por favor, informe o seu <strong>nome</strong>.</p>`, 
          buttons:[{label:"OK", onClick: closeModal}] 
        });
        return null;
      }
      if (!sector){
        openModal({ 
          title:"Atenção", 
          bodyHTML:`<p>Por favor, selecione o seu <strong>setor</strong>.</p>`, 
          buttons:[{label:"OK", onClick: closeModal}] 
        });
        return null;
      }
      return { name, sector };
    }
  
    function showTutorialOfferThen(startFn){
      // Apenas antes do Desafio 1. Usuário pode pular.
      openModal({
        title: "Tutorial",
        bodyHTML: `
          <p>O tutorial explicará brevemente a dinâmica do jogo.</p>
          <p class="muted" style="margin-top:10px">Se preferir, você pode pular.</p>
        `,
        buttons: [
          { label:"Pular", variant:"ghost", onClick: () => { closeModal(); startFn(); } },
          { label:"Ver tutorial", onClick: () => { closeModal(); runTutorialSlides(startFn); } }
        ]
      });
    }
  
    function runTutorialSlides(onDone){
      const steps = [
        {
          title: "Como funciona",
          html: `<p>Você vai clicar em trechos do texto para <strong>corrigir</strong> erros de revisão editorial.</p>`
        },
        {
          title: "Confirmação",
          html: `<p>Ao clicar em qualquer trecho, o jogo pergunta se você realmente quer corrigir.</p>`
        },
        {
          title: "Acertos e erros",
          html: `<p>Se o trecho estiver errado e você corrigir certo, você ganha pontos. Se errar ou tentar corrigir algo que já está correto, você perde pontos.</p>`
        },
        {
          title: "Dica e correção automática",
          html: `<p>Você pode pedir dica ou usar correção automática, mas isso tem penalidade.</p>`
        },
        {
          title: "Boa sorte!",
          html: `<p>Pronto! Vamos começar?</p>`
        }
      ];
  
      let i = 0;
      const showStep = () => {
        const step = steps[i];
        openModal({
          title: step.title,
          bodyHTML: step.html,
          buttons: [
            ...(i > 0 ? [{ label:"Voltar", variant:"ghost", onClick: () => { closeModal(); i -= 1; showStep(); } }] : []),
            ...(i < steps.length - 1
              ? [{ label:"Próximo", onClick: () => { closeModal(); i += 1; showStep(); } }]
              : [{ label:"Começar", onClick: () => { closeModal(); onDone(); } }])
          ]
        });
      };
      showStep();
    }
  
    function confirmStartChallenge(challengeId){
      // gate login para 2 e 3
      if (challengeId > 1 && !isLogged()){
        app.auth?.openGate?.();
        return;
      }
  
      const ok = ensureNameSectorOrWarn();
      if (!ok) return;
  
      refreshChallengeButtons(challengeId);
  
      openModal({
        title: `Iniciar Desafio ${challengeId}`,
        bodyHTML: `<p>Deseja iniciar o <strong>Desafio ${challengeId}</strong> agora?</p>`,
        buttons: [
          { label:"Cancelar", variant:"ghost", onClick: closeModal },
          { label:"Iniciar", onClick: () => {
              closeModal();
              // desafio 1 oferece tutorial; demais começam direto
              const startNow = () => { showOnly(screenGame); startLevel(); };
              if (challengeId === 1){
                showTutorialOfferThen(startNow);
              } else {
                startNow();
              }
            } }
        ]
      });
    }
  
    challenge1Btn?.addEventListener("click", () => confirmStartChallenge(1));
    challenge2Btn?.addEventListener("click", () => confirmStartChallenge(2));
    challenge3Btn?.addEventListener("click", () => confirmStartChallenge(3));
  
    // Atualiza lock/unlock quando login muda (auth dispara evento simples)
    app.auth?.onAuthStateChanged?.(() => refreshChallengeButtons());
    refreshChallengeButtons(1);
  

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
    getUserSector,
  };
}
