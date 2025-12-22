const openBtn=document.getElementById("openMission");
openBtn.addEventListener("click",async()=>{const r=await fetch("missao.html");document.body.insertAdjacentHTML("beforeend",await r.text());setupCounter()});
function closeMission(){document.getElementById("missionOverlay").remove()}
function setupCounter(){const t=document.getElementById("missionText"),c=document.getElementById("charCount");t.addEventListener("input",()=>c.textContent=t.value.length)}
function addDecoration(src){const a=document.getElementById("canvasArea"),i=document.createElement("img");i.src=src;i.style.left=Math.random()*70+"%";i.style.top=Math.random()*60+"%";a.appendChild(i)}
function shareMessage(){const t=document.getElementById("missionText").value;if(!t.trim())return alert("Escreva uma mensagem 🎄");navigator.share?navigator.share({text:t}):window.open(`https://wa.me/?text=${encodeURIComponent(t)}`,"_blank")}