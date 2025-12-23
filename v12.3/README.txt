Estrutura refatorada (sem bundler — funciona no GitHub Pages)

/index.html
/css/style.css, /css/auth.css, /css/admin.css
/js/main.js                (bootstrap)
/js/app/app.js             (contexto app)
/js/game-core.js           (gameplay)
/js/engine/game-engine.js  (motor)
/js/ui/ui-modal.js         (modal - seu arquivo original)
/js/ui/score-fx.js         (+pts/-pts)
/js/modules/auth.js        (seu arquivo original)
/js/modules/ranking.js     (seu arquivo original)
/js/modules/theme-fx.js    (seu arquivo original)
/js/modules/admin.js       (seu arquivo original)
/js/data/tutorial.js       (seu tutorial — você pode melhorar depois)
/js/data/challenges/*.js   (9 arquivos - conteúdo)

IMPORTANTE:
- Os desafios 2 e 3 só liberam se logado e se concluir o anterior.
- O tutorial só aparece 1 vez antes do Desafio 1. Para testar de novo: limpe localStorage key 'mission_tutorial_done'.
