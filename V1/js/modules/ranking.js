// V1/js/modules/ranking.js
// ✅ Sem índices compostos: não filtramos por visible no Firestore.
//    A filtragem é feita no cliente, evitando o erro "query requires an index".
import { db } from "./firebase-init.js";
import {
  doc, getDoc, setDoc, serverTimestamp,
  collection, getDocs, orderBy, query, limit
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

async function sha256Hex(input){
  const enc = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

export async function submitChallengeScore({ user, name, sector, visible=true, challenge=1, score=0, correct=0, wrong=0 }){
  if(!user?.email) return;
  const email = user.email.trim().toLowerCase();
  const emailHash = await sha256Hex(email);

  const ref = doc(db, "rankingByEmail", emailHash);
  const snap = await getDoc(ref);
  const now = serverTimestamp();

  const base = snap.exists() ? snap.data() : {
    emailHash, email, uid: user.uid ?? null,
    name, sector, visible: !!visible,
    d1:{score:0,correct:0,wrong:0,updatedAt:now},
    d2:{score:0,correct:0,wrong:0,updatedAt:now},
    d3:{score:0,correct:0,wrong:0,updatedAt:now},
    overallAvg: 0,
    createdAt: now,
    updatedAt: now
  };

  const key = challenge===1?"d1":challenge===2?"d2":"d3";
  base[key] = { score:Number(score)||0, correct:Number(correct)||0, wrong:Number(wrong)||0, updatedAt: now };
  base.visible = !!visible;
  base.name = name;
  base.sector = sector;
  base.uid = user.uid ?? base.uid ?? null;

  const avg = (Number(base.d1.score||0)+Number(base.d2.score||0)+Number(base.d3.score||0))/3;
  base.overallAvg = avg;
  base.updatedAt = now;

  await setDoc(ref, base, { merge: true });
}

export async function loadRankingTop(){
  const q = query(collection(db,"rankingByEmail"), orderBy("overallAvg","desc"), limit(60));
  const snap = await getDocs(q);
  const rows = [];
  snap.forEach(d=>{
    const v = d.data();
    if(v.visible===false) return;
    rows.push(v);
  });
  return rows;
}
