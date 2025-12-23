// Cartão personalizável (embed do mini-app "cartao")
// Integração mínima: abre em modal via iframe srcdoc para não conflitar com CSS do jogo.

export function bootCard(app){
  const btn = document.getElementById('cardBtn');
  if (!btn) return;
  if (btn.__bound) return;
  btn.__bound = true;

  btn.addEventListener('click', () => {
    const { openModal } = app.modal || {};
    if (!openModal) return;

    // CSS/HTML/JS do app do cartão (copiado do zip do usuário; sem refatorar por enquanto)
    // Observação: usamos parent.location para resolver assets (logo) dentro do iframe.
    const css = CARD_CSS;
    const js = CARD_JS;
    const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#0b0f1a" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Poppins:wght@400;600;800&family=Nunito:wght@400;700;900&family=Montserrat:wght@400;600;800&family=DM+Sans:wght@400;600;800&family=Playfair+Display:wght@400;600;800&family=Merriweather:wght@300;400;700&family=Pacifico&family=Great+Vibes&display=swap" rel="stylesheet" />
  <style>${escapeForHtml(css)}</style>
</head>
<body>
  <main class="page">
    <header class="hero">
      <div class="hero__inner">
        <div class="hero__badge">✨ Cartão moderno • leve • compartilhável</div>
        <h1>Cartão de Natal</h1>
        <p>Escolha um texto pronto, um tema bonito e adicione enfeites em SVG. Depois, exporte em PNG ou compartilhe um link.</p>
        <div class="hero__actions">
          <button id="btnOpen" class="btn btn--primary">Criar cartão</button>
          <button id="btnOpenFromUrl" class="btn btn--ghost" title="Carrega um cartão a partir de um link (hash)">Carregar do link</button>
        </div>
      </div>
    </header>
    <section class="tips">
      <div class="tip">📱 Mobile-first e responsivo</div>
      <div class="tip">🎨 Temas, fundos e padrões</div>
      <div class="tip">🔗 Link com o cartão pronto</div>
    </section>
  </main>

  <!-- Modal interno do app do cartão -->
  <div id="modal" class="modal hidden" role="dialog" aria-modal="true" aria-label="Editor do cartão">
    <div class="modal__scrim" data-close></div>
    <div class="modal__panel" role="document">
      <div class="modal__topbar">
        <div class="modal__title">Editor</div>
        <div class="modal__topbarActions">
          <button class="iconBtn" id="btnShareLink" title="Compartilhar link">🔗</button>
          <button class="iconBtn" data-close title="Fechar">✖</button>
        </div>
      </div>

      <div class="workspace">
        <div class="previewWrap">
          <div class="cardFrame">
            <div id="card" class="card" aria-label="Prévia do cartão">
              <img id="cardLogo" class="card__logo hidden" src="" alt="Logo" />
              <div id="cardMessage" class="card__message"></div>
              <div id="stickerLayer" class="card__stickers" aria-hidden="true"></div>
            </div>
          </div>

          <div class="quickActions">
            <button id="btnExport" class="btn btn--primary">🖼 Exportar PNG</button>
            <button id="btnShareImg" class="btn btn--secondary">📲 Compartilhar imagem</button>
          </div>
          <p class="hint">Dica: toque no enfeite para selecionar • arraste para mover • use “+ / -” para escala • 🗑 para remover.</p>
        </div>

        <aside class="panel">
          <div class="tabs" role="tablist" aria-label="Configurações">
            <button class="tab is-active" data-tab="texto" role="tab" aria-selected="true">Texto</button>
            <button class="tab" data-tab="tema" role="tab" aria-selected="false">Tema</button>
            <button class="tab" data-tab="enfeites" role="tab" aria-selected="false">Enfeites</button>
          </div>

          <section class="panel__section" data-tab-panel="texto" role="tabpanel">
            <div class="panel__label">Mensagem (fixa)</div>
            <div id="messagePills" class="pills" aria-label="Escolha uma mensagem"></div>
          </section>

          <section class="panel__grid2" data-tab-panel="texto" role="tabpanel">
            <div class="panel__section">
              <div class="panel__label">Fonte</div>
              <select id="selFont" class="select">
                <option value="system">Sistema</option>
                <option value="inter">Inter</option>
                <option value="poppins">Poppins</option>
                <option value="nunito">Nunito</option>
                <option value="montserrat">Montserrat</option>
                <option value="dmsans">DM Sans</option>
                <option value="playfair">Playfair Display</option>
                <option value="merriweather">Merriweather</option>
                <option value="pacifico">Pacifico</option>
                <option value="greatvibes">Great Vibes</option>
                <option value="serif">Serif (clássica)</option>
                <option value="mono">Mono</option>
              </select>
            </div>
            <div class="panel__section">
              <div class="panel__label">Tamanho</div>
              <input id="rngFontSize" type="range" min="12" max="22" value="16" />
            </div>
          </section>

          <section class="panel__grid2" data-tab-panel="tema" role="tabpanel" hidden>
            <div class="panel__section">
              <div class="panel__label">Cor do texto</div>
              <input id="colText" type="color" value="#ffffff" />
            </div>
            <div class="panel__section">
              <div class="panel__label">Logo</div>
              <label class="check">
                <input id="chkLogo" type="checkbox" />
                <span>Mostrar</span>
              </label>
            </div>
          </section>

          <section class="panel__section" data-tab-panel="tema" role="tabpanel" hidden>
            <div class="panel__label">Temas</div>
            <div id="themeGrid" class="themeGrid" aria-label="Escolha um tema"></div>
          </section>

          <section class="panel__section" data-tab-panel="tema" role="tabpanel" hidden>
            <div class="panel__label">Fundo (manual)</div>
            <div class="panel__grid2">
              <input id="colBg1" type="color" value="#0e2a5a" />
              <input id="colBg2" type="color" value="#b5179e" />
            </div>
          </section>

          <section class="panel__section" data-tab-panel="tema" role="tabpanel" hidden>
            <div class="panel__label">Padrão</div>
            <div id="patternPills" class="pills" aria-label="Escolha um padrão"></div>
          </section>

          <section class="panel__section" data-tab-panel="enfeites" role="tabpanel" hidden>
            <div class="panel__label">Enfeites (SVG)</div>
            <div id="stickerTray" class="tray"></div>
          </section>

          <section class="panel__section panel__row" data-tab-panel="enfeites" role="tabpanel" hidden>
            <button id="btnMinus" class="miniBtn" title="Diminuir escala">−</button>
            <button id="btnPlus" class="miniBtn" title="Aumentar escala">+</button>
            <button id="btnDelete" class="miniBtn miniBtn--danger" title="Remover selecionado">🗑</button>
            <span id="selStatus" class="status">Nenhum enfeite selecionado</span>
          </section>
        </aside>
      </div>
    </div>
  </div>

  <script>
    // Força o logo a ser carregado do app principal (mesma origem)
    // e expõe uma variável que o app.js usa.
    window.__CARD_APP_ASSET_BASE__ = (parent && parent.location) ? new URL('.', parent.location.href).href : '';
  </script>
  <script>${escapeForHtml(js)}</script>
</body>
</html>`;

    openModal({
      title: '✉️ Cartão Personalizável',
      bodyHTML: `<div style="height: min(78vh, 720px);">\n`+
        `<iframe title="Cartão" style="width:100%; height:100%; border:0; border-radius:14px; background:rgba(0,0,0,0.25)" sandbox="allow-scripts allow-downloads allow-popups allow-forms" srcdoc="${escapeForAttr(html)}"></iframe>`+
        `</div>`,
      buttons: [ { label:'Fechar', variant:'primary', onClick: () => app.modal.closeModal?.() } ],
      dismissible: true,
    });
  });
}

function escapeForAttr(s){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/"/g,'&quot;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

function escapeForHtml(s){
  // evita fechar tags <script>/<style> no srcdoc
  return String(s)
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<\/style/gi, '<\\/style');
}

// ====== Conteúdo do app do cartão (copiado do zip do usuário) ======
// styles.css
const CARD_CSS = `/* Minimal, mobile-first, no frameworks */
:root{
  --bg:#0b0f1a;
  --panel:#0e1625;
  --panel2:#0b1423;
  --text:#fff;
  --muted:rgba(255,255,255,.78);
  --line:rgba(255,255,255,.12);
  --shadow:0 18px 50px rgba(0,0,0,.55);
  --r:18px;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --ease: cubic-bezier(.2,.8,.2,1);
}
*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;
  background:
    radial-gradient(900px 500px at 15% 0%, rgba(255,255,255,.11), transparent 60%),
    radial-gradient(900px 500px at 85% 10%, rgba(46,196,182,.10), transparent 55%),
    radial-gradient(1200px 700px at 50% 110%, rgba(181,23,158,.10), transparent 60%),
    var(--bg);
  color:var(--text);
  font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
}
button, input, select, textarea{font:inherit;color:inherit}
.page{min-height:100%; display:flex; flex-direction:column}
.hero{padding:44px 16px 18px}
.hero__inner{max-width:980px; margin:0 auto}
.hero__badge{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:8px 12px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.06);
  color:rgba(255,255,255,.86);
  font-weight:700;
  font-size:12px;
  margin-bottom:14px;
}
h1{margin:0 0 6px; font-size:32px; letter-spacing:-.02em}
p{margin:0; color:var(--muted); line-height:1.5}
.hero__actions{display:flex; gap:10px; flex-wrap:wrap; margin-top:16px}
.tips{max-width:980px; margin:0 auto; padding:0 16px 28px; display:grid; gap:10px; grid-template-columns:repeat(3, minmax(0,1fr))}
.tip{background:rgba(255,255,255,.06); border:1px solid var(--line); border-radius:16px; padding:12px 14px; color:rgba(255,255,255,.9)}
@media (max-width:860px){
  .tips{grid-template-columns:1fr}
  h1{font-size:28px}
}

/* Buttons */
.btn{
  border-radius:14px;
  border:1px solid var(--line);
  background:rgba(255,255,255,.08);
  padding:12px 14px;
  cursor:pointer;
  transition:transform .12s var(--ease), filter .12s var(--ease), background .12s var(--ease), border-color .12s var(--ease);
}
.btn:hover{filter:brightness(1.06)}
.btn:active{transform:translateY(1px)}
.btn--primary{
  border:none;
  background:linear-gradient(135deg, #2ec4b6, #88f3e6);
  color:#052019;
  font-weight:850;
}
.btn--secondary{background:rgba(255,255,255,.10)}
.btn--ghost{background:transparent; border:1px dashed rgba(255,255,255,.25)}

/* Modal */
.hidden{display:none !important}
.modal{position:fixed; inset:0; z-index:50; display:grid; place-items:center; padding:14px}
.modal__scrim{position:absolute; inset:0; background:rgba(0,0,0,.72); animation:scrimIn .18s var(--ease)}
.modal__panel{
  position:relative;
  width:min(1120px, 100%);
  max-height:calc(100vh - 28px);
  background:linear-gradient(180deg, rgba(14,22,37,.92), rgba(11,20,35,.92));
  border:1px solid rgba(255,255,255,.10);
  border-radius:var(--r);
  box-shadow:var(--shadow);
  backdrop-filter: blur(14px);
  overflow:hidden;
  display:flex;
  flex-direction:column;
  animation:panelIn .22s var(--ease);
}
.modal__topbar{
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 12px 10px;
  border-bottom:1px solid rgba(255,255,255,.10);
}
.modal__title{font-weight:900; letter-spacing:-.01em}
.modal__topbarActions{display:flex; gap:8px}
.iconBtn{
  border-radius:12px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.08);
  padding:10px 12px;
  cursor:pointer;
  transition:transform .12s var(--ease), filter .12s var(--ease);
}
.iconBtn:hover{filter:brightness(1.08)}
.iconBtn:active{transform:translateY(1px)}

/* Layout */
.workspace{
  display:grid;
  grid-template-columns: 1.1fr .9fr;
  gap:14px;
  padding:14px;
  overflow:auto;
}
@media (max-width:980px){
  .workspace{grid-template-columns:1fr; padding-bottom:calc(14px + var(--safe-bottom))}
}
.previewWrap{display:flex; flex-direction:column; gap:10px}
.cardFrame{
  background:rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.10);
  border-radius:18px;
  padding:12px;
}
.card{
  position:relative;
  width:100%;
  aspect-ratio: 4 / 5;
  border-radius:18px;
  overflow:hidden;
  padding:18px;
  background:linear-gradient(135deg, #0e2a5a, #b5179e);
  display:flex;
  align-items:flex-end;
}
.card::before{
  content:"";
  position:absolute;
  inset:0;
  background-image: var(--pattern, none);
  background-size: 420px 420px;
  background-repeat: repeat;
  opacity: .28;
  mix-blend-mode: overlay;
  pointer-events:none;
}
.card::after{
  content:"";
  position:absolute;
  inset:-2px;
  background: radial-gradient(600px 400px at 15% 20%, rgba(255,255,255,.12), transparent 55%);
  pointer-events:none;
}
.card__logo{
  position:absolute;
  top:12px; left:12px;
  width:58px; height:58px;
  object-fit:contain;
  filter:drop-shadow(0 10px 22px rgba(0,0,0,.35));
}
.card__message{
  position:relative;
  z-index:2;
  white-space:pre-wrap;
  font-size:16px;
  line-height:1.35;
  font-weight:700;
  text-shadow:0 6px 18px rgba(0,0,0,.35);
}
.card__stickers{position:absolute; inset:0; z-index:3}
.quickActions{display:grid; grid-template-columns:1fr 1fr; gap:10px}
@media (max-width:520px){ .quickActions{grid-template-columns:1fr} }
.hint{margin:0; font-size:12px; color:rgba(255,255,255,.70)}

/* Right panel */
.panel{background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.10); border-radius:18px; padding:12px; display:flex; flex-direction:column; gap:12px}

