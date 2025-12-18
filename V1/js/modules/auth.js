// V1/js/modules/auth.js
import { auth } from "./firebase-init.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

export function isValidEmail(email){
  if (!email) return false;
  const e = String(email).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export async function signup(email, password){
  const e = String(email||"").trim();
  if (!isValidEmail(e)) throw new Error("E-mail inválido.");
  if (!password || String(password).length < 6) throw new Error("Senha deve ter 6+ caracteres.");
  return createUserWithEmailAndPassword(auth, e, password);
}

export async function login(email, password){
  const e = String(email||"").trim();
  if (!isValidEmail(e)) throw new Error("E-mail inválido.");
  return signInWithEmailAndPassword(auth, e, password);
}

export async function logout(){
  return signOut(auth);
}

export async function loginGooglePopup(){
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export function watchAuth(cb){
  return onAuthStateChanged(auth, cb);
}
