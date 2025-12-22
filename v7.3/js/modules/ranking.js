// ranking.js - syntax safe patch v7.3.2
const AVATAR_UID_PREFIX = 'avatarDataUid:';
const AVATAR_EMAIL_PREFIX = 'avatarDataEmail:';

function getLocalAvatarByUid(uid){
  try{ return uid ? (localStorage.getItem(`${AVATAR_UID_PREFIX}${uid}`) || '') : ''; } catch { return ''; }
}
function getLocalAvatarByEmailHash(emailHash){
  try{ return emailHash ? (localStorage.getItem(`${AVATAR_EMAIL_PREFIX}${emailHash}`) || '') : ''; } catch { return ''; }
}

export function initRankingUI(){
  const btn = document.getElementById('rankingBtn');
  if(!btn){ console.warn('[ranking] botão #rankingBtn não encontrado'); return; }
  btn.addEventListener('click', () => {
    // delegate to existing modal opener if present
    if (typeof window.openRankingModal === 'function') {
      window.openRankingModal();
      return;
    }
    // fallback: try to click any existing ranking open trigger
    const modal = document.getElementById('rankingModal');
    if(modal){
      modal.style.display = 'block';
      return;
    }
    console.warn('[ranking] nenhum modal/painel de ranking encontrado (esperado openRankingModal ou #rankingModal)');
  });
}

// Expose helpers so other modules can sync avatar without importing private funcs
export function getLocalAvatarForRow({uid, emailHash} = {}){
  return getLocalAvatarByUid(uid) || getLocalAvatarByEmailHash(emailHash) || '';
}
