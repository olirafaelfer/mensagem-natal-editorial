// ui-modal.js (V7.4)
// Goal: provide app.modal early and be safe to import multiple times.
(function(){
  if (window.__uiModalBooted) return;
  window.__uiModalBooted = true;

  window.app = window.app || {};

  let overlay = null;

  function ensureModal(){
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'appModal';
    overlay.style.cssText = [
      'position:fixed','inset:0','z-index:9999','display:none',
      'background:rgba(0,0,0,.55)','backdrop-filter: blur(2px)',
      'padding:16px','box-sizing:border-box'
    ].join(';');

    overlay.innerHTML = `
      <div id="appModalBox" style="
        max-width:760px;margin:6vh auto;background:#0b1220;color:#fff;
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
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#appModalClose').addEventListener('click', close);

    return overlay;
  }

  function open(title = 'Detalhes', html = ''){
    const el = ensureModal();
    el.querySelector('#appModalTitle').textContent = title;
    el.querySelector('#appModalBody').innerHTML = html;
    el.style.display = 'block';
  }

  function close(){
    if (!overlay) return;
    overlay.style.display = 'none';
  }

  // Expose in a few shapes because older modules referenced different APIs:
  window.openModal = open;
  window.closeModal = close;

  // Primary API for the app
  window.app.modal = {
    open,
    close,
    ensure: ensureModal,
    isReady: () => true,
  };

  // Delegated handler for "Correções e justificativas"
  document.addEventListener('click', (e) => {
    const t = e.target?.closest?.('[data-open-justifications="1"]');
    if (!t) return;
    const title = t.getAttribute('data-justifications-title') || 'Correções e justificativas';
    const html = t.getAttribute('data-justifications-html') || '<p>Sem detalhes disponíveis.</p>';
    open(title, html);
  });

})();
