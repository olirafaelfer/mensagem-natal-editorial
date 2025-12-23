// js/modules/chat.js — Chat natalino (módulo paralelo)
// - Botão flutuante (FAB) sempre presente
// - Só abre para quem estiver logado
// - Figurinhas via Emoji -> Twemoji SVG (CDN)
// - Reações 👍 😂 ❤️ (uma reação por usuário por mensagem)

import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const ROOM_ID = "global";
const MAX_TEXT = 280;
const STICKERS = [
  { id: "gift", emoji: "🎁", label: "Presente" },
  { id: "tree", emoji: "🎄", label: "Árvore" },
  { id: "star", emoji: "⭐", label: "Estrela" },
  { id: "reindeer", emoji: "🦌", label: "Rena" },
  { id: "cookie", emoji: "🍪", label: "Biscoito" },
  { id: "santa", emoji: "🎅", label: "Papai Noel" },
  { id: "snow", emoji: "❄️", label: "Neve" },
  { id: "sparkles", emoji: "✨", label: "Brilhos" },
];

const REACTIONS = [
  { id: "like", emoji: "👍" },
  { id: "laugh", emoji: "😂" },
  { id: "heart", emoji: "❤️" },
];

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Converte emoji em codepoint compatível com Twemoji (ex.: "🎄" -> "1f384")
// Baseado na ideia do twemoji (sem depender da lib).
function emojiToCodePoint(unicodeSurrogates) {
  const codePoints = [];
  for (const symbol of Array.from(unicodeSurrogates)) {
    const cp = symbol.codePointAt(0);
    if (cp == null) continue;
    // ignora VS15 (texto). mantém VS16 (emoji) pois alguns precisam (ex.: ❄️ / ❤️)
    if (cp === 0xfe0e) continue;
    codePoints.push(cp.toString(16));
  }
  return codePoints.join("-");
}

