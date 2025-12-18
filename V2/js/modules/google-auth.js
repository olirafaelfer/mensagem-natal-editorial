// js/modules/google-auth.js — Login com Google (isolado para facilitar rollback)
// Se der qualquer problema, basta remover este arquivo e a linha de boot no main.js.

import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

export function bootGoogleAuth(app){
  const auth = app.firebase?.auth;
  if (!auth) return;

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  async function doGoogleLogin(){
    try{
      await signInWithPopup(auth, provider);
      // auth.js já escuta onAuthStateChanged e atualiza perfil
      app.modal?.closeModal?.();
    }catch(e){
      console.warn("[google-auth] falha no login", e);
      app.modal?.openModal?.({
        title: "Google Login",
        bodyHTML: `<p class="muted">Não foi possível entrar com Google agora.</p><p style="font-size:12px" class="muted">${String(e?.message||e)}</p>`,
        buttons: [{ label:"Ok", variant:"ghost", onClick: app.modal?.closeModal }]
      });
    }
  }

  // Integração: auth.js cria botões com data-action="googleLogin"
  document.addEventListener("click", (ev) => {
    const btn = ev.target?.closest?.('[data-action="googleLogin"]');
    if (!btn) return;
    ev.preventDefault();
    doGoogleLogin();
  });
}