.tabs{
  display:flex;
  gap:8px;
  padding:6px;
  border-radius:16px;
  background:rgba(0,0,0,.22);
  border:1px solid rgba(255,255,255,.10);
}
.tab{
  flex:1;
  border-radius:12px;
  border:1px solid transparent;
  background:transparent;
  padding:10px 10px;
  cursor:pointer;
  font-weight:800;
  color:rgba(255,255,255,.78);
  transition:background .14s var(--ease), transform .14s var(--ease), color .14s var(--ease);
}
.tab.is-active{
  background:rgba(255,255,255,.10);
  color:#fff;
}
.tab:active{transform:translateY(1px)}

.pills{display:flex; flex-wrap:wrap; gap:8px}
.pill{
  border-radius:999px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.06);
  padding:9px 12px;
  cursor:pointer;
  font-weight:750;
  color:rgba(255,255,255,.86);
  transition:transform .12s var(--ease), filter .12s var(--ease), background .12s var(--ease), border-color .12s var(--ease);
}
.pill:hover{filter:brightness(1.06)}
.pill.is-active{border-color:rgba(46,196,182,.65); background:rgba(46,196,182,.14)}
.pill:active{transform:translateY(1px)}

.themeGrid{display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:10px}
@media (max-width:420px){ .themeGrid{grid-template-columns:repeat(3, minmax(0,1fr));} }
.themeBtn{
  border-radius:16px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.06);
  padding:10px;
  cursor:pointer;
  display:flex;
  flex-direction:column;
  gap:8px;
  transition:transform .12s var(--ease), filter .12s var(--ease), border-color .12s var(--ease);
}
.themeBtn:hover{filter:brightness(1.06)}
.themeBtn:active{transform:translateY(1px)}
.themeBtn.is-active{border-color:rgba(46,196,182,.65)}
.themeSwatch{height:38px; border-radius:12px; border:1px solid rgba(255,255,255,.10)}
.themeName{font-size:11px; color:rgba(255,255,255,.86); font-weight:800; line-height:1.1}
.panel__label{font-size:12px; color:rgba(255,255,255,.88); margin-bottom:6px}
.panel__grid2{display:grid; grid-template-columns:1fr 1fr; gap:12px}
.panel__section{min-width:0}
.textarea{
  width:100%;
  border-radius:14px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(0,0,0,.20);
  padding:12px;
  resize:vertical;
  min-height:120px;
}
.select, input[type="color"], input[type="range"]{
  width:100%;
  border-radius:14px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(0,0,0,.20);
  padding:10px 12px;
}
input[type="color"]{height:44px; padding:6px}
.check{display:flex; align-items:center; gap:10px; user-select:none}
.check input{transform:scale(1.1)}
.tray{display:flex; flex-wrap:wrap; gap:10px}
.trayBtn{
  width:54px; height:54px;
  border-radius:16px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.06);
  cursor:pointer;
  display:grid; place-items:center;
}
.trayBtn svg{width:70%; height:70%}
.panel__row{display:flex; align-items:center; gap:8px; flex-wrap:wrap}
.miniBtn{
  border-radius:12px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.08);
  padding:10px 12px;
  cursor:pointer;
}
.miniBtn--danger{border-color:rgba(230,57,70,.45)}
.status{font-size:12px; color:rgba(255,255,255,.75)}

