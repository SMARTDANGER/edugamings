/* ═══════════════════════════════════════
   LETTERS GAME — early literacy
   Three skills rotate by difficulty:
     • match   → recognise an uppercase letter
     • case    → pair an uppercase letter with its lowercase
     • phonics → choose the letter a picture starts with
   ═══════════════════════════════════════ */

const LettersGame = (function () {

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Curated picture words with a clear, kid-friendly emoji for phonics.
  const PHONICS = [
    { letter: 'A', word: 'Apple',    emoji: '🍎' },
    { letter: 'B', word: 'Ball',     emoji: '⚽' },
    { letter: 'C', word: 'Cat',      emoji: '🐱' },
    { letter: 'D', word: 'Dog',      emoji: '🐶' },
    { letter: 'E', word: 'Egg',      emoji: '🥚' },
    { letter: 'F', word: 'Fish',     emoji: '🐟' },
    { letter: 'G', word: 'Grapes',   emoji: '🍇' },
    { letter: 'H', word: 'Hat',      emoji: '🎩' },
    { letter: 'L', word: 'Lion',     emoji: '🦁' },
    { letter: 'M', word: 'Moon',     emoji: '🌙' },
    { letter: 'O', word: 'Octopus',  emoji: '🐙' },
    { letter: 'P', word: 'Pig',      emoji: '🐷' },
    { letter: 'R', word: 'Rainbow',  emoji: '🌈' },
    { letter: 'S', word: 'Sun',      emoji: '☀️' },
    { letter: 'T', word: 'Tree',     emoji: '🌳' },
    { letter: 'W', word: 'Whale',    emoji: '🐳' },
  ];

  // easy → match, medium → case, hard → phonics (with a gentle wave)
  const MODE_WAVE = ['match', 'case', 'phonics', 'case'];

  let container, callbacks;
  let seqCount = 0, seqNeeded = 4;
  let blocked  = false;

  function getMode(round) { return MODE_WAVE[round % MODE_WAVE.length]; }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Build n unique choices that always include `correct`.
  function buildChoices(correct, pool, n) {
    const set = new Set([correct]);
    const bag = shuffle(pool);
    for (const item of bag) {
      if (set.size >= n) break;
      set.add(item);
    }
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

  function renderQuestion(opts) {
    blocked = false;
    const mode = getMode((opts.round || 0) + seqCount);

    let promptHtml, choices, answer, label;

    if (mode === 'phonics') {
      const pick = PHONICS[Math.floor(Math.random() * PHONICS.length)];
      answer  = pick.letter;
      label   = 'Which letter does it start with?';
      promptHtml = `
        <div class="letter-picture">${pick.emoji}</div>
        <div class="letter-word"><span class="letter-word-first">${pick.letter}</span>${pick.word.slice(1).toLowerCase()}</div>`;
      choices = buildChoices(answer, ALPHABET, 3);
    } else if (mode === 'case') {
      const upper = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      answer  = upper.toLowerCase();
      label   = 'Find the small letter!';
      promptHtml = `<div class="letter-display">${upper}</div>`;
      choices = buildChoices(answer, ALPHABET.map(c => c.toLowerCase()), 3);
    } else { // match
      const upper = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      answer  = upper;
      label   = 'Find the matching letter!';
      promptHtml = `<div class="letter-display">${upper}</div>`;
      choices = buildChoices(answer, ALPHABET, 3);
    }

    container.innerHTML = `
      <div class="letters-game">
        <div class="letter-prompt">
          <div class="letter-prompt-label">${label}</div>
          ${promptHtml}
        </div>
        <div class="letter-choices">
          ${choices.map(c => `
            <button class="letter-choice-btn" data-val="${c}" data-correct="${c === answer}">
              ${c}
            </button>`).join('')}
        </div>
        <div class="seq-progress">${seqCount} / ${seqNeeded}</div>
      </div>
    `;

    container.querySelectorAll('.letter-choice-btn').forEach(btn => {
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

      setTimeout(() => {
        if (seqCount >= seqNeeded) callbacks.onComplete(1);
        else                       renderQuestion(opts);
      }, 650);
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
