const openBtn=document.getElementById("openMission");
openBtn.onclick=async()=>{const r=await fetch("missao.html");document.body.insertAdjacentHTML("beforeend",await r.text())}
function closeMission(){document.getElementById("missionOverlay").remove()}
function goToCard(){document.querySelector(".step-1").classList.add("hidden");document.querySelector(".step-2").classList.remove("hidden")}
function startCustomization(){document.getElementById("tutorial").classList.remove("hidden");setTimeout(()=>document.getElementById("tutorial").classList.add("hidden"),4000)}
function allowDrop(e){e.preventDefault()}
function drag(e){e.dataTransfer.setData("src",e.target.src)}
function drop(e){e.preventDefault();const img=document.createElement("img");img.src=e.dataTransfer.getData("src");img.style.left=e.offsetX+"px";img.style.top=e.offsetY+"px";e.target.appendChild(img)}
function shareMessage(){
 const extra=document.getElementById("customText").value;
 const base=`Obrigado por você existir na minha vida. Este não é só um cartão, mas o início de uma corrente de amor e mudança.`;
 const text=base+(extra?"\n\n"+extra:"");
 navigator.share?navigator.share({text}):window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank')
}