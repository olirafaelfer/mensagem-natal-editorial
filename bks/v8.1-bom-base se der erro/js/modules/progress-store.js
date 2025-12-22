// js/modules/progress-store.js
const KEY_PREFIX = "mission_progress_";
const SCHEMA_VERSION = 2;

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
  app.progress = { setActive, load, save, resetToVisitor, defaultProgress };
  return app.progress;
}
