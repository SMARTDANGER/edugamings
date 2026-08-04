/* ═══════════════════════════════════════
   PUZZLE GAME — tap-to-swap emoji puzzle
   ═══════════════════════════════════════ */

const PuzzleGame = (function () {

  // Themed emoji groups — each round picks one group so the scene feels
  // coherent. Emoji focus matters more than colour, so we draw distinct
  // emojis from a single group.
  const EMOJI_GROUPS = [
    ['🦁','🐯','🐻','🐼','🦊','🐰','🐶','🐱','🐸','🐺','🐮','🐷','🐹','🦝','🦔','🐲','🐗','🦄','🐴','🐵','🐧','🐔','🐤','🐣','🦒','🐘'],
    ['🐡','🐠','🐟','🐬','🦈','🐳','🐋','🦑','🦞','🦀','🐙','🦐','🐚','🐢','🐊','🪼','🦭','🐧','🪸','🪷'],
    ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍑','🍒','🍍','🥝','🍅','🥕','🌽','🥦','🍆','🥑','🥥','🍈','🍏','🥒','🫐','🍞'],
    ['🌸','🌹','🌻','🌷','🌺','🌼','🌿','🍀','🌱','🌳','🌲','🌴','🌵','🍃','🍂','🌾','💐','🪴','🌷','🥀'],
    ['🌙','⭐','✨','💫','🪐','🌍','☀️','🌠','🚀','🛸','☄️','🌟','🌞','🌝','🌎','🌏','🌑','🌒','🌓','🌔'],
    ['🐝','🐞','🦋','🐌','🕷️','🦗','🪲','🪳','🐛','🪰','🦟','🦂','🐜','🪱'],
    ['😀','😃','😄','😁','😆','😅','🤣','😊','🙂','😉','😍','😘','🥰','😎','🤩','🥳','😇','🤗','😺','😹'],
    ['🎈','🎁','🎀','🪀','🎮','🧸','🎨','🎲','🧩','🪁','⚽','🏀','🏈','🎾','🎯','🎳','🪅','🪆','🪄'],
    ['🍕','🍔','🍟','🌭','🍿','🥪','🌮','🌯','🥙','🍱','🍣','🍤','🍙','🍘','🥟','🍩','🍪','🎂','🍰','🧁','🍦','🍨','🍫','🍬','🍭'],
    ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🛺','🚲','🛴','🛹','🛼','✈️','🚀','🚁','🚂','🚉'],
  ];

  // Soft, distinguishable background colours.
  const COLOR_BANK = [
    '#FFB3BA','#FFDFBA','#FFFFBA','#BAFFC9','#BAE1FF',
    '#FFB6E1','#C8B6FF','#A8E6CF','#FFD3B6','#FFE5B4',
    '#B5EAD7','#C7CEEA','#FFDAC1','#E2F0CB','#FF9AA2',
    '#B5DEFF','#CAF1DE','#FFC8DD','#A0E7E5','#FBE7C6',
  ];

  // ─ Grid progression: keep 2×2 for a long time, then step up every 20 rounds.
  function getGridSize(round) {
    if (round < 20) return { cols: 2, rows: 2 };
    if (round < 40) return { cols: 3, rows: 3 };
    if (round < 60) return { cols: 4, rows: 4 };
    return { cols: 5, rows: 5 };  // max
  }

  // Last 5 rounds of each tier flip the focus to "color-focus":
  // similar/repeated emojis, all different colours.
  // Otherwise default to "emoji-focus": distinct emojis, repeated colours.
  function getMode(round) {
    let tierEnd;
    if      (round < 20) tierEnd = 20;
    else if (round < 40) tierEnd = 40;
    else if (round < 60) tierEnd = 60;
    else                 tierEnd = 60 + (Math.floor((round - 60) / 20) + 1) * 20;
    return (tierEnd - round <= 5) ? 'color-focus' : 'emoji-focus';
  }

  function pickN(arr, n) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, n);
  }

  function buildScene(round, rotIndex, cols, rows) {
    const n = cols * rows;
    const mode = getMode(round);
    const group = EMOJI_GROUPS[rotIndex % EMOJI_GROUPS.length];
    const cells = [];

    if (mode === 'emoji-focus') {
      // Distinct emojis (one per cell), small colour palette repeated per row.
      const emojis = pickN(group, Math.min(n, group.length));
      while (emojis.length < n) emojis.push(group[emojis.length % group.length]);
      const palette = pickN(COLOR_BANK, Math.min(rows, 4));
      for (let i = 0; i < n; i++) {
        cells.push({
          emoji: emojis[i],
          bg:    palette[Math.floor(i / cols) % palette.length],
        });
      }
    } else {
      // Color-focus: 1–2 emojis repeat, every cell gets a distinct colour.
      const emojiCount = Math.min(2, group.length);
      const emojis = pickN(group, emojiCount);
      const colors = pickN(COLOR_BANK, n);
      for (let i = 0; i < n; i++) {
        cells.push({
          emoji: emojis[i % emojis.length],
          bg:    colors[i],
        });
      }
    }
    return { name: 'gen', cells };
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

    gridSize = getGridSize(opts.round || 0);
    scene    = buildScene(opts.round || 0, opts.rotationIndex || 0, gridSize.cols, gridSize.rows);

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

    // Shrink preview cells as the grid grows so the thumbnail stays small.
    const previewSize = Math.max(18, 44 - cols * 5);  // 2:34 3:29 4:24 5:19

    container.innerHTML = `
      <div class="puzzle-game">
        <div class="puzzle-preview">
          <div class="puzzle-preview-grid"
               style="grid-template-columns:repeat(${cols},${previewSize}px)">
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
