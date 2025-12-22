// ui-modal.js (V7.3 patch) - provides openModal/closeModal both as exports and window globals.
let _modalEl = null;

function ensureModal(){
  if (_modalEl) return _modalEl;
  const el = document.createElement('div');
  el.id = 'appModal';
  el.style.cssText = [
    'position:fixed','inset:0','z-index:9999','display:none',
    'background:rgba(0,0,0,.55)','backdrop-filter: blur(2px)',
    'padding:16px','box-sizing:border-box'
  ].join(';');

  el.innerHTML = `
    <div id="appModalBox" style="
      max-width:720px;margin:6vh auto;background:#0b1220;color:#fff;
      border:1px solid rgba(255,255,255,.12);border-radius:14px;
      padding:14px 14px 10px;box-shadow:0 30px 80px rgba(0,0,0,.45);
      ">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div id="appModalTitle" style="font-weight:700;font-size:16px;line-height:1.2"></div>
        <button id="appModalClose" type="button" aria-label="Fechar" style="
          border:0;background:rgba(255,255,255,.08);color:#fff;border-radius:10px;
          padding:6px 10px;cursor:pointer;font-size:14px;">✕</button>
      </div>
      <div id="appModalBody" style="margin-top:10px;font-size:14px;line-height:1.4"></div>
    </div>
  `;
  document.body.appendChild(el);
  el.addEventListener('click', (e) => { if (e.target === el) closeModal(); });
  el.querySelector('#appModalClose').addEventListener('click', closeModal);
  _modalEl = el;
  return el;
}

export function openModal(title = 'Detalhes', html = ''){
  const el = ensureModal();
  el.querySelector('#appModalTitle').textContent = title;
  el.querySelector('#appModalBody').innerHTML = html;
  el.style.display = 'block';
}

export function closeModal(){
  if (!_modalEl) return;
  _modalEl.style.display = 'none';
}

window.openModal = openModal;
window.closeModal = closeModal;

// Delegated handler: any element with data-open-justifications="1" opens modal using data-justifications-html.
document.addEventListener('click', (e) => {
  const t = e.target?.closest?.('[data-open-justifications="1"]');
  if (!t) return;
  const title = t.getAttribute('data-justifications-title') || 'Correções e justificativas';
  const html = t.getAttribute('data-justifications-html') || '<p>Sem detalhes disponíveis.</p>';
  openModal(title, html);
});
