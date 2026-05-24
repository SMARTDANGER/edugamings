/* ═══════════════════════════════════════
   SPECTRUM ENGINE — living color system
   ═══════════════════════════════════════ */

const Spectrum = (function () {

  const PHASES = [
    { name: 'cool',   min: 180, max: 240, particles: 'bubble'  },
    { name: 'dusk',   min: 240, max: 300, particles: 'star'    },
    { name: 'sunset', min: 300, max: 360, particles: 'cloud'   },
    { name: 'dawn',   min: 0,   max: 60,  particles: 'sparkle' },
    { name: 'sun',    min: 60,  max: 120, particles: 'flower'  },
    { name: 'forest', min: 120, max: 180, particles: 'leaf'    },
  ];

  let hue = 210;
  let currentPhase = 'cool';
  let lastInteraction = Date.now();
  let lastAutoAdvance = Date.now();
  let phaseChangeCallback = null;
  let tickInterval = null;
  let lastPlayTimeTick = Date.now();

  function getPhaseForHue(h) {
    const normalized = ((h % 360) + 360) % 360;
    return PHASES.find(p => {
      if (p.min < p.max) return normalized >= p.min && normalized < p.max;
      return normalized >= p.min || normalized < p.max;
    }) || PHASES[0];
  }

  function applyHue() {
    document.documentElement.style.setProperty('--spectrum-hue', Math.round(hue));

    const phase = getPhaseForHue(hue);
    if (phase.name !== currentPhase) {
      const oldPhase = currentPhase;
      currentPhase = phase.name;
      triggerPhaseTransition(phase);
      if (phaseChangeCallback) phaseChangeCallback(phase, oldPhase);
    }

    State.set('currentSpectrumHue', Math.round(hue));
    State.set('currentPhase', currentPhase);
  }

  function triggerPhaseTransition(phase) {
    const shimmer = document.getElementById('phase-shimmer');
    if (!shimmer) return;
    shimmer.style.background = `hsl(${Math.round(hue)}, 80%, 60%)`;
    shimmer.style.opacity = '0.12';
    setTimeout(() => { shimmer.style.opacity = '0'; }, 500);
  }

  function advance(amount) {
    hue = ((hue + amount) % 360 + 360) % 360;
    lastInteraction = Date.now();
    applyHue();
  }

  function init(savedHue, savedPhase) {
    hue = ((savedHue || 210) % 360 + 360) % 360;
    currentPhase = savedPhase || 'cool';
    applyHue();

    if (tickInterval) clearInterval(tickInterval);
    tickInterval = setInterval(tick, 500);
  }

  function tick() {
    const now = Date.now();
    const inactive = (now - lastInteraction) > 30000;

    if (!inactive) {
      if (now - lastAutoAdvance >= 8000) {
        advance(1);
        lastAutoAdvance = now;
      }
    } else {
      // Keep lastAutoAdvance current so the 8s clock restarts when they return
      lastAutoAdvance = now;
    }

    // Track play time (every ~10s)
    if (now - lastPlayTimeTick >= 10000) {
      State.incrementPlayTime(10);
      lastPlayTimeTick = now;
    }
  }

  function onCorrectAnswer() { advance(3); }
  function onWrongAnswer()   { advance(0.5); }

  function jump(amount) {
    advance(amount || 30);
    triggerPhaseTransition(getPhaseForHue(hue));
  }

  function jumpToOpposite() {
    jump(180);
  }

  function setPhaseChangeCallback(fn) {
    phaseChangeCallback = fn;
  }

  function recordInteraction() {
    lastInteraction = Date.now();
  }

  return {
    init,
    onCorrectAnswer,
    onWrongAnswer,
    jump,
    jumpToOpposite,
    recordInteraction,
    setPhaseChangeCallback,
    get hue()       { return Math.round(hue); },
    get phase()     { return currentPhase; },
    get phaseData() { return getPhaseForHue(hue); },
  };
})();
