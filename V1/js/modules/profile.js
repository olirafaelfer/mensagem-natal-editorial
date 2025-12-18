// V1/js/modules/profile.js
import { db } from "./firebase-init.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export async function loadUserProfile(uid){
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function upsertUserProfile({ user, name, sector }){
  if(!user?.uid) throw new Error("Usuário não autenticado.");
  const ref = doc(db, "users", user.uid);
  const now = serverTimestamp();
  const payload = {
    uid: user.uid,
    email: user.email ?? "",
    name,
    sector,
    createdAt: now,
    updatedAt: now
  };
  // merge true para atualizar sem apagar
  await setDoc(ref, payload, { merge: true });
  return payload;
}