function twemojiSvgUrl(emoji) {
  // Alguns emojis com VS16 (FE0F) não existem com sufixo "-fe0f" no pacote SVG do Twemoji.
  // Ex.: ❤️ / ❄️. Mantemos um fallback seguro para não quebrar.
  const OVERRIDE = {
    "❤️": "2764",
    "❄️": "2744"
  };
  let cp = OVERRIDE[emoji] || emojiToCodePoint(emoji);
  if (cp.endsWith("-fe0f")) cp = cp.replace(/-fe0f$/, "");
  // Twemoji via jsDelivr (SVG)
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cp}.svg`;
}

function stickerHTML(emoji, label = "") {
  const url = twemojiSvgUrl(emoji);
  return `<img class="chat-sticker" src="${url}" alt="${esc(label || emoji)}" loading="lazy" referrerpolicy="no-referrer"/>`;
}

function reactionHTML(emoji) {
  const url = twemojiSvgUrl(emoji);
  return `<img class="chat-reaction-emoji" src="${url}" alt="${esc(emoji)}" loading="lazy" referrerpolicy="no-referrer"/>`;
}

function ensureFab() {
  let fab = document.getElementById("chatFab");
  if (fab) return fab;
  fab = document.createElement("button");
  fab.id = "chatFab";
  fab.type = "button";
  fab.className = "chat-fab";
  fab.title = "Chat Natalino";
  fab.innerHTML = `${stickerHTML("💬", "Chat")}`;
  document.body.appendChild(fab);
  return fab;
}

function ensurePanel() {
  let panel = document.getElementById("chatPanel");
  if (panel) return panel;

  panel = document.createElement("div");
  panel.id = "chatPanel";
  panel.className = "chat-panel hidden";
  panel.innerHTML = `
    <div class="chat-head">
      <div class="chat-head-left">
        <div class="chat-title">Chat Natalino</div>
        <div class="chat-sub">Recados rápidos 🎄</div>
      </div>
      <button class="chat-close" type="button" aria-label="Fechar">✕</button>
    </div>

    <div class="chat-body">
      <div class="chat-stream" id="chatStream"></div>
      <div class="chat-stickers" id="chatStickers" aria-label="Figurinhas"></div>
    </div>

    <div class="chat-foot">
      <button class="chat-btn" id="chatStickerBtn" type="button" title="Figurinhas">${stickerHTML("🙂", "Figurinhas")}</button>
      <input class="chat-input" id="chatText" type="text" maxlength="${MAX_TEXT}" placeholder="Escreva um recado…"/>
      <button class="chat-send" id="chatSend" type="button">Enviar</button>
    </div>
  `;
  document.body.appendChild(panel);
  return panel;
}

function renderStickers(container) {
  container.innerHTML = STICKERS.map((s) => {
    return `<button class="chat-sticker-btn" type="button" data-sticker="${esc(s.id)}" title="${esc(s.label)}">
      ${stickerHTML(s.emoji, s.label)}
    </button>`;
  }).join("");
}

function renderMessage(msg, meUid) {
  const isMe = msg?.uid && meUid && msg.uid === meUid;
  const name = msg?.name || "(sem nome)";
  const sector = msg?.sector || "";
  const avatar = msg?.avatar || "";
  const text = (msg?.text || "").trim();
  const sticker = msg?.sticker || "";
  const createdAt = msg?.createdAt?.toDate ? msg.createdAt.toDate() : null;
  const time = createdAt ? createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  const contentHTML = sticker
    ? `<div class="chat-msg-sticker">${stickerHTML(sticker, "Figurinha")}</div>`
    : `<div class="chat-msg-text">${esc(text)}</div>`;

  const reactionsHTML = REACTIONS.map((r) => {
    const count = Number((msg?.reactionCounts || {})[r.id] || 0);
    return `<button class="chat-react" type="button" data-react="${r.id}" title="Reagir">
      ${reactionHTML(r.emoji)}<span class="chat-react-count">${count || ""}</span>
    </button>`;
  }).join("");

  const avatarHTML = avatar
    ? `<button class="chat-avatar-btn" type="button" title="Ver perfil" data-avatar="${esc(avatar)}" data-name="${esc(name)}" data-sector="${esc(sector)}">
         <img class="chat-avatar" src="${esc(avatar)}" alt="Foto de ${esc(name)}" loading="lazy" />
       </button>`
    : `<div class="chat-avatar-placeholder" aria-hidden="true">👤</div>`;

  return `
    <div class="chat-msg ${isMe ? "me" : ""}" data-id="${esc(msg?.id)}">
      <div class="chat-msg-meta">
        <div class="chat-msg-left">
          ${avatarHTML}
          <span class="chat-msg-name">${esc(name)}</span>
        </div>
        <span class="chat-msg-time">${esc(time)}</span>
      </div>
      ${contentHTML}
      <div class="chat-msg-reactions">${reactionsHTML}</div>
    </div>
  `;
}

export function bootChat(app) {
  const db = app.firebase?.db;
  const auth = app.firebase?.auth;
  if (!db || !auth) return;

  const fab = ensureFab();
  const panel = ensurePanel();
  const stream = panel.querySelector("#chatStream");
  const stickerTray = panel.querySelector("#chatStickers");
  const stickerBtn = panel.querySelector("#chatStickerBtn");
  const closeBtn = panel.querySelector(".chat-close");
  const input = panel.querySelector("#chatText");
  const sendBtn = panel.querySelector("#chatSend");

  renderStickers(stickerTray);

  let unsub = null;
  let opened = false;
  let meUid = null;

  function openPanel() {
    panel.classList.remove("hidden");
    panel.classList.add("show");
    opened = true;
    setTimeout(() => input?.focus(), 30);
  }
  function closePanel() {
    panel.classList.remove("show");
    setTimeout(() => panel.classList.add("hidden"), 140);
    opened = false;
    // não mata listener imediatamente — mantém leve; mas podemos desligar se quiser
  }

  function ensureLoggedOrRedirect() {
    const u = app.auth?.getUser?.();
    if (u) return true;
    const { openModal, closeModal } = app.modal || {};
    openModal?.({
      title: "🔒 Chat só para logados",
      bodyHTML: `<p>Para usar o chat natalino, você precisa criar uma conta ou fazer login.</p>`,
      buttons: [
        { label: "Criar conta", variant: "primary", onClick: () => {
            try { closeModal?.(); } catch {}
            // abre o gate direto na aba de cadastro
            app.auth?.openSignup?.() || app.auth?.openGate?.();
          }
        },
        { label: "Cancelar", variant: "ghost", onClick: () => closeModal?.() }
      ],
      dismissible: true,
    });
    return false;
  }

  function subscribe() {
    if (unsub) return;
    const messagesRef = collection(db, "chatRooms", ROOM_ID, "messages");
    const q = query(messagesRef, orderBy("createdAt", "desc"), limit(60));
    unsub = onSnapshot(q, (snap) => {
      // pega uid atual para destacar mensagens próprias
      meUid = app.auth?.getUser?.()?.uid || null;
      const items = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      // render do mais antigo para o mais novo
      items.reverse();
      stream.innerHTML = items.map((m) => renderMessage(m, meUid)).join("");
      // auto-scroll para baixo quando aberto
      if (opened) stream.scrollTop = stream.scrollHeight;
    });
  }

  async function sendTextOrSticker({ text, sticker }) {
    const u = app.auth?.getUser?.();
    const profile = app.auth?.getProfile?.();
    if (!u) throw new Error("not-auth");

    const t = String(text || "").trim();
    const s = String(sticker || "").trim();
    if (!t && !s) return;
    if (t && t.length > MAX_TEXT) return;

    const messagesRef = collection(db, "chatRooms", ROOM_ID, "messages");
    await addDoc(messagesRef, {
      uid: u.uid,
      name: profile?.name || u.displayName || "Usuário",
      sector: profile?.sector || "",
      avatar: profile?.avatar || "",
      text: s ? "" : t,
      sticker: s || "",
      reactionCounts: { like: 0, laugh: 0, heart: 0 },
      createdAt: serverTimestamp(),
    });
  }

  async function toggleReaction(messageId, type) {
    const u = app.auth?.getUser?.();
    if (!u) throw new Error("not-auth");
    const msgRef = doc(db, "chatRooms", ROOM_ID, "messages", messageId);
    const reactRef = doc(db, "chatRooms", ROOM_ID, "messages", messageId, "reactions", u.uid);

    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return;
    const msg = msgSnap.data();
    const counts = { ...(msg.reactionCounts || {}) };
    REACTIONS.forEach((r) => { if (counts[r.id] == null) counts[r.id] = 0; });

    const prev = await getDoc(reactRef);
    const prevType = prev.exists() ? prev.data()?.type : null;

    // remove anterior
    if (prevType && counts[prevType] > 0) counts[prevType] = Math.max(0, counts[prevType] - 1);

    if (prevType === type) {
      // toggle off
      await deleteDoc(reactRef);
    } else {
      // set new
      counts[type] = Number(counts[type] || 0) + 1;
      await setDoc(reactRef, { type, createdAt: serverTimestamp() });
    }
    // update counts no doc da mensagem (simples; para alta concorrência dá pra migrar para transação)
    await setDoc(msgRef, { reactionCounts: counts }, { merge: true });
  }

  // (sem listener global) — meUid é lido no momento do render/subscribe

  fab.addEventListener("click", () => {
    if (!ensureLoggedOrRedirect()) return;
    subscribe();
    openPanel();
  });

  closeBtn.addEventListener("click", () => closePanel());

  stickerBtn.addEventListener("click", () => {
    stickerTray.classList.toggle("show");
  });

  stickerTray.addEventListener("click", async (ev) => {
    const btn = ev.target?.closest?.("[data-sticker]");
    if (!btn) return;
    if (!ensureLoggedOrRedirect()) return;
    const id = btn.getAttribute("data-sticker");
    const st = STICKERS.find((s) => s.id === id);
    if (!st) return;
    try {
      await sendTextOrSticker({ sticker: st.emoji });
      stickerTray.classList.remove("show");
      if (opened) stream.scrollTop = stream.scrollHeight;
    } catch (e) {
      console.warn("[chat] send sticker failed", e);
    }
  });

  sendBtn.addEventListener("click", async () => {
    if (!ensureLoggedOrRedirect()) return;
    const text = input.value;
    input.value = "";
    try {
      await sendTextOrSticker({ text });
      if (opened) stream.scrollTop = stream.scrollHeight;
    } catch (e) {
      console.warn("[chat] send text failed", e);
    }
  });

  input.addEventListener("keydown", async (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      sendBtn.click();
    }
  });

  stream.addEventListener("click", async (ev) => {
    const avBtn = ev.target?.closest?.(".chat-avatar-btn");
    if (avBtn){
      const avatar = avBtn.getAttribute('data-avatar') || '';
      const name = avBtn.getAttribute('data-name') || '';
      const sector = avBtn.getAttribute('data-sector') || '';
      if (avatar && app.modal?.openModal){
        app.modal.openModal({
          title: '👤 Perfil',
          bodyHTML: `
            <div class="chat-profile">
              <img class="chat-profile-img" src="${esc(avatar)}" alt="Foto de ${esc(name)}" />
              <div class="chat-profile-name">${esc(name || 'Usuário')}</div>
              <div class="chat-profile-sector">${esc(sector || '—')}</div>
            </div>
          `,
          buttons: [{ label:'Fechar', variant:'primary', onClick: () => app.modal.closeModal?.() }],
          dismissible: true
        });
      }
      return;
    }
    const btn = ev.target?.closest?.(".chat-react");
    if (!btn) return;
    if (!ensureLoggedOrRedirect()) return;
    const msgEl = btn.closest(".chat-msg");
    const msgId = msgEl?.getAttribute("data-id");
    const type = btn.getAttribute("data-react");
    if (!msgId || !type) return;
    try {
      await toggleReaction(msgId, type);
    } catch (e) {
      console.warn("[chat] react failed", e);
    }
  });

  // expõe API simples
  app.chat = {
    open: () => fab.click(),
    close: closePanel,
  };
}
