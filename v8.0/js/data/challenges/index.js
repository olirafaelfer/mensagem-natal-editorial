// js/data/challenges/index.js
// Compatível com níveis que possuem `rules` embutidas (default export)
// e também com versões antigas que exportavam `RULES`.

import c11, * as m11 from "./challenge1-1.js";
import c12, * as m12 from "./challenge1-2.js";
import c13, * as m13 from "./challenge1-3.js";

import c21, * as m21 from "./challenge2-1.js";
import c22, * as m22 from "./challenge2-2.js";
import c23, * as m23 from "./challenge2-3.js";

import c31, * as m31 from "./challenge3-1.js";
import c32, * as m32 from "./challenge3-2.js";
import c33, * as m33 from "./challenge3-3.js";

function pickRules(level, mod){
  return mod?.RULES || level?.rules || [];
}

function attachRules(level, mod){
  return { ...level, rules: pickRules(level, mod) };
}

export function getChallengeLevels(ch){
  if (ch === 1) return [attachRules(c11,m11), attachRules(c12,m12), attachRules(c13,m13)];
  if (ch === 2) return [attachRules(c21,m21), attachRules(c22,m22), attachRules(c23,m23)];
  if (ch === 3) return [attachRules(c31,m31), attachRules(c32,m32), attachRules(c33,m33)];
  return [];
}