/* Stickers */
.sticker{
  position:absolute;
  width:72px; height:72px;
  transform:translate(-50%,-50%) scale(1);
  touch-action:none;
  user-select:none;
  border-radius:14px;
}
.sticker svg{width:100%; height:100%}
.sticker--selected{outline:2px solid rgba(46,196,182,.95); outline-offset:4px}

@media (prefers-reduced-motion: reduce){
  *{animation:none !important; transition:none !important}
}

@keyframes panelIn{
  from{transform:translateY(10px) scale(.985); opacity:0}
  to{transform:translateY(0) scale(1); opacity:1}
}
@keyframes scrimIn{from{opacity:0} to{opacity:1}}



/* ===== v3: mobile-first sem rolagem + editor direto ===== */
html, body { height: 100%; overflow: hidden; }
.page { height: 100dvh; overflow: hidden; }
.hero { display: none; }

/* Modal ocupa a tela toda (mais app-like) */
.modal { padding: 0; place-items: stretch; }
.modal__scrim { display: none; }
.modal__panel {
  width: 100%;
  height: 100dvh;
  max-height: none;
  border-radius: 0;
  animation: none;
}

/* Workspace sem scroll */
.workspace {
  flex: 1;
  overflow: hidden;
  padding: 12px;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 12px;
  min-height: 0;
}
.previewWrap, .panel { min-height: 0; overflow: hidden; }
.previewWrap { display: flex; flex-direction: column; gap: 10px; }
.cardFrame { flex: 1; min-height: 0; }
.quickActions { margin-top: 0; }
.hint { display: none; }

/* Painel compacto para caber na tela */
.panel { padding: 10px; gap: 10px; }
.panel__section { margin: 0; }
.panel__label { font-size: 12px; opacity: .9; }

/* Grids viram carrosséis horizontais (sem rolagem vertical) */
#messagePills, #themeGrid, #patternPills, #stickerTray {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
#messagePills::-webkit-scrollbar,
#themeGrid::-webkit-scrollbar,
#patternPills::-webkit-scrollbar,
#stickerTray::-webkit-scrollbar { display: none; }

/* Tabs e conteúdo: nada de scroll vertical */
[role="tabpanel"] { overflow: hidden; min-height: 0; }
.panel__grid2 { overflow: hidden; }

