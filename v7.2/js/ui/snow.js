// js/ui/snow.js — neve em canvas (leve, responsiva)
// - Um único canvas: #snow
// - start/stop real (cancela requestAnimationFrame)
// - Respeita prefers-reduced-motion

export function bootSnow(app){
  const canvas = document.getElementById("snow");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let enabled = true;
  let raf = 0;
  let flakes = [];
  let last = 0;

  function resize(){
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function seed(){
    const rect = canvas.getBoundingClientRect();
    const count = prefersReduced ? 40 : 120;
    flakes = Array.from({length: count}, () => ({
      x: Math.random()*rect.width,
      y: Math.random()*rect.height,
      r: 1 + Math.random()*2.8,
      v: 10 + Math.random()*40,
      d: (Math.random()*2-1)*12
    }));
  }

  function frame(ts){
    if (!enabled) return;
    if (!last) last = ts;
    const dt = Math.min(0.05, (ts-last)/1000);
    last = ts;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0,0,rect.width,rect.height);
    ctx.globalAlpha = 0.85;

    for (const f of flakes){
      f.y += f.v * dt;
      f.x += f.d * dt * 0.2;
      if (f.y > rect.height + 5){ f.y = -5; f.x = Math.random()*rect.width; }
      if (f.x < -10) f.x = rect.width+10;
      if (f.x > rect.width+10) f.x = -10;

      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI*2);
      ctx.fill();
    }

    raf = requestAnimationFrame(frame);
  }

  function start(){
    if (prefersReduced) {
      // reduzido: ainda funciona, só menos partículas (já em seed)
    }
    enabled = true;
    canvas.style.display = "block";
    resize();
    seed();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function stop(){
    enabled = false;
    canvas.style.display = "none";
    cancelAnimationFrame(raf);
    raf = 0;
  }

  window.addEventListener("resize", () => { if (enabled){ resize(); seed(); } });

  // Expor controle para theme-fx
  app.snow = {
    setEnabled(v){
      const on = !!v;
      if (on && !enabled) start();
      if (!on && enabled) stop();
    },
    isEnabled(){ return enabled; }
  };

  // estado inicial via theme storage
  try{
    const theme = JSON.parse(localStorage.getItem("mission_theme") || "null");
    const initial = theme ? !!theme.snow : true;
    if (initial) start(); else stop();
  }catch{
    start();
  }
}
