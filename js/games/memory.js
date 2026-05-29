/* ═══════════════════════════════════════
   MEMORY GAME — emoji card matching
   ═══════════════════════════════════════ */

const MemoryGame = (function () {

  // Unique emojis only — a duplicate would let cards from two different
  // pairs match each other and break the win condition.
  const EMOJI_POOL = [
    '🐶','🐱','🐸','🦊','🐼','🦄','🐧','🦋',
    '🐝','🦕','🐳','🦒','🐘','🦁','🦀','🐙',
    '🦔','🐺','🦅','🐬','🌸','🍎','🍕','🎸',
    '🚀','🌈','⚽','🎺','🏄','🎃','🌺','🍉',
  ];

  const CARD_BACKS = ['⭐','🌟','🎵','🎀'];

  const DIFFICULTY_WAVE = ['easy', 'medium', 'hard', 'medium'];
  const PAIRS_BY_DIFF = { easy: 4, medium: 6, hard: 8 };

  let container, callbacks;
  let cards      = [];    // { emoji, id, matched, flipped }
  let flipped    = [];    // indices currently face-up (unmatched)
  let matched    = 0;
  let totalPairs = 4;
  let blocked    = false;
  let cardBackEmoji = '⭐';
  let showAllTimeout = null;

  function getDifficulty(round) {
    return DIFFICULTY_WAVE[round % 4];
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
    blocked   = false;
    flipped   = [];
    matched   = 0;

    const diff   = getDifficulty(opts.round || 0);
    totalPairs   = PAIRS_BY_DIFF[diff];

    // Rotate card back design every 5 rounds
    const backIdx = Math.floor((opts.round || 0) / 5) % CARD_BACKS.length;
    cardBackEmoji = CARD_BACKS[backIdx];

    // Pick emoji pairs from rotation index
    const startEmoji = (opts.rotationIndex || 0) % (EMOJI_POOL.length - totalPairs);
    const chosen = EMOJI_POOL.slice(startEmoji, startEmoji + totalPairs);
    const pairs  = shuffle([...chosen, ...chosen]);

    cards = pairs.map((emoji, i) => ({
      emoji,
      id: i,
      matched: false,
      flipped: false,
    }));

    render();

    // "Dark mode" round every 7 game rounds: briefly show all cards
    const isDarkRound = (opts.round || 0) > 0 && (opts.round % 7 === 0);
    if (isDarkRound) doFlashReveal();
  }

  // ── Render ───────────────────────────────────────────────────────

  function render() {
    const cols = Math.ceil(Math.sqrt(cards.length));

    container.innerHTML = `
      <div class="memory-game">
        <div class="memory-board"
             style="grid-template-columns:repeat(${cols},1fr)">
          ${cards.map((c, i) => `
            <div class="memory-card ${c.flipped ? 'flipped' : ''} ${c.matched ? 'matched' : ''}"
                 data-idx="${i}">
              <div class="memory-card-inner">
                <div class="memory-card-front">
                  <span class="card-back-pattern">${cardBackEmoji}</span>
                </div>
                <div class="memory-card-back">${c.emoji}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.memory-card').forEach(el => {
      el.addEventListener('click', () => handleCardTap(parseInt(el.dataset.idx)));
    });
  }

  // ── Flash reveal (dark mode round) ───────────────────────────────

  function doFlashReveal() {
    blocked = true;
    // Flip all face-up briefly
    cards.forEach((_, i) => flipCard(i, true));
    setTimeout(() => {
      cards.forEach((c, i) => { if (!c.matched) flipCard(i, false); });
      blocked = false;
    }, 1500);
  }

  // ── Interaction ──────────────────────────────────────────────────

  function handleCardTap(idx) {
    if (blocked) return;
    const card = cards[idx];
    if (!card || card.matched || card.flipped) return;
    if (flipped.length >= 2) return;

    flipCard(idx, true);
    flipped.push(idx);

    if (flipped.length === 2) {
      blocked = true;
      setTimeout(() => checkMatch(), 700);
    }
  }

  function checkMatch() {
    const [a, b] = flipped;
    if (cards[a].emoji === cards[b].emoji) {
      // Match!
      cards[a].matched = true;
      cards[b].matched = true;
      matched++;

      updateCardDOM(a, true);
      updateCardDOM(b, true);
      callbacks.onCorrect();
      flipped = [];
      blocked = false;

      if (matched >= totalPairs) {
        blocked = true;
        setTimeout(() => callbacks.onComplete(1), 600);
      }
    } else {
      // No match
      callbacks.onWrong();
      flipCard(a, false);
      flipCard(b, false);
      flipped = [];
      setTimeout(() => { blocked = false; }, 200);
    }
  }

  function flipCard(idx, faceUp) {
    cards[idx].flipped = faceUp;
    const el = container.querySelector(`.memory-card[data-idx="${idx}"]`);
    if (!el) return;
    if (faceUp) el.classList.add('flipped');
    else        el.classList.remove('flipped');
  }

  function updateCardDOM(idx, matched) {
    const el = container.querySelector(`.memory-card[data-idx="${idx}"]`);
    if (!el) return;
    if (matched) el.classList.add('matched');
  }

  function cleanup() {
    if (showAllTimeout) clearTimeout(showAllTimeout);
    container = null;
    callbacks = null;
    blocked   = true;
  }

  return { start, cleanup };
})();
