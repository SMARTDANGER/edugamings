/* ═══════════════════════════════════════
   PATTERNS GAME — complete the sequence
   ═══════════════════════════════════════ */

const PatternsGame = (function () {

  // Visual vocabularies (same logic, different emoji)
  const VOCABS = [
    // Colored dots
    ['🔴','🔵','🟡','🟢','🟠','🟣'],
    // Animals
    ['🐶','🐱','🐸','🦊','🐼','🦄'],
    // Fruits
    ['🍎','🍊','🍋','🍇','🍓','🍒'],
    // Shapes
    ['⭐','❤️','💎','🔺','⬟','🌙'],
    // Vehicles
    ['🚗','✈️','🚂','⛵','🚀','🚁'],
    // Weather
    ['☀️','🌧️','⛅','❄️','🌈','⚡'],
  ];

  // Pattern types: each is a function(elements) → { shown, blank }
  // elements = array of vocab items used
  const PATTERN_TYPES = [
    // AB AB A?  (answer: B)
    {
      name: 'AB',
      minItems: 2,
      build: (els) => {
        const [A, B] = els;
        return { shown: [A,B,A,B,A], answer: B, distractors: [els[2]||A, els[3]||B] };
      }
    },
    // ABC ABC A? (answer: B)
    {
      name: 'ABC',
      minItems: 3,
      build: (els) => {
        const [A,B,C] = els;
        return { shown: [A,B,C,A,B,C,A], answer: B, distractors: [C, els[3]||A] };
      }
    },
    // AAB AAB A? (answer: A)
    {
      name: 'AAB',
      minItems: 2,
      build: (els) => {
        const [A,B] = els;
        return { shown: [A,A,B,A,A,B,A], answer: A, distractors: [B, els[2]||A] };
      }
    },
    // ABB ABB A? (answer: B)
    {
      name: 'ABB',
      minItems: 2,
      build: (els) => {
        const [A,B] = els;
        return { shown: [A,B,B,A,B,B,A], answer: B, distractors: [A, els[2]||B] };
      }
    },
    // AABB AABB A? (answer: A)
    {
      name: 'AABB',
      minItems: 2,
      build: (els) => {
        const [A,B] = els;
        return { shown: [A,A,B,B,A,A,B,B,A], answer: A, distractors: [B, els[2]||A] };
      }
    },
    // ABAC A? (answer: B)
    {
      name: 'ABAC',
      minItems: 3,
      build: (els) => {
        const [A,B,C] = els;
        return { shown: [A,B,A,C,A], answer: B, distractors: [C, els[3]||A] };
      }
    },
    // Rainbow: all 6 colors in sequence, 1–2–3–4–5–?
    {
      name: 'rainbow',
      minItems: 6,
      build: (els) => {
        const [A,B,C,D,E,F] = els;
        return { shown: [A,B,C,D,E], answer: F, distractors: [A,C] };
      }
    },
  ];

  const DIFFICULTY_WAVE = ['easy', 'medium', 'hard', 'medium'];

  function getDifficulty(round) { return DIFFICULTY_WAVE[round % 4]; }

  function getPatternTypesForDiff(diff) {
    if (diff === 'easy')   return [0, 1];           // AB, ABC
    if (diff === 'medium') return [0, 1, 2, 3];     // + AAB, ABB
    return [0, 1, 2, 3, 4, 5, 6];                   // all
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  let container, callbacks;
  let seqCount = 0, seqNeeded = 5;
  let blocked  = false;
  let currentOptions = null;

  // ── Start ────────────────────────────────────────────────────────

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
    const diff      = getDifficulty(opts.round || 0);
    const vocabIdx  = Math.floor((opts.rotationIndex || 0) / 3) % VOCABS.length;
    const vocab     = VOCABS[vocabIdx];

    // Pick pattern type
    const typeIdxPool = getPatternTypesForDiff(diff);
    const typeIdx     = typeIdxPool[Math.floor(Math.random() * typeIdxPool.length)];
    const pType       = PATTERN_TYPES[typeIdx];

    // Pick elements from vocab
    const els = shuffle(vocab).slice(0, Math.max(pType.minItems, 3));

    const { shown, answer, distractors } = pType.build(els);

    // Build choices: answer + distractors (unique)
    const choicePool = [answer, ...distractors.filter(d => d !== answer)];
    const uniqueChoices = [...new Set(choicePool)];
    while (uniqueChoices.length < 3) {
      const extra = vocab.find(v => !uniqueChoices.includes(v));
      if (extra) uniqueChoices.push(extra); else break;
    }
    const choices = shuffle(uniqueChoices).slice(0, 3);
    if (!choices.includes(answer)) choices[0] = answer;
    const finalChoices = shuffle(choices);

    currentOptions = opts;

    const itemsHtml = shown.map((item, i) =>
      `<div class="pattern-item" style="animation-delay:${i*0.07}s">${item}</div>`
    ).join('') + `<div class="pattern-item blank">?</div>`;

    container.innerHTML = `
      <div class="patterns-game">
        <div class="pattern-row">${itemsHtml}</div>
        <div class="pattern-choices">
          ${finalChoices.map(c => `
            <button class="pattern-choice-btn" data-val="${c}" data-correct="${c === answer}">
              ${c}
            </button>`).join('')}
        </div>
        <div class="pattern-progress">${seqCount} / ${seqNeeded}</div>
      </div>
    `;

    container.querySelectorAll('.pattern-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => handleChoice(btn, answer, opts));
    });
  }

  function handleChoice(btn, answer, opts) {
    if (blocked) return;
    const isCorrect = btn.dataset.correct === 'true';

    if (isCorrect) {
      blocked = true;
      btn.classList.add('correct');
      callbacks.onCorrect();
      seqCount++;

      // Fill the blank slot
      const blank = container.querySelector('.pattern-item.blank');
      if (blank) {
        blank.classList.remove('blank');
        blank.textContent = answer;
        blank.style.animationDelay = '0s';
        blank.classList.add('correct-flash');
      }

      setTimeout(() => {
        if (seqCount >= seqNeeded) {
          callbacks.onComplete(1);
        } else {
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
