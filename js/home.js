/* ═══════════════════════════════════════
   HOME — home screen management
   ═══════════════════════════════════════ */

const Home = (function () {
  const GAME_IDS = ['numbers', 'colors', 'shapes', 'puzzle', 'memory', 'patterns'];

  function render() {
    const stateData = State.get();
    const stars     = stateData.starsPerGame || {};

    GAME_IDS.forEach(id => {
      const starsEl = document.getElementById('stars-' + id);
      if (!starsEl) return;
      const count = Math.min(stars[id] || 0, 5);
      starsEl.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const s = document.createElement('span');
        s.className = 'card-star';
        s.textContent = '⭐';
        s.style.animationDelay = (i * 0.06) + 's';
        starsEl.appendChild(s);
      }
    });

    // Welcome-back mascot sparkle if loading from saved state
    if (stateData.totalRoundsPlayed > 0) {
      setTimeout(sparkMascot, 300);
    }
  }

  function sparkMascot() {
    const m = document.getElementById('mascot');
    if (!m) return;
    m.classList.remove('sparkle');
    void m.offsetWidth; // reflow
    m.classList.add('sparkle');
  }

  function showCrowns() {
    GAME_IDS.forEach((id, i) => {
      const crown = document.getElementById('crown-' + id);
      if (!crown) return;
      crown.textContent = '👑';
      setTimeout(() => crown.classList.add('visible'), i * 120);
    });
  }

  function hideCrowns() {
    GAME_IDS.forEach(id => {
      const crown = document.getElementById('crown-' + id);
      if (crown) crown.classList.remove('visible');
    });
  }

  return { render, sparkMascot, showCrowns, hideCrowns };
})();
