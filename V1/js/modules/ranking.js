import { db } from "./firebase-init.js";
import {
  doc, getDoc, setDoc,
  collection, getDocs, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

async function sha256Hex(input){
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

export async function submitChallengeScore({ user, name, sector, challenge, score, correct=0, wrong=0, visible=true }){
  if (!user?.email) return;
  const email = user.email.trim().toLowerCase();
  const emailHash = await sha256Hex(email);
  const ref = doc(db, "rankingByEmail", emailHash);
  const snap = await getDoc(ref);
  const now = new Date();
  const base = snap.exists() ? snap.data() : {
    emailHash, email, uid: user.uid || null, createdAt: now, visible: true,
    name, sector,
    d1:{score:0,correct:0,wrong:0,updatedAt: now},
    d2:{score:0,correct:0,wrong:0,updatedAt: now},
    d3:{score:0,correct:0,wrong:0,updatedAt: now},
    overallAvg: 0,
  };
  const key = challenge===1 ? "d1" : challenge===2 ? "d2" : "d3";
  base.name = name || base.name;
  base.sector = sector || base.sector;
  base.visible = !!visible;
  base.uid = user.uid || base.uid;
  base[key] = { score: Number(score)||0, correct:Number(correct)||0, wrong:Number(wrong)||0, updatedAt: now };
  base.updatedAt = now;
  base.overallAvg = (Number(base.d1.score)+Number(base.d2.score)+Number(base.d3.score))/3;
  await setDoc(ref, base, { merge: true });
}

export async function fetchTopRanking(limitN=50){
  const col = collection(db, "rankingByEmail");
  const q = query(col, orderBy("overallAvg","desc"), limit(limitN));
  const snap = await getDocs(q);
  const rows = [];
  snap.forEach(d=>rows.push({ id:d.id, ...d.data() }));
  return rows.filter(r=>r.visible !== false);
}
