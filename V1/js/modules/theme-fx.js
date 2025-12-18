// V1/js/modules/theme-fx.js
export function initTheme(){
  const btn = document.getElementById("btnTheme");
  if(!btn) return;

  const apply = (t)=>{
    document.documentElement.dataset.theme = t;
    localStorage.setItem("theme", t);
  };

  const saved = localStorage.getItem("theme");
  if(saved) apply(saved);

  btn.addEventListener("click", ()=>{
    const next = (document.documentElement.dataset.theme === "light") ? "dark" : "light";
    apply(next);
  });
}
