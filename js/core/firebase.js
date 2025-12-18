import { FIREBASE_CONFIG } from "../firebase-config.js";

const cfg = (window.FIREBASE_CONFIG || FIREBASE_CONFIG);
if (!cfg){
  console.warn("⚠️ Firebase config não definido. Defina window.FIREBASE_CONFIG no index.html ou edite js/firebase-config.js");
}

const urls = {
  app: "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js",
  auth: "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js",
  fs: "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js",
};

const { initializeApp } = await import(urls.app);
export const firebaseApp = cfg ? initializeApp(cfg) : null;

export const fb = {
  ...(await import(urls.auth)),
  ...(await import(urls.fs)),
};