/* Mobile: preview em cima, controles embaixo */
@media (max-width: 860px){
  .workspace { grid-template-columns: 1fr; grid-template-rows: minmax(0, 56vh) minmax(0, 44vh); }
  .quickActions { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 520px){
  .workspace { grid-template-rows: minmax(0, 58vh) minmax(0, 42vh); }
  .quickActions { grid-template-columns: 1fr; }
  .tabs { position: sticky; top: 0; z-index: 2; }
}

/* Enfeites: botões mais vivos */
.trayBtn{
  border-radius: 16px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
}
.trayBtn:hover{ filter: brightness(1.08); }
`;

// app.js
const CARD_JS = `/* Cartão personalizável + compartilhável (link + imagem)
   - Sem bibliotecas externas
   - Render de PNG via SVG -> Canvas (mais consistente no mobile)
*/
const $ = (sel, root=document) => root.querySelector(sel);

// Mensagens fixas (o usuário escolhe 1 das opções)
// Observação: são frases comuns de cartão, inspiradas em listas públicas e levemente adaptadas.
const MESSAGE_OPTIONS = [
  {
    id: "m1",
    title: "Paz e amor",
    text: "Feliz Natal!\\n\\nQue a paz e o amor preencham o seu coração hoje e em todos os dias do ano. 🎄✨"
  },
  {
    id: "m2",
    title: "Magia do Natal",
    text: "Boas Festas!\\n\\nQue a magia do Natal ilumine sua casa com alegria, união e esperança. ✨"
  },
  {
    id: "m3",
    title: "Gratidão",
    text: "Feliz Natal!\\n\\nQue este tempo seja de gratidão, carinho e momentos simples que viram memórias. 🎁"
  },
  {
    id: "m4",
    title: "Saúde e luz",
    text: "Boas Festas!\\n\\nDesejo um Natal com saúde, luz e sorrisos — e um novo ano cheio de boas notícias. 🕊️"
  },
  {
    id: "m5",
    title: "Presença",
    text: "Feliz Natal!\\n\\nQue o melhor presente seja estar perto de quem importa. Muito amor e boas festas! ❤️"
  }
];

// Temas prontos (mais rápido e mais bonito do que ficar só em 2 inputs de cor)
const THEMES = [
  { id: "t1", name: "Noite Aurora", bg1: "#071626", bg2: "#1b9aaa", text: "#ffffff", pattern: "stars" },
  { id: "t2", name: "Vermelho Clássico", bg1: "#7a0b1a", bg2: "#d62828", text: "#ffffff", pattern: "snow" },
  { id: "t3", name: "Verde Natal", bg1: "#0b3d2e", bg2: "#2a9d8f", text: "#ffffff", pattern: "snow" },
  { id: "t4", name: "Doce Neve", bg1: "#0a2a66", bg2: "#b5179e", text: "#ffffff", pattern: "dots" },
  { id: "t5", name: "Champanhe", bg1: "#2b2d42", bg2: "#f2cc8f", text: "#0b0f1a", pattern: "none" },
  { id: "t6", name: "Candy", bg1: "#2ec4b6", bg2: "#ff6b6b", text: "#0b0f1a", pattern: "dots" },
  { id: "t7", name: "Ametista", bg1: "#240046", bg2: "#7b2cbf", text: "#ffffff", pattern: "stars" },
  { id: "t8", name: "Neve Minimal", bg1: "#111827", bg2: "#334155", text: "#ffffff", pattern: "snow" }
];

const PATTERNS = [
  { id: "none", name: "Sem" },
  { id: "snow", name: "Neve" },
  { id: "stars", name: "Estrelas" },
  { id: "dots", name: "Pontos" },
];

const DEFAULT_STATE = {
  messageId: "m1",
  font: "system",
  fontSize: 16,
  textColor: "#ffffff",
  themeId: "t4",
  bg1: "#0a2a66",
  bg2: "#b5179e",
  patternId: "dots",
  showLogo: false,
  stickers: [] // {id, xPct, yPct, scale}
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));
let selectedStickerId = null;

let logoDataUrl = null;
async function ensureLogoDataUrl(){
  if(logoDataUrl) return logoDataUrl;
  try{
    const r = await fetch(((window.__CARD_APP_ASSET_BASE__||'') + 'asset/logo-natal.png'), { cache: "force-cache" });
    const b = await r.blob();
    logoDataUrl = await blobToDataUrl(b);
    return logoDataUrl;
  }catch(_){
    logoDataUrl = null;
    return null;
  }
}
function blobToDataUrl(blob){
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}


