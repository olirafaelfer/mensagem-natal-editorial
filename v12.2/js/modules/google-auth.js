// js/modules/google-auth.js — Login com Google (isolado / opcional)
// Este módulo NÃO derruba o app: se falhar, auth.js continua funcionando via email/senha.

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

export function bootGoogleAuth(app){
  const auth = app.firebase?.auth;
  if (!auth) {
    console.warn("[google-auth] auth não disponível");
    return;
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  
async function signInWithGoogle(){
  // 1) tenta popup (melhor UX)
  try{
    return await signInWithPopup(auth, provider);
  }catch(e){
    const code = String(e?.code || "");
    // 2) fallback para redirect (COOP/Popup blockers em alguns hosts/browsers)
    if (code.includes("auth/popup-blocked") || code.includes("auth/popup-closed-by-user") || code.includes("auth/cancelled-popup-request")){
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw e;
  }
}

// Em caso de redirect, o resultado é entregue após recarregar a página
// (não é obrigatório consumir, mas ajuda a completar o fluxo sem erros no console)
getRedirectResult(auth).catch(() => {});

  app.googleAuth = {
    signInWithGoogle
  };

  return app.googleAuth;
}
