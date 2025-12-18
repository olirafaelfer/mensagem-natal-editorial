// modules/ranking.js
// Ranking V2 (por emailHash) — imports via CDN (sem índices compostos obrigatórios)

import {
  doc, getDoc, setDoc, updateDoc,
  collection, query, orderBy, limit, getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

import { db } from "./firebase-init.js";

// SHA-256 -> hex (browser)
export async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function submitChallengeScore({ email, uid, name, sector, visible=true, challengeId, score, correct=0, wrong=0 }) {
  if (!email) throw new Error("Sem e-mail para ranking.");
  const emailNorm = (email || "").trim().toLowerCase();
  const emailHash = await sha256Hex(emailNorm);

  const ref = doc(db, "rankingByEmail", emailHash);
  const snap = await getDoc(ref);

  const now = serverTimestamp();
  const key = challengeId === 1 ? "d1" : challengeId === 2 ? "d2" : "d3";

  const patch = {
    emailHash,
    email: emailNorm,
    uid: uid || "",
    name: name || "",
    sector: sector || "",
    visible: visible !== false,
    updatedAt: now,
  };
  patch[key] = { score: Number(score||0), correct: Number(correct||0), wrong: Number(wrong||0), updatedAt: now };

  // overallAvg = média dos 3 desafios (considera 0 se não jogado)
  function calcAvg(docData) {
    const d1 = (docData?.d1?.score ?? 0);
    const d2 = (docData?.d2?.score ?? 0);
    const d3 = (docData?.d3?.score ?? 0);
    return (Number(d1) + Number(d2) + Number(d3)) / 3;
  }

  if (!snap.exists()) {
    const base = {
      ...patch,
      d1: patch.d1 || { score: 0, correct: 0, wrong: 0, updatedAt: now },
      d2: patch.d2 || { score: 0, correct: 0, wrong: 0, updatedAt: now },
      d3: patch.d3 || { score: 0, correct: 0, wrong: 0, updatedAt: now },
      createdAt: now,
    };
    base.overallAvg = calcAvg(base);
    await setDoc(ref, base, { merge: false });
    return { emailHash, overallAvg: base.overallAvg };
  } else {
    const prev = snap.data();
    const merged = { ...prev, ...patch };
    // manter mapas dos outros desafios
    if (!merged.d1) merged.d1 = prev.d1 || { score: 0, correct: 0, wrong: 0, updatedAt: now };
    if (!merged.d2) merged.d2 = prev.d2 || { score: 0, correct: 0, wrong: 0, updatedAt: now };
    if (!merged.d3) merged.d3 = prev.d3 || { score: 0, correct: 0, wrong: 0, updatedAt: now };
    merged.overallAvg = calcAvg(merged);

    await updateDoc(ref, { ...patch, overallAvg: merged.overallAvg });
    return { emailHash, overallAvg: merged.overallAvg };
  }
}

// Lista ranking sem where(visible==true) para evitar índice composto; filtra no client
export async function fetchTopRanking({ top=20 } = {}) {
  const q = query(collection(db, "rankingByEmail"), orderBy("overallAvg", "desc"), limit(Math.max(1, top*3)));
  const snap = await getDocs(q);
  const rows = [];
  snap.forEach(d => {
    const r = d.data();
    if (r && r.visible !== false) rows.push(r);
  });
  return rows.slice(0, top);
}
