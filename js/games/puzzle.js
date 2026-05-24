/* ═══════════════════════════════════════
   PUZZLE GAME — tap-to-swap emoji puzzle
   ═══════════════════════════════════════ */

const PuzzleGame = (function () {

  // Each scene: rows × cols grid of { bg, emoji }
  const SCENES = [
    {
      name: 'garden',
      cells: [
        {bg:'#87CEEB',emoji:'☀️'}, {bg:'#87CEEB',emoji:'⛅'},
        {bg:'#90EE90',emoji:'🌸'}, {bg:'#90EE90',emoji:'🌺'},
      ]
    },
    {
      name: 'ocean',
      cells: [
        {bg:'#87CEEB',emoji:'⛵'}, {bg:'#87CEEB',emoji:'🌤️'},
        {bg:'#006994',emoji:'🐬'}, {bg:'#006994',emoji:'🐠'},
      ]
    },
    {
      name: 'space',
      cells: [
        {bg:'#1a1a4e',emoji:'🌙'}, {bg:'#1a1a4e',emoji:'⭐'},
        {bg:'#1a1a4e',emoji:'🚀'}, {bg:'#1a1a4e',emoji:'🪐'},
      ]
    },
    {
      name: 'jungle',
      cells: [
        {bg:'#228B22',emoji:'🦁'}, {bg:'#228B22',emoji:'🦒'},
        {bg:'#228B22',emoji:'🐘'}, {bg:'#228B22',emoji:'🦓'},
      ]
    },
    {
      name: 'farm',
      cells: [
        {bg:'#87CEEB',emoji:'☀️'}, {bg:'#c8e6c9',emoji:'🌻'},
        {bg:'#a5d6a7',emoji:'🐔'}, {bg:'#ffcc80',emoji:'🐄'},
      ]
    },
    // 3×3 scenes
    {
      name: 'underwater',
      cells: [
        {bg:'#006994',emoji:'🌊'},{bg:'#006994',emoji:'🐬'},{bg:'#006994',emoji:'🌊'},
        {bg:'#004f7c',emoji:'🦀'},{bg:'#004f7c',emoji:'🐙'},{bg:'#004f7c',emoji:'🐡'},
        {bg:'#003355',emoji:'🌊'},{bg:'#003355',emoji:'🦈'},{bg:'#003355',emoji:'🌊'},
      ]
    },
    {
      name: 'night sky',
      cells: [
        {bg:'#0d1b2a',emoji:'⭐'},{bg:'#0d1b2a',emoji:'🌙'},{bg:'#0d1b2a',emoji:'⭐'},
        {bg:'#1b2838',emoji:'🚀'},{bg:'#1b2838',emoji:'🌎'},{bg:'#1b2838',emoji:'🛸'},
        {bg:'#2c3e50',emoji:'⭐'},{bg:'#2c3e50',emoji:'☄️'},{bg:'#2c3e50',emoji:'⭐'},
      ]
    },
    // 3×4 scene
    {
      name: 'rainbow',
      cells: [
        {bg:'#FF4444',emoji:'🌹'},{bg:'#FF8800',emoji:'🍊'},{bg:'#FFD700',emoji:'🌟'},{bg:'#44BB44',emoji:'🌿'},
        {bg:'#4488FF',emoji:'💧'},{bg:'#9944FF',emoji:'🔮'},{bg:'#FF69B4',emoji:'🌸'},{bg:'#FF4444',emoji:'❤️'},
        {bg:'#FF8800',emoji:'🔥'},{bg:'#FFD700',emoji:'⭐'},{bg:'#44BB44',emoji:'🍃'},{bg:'#4488FF',emoji:'🐬'},
      ]
    },
  ];

  function getGridSize(round, totalRounds) {
    if (totalRounds < 5 || round < 3) return { cols: 2, rows: 2 };
    if (totalRounds < 20 || round < 10) return { cols: 3, rows: 3 };
    return { cols: 4, rows: 3 };
  }

  function getScene(rotIndex, cols, rows) {
    const size = cols * rows;
    const scenesForSize = SCENES.filter(s => s.cells.length === size);
    const pool = scenesForSize.length ? scenesForSize : SCENES.filter(s => s.cells.length === 4);
    return pool[rotIndex % pool.length];
  }

  let container, callbacks;
  let pieces    = [];     // { correctIdx, currentIdx } — track logical positions
  let displayed = [];     // displayed emoji+bg per slot
  let selectedSlot = -1;
  let solvedMask   = [];
  let gridSize     = { cols: 2, rows: 2 };
  let blocked      = false;
  let scene        = null;

  // ── Start ────────────────────────────────────────────────────────

  function start(cont, opts, cbs) {
    container = cont;
    callbacks = cbs;
    blocked   = false;
    selectedSlot = -1;

    gridSize = getGridSize(opts.round || 0, opts.totalRounds || 0);
    scene    = getScene(opts.rotationIndex || 0, gridSize.cols, gridSize.rows);

    // Build shuffled piece array
    const n = gridSize.cols * gridSize.rows;
    pieces   = shuffle(Array.from({ length: n }, (_, i) => i));
    displayed = pieces.map(pi => scene.cells[pi]);
    solvedMask = Array(n).fill(false);

    render();
  }

  function shuffle(arr) {
    const a = [...arr];
    // Make sure it's not already solved
    let sorted = false;
    let tries = 0;
    while (!sorted || isAlreadySolved(a)) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      sorted = true;
      tries++;
      if (tries > 50) break;
    }
    return a;
  }

  function isAlreadySolved(arr) {
    return arr.every((v, i) => v === i);
  }

  // ── Render ───────────────────────────────────────────────────────

  function render() {
    const { cols, rows } = gridSize;
    const n = cols * rows;
    const previewCells = scene.cells.map(c =>
      `<div class="preview-cell" style="background:${c.bg}">${c.emoji}</div>`
    ).join('');

    const boardCells = Array.from({ length: n }, (_, slot) => {
      const pieceIdx = pieces.indexOf(slot);  // which piece is in this slot?
      // pieces[i] = the correct-index of the piece currently in slot i
      // Actually: pieces is "piece at slot i has correct position pieces[i]"
      const cell = displayed[slot];
      const isSolved = pieces[slot] === slot;
      return `
        <div class="puzzle-piece ${isSolved ? 'correct-pos' : ''}"
             data-slot="${slot}"
             style="background:${cell.bg}">
          ${cell.emoji}
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="puzzle-game">
        <div class="puzzle-preview">
          <div class="puzzle-preview-label">Complete the picture!</div>
          <div class="puzzle-preview-grid"
               style="grid-template-columns:repeat(${cols},32px)">
            ${previewCells}
          </div>
        </div>
        <div class="puzzle-board"
             style="grid-template-columns:repeat(${cols},1fr)">
          ${boardCells}
        </div>
      </div>
    `;

    container.querySelectorAll('.puzzle-piece').forEach(el => {
      el.addEventListener('click', () => handleTap(parseInt(el.dataset.slot)));
    });
  }

  // ── Interaction ──────────────────────────────────────────────────

  function handleTap(slot) {
    if (blocked) return;

    if (selectedSlot === -1) {
      // Select
      selectedSlot = slot;
      updateSlotHighlight(slot, true);
    } else if (selectedSlot === slot) {
      // Deselect
      updateSlotHighlight(slot, false);
      selectedSlot = -1;
    } else {
      // Swap
      swapSlots(selectedSlot, slot);
      updateSlotHighlight(selectedSlot, false);
      selectedSlot = -1;
    }
  }

  function swapSlots(a, b) {
    // Swap in pieces & displayed arrays
    [pieces[a],   pieces[b]]   = [pieces[b],   pieces[a]];
    [displayed[a], displayed[b]] = [displayed[b], displayed[a]];

    // Reward only when a piece lands in its correct slot
    if (pieces[a] === a || pieces[b] === b) {
      callbacks.onCorrect();
    } else {
      callbacks.onWrong();
    }

    // Update DOM
    const els = container.querySelectorAll('.puzzle-piece');
    const elA = els[a], elB = els[b];

    elA.classList.add('swap-anim');
    elB.classList.add('swap-anim');
    setTimeout(() => {
      elA.classList.remove('swap-anim');
      elB.classList.remove('swap-anim');
    }, 260);

    // Update content
    elA.style.background = displayed[a].bg;
    elA.innerHTML = displayed[a].emoji;
    elB.style.background = displayed[b].bg;
    elB.innerHTML = displayed[b].emoji;

    // Update correct-pos classes
    [a, b].forEach(slot => {
      const el = els[slot];
      if (pieces[slot] === slot) {
        el.classList.add('correct-pos');
        el.dataset.slot = slot;
      } else {
        el.classList.remove('correct-pos');
      }
    });

    // Check win
    if (pieces.every((p, i) => p === i)) {
      blocked = true;
      // Flash all as solved
      els.forEach((el, i) => {
        setTimeout(() => el.classList.add('correct-pos'), i * 60);
      });
      setTimeout(() => callbacks.onComplete(1), 700);
    }
  }

  function updateSlotHighlight(slot, selected) {
    const el = container.querySelectorAll('.puzzle-piece')[slot];
    if (!el) return;
    if (selected) el.classList.add('selected');
    else          el.classList.remove('selected');
  }

  function cleanup() {
    container = null;
    callbacks = null;
    blocked   = true;
    selectedSlot = -1;
  }

  return { start, cleanup };
})();
