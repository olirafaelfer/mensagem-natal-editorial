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

  // =============================
  // Helpers (escopo do game-core)
  // =============================
  function applyRules(raw, rules){
    let txt = String(raw || "");
    for (const r of (rules || [])) {
      try {
        const rx = (r.wrong instanceof RegExp)
          ? r.wrong
          : new RegExp(r.wrong, r.flags || "g");
        txt = txt.replace(rx, String(r.correct ?? ""));
      } catch (e) {
        // ignore malformed rules
      }
    }
    return txt;
  }

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

  }

  // tela final: botões "Correções e justificativas"
  for (let i=1;i<=3;i++){
    const b = document.getElementById(`reviewBtn${i}`);
    if (!b) continue;
    b.addEventListener("click", () => {
      const snap = levelSnapshots[i-1];
      openModal?.({
        title: `📌 Atividade ${i} — Correções e justificativas`,
        body: snap ? (() => {
          const perfect = applyRules(snap.before, snap.rules);
          const rules = (snap.rules||[]).map((r, idx) => {
            // Preferimos labels amigáveis (para não mostrar regex/contexto)
            const wrong = (r.labelWrong || r.token || (r.wrong?.source ?? r.wrong) || "").toString();
            const correctRaw = (r.labelCorrect || r.correct || "").toString();
            const correct = (correctRaw === "") ? "(remover)" : correctRaw;
            const why = (r.hint || r.why || r.reason || r.explain || r.details || "").toString();
            return `
              <div class="final-rule">
                <div class="final-rule-title">• ${escapeHtml(wrong)} → <b>${escapeHtml(correct)}</b></div>
                ${why ? `<div class="muted" style="margin-top:4px">${escapeHtml(why)}</div>` : ""}
              </div>
            `;
          }).join("") || `<p class="muted">(Sem regras de correção registradas)</p>`;
          return `
            <div class="final-review">
              <p class="muted" style="margin:0 0 8px">Texto original:</p>
              <div class="final-review-box">${escapeHtml(snap.before)}</div>
              <p class="muted" style="margin:10px 0 8px">Texto correto:</p>
              <div class="final-review-box">${escapeHtml(perfect)}</div>
              <div style="margin-top:14px">
                <b>Correções aplicadas</b>
                <div style="margin-top:8px">${rules}</div>
              </div>
            </div>
          `;
        })() : `<p class="muted">(Sem dados desta atividade)</p>`,
        buttons:[{ label:"Fechar", variant:"primary", onClick: () => closeModal?.() }]
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
// OBS: a conta anônima nunca chega ao Desafio 3, então basta checar o progresso.
const enabledSpecial = !!c3Done;

if (dom.missionSpecialHomeBtn){
  dom.missionSpecialHomeBtn.disabled = !enabledSpecial;
  dom.missionSpecialHomeBtn.classList.toggle("btn-disabled", !enabledSpecial);
  dom.missionSpecialHomeBtn.style.opacity = enabledSpecial ? "1" : ".5";
  // Ajusta ícone/label na home
  const baseLabel = "Missão especial";
  dom.missionSpecialHomeBtn.textContent = enabledSpecial ? `${baseLabel} 🎁` : `${baseLabel} 🔒`;

}

if (dom.finalMissionSpecialBtn){
  dom.finalMissionSpecialBtn.style.display = enabledSpecial ? "inline-flex" : "none";
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
    const p = getProgress();
    if (p?.c1?.done) {
      openModal({
        title: '📘 Tutorial',
        bodyHTML: `<p>O tutorial só pode ser feito antes de realizar o desafio 1.</p>`,
        buttons: [{ label: 'Ok', variant: 'primary', onClick: closeModal }],
        dismissible: true
      });
      return;
    }
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

  async function onChallengeClick(ch){
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
      const pts = Math.max(0, Number(p.score ?? 0));

      // Posição no ranking (x de y)
      let rankLine = "";
      try{
        const kind = (ch===1) ? 'd1' : (ch===2) ? 'd2' : 'd3';
        const info = await app.ranking?.getMyRankXofY?.(kind);
        if (info?.rank && info?.total) rankLine = `<div><b>Ranking:</b> ${info.rank} de ${info.total}</div>`;
      }catch(e){ /* noop */ }
      openModal({
        title: `✅ Desafio ${ch} já concluído`,
        bodyHTML: `
          <p>Você já concluiu este desafio e não pode refazê-lo.</p>
          <div class="result-card" style="margin-top:10px">
            <div><b>Pontos:</b> ${pts}</div>
            ${rankLine}
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
          <h3 style="margin:10px 0 8px">Missão especial de Natal</h3>
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
          <hr style="margin:14px 0; opacity:.25"/>
          <p style="margin:0 0 10px" class="muted">Se quiser, compartilhe com quem você gosta 💌</p>
          <button class="btn" id="specialShareBtn" type="button" style="width:100%; justify-content:center">📤 Compartilhar</button>
          <p class="special-share-hint">✨ <span class="blink">Compartilhe esta missão com seus amigos e familiares!</span> ✨</p>
          <p class="muted" style="margin:8px 0 0; font-size:12px">
            <a href="https://olirafaelfer.github.io/mensagem-natal-editorial/" target="_blank" rel="noopener">https://olirafaelfer.github.io/mensagem-natal-editorial/</a>
          </p>
          <p class="muted" style="margin:10px 0 0; font-size:13px">Feliz Natal! ✨</p>
        </div>
      `,
      buttons: [{ label:"Voltar", variant:"ghost", onClick: closeModal }]
    });

    // bind share button (after modal mounts)
    setTimeout(() => {
      const btn = document.getElementById('specialShareBtn');
      if (!btn || btn.__bound) return;
      btn.__bound = true;
      btn.addEventListener('click', async ()=>{
        const url = 'https://olirafaelfer.github.io/mensagem-natal-editorial/';
        const text = 'Compartilhe esta missão com seus amigos e familiares!';
        try{
          const resp = await fetch('asset/share-msg.jpeg', { cache: 'no-store' });
          const blob = await resp.blob();
          const file = new File([blob], 'missao-especial-natal.jpeg', { type: blob.type || 'image/jpeg' });

          if (navigator.share && (!navigator.canShare || navigator.canShare({ files:[file] }))){
            await navigator.share({ title:'Missão Especial de Natal', text, url, files:[file] });
            return;
          }
        }catch(e){
          console.warn('[special] share via Web Share falhou', e);
        }

        // fallback (WhatsApp Web / copiar texto)
        try{
          const msg = encodeURIComponent(`${text}\n${url}`);
          window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener');
        }catch(e){
          openModal({ title:'Compartilhar', bodyHTML:`<p>Copie e envie:</p><p><b>${escapeHtml(text)}</b></p><p>${escapeHtml(url)}</p>`, buttons:[{label:'Ok', onClick: closeModal}] });
        }
      });
    }, 0);
  }


  
  dom.missionSpecialHomeBtn?.addEventListener("click", () => {
    const p = getProgress();
    if (!(p?.c3?.done)) {
      openModal({ title:"🔒 Missão Especial", bodyHTML:`<p>Conclua o <b>Desafio 3</b> para liberar a Missão Especial.</p>`, buttons:[{label:"Ok", variant:"ghost", onClick: closeModal}] });
      return;
    }
    openSpecialMission();
  });

  dom.finalMissionSpecialBtn?.addEventListener("click", () => {
    const p = getProgress();
    if (!(p?.c3?.done)) {
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

  // Mini toast (feedback rápido, sem modal)
  function miniToast(msg){
    try{
      let layer = document.getElementById("miniToastLayer");
      if (!layer){
        layer = document.createElement("div");
        layer.id = "miniToastLayer";
        layer.className = "mini-toast-layer";
        document.body.appendChild(layer);
      }
      const t = document.createElement("div");
      t.className = "mini-toast";
      t.textContent = msg;
      layer.appendChild(t);
      // dispara animação
      requestAnimationFrame(() => t.classList.add("show"));
      setTimeout(() => {
        t.classList.remove("show");
        setTimeout(() => t.remove(), 250);
      }, 1100);
    }catch(e){ /* noop */ }
  }


  function renderMessage(isTutorial=false){
    const st = engine.getState();
    const lvl = st.level;
    if (!lvl || !dom.messageArea) return;

    dom.messageArea.innerHTML = "";
    const text = st.text;
    const rules = engine.currentRules;

    // Mapa de vírgulas removíveis (Desafio 2): pos -> rule
    const commaPosToRule = new Map();
    if (engine.challenge === 2 && lvl?.punctuationOnly){
      for (const rule of rules){
        if (engine.fixedRuleIds.has(rule.id)) continue;
        if (rule?.token !== ",") continue;
        try{
          const re = new RegExp(rule.wrong.source, rule.wrong.flags.includes("g") ? rule.wrong.flags : rule.wrong.flags + "g");
          let m;
          while ((m = re.exec(text))){
            const rel = String(m[0]).indexOf(",");
            if (rel >= 0){
              commaPosToRule.set(m.index + rel, rule);
            }
            // evita loop infinito em regex sem avanço
            if (m.index === re.lastIndex) re.lastIndex++;
          }
        }catch(e){ /* noop */ }
      }
    }

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

      const tokenClass = (engine.challenge===0 ? "token error" : "token candidate");

      // ✅ UX: para pontuação removível, renderiza SÓ o símbolo (ex.: ",") como clicável.
      // A regra continua usando um "wrong" maior (contexto), mas o usuário só clica na pontuação.
      if (bestRule?.clickTokenOnly && bestRule?.token && best.text.includes(bestRule.token)){
        let buf = "";
        const tok = String(bestRule.token);
        for (const ch of best.text){
          if (ch === tok){
            if (buf){ appendPlain(buf); buf = ""; }
            const cspan = document.createElement("span");
            cspan.className = tokenClass;
            cspan.textContent = tok;
            cspan.dataset.kind = "error";
            cspan.dataset.ruleid = bestRule.id;
            if (engine.lockedRuleIds?.has?.(bestRule.id)){
              cspan.classList.add("wrong","blocked","token-locked");
              cspan.style.pointerEvents = "none";
            }
            cspan.addEventListener("click", () => onTokenClick(cspan, bestRule));
            dom.messageArea.appendChild(cspan);
          } else {
            buf += ch;
          }
        }
        if (buf) appendPlain(buf);
      } else {
        const span = document.createElement("span");
        span.className = tokenClass;
        span.textContent = best.text;
        span.dataset.kind = "error";
        span.dataset.ruleid = bestRule.id;
        if (engine.lockedRuleIds?.has?.(bestRule.id)){
          span.classList.add("wrong","blocked","token-locked");
          span.style.pointerEvents = "none";
        }
        span.addEventListener("click", () => onTokenClick(span, bestRule));
        dom.messageArea.appendChild(span);
      }

      pos = best.index + best.len;
    }

    // plain tokens as selectable spans (for misclicks)
    // ✅ separa pontuação da palavra (vírgulas sempre clicáveis)
    function appendPlain(seg, startPos=0){
      let i = 0;
      let abs = startPos;
      const pushText = (t) => dom.messageArea.appendChild(document.createTextNode(t));
      const pushSpan = (txt, isPunct=false, pos=null) => {
        const s = document.createElement("span");
        s.className = "token plain" + (isPunct ? " punct" : "");
        s.textContent = txt;
        s.dataset.kind = "plain";
        if (pos != null) s.dataset.pos = String(pos);
        s.addEventListener("click", () => onPlainClick(s, commaPosToRule));
        dom.messageArea.appendChild(s);
      };
      while (i < seg.length){
        const ch = seg[i];
        // whitespace as text node
        if (/\s/.test(ch)){
          let j = i;
          while (j < seg.length && /\s/.test(seg[j])) j++;
          pushText(seg.slice(i, j));
          abs += (j - i);
          i = j;
          continue;
        }
        // word (letters/numbers/_)
        if (/[-\p{L}\p{N}_]/u.test(ch)){
          let j = i;
          while (j < seg.length && /[-\p{L}\p{N}_]/u.test(seg[j])) j++;
          const word = seg.slice(i, j);
          pushSpan(word, false, abs);
          abs += (j - i);
          i = j;
          continue;
        }
        // punctuation/symbol (single char)
        pushSpan(ch, true, abs);
        abs += 1;
        i += 1;
      }
      return abs;
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
  function onPlainClick(el, commaPosToRule){
    if (engine.isDone?.() && engine.challenge!==0) return;
    const st = engine.getState?.();
    const lvl = st?.level;
    const idx = st?.levelIndex ?? 0;

    // Desafio 2 (pontuação): vírgulas sempre clicáveis, com confirmação.
    if (engine.challenge === 2 && lvl?.punctuationOnly && el?.textContent === ","){
      const pos = Number(el.dataset.pos ?? -1);
      if (!Number.isFinite(pos) || pos < 0) return;
      if (engine.lockedPositions?.has?.(pos) || el.classList.contains('token-locked')) return;

      openModal({
        title: "Remover vírgula?",
        bodyHTML: `<p>Você realmente deseja remover esta <b>vírgula</b>?</p>`,
        buttons: [
          {label:"Cancelar", variant:"ghost", onClick: closeModal},
          {label:"Remover", onClick: () => {
            closeModal();
            engine.lockedPositions.add(pos);

            const rule = commaPosToRule?.get?.(pos) || null;
            if (!rule){
              // clique errado: penaliza 1x e bloqueia este token
              const delta = engine.penalizeMisclick();
              scoreFloat(delta, el);
              el.classList.add('wrong','blocked','token-locked');
              el.style.pointerEvents = 'none';
              miniToast('❌ Vírgula correta — penalidade');
              updateHUD();
              return;
            }

            // clique certo: aplica correção rápida
            try{
              engine.logFix({ kind:"manual", label: rule.label||"", before: ",", after: "", reason: (rule.hint||rule.reason||"") });
              engine.currentText = engine.currentText.replace(rule.wrong, rule.correct);
              const delta = engine.applyCorrect(rule.id);
              scoreFloat(delta, el);
              el.classList.add('correct','blocked','token-locked');
              el.style.pointerEvents = 'none';
              el.remove();
              miniToast('✅ Vírgula removida');
              renderMessage(false);
              updateHUD();
            }catch(e){
              console.warn('[game] remover vírgula falhou', e);
            }
          }}
        ],
        dismissible: true
      });
      return;
    }
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
    // Já bloqueado (correção errada anterior): não penaliza novamente
    try{
      if (engine.lockedRuleIds && rule && engine.lockedRuleIds.has(rule.id)){
        el?.classList?.add?.('wrong','blocked','token-locked');
        return;
      }
    }catch(e){}
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
    // ✅ Pontuação removível (ex.: vírgulas indevidas no Desafio 2)
    // Para vírgulas, pedimos confirmação para evitar misclick.
    if (engine.challenge !== 0 && rule?.fast === true){
      const isComma = (rule?.token === ",");
      if (isComma && lvl?.punctuationOnly){
        openModal({
          title: "Remover vírgula?",
          bodyHTML: `<p>Você realmente deseja remover esta <b>vírgula</b>?</p>`,
          buttons: [
            {label:"Cancelar", variant:"ghost", onClick: closeModal},
            {label:"Remover", onClick: () => { closeModal(); /* continua */ doFastFix(); }}
          ],
          dismissible: true
        });
        return;
      }

      doFastFix();
      return;
    }

    function doFastFix(){
      try{
        engine.logFix({ kind:"manual", label: rule.label||"", before: el?.textContent||"", after: (rule.correct ?? ""), reason: (rule.hint||rule.reason||"") });

        // aplica no texto (usa o contexto do "wrong")
        engine.currentText = engine.currentText.replace(rule.wrong, rule.correct);

        const delta = engine.applyCorrect(rule.id);
        scoreFloat(delta, el || dom.nextLevelBtn);

        // marca visualmente (e remove o token, se ele sumir)
        if (el){
          el.classList.remove("error");
          el.classList.add("correct","blocked");
          el.style.pointerEvents = "none";
          // se o token era só pontuação, remove do DOM
          el.remove();
        }
        updateHUD();
        miniToast(rule?.token===',' ? '✅ Vírgula removida' : '✅ Pontuação removida');
      }catch(e){
        console.warn('[game] fast fix falhou', e);
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
            // marca em vermelho e bloqueia novas tentativas neste mesmo trecho
            if (tokenEl){
              tokenEl.classList.add("wrong","blocked","token-locked");
              tokenEl.style.pointerEvents = "none";
            }
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

    // Título complementar (abaixo do 🎄)
    try{
      const sub = dom.finalTitleSub || document.getElementById("finalTitleSub");
      if (sub){
        if (engine.challenge===0) sub.textContent = "Tutorial concluído!";
        else sub.textContent = `Desafio ${engine.challenge} concluído!`;
      }
    }catch(e){}
    // Preenche caixas do HTML (finalBox1/2/3) com 3 textos + explicação por clique
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

      // compila regras (string -> RegExp) e prepara explicações
      const compiled = (snap.rules||[]).map((r, idx) => {
        let rx;
        try{ rx = (r.wrong instanceof RegExp) ? r.wrong : new RegExp(r.wrong, r.flags || "g"); }catch(e){ rx = null; }
        const wrongLabel = (r.labelWrong || r.token || r.wrong || "").toString();
        const correctLabel = (r.labelCorrect || (r.correct ?? "") || "").toString();
        const why = (r.why || r.reason || r.hint || r.explain || "").toString();
        return { ...r, id: r.id || `r${idx+1}`, rx, wrongLabel, correctLabel, why };
      });

      const explainById = new Map(compiled.map(r => [r.id, r]));

      function highlightWrong(text){
        let pos = 0;
        const out = [];
        while (pos < text.length){
          let best = null;
          let bestRule = null;
          for (const r of compiled){
            if (!r.rx) continue;
            const re = new RegExp(r.rx.source, r.rx.flags.includes('g') ? r.rx.flags : (r.rx.flags + 'g'));
            re.lastIndex = pos;
            const m = re.exec(text);
            if (!m) continue;
            if (!best || m.index < best.index){
              best = { index:m.index, text:m[0] };
              bestRule = r;
            }
          }
          if (!best){ out.push(escapeHtml(text.slice(pos))); break; }
          if (best.index > pos) out.push(escapeHtml(text.slice(pos, best.index)));

          const chunk = String(best.text);
          if (bestRule?.clickTokenOnly && bestRule?.token === ',' && chunk.includes(',')){
            // destaca apenas a vírgula
            for (let k=0;k<chunk.length;k++){
              const ch = chunk[k];
              if (ch === ',') out.push(`<span class="final-bad" data-ruleid="${escapeHtml(bestRule.id)}">,</span>`);
              else out.push(escapeHtml(ch));
            }
          } else {
            out.push(`<span class="final-bad" data-ruleid="${escapeHtml(bestRule.id)}">${escapeHtml(chunk)}</span>`);
          }
          pos = best.index + chunk.length;
        }
        return out.join('');
      }

      function highlightCorrect(text){
        let html = escapeHtml(text);
        // tenta marcar a correção (quando existir) com base no "correct"
        for (const r of compiled){
          const c = String(r.correct ?? "");
          if (!c || r.token === ',') continue;
          const safe = escapeHtml(c);
          // substitui só a primeira ocorrência
          html = html.replace(safe, `<span class="final-good" data-ruleid="${escapeHtml(r.id)}">${safe}</span>`);
        }
        return html;
      }

      const beforeHTML = highlightWrong(snap.before);
      // no texto do usuário, destacamos o que ficou diferente do original (tentativa heurística)
      const userHTML = highlightCorrect(snap.after);
      const perfectHTML = highlightCorrect(perfect);

      box.innerHTML = `
        <div class="final-msg">
          <div class="muted" style="font-size:12px; margin-bottom:6px">Texto original</div>
          <div class="final-before">${beforeHTML}</div>
          <div class="muted" style="font-size:12px; margin:10px 0 6px">Seu texto</div>
          <div class="final-after">${userHTML}</div>
          <div class="muted" style="font-size:12px; margin:10px 0 6px">Texto correto</div>
          <div class="final-perfect">${perfectHTML}</div>
          <div class="final-explain muted" style="margin-top:10px; font-size:13px">Clique nos trechos <span class="final-good"><b>verdes</b></span> ou <span class="final-bad"><b>vermelhos</b></span> para ver a justificativa.</div>
        </div>`;

      
      function openJustifPopup({ wrong, correct, why }){
        // popup simples dentro do overlay atual (não substitui a tela final)
        const existing = document.getElementById("justifOverlay");
        if (existing) existing.remove();

        const ov = document.createElement("div");
        ov.id = "justifOverlay";
        ov.className = "justif-overlay";
        ov.innerHTML = `
          <div class="justif-pop" role="dialog" aria-modal="true">
            <div class="justif-head">
              <div class="justif-title">📌 Justificativa</div>
              <button class="icon-btn" type="button" aria-label="Fechar">✕</button>
            </div>
            <div class="justif-body">
              <div><b>Palavra/trecho errado:</b> ${escapeHtml(wrong || "")}</div>
              <div><b>Correção:</b> ${escapeHtml(correct || "")}</div>
              ${why ? `<div><b>Justificativa:</b> ${escapeHtml(why)}</div>` : '<div class="muted">(Sem justificativa cadastrada)</div>'}
            </div>
            <div class="justif-foot">
              <button class="btn ghost" type="button">Fechar</button>
            </div>
          </div>
        `;
        const close = () => ov.remove();
        ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
        ov.querySelector(".icon-btn")?.addEventListener("click", close);
        ov.querySelector(".btn")?.addEventListener("click", close);
        document.body.appendChild(ov);
      }

// interação: clique nos trechos para mostrar justificativa
      const explainBox = box.querySelector('.final-explain');
      box.querySelectorAll('[data-ruleid]')?.forEach(el => {
        el.addEventListener('click', () => {
          const id = el.getAttribute('data-ruleid');
          const r = explainById.get(id);
          if (!r || !explainBox) return;
          const wrong = (r.wrongLabel || '').toString();
          const correct = (String(r.correct ?? '') === '') ? '(remover)' : String(r.correct ?? '');
          const why = (r.why || '').toString();
          openModal({
            title: "📌 Justificativa",
            bodyHTML: `
              <div style="display:grid; gap:8px">
                <div><b>Palavra/trecho errado:</b> ${escapeHtml(wrong)}</div>
                <div><b>Correção:</b> ${escapeHtml(correct)}</div>
                ${why ? `<div><b>Justificativa:</b> ${escapeHtml(why)}</div>` : '<div class="muted">(Sem justificativa cadastrada)</div>'}
              </div>
            `,
            buttons:[{label:"Fechar", variant:"ghost", onClick: closeModal}]
          });
        });
      });
    }
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