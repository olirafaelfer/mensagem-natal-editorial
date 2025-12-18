// js/ui/snow.js — neve em canvas (leve, responsiva)
// Respeita prefers-reduced-motion.

export function bootSnow(app){
  const canvas = document.getElementById("snowCanvas");
  if (!canvas) return;

  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduce) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  let w=0,h=0,dpr=1;
  const flakes = [];
  const MAX = 90;

  function resize(){
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = canvas.clientWidth = window.innerWidth;
    h = canvas.clientHeight = window.innerHeight;
    canvas.width = Math.floor(w*dpr);
    canvas.height = Math.floor(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function rand(min,max){ return Math.random()*(max-min)+min; }

  function seed(){
    flakes.length = 0;
    const count = Math.min(MAX, Math.floor((w*h)/18000));
    for (let i=0;i<count;i++){
      flakes.push({
        x: rand(0,w),
        y: rand(0,h),
        r: rand(0.8, 2.6),
        vx: rand(-0.25, 0.25),
        vy: rand(0.55, 1.35),
        a: rand(0.25, 0.85)
      });
    }
  }

  let raf=0;
  function tick(){
    ctx.clearRect(0,0,w,h);
    ctx.beginPath();
    for (const f of flakes){
      f.x += f.vx;
      f.y += f.vy;
      if (f.y > h+10){ f.y = -10; f.x = rand(0,w); }
      if (f.x < -10) f.x = w+10;
      if (f.x > w+10) f.x = -10;

      ctx.moveTo(f.x, f.y);
      ctx.arc(f.x, f.y, f.r, 0, Math.PI*2);
    }
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fill();
    raf = requestAnimationFrame(tick);
  }

  function start(){
    resize(); seed();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  window.addEventListener("resize", () => {
    resize(); seed();
  }, { passive:true });

  start();

  // expõe pra debug
  app.fx = app.fx || {};
  app.fx.snow = { start, stop:()=>cancelAnimationFrame(raf) };
}
