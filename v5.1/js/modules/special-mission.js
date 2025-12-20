// js/modules/special-mission.js — Missão Especial Avançada (V5.1)
// Objetivo: entregar uma tela final bonita, personalizável e compartilhável
// Obs: Mantemos isolado para não interferir na engine principal.

function wrapText(ctx, text, x, y, maxWidth, lineHeight){
  const words = String(text||'').split(/\s+/);
  let line = '';
  for (let n=0; n<words.length; n++){
    const testLine = line ? (line + ' ' + words[n]) : words[n];
    const w = ctx.measureText(testLine).width;
    if (w > maxWidth && n>0){
      ctx.fillText(line, x, y);
      line = words[n];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineHeight;
}

function pickTheme(theme){
  if (theme === 'noite'){
    return { bg1:'#06162e', bg2:'#0b1020', accent:'#f7c948', snow:true };
  }
  if (theme === 'docinho'){
    return { bg1:'#200b16', bg2:'#0b1020', accent:'#ff6fae', snow:true };
  }
  return { bg1:'#0b1020', bg2:'#13233f', accent:'#e53935', snow:false }; // classico
}

function ensureOverlay(){
  let el = document.getElementById('specialOverlay');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'specialOverlay';
  el.className = 'special-overlay hidden';
  el.innerHTML = `
    <div class="special-shell" role="dialog" aria-modal="true">
      <button class="special-close" id="specialCloseBtn" aria-label="Fechar">✕</button>
      <div class="special-grid">
        <div class="special-left">
          <h2 class="h2">🎁 Missão Especial de Natal</h2>
          <p class="muted">
            Ajude o próximo, pratique a caridade e ame quem está ao seu lado.  
            Monte sua mensagem e compartilhe.
          </p>

          <label class="label">Mensagem</label>
          <textarea id="specialMsg" class="input textarea" rows="6"></textarea>

          <div class="row2">
            <div>
              <label class="label">Tema</label>
              <select id="specialTheme" class="input">
                <option value="classico">Clássico</option>
                <option value="noite">Noite</option>
                <option value="docinho">Docinho</option>
              </select>
            </div>
            <div>
              <label class="label">Assinatura</label>
              <input id="specialSign" class="input" placeholder="Ex.: Com carinho, Rafael"/>
            </div>
          </div>

          <div class="special-actions">
            <button class="btn" id="specialRenderBtn" type="button">Gerar imagem</button>
            <button class="btn ghost" id="specialDownloadBtn" type="button" disabled>Baixar</button>
            <button class="btn ghost" id="specialShareBtn" type="button" disabled>Compartilhar</button>
          </div>

          <div class="muted" id="specialStatus" style="margin-top:10px"></div>
        </div>

        <div class="special-right">
          <div class="special-preview">
            <canvas id="specialCanvas" width="900" height="1200"></canvas>
          </div>
          <div class="muted" style="margin-top:10px">
            Dica: no celular, use “Compartilhar” para enviar no WhatsApp (quando disponível).
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

async function canvasToBlob(canvas){
  return new Promise((resolve) => canvas.toBlob((b)=>resolve(b), 'image/png', 0.92));
}

export function bootSpecialMission(app){
  const { openModal } = app.modal || {};

  function canOpen(){
    const logged = !!app.auth?.isLogged?.();
    const p = app.progress?.load?.() || { mode:'visitor' };
    const c3Done = !!p?.c3?.done;
    return { logged, c3Done, ok: logged && c3Done };
  }

  function openBlocked(){
    const st = canOpen();
    if (!openModal) return;
    if (!st.logged){
      openModal({
        title: '🔒 Missão especial',
        bodyHTML: `<p>Para acessar a missão especial, você precisa <b>entrar</b> (login/cadastro).</p>`,
        buttons: [{ label:'Ok', onClick: app.modal.closeModal }]
      });
      return;
    }
    openModal({
      title: '🔒 Missão especial',
      bodyHTML: `<p>A missão especial só é liberada após concluir o <b>Desafio 3</b>.</p>`,
      buttons: [{ label:'Ok', onClick: app.modal.closeModal }]
    });
  }

  function open(){
    const st = canOpen();
    if (!st.ok) return openBlocked();

    const overlay = ensureOverlay();
    const close = () => overlay.classList.add('hidden');

    const closeBtn = overlay.querySelector('#specialCloseBtn');
    closeBtn.onclick = close;

    // defaults
    const msgEl = overlay.querySelector('#specialMsg');
    const themeEl = overlay.querySelector('#specialTheme');
    const signEl = overlay.querySelector('#specialSign');
    const canvas = overlay.querySelector('#specialCanvas');
    const renderBtn = overlay.querySelector('#specialRenderBtn');
    const dlBtn = overlay.querySelector('#specialDownloadBtn');
    const shBtn = overlay.querySelector('#specialShareBtn');
    const statusEl = overlay.querySelector('#specialStatus');

    const defaultMsg =
`A missão especial de natal é: Ajude o próximo, pratique a caridade, ame quem está do seu lado.
A missão mais importante para este Natal é estender uma mão a quem precisa e perceber que não somos mais nem menos do que qualquer outra pessoa.
Se você cumprir esta missão, pode ter certeza que seu fim de ano estará mais completo.`;

    if (!msgEl.value) msgEl.value = defaultMsg;
    if (!signEl.value){
      const nm = app.user?.getUserName?.() || app.auth?.getDisplayName?.() || '';
      signEl.value = nm ? `Com carinho, ${nm}` : 'Com carinho';
    }

    let lastBlob = null;

    const setStatus = (t) => { if (statusEl) statusEl.textContent = t || ''; };

    const render = async () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const theme = pickTheme(themeEl.value);
      const w = canvas.width, h = canvas.height;

      // background gradient
      const grad = ctx.createLinearGradient(0,0,0,h);
      grad.addColorStop(0, theme.bg1);
      grad.addColorStop(1, theme.bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,w,h);

      // lights
      ctx.globalAlpha = 0.14;
      for (let i=0;i<18;i++){
        const x = (i/18)*w;
        ctx.fillStyle = theme.accent;
        ctx.beginPath();
        ctx.arc(x, 70 + (i%2)*14, 18, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // emojis decorations (simple)
      ctx.font = '64px system-ui, Apple Color Emoji, Segoe UI Emoji';
      ctx.fillText('🎄', 60, 180);
      ctx.fillText('🎅', w-140, 190);
      ctx.fillText('🦌', w-160, 260);
      ctx.fillText('✨', 80, 260);

      // card
      const pad = 70;
      const cardX = pad, cardY = 320;
      const cardW = w - pad*2;
      const cardH = h - cardY - 220;

      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 28);
      ctx.fill();
      ctx.stroke();

      // title
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = 'bold 44px system-ui';
      ctx.fillText('Missão Especial', cardX+40, cardY+80);

      // message text
      ctx.fillStyle = 'rgba(255,255,255,0.90)';
      ctx.font = '30px system-ui';
      const text = msgEl.value || '';
      let y = cardY + 140;
      y = wrapText(ctx, text, cardX+40, y, cardW-80, 44);

      // signature
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.font = 'bold 30px system-ui';
      ctx.fillText(signEl.value || '', cardX+40, cardY + cardH - 60);

      // footer logo text
      ctx.fillStyle = 'rgba(255,255,255,0.60)';
      ctx.font = '24px system-ui';
      ctx.fillText('Missão Editorial de Natal', pad, h-90);
      ctx.fillStyle = theme.accent;
      ctx.fillText('🎄', pad+290, h-92);

      // snow overlay
      if (theme.snow){
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = '#fff';
        for (let i=0;i<240;i++){
          const x = Math.random()*w;
          const y2 = Math.random()*h;
          const r = Math.random()*2.2;
          ctx.beginPath();
          ctx.arc(x,y2,r,0,Math.PI*2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      lastBlob = await canvasToBlob(canvas);
      dlBtn.disabled = !lastBlob;
      shBtn.disabled = !lastBlob;
      setStatus('Imagem gerada ✅');
    };

    renderBtn.onclick = render;

    dlBtn.onclick = async () => {
      if (!lastBlob) return;
      const url = URL.createObjectURL(lastBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'missao-especial.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 1500);
    };

    shBtn.onclick = async () => {
      if (!lastBlob) return;
      try{
        const file = new File([lastBlob], 'missao-especial.png', { type:'image/png' });
        if (navigator.share && (!navigator.canShare || navigator.canShare({ files:[file] }))){
          await navigator.share({ files:[file], title:'Missão Especial de Natal', text:'Minha mensagem de Natal 🎄' });
          setStatus('Compartilhado ✅');
        } else {
          setStatus('Seu navegador não suporta compartilhamento direto. Use “Baixar”.');
        }
      }catch(e){
        console.warn('[special] share falhou', e);
        setStatus('Não foi possível compartilhar. Use “Baixar”.');
      }
    };

    // open
    overlay.classList.remove('hidden');
    // auto render once for visual
    setTimeout(()=>render().catch(()=>{}), 50);
  }

  return { open, openBlocked };
}
