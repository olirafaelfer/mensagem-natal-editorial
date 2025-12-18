export function createStore(){
  const KEY = "mn_v3_state";
  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY) || "{}"); }catch{ return {}; }
  }
  function save(state){
    localStorage.setItem(KEY, JSON.stringify(state || {}));
  }
  function patch(partial){
    const s = load();
    const next = { ...s, ...partial };
    save(next);
    return next;
  }
  function clear(){ localStorage.removeItem(KEY); }
  return { load, save, patch, clear };
}