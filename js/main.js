
/*
 PATCHED MAIN.JS (SAFE)
 - Does NOT redeclare `levels`
 - Exposes window.app for console access
 - Adds app.game.setChallenge(n) with login gate
*/

(function () {
  // Ensure global app object
  window.app = window.app || {};
  const app = window.app;

  // Expect these to exist in original code
  // app.auth        -> auth module
  // app.game        -> game module (we will extend)
  // levels          -> existing levels array/object

  if (!app.game) app.game = {};

  // Helper: check login (compatible with existing auth)
  function isLoggedIn() {
    try {
      return !!(app.auth && app.auth.isLoggedIn && app.auth.isLoggedIn());
    } catch (e) {
      return false;
    }
  }

  // Attach setChallenge without redeclaring `levels`
  app.game.setChallenge = function (challengeId) {
    // Gate: challenges 2 and 3 require login
    if (challengeId > 1 && !isLoggedIn()) {
      if (app.auth && app.auth.openGate) {
        app.auth.openGate();
      } else {
        alert("Faça login para acessar este desafio.");
      }
      return;
    }

    // Validate levels existence
    if (typeof levels === "undefined") {
      console.error("levels is not defined. Ensure original main.js defines it.");
      return;
    }

    // Set current challenge
    app.game.currentChallenge = challengeId;

    // Optional: multiplier per challenge (do NOT redeclare levels)
    try {
      if (levels[challengeId - 1]) {
        if (challengeId === 2) levels[challengeId - 1].multiplier = 1.2;
        if (challengeId === 3) levels[challengeId - 1].multiplier = 1.2;
      }
    } catch (e) {
      console.warn("Could not set multiplier on levels:", e);
    }

    // Restart or load challenge via existing hooks
    if (app.game.startChallenge) {
      app.game.startChallenge(challengeId);
    } else if (app.game.reset) {
      app.game.reset();
    } else {
      console.warn("No startChallenge/reset hook found. Challenge id set only.");
    }
  };

  // Expose alias for debugging
  app.debug = app.debug || {};
  app.debug.isLoggedIn = isLoggedIn;

  console.log("[PATCH] main.js loaded without redeclaring levels.");
})();
