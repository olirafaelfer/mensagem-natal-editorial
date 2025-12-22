const openBtn=document.getElementById("openMission");
const CARD_TEXT=`Obrigado por você existir na minha vida. Este não é só um cartão, mas o início de uma corrente de amor e mudança.

Ame quem está ao seu lado, faça uma doação neste natal, ore por quem precisa e o mais importante, sinta isso no seu coração.

Se cada um de nós fizermos só um pouquinho, transformaremos o mundo ao nosso redor.`;
let selected=null,lastPngBlob=null;

openBtn.onclick=async()=>{
 const r=await fetch("missao.html");
 document.body.insertAdjacentHTML("beforeend",await r.text());
 document.getElementById("cardBodyText").textContent=CARD_TEXT;
};

function closeMission(){document.getElementById("missionOverlay")?.remove()}
function goToCard(){document.querySelector(".step-1").classList.add("hidden");document.querySelector(".step-2").classList.remove("hidden")}
function openCustomizer(){document.getElementById("customizer").classList.remove("hidden");init();applyTypography();applyBackground()}
function closeCustomizer(){document.getElementById("customizer").classList.add("hidden")}

function init(){
 if(window._ready) return; window._ready=true;
 const tray=document.getElementById("svgTray");
 getSvgs().forEach(({svg})=>{
  const d=document.createElement("div");d.className="svg-chip";d.draggable=true;d.innerHTML=svg;
  d.ondragstart=e=>e.dataTransfer.setData("text/plain",svg);
  tray.appendChild(d);
 });
 fontSelect.onchange=textColor.oninput=fontSize.oninput=applyTypography;
 bg1.oninput=bg2.oninput=applyBackground;
 canvas.onpointerdown=e=>{if(e.target.id==="canvas") setSel(null)};
}

function applyTypography(){
 textLayer.style.fontFamily=fontSelect.value;
 textLayer.style.color=textColor.value;
 textLayer.style.fontSize=fontSize.value+"px";
 textLayer.textContent=CARD_TEXT;
}
function applyBackground(){canvas.style.background=`linear-gradient(135deg,${bg1.value},${bg2.value})`}
function allowDrop(e){e.preventDefault()}
function dropSvg(e){
 e.preventDefault();const svg=e.dataTransfer.getData("text/plain");if(!svg)return;
 const r=canvas.getBoundingClientRect();
 const x=e.clientX-r.left,y=e.clientY-r.top;
 const w=document.createElement("div");w.className="placed";w.innerHTML=svg;
 w.style.left=x+"px";w.style.top=y+"px";w.dataset.x=x;w.dataset.y=y;w.dataset.s=1;
 w.onpointerdown=ev=>{ev.stopPropagation();setSel(w);
  const sx=ev.clientX,sy=ev.clientY,bx=+w.dataset.x,by=+w.dataset.y;
  w.setPointerCapture(ev.pointerId);
  w.onpointermove=m=>{setPos(w,bx+m.clientX-sx,by+m.clientY-sy)};
  w.onpointerup=()=>{w.onpointermove=null}
 };
 canvas.appendChild(w);setSel(w)
}
function setPos(el,x,y){
 const r=canvas.getBoundingClientRect(),p=12;
 x=Math.max(p,Math.min(x,r.width-p));y=Math.max(p,Math.min(y,r.height-p));
 el.dataset.x=x;el.dataset.y=y;el.style.left=x+"px";el.style.top=y+"px";
}
function setSel(el){selected?.classList.remove("selected");selected=el;selected?.classList.add("selected")}
function nudgeSelected(dx,dy){if(selected)setPos(selected,+selected.dataset.x+dx,+selected.dataset.y+dy)}
function scaleSelected(m){if(selected){let s=Math.max(.5,Math.min(2.2,(+selected.dataset.s||1)*m));selected.dataset.s=s;selected.style.transform=`translate(-50%,-50%) scale(${s})`}}
function removeSelected(){selected?.remove();selected=null}

