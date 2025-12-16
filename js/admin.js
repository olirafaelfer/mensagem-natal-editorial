// admin.js — Lógica para o painel de admin (login e zerar ranking)

document.addEventListener("DOMContentLoaded", () => {

  const adminLoginScreen = document.getElementById("adminLoginScreen");
  const adminPanel = document.getElementById("adminPanel");
  const adminPasswordInput = document.getElementById("adminPasswordInput");
  const adminLoginBtn = document.getElementById("adminLoginBtn");
  const resetRankingBtn = document.getElementById("resetRankingBtn");
  const closeAdminPanelBtn = document.getElementById("closeAdminPanelBtn");
  const closeAdminModalBtn = document.getElementById("closeAdminModal");

  const adminPassword = "admin123";  // Senha de acesso ao painel do admin

  // Função para abrir o painel de admin
  function openAdminPanel() {
    adminLoginScreen.classList.add("hidden");
    adminPanel.classList.remove("hidden");
  }

  // Função para exibir o login do admin
  function showAdminLogin() {
    adminLoginScreen.classList.remove("hidden");
    adminPanel.classList.add("hidden");
  }

  // Lógica do login de admin
  adminLoginBtn.addEventListener("click", () => {
    const enteredPassword = adminPasswordInput.value;

    if (enteredPassword === adminPassword) {
      openAdminPanel();
    } else {
      alert("Senha incorreta. Tente novamente.");
      adminPasswordInput.value = "";
    }
  });

  // Função para zerar o ranking
  resetRankingBtn.addEventListener("click", () => {
    localStorage.removeItem("ranking");  // Zerando o ranking (ajustar conforme sua lógica de ranking)
    alert("Ranking zerado com sucesso!");
  });

  // Fechar o painel de admin
  closeAdminPanelBtn.addEventListener("click", () => {
    adminPanel.classList.add("hidden");
    showAdminLogin();
  });

  // Fechar o login do admin
  closeAdminModalBtn.addEventListener("click", () => {
    adminLoginScreen.classList.add("hidden");
  });

  // Exibir o login de admin assim que a página carregar
  showAdminLogin();
});
