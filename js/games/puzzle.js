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

  // Drag-to-swap state
  let dragSlot     = -1;
  let dragGhost    = null;
  let dragStartX   = 0;
  let dragStartY   = 0;
  let dragMoved    = false;
  let dragOffsetX  = 0;
  let dragOffsetY  = 0;
  let lastHoverEl  = null;

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
          <div class="puzzle-preview-grid"
               style="grid-template-columns:repeat(${cols},32px)">
            ${previewCells}
          </div>
          <div class="puzzle-arrow" aria-hidden="true">⬇️</div>
        </div>
        <div class="puzzle-board"
             style="grid-template-columns:repeat(${cols},1fr)">
          ${boardCells}
        </div>
      </div>
    `;

    container.querySelectorAll('.puzzle-piece').forEach(attachPieceHandlers);
  }

  // ── Drag-to-swap (pointer-based, works on touch and mouse) ───────

  function attachPieceHandlers(el) {
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup',   onPointerUp);
    el.addEventListener('pointercancel', onPointerCancel);
  }

  function onPointerDown(e) {
    if (blocked) return;
    const el = e.currentTarget;
    dragSlot   = parseInt(el.dataset.slot);
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragMoved  = false;
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
  }

  function onPointerMove(e) {
    if (dragSlot === -1) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    if (!dragMoved && Math.hypot(dx, dy) > 6) {
      dragMoved = true;
      startGhost(dragSlot, e.clientX, e.clientY);
    }
    if (dragMoved) {
      moveGhost(e.clientX, e.clientY);
      updateHoverTarget(e.clientX, e.clientY);
    }
  }

  function onPointerUp(e) {
    if (dragSlot === -1) return;
    if (dragMoved) {
      const target = pieceAtPoint(e.clientX, e.clientY);
      endGhost();
      const targetSlot = target ? parseInt(target.dataset.slot) : -1;
      const src = dragSlot;
      dragSlot = -1;
      if (targetSlot !== -1 && targetSlot !== src) {
        swapSlots(src, targetSlot);
      }
    } else {
      // Treat as a tap — keep tap-to-swap as a fallback
      const slot = dragSlot;
      dragSlot = -1;
      handleTap(slot);
    }
  }

  function onPointerCancel() {
    endGhost();
    dragSlot  = -1;
    dragMoved = false;
  }

  function startGhost(slot, x, y) {
    const els = container.querySelectorAll('.puzzle-piece');
    const src = els[slot];
    if (!src) return;
    const rect = src.getBoundingClientRect();
    dragGhost = src.cloneNode(true);
    dragGhost.classList.add('drag-ghost');
    dragGhost.classList.remove('selected', 'correct-pos');
    dragGhost.style.position = 'fixed';
    dragGhost.style.left   = rect.left + 'px';
    dragGhost.style.top    = rect.top + 'px';
    dragGhost.style.width  = rect.width + 'px';
    dragGhost.style.height = rect.height + 'px';
    dragGhost.style.margin = '0';
    dragOffsetX = x - rect.left - rect.width / 2;
    dragOffsetY = y - rect.top - rect.height / 2;
    document.body.appendChild(dragGhost);
    src.classList.add('drag-source');
  }

  function moveGhost(x, y) {
    if (!dragGhost) return;
    const w = dragGhost.offsetWidth;
    const h = dragGhost.offsetHeight;
    dragGhost.style.left = (x - w / 2 - dragOffsetX) + 'px';
    dragGhost.style.top  = (y - h / 2 - dragOffsetY) + 'px';
  }

  function updateHoverTarget(x, y) {
    const target = pieceAtPoint(x, y);
    if (target === lastHoverEl) return;
    if (lastHoverEl) lastHoverEl.classList.remove('drop-target');
    lastHoverEl = target && parseInt(target.dataset.slot) !== dragSlot ? target : null;
    if (lastHoverEl) lastHoverEl.classList.add('drop-target');
  }

  function pieceAtPoint(x, y) {
    if (dragGhost) dragGhost.style.display = 'none';
    const el = document.elementFromPoint(x, y);
    if (dragGhost) dragGhost.style.display = '';
    return el ? el.closest('.puzzle-piece') : null;
  }

  function endGhost() {
    if (dragGhost) { dragGhost.remove(); dragGhost = null; }
    if (lastHoverEl) { lastHoverEl.classList.remove('drop-target'); lastHoverEl = null; }
    container && container.querySelectorAll('.drag-source').forEach(el =>
      el.classList.remove('drag-source')
    );
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
    endGhost();
    container = null;
    callbacks = null;
    blocked   = true;
    selectedSlot = -1;
    dragSlot     = -1;
  }

  return { start, cleanup };
})();
