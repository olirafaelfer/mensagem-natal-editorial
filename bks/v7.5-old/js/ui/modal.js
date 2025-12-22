// js/ui/modal.js - modal simples (usa #overlay do index.html)
export function closeModal(){
  const ov = document.getElementById('overlay');
  if (ov) ov.classList.add('hidden');
}
export function openModal({title='Mensagem', body='', actions=[]} = {}){
  const ov = document.getElementById('overlay');
  const t = document.getElementById('modalTitle');
  const b = document.getElementById('modalBody');
  const f = document.getElementById('modalFoot');
  if (!ov || !t || !b || !f) return;
  t.textContent = title;
  b.innerHTML = body;
  f.innerHTML = '';
  for (const a of (actions||[])){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn ' + (a.variant==='primary' ? 'primary' : '');
    btn.textContent = a.label || 'OK';
    btn.addEventListener('click', ()=>{ try{ a.onClick?.(); } finally { if (a.autoClose!==false) closeModal(); } });
    f.appendChild(btn);
  }
  // fallback close button
  const x = document.getElementById('closeModal');
  if (x && !x.__wired){
    x.__wired = true;
    x.addEventListener('click', closeModal);
  }
  ov.classList.remove('hidden');
}
