// modules/firebase-init.js
// Centraliza a inicialização do Firebase usando imports via CDN (compatível com GitHub Pages / ESM sem bundler)

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";

// Evita "Firebase App named '[DEFAULT]' already exists"
export const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);

export const auth = getAuth(app);
export const db = getFirestore(app);
