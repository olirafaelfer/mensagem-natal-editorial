import { showModal } from "./modules/ui-modal.js";
import * as Auth from "./modules/auth.js";
import * as Ranking from "./modules/ranking.js";
import { initGame } from "./modules/game-core.js";

const root = document.getElementById("appRoot");
const bootMsg = document.getElementById("bootMsg");

function renderHome(user){
  root.innerHTML = `
    <div class="muted">Antes de começar</div>
    <p>Use 👤 para login/criar conta. Visitante pode jogar apenas o Desafio 1.</p>
    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
      <button class="btn primary" id="btnD1">Desafio 1</button>
      <button class="btn" id="btnD2" disabled>Desafio 2</button>
      <button class="btn" id="btnD3" disabled>Desafio 3</button>
    </div>
  `;
  document.getElementById("btnD1").onclick = ()=> {
    showModal({ title:"Iniciar", body:"Iniciando Desafio 1 (placeholder).", actions:[{label:"OK", primary:true}]});
  };
}

function openAuthModal(){
  showModal({
    title:"Conta",
    body:`<div style="display:grid; gap:10px;">
      <input id="em" placeholder="Email" style="padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#0b1226;color:#fff;">
      <input id="pw" placeholder="Senha (mín 6)" type="password" style="padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#0b1226;color:#fff;">
      <div class="muted" style="font-size:12px;">Google (opcional) aparece como opção.</div>
    </div>`,
    actions:[
      {label:"Entrar", primary:true, closeOnClick:false, onClick: async ({close})=>{
        const email=document.getElementById("em").value;
        const pw=document.getElementById("pw").value;
        try{ await Auth.login(email,pw); close(); }catch(e){ alert(e.message||String(e)); }
      }},
      {label:"Criar conta", closeOnClick:false, onClick: async ({close})=>{
        const email=document.getElementById("em").value;
        const pw=document.getElementById("pw").value;
        try{ await Auth.signup(email,pw); close(); }catch(e){ alert(e.message||String(e)); }
      }},
      {label:"Google (popup)", onClick: async ()=>{
        try{ await Auth.loginGooglePopup(); }catch(e){ alert("Google ainda não configurado no Firebase."); }
      }},
      {label:"Fechar"}
    ]
  });
}

document.getElementById("btnProfile").addEventListener("click", openAuthModal);
document.getElementById("btnRanking").addEventListener("click", async ()=>{
  const rows = await Ranking.fetchTopRanking(20).catch(()=>[]);
  showModal({ title:"Ranking", body: rows.length? rows.slice(0,10).map((r,i)=>`${i+1}. ${r.name||r.email} — ${Math.round(r.overallAvg||0)}`).join("<br>"):"Ranking indisponível (ainda).", actions:[{label:"OK", primary:true}] });
});

Auth.watchAuth((user)=>{
  if (bootMsg) bootMsg.remove();
  initGame();
  renderHome(user);
});
