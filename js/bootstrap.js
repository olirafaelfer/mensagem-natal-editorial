import { createModal } from "./core/modal.js";
import { createStore } from "./core/store.js";
import { createScoreFx } from "./core/scorefx.js";
import { createAuth } from "./modules/auth.js";
import { createRanking } from "./modules/ranking.js";
import { createGame } from "./modules/game.js";
import { SECTORS } from "./shared/sectors.js";

const dom = {
  screens: {
    loading: document.getElementById("screenLoading"),
    gate: document.getElementById("screenGate"),
    game: document.getElementById("screenGame"),
    final: document.getElementById("screenFinal"),
  },
  top: {
    btnTheme: document.getElementById("btnTheme"),
    btnRanking: document.getElementById("btnRanking"),
    btnProfile: document.getElementById("btnProfile"),
  },
  gate: {
    name: document.getElementById("gateName"),
    sector: document.getElementById("gateSector"),
    visible: document.getElementById("gateVisible"),
    cont: document.getElementById("gateContinue"),
    btnTutorial: document.getElementById("btnTutorial"),
    btnC1: document.getElementById("btnChallenge1"),
    btnC2: document.getElementById("btnChallenge2"),
    btnC3: document.getElementById("btnChallenge3"),
    btnSpecial: document.getElementById("btnSpecial"),
  },
  game: {
    hudLevel: document.getElementById("hudLevel"),
    hudRemaining: document.getElementById("hudRemaining"),
    hudScore: document.getElementById("hudScore"),
    rulesLine: document.getElementById("rulesLine"),
    messageArea: document.getElementById("messageArea"),
    hintBar: document.getElementById("hintBar"),
    btnHint: document.getElementById("btnHint"),
    btnSkip: document.getElementById("btnSkip"),
    btnNext: document.getElementById("btnNext"),
  },
  final: {
    title: document.getElementById("finalTitle"),
    congrats: document.getElementById("finalCongrats"),
    quote: document.getElementById("finalQuote"),
    toggleFixes: document.getElementById("btnToggleFixes"),
    fixesWrap: document.getElementById("fixesWrap"),
    btnHome: document.getElementById("btnHome"),
    btnOpenRanking: document.getElementById("btnOpenRanking"),
    btnNextMission: document.getElementById("btnNextMission"),
  }
};

function show(screen){
  Object.values(dom.screens).forEach(s => s.classList.add("hidden"));
  screen.classList.remove("hidden");
}

function fillSectors(){
  // idempotente
  dom.gate.sector.innerHTML = '<option value="">Selecione…</option>' + SECTORS.map(s => `<option value="${s}">${s}</option>`).join("");
}

fillSectors();

const modal = createModal(dom);
const store = createStore();
const scoreFx = createScoreFx();

const auth = await createAuth({ dom, modal, store, show });
const ranking = await createRanking({ dom, modal, store, auth, show });
const game = await createGame({ dom, modal, store, auth, ranking, scoreFx, show });

function boot(){
  show(dom.screens.gate);
  game.refreshGate();
}

show(dom.screens.loading);
setTimeout(boot, 250); // garante DOM pronto