/* ---------- Sticker SVGs (simples, leves) ---------- */
const STICKERS = [
  {
    id: "star",
    label: "Estrela",
    svg: \`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="gStar" x1="0" x2="1">
          <stop offset="0" stop-color="#ffd166"/>
          <stop offset="1" stop-color="#fca311"/>
        </linearGradient>
      </defs>
      <path d="M32 4l7.6 17.6L58 24l-14 12 4.2 18L32 44.8 15.8 54 20 36 6 24l18.4-2.4L32 4z" fill="url(#gStar)"/>
      <path d="M32 9l5.8 13.4L52 24.2l-10.6 9.1 3.2 13.7L32 40.5 19.4 47l3.2-13.7L12 24.2l14.2-1.8L32 9z" fill="rgba(255,255,255,.22)"/>
    </svg>\`
  },
  {
    id: "snow",
    label: "Neve",
    svg: \`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="gSnow" x1="0" x2="1">
          <stop offset="0" stop-color="#a8dadc"/>
          <stop offset="1" stop-color="#48cae4"/>
        </linearGradient>
      </defs>
      <path d="M31 6h2v52h-2zM6 31h52v2H6z" fill="url(#gSnow)"/>
      <path d="M12 12l40 40M52 12L12 52" stroke="url(#gSnow)" stroke-width="4" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="3.2" fill="#e9f8ff"/>
    </svg>\`
  },
  {
    id: "heart",
    label: "Coração",
    svg: \`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="gHeart" x1="0" x2="1">
          <stop offset="0" stop-color="#ff4d6d"/>
          <stop offset="1" stop-color="#ff0a54"/>
        </linearGradient>
      </defs>
      <path d="M32 56S8 41 8 24c0-7 5-12 12-12 5 0 9 3 12 7 3-4 7-7 12-7 7 0 12 5 12 12 0 17-24 32-24 32z" fill="url(#gHeart)"/>
      <path d="M20 22c2-2 5-3 8-2" stroke="rgba(255,255,255,.55)" stroke-width="3" stroke-linecap="round"/>
    </svg>\`
  },
  {
    id: "bell",
    label: "Sino",
    svg: \`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="gBell" x1="0" x2="1">
          <stop offset="0" stop-color="#ffe08a"/>
          <stop offset="1" stop-color="#ffb703"/>
        </linearGradient>
      </defs>
      <path d="M32 6c-8 0-14 6-14 14v11c0 4-2 8-6 11v4h40v-4c-4-3-6-7-6-11V20c0-8-6-14-14-14z" fill="url(#gBell)"/>
      <path d="M26 54a6 6 0 0 0 12 0" stroke="#ffd166" stroke-width="4" stroke-linecap="round"/>
      <circle cx="32" cy="50" r="4" fill="#fb8500"/>
      <path d="M24 12c3 3 13 3 16 0" stroke="rgba(0,0,0,.18)" stroke-width="4" stroke-linecap="round"/>
    </svg>\`
  },
  {
    id: "candy",
    label: "Bengala",
    svg: \`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M38 8c-8 0-14 6-14 14v18c0 8 6 14 14 14s14-6 14-14" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round"/>
      <path d="M38 8c-8 0-14 6-14 14v18c0 8 6 14 14 14s14-6 14-14" fill="none" stroke="#ef233c" stroke-width="6" stroke-linecap="round" stroke-dasharray="8 6"/>
      <path d="M38 8c-8 0-14 6-14 14" fill="none" stroke="#2a9d8f" stroke-width="3" stroke-linecap="round" opacity=".55"/>
    </svg>\`
  },
  {
    id: "gift",
    label: "Presente",
    svg: \`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="gGift" x1="0" x2="1">
          <stop offset="0" stop-color="#7c3aed"/>
          <stop offset="1" stop-color="#22c55e"/>
        </linearGradient>
      </defs>
      <rect x="10" y="26" width="44" height="28" rx="6" fill="rgba(255,255,255,.12)" />
      <rect x="10" y="26" width="44" height="28" rx="6" fill="url(#gGift)" opacity=".35"/>
      <rect x="10" y="22" width="44" height="10" rx="4" fill="#ef233c"/>
      <rect x="30" y="22" width="4" height="32" fill="#ffd166"/>
      <rect x="22" y="26" width="20" height="4" fill="#ffd166" opacity=".9"/>
      <path d="M32 22c-7-9-18-3-8 3M32 22c7-9 18-3 8 3" fill="none" stroke="#ffd166" stroke-width="3" stroke-linecap="round"/>
    </svg>\`
  },
  {
    id: "holly",
    label: "Azevinho",
    svg: \`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M18 38c-5-10 6-19 15-10 9-9 20 0 15 10-3 6-10 10-15 6-5 4-12 0-15-6z" fill="#1b9aaa"/>
      <path d="M18 38c-5-10 6-19 15-10 9-9 20 0 15 10" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="4" stroke-linecap="round"/>
      <circle cx="32" cy="40" r="5" fill="#ef233c"/>
      <circle cx="26" cy="42" r="3" fill="#ff4d6d"/>
      <circle cx="38" cy="42" r="3" fill="#ff4d6d"/>
    </svg>\`
  }
];


function fontFamilyFromKey(k){
  switch(k){
    case "inter": return "'Inter', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
    case "poppins": return "'Poppins', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
    case "nunito": return "'Nunito', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
    case "montserrat": return "'Montserrat', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
    case "dmsans": return "'DM Sans', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
    case "playfair": return "'Playfair Display', ui-serif, Georgia, 'Times New Roman', serif";
    case "merriweather": return "'Merriweather', ui-serif, Georgia, 'Times New Roman', serif";
    case "pacifico": return "'Pacifico', ui-rounded, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
    case "greatvibes": return "'Great Vibes', ui-serif, Georgia, 'Times New Roman', serif";
    case "serif": return "ui-serif, Georgia, 'Times New Roman', serif";
    case "mono": return "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace";
    default: return "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
  }
}


/* ---------- Base64URL helpers ---------- */
function b64urlEncode(str){
  return btoa(unescape(encodeURIComponent(str))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
}
function b64urlDecode(str){
  const pad = str.length % 4 ? '='.repeat(4 - (str.length % 4)) : '';
  const s = (str + pad).replace(/-/g,'+').replace(/_/g,'/');
  return decodeURIComponent(escape(atob(s)));
}

/* ---------- Modal open/close ---------- */
const modal = $("#modal");
const btnOpen = $("#btnOpen");
const btnOpenFromUrl = $("#btnOpenFromUrl");

function openModal(){
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function closeModal(){
  modal.classList.add("hidden");
  document.body.style.overflow = "";
  selectedStickerId = null;
  updateSelectionUI();
}

btnOpen.addEventListener("click", () => { openModal(); });
btnOpenFromUrl.addEventListener("click", () => {
  loadStateFromUrl(true);
  openModal();
});

modal.addEventListener("click", (e) => {
  const t = e.target;
  if(t && t.matches("[data-close]")) closeModal();
});

/* ---------- Bind controls ---------- */
const card = $("#card");
const cardMsg = $("#cardMessage");
const cardLogo = $("#cardLogo");
const stickerLayer = $("#stickerLayer");
const tray = $("#stickerTray");
const messagePills = $("#messagePills");
const themeGrid = $("#themeGrid");
const patternPills = $("#patternPills");
const selFont = $("#selFont");
const rngFontSize = $("#rngFontSize");
const colText = $("#colText");
const colBg1 = $("#colBg1");
const colBg2 = $("#colBg2");
const chkLogo = $("#chkLogo");

const btnExport = $("#btnExport");
const btnShareImg = $("#btnShareImg");
const btnShareLink = $("#btnShareLink");

const btnMinus = $("#btnMinus");
const btnPlus = $("#btnPlus");
const btnDelete = $("#btnDelete");
const selStatus = $("#selStatus");

/* ---------- Rendering ---------- */
function applyState(){
  const msg = MESSAGE_OPTIONS.find(m => m.id === state.messageId) || MESSAGE_OPTIONS[0];
  cardMsg.textContent = msg.text;
  cardMsg.style.fontFamily = fontFamilyFromKey(state.font);
  cardMsg.style.fontSize = \`\${Number(state.fontSize)||16}px\`;
  cardMsg.style.color = state.textColor || "#fff";
  card.style.background = \`linear-gradient(135deg, \${state.bg1}, \${state.bg2})\`;

  // pattern as CSS variable (data-uri svg)
  card.style.setProperty("--pattern", patternCssUrl(state.patternId));

  if(state.showLogo) cardLogo.classList.remove("hidden");
  else cardLogo.classList.add("hidden");

  renderStickers();
}

function renderStickers(){
  stickerLayer.innerHTML = "";
  for(const s of state.stickers){
    const def = STICKERS.find(x => x.id === s.id) || STICKERS[0];
    const el = document.createElement("div");
    el.className = "sticker" + (s._uid === selectedStickerId ? " sticker--selected" : "");
    el.dataset.uid = s._uid;
    el.style.left = \`\${s.xPct}%\`;
    el.style.top = \`\${s.yPct}%\`;
    el.style.transform = \`translate(-50%,-50%) scale(\${s.scale})\`;
    el.innerHTML = def.svg;

    el.addEventListener("pointerdown", onStickerPointerDown);
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      selectSticker(s._uid);
    });

    stickerLayer.appendChild(el);
  }
}

function updateSelectionUI(){
  if(!selectedStickerId){
    selStatus.textContent = "Nenhum enfeite selecionado";
    return;
  }
  const idx = state.stickers.findIndex(x => x._uid === selectedStickerId);
  if(idx === -1){
    selectedStickerId = null;
    selStatus.textContent = "Nenhum enfeite selecionado";
    return;
  }
  selStatus.textContent = \`Enfeite selecionado: \${state.stickers[idx].id}\`;
}

function selectSticker(uid){
  selectedStickerId = uid;
  updateSelectionUI();
  renderStickers();
}

/* click empty area to clear selection */
card.addEventListener("click", () => {
  selectedStickerId = null;
  updateSelectionUI();
  renderStickers();
});

/* ---------- Sticker Tray ---------- */
function buildTray(){
  tray.innerHTML = "";
  for(const s of STICKERS){
    const b = document.createElement("button");
    b.className = "trayBtn";
    b.type = "button";
    b.title = s.label;
    b.innerHTML = s.svg;
    b.addEventListener("click", () => addSticker(s.id));
    tray.appendChild(b);
  }
}

/* ---------- Add / move stickers ---------- */
function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function addSticker(id){
  // center-ish
  state.stickers.push({
    _uid: uid(),
    id,
    xPct: 78,
    yPct: 20,
    scale: 1
  });
  selectSticker(state.stickers[state.stickers.length - 1]._uid);
  persistToUrl();
  applyState();
}

let drag = null;

function onStickerPointerDown(e){
  e.preventDefault();
  e.stopPropagation();
  const uid = e.currentTarget.dataset.uid;
  selectSticker(uid);

  const rect = card.getBoundingClientRect();
  const s = state.stickers.find(x => x._uid === uid);
  if(!s) return;

  drag = {
    uid,
    rect,
    startX: e.clientX,
    startY: e.clientY,
    startXPct: s.xPct,
    startYPct: s.yPct
  };

  e.currentTarget.setPointerCapture(e.pointerId);
}

window.addEventListener("pointermove", (e) => {
  if(!drag) return;
  const s = state.stickers.find(x => x._uid === drag.uid);
  if(!s) return;

  const dx = e.clientX - drag.startX;
  const dy = e.clientY - drag.startY;

  const x = (drag.startXPct/100)*drag.rect.width + dx;
  const y = (drag.startYPct/100)*drag.rect.height + dy;

  s.xPct = clamp((x / drag.rect.width) * 100, 0, 100);
  s.yPct = clamp((y / drag.rect.height) * 100, 0, 100);

  renderStickers();
});

window.addEventListener("pointerup", () => {
  if(!drag) return;
  drag = null;
  persistToUrl();
});

/* ---------- Controls ---------- */
selFont.addEventListener("change", () => {
  state.font = selFont.value;
  persistToUrl();
  applyState();
});
rngFontSize.addEventListener("input", () => {
  state.fontSize = Number(rngFontSize.value);
  persistToUrl();
  applyState();
});
colText.addEventListener("input", () => {
  state.textColor = colText.value;
  state.themeId = "custom";
  persistToUrl();
  buildThemeGrid();
  applyState();
});
colBg1.addEventListener("input", () => {
  state.bg1 = colBg1.value;
  state.themeId = "custom";
  persistToUrl();
  buildThemeGrid();
  applyState();
});
colBg2.addEventListener("input", () => {
  state.bg2 = colBg2.value;
  state.themeId = "custom";
  persistToUrl();
  buildThemeGrid();
  applyState();
});
chkLogo.addEventListener("change", () => {
  state.showLogo = chkLogo.checked;
  persistToUrl();
  applyState();
});

btnMinus.addEventListener("click", () => scaleSelected(0.9));
btnPlus.addEventListener("click", () => scaleSelected(1.1));
btnDelete.addEventListener("click", removeSelected);

function scaleSelected(mult){
  if(!selectedStickerId) return;
  const s = state.stickers.find(x => x._uid === selectedStickerId);
  if(!s) return;
  s.scale = clamp(s.scale * mult, 0.5, 2.5);
  persistToUrl();
  renderStickers();
}
function removeSelected(){
  if(!selectedStickerId) return;
  state.stickers = state.stickers.filter(x => x._uid !== selectedStickerId);
  selectedStickerId = null;
  updateSelectionUI();
  persistToUrl();
  applyState();
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

/* ---------- URL state (shareable link) ---------- */
function persistToUrl(){
  // don't persist runtime-only fields
  const clean = {
    ...state,
    stickers: state.stickers.map(({_uid, ...rest}) => rest) // omit uid; regenerated on load
  };
  const json = JSON.stringify(clean);
  location.hash = "s=" + b64urlEncode(json);
}

function loadStateFromUrl(showToastOnFail=false){
  const h = location.hash || "";
  const m = h.match(/s=([^&]+)/);
  if(!m) return false;

  try{
    const raw = b64urlDecode(m[1]);
    const parsed = JSON.parse(raw);
    state = mergeState(parsed);
    // regenerate uids
    state.stickers = (state.stickers || []).map(s => ({ _uid: uid(), ...s }));
    selectedStickerId = null;
    syncControlsFromState();
    applyState();
    return true;
  }catch(err){
    if(showToastOnFail) alert("Não consegui carregar o estado do link.");
    return false;
  }
}

function mergeState(p){
  const merged = JSON.parse(JSON.stringify(DEFAULT_STATE));
  if(typeof p !== "object" || !p) return merged;

  // message is fixed: accept either messageId or (legacy) message string
  if(typeof p.messageId === "string" && MESSAGE_OPTIONS.some(m => m.id === p.messageId)) merged.messageId = p.messageId;
  merged.font = ["system","serif","mono"].includes(p.font) ? p.font : merged.font;
  merged.fontSize = Number.isFinite(Number(p.fontSize)) ? clamp(Number(p.fontSize), 12, 22) : merged.fontSize;
  merged.textColor = typeof p.textColor === "string" ? p.textColor : merged.textColor;
  merged.bg1 = typeof p.bg1 === "string" ? p.bg1 : merged.bg1;
  merged.bg2 = typeof p.bg2 === "string" ? p.bg2 : merged.bg2;
  merged.themeId = typeof p.themeId === "string" ? p.themeId : merged.themeId;
  merged.patternId = typeof p.patternId === "string" ? p.patternId : merged.patternId;
  merged.showLogo = !!p.showLogo;

  merged.stickers = Array.isArray(p.stickers) ? p.stickers
    .filter(x => x && typeof x === "object")
    .map(x => ({
      id: STICKERS.some(s => s.id === x.id) ? x.id : "star",
      xPct: clamp(Number(x.xPct ?? 50), 0, 100),
      yPct: clamp(Number(x.yPct ?? 50), 0, 100),
      scale: clamp(Number(x.scale ?? 1), 0.5, 2.5)
    })) : [];

  return merged;
}

/* ---------- Share link ---------- */
btnShareLink.addEventListener("click", async () => {
  persistToUrl();
  const url = location.href;

  try{
    if(navigator.share){
      await navigator.share({ title: "Cartão", text: "Abre meu cartão:", url });
      return;
    }
  }catch(_){ /* user canceled */ }

  try{
    await navigator.clipboard.writeText(url);
    alert("Link copiado!");
  }catch(_){
    prompt("Copie o link:", url);
  }
});

/* ---------- Export / Share image ---------- */
btnExport.addEventListener("click", async () => {
  const blob = await renderPngBlob();
  downloadBlob(blob, "cartao.png");
});

btnShareImg.addEventListener("click", async () => {
  const blob = await renderPngBlob();
  const file = new File([blob], "cartao.png", { type: "image/png" });

  if(navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share){
    try{
      await navigator.share({ files: [file], title: "Cartão", text: "Feliz Natal! 🎄" });
      return;
    }catch(_){
      // user canceled
    }
  }

  // fallback: download
  downloadBlob(blob, "cartao.png");
  alert("Seu navegador não permite compartilhar arquivos. Fiz o download do PNG.");
});

function downloadBlob(blob, filename){
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function renderPngBlob(){
  if(state.showLogo) await ensureLogoDataUrl();
  // target export size (good for social)
  const W = 1080;
  const H = 1350;

  const svg = buildCardSvg(W, H);
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  const img = await loadImage(svgUrl);
  URL.revokeObjectURL(svgUrl);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, W, H);

  return await new Promise((res) => canvas.toBlob(res, "image/png", 1));
}

function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function escapeXml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&apos;");
}

function buildCardSvg(W, H){
  const pad = 72;
  const msgMaxW = W - pad*2;
  const fontSize = Number(state.fontSize)||16;

  // scale font for export size (preview uses 16px on ~mobile)
  const scale = W / 420; // rough baseline
  const exportFontSize = Math.round(fontSize * scale);

  const family = fontFamilyFromKey(state.font);
  const fill = state.textColor || "#fff";

  // simple wrapping
  const msg = MESSAGE_OPTIONS.find(m => m.id === state.messageId) || MESSAGE_OPTIONS[0];
  const lines = wrapText(msg.text || "", msgMaxW, exportFontSize);
  const lineH = Math.round(exportFontSize * 1.28);
  const totalTextH = lines.length * lineH;
  const startY = H - pad - totalTextH + Math.round(lineH * 0.1);

  const textSvg = lines.map((ln, i) => {
    const y = startY + i*lineH;
    return \`<tspan x="\${pad}" y="\${y}">\${escapeXml(ln)}</tspan>\`;
  }).join("");

  // stickers
  const stickerGs = (state.stickers || []).map((s) => {
    const def = STICKERS.find(x => x.id === s.id) || STICKERS[0];
    // position in px
    const x = (s.xPct/100) * W;
    const y = (s.yPct/100) * H;
    const size = 160; // base
    const sc = (s.scale || 1) * (W / 1080);
    const tx = x - (size/2)*sc;
    const ty = y - (size/2)*sc;

    // convert currentColor to white-ish; let user customize later if needed
    const svgInner = def.svg.replaceAll("currentColor", "#ffffff");
    return \`<g transform="translate(\${tx},\${ty}) scale(\${sc})">
      \${svgInner.replace("<svg", "<svg width=\\""+size+"\\" height=\\""+size+"\\"" )}
    </g>\`;
  }).join("");

  // logo (optional)
  const logoHref = (state.showLogo && logoDataUrl) ? logoDataUrl : null;
  const logo = logoHref ? \`<image href="\${escapeXml(logoHref)}" x="\${pad-16}" y="\${pad-16}" width="140" height="140" />\` : "";

  const patternDef = buildPatternDef(state.patternId);
  const patternRect = state.patternId && state.patternId !== "none"
    ? \`<rect x="0" y="0" width="\${W}" height="\${H}" rx="60" fill="url(#pat)" opacity="0.28" style="mix-blend-mode:overlay"/>\`
    : "";

  return \`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="\${W}" height="\${H}" viewBox="0 0 \${W} \${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="\${escapeXml(state.bg1)}"/>
      <stop offset="100%" stop-color="\${escapeXml(state.bg2)}"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="rgba(0,0,0,.45)"/>
    </filter>
    \${patternDef}
  </defs>

  <rect x="0" y="0" width="\${W}" height="\${H}" rx="60" fill="url(#bg)"/>

  \${patternRect}

  \${logo}

  <g filter="url(#shadow)">\${stickerGs}</g>

  <text xml:space="preserve" font-family="\${escapeXml(family)}" font-size="\${exportFontSize}" font-weight="800" fill="\${escapeXml(fill)}"
        style="paint-order: stroke; stroke: rgba(0,0,0,.28); stroke-width: 8px;">
    \${textSvg}
  </text>
</svg>\`;
}

/* naive wrap: approximate chars-per-line based on font size.
   (No canvas measurement to keep it simple/fast/offline.)
*/
function wrapText(text, maxWidthPx, fontPx){
  const maxChars = Math.max(10, Math.floor(maxWidthPx / (fontPx * 0.58)));
  const paragraphs = String(text || "").split(/\\n/);

  const lines = [];
  for(const p of paragraphs){
    const words = p.split(/\\s+/).filter(Boolean);
    if(words.length === 0){
      lines.push("");
      continue;
    }
    let line = "";
    for(const w of words){
      const candidate = line ? (line + " " + w) : w;
      if(candidate.length > maxChars){
        if(line) lines.push(line);
        // hard break long word
        if(w.length > maxChars){
          let start = 0;
          while(start < w.length){
            lines.push(w.slice(start, start + maxChars));
            start += maxChars;
          }
          line = "";
        }else{
          line = w;
        }
      }else{
        line = candidate;
      }
    }
    if(line) lines.push(line);
  }

  // avoid too many lines (still keeps message readable)
  return lines.slice(0, 18);
}

/* ---------- Init ---------- */
function syncControlsFromState(){
  // pills grids are synced separately
  selFont.value = state.font;
  rngFontSize.value = String(state.fontSize);
  colText.value = state.textColor;
  colBg1.value = state.bg1;
  colBg2.value = state.bg2;
  chkLogo.checked = !!state.showLogo;
}

/* ---------- Modern UI: tabs / pills / theme grid ---------- */
function initTabs(){
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll("[data-tab-panel]");

  function setTab(id){
    tabs.forEach(t => {
      const on = t.dataset.tab === id;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    panels.forEach(p => {
      const show = p.dataset.tabPanel === id;
      p.hidden = !show;
    });
  }

  tabs.forEach(t => t.addEventListener("click", () => setTab(t.dataset.tab)));
  setTab("texto");
}

function buildMessagePills(){
  messagePills.innerHTML = "";
  for(const m of MESSAGE_OPTIONS){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pill" + (state.messageId === m.id ? " is-active" : "");
    b.textContent = m.title;
    b.addEventListener("click", () => {
      state.messageId = m.id;
      persistToUrl();
      buildMessagePills();
      applyState();
    });
    messagePills.appendChild(b);
  }
}

function buildPatternPills(){
  patternPills.innerHTML = "";
  for(const p of PATTERNS){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pill" + (state.patternId === p.id ? " is-active" : "");
    b.textContent = p.name;
    b.addEventListener("click", () => {
      state.patternId = p.id;
      persistToUrl();
      buildPatternPills();
      applyState();
    });
    patternPills.appendChild(b);
  }
}

function buildThemeGrid(){
  themeGrid.innerHTML = "";
  for(const t of THEMES){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "themeBtn" + (state.themeId === t.id ? " is-active" : "");
    const sw = document.createElement("div");
    sw.className = "themeSwatch";
    sw.style.background = \`linear-gradient(135deg, \${t.bg1}, \${t.bg2})\`;
    const nm = document.createElement("div");
    nm.className = "themeName";
    nm.textContent = t.name;
    b.appendChild(sw);
    b.appendChild(nm);
    b.addEventListener("click", () => {
      state.themeId = t.id;
      state.bg1 = t.bg1;
      state.bg2 = t.bg2;
      state.textColor = t.text;
      state.patternId = t.pattern;
      persistToUrl();
      syncControlsFromState();
      buildThemeGrid();
      buildPatternPills();
      applyState();
    });
    themeGrid.appendChild(b);
  }
}

/* ---------- Patterns (CSS + SVG export) ---------- */
function patternCssUrl(id){
  if(!id || id === "none") return "none";
  const svg = patternSvg(id);
  if(!svg) return "none";
  const encoded = encodeURIComponent(svg)
    .replace(/%0A/g, "")
    .replace(/%20/g, " ");
  return \`url("data:image/svg+xml,\${encoded}")\`;
}

function patternSvg(id){
  // Use tiny SVGs for performance
  if(id === "snow"){
    return \`<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420' viewBox='0 0 420 420'>
      <g fill='rgba(255,255,255,0.75)'>
        <circle cx='60' cy='80' r='2'/><circle cx='120' cy='170' r='1.7'/><circle cx='210' cy='40' r='2.2'/>
        <circle cx='340' cy='110' r='1.8'/><circle cx='300' cy='240' r='2'/><circle cx='90' cy='310' r='2.1'/>
        <circle cx='220' cy='280' r='1.8'/><circle cx='380' cy='320' r='2.2'/><circle cx='150' cy='380' r='1.7'/>
      </g>
    </svg>\`;
  }
  if(id === "stars"){
    return \`<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420' viewBox='0 0 420 420'>
      <g fill='rgba(255,255,255,0.72)'>
        <path d='M60 60l6 14 15 2-11 10 3 15-13-8-13 8 3-15-11-10 15-2z'/>
        <path d='M330 80l5 11 12 2-9 8 2 12-10-6-10 6 2-12-9-8 12-2z'/>
        <path d='M240 300l6 14 15 2-11 10 3 15-13-8-13 8 3-15-11-10 15-2z'/>
      </g>
    </svg>\`;
  }
  if(id === "dots"){
    return \`<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420' viewBox='0 0 420 420'>
      <g fill='rgba(255,255,255,0.6)'>
        <circle cx='40' cy='60' r='2'/><circle cx='120' cy='90' r='2'/><circle cx='220' cy='70' r='2'/><circle cx='320' cy='100' r='2'/>
        <circle cx='80' cy='180' r='2'/><circle cx='170' cy='210' r='2'/><circle cx='260' cy='190' r='2'/><circle cx='360' cy='220' r='2'/>
        <circle cx='50' cy='300' r='2'/><circle cx='140' cy='330' r='2'/><circle cx='240' cy='310' r='2'/><circle cx='350' cy='340' r='2'/>
      </g>
    </svg>\`;
  }
  return null;
}

function buildPatternDef(id){
  if(!id || id === "none") return "";
  // In SVG export we just embed a pattern tile as an image
  const svg = patternSvg(id);
  if(!svg) return "";
  const b64 = btoa(unescape(encodeURIComponent(svg)));
  return \`<pattern id="pat" patternUnits="userSpaceOnUse" width="420" height="420">
    <image href="data:image/svg+xml;base64,\${b64}" width="420" height="420" />
  </pattern>\`;
}

buildTray();
loadStateFromUrl(false); // if someone opened via shared link
syncControlsFromState();

initTabs();
buildMessagePills();
buildThemeGrid();
buildPatternPills();

applyState();
updateSelectionUI();


// Abrir direto no editor (sem tela inicial)
openModal();
`;
