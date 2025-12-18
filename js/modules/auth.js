
// modules/auth.js
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { app } from './firebase-config.js';

const auth = getAuth(app);

function setupAuthListeners() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      hydrateUserUI(user);
    } else {
      clearUserUI();
    }
  });
}

function hydrateUserUI(user) {
  // atualiza UI do usuário logado
  console.log('Usuário logado:', user.email);
}

function clearUserUI() {
  // limpa UI quando deslogado
  console.log('Usuário deslogado');
}

// 🔒 IMPORTANTE: toda lógica dependente do auth fica DENTRO de funções
setupAuthListeners();

export {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
};
