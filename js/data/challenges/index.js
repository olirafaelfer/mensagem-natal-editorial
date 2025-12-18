// js/data/challenges/index.js
import c11, { RULES as R11 } from "./challenge1-1.js";
import c12, { RULES as R12 } from "./challenge1-2.js";
import c13, { RULES as R13 } from "./challenge1-3.js";

import c21, { RULES as R21 } from "./challenge2-1.js";
import c22, { RULES as R22 } from "./challenge2-2.js";
import c23, { RULES as R23 } from "./challenge2-3.js";

import c31, { RULES as R31 } from "./challenge3-1.js";
import c32, { RULES as R32 } from "./challenge3-2.js";
import c33, { RULES as R33 } from "./challenge3-3.js";

function attachRules(level, rules){
  return { ...level, rules };
}

export function getChallengeLevels(ch){
  if (ch === 1) return [attachRules(c11,R11), attachRules(c12,R12), attachRules(c13,R13)];
  if (ch === 2) return [attachRules(c21,R21), attachRules(c22,R22), attachRules(c23,R23)];
  if (ch === 3) return [attachRules(c31,R31), attachRules(c32,R32), attachRules(c33,R33)];
  return [];
}
