import { bootGame } from './game-core.js';

async function safeImport(path) {
  try {
    return await import(path);
  } catch (e) {
    console.error(`❌ Falha ao importar ${path}:`, e);
    return null;
  }
}

async function bootAll() {
  await safeImport('./modules/ranking.js');
  bootGame();
}

bootAll();