/* ═══════════════════════════════════════
   SHAPES GAME — match the shape
   ═══════════════════════════════════════ */

const ShapesGame = (function () {

  // Skins rotate every 5 rounds: flat → gradient → 3D → neon → pastel
  const SKIN_LABELS = ['flat','gradient','3d','neon','pastel'];

  const SHAPES = [
    { name: 'circle',    emoji: '⭕' },
    { name: 'square',    emoji: '🟥' },
    { name: 'triangle',  emoji: '🔺' },
    { name: 'star',      emoji: '⭐' },
    { name: 'heart',     emoji: '❤️' },
    { name: 'diamond',   emoji: '💎' },
    { name: 'pentagon',  emoji: '⬠' },
    { name: 'oval',      emoji: '🥚' },
    { name: 'moon',      emoji: '🌙' },
    { name: 'lightning', emoji: '⚡' },
  ];

  // Neon / pastel / 3D alt representations
  const NEON_SHAPES = [
    { name: 'circle',    emoji: '🔵' },
    { name: 'square',    emoji: '🟦' },
    { name: 'triangle',  emoji: '🔷' },
    { name: 'star',      emoji: '💫' },
    { name: 'heart',     emoji: '💙' },
    { name: 'diamond',   emoji: '🔹' },
    { name: 'pentagon',  emoji: '🔷' },
    { name: 'oval',      emoji: '💊' },
    { name: 'moon',      emoji: '🌛' },
    { name: 'lightning', emoji: '🌩️' },
  ];

  const PASTEL_SHAPES = [
    { name: 'circle',    emoji: '🔴' },
    { name: 'square',    emoji: '🟪' },
    { name: 'triangle',  emoji: '🔻' },
    { name: 'star',      emoji: '🌟' },
    { name: 'heart',     emoji: '🩷' },
    { name: 'diamond',   emoji: '🪩' },
    { name: 'pentagon',  emoji: '🔶' },
    { name: 'oval',      emoji: '🫧' },
    { name: 'moon',      emoji: '🌝' },
    { name: 'lightning', emoji: '☀️' },
  ];

  const DIFFICULTY_WAVE = ['easy', 'medium', 'hard', 'medium'];
  const POOL_SIZE_BY_DIFF = { easy: 4, medium: 6, hard: 10 };

  let container, callbacks, correctIdx, blocked;
  let seqCount = 0;
  let seqNeeded = 5;

  function getDifficulty(round) { return DIFFICULTY_WAVE[round % 4]; }

  function getSkinPool(round) {
    const skinIdx = Math.floor(round / 5) % SKIN_LABELS.length;
    const skin = SKIN_LABELS[skinIdx];
    if (skin === 'neon') return NEON_SHAPES;
    if (skin === 'pastel' || skin === '3d') return PASTEL_SHAPES;
    return SHAPES;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── Render ───────────────────────────────────────────────────────

  function start(cont, opts, cbs) {
    container = cont;
    callbacks = cbs;
    blocked   = false;
    seqCount  = 0;
    seqNeeded = 5;
    renderQuestion(opts);
  }

  function renderQuestion(opts) {
    blocked = false;
    const diff    = getDifficulty(opts.round || 0);
    const pool    = getSkinPool(opts.round || 0);
    const count   = POOL_SIZE_BY_DIFF[diff];
    const picked  = shuffle(pool).slice(0, Math.min(count, pool.length));

    const targetIdx = Math.floor(Math.random() * picked.length);
    const target    = picked[targetIdx];
    correctIdx      = targetIdx;

    // 4 choices always shown
    let choicePool = shuffle(picked);
    if (choicePool.length < 4) {
      const extra = shuffle(pool).filter(s => !choicePool.find(c => c.name === s.name));
      choicePool = [...choicePool, ...extra].slice(0, 4);
    }
    const choices = shuffle(choicePool).slice(0, 4);
    const correctChoice = choices.findIndex(c => c.name === target.name);
    // Ensure the correct one is in choices
    if (correctChoice === -1) {
      choices[Math.floor(Math.random() * 4)] = target;
    }

    const correctName = target.name;

    container.innerHTML = `
      <div class="shapes-game">
        <div class="shape-prompt">
          <div class="shape-prompt-label">Find the ${target.name}!</div>
          <div class="shape-display">${target.emoji}</div>
        </div>
        <div class="shape-choices">
          ${choices.map((s, i) => `
            <button class="shape-choice-btn" data-name="${s.name}" data-correct="${s.name === correctName}">
              ${s.emoji}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.shape-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => handleChoice(btn, correctName, opts));
    });
  }

  function handleChoice(btn, correctName, opts) {
    if (blocked) return;
    const isCorrect = btn.dataset.correct === 'true';

    if (isCorrect) {
      blocked = true;
      btn.classList.add('correct');
      callbacks.onCorrect();
      seqCount++;

      setTimeout(() => {
        if (seqCount >= seqNeeded) {
          callbacks.onComplete(1);
        } else {
          // Increment round for skin/difficulty tracking
          renderQuestion({ ...opts, round: (opts.round || 0) + seqCount });
        }
      }, 700);
    } else {
      btn.classList.add('wrong');
      callbacks.onWrong();
      setTimeout(() => btn.classList.remove('wrong'), 600);
    }
  }

  function cleanup() {
    container = null;
    callbacks = null;
    blocked   = true;
  }

  return { start, cleanup };
})();
