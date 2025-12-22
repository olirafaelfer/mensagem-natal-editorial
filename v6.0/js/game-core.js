// js/game-core.js — gameplay (engine + UI)
// ✅ Sem 'return' no topo (evita "Illegal return statement")
import { GameEngine } from "./engine/game-engine.js";
import { getChallengeLevels } from "./data/challenges/index.js";
import { getTutorialLevels } from "./data/tutorial.js";
import { scoreFloat } from "./ui/score-fx.js";

export function bootGame(app){
  const { dom, ui } = app;

  // Progresso persistente (por usuário / visitante)
  const loadProgress = () => (app.progress?.load?.() || { mode:"visitor" });
  const saveProgress = (p) => app.progress?.save?.(p);

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

  // Tutorial flags por etapa (para passos obrigatórios)
  const tutorialFlags = {};

  // expõe API no app
  app.game = {
    startChallenge,
    goHome,
    engine,
    refreshAccess: () => updateChallengeButtons(),
    resetRuntime: () => { engine.resetAll(); levelSnapshots.length = 0; currentLevelBefore = ""; }
  };

  // binds
  dom.challenge1Btn?.addEventListener("click", () => onChallengeClick(1));
  dom.challenge2Btn?.addEventListener("click", () => onChallengeClick(2));
  dom.challenge3Btn?.addEventListener("click", () => onChallengeClick(3));

  // Tutorial (separado): libera o Desafio 1 após concluir ou pular
  dom.tutorialBtn?.addEventListener("click", () => openTutorialGate());
  // Logo: voltar para a página inicial
  document.getElementById("logoTop")?.addEventListener("click", () => goHome());
  document.getElementById("logoHome")?.addEventListener("click", () => goHome());


  dom.hintBtn?.addEventListener("click", () => onHint());
  dom.skipLevelBtn?.addEventListener("click", () => onSkip());
  dom.nextLevelBtn?.addEventListener("click", () => onNext());

  dom.finalHomeBtn?.addEventListener("click", () => goHome());
  // compat: ranking.open() é o método canônico; openRanking é alias
  dom.finalRankingBtn?.addEventListener("click", () => app.ranking?.open?.() || app.ranking?.openRanking?.());

  // tela final: mostrar/ocultar mensagens corrigidas
  const toggleBtn = dom.toggleFinalMsgsBtn || document.getElementById("toggleFinalMsgs");
  if (toggleBtn){
    toggleBtn.addEventListener("click", () => {
      const wrap = dom.finalMsgsWrap || document.getElementById("finalMsgsWrap");
      if (!wrap) return;
      const willShow = wrap.classList.contains("hidden");
      wrap.classList.toggle("hidden", !willShow);
      toggleBtn.setAttribute("aria-expanded", willShow ? "true" : "false");
      if (willShow) renderFinalMessages();
    });
    // Tutorial: após abrir a dica, a mão passa a indicar a correção automática
    if (engine.challenge===0){
      const idx = st?.levelIndex ?? 0;
      tutorialFlags[idx] = { ...(tutorialFlags[idx]||{}), hintClicked: true };
      setTimeout(() => {
        try{
          const foot = document.getElementById("modalFoot");
          const btns = Array.from(foot?.querySelectorAll("button")||[]);
          const autoBtn = btns.find(b => (b.textContent||"").toLowerCase().includes("correção automática"));
          autoBtn?.classList.add("focus-hand");
        }catch(e){}
      }, 0);
    }

  }

  // tela final: botões "Correções e justificativas"
  for (let i=1;i<=3;i++){
    const b = document.getElementById(`reviewBtn${i}`);
    if (!b) continue;
    b.addEventListener("click", () => {
      const snap = levelSnapshots[i-1];
      openModal?.({
        title: `📌 Atividade ${i} — Correções`,
        body: snap ? `
          <div class="final-review">
            <p class="muted">Antes:</p>
            <div class="final-review-box">${escapeHtml(snap.before)}</div>
            <p class="muted" style="margin-top:10px">Depois:</p>
            <div class="final-review-box">${escapeHtml(snap.after)}</div>
          </div>
        ` : `<p class="muted">(Sem dados desta atividade)</p>`,
        actions:[{ label:"Fechar", variant:"primary", onClick: () => closeModal?.() }]
      });
    });
  }

  // estado tutorial/progresso
  // Tutorial: chave nova (V5) + migração automática da chave antiga (V2)
  const LS_TUTORIAL_BASE = "mission_tutorial_done_v5";
  const LS_TUTORIAL_OLD  = "mission_tutorial_done_v2";
  const LS_PROGRESS_BASE = "mission_progress_v2";

  function userScope(){
    const u = app.auth?.getUser?.();
    return u?.uid || "anon";
  }
  function tutorialKey(){ return LS_TUTORIAL_BASE + "_" + userScope(); }
  function tutorialKeyOld(){ return LS_TUTORIAL_OLD + "_" + userScope(); }

  // Migra (uma vez) a flag de tutorial concluído de versões antigas
  try{
    if (localStorage.getItem(tutorialKey()) !== "1" && localStorage.getItem(tutorialKeyOld()) === "1"){
      localStorage.setItem(tutorialKey(), "1");
    }
  }catch{}
  function hasTutorialDone(){
    // migra automaticamente
    const k = tutorialKey();
    if (localStorage.getItem(k) === "1") return true;
    if (localStorage.getItem(tutorialKeyOld()) === "1"){
      localStorage.setItem(k, "1");
      return true;
    }
    return false;
  }
  function progressKey(){ return LS_PROGRESS_BASE + "_" + userScope(); }

  // Snapshots para tela final (antes/depois por atividade)
  const levelSnapshots = []; // [{ idx:number, before:string, after:string }]
  let currentLevelBefore = "";

  function getProgress(){
    try { return JSON.parse(localStorage.getItem(progressKey()) || "{}"); }
    catch { return {}; }
  }
  function setProgress(p){
    localStorage.setItem(progressKey(), JSON.stringify(p || {}));
  }
  function markChallengeDone(ch, score, correct, wrong){
    const p = getProgress();
    const c = Number(correct ?? 0);
    const w = Number(wrong ?? 0);
    const t = c + w;
    const pct = t ? Math.round((c / t) * 100) : 0;
    p["c"+ch] = { done:true, score: Number(score ?? 0), correct: c, wrong: w, pct, at: Date.now() };
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

  const c1 = p?.c1;
  const c2 = p?.c2;
  const c3 = p?.c3;

  const tDone = hasTutorialDone();
  if (dom.tutorialBtn){
    dom.tutorialBtn.disabled = false;
    dom.tutorialBtn.classList.remove('btn-disabled');
  }

  if (b1){
    // Desafio 1 só libera após concluir ou pular o tutorial
    const lockedByTutorial = !tDone;
    b1.disabled = lockedByTutorial;
    b1.classList.toggle("btn-disabled", lockedByTutorial);
    b1.style.opacity = lockedByTutorial ? '.6' : '1';
    b1.textContent = c1?.done ? `Desafio 1 ✅` : (lockedByTutorial ? "Desafio 1 🔒" : "Desafio 1");
  }

  if (b2){
    b2.disabled = !access2;
    b2.classList.toggle("btn-disabled", !access2);
    if (!access2) b2.textContent = "Desafio 2 🔒";
    else b2.textContent = c2?.done ? `Desafio 2 ✅` : "Desafio 2";
  }

  if (b3){
    b3.disabled = !access3;
    b3.classList.toggle("btn-disabled", !access3);
    if (!access3) b3.textContent = "Desafio 3 🔒";
    else b3.textContent = c3?.done ? `Desafio 3 ✅` : "Desafio 3";
  }

    // Missão especial (libera após concluir Desafio 3)
  const logged = !!app.auth?.isLogged?.();
  if (dom.missionSpecialHomeBtn){
    const enabled = !!c3Done;
    dom.missionSpecialHomeBtn.disabled = !enabled;
    dom.missionSpecialHomeBtn.style.opacity = enabled ? "1" : ".5";
    dom.missionSpecialHomeBtn.title = enabled ? "" : "Conclua o Desafio 3 para liberar";
  }
  if (dom.finalMissionSpecialBtn){
    // no final, só mostra se já liberou (independente de login)
    dom.finalMissionSpecialBtn.style.display = c3Done ? "inline-flex" : "none";
  }
}
  function requireNameSector(){
    const name = app.user?.getUserName?.() || "";
    const sector = app.user?.getUserSector?.() || "";
    if (name && sector) return true;
    // visitante: exigir nome + setor
    openModal({
      title: "Nome e setor obrigatórios",
      bodyHTML: `<p>Para jogar como visitante, informe <strong>seu nome</strong> e <strong>seu setor</strong>.</p>`,
      buttons: [{ label: "Ok", variant: "primary", onClick: () => { closeModal(); ui.showOnly(dom.screenForm); setTimeout(()=>{ try{ document.getElementById('userName')?.focus(); }catch{} },50); } }]
    });
    return false;
  }

  function openTutorialGate(){
    openModal({
      title: '📘 Tutorial',
      bodyHTML: `<p>O tutorial é um passo a passo interativo para você aprender os comandos do jogo.</p>
        <p class="muted">Você pode fazer agora ou pular (o Desafio 1 será liberado mesmo assim).</p>`,
      buttons: [
        { label: 'Fazer tutorial', onClick: () => {
            closeModal();
            runTutorial(()=>{
              try { localStorage.setItem(tutorialKey(), '1'); } catch {}
              updateChallengeButtons();
              // Ao terminar, volta para o início e oferece ir para o Desafio 1
              ui.showOnly(dom.screenForm);
              openModal({
                title: '✅ Tutorial concluído',
                bodyHTML: `<p>Pronto! Você já sabe usar a correção manual, a dica, a correção automática e o avançar sem concluir.</p>`,
                buttons: [
                  { label: 'Início', variant: 'ghost', onClick: closeModal },
                  { label: 'Ir para o Desafio 1', onClick: () => { closeModal(); startChallenge(1); } },
                ]
              });
            });
          } },
        { label: 'Pular tutorial', variant: 'ghost', onClick: () => {
            try { localStorage.setItem(tutorialKey(), '1'); } catch {}
            closeModal();
            updateChallengeButtons();
          } },
      ]
    });
  }

  function onChallengeClick(ch){
    // visitante precisa informar nome + setor (para frases e ranking por setor depois)
    if (!app.auth?.isLogged?.() && !requireNameSector()) return;

    // Segurança: se o desafio 1 for clicado sem tutorial concluído, abre o gate
    if (ch === 1 && !hasTutorialDone()){
      openTutorialGate();
      return;
    }
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

    // Bloqueia refazer desafio concluído (mostra resultado resumido)
    if (isChallengeDone(ch)){
      const p = (getProgress() || {})["c"+ch] || {};
      const pts = Number(p.score ?? 0);
      const pct = Number(p.pct ?? 0);
      openModal({
        title: `✅ Desafio ${ch} já concluído`,
        bodyHTML: `
          <p>Você já concluiu este desafio e não pode refazê-lo.</p>
          <div class="result-card" style="margin-top:10px">
            <div><b>Pontos:</b> ${pts}</div>
            <div><b>Acertos:</b> ${pct}%</div>
          </div>
          <p class="muted" style="margin-top:10px">Em uma próxima versão, vamos mostrar também suas correções completas aqui.</p>
        `,
        buttons: [ { label: "Ok", variant: "primary", onClick: closeModal } ]
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
        <div class="special-wrap" style="text-align:center">
          <div class="special-reindeer">🦌🛷</div>
          <div style="font-size:54px; line-height:1">🎄</div>
          <div class="special-lights" aria-hidden="true">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
          <h3 style="margin:10px 0 8px">A missão especial de Natal é:</h3>
          <p style="margin:0 0 10px">
            Ajude o próximo, pratique a caridade, ame quem está do seu lado.
            A missão mais importante para este Natal é estender uma mão a quem precisa e perceber que não somos mais nem menos do que qualquer outra pessoa.
          </p>
          <p style="margin:0 0 10px">
            <b>Se você cumprir esta missão</b>, pode ter certeza que seu fim de ano estará mais completo.
          </p>
          <div style="display:flex; justify-content:center; margin-top:14px">
            <img src="asset/logo-natal.png" alt="Logo" style="width:140px; opacity:.95"/>
          </div>
          <p class="muted" style="margin:10px 0 0; font-size:13px">Feliz Natal! ✨</p>
        </div>
      `,
      buttons: [{ label:"Voltar", variant:"ghost", onClick: closeModal }]
    });
  }


  
  dom.missionSpecialHomeBtn?.addEventListener("click", () => {
    const p = getProgress();
    if (!(p?.c3?.done)){
      openModal({ title:"🔒 Missão Especial", bodyHTML:`<p>Conclua o <b>Desafio 3</b> para liberar a Missão Especial.</p>`, buttons:[{label:"Ok", variant:"ghost", onClick: closeModal}] });
      return;
    }
    openSpecialMission();
  });

  dom.finalMissionSpecialBtn?.addEventListener("click", () => {
    const p = getProgress();
    if (!(p?.c3?.done)){
      openModal({ title:"Missao Especial", bodyHTML: "<p>Conclua o Desafio 3 para liberar a Missao Especial.</p>", buttons:[{label:"Ok", variant:"ghost", onClick: closeModal}] });
      return;
    }
    openSpecialMission();
  });
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
      let done = engine.isDone();
      // Tutorial: etapas que exigem ações específicas
      if (engine.challenge === 0){
        const st2 = engine.getState?.();
        const lvl2 = st2?.level;
        const idx2 = st2?.levelIndex ?? 0;
        const flags = tutorialFlags[idx2] || {};

        // Tutorial: controla botões e foco
        if (dom.hintBtn){
          const hintAllowed = !!lvl2?.hintEnabled || lvl2?.tutorialMode === "force-auto";
          dom.hintBtn.disabled = !hintAllowed;
          dom.hintBtn.classList.toggle("btn-disabled", !hintAllowed);
          dom.hintBtn.classList.toggle("focus-hand", !!lvl2?.focusHintBtn && !(flags.hintClicked));
        }
        if (dom.skipLevelBtn){
          const allowSkip = !!lvl2?.allowSkipInTutorial;
          dom.skipLevelBtn.style.display = allowSkip ? "" : "none";
          dom.skipLevelBtn.disabled = !allowSkip;
        }
        if (lvl2?.tutorialMode === "force-misclick") done = !!flags.misclickDone;
        if (lvl2?.tutorialMode === "force-skip") done = false;
      }
      dom.nextLevelBtn.disabled = !done;
      dom.nextLevelBtn.classList.toggle("focus-hand", done);
      dom.nextLevelBtn.setAttribute("aria-disabled", (!done).toString());
      dom.nextLevelBtn.classList.toggle("btn-disabled", !done);
      dom.nextLevelBtn.textContent = done
        ? (st.levelIndex === (engine.levels.length - 1) ? "Finalizar tarefa" : "Próxima tarefa")
        : "Resolva para liberar";
      if (engine.challenge===0 && st.level?.tutorialMode==="force-skip"){
        dom.nextLevelBtn.textContent = "Use Avançar sem concluir";
        dom.nextLevelBtn.disabled = true;
        dom.nextLevelBtn.setAttribute("aria-disabled","true");
        dom.nextLevelBtn.classList.add("btn-disabled");
      }
      if (dom.skipLevelBtn){
        // Tutorial: por padrão não pode pular (exceto etapa que ensina pular)
        if (engine.challenge === 0){
          const allowSkip = !!st.level?.allowSkipInTutorial;
          dom.skipLevelBtn.classList.toggle("hidden", !allowSkip);
          dom.skipLevelBtn.disabled = !allowSkip;
          if (allowSkip){ dom.skipLevelBtn.textContent = "Avançar sem concluir (-5)"; }
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
      dom.hintBtn.classList.toggle("focus-hand", !!lvl.focusHintBtn);
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
        <p><b>Dica:</b> ${escapeHtml((engine.challenge===0 ? (nextRule.reason||"Observe o trecho destacado.") : (nextRule.hint||"Procure um erro no trecho selecionado.")))}</p>
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
    const st = engine.getState?.();
    const lvl = st?.level;
    const idx = st?.levelIndex ?? 0;
    if (engine.challenge===0 && lvl?.tutorialMode==="force-misclick"){
      const target = (lvl.focusMisclickWord||"").toLowerCase();
      if (target && el.textContent.toLowerCase() !== target) return;
    }
    openModal({
      title:"Tem certeza que deseja corrigir este trecho?",
      bodyHTML:`<p><b>${escapeHtml(el.textContent)}</b></p>`,
      buttons:[
        {label:"Cancelar", variant:"ghost", onClick: closeModal},
        {label:"Confirmar", onClick: () => {
          closeModal();
          const delta = engine.penalizeMisclick();
          // Tutorial: marca passo concluído
          if (engine.challenge===0 && lvl?.tutorialMode==="force-misclick"){
            tutorialFlags[idx] = { ...(tutorialFlags[idx]||{}), misclickDone: true };
            updateHUD();
          }
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

      // Tutorial 4/5: clique errado (penalidade) — penaliza imediatamente
      if (lvl.tutorialMode === "force-misclick"){
        const word = (el?.textContent || "").trim();
        if (lvl.focusMisclickWord && word !== lvl.focusMisclickWord) return;

        const idx = st?.levelIndex ?? 0;
        tutorialFlags[idx] = { ...(tutorialFlags[idx]||{}), misclickDone: true };

        // confirmação antes de penalizar
        openModal({
          title: "⚠️ Você quer corrigir mesmo?",
          bodyHTML: `<p>Você clicou em <b>“${escapeHtml(word)}”</b>, mas esse trecho já está correto.</p>
                    <p>Se continuar, você perde <b>1 ponto</b>.</p>`,
          buttons:[
            {label:"Cancelar", variant:"ghost", onClick: closeModal},
            {label:"Continuar e perder 1 ponto", variant:"primary", onClick: () => {
              closeModal();
              // penalidade + feedback
              try{ engine.addScore?.(-1); }catch(e){ /* noop */ }
              scoreFloat(-1, el);

              // marca visualmente e bloqueia novo clique (evita penalizar 2x)
              try{
                if (el){
                  el.classList.add("token-wrong");
                  el.classList.add("token-locked");
                  el.style.pointerEvents = "none";
                }
              }catch(e){}

              const idx = st?.levelIndex ?? 0;
              tutorialFlags[idx] = { ...(tutorialFlags[idx]||{}), misclickDone: true };

              openModal({
                title: "⚠️ Clique errado",
                bodyHTML: `<p>Esse trecho já estava correto. Você perdeu <strong>1 ponto</strong>.</p>`,
                buttons:[ {label:"Entendi", variant:"primary", onClick: closeModal} ],
                dismissible: true
              });

              updateHUD();
            }}
          ],
          dismissible: true
        });
        updateHUD();
        return;
      }
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
          <input class="input" id="corrInput" type="text" value="" placeholder="${isRemove ? "(deixe vazio para remover)" : "Digite aqui"}"/>
        </label>
        ${engine.challenge===0 ? `<p class="muted" style="margin:10px 0 0; font-size:13px">${escapeHtml(rule.reason || "")}</p>` : ""}
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
    if (dom.hintBtn?.disabled) return;
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

  // Tutorial 5/5: avanço sem concluir deve ser em 1 clique
  const st = engine.getState?.();
  const lvl = st?.level;
  const idx = st?.levelIndex ?? 0;
  if (engine.challenge === 0 && lvl?.tutorialMode === "force-skip"){
    const delta = engine.addScore(app.data.SCORE_RULES.skip);
    tutorialFlags[idx] = { ...(tutorialFlags[idx]||{}), skipDone: true };
    scoreFloat(delta, dom.skipLevelBtn);
    nextInternal();
    return;
  }

  openModal({
    title:"Avançar sem concluir",
    bodyHTML:`<p>Deseja avançar sem concluir esta tarefa? Você perderá <b>${Math.abs(app.data.SCORE_RULES.skip)}</b> pontos.</p>`,
    buttons:[
      {label:"Cancelar", variant:"ghost", onClick: closeModal},
      {label:"Avançar", onClick: () => { 
        closeModal();
        const delta = engine.addScore(app.data.SCORE_RULES.skip);
        // (tutorial force-skip é tratado acima)
        scoreFloat(delta, dom.skipLevelBtn);
        nextInternal();
      }}
    ]
  });
}



  function renderFinalMessages(){
    function applyRules(raw, rules){
      let txt = String(raw||"");
      for (const r of (rules||[])){
        try{
          const rx = (r.wrong instanceof RegExp) ? r.wrong : new RegExp(r.wrong, r.flags || "g");
          txt = txt.replace(rx, String(r.correct ?? ""));
        }catch(e){ /* noop */ }
      }
      return txt;
    }

    function tokenize(s){
      return String(s||"").match(/\w+|[^\w\s]+|\s+/g) || [String(s||"")];
    }

    function renderAfterHighlighted(before, after, perfect){
      const tb = tokenize(before);
      const ta = tokenize(after);
      const tp = tokenize(perfect);
      // se muito diferente, não arrisca highlight
      if (Math.abs(ta.length - tp.length) > 25) return escapeHtml(after);
      const out = [];
      for (let i=0;i<ta.length;i++){
        const tok = ta[i];
        const p = tp[i] ?? "";
        const b = tb[i] ?? "";
        if (/^\s+$/.test(tok)) { out.push(tok); continue; }
        const safe = escapeHtml(tok);
        if (tok === p && tok !== b) out.push(`<span class="final-good">${safe}</span>`);
        else if (tok !== p) out.push(`<span class="final-bad">${safe}</span>`);
        else out.push(safe);
      }
      return out.join("");
    }
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
      const perfect = applyRules(snap.before, snap.rules);
      const afterHTML = renderAfterHighlighted(snap.before, snap.after, perfect);
      box.innerHTML = `
        <div class="final-msg">
          <div class="muted" style="font-size:12px; margin-bottom:6px">Antes</div>
          <div class="final-before">${escapeHtml(snap.before)}</div>
          <div class="muted" style="font-size:12px; margin:10px 0 6px">Depois</div>
          <div class="final-after">${afterHTML}</div>
          <div class="muted" style="font-size:12px; margin:10px 0 6px">Correção perfeita</div>
          <div class="final-perfect">${escapeHtml(perfect)}</div>
        </div>`;
    }

    // Esconde botão "Próxima tarefa" no final (evita fluxo quebrado)
    const nextBtn = document.getElementById("finalNextTaskBtn");
    if (nextBtn) nextBtn.classList.add("hidden");
  }

function onNext(){
  // Tutorial: algumas etapas não dependem de engine.isDone()
  if (engine.challenge === 0){
    const st = engine.getState?.() || {};
    const lvl = st.level;
    const idx = st.levelIndex ?? 0;
    const flags = tutorialFlags[idx] || {};
    if (lvl?.tutorialMode === "force-misclick"){
      if (!flags.misclickDone) return;
      nextInternal();
      return;
    }
    if (lvl?.tutorialMode === "force-skip"){
      // nesta etapa, o avanço normal não é permitido
      return;
    }
  }
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
          after: String(engine.currentText || ""),
          rules: Array.isArray(stNow.level.rules) ? JSON.parse(JSON.stringify(stNow.level.rules)) : []
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
      markChallengeDone(engine.challenge, engine.score, engine.correct, engine.wrong);
      if (app.auth?.isLogged?.()){
        app.ranking?.submitChallengeScore?.(engine.challenge, {score:engine.score,correct:engine.correct,wrong:engine.wrong,total:(engine.totalRules ?? (engine.correct+engine.wrong))});
      }
      // garante que botões/habilitações reflitam o novo progresso (inclui Missão Especial)
      updateChallengeButtons();
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