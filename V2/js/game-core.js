// js/game-core.js — gameplay (engine + UI)
// ✅ Sem 'return' no topo (evita "Illegal return statement")
import { GameEngine } from "./engine/game-engine.js";
import { getChallengeLevels } from "./data/challenges/index.js";
import { getTutorialLevels } from "./data/tutorial.js";
import { scoreFloat } from "./ui/score-fx.js";

export function bootGame(app){
  const { dom, ui } = app;
  const { openModal, closeModal } = app.modal || {};
  if (!openModal || !closeModal){
    console.warn("[game] modal não inicializado (ui-modal.js).");
    return;
  }

  // engine
  const engine = new GameEngine({
    scoreRules: app.data.SCORE_RULES,
    onState: () => updateHUD()
  });

  // expõe API no app
  app.game = {
    startChallenge,
    goHome,
    engine
  };

  // binds
  dom.challenge1Btn?.addEventListener("click", () => onChallengeClick(1));
  dom.challenge2Btn?.addEventListener("click", () => onChallengeClick(2));
  dom.challenge3Btn?.addEventListener("click", () => onChallengeClick(3));

  dom.hintBtn?.addEventListener("click", () => onHint());
  dom.skipLevelBtn?.addEventListener("click", () => onSkip());
  dom.nextLevelBtn?.addEventListener("click", () => onNext());

  dom.finalHomeBtn?.addEventListener("click", () => goHome());
  // compat: ranking.open() é o método canônico; openRanking é alias
  dom.finalRankingBtn?.addEventListener("click", () => app.ranking?.open?.() || app.ranking?.openRanking?.());

  // estado tutorial/progresso
  const LS_TUTORIAL_DONE = "mission_tutorial_done";
  const LS_PROGRESS = "mission_progress_v1";

  // Snapshots para tela final (antes/depois por atividade)
  const levelSnapshots = []; // [{ idx:number, before:string, after:string }]
  let currentLevelBefore = "";

  function getProgress(){
    try { return JSON.parse(localStorage.getItem(LS_PROGRESS) || "{}"); }
    catch { return {}; }
  }
  function setProgress(p){
    localStorage.setItem(LS_PROGRESS, JSON.stringify(p || {}));
  }
  function markChallengeDone(ch, score){
    const p = getProgress();
    p["c"+ch] = { done:true, score: score ?? 0, at: Date.now() };
    setProgress(p);
    updateChallengeButtons();
  }
  function isChallengeDone(ch){
    return !!getProgress()?.["c"+ch]?.done;
  }
  function canAccessChallenge(ch){
    if (ch === 1) return true;
    if (!app.auth?.isLogged?.()) return false;
    return isChallengeDone(ch-1);
  }
function updateChallengeButtons(){
  // Atualiza UI de acesso (Desafio 2/3) com base em login + progresso
  const p = getProgress();
  const c3Done = !!p?.c3?.done;

  const b1 = dom.challenge1Btn;
  const b2 = dom.challenge2Btn;
  const b3 = dom.challenge3Btn;

  const access2 = canAccessChallenge(2);
  const access3 = canAccessChallenge(3);

  if (b1){
    b1.disabled = false;
    b1.classList.remove("btn-disabled");
    b1.textContent = "Desafio 1";
  }

  if (b2){
    b2.disabled = !access2;
    b2.classList.toggle("btn-disabled", !access2);
    b2.textContent = access2 ? "Desafio 2" : "Desafio 2 🔒";
  }

  if (b3){
    b3.disabled = !access3;
    b3.classList.toggle("btn-disabled", !access3);
    b3.textContent = access3 ? "Desafio 3" : "Desafio 3 🔒";
  }

  // Missão especial (libera após concluir Desafio 3)
  if (dom.missionSpecialHomeBtn){
    dom.missionSpecialHomeBtn.disabled = !c3Done;
    dom.missionSpecialHomeBtn.style.opacity = c3Done ? "1" : ".5";
  }
  if (dom.finalMissionSpecialBtn){
    dom.finalMissionSpecialBtn.style.display = c3Done ? "inline-flex" : "none";
  }
}
  function requireNameSector(){
    const name = app.user?.getUserName?.() || "";
    const sector = app.user?.getUserSector?.() || "";
    if (name && sector) return true;
    // mostrar formulário (sem login)
    ui.showOnly(dom.screenForm);
    return false;
  }

function onChallengeClick(ch){
    // visitante precisa informar nome + setor (para frases e ranking por setor depois)
    if (!app.auth?.isLogged?.() && !requireNameSector()) return;
    if (!canAccessChallenge(ch)){
      if (!app.auth?.isLogged?.()){
        openModal({
          title:"🔒 Desafio bloqueado",
          bodyHTML:`<p>Desafio bloqueado: crie uma conta e cumpra as tarefas anteriores para participar das demais.</p>`,
          buttons:[{label:"Criar conta / Entrar", onClick: () => { closeModal(); app.auth?.openAuthGate?.(); } }, {label:"Ok", variant:"ghost", onClick: closeModal}]
        });
        return;
      }
      openModal({
        title:"🔒 Primeiro cumpra as anteriores",
        bodyHTML:`<p>Para liberar este desafio, conclua o desafio anterior.</p>`,
        buttons:[
        {label:"Fechar", variant:"ghost", onClick: closeModal},
              ].filter(Boolean)
    });
      return;
    }

    // confirm start
    openModal({
      title:`Iniciar Desafio ${ch}?`,
      bodyHTML:`<p>Você deseja iniciar agora? (O desafio só pode ser jogado uma vez.)</p>`,
      buttons:[
        {label:"Cancelar", variant:"ghost", onClick: closeModal},
        {label:"Iniciar", onClick: () => { closeModal(); startChallenge(ch); }}
      ]
    });
  }

  function startChallenge(ch){
    const levels = getChallengeLevels(ch);
    engine.loadChallenge(ch, levels);

    // tutorial só antes do desafio 1 e só 1x
    if (ch === 1 && localStorage.getItem(LS_TUTORIAL_DONE) !== "1"){
      promptTutorial(() => {
        localStorage.setItem(LS_TUTORIAL_DONE, "1");
        ui.showOnly(dom.screenGame);
        engine.startLevel();
        currentLevelBefore = String(engine.currentText || "");
        showLevelIntro();
        renderMessage();
      });
      return;
    }

    ui.showOnly(dom.screenGame);
    engine.startLevel();
    currentLevelBefore = String(engine.currentText || "");
    showLevelIntro();
    renderMessage();
  }

  function promptTutorial(onContinue){
    openModal({
      title:"🎄 Tutorial rápido",
      bodyHTML:`<p>O tutorial vai explicar rapidamente a dinâmica do jogo. Se preferir, você pode pular.</p>`,
      buttons:[
        {label:"Pular", variant:"ghost", onClick: () => { closeModal(); onContinue(); }},
        {label:"Ver tutorial", onClick: () => { closeModal(); runTutorial(onContinue); }}
      ]
    });
  }

  function runTutorial(onFinish){
    // tutorial como “challenge 0”
    const levels = getTutorialLevels();
    engine.loadChallenge(0, levels);
    ui.showOnly(dom.screenGame);
    engine.startLevel();
    currentLevelBefore = String(engine.currentText || "");
    showLevelIntro(true);
    renderMessage(true);
    // ao terminar, volta para challenge 1
    engine._afterTutorial = onFinish;
  }

  function goHome(){
    ui.showOnly(dom.screenForm);
    updateChallengeButtons();
  }

  function openSpecialMission(){
    openModal({
      title: "✨ Missão Especial",
      bodyHTML: `
        <div style="text-align:center; padding:6px 2px">
          <div style="font-size:46px; line-height:1">🎁</div>
          <h3 style="margin:10px 0 6px">Um Natal de compaixão</h3>
          <p style="margin:0 0 8px">Que este Natal seja mais do que festas e fartura.</p>
          <p style="margin:0 0 8px">Que seja tempo de <b>caridade</b>, <b>amor ao próximo</b> e cuidado recíproco.</p>
          <p class="muted" style="margin:0; font-size:13px">Obrigado por participar 💛</p>
        </div>
      `,
      buttons: [{ label:"Voltar", variant:"ghost", onClick: closeModal }]
    });
  }


  
  dom.missionSpecialHomeBtn?.addEventListener("click", () => {
    const p = loadProgress();
    if (!p.c3Done){
      openModal({ title:"🔒 Missão Especial", bodyHTML:`<p>Conclua o <b>Desafio 3</b> para liberar a Missão Especial.</p>`, buttons:[{label:"Ok", variant:"ghost", onClick: closeModal}] });
      return;
    }
    openSpecialMission();
  });

  dom.finalMissionSpecialBtn?.addEventListener("click", () => openSpecialMission());
// =========================
  // HUD / Intro
  // =========================
  function updateHUD(){
    const st = engine.getState();
    dom.scoreCountEl && (dom.scoreCountEl.textContent = String(st.score));
    dom.totalFixEl && (dom.totalFixEl.textContent = String(st.totalFix));
    dom.remainingCount && (dom.remainingCount.textContent = String(Math.max(0, st.totalFix - st.fixedCount)));

    // next button behavior
    if (dom.nextLevelBtn){
      const done = engine.isDone();
      dom.nextLevelBtn.disabled = !done;
      dom.nextLevelBtn.setAttribute("aria-disabled", (!done).toString());
      dom.nextLevelBtn.classList.toggle("btn-disabled", !done);
      dom.nextLevelBtn.textContent = done
        ? (st.levelIndex === (engine.levels.length - 1) ? "Finalizar tarefa" : "Próxima tarefa")
        : "Resolva para liberar";
      if (dom.skipLevelBtn){
        // Tutorial: não pode pular
        if (engine.challenge === 0){
          dom.skipLevelBtn.disabled = true;
          dom.skipLevelBtn.classList.add("hidden");
        } else {
          dom.skipLevelBtn.classList.remove("hidden");
          dom.skipLevelBtn.disabled = false;
          dom.skipLevelBtn.textContent = "Avançar sem concluir (-5)";
          if (done) dom.skipLevelBtn.disabled = true;
        }
      }
    }
  }

  function showLevelIntro(isTutorial=false){
    const st = engine.getState();
    const lvl = st.level;
    if (!lvl) return;

    dom.levelLabel && (dom.levelLabel.textContent = lvl.name || "");
    dom.instruction && (dom.instruction.textContent = lvl.instruction || "");
    // Tutorial force-auto: pisca botão de dica
    if (dom.hintBtn){
      const pulse = (engine.challenge===0 && lvl.tutorialMode === "force-auto");
      dom.hintBtn.classList.toggle("pulse", pulse);
    }

    openModal({
      title: isTutorial ? `📘 ${lvl.name}` : `🎅 ${lvl.name}`,
      bodyHTML: `
        <p style="white-space:pre-line">${escapeHtml(lvl.intro || "")}</p>
        <p class="muted" style="margin-top:12px">Os erros serão explicados no final da tarefa.</p>
      `,
      buttons: [{ label:"Entendi", onClick: closeModal }]
    });
  }

  // =========================
  // Render message tokens
  // =========================
  function escapeHtml(s){
    return String(s||"")
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }

  function renderMessage(isTutorial=false){
    const st = engine.getState();
    const lvl = st.level;
    if (!lvl || !dom.messageArea) return;

    dom.messageArea.innerHTML = "";
    const text = st.text;
    const rules = engine.currentRules;

    // build a set of matches (simple: first occurrence per rule, then remaining via regex scanning)
    // We'll render by scanning text from left to right and taking earliest match among unfixed rules.
    let pos = 0;
    while (pos < text.length){
      let best = null;
      let bestRule = null;

      for (const rule of rules){
        if (engine.fixedRuleIds.has(rule.id)) continue;
        const re = new RegExp(rule.wrong.source, rule.wrong.flags.includes("g") ? rule.wrong.flags : rule.wrong.flags+"g");
        re.lastIndex = pos;
        const m = re.exec(text);
        if (!m) continue;
        if (!best || m.index < best.index){
          best = { index:m.index, text:m[0], len:m[0].length };
          bestRule = rule;
        }
      }

      if (!best){
        appendPlain(text.slice(pos));
        break;
      }
      if (best.index > pos) appendPlain(text.slice(pos, best.index));

      const span = document.createElement("span");
      span.className = (engine.challenge===0 ? "token error" : "token candidate");
      span.textContent = best.text;
      span.dataset.kind = "error";
      span.dataset.ruleid = bestRule.id;

      span.addEventListener("click", () => onTokenClick(span, bestRule));
      dom.messageArea.appendChild(span);

      pos = best.index + best.len;
    }

    // plain tokens as selectable spans (for misclicks)
    function appendPlain(seg){
      // agrupa por espaços e tokens (palavras/pontuação) — evita “clicar só numa letra”
      const parts = seg.match(/\s+|[^\s]+/g) || [];
      for (const part of parts){
        if (/^\s+$/.test(part)){
          dom.messageArea.appendChild(document.createTextNode(part));
          continue;
        }
        const s = document.createElement("span");
        const isPunct = /^[,.;:!?]+$/.test(part);
        s.className = "token plain" + (isPunct ? " punct" : "");
        s.textContent = part;
        s.dataset.kind = "plain";
        s.addEventListener("click", () => onPlainClick(s));
        dom.messageArea.appendChild(s);
      }
    }

    // tutorial "focus" (optional): dim everything else and lock clicks
    if (isTutorial){
      applyTutorialFocus(lvl);
    } else {
      clearTutorialFocus();
    }
  }

  function clearTutorialFocus(){
    document.body.classList.remove("tutorial-focus");
    document.querySelectorAll(".token").forEach(t => {
      t.classList.remove("focus");
      t.style.pointerEvents = "";
    });
  }

  function applyTutorialFocus(lvl){
    clearTutorialFocus();
    const focusRuleId = lvl.focusRuleId;
    const focusPlain = lvl.focusPlain;

    let focusEl = null;
    if (focusRuleId){
      focusEl = dom.messageArea?.querySelector(`.token.error[data-ruleid="${CSS.escape(focusRuleId)}"]`);
    }
    if (!focusEl && focusPlain){
      focusEl = Array.from(dom.messageArea?.querySelectorAll(".token.plain") || [])
        .find(el => el.textContent === focusPlain);
    }
    if (!focusEl) return;

    document.body.classList.add("tutorial-focus");
    focusEl.classList.add("focus");
    // trava cliques fora do foco
    document.querySelectorAll(".token").forEach(t => {
      if (t === focusEl) t.style.pointerEvents = "auto";
      else t.style.pointerEvents = "none";
    });
  }

  
  function openHint(){
    const nextRule = engine.currentRules.find(r => !engine.fixedRuleIds.has(r.id));
    if (!nextRule){
      openModal({ title:"Dica", bodyHTML:`<p>Você já corrigiu todos os trechos desta tarefa 🎉</p>`, buttons:[
        {label:"Fechar", variant:"ghost", onClick: closeModal},
              ].filter(Boolean)
    });
      return;
    }
    openModal({
      title:"💡 Me dê uma dica",
      bodyHTML: `
        <p><b>Dica:</b> ${escapeHtml(nextRule.reason || "Observe o trecho destacado.")}</p>
        <p class="muted" style="margin-top:10px">Você pode corrigir manualmente ou usar a correção automática (com penalidade crescente).</p>
      `,
      buttons:[
        {label:"Fechar", variant:"ghost", onClick: closeModal},
        {label:"Correção automática", onClick: () => { closeModal(); confirmAuto(nextRule); }}
      ]
    });
  }

// =========================
  // Token click flows
  // =========================
  function onPlainClick(el){
    if (engine.isDone?.() && engine.challenge!==0) return;
    openModal({
      title:"Tem certeza que deseja corrigir este trecho?",
      bodyHTML:`<p><b>${escapeHtml(el.textContent)}</b></p>`,
      buttons:[
        {label:"Cancelar", variant:"ghost", onClick: closeModal},
        {label:"Confirmar", onClick: () => {
          closeModal();
          const delta = engine.penalizeMisclick();
          scoreFloat(delta, dom.nextLevelBtn);
          openModal({
            title:"Trecho já correto!",
            bodyHTML:`<p>A palavra/trecho <b>"${escapeHtml(el.textContent)}"</b> já está correta! Que pena, você perdeu <b>${Math.abs(app.data.SCORE_RULES.wrong)}</b> pontos.</p>`,
            buttons:[
        {label:"Fechar", variant:"ghost", onClick: closeModal},
              ].filter(Boolean)
    });
        }}
      ]
    });
  }

  function onTokenClick(el, rule){
    const st = engine.getState?.();
    const lvl = st?.level;
    if (engine.isDone?.() && engine.challenge!==0) return;
    // Tutorial: restringe interação ao foco (ou força auto)
    if (engine.challenge===0 && lvl){
      if (lvl.tutorialMode === "force-auto") return;
      if (lvl.focusRuleId && rule?.id !== lvl.focusRuleId) return;
    }
    openModal({
      title:"Tem certeza que deseja corrigir este trecho?",
      bodyHTML:`<p><b>${escapeHtml(el.textContent)}</b></p>`,
      buttons:[
        {label:"Cancelar", variant:"ghost", onClick: closeModal},
        {label:"Corrigir", onClick: () => { closeModal(); openCorrection(rule, el.textContent, el); }}
      ]
    });
  }

  function openCorrection(rule, shownText, tokenEl){
    const correct = rule.correct ?? "";
    const isRemove = correct === "";

    openModal({
      title:"✍️ Fazer correção",
      bodyHTML: `
        <p class="muted" style="margin-top:0">Trecho selecionado:</p>
        <p style="margin:6px 0 10px"><b>${escapeHtml(shownText)}</b></p>
        <label class="field" style="gap:6px">
          <span class="muted" style="font-size:13px">Digite a correção</span>
          <input class="input" id="corrInput" type="text" value="${escapeHtml(isRemove ? "" : shownText)}" placeholder="${isRemove ? "(deixe vazio para remover)" : "Digite aqui"}"/>
        </label>
        <p class="muted" style="margin:10px 0 0; font-size:13px">${escapeHtml(rule.reason || "")}</p>
      `,
      buttons:[
        {label:"Cancelar", variant:"ghost", onClick: closeModal},
        {label: isRemove ? "Remover" : "Confirmar", onClick: () => {
          const v = document.getElementById("corrInput")?.value ?? "";
          // normaliza comparação
          const ok = (normText(v) === normText(correct ?? ""));
          if (!ok){
            if (tokenEl){ tokenEl.classList.add("wrong","blocked"); }
          const delta = engine.applyWrong(rule.id);
            scoreFloat(delta, dom.nextLevelBtn);
            openModal({
              title:"Ops!",
              bodyHTML:`<p>A correção não está certa! Você perdeu <b>${Math.abs(app.data.SCORE_RULES.wrong)}</b> pontos.</p>
                       <p class="muted">Gostaria de tentar de novo ou prefere uma correção automática? (Você perderá pontos se usar a correção automática.)</p>`,
              buttons:[
                {label:"Tentar de novo", variant:"ghost", onClick: () => { closeModal(); openCorrection(rule, shownText, tokenEl); }},
                {label:"Correção automática", onClick: () => { closeModal(); confirmAuto(rule); }}
              ]
            });
            return;
          }

          // aplica
          closeModal();
          engine.logFix({ kind:"manual", label: rule.label||"", before: shownText, after: rule.correct ?? "", reason: rule.reason||"" });
          if (tokenEl){ tokenEl.classList.remove("error","wrong"); tokenEl.classList.add("correct","blocked"); tokenEl.textContent = String(rule.correct ?? ""); if ((rule.correct ?? "") === "") tokenEl.remove(); }
          const delta = engine.applyCorrect(rule.id);
          scoreFloat(delta, dom.nextLevelBtn);
          // aplica no texto (substitui primeira ocorrência não fixa)
          engine.currentText = engine.currentText.replace(rule.wrong, rule.correct);
          updateHUD();
          // Mantém o token corrigido destacado em verde (não re-renderiza toda a mensagem aqui)

          if (engine.isDone()){
            // auto-advance not; user uses next
          }
        }}
      ]
    });
  }

  function confirmAuto(rule, anchorEl){
  const nextPenalty = Math.abs((app.data.SCORE_RULES.auto - engine.autoUsed));
  openModal({
    title:"Correção automática",
    bodyHTML:`<p>Tem certeza que deseja corrigir automaticamente? Você perderá <b>${nextPenalty}</b> pontos.</p>`,
    buttons:[
      {label:"Cancelar", variant:"ghost", onClick: closeModal},
      {label:"Aplicar", onClick: () => {
        closeModal();

        const tokenEl = dom.messageArea?.querySelector(`.token.error[data-ruleid="${rule.id}"]`) || null;

        const delta = engine.autoCorrect(rule.id);
        scoreFloat(delta, tokenEl || anchorEl || dom.hintBtn);

        // marca visualmente como corrigido (verde + bloqueado)
        if (tokenEl){
          tokenEl.classList.remove("error");
          tokenEl.classList.add("correct","blocked");
          if ((rule.correct ?? "") === "") tokenEl.remove();
          else tokenEl.textContent = String(rule.correct);
        }

        engine.logFix({
          kind:"auto",
          label: rule.label || "",
          before: tokenEl?.textContent || "",
          after: rule.correct ?? "",
          reason: rule.reason || ""
        });

        engine.currentText = engine.currentText.replace(rule.wrong, rule.correct);
        updateHUD();
        // não re-renderiza imediatamente para preservar o “verde” no token; 
        // mas se não houver token (casos raros), re-renderiza
        if (!tokenEl) renderMessage(engine.challenge===0);
      }}
    ]
  });
}


  // =========================
  // Hint / Skip / Next
  // =========================
  function onHint(){
    const st = engine.getState();
    const lvl = st.level;
    if (!lvl){
      return;
    }

    const pending = engine.currentRules.filter(r => !engine.fixedRuleIds.has(r.id));
    const first = pending[0];

    const delta = engine.useHint();
    scoreFloat(delta, dom.hintBtn);

    const forceAuto = (engine.challenge===0 && lvl && lvl.tutorialMode === "force-auto");

    openModal({
      title:"💡 Dica",
      bodyHTML: first
        ? `<p>${escapeHtml(first.reason || "Há um erro para corrigir no texto.")}</p>
           <p class="muted">Você perdeu <b>${Math.abs(app.data.SCORE_RULES.hint)}</b> ponto por usar dica.</p>`
        : `<p>Não há mais correções pendentes nesta tarefa.</p>`,
      buttons: [
        { label:"Ok", variant:"ghost", onClick: closeModal },
        ...(first ? [{ label:"Fazer correção automaticamente", onClick: () => { closeModal(); confirmAuto(first); } }] : [])
      ]
    });
  }

  function onSkip(){
  if (engine.isDone() && engine.challenge !== 0) return;
  openModal({
    title:"Avançar sem concluir",
    bodyHTML:`<p>Deseja avançar sem concluir esta tarefa? Você perderá <b>${Math.abs(app.data.SCORE_RULES.skip)}</b> pontos.</p>`,
    buttons:[
      {label:"Cancelar", variant:"ghost", onClick: closeModal},
      {label:"Avançar", onClick: () => { 
        closeModal();
        const delta = engine.addScore(app.data.SCORE_RULES.skip);
        scoreFloat(delta, dom.skipLevelBtn);
        nextInternal();
      }}
    ]
  });
}



  function renderFinalMessages(){
    // Preenche caixas do HTML (finalBox1/2/3) com texto antes/depois
    const boxes = [dom.finalBox1, dom.finalBox2, dom.finalBox3];
    for (let i=0;i<3;i++){
      const box = boxes[i] || document.getElementById(`finalBox${i+1}`);
      if (!box) continue;
      const snap = levelSnapshots[i];
      if (!snap){
        box.innerHTML = `<p class="muted">(Sem dados desta atividade)</p>`;
        continue;
      }
      box.innerHTML = `
        <div class="final-msg">
          <div class="muted" style="font-size:12px; margin-bottom:6px">Antes</div>
          <div class="final-before">${escapeHtml(snap.before)}</div>
          <div class="muted" style="font-size:12px; margin:10px 0 6px">Depois</div>
          <div class="final-after">${escapeHtml(snap.after)}</div>
        </div>`;
    }

    // Esconde botão "Próxima tarefa" no final (evita fluxo quebrado)
    const nextBtn = document.getElementById("finalNextTaskBtn");
    if (nextBtn) nextBtn.classList.add("hidden");
  }

function onNext(){
  if (!engine.isDone()) return;
  nextInternal();
}


  function nextInternal(){
    // Guarda snapshot da atividade atual (antes/depois) para tela final
    try{
      const stNow = engine.getState?.();
      if (engine.challenge !== 0 && stNow?.level){
        levelSnapshots[engine.levelIndex] = {
          idx: engine.levelIndex,
          before: String(currentLevelBefore || ""),
          after: String(engine.currentText || "")
        };
      }
    }catch(e){ /* noop */ }

    const res = engine.nextLevel();
    if (res.finishedChallenge){
      // tutorial terminou?
      if (engine.challenge === 0 && typeof engine._afterTutorial === "function"){
        const cb = engine._afterTutorial;
        engine._afterTutorial = null;
        cb();
        return;
      }

      // salva progresso + ranking (logado)
      markChallengeDone(engine.challenge, engine.score);
      if (app.auth?.isLogged?.()){
        app.ranking?.submitChallengeScore?.(engine.challenge, { score: engine.score, correct: engine.correct, wrong: engine.wrong });
      }

      ui.showOnly(dom.screenFinal);
      renderFinalMessages();
            return;
    }
    // começou próxima atividade
    currentLevelBefore = String(engine.currentText || "");
    showLevelIntro(engine.challenge===0);
    renderMessage(engine.challenge===0);
  }

  // init landing screen
  ui.showOnly(dom.screenForm);
  updateChallengeButtons();
}

function normText(s){ return String(s ?? '').trim().normalize('NFC'); }
