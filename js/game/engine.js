export class Engine{
  constructor({ scoreRules }){
    this.rules = scoreRules;
    this.reset();
  }
  reset(){
    this.score = 0;
    this.correct = 0;
    this.wrong = 0;
    this.hintCount = 0;
    this.autoCount = 0;
    this.fixed = new Set();
    this.fixLog = [];
    this.totalToFix = 0;
    this.levelLabel = "";
  }
  loadLevel({ levelLabel, entries }){
    this.levelLabel = levelLabel;
    this.entries = entries;
    this.fixed = new Set();
    this.fixLog = [];
    this.totalToFix = entries.length;
  }
  remaining(){
    return this.totalToFix - this.fixed.size;
  }
  done(){
    return this.remaining() <= 0;
  }
  addScore(delta){
    this.score += delta;
    return delta;
  }
  penaltyWrong(){ this.wrong++; return this.addScore(this.rules.wrong); }
  rewardCorrect(mult=1){ this.correct++; return this.addScore(Math.round(this.rules.correct*mult)); }
  penaltyHint(){ this.hintCount++; return this.addScore(this.rules.hint); }
  penaltySkip(){ return this.addScore(this.rules.skip); }
  penaltyAuto(){
    // penalidade crescente: base -2, -3, -4...
    const p = this.rules.autoBase - this.autoCount;
    this.autoCount += 1;
    return this.addScore(p);
  }
  markFixed(id){
    this.fixed.add(id);
  }
  logFix(entry){
    this.fixLog.push({ at: Date.now(), ...entry });
  }
}