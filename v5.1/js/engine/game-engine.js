// js/engine/game-engine.js — motor do jogo (sem dependências de Firebase)
export class GameEngine{
  constructor({ scoreRules, onState }){
    this.scoreRules = scoreRules;
    this.onState = onState || (()=>{});
    this.resetAll();
  }

  resetAll(){
    this.challenge = 1;
    this.levels = [];
    this.levelIndex = 0;
    this.score = 0;
    this.correct = 0;
    this.wrong = 0;
    this.hints = 0;
    this.autoUsed = 0;
    this.fixedRuleIds = new Set();
    this.fixLog = [];
    this.currentText = "";
    this.currentRules = [];
    this.misclicks = 0;
  }

  loadChallenge(ch, levels){
    this.challenge = ch;
    this.levels = levels || [];
    this.levelIndex = 0;
    this.score = 0;
    this.correct = 0;
    this.wrong = 0;
    this.hints = 0;
    this.autoUsed = 0;
    this.fixedRuleIds = new Set();
    this.fixLog = [];
    this.currentText = "";
    this.currentRules = [];
    this.misclicks = 0;
    this.onState(this.getState());
  }

  getState(){
    return {
      challenge: this.challenge,
      levelIndex: this.levelIndex,
      level: this.levels[this.levelIndex] || null,
      score: this.score,
      correct: this.correct,
      hints: this.hints,
      autoUsed: this.autoUsed,
      fixedCount: this.fixedRuleIds.size,
      totalFix: this.currentRules.length,
      text: this.currentText
    };
  }

  startLevel(){
    const lvl = this.levels[this.levelIndex];
    if (!lvl) return null;

    this.fixedRuleIds.clear();
    this.currentText = String(lvl.raw || "");
    this.currentRules = (lvl.rules || []).map(r => ({
      ...r,
      wrong: new RegExp(r.wrong, r.flags || "g")
    }));
    this.onState(this.getState());
    return lvl;
  }

  
  logFix(entry){
    if (!entry) return;
    this.fixLog.push({ at: Date.now(), ...entry });
  }
  getFixLog(){
    return Array.from(this.fixLog || []);
  }

isDone(){
    return this.fixedRuleIds.size >= this.currentRules.length;
  }

  addScore(delta){
    this.score += delta;
    this.onState(this.getState());
    return delta;
  }

  penalizeMisclick(){
    this.wrong++;
    this.misclicks += 1;
    return this.addScore(this.scoreRules.wrong);
  }

  useHint(){
    this.hints += 1;
    return this.addScore(this.scoreRules.hint);
  }

  autoCorrect(ruleId){
    const base = this.scoreRules.auto; // negativo
    const penalty = base - this.autoUsed; // -2, -3, -4...
    this.autoUsed += 1;
    this.fixedRuleIds.add(ruleId);
    return this.addScore(penalty);
  }

  applyCorrect(ruleId){
    this.fixedRuleIds.add(ruleId);
    this.correct += 1;
    return this.addScore(this.scoreRules.correct);
  }

  applyWrong(ruleId){
    // Erro NÃO conta como correção concluída.
    this.wrong += 1;
    return this.addScore(this.scoreRules.wrong);
  }

  skipLevel(){
    // avança com penalidade
    this.addScore(this.scoreRules.skip);
    return this.nextLevel();
  }

  nextLevel(){
    this.levelIndex += 1;
    if (this.levelIndex >= this.levels.length){
      return { finishedChallenge: true };
    }
    this.startLevel();
    return { finishedChallenge: false };
  }
}
