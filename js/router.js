/* ═══════════════════════════════════════
   ROUTER — screen navigation
   ═══════════════════════════════════════ */

const Router = (function () {
  let currentScreen = 'home';
  let currentGame = null;
  let currentGameCleanup = null;

  function show(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + screenId);
    if (el) el.classList.add('active');
    currentScreen = screenId;
  }

  function goHome() {
    if (currentGameCleanup) { currentGameCleanup(); currentGameCleanup = null; }
    if (typeof ThreeEngine !== 'undefined') ThreeEngine.stopActive();
    if (typeof Particles !== 'undefined') Particles.resume();
    currentGame = null;
    clearGameContent();
    Home.render();
    show('home');
  }

  // Used to ignore a 3D bundle that finished loading after the player
  // already tapped a different card.
  let pendingGameRequest = null;

  function startGame(gameId) {
    Spectrum.recordInteraction();
    pendingGameRequest = gameId;
    const needsThree = (gameId === 'shapes3d' || gameId === 'tower3d');
    if (needsThree) {
      // Pause particles while a 3D game owns the GPU
      if (typeof Particles !== 'undefined') Particles.pause();
      load3DBundle(() => {
        if (pendingGameRequest !== gameId) return;     // user moved on
        pendingGameRequest = null;
        if (typeof window.THREE === 'undefined') {
          // 3D bundle failed to download — fall back to home with no harm.
          if (typeof Particles !== 'undefined') Particles.resume();
          return;
        }
        currentGame = gameId;
        show('game');
        launchRound();
      });
      return;
    }
    pendingGameRequest = null;
    if (typeof Particles !== 'undefined') Particles.resume();
    currentGame = gameId;
    show('game');
    launchRound();
  }

  // Lazy-load Three.js + the 3D game modules on first 3D card tap. They
  // total ~650 KB, so keeping them off the critical path makes the
  // first home paint much faster for kids who only play the 2D games.
  let bundle3DLoaded = false;
  let bundle3DLoading = null;
  function load3DBundle(done) {
    if (bundle3DLoaded) return done();
    if (bundle3DLoading) return bundle3DLoading.push(done);
    bundle3DLoading = [done];
    const scripts = [
      'vendor/three.min.js',
      'js/three-engine.js',
      'js/games/shapes3d.js',
      'js/games/tower3d.js',
    ];
    let i = 0;
    function next() {
      if (i >= scripts.length) {
        bundle3DLoaded = true;
        const callbacks = bundle3DLoading;
        bundle3DLoading = null;
        callbacks.forEach(cb => cb());
        return;
      }
      const s = document.createElement('script');
      s.src = scripts[i++];
      s.onload  = next;
      s.onerror = next;     // best-effort — game module will gracefully no-op if THREE missing
      document.head.appendChild(s);
    }
    next();
  }

  function launchRound() {
    if (!currentGame) return;
    // Before tearing down the DOM, stop the previous round's game so its
    // rAF/3D scene doesn't keep running alongside the new one.
    if (currentGameCleanup) {
      try { currentGameCleanup(); } catch (_) {}
      currentGameCleanup = null;
    }
    if (typeof ThreeEngine !== 'undefined') ThreeEngine.stopActive();
    clearGameContent();

    const stateData    = State.get();
    const totalRounds  = stateData.totalRoundsPlayed;
    const gameRound    = stateData.gameRoundCounts[currentGame] || 0;
    const rotIndex     = stateData.contentRotationIndex || 0;
    const isBonusRound = (totalRounds > 0) && (totalRounds % 5 === 0);

    updateRoundDots(gameRound);

    const gameModule = getGameModule(currentGame);
    if (!gameModule) return;

    const container = document.getElementById('game-content');

    // Bonus round indicator
    if (isBonusRound) {
      const indicator = document.createElement('div');
      indicator.className = 'bonus-indicator';
      indicator.textContent = '⭐';
      document.body.appendChild(indicator);
      setTimeout(() => indicator.remove(), 3000);
    }

    // Golden round (every 15 total)
    const isGoldenRound = totalRounds > 0 && totalRounds % 15 === 0;
    if (isGoldenRound) {
      const overlay = document.createElement('div');
      overlay.className = 'golden-round-overlay';
      overlay.id = 'golden-round-overlay';
      document.body.appendChild(overlay);
    }

    const cleanup = gameModule.start(container, {
      round:        gameRound,
      totalRounds,
      rotationIndex: rotIndex,
      isBonusRound,
      isGoldenRound,
    }, {
      onCorrect: () => {
        Spectrum.onCorrectAnswer();
        Spectrum.recordInteraction();
      },
      onWrong: () => {
        Spectrum.onWrongAnswer();
        Spectrum.recordInteraction();
      },
      onComplete: (stars) => {
        // Remove overlays
        const golden = document.getElementById('golden-round-overlay');
        if (golden) golden.remove();

        // Stop the just-finished game's rAF/scene before celebration —
        // no point rendering into a hidden canvas for 3 s.
        if (currentGameCleanup) {
          try { currentGameCleanup(); } catch (_) {}
          currentGameCleanup = null;
        }
        if (typeof ThreeEngine !== 'undefined') ThreeEngine.stopActive();

        // Update state
        State.incrementTotal();
        State.incrementGameRound(currentGame);
        State.incrementRotation();
        if (stars > 0) State.addStar(currentGame);

        checkMilestones(State.get().totalRoundsPlayed);

        Celebration.show(currentGame, () => {
          launchRound();
        });
      }
    });

    currentGameCleanup = cleanup || null;
  }

  function checkMilestones(total) {
    // Every 10 rounds: spectrum jump +30°
    if (total % 10 === 0 && total > 0) {
      setTimeout(() => Spectrum.jump(30), 400);
    }
    // Every 20 rounds: opposite hue jump
    if (total === 20 || (total > 20 && total % 20 === 0)) {
      setTimeout(() => Spectrum.jumpToOpposite(), 600);
    }
    // Milestone star crowns at 30 rounds
    if (total === 30) {
      Home.showCrowns();
    }
  }

  function updateRoundDots(gameRound) {
    const dotsContainer = document.getElementById('round-dots');
    if (!dotsContainer) return;
    const wave = ['easy', 'medium', 'hard', 'medium'];
    const dots = wave.map((d, i) => {
      const active = (gameRound % 4) === i ? 'active' : '';
      return `<div class="round-dot ${active}"></div>`;
    });
    dotsContainer.innerHTML = dots.join('');
  }

  function getGameModule(id) {
    const map = {
      numbers:  typeof NumbersGame  !== 'undefined' ? NumbersGame  : null,
      colors:   typeof ColorsGame   !== 'undefined' ? ColorsGame   : null,
      shapes:   typeof ShapesGame   !== 'undefined' ? ShapesGame   : null,
      puzzle:   typeof PuzzleGame   !== 'undefined' ? PuzzleGame   : null,
      memory:   typeof MemoryGame   !== 'undefined' ? MemoryGame   : null,
      patterns: typeof PatternsGame !== 'undefined' ? PatternsGame : null,
      shapes3d: typeof Shapes3DGame !== 'undefined' ? Shapes3DGame : null,
      tower3d:  typeof Tower3DGame  !== 'undefined' ? Tower3DGame  : null,
    };
    return map[id];
  }

  function clearGameContent() {
    const c = document.getElementById('game-content');
    if (c) c.innerHTML = '';
  }

  return { show, goHome, startGame };
})();
