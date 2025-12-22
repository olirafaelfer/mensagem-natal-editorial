// js/modules/ranking.js — Ranking V2 (rankingByEmail) — FIX16
// Objetivos:
// - Nunca crashar a engine
// - Compatível com suas Firestore Rules (rankingByEmail)
// - Visitante NÃO grava
// - Logado SEMPRE grava (visible apenas controla exibição)
// - Ranking Geral = média simples dos 3 desafios (faltante = 0)

export function bootRanking(app){
  const fb = app.firebase;
  if (!fb?.db) {
    console.warn('[ranking] firebase indisponível');
    return { open: () => app.modal?.openModal?.({ title:'Ranking', bodyHTML:'<p>Firebase indisponível.</p>', buttons:[{label:'Ok', onClick: app.modal.closeModal}] }) };
  }

  const getVisiblePref = () => localStorage.getItem('mission_visible_in_ranking') !== '0';
  const setVisiblePref = (v) => localStorage.setItem('mission_visible_in_ranking', v ? '1' : '0');

  async function sha256Hex(text){
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function esc(s){
    return String(s??'').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function emptyD(){
    return { score: -1, correct: 0, wrong: 0, updatedAt: fb.serverTimestamp() };
  }

  // v8.2: avatar é compartilhado via campo `avatar` (dataURL) no rankingByEmail.

  function computeOverall(d1,d2,d3){
    const s1 = Math.max(0, Number(d1?.score ?? 0));
    const s2 = Math.max(0, Number(d2?.score ?? 0));
    const s3 = Math.max(0, Number(d3?.score ?? 0));
    return (s1+s2+s3)/3;
  }

  async function upsertForChallenge(ch, metrics){
    // Visitante nunca grava
    if (!app.auth?.isLogged?.()) return;

    const u = fb.auth.currentUser;
    const email = (u?.email || '').trim().toLowerCase();
    if (!email) return;

    const emailHash = await sha256Hex(email);

    // Foto (compartilhada): vem do perfil (users/{uid}.avatar) e é copiada para o ranking.
    const ref = fb.doc(fb.db, 'rankingByEmail', emailHash);
    const snap = await fb.getDoc(ref);
    const prev = snap.exists() ? (snap.data() || {}) : {};

    const profile = app.auth.getProfile?.();
    const name = (profile?.name || app.user?.getUserName?.() || u.displayName || 'Usuário');
    const sector = (profile?.sector || app.user?.getUserSector?.() || '').trim();
    const avatar = String(profile?.avatar || prev.avatar || '').trim();

    // Rules exigem setor válido
    if (!sector || sector.length < 2) {
      console.warn('[ranking] setor inválido, não gravando ranking');
      return;
    }

    const nowTs = fb.serverTimestamp();

    const normD = (d) => ({
      score: Number(d?.score ?? -1),
      correct: Number(d?.correct ?? 0),
      wrong: Number(d?.wrong ?? 0),
      updatedAt: d?.updatedAt || nowTs,
    });

    const d1 = normD(prev.d1 || emptyD());
    const d2 = normD(prev.d2 || emptyD());
    const d3 = normD(prev.d3 || emptyD());

    const next = {
      score: Number(metrics?.score ?? 0),
      correct: Number(metrics?.correct ?? 0),
      wrong: Number(metrics?.wrong ?? 0),
      updatedAt: nowTs,
    };

    if (ch === 1) Object.assign(d1, next);
    if (ch === 2) Object.assign(d2, next);
    if (ch === 3) Object.assign(d3, next);

    const overallAvg = computeOverall(d1,d2,d3);

    const payload = {
      emailHash,
      email,
      uid: u.uid,
      name: String(name).trim().slice(0,60),
      sector: String(sector).trim().slice(0,120),
      avatar: avatar ? String(avatar).slice(0, 200000) : '',
      visible: getVisiblePref(),
      d1,
      d2,
      d3,
      overallAvg: Number(overallAvg),
      createdAt: (snap.exists() ? (prev.createdAt || nowTs) : nowTs),
      updatedAt: nowTs,
    };

    try {
      await fb.setDoc(ref, payload);
    } catch (e){
      console.error('[ranking] falha ao gravar ranking', e);
      // não crashar
    }
  }

  async function loadTop(kind){
    // kind: 'd1'|'d2'|'d3'|'overall'
    const col = fb.collection(fb.db, 'rankingByEmail');
    // Se não existir índice para d1.score etc, vamos sempre ordenar por overallAvg e ordenar no client.
    const q = fb.query(col, fb.orderBy('overallAvg','desc'), fb.limit(80));
    const snap = await fb.getDocs(q);
    const rows = [];
    snap.forEach(docu => {
      const d = docu.data() || {};
      if (d.visible === false) return;
      rows.push(d);
    });

    const getPts = (d) => {
      if (kind === 'd1') return Number(d?.d1?.score ?? 0);
      if (kind === 'd2') return Number(d?.d2?.score ?? 0);
      if (kind === 'd3') return Number(d?.d3?.score ?? 0);
      return Number(d?.overallAvg ?? 0);
    };

    rows.sort((a,b)=>getPts(b)-getPts(a));
    return rows.slice(0,50);
  }

  async function getMyEntry(){
    if (!app.auth?.isLogged?.()) return null;
    const u = fb.auth.currentUser;
    const email = (u?.email || '').trim().toLowerCase();
    if (!email) return null;
    const emailHash = await sha256Hex(email);
    const ref = fb.doc(fb.db, 'rankingByEmail', emailHash);
    const snap = await fb.getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data();
  }

  function pct(correct, wrong){
    const c = Number(correct||0);
    const w = Number(wrong||0);
    const t = c+w;
    if (!t) return 0;
    return Math.round((c/t)*100);
  }

  function renderTable(rows, kind){
    const getPts = (d) => {
      if (kind === 'd1') return Number(d?.d1?.score ?? 0);
      if (kind === 'd2') return Number(d?.d2?.score ?? 0);
      if (kind === 'd3') return Number(d?.d3?.score ?? 0);
      return Math.round(Number(d?.overallAvg ?? 0));
    };

    function initials(name){
      const parts = String(name||'').trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return '🎅';
      const a = parts[0][0] || '';
      const b = (parts.length>1 ? parts[parts.length-1][0] : '') || '';
      return (a+b).toUpperCase();
    }

    return `
      <div class="rank-list">
        <div class="rank-head">
          <div>#</div><div>Jogador</div><div>Setor</div><div style="text-align:right">Pontos</div>
        </div>
        ${rows.map((d,i)=>{
          const pts = getPts(d);
          const c = Number(d?.d1?.correct||0)+Number(d?.d2?.correct||0)+Number(d?.d3?.correct||0);
          const w = Number(d?.d1?.wrong||0)+Number(d?.d2?.wrong||0)+Number(d?.d3?.wrong||0);
          const medal = (i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1));
          const av = (d && typeof d.avatar === 'string' && d.avatar) ? d.avatar : '';
          const avHtml = av
            ? `<img class="rank-avatar" src="${esc(av)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`
            : `<div class="rank-avatar fallback">${esc(initials(d?.name||''))}</div>`;
          return `
            <div class="rank-row">
              <div>${medal}</div>
              <div class="rank-name">
                ${avHtml}
                <span>${esc(d?.name||'')}</span>
              </div>
              <div class="rank-sector">${esc(d?.sector||'')}</div>
              <div style="text-align:right">${pts}</div>
            </div>`;
        }).join('')}
      </div>`;
  }

  async function open(){
    const selected = { kind: 'overall' };

    const my = await getMyEntry();
    const logged = app.auth?.isLogged?.();
    const visible = getVisiblePref();
    const overallComplete = !!(my && Number(my?.d1?.score ?? -1) >= 0 && Number(my?.d2?.score ?? -1) >= 0 && Number(my?.d3?.score ?? -1) >= 0);

    const header = `
      <div class="rank-tiles">
        <button class="rank-tile" data-kind="d1">Desafio 1</button>
        <button class="rank-tile" data-kind="d2">Desafio 2</button>
        <button class="rank-tile" data-kind="d3">Desafio 3</button>
        <button class="rank-tile" data-kind="overall">Ranking geral <span class="rank-help" title="A média simples dos 3 desafios">❓</span></button>
      </div>
      <div id="rankHint" class="muted" style="margin-top:10px"></div>
      <div id="rankBody" style="margin-top:10px">Carregando...</div>
      <div class="rank-footer" style="margin-top:14px">
        <div class="rank-visible">
          <strong>Participando do ranking:</strong> <span id="rankVisibleValue">${logged ? (visible?'Sim':'Não') : '—'}</span>
          <span class="rank-help" title="Você pode ocultar seu nome no ranking sem perder as pontuações.">❓</span>
        </div>
        <div style="margin-top:8px">
          <button id="rankToggleVisible" class="btn small" ${logged ? '' : 'disabled'}>
            ${visible ? 'Ocultar meu nome' : 'Mostrar meu nome'}
          </button>
          ${logged ? '' : '<div class="muted" style="margin-top:6px">Faça login para aparecer no ranking.</div>'}
        </div>
      </div>
    `;

    app.modal.openModal({
      title: '🏆 Rankings',
      bodyHTML: header,
      buttons: [ { label:'Fechar', variant:'primary', onClick: () => app.modal.closeModal?.() } ]
    });

    const hintEl = document.getElementById('rankHint');
    const bodyEl = document.getElementById('rankBody');

    async function render(kind){
      selected.kind = kind;
      if (!hintEl || !bodyEl) return;
      if (kind === 'overall') {
        if (!overallComplete) {
          hintEl.innerHTML = `❌ <strong>Você só entra no Ranking geral</strong> ao concluir os 3 desafios.`;
        } else {
          hintEl.innerHTML = `✅ <strong>Ranking geral</strong>: média simples dos 3 desafios.`;
        }
      } else {
        hintEl.textContent = '';
      }
      bodyEl.innerHTML = '<div class="muted">Carregando...</div>';
      try {
        const rows = await loadTop(kind);
        bodyEl.innerHTML = renderTable(rows, kind);
      } catch (e){
        console.error('[ranking] loadTop falhou', e);
        bodyEl.innerHTML = '<div class="muted">Falha ao carregar ranking.</div>';
      }
    }

    // initial
    await render('overall');

    // tile clicks
    document.querySelectorAll('.rank-tile').forEach(btn => {
      btn.addEventListener('click', (ev)=>{
        const k = ev.currentTarget.getAttribute('data-kind');
        if (k) render(k);
      });
    });

    // toggle visible
    const toggleBtn = document.getElementById('rankToggleVisible');
    const valueEl = document.getElementById('rankVisibleValue');
    if (toggleBtn){
      toggleBtn.addEventListener('click', async ()=>{
        if (!logged) return;
        const next = !(getVisiblePref());
        setVisiblePref(next);
        if (valueEl) valueEl.textContent = next ? 'Sim' : 'Não';
        toggleBtn.textContent = next ? 'Ocultar meu nome' : 'Mostrar meu nome';
        // Atualiza o doc do ranking para refletir visibilidade
        try {
          const me = await getMyEntry();
          if (me){
            const u = fb.auth.currentUser;
            const emailHash = me.emailHash;
            const ref = fb.doc(fb.db, 'rankingByEmail', emailHash);
            const nowTs = fb.serverTimestamp();
            const payload = {
              emailHash: me.emailHash,
              email: me.email,
              uid: me.uid,
              name: me.name,
              sector: me.sector,
              visible: next,
              d1: me.d1 || emptyD(),
              d2: me.d2 || emptyD(),
              d3: me.d3 || emptyD(),
              overallAvg: Number(me.overallAvg||0),
              createdAt: me.createdAt || nowTs,
              updatedAt: nowTs,
            };
            await fb.setDoc(ref, payload);
          }
        } catch(e){
          console.warn('[ranking] toggle visible falhou', e);
        }
        // re-render
        render(selected.kind);
      });
    }
  }

  // Interface usada pela engine
  app.ranking = {
    open,
    submitChallengeScore: upsertForChallenge,
    // chamado pelo módulo de conta (auth) ao mudar a foto
    setMyAvatar: async (avatar) => {
      try{
        if (!app.auth?.isLogged?.()) return;
        const u = fb.auth.currentUser;
        const email = (u?.email || '').trim().toLowerCase();
        if (!email) return;
        const emailHash = await sha256Hex(email);
        const ref = fb.doc(fb.db, 'rankingByEmail', emailHash);
        await fb.setDoc(ref, { avatar: String(avatar||'').slice(0, 200000), updatedAt: fb.serverTimestamp() }, { merge: true });
      }catch(e){
        console.warn('[ranking] setMyAvatar falhou', e);
      }
    },
    // usado por "Excluir conta" para ocultar (soft) no ranking
    setMyVisibility: async (visible) => {
      if (!app.auth?.isLogged?.()) return;
      try{
        const u = fb.auth.currentUser;
        const email = (u?.email || '').trim().toLowerCase();
        if (!email) return;
        const emailHash = await sha256Hex(email);
        const ref = fb.doc(fb.db, 'rankingByEmail', emailHash);
        const snap = await fb.getDoc(ref);
        const prev = snap.exists()? (snap.data()||{}) : null;
        if (!prev) return;
        const nowTs = fb.serverTimestamp();
        await fb.setDoc(ref, {
          ...prev,
          visible: !!visible,
          updatedAt: nowTs,
        });
      }catch(e){
        console.warn('[ranking] setMyVisibility falhou', e);
      }
    }
  };

  // botão do topo (🏆)
  try{
    app.dom?.rankingBtn?.addEventListener("click", () => open());
  }catch(e){ /* noop */ }

  return app.ranking;
}
