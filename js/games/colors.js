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

  const OBJECT_SHAPES = ['💧','⭐','❤️','🫧','🍃'];

  let container, callbacks, options;
  let rafId = null;
  let score = 0, needed = 8;
  let activeColors = [];
  let objectShape  = '💧';
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
    objectShape   = OBJECT_SHAPES[Math.floor((opts.round || 0) / 3) % OBJECT_SHAPES.length];

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

    fallingEl = document.createElement('div');
    fallingEl.className = 'falling-object';
    fallingEl.textContent = objectShape;
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
