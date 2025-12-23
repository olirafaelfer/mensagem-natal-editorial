// js/modules/progress-store.js
const KEY_PREFIX = "mission_progress_";
const SCHEMA_VERSION = 2;
const RESET_EPOCH_KEY = "mission_resetEpoch";

function toMillis(ts){
  if (!ts) return 0;
  // Firestore timestamp-like {seconds,nanoseconds} ou Date
  if (typeof ts === "number") return ts;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === "object" && typeof ts.seconds === "number") return ts.seconds * 1000;
  return 0;
}

function safeJSONParse(s, fallback){
  try { return JSON.parse(s); } catch { return fallback; }
}
function defaultProgress(){
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: "visitor",
    tutorial: { done:false },
    c1: { done:false, score:0, correct:0, wrong:0, updatedAt:0 },
    c2: { done:false, score:0, correct:0, wrong:0, updatedAt:0 },
    c3: { done:false, score:0, correct:0, wrong:0, updatedAt:0 },
  };
}

function migrateProgress(p){
  // Migra progressos antigos sem quebrar.
  const v = Number(p?.schemaVersion || 0);
  if (v >= SCHEMA_VERSION) return p;
  // v0/v1 -> v2: apenas garante presença de schemaVersion.
  p.schemaVersion = SCHEMA_VERSION;
  return p;
}
export function bootProgress(app){
  let activeKey = KEY_PREFIX + "visitor";
  function setActive(uid){
    activeKey = KEY_PREFIX + (uid || "visitor");
  }
  function load(){
    const raw = localStorage.getItem(activeKey);
    const p = safeJSONParse(raw, null);
    if (!p || typeof p !== "object") return defaultProgress();
    const merged = Object.assign(defaultProgress(), p);
    return migrateProgress(merged);
  }
  function save(p){ try { localStorage.setItem(activeKey, JSON.stringify(p)); } catch {} }
  function resetToVisitor(){ setActive(null); save(defaultProgress()); }
    function clearAllLocal(){
    try{
      const keys = [];
      for (let i=0;i<localStorage.length;i++){
        const k = localStorage.key(i);
        if (k && k.startsWith(KEY_PREFIX)) keys.push(k);
      }
      keys.forEach(k=>localStorage.removeItem(k));
    }catch{}
  }
  function applyResetEpoch(remoteTs){
    const remote = toMillis(remoteTs);
    if (!remote) return false;
    let local = 0;
    try { local = Number(localStorage.getItem(RESET_EPOCH_KEY) || "0") || 0; } catch {}
    if (remote > local){
      clearAllLocal();
      try { localStorage.setItem(RESET_EPOCH_KEY, String(remote)); } catch {}
      return true;
    }
    return false;
  }

  app.progress = { setActive, load, save, resetToVisitor, defaultProgress, clearAllLocal, applyResetEpoch };
  return app.progress;
}