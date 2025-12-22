// avatar-firestore.js - persist avatar to rankingByEmail (requires rules allow field 'avatar')
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

export async function persistAvatarToRanking(db, emailHash, avatar){
  if (!db || !emailHash || !avatar) return;
  // Only safe if ranking doc already exists (created by normal flow). With merge it will keep required fields.
  await setDoc(
    doc(db, 'rankingByEmail', emailHash),
    { avatar, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
