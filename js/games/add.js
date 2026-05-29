/* ═══════════════════════════════════════
   ADD & TAKE GAME — early arithmetic
   Visual addition and subtraction with countable objects.
     • easy   → add, sum ≤ 5
     • medium → add, sum ≤ 10
     • hard   → take away (subtraction), minuend ≤ 10
   ═══════════════════════════════════════ */

const AddGame = (function () {

  const OBJECTS = ['🍎','🍓','⭐','🐣','🌸','🐠','🎈','🍪','🌻','🐞'];

  const DIFFICULTY_WAVE = ['easy', 'medium', 'hard', 'medium'];

  let container, callbacks;
  let seqCount = 0, seqNeeded = 4;
  let blocked  = false;

  function getDifficulty(round) { return DIFFICULTY_WAVE[round % DIFFICULTY_WAVE.length]; }

  function rand(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Build 3 unique non-negative number choices that include `answer`.
  function buildChoices(answer, max) {
    const set = new Set([answer]);
    let guard = 0;
    while (set.size < 3 && guard < 40) {
      const delta = rand(1, 3) * (Math.random() < 0.5 ? 1 : -1);
      const n = Math.max(0, Math.min(max, answer + delta));
      set.add(n);
      guard++;
    }
    let fill = 0;
    while (set.size < 3) { set.add(fill++); }
    return shuffle(Array.from(set));
  }

  // ── Start ────────────────────────────────────────────────────────

  function start(cont, opts, cbs) {
    container = cont;
    callbacks = cbs;
    blocked   = false;
    seqCount  = 0;
    seqNeeded = 4;
    renderQuestion(opts);
  }

  function makeProblem(diff) {
    if (diff === 'hard') {
      // Take away
      const a = rand(2, 10);
      const b = rand(1, a - 1);
      return { op: '-', a, b, answer: a - b, max: 10 };
    }
    const cap = diff === 'easy' ? 5 : 10;
    const a = rand(1, cap - 1);
    const b = rand(1, cap - a);
    return { op: '+', a, b, answer: a + b, max: cap };
  }

  function objectsHtml(emoji, count, takenFrom) {
    return Array.from({ length: count }, (_, i) => {
      const taken = (takenFrom != null && i >= count - takenFrom) ? ' taken' : '';
      return `<span class="add-obj${taken}" style="animation-delay:${i * 0.05}s">${emoji}</span>`;
    }).join('');
  }

  function renderQuestion(opts) {
    blocked = false;
    const diff  = getDifficulty((opts.round || 0) + seqCount);
    const p     = makeProblem(diff);
    const emoji = OBJECTS[Math.floor(Math.random() * OBJECTS.length)];
    const choices = buildChoices(p.answer, p.max);

    let equationHtml;
    if (p.op === '+') {
      equationHtml = `
        <div class="add-group">${objectsHtml(emoji, p.a)}</div>
        <div class="add-operator">➕</div>
        <div class="add-group">${objectsHtml(emoji, p.b)}</div>`;
    } else {
      // Show all `a`, with the last `b` crossed out as "taken away".
      equationHtml = `
        <div class="add-group">${objectsHtml(emoji, p.a, p.b)}</div>
        <div class="add-operator">➖</div>
        <div class="add-take-label">${p.b}</div>`;
    }

    container.innerHTML = `
      <div class="add-game">
        <div class="add-equation">
          ${equationHtml}
          <div class="add-operator">=</div>
          <div class="add-result">?</div>
        </div>
        <div class="add-choices">
          ${choices.map(n => `
            <button class="add-choice-btn" data-val="${n}" data-correct="${n === p.answer}">
              ${n}
            </button>`).join('')}
        </div>
        <div class="seq-progress">${seqCount} / ${seqNeeded}</div>
      </div>
    `;

    container.querySelectorAll('.add-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => handleChoice(btn, opts));
    });
  }

  function handleChoice(btn, opts) {
    if (blocked) return;
    const isCorrect = btn.dataset.correct === 'true';

    if (isCorrect) {
      blocked = true;
      btn.classList.add('correct');
      callbacks.onCorrect();
      seqCount++;

      // Reveal the answer in the result slot.
      const result = container.querySelector('.add-result');
      if (result) { result.textContent = btn.dataset.val; result.classList.add('revealed'); }

      setTimeout(() => {
        if (seqCount >= seqNeeded) callbacks.onComplete(1);
        else                       renderQuestion(opts);
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
