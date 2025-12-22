PATCH V7.3 — Pontos 1 e 2 (sem quebrar boot)

✅ Este patch adiciona:
- /7.3/js/ui/ui-modal.js
  -> cria window.openModal / window.closeModal
  -> habilita clique em qualquer botão com data-open-justifications="1"
- /7.3/js/modules/avatar-firestore.js
  -> helper para salvar avatar no Firestore (rankingByEmail)

=== APLICAÇÃO (3 edições pequenas no seu código atual) ===

1) main.js
   Garanta que o modal seja carregado no boot (ANTES de game-core renderizar o final):
   Adicione logo no início do boot (ou no início do arquivo):
     import "./ui/ui-modal.js";

   Se seu main.js usa dynamic import, pode ser:
     await safeImport("./ui/ui-modal.js");

2) Botão "Correções e justificativas" no FINAL
   Onde você cria o botão, adicione:
     btn.dataset.openJustifications = "1";
     btn.dataset.justificationsTitle = "Correções e justificativas";
     btn.dataset.justificationsHtml = htmlJustificativas;

   (htmlJustificativas é um HTML simples com lista de correções. Ex: <ul><li>...</li></ul>)

   Alternativa rápida (se você já tem uma função que monta HTML):
     btn.setAttribute("data-open-justifications","1");
     btn.setAttribute("data-justifications-html", buildJustificationsHTML());

3) Avatar para TODOS no ranking (Firestore)
   a) Rules: permitir o campo 'avatar' em /rankingByEmail/{emailHash} (regras completas eu te mandei no chat).
   b) No fluxo onde o usuário escolhe ícone/foto e você salva localmente, após salvar em localStorage:
        import { persistAvatarToRanking } from "./modules/avatar-firestore.js";
        await persistAvatarToRanking(db, emailHash, avatarDataUrlOuEmoji);

   Importante: chame isso SOMENTE depois do doc rankingByEmail existir.

Se você preferir: me envie o ZIP da pasta /7.3 atual e eu devolvo um ZIP V7.4 já com tudo aplicado automaticamente.
