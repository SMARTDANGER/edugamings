/* ═══════════════════════════════════════
   CELEBRATION — post-round celebration
   ═══════════════════════════════════════ */

const Celebration = (function () {
  const BURSTS = ['🌟', '🎉', '✨', '🏆', '🎊', '💫', '🌈', '🥳'];

  let autoTimer = null;
  let fillInterval = null;
  let nextRoundCallback = null;
  let durationMs = 3000;

  function show(gameId, onNext) {
    nextRoundCallback = onNext;

    const total = State.get().totalRoundsPlayed;
    const isSpecial = total > 0 && total % 10 === 0;
    durationMs = isSpecial ? 1500 : 1000;

    const burst  = document.getElementById('celebration-burst');
    const fill   = document.getElementById('celebration-auto-fill');

    // Pick burst emoji
    let emoji = BURSTS[Math.floor(Math.random() * BURSTS.length)];
    if (total === 50 || total === 100) emoji = '🏆';
    burst.textContent = emoji;
    burst.className   = 'celebration-burst' + (total % 15 === 0 ? ' golden' : '');

    // Reset progress bar
    if (fill) { fill.style.width = '0%'; fill.style.transition = 'width 0.1s linear'; }

    Router.show('celebration');
    clearTimers();

    // Animate progress bar then auto-advance
    let elapsed = 0;
    const step = 100;
    fillInterval = setInterval(() => {
      elapsed += step;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      if (fill) fill.style.width = pct + '%';
      if (elapsed >= durationMs) {
        clearTimers();
        advance();
      }
    }, step);
  }

  function advance() {
    Router.show('game');
    if (nextRoundCallback) nextRoundCallback();
  }

  function goHome() {
    clearTimers();
    Router.goHome();
  }

  function clearTimers() {
    if (autoTimer)    { clearTimeout(autoTimer);    autoTimer    = null; }
    if (fillInterval) { clearInterval(fillInterval); fillInterval = null; }
  }

  function init() {
    document.getElementById('btn-home-celebrate').addEventListener('click', goHome);
    document.getElementById('btn-next-round').addEventListener('click', () => {
      clearTimers();
      advance();
    });
  }

  return { show, init };
})();
