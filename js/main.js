/* ═══════════════════════════════════════
   MAIN — app initialization
   ═══════════════════════════════════════ */

(function () {

  // ── Break reminder system ─────────────────────────────────────────
  let sessionStartTime = Date.now();
  let breakShown = false;
  let breakCheckInterval = null;

  function checkBreakReminder() {
    const elapsed = (Date.now() - sessionStartTime) / 1000 / 60; // minutes
    if (!breakShown && elapsed >= 20) {
      breakShown = true;
      showBreakReminder();
      setTimeout(() => {
        breakShown = false; // allow again after 20 more minutes
        sessionStartTime = Date.now();
      }, 20 * 60 * 1000);
    }
  }

  function showBreakReminder() {
    const el = document.getElementById('break-reminder');
    if (!el) return;
    el.classList.add('visible');
    // Dim the body briefly
    document.body.style.filter = 'brightness(0.7)';
    setTimeout(() => {
      el.classList.remove('visible');
      document.body.style.filter = '';
    }, 3000);
  }

  // ── Spectrum → particle sync ──────────────────────────────────────
  function syncParticlesToPhase(phase) {
    Particles.setType(phase.particles);
  }

  // ── Boot ──────────────────────────────────────────────────────────
  function init() {
    // Load persisted state
    const stateData = State.load();

    // Init spectrum engine
    Spectrum.init(stateData.currentSpectrumHue, stateData.currentPhase);
    Spectrum.setPhaseChangeCallback((phase) => syncParticlesToPhase(phase));

    // Init particles (synced to current phase)
    Particles.init();
    syncParticlesToPhase(Spectrum.phaseData);

    // Init celebration screen buttons
    Celebration.init();

    // Home screen game card clicks
    document.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => {
        const gameId = card.dataset.game;
        if (gameId) Router.startGame(gameId);
      });
    });

    // In-game home button
    document.getElementById('btn-home-game').addEventListener('click', () => {
      Router.goHome();
    });

    // Track any interaction to reset spectrum idle timer
    ['click', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, () => Spectrum.recordInteraction(), { passive: true });
    });

    // Render home screen
    Home.render();
    Router.show('home');

    // Start break reminder check
    breakCheckInterval = setInterval(checkBreakReminder, 60 * 1000);

    // Milestone check on load (e.g. crowns at 30+)
    if (stateData.totalRoundsPlayed >= 30) {
      Home.showCrowns();
    }
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
