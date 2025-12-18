// modules/auth.js
// Auth module (ESM) — SEM imports "firebase/auth" (usa CDN)

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

import { auth } from "./firebase-init.js";

// Pequenas utilidades
function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}
function isValidEmail(email) {
  const e = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

let _onUserChanged = null;

/**
 * Permite ao app registrar callback de mudança de usuário.
 * @param {(user: import('firebase/auth').User|null) => void} cb
 */
export function onUserChanged(cb) {
  _onUserChanged = typeof cb === "function" ? cb : null;
}

export function initAuthWatch() {
  onAuthStateChanged(auth, (user) => {
    try { _onUserChanged && _onUserChanged(user || null); } catch (_) {}
  });
}

export async function loginEmail(email, password) {
  const e = normalizeEmail(email);
  if (!isValidEmail(e)) throw new Error("E-mail inválido.");
  if (!password) throw new Error("Senha inválida.");
  return signInWithEmailAndPassword(auth, e, password);
}

export async function signupEmail(email, password) {
  const e = normalizeEmail(email);
  if (!isValidEmail(e)) throw new Error("E-mail inválido.");
  if (!password || password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
  return createUserWithEmailAndPassword(auth, e, password);
}

export async function logout() {
  return signOut(auth);
}

// Botão Google (opcional): não quebra se o provider não estiver habilitado
export async function loginGooglePopup() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export { auth };
