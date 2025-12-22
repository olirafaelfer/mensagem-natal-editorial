// main.js (V7.4.1) - PREBOOT ui-modal BEFORE ANY OTHER MODULE
// NOTE: This file is a conservative orchestrator. It preserves the safeImport/bootAll pattern.
const BUILD_ID = "v7.4.1";

async function safeImport(path){
  try{
    return await import(`${path}?v=${BUILD_ID}`);
  }catch(err){
    console.error(`❌ Falha ao importar ${path} (${path}?v=${BUILD_ID}):`, err);
    throw err;
  }
}

async function bootAll(){
  // 0) Ensure modal is available for everyone (theme-fx, game-core, admin, auth)
  await safeImport("./ui/ui-modal.js");

  // 1) Core app / UI
  const appMod = await safeImport("./app.js").catch(() => null);

  // 2) Theme / effects (may use app.modal)
  await safeImport("./theme-fx.js").catch(() => null);

  // 3) Auth (may use app.modal)
  await safeImport("./modules/auth.js").catch(() => null);

  // 4) Game engine
  const gameMod = await safeImport("./game-core.js").catch(() => null);
  if (gameMod?.bootGame) {
    try { await gameMod.bootGame(); } catch (e) { console.error("[boot] bootGame falhou:", e); }
  }

  // 5) Ranking module
  await safeImport("./modules/ranking.js").catch(() => null);

  // 6) Admin (optional)
  await safeImport("./admin.js").catch(() => null);

  // If app.js exposes something to start UI, call if present:
  if (appMod?.bootApp) {
    try { await appMod.bootApp(); } catch(e) { console.error("[boot] bootApp falhou:", e); }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  bootAll().catch((e) => console.error("❌ Falha no boot dos módulos:", e));
});
