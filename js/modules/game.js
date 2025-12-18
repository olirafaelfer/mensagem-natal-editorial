import { Engine } from "../game/engine.js";
import { tutorialLevels } from "../game/data/tutorial.js";
import { challenges } from "../game/data/challenges.js";

const SCORE_RULES = {
  correct: 5,
  wrong: -3,
  hint: -1,
  skip: -5,
  autoBase: -2
};

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function tokenize(text){
  // espaços separados; pontuação isolada
  return (text.match(/\s+|[\wÀ-ÿ]+|[^\s\w]/g) || []);
}

export async function createGame({ dom, modal, store, auth, ranking, scoreFx, show }){
  const engine = new Engine({ scoreRules: SCORE_RULES });

  let mode = "tutorial"; // tutorial|challenge
  let ch = 1;
  let idx = 0;

  function state(){
    const s = store.load();
    return {
      tutorialDone: !!s.tutorialDone,
      progress: s.progress || { c1:0, c2:0, c3:0 },
      unlocked: s.unlocked || { c2:false, c3:false, special:false }
    };
  }
  function patch(p){ return store.patch(p); }

  function refreshGate(){
    const s = state();
    dom.gate.btnC1.disabled = !s.tutorialDone;
    dom.gate.btnC2.disabled = !(s.unlocked.c2 && auth.isLoggedIn());
    dom.gate.btnC3.disabled = !(s.unlocked.c3 && auth.isLoggedIn());
    dom.gate.btnSpecial.disabled = !s.unlocked.special;
    // login real será pluggado depois
  }

  function ensureGate(){
    return auth.requireGate();
  }

  function startTutorial(from=0){
    if (!ensureGate()) return;
    mode = "tutorial";
    idx = from;
    startLevel(tutorialLevels[idx], { multiplier: 0, guided: true });
  }

  function unlockAfterTutorial(){
    patch({ tutorialDone: true });
    refreshGate();
  }

  function startChallenge(c){
    if (!ensureGate()) return;
    const s = state();
    if (!s.tutorialDone){
      modal.open({
        title: "Tutorial obrigatório",
        html: "<p>Antes do Desafio 1, faça o tutorial. Você pode pular agora e liberar do mesmo jeito.</p>",
        buttons: [
          { label: "Ver tutorial", variant:"primary", onClick: () => { modal.close(); startTutorial(0); } },
          { label: "Pular tutorial", onClick: () => { modal.close(); unlockAfterTutorial(); startChallenge(1); } },
        ],
        dismissible: true
      });
      return;
    }
    mode = "challenge";
    ch = c;
    idx = (state().progress["c"+c] || 0);
    const level = challenges[c][idx];
    startLevel(level, { multiplier: c===1?1: c===2?1.2:1.4, guided: false });
  }

  function startLevel(level, { multiplier, guided }){
    show(dom.screens.game);
    engine.reset();
    engine.loadLevel({ levelLabel: level.label, entries: level.targets.map(t => t.id) });
    render(level, guided);
    updateHUD(level, multiplier, guided);
    // hint bar
    dom.game.hintBar.classList.add("hidden");
    dom.game.hintBar.textContent = "";
    // store current context
    current = { level, multiplier, guided };
  }

  let current = null;
  let idToToken = new Map(); // ruleId -> span

  function render(level, guided){
    idToToken.clear();
    dom.game.messageArea.innerHTML = "";
    if (guided) dom.game.messageArea.classList.add("tutorial-mode");
    else dom.game.messageArea.classList.remove("tutorial-mode");

    const parts = tokenize(level.text);
    const targets = level.targets.slice(); // array
    for (const part of parts){
      if (/^\s+$/.test(part)){
        dom.game.messageArea.appendChild(document.createTextNode(part));
        continue;
      }
      // check if part matches any target wrong/correct marker (use wrong for focus)
      const t = targets.find(x => x.wrong === part);
      const sp = document.createElement("span");
      sp.className = "token " + (t ? "wrong" : "plain");
      sp.textContent = part;
      if (t){
        sp.dataset.ruleId = t.id;
        idToToken.set(t.id, sp);
      }
      sp.addEventListener("click", () => onTokenClick(sp, t, level));
      dom.game.messageArea.appendChild(sp);
    }

    if (guided){
      // focus
      const focusId = level.guide?.focusId;
      if (focusId){
        const focusEl = idToToken.get(focusId);
        if (focusEl){
          focusEl.classList.add("focus");
        }
      }
    }
  }

  function markToken(ruleId, kind){
    const el = idToToken.get(ruleId);
    if (!el) return;
    el.classList.remove("wrong","correct","plain","focus");
    el.classList.add(kind, "blocked");
  }

  function updateHUD(level, multiplier, guided){
    dom.game.hudLevel.textContent = level.label;
    dom.game.hudRemaining.textContent = `Correções: ${engine.remaining()}/${engine.totalToFix}`;
    dom.game.hudScore.textContent = `Pontos: ${engine.score}`;
    const done = engine.done();
    dom.game.btnNext.disabled = !done;
    dom.game.btnNext.textContent = done ? (isLastLevel() ? "Finalizar tarefa" : "Próxima tarefa") : "Resolva para liberar";
    dom.game.btnSkip.disabled = done; // se terminou, não faz sentido pular
    // bloquear cliques após done
    if (done){
      dom.game.messageArea.querySelectorAll(".token").forEach(t => t.classList.add("blocked"));
    }
  }

  function isLastLevel(){
    if (mode==="tutorial") return idx >= tutorialLevels.length-1;
    return idx >= challenges[ch].length-1;
  }

  function onTokenClick(el, t, level){
    const tokenText = el.textContent;
    modal.open({
      title: "Tem certeza que deseja corrigir este trecho?",
      html: `<p><b>${escapeHtml(tokenText)}</b></p>`,
      buttons: [
        { label: "Cancelar", onClick: modal.close },
        { label: "Corrigir", variant:"primary", onClick: () => { modal.close(); decideCorrection(el, t, level); } }
      ],
      dismissible: false
    });
  }

  function decideCorrection(tokenEl, target, level){
    if (!target){
      // penaliza por tentar corrigir algo correto
      const delta = engine.penaltyWrong();
      scoreFx.pop(delta, tokenEl);
      modal.open({
        title: "Trecho já está correto!",
        html: `<p>A palavra <b>“${escapeHtml(tokenEl.textContent)}”</b> já está correta. Que pena, você perdeu <b>${Math.abs(delta)}</b> pontos.</p>`,
        buttons: [{ label: "Ok", variant:"primary", onClick: modal.close }],
        dismissible: false
      });
      tokenEl.classList.add("blocked"); // evita repetir punição
      tokenEl.classList.add("correct");
      return;
    }
    openCorrection(tokenEl, target, level);
  }

  function openCorrection(tokenEl, target, level){
    const needsBlank = target.wrong.trim() === "," || target.wrong.trim()===";" || target.wrong.trim()===":";
    const placeholder = needsBlank ? "(deixe vazio para remover)" : "Digite a correção…";
    const inputId = "corrInput";
    modal.open({
      title: "Corrigir",
      html: `
        <p>Substitua <b>${escapeHtml(target.wrong)}</b> por:</p>
        <input id="${inputId}" type="text" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(needsBlank ? "" : "")}" />
        <p class="muted tiny" style="margin-top:10px">Dica e correção automática custam pontos.</p>
      `,
      buttons: [
        { label: "Cancelar", onClick: modal.close },
        { label: "Enviar", variant:"primary", onClick: () => {
            const v = document.getElementById(inputId).value;
            applyManual(tokenEl, target, v);
          }
        }
      ],
      dismissible: false
    });
  }

  function applyManual(tokenEl, target, value){
    const typed = (value ?? "").trim();
    const expected = (target.correct ?? "").trim();
    if (typed === expected){
      modal.close();
      engine.markFixed(target.id);
      engine.logFix({ kind:"manual", before: target.wrong, after: target.correct, reason: target.reason });
      const delta = engine.rewardCorrect(current.multiplier);
      scoreFx.pop(delta, tokenEl);
      // apply visual + DOM text
      tokenEl.textContent = target.correct;
      markToken(target.id, "correct");
      updateHUD(current.level, current.multiplier, current.guided);
      // tutorial step requiring misclick etc ignored for now
      return;
    }
    // errado
    const delta = engine.penaltyWrong();
    scoreFx.pop(delta, tokenEl);
    modal.open({
      title: "Ops…",
      html: `<p>A correção não está certa! Você perdeu <b>${Math.abs(delta)}</b> pontos.</p>
             <p class="muted">Gostaria de tentar de novo ou prefere uma correção automática (com penalidade)?</p>`,
      buttons: [
        { label: "Tentar de novo", variant:"primary", onClick: () => { modal.close(); openCorrection(tokenEl, target, current.level); } },
        { label: "Correção automática", onClick: () => { modal.close(); applyAuto(tokenEl, target); } }
      ],
      dismissible: false
    });
    // bloqueia para evitar errar duas vezes no mesmo token
    tokenEl.classList.add("wrong","blocked");
  }

  function applyAuto(tokenEl, target){
    engine.markFixed(target.id);
    engine.logFix({ kind:"auto", before: target.wrong, after: target.correct, reason: target.reason });
    const delta = engine.penaltyAuto();
    scoreFx.pop(delta, tokenEl);
    tokenEl.textContent = target.correct;
    markToken(target.id, "correct");
    updateHUD(current.level, current.multiplier, current.guided);
  }

  function openHint(){
    if (!current) return;
    const nextTarget = current.level.targets.find(t => !engine.fixed.has(t.id) && t.correct !== t.wrong);
    const anchor = dom.game.btnHint;
    const delta = engine.penaltyHint();
    scoreFx.pop(delta, anchor);
    if (!nextTarget){
      dom.game.hintBar.textContent = "Você já corrigiu tudo nesta tarefa 🎉";
      dom.game.hintBar.classList.remove("hidden");
      return;
    }
    dom.game.hintBar.innerHTML = `💡 <b>Dica:</b> ${escapeHtml(nextTarget.reason)} <span class="muted">(−${Math.abs(delta)} ponto)</span>`;
    dom.game.hintBar.classList.remove("hidden");
    modal.open({
      title: "💡 Dica",
      html: `<p>${escapeHtml(nextTarget.reason)}</p>
             <p class="muted tiny">Você pode aplicar a correção automaticamente (penalidade crescente).</p>`,
      buttons: [
        { label: "Fechar", onClick: modal.close },
        { label: "Aplicar correção automática", variant:"primary", onClick: () => { modal.close(); applyAuto(idToToken.get(nextTarget.id) || anchor, nextTarget); } }
      ],
      dismissible: false
    });
  }

  function skipLevel(){
    if (!current) return;
    const anchor = dom.game.btnSkip;
    modal.open({
      title: "Avançar sem concluir",
      html: `<p>Deseja avançar sem concluir? Você perderá <b>${Math.abs(SCORE_RULES.skip)}</b> pontos.</p>`,
      buttons: [
        { label: "Cancelar", onClick: modal.close },
        { label: "Avançar", variant:"primary", onClick: () => {
            modal.close();
            const delta = engine.penaltySkip();
            scoreFx.pop(delta, anchor);
            nextLevel();
          }
        }
      ],
      dismissible: false
    });
  }

  async function nextLevel(){
    // concluir tutorial/challenge
    if (mode==="tutorial"){
      if (idx >= tutorialLevels.length-1){
        unlockAfterTutorial();
        showFinal("Tutorial concluído!", "A pontuação do tutorial não entra no ranking.");
        return;
      }
      idx += 1;
      startLevel(tutorialLevels[idx], { multiplier: 0, guided: true });
      return;
    }
    // challenge
    if (idx >= challenges[ch].length-1){
      // marca progresso concluído
      const s = state();
      const prog = { ...s.progress, ["c"+ch]: challenges[ch].length };
      const unlocked = { ...s.unlocked };
      if (ch===1) unlocked.c2 = true;
      if (ch===2) unlocked.c3 = true;
      if (ch===3) unlocked.special = true;
      patch({ progress: prog, unlocked });

      // envia ranking (apenas logado)
      await ranking.submitChallengeScore?.(ch, { score: engine.score, correct: engine.correct, wrong: engine.wrong });

      showFinal("Missão concluída!", "");
      return;
    }
    idx += 1;
    const level = challenges[ch][idx];
    startLevel(level, { multiplier: ch===1?1: ch===2?1.2:1.4, guided:false });
  }

  function showFinal(title, extra){
    show(dom.screens.final);
    dom.final.title.textContent = title;
    dom.final.congrats.textContent = `${auth.getName()}, obrigado por ajudar o Editor‑Chefe! ${extra || ""}`;
    dom.final.quote.textContent = "“Um país se faz com homens e livros.” — Monteiro Lobato";
    dom.final.fixesWrap.classList.add("hidden");
    dom.final.fixesWrap.innerHTML = engine.fixLog.map(x => `
      <div class="fix-item">
        <div>Antes: <b>${escapeHtml(x.before)}</b></div>
        <div>Depois: <b>${escapeHtml(x.after)}</b></div>
        <div class="muted tiny" style="margin-top:6px">${escapeHtml(x.reason||"")}</div>
      </div>
    `).join("") || '<p class="muted">Nenhuma correção registrada.</p>';

    dom.final.btnNextMission.textContent = "Próxima tarefa";
  }

  function toggleFixes(){
    dom.final.fixesWrap.classList.toggle("hidden");
  }

  // bindings
  dom.gate.btnTutorial.addEventListener("click", () => startTutorial(0));
  dom.gate.btnC1.addEventListener("click", () => startChallenge(1));
  dom.gate.btnC2.addEventListener("click", () => auth.isLoggedIn() ? startChallenge(2) : modal.open({ title:"Desafio bloqueado", html:"<p>Desafio bloqueado. Crie uma conta e cumpra as tarefas anteriores para participar das demais.</p>", dismissible:true }));
  dom.gate.btnC3.addEventListener("click", () => auth.isLoggedIn() ? startChallenge(3) : modal.open({ title:"Desafio bloqueado", html:"<p>Desafio bloqueado. Crie uma conta e cumpra as tarefas anteriores para participar das demais.</p>", dismissible:true }));
  dom.gate.btnSpecial.addEventListener("click", () => modal.open({ title:"Missão especial", html:"<p>Em breve — mensagem natalina emocionante 🎁</p>", dismissible:true }));

  dom.game.btnHint.addEventListener("click", openHint);
  dom.game.btnSkip.addEventListener("click", skipLevel);
  dom.game.btnNext.addEventListener("click", () => nextLevel());

  dom.final.toggleFixes.addEventListener("click", toggleFixes);
  dom.final.btnHome.addEventListener("click", () => { show(dom.screens.gate); refreshGate(); });
  dom.final.btnOpenRanking.addEventListener("click", () => ranking.open?.());
  dom.final.btnNextMission.addEventListener("click", () => { show(dom.screens.gate); refreshGate(); });

  return { refreshGate, startTutorial, startChallenge };
}