function shareTextOnly(){
 if(navigator.share) navigator.share({text:CARD_TEXT}).catch(()=>{});
 else window.open(`https://wa.me/?text=${encodeURIComponent(CARD_TEXT)}`,"_blank");
}

async function exportPNG(){
 const svg=await buildSvg();const b=new Blob([svg],{type:"image/svg+xml"});
 const u=URL.createObjectURL(b),img=await new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=u});
 URL.revokeObjectURL(u);
 const c=document.createElement("canvas");c.width=img.width;c.height=img.height;c.getContext("2d").drawImage(img,0,0);
 lastPngBlob=await new Promise(r=>c.toBlob(r,"image/png",1));
 const a=document.createElement("a");a.href=URL.createObjectURL(lastPngBlob);a.download="cartao-natal.png";a.click();
}
async function shareImage(){try{const b=lastPngBlob||await exportPNG();const f=new File([b],"cartao-natal.png",{type:"image/png"});
 if(navigator.share&&navigator.canShare&&navigator.canShare({files:[f]}))return navigator.share({files:[f],text:"Feliz Natal! 🎄"});
}catch(e){} shareTextOnly()}

async function buildSvg(){
 const r=canvas.getBoundingClientRect(),W=1200,H=Math.round(1200*(r.height/r.width)),pad=80;
 const font=fontSelect.value.replace(/"/g,"'"),color=textColor.value,size=+fontSize.value,fontPx=Math.round(size*(W/r.width));
 const lines=CARD_TEXT.split("\\n");
 const text=lines.map((l,i)=>`<text x="${pad}" y="${pad+i*fontPx*1.4}" fill="${color}" font-family="${font}" font-size="${fontPx}">${l.replace(/&/g,"&amp;")}</text>`).join("");
 const items=[...document.querySelectorAll(".placed")].map(el=>{
  const x=+el.dataset.x/r.width*W,y=+el.dataset.y/r.height*H,s=+el.dataset.s||1,sz=160*s;
  return `<g transform="translate(${x-sz/2},${y-sz/2})">${el.innerHTML.replace("<svg","<svg width='"+sz+"' height='"+sz+"'")}</g>`
 }).join("");
 let logo="";
 const lg=document.querySelector(".logo.corner");
 if(lg) try{const d=await fetch(lg.src).then(r=>r.blob()).then(b=>new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(b)}));
 logo=`<image href="${d}" x="${W-360}" y="${H-160}" width="320" height="110" opacity=".95"/>`}catch(e){}
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
 <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
 <stop offset="0" stop-color="${bg1.value}"/><stop offset="1" stop-color="${bg2.value}"/></linearGradient></defs>
 <rect width="100%" height="100%" fill="url(#g)"/>${text}${items}${logo}</svg>`
}

function getSvgs(){
 const c=`fill="none" stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"`;
 return [
  {svg:`<svg viewBox="0 0 128 128"><path ${c} d="M64 10 L36 44 H92 Z"/><path ${c} d="M64 30 L26 72 H102 Z"/><path ${c} d="M64 52 L18 100 H110 Z"/><path ${c} d="M56 100 V118 H72 V100"/><circle cx="64" cy="10" r="6" fill="white"/></svg>`},
  {svg:`<svg viewBox="0 0 128 128"><rect x="18" y="52" width="92" height="62" rx="10" fill="rgba(255,255,255,.12)" stroke="white" stroke-width="8"/><path ${c} d="M18 52 H110"/><path ${c} d="M64 52 V114"/></svg>`},
  {svg:`<svg viewBox="0 0 128 128"><path ${c} d="M64 16 V112"/><path ${c} d="M20 38 L108 90"/><path ${c} d="M108 38 L20 90"/></svg>`}
 ];
}

window.closeMission=closeMission;window.goToCard=goToCard;window.openCustomizer=openCustomizer;window.closeCustomizer=closeCustomizer;
window.allowDrop=allowDrop;window.dropSvg=dropSvg;window.nudgeSelected=nudgeSelected;window.scaleSelected=scaleSelected;
window.removeSelected=removeSelected;window.exportPNG=exportPNG;window.shareImage=shareImage;window.shareTextOnly=shareTextOnly;
