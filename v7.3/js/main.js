// main.js - cachebuster + boot orchestrator v7.3.2
const BUILD_VERSION = 'v7.3.2';

async function safeImport(path){
  try{
    return await import(`${path}?v=${BUILD_VERSION}`);
  }catch(err){
    console.error(`❌ Falha ao importar ${path} (${path}?v=${BUILD_VERSION}):`, err);
    throw err;
  }
}

async function bootAll(){
  // keep existing structure: import modules dynamically so a single failure is visible
  const rankingMod = await safeImport('./modules/ranking.js');
  if(rankingMod?.initRankingUI) rankingMod.initRankingUI();

  // Import remaining modules if your original main.js does; if not, no-op.
  // We do NOT hardcode other imports here to avoid breaking your current structure.
  if (typeof window.__bootRest === 'function') {
    await window.__bootRest(BUILD_VERSION, safeImport);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  bootAll().catch(e => {
    console.error('❌ Falha no boot dos módulos:', e);
  });
});
