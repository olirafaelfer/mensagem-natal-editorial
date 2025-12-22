// js/modules/google-auth.js — Login com Google (isolado / opcional)
// Este módulo NÃO derruba o app: se falhar, auth.js continua funcionando via email/senha.

import {
  GoogleAuthProvider,
  signInWithPopup,
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
    // Deixa o auth.js lidar com fechar modal via onAuthStateChanged
    return signInWithPopup(auth, provider);
  }

  app.googleAuth = {
    signInWithGoogle
  };

  return app.googleAuth;
}
