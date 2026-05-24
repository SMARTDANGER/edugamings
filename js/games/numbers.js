/* ═══════════════════════════════════════
   NUMBERS GAME — count animals
   ═══════════════════════════════════════ */

const NumbersGame = (function () {

  const ANIMAL_POOL = [
    '🐶','🐱','🐸','🦊','🐼','🦄','🐧','🦋','🐝','🦕',
    '🐳','🦒','🐘','🦁','🦀','🐙','🦔','🐺','🦅','🐬',
  ];

  const DIFFICULTY_WAVE = ['easy', 'medium', 'hard', 'medium'];
  const MAX_BY_DIFF = { easy: 5, medium: 10, hard: 15 };

  let container, callbacks, correctAnswer, blocked;

  // ── Helpers ─────────────────────────────────────────────────────

  function getDifficulty(round) {
    return DIFFICULTY_WAVE[round % 4];
  }

  function getRangeFor(diff) {
    return {
      easy:   { min: 1, max: 5  },
      medium: { min: 4, max: 10 },
      hard:   { min: 8, max: 15 },
    }[diff];
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function generateChoices(correct, max) {
    const choices = new Set([correct]);
    let attempts = 0;
    while (choices.size < 3 && attempts < 30) {
      const delta = Math.floor(Math.random() * 4) + 1;
      const sign  = Math.random() > 0.5 ? 1 : -1;
      const n     = Math.max(1, Math.min(max, correct + sign * delta));
      if (n !== correct) choices.add(n);
      attempts++;
    }
    // Fill with deterministic fallbacks if needed
    let fill = 1;
    while (choices.size < 3) { if (!choices.has(fill)) choices.add(fill); fill++; }
    return shuffle(Array.from(choices));
  }

  // ── Render ───────────────────────────────────────────────────────

  function start(cont, options, cbs) {
    container = cont;
    callbacks = cbs;
    blocked   = false;

    const diff    = getDifficulty(options.round || 0);
    const range   = getRangeFor(diff);
    const count   = range.min + Math.floor(Math.random() * (range.max - range.min + 1));
    const animalIdx = (options.rotationIndex || 0) % ANIMAL_POOL.length;
    const animal  = ANIMAL_POOL[animalIdx];

    correctAnswer = count;
    const choices = generateChoices(count, MAX_BY_DIFF[diff]);

    // Build delays so animals pop in one by one
    const animalHtml = Array.from({ length: count }, (_, i) =>
      `<span class="animal" style="animation-delay:${i * 0.06}s">${animal}</span>`
    ).join('');

    container.innerHTML = `
      <div class="numbers-game">
        <div class="animals-display">${animalHtml}</div>
        <div class="number-choices">
          ${choices.map(n => `<button class="number-btn" data-answer="${n}">${n}</button>`).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.number-btn').forEach(btn => {
      btn.addEventListener('click', () => handleChoice(btn));
    });
  }

  function handleChoice(btn) {
    if (blocked) return;
    const answer = parseInt(btn.dataset.answer, 10);

    if (answer === correctAnswer) {
      blocked = true;
      btn.classList.add('correct');
      callbacks.onCorrect();
      setTimeout(() => callbacks.onComplete(1), 900);
    } else {
      btn.classList.add('wrong');
      callbacks.onWrong();
      setTimeout(() => btn.classList.remove('wrong'), 700);
    }
  }

  function cleanup() {
    container = null;
    callbacks = null;
    blocked   = true;
  }

  return { start, cleanup };
})();
