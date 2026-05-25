/* ═══════════════════════════════════════
   NUMBERS GAME — count, add, and subtract animals
   ═══════════════════════════════════════ */

const NumbersGame = (function () {

  const ANIMAL_POOL = [
    '🐶','🐱','🐸','🦊','🐼','🦄','🐧','🦋','🐝','🦕',
    '🐳','🦒','🐘','🦁','🦀','🐙','🦔','🐺','🦅','🐬',
  ];

  // Three modes rotate so a child sees each kind regularly.
  const MODES = ['count', 'add', 'sub'];

  const DIFFICULTY_WAVE = ['easy', 'medium', 'hard', 'medium'];
  const MAX_BY_DIFF = { easy: 5, medium: 10, hard: 15 };

  let container, callbacks, correctAnswer, blocked;

  // ── Helpers ─────────────────────────────────────────────────────

  function getDifficulty(round) {
    return DIFFICULTY_WAVE[round % 4];
  }

  function getMode(round) {
    // Plain counting for the first few rounds, then rotate all three.
    if (round < 3) return 'count';
    return MODES[round % MODES.length];
  }

  function getRangeFor(diff) {
    return {
      easy:   { min: 1, max: 5  },
      medium: { min: 2, max: 10 },
      hard:   { min: 3, max: 15 },
    }[diff];
  }

  function rand(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
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
      // No negative numbers and no zero answers
      const n     = Math.max(0, Math.min(max, correct + sign * delta));
      if (n !== correct) choices.add(n);
      attempts++;
    }
    let fill = 0;
    while (choices.size < 3) { if (!choices.has(fill)) choices.add(fill); fill++; }
    return shuffle(Array.from(choices));
  }

  // ── Operand pickers (no negatives, results always >= 0) ─────────

  function pickCount(range) {
    const n = rand(range.min, range.max);
    return { kind: 'count', a: n, b: 0, result: n };
  }

  function pickAdd(range, max) {
    // Pick a + b such that result is within range
    const target = rand(Math.max(range.min, 2), Math.min(range.max, max));
    const a = rand(1, target - 1);
    const b = target - a;
    return { kind: 'add', a, b, result: target };
  }

  function pickSub(range, max) {
    // a - b, with result >= 1 (avoid zero so kids see a clear "kaç tane kaldı")
    const a = rand(Math.max(2, range.min), Math.min(range.max, max));
    const b = rand(1, a - 1);
    return { kind: 'sub', a, b, result: a - b };
  }

  // ── Render ───────────────────────────────────────────────────────

  function start(cont, options, cbs) {
    container = cont;
    callbacks = cbs;
    blocked   = false;

    const round = options.round || 0;
    const diff  = getDifficulty(round);
    const mode  = getMode(round);
    const range = getRangeFor(diff);
    const max   = MAX_BY_DIFF[diff];

    let problem;
    if      (mode === 'add') problem = pickAdd(range, max);
    else if (mode === 'sub') problem = pickSub(range, max);
    else                     problem = pickCount(range);

    const animalIdx = (options.rotationIndex || 0) % ANIMAL_POOL.length;
    const animal    = ANIMAL_POOL[animalIdx];

    correctAnswer = problem.result;
    const choices = generateChoices(problem.result, max);

    container.innerHTML = `
      <div class="numbers-game">
        ${renderProblem(problem, animal)}
        <div class="number-choices">
          ${choices.map(n => `<button class="number-btn" data-answer="${n}">${n}</button>`).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.number-btn').forEach(btn => {
      btn.addEventListener('click', () => handleChoice(btn));
    });
  }

  function renderProblem(problem, animal) {
    const group = (count, startDelay = 0) =>
      Array.from({ length: count }, (_, i) =>
        `<span class="animal" style="animation-delay:${(startDelay + i) * 0.05}s">${animal}</span>`
      ).join('');

    if (problem.kind === 'count') {
      return `<div class="animals-display">${group(problem.a)}</div>`;
    }
    const opSymbol = problem.kind === 'add' ? '+' : '−';
    const opClass  = problem.kind === 'add' ? 'op-add' : 'op-sub';
    // Drop the "?" placeholder — the answer buttons below are the prompt.
    // Just show: [side a]  +/−  [side b]  =
    return `
      <div class="math-row">
        <div class="animals-display math-side">${group(problem.a)}</div>
        <div class="math-op ${opClass}">${opSymbol}</div>
        <div class="animals-display math-side">${group(problem.b, problem.a)}</div>
        <div class="math-op math-eq">=</div>
      </div>
    `;
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
