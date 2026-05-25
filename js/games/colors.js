/* ═══════════════════════════════════════
   COLORS GAME — catch falling colored objects
   ═══════════════════════════════════════ */

const ColorsGame = (function () {

  const GAME_COLORS = [
    { name: 'red',    bg: '#FF4444', label: '🔴' },
    { name: 'blue',   bg: '#4488FF', label: '🔵' },
    { name: 'yellow', bg: '#FFD700', label: '🟡' },
    { name: 'green',  bg: '#44BB44', label: '🟢' },
    { name: 'orange', bg: '#FF8800', label: '🟠' },
    { name: 'purple', bg: '#9944FF', label: '🟣' },
  ];

  // Hollow outline shapes — fill: none so the falling-object's
  // background color shows through the empty interior.
  const OBJECT_SHAPES = [
    // circle
    '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="none" stroke="white" stroke-width="3.5" stroke-linejoin="round"/></svg>',
    // rounded square
    '<svg viewBox="0 0 40 40"><rect x="6" y="6" width="28" height="28" rx="5" fill="none" stroke="white" stroke-width="3.5" stroke-linejoin="round"/></svg>',
    // triangle
    '<svg viewBox="0 0 40 40"><polygon points="20,5 35,33 5,33" fill="none" stroke="white" stroke-width="3.5" stroke-linejoin="round"/></svg>',
    // 5-point star
    '<svg viewBox="0 0 40 40"><polygon points="20,4 24.5,15 36,15.5 27,23 30,34 20,27 10,34 13,23 4,15.5 15.5,15" fill="none" stroke="white" stroke-width="2.8" stroke-linejoin="round"/></svg>',
    // heart
    '<svg viewBox="0 0 40 40"><path d="M20 33 C5 22 6 11 13 10 C17 9.5 20 13 20 13 C20 13 23 9.5 27 10 C34 11 35 22 20 33 Z" fill="none" stroke="white" stroke-width="3" stroke-linejoin="round"/></svg>',
    // diamond
    '<svg viewBox="0 0 40 40"><polygon points="20,4 35,20 20,36 5,20" fill="none" stroke="white" stroke-width="3.5" stroke-linejoin="round"/></svg>',
    // hexagon
    '<svg viewBox="0 0 40 40"><polygon points="20,4 34,12.5 34,27.5 20,36 6,27.5 6,12.5" fill="none" stroke="white" stroke-width="3" stroke-linejoin="round"/></svg>',
    // 4-petal flower
    '<svg viewBox="0 0 40 40"><g fill="none" stroke="white" stroke-width="3" stroke-linejoin="round"><circle cx="20" cy="11" r="5"/><circle cx="20" cy="29" r="5"/><circle cx="11" cy="20" r="5"/><circle cx="29" cy="20" r="5"/></g></svg>',
    // crescent moon
    '<svg viewBox="0 0 40 40"><path d="M28 8 A14 14 0 1 0 28 32 A11 11 0 1 1 28 8 Z" fill="none" stroke="white" stroke-width="3" stroke-linejoin="round"/></svg>',
    // lightning bolt
    '<svg viewBox="0 0 40 40"><polygon points="22,4 9,22 19,22 16,36 31,17 21,17 24,4" fill="none" stroke="white" stroke-width="3" stroke-linejoin="round"/></svg>',
  ];

  let container, callbacks, options;
  let rafId = null;
  let score = 0, needed = 8;
  let activeColors = [];
  let fallingEl    = null;
  let fallingColor = null;
  let fallingX     = 0;
  let fallingY     = 0;
  let fallingSpeed = 1.2;
  let windDrift    = 0;
  let areaH        = 0;
  let areaW        = 0;
  let blocked      = false;
  let isRunning    = false;

  function getDifficulty(round) {
    const wave = ['easy', 'medium', 'hard', 'medium'];
    return wave[round % 4];
  }

  function getColorCount(diff) {
    return { easy: 3, medium: 4, hard: 6 }[diff] || 3;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── Start ────────────────────────────────────────────────────────

  function start(cont, opts, cbs) {
    container = cont;
    callbacks = cbs;
    options   = opts;
    score     = 0;
    blocked   = false;
    isRunning = true;

    const diff    = getDifficulty(opts.round || 0);
    const count   = getColorCount(diff);
    activeColors  = shuffle(GAME_COLORS).slice(0, count);

    fallingSpeed  = diff === 'easy' ? 1.0 : diff === 'medium' ? 1.5 : 2.2;
    needed        = diff === 'easy' ? 6 : 8;
    windDrift     = 0;

    render();
    setTimeout(spawnObject, 500);
  }

  function render() {
    container.innerHTML = `
      <div class="colors-game">
        <div class="falling-area" id="colors-falling-area"></div>
        <div class="progress-bar">
          <div class="progress-fill" id="colors-progress" style="width:0%"></div>
        </div>
        <div class="color-buckets" id="colors-buckets">
          ${activeColors.map(c => `
            <button class="color-bucket" data-color="${c.name}"
              style="background:${c.bg};"
              aria-label="${c.name}">
              ${c.label}
            </button>`).join('')}
        </div>
      </div>
    `;

    document.querySelectorAll('.color-bucket').forEach(btn => {
      btn.addEventListener('click', () => handleBucket(btn.dataset.color));
    });
  }

  // ── Falling object ───────────────────────────────────────────────

  function spawnObject() {
    if (!isRunning) return;
    const area = document.getElementById('colors-falling-area');
    if (!area) return;

    areaH = area.clientHeight;
    areaW = area.clientWidth;

    fallingColor = activeColors[Math.floor(Math.random() * activeColors.length)];
    fallingX = 40 + Math.random() * Math.max(1, areaW - 80);
    fallingY = -30;
    windDrift = (Math.random() - 0.5) * 0.6;

    const shape = OBJECT_SHAPES[Math.floor(Math.random() * OBJECT_SHAPES.length)];

    fallingEl = document.createElement('div');
    fallingEl.className = 'falling-object';
    fallingEl.innerHTML = shape;
    fallingEl.style.background = fallingColor.bg;
    fallingEl.style.left = fallingX + 'px';
    fallingEl.style.top  = fallingY + 'px';
    area.appendChild(fallingEl);

    if (rafId) cancelAnimationFrame(rafId);
    drop();
  }

  function drop() {
    if (!isRunning || !fallingEl) return;
    const area = document.getElementById('colors-falling-area');
    if (!area) return;

    areaH = area.clientHeight;
    areaW = area.clientWidth;

    fallingY += fallingSpeed;
    fallingX = Math.max(0, Math.min(areaW - 56, fallingX + windDrift));

    fallingEl.style.top  = fallingY + 'px';
    fallingEl.style.left = fallingX + 'px';

    if (fallingY > areaH + 20) {
      // Missed — respawn
      callbacks.onWrong();
      fallingEl.remove();
      fallingEl = null;
      setTimeout(spawnObject, 600);
      return;
    }

    rafId = requestAnimationFrame(drop);
  }

  // ── Input ────────────────────────────────────────────────────────

  function handleBucket(colorName) {
    if (!isRunning || !fallingEl) return;

    if (colorName === fallingColor.name) {
      // Correct!
      score++;
      callbacks.onCorrect();
      updateProgress();

      const btn = document.querySelector(`.color-bucket[data-color="${colorName}"]`);
      if (btn) {
        btn.classList.add('correct-hit');
        setTimeout(() => btn.classList.remove('correct-hit'), 400);
      }

      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      fallingEl.style.opacity = '0';
      setTimeout(() => {
        if (fallingEl) { fallingEl.remove(); fallingEl = null; }
        if (score >= needed) {
          isRunning = false;
          setTimeout(() => callbacks.onComplete(1), 300);
        } else {
          setTimeout(spawnObject, 500);
        }
      }, 250);
    } else {
      callbacks.onWrong();
      const btn = document.querySelector(`.color-bucket[data-color="${colorName}"]`);
      if (btn) { btn.style.transform = 'scale(0.85)'; setTimeout(() => { btn.style.transform = ''; }, 300); }
    }
  }

  function updateProgress() {
    const fill = document.getElementById('colors-progress');
    if (fill) fill.style.width = Math.min(100, (score / needed) * 100) + '%';
  }

  function cleanup() {
    isRunning = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    fallingEl = null;
  }

  return { start, cleanup };
})();
