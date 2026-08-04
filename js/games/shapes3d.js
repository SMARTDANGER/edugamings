/* ═══════════════════════════════════════
   SHAPES 3D — pick the matching rotating 3D shape
   ═══════════════════════════════════════ */

const Shapes3DGame = (function () {

  const PALETTE = [0xFF6B6B, 0x4ECDC4, 0xFFE66D, 0x95E1D3, 0xAA96DA, 0xFFB6E1, 0xF6BD60, 0x5FA8D3];
  const DIFF_WAVE = ['easy', 'medium', 'hard', 'medium'];
  const CHOICE_COUNT_BY_DIFF = { easy: 3, medium: 4, hard: 4 };

  let callbacks  = null;
  let blocked    = false;
  let rafId      = null;
  let mainSlot   = null;   // ThreeEngine.mount() result
  let mainScene  = null;
  let mainCam    = null;
  let mainMesh   = null;
  let correctIdx = -1;

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  function start(container, opts, cbs) {
    // Defensive: if a previous round left state behind, dispose it first
    // so we never run two concurrent rAF loops or stack two scenes.
    cleanup();

    callbacks = cbs;
    blocked   = false;

    const round = opts.round || 0;
    const diff  = DIFF_WAVE[round % 4];
    const n     = CHOICE_COUNT_BY_DIFF[diff];

    const allTypes = ThreeEngine.SHAPE_TYPES;
    const types    = shuffle(allTypes).slice(0, n);
    const correct  = types[Math.floor(Math.random() * types.length)];
    correctIdx     = types.indexOf(correct);

    const mainColor = PALETTE[(opts.rotationIndex || 0) % PALETTE.length];

    container.innerHTML = `
      <div class="shapes3d-game">
        <div class="shapes3d-main" id="s3d-main"></div>
        <div class="shapes3d-prompt">${shapeIconHtml(correct, mainColor)}</div>
        <div class="shapes3d-choices">
          ${types.map((t, i) => {
            const color = PALETTE[(i + (opts.rotationIndex || 0) + 1) % PALETTE.length];
            return `
              <button class="shapes3d-choice" data-idx="${i}" data-type="${t}"
                      style="background:#${color.toString(16).padStart(6,'0')}22;
                             border-color:#${color.toString(16).padStart(6,'0')}">
                ${shapeIconHtml(t, color)}
              </button>`;
          }).join('')}
        </div>
      </div>
    `;

    // Build the main rotating 3D scene
    const T    = window.THREE;
    const host = document.getElementById('s3d-main');
    mainSlot   = ThreeEngine.mount(host);
    mainScene  = new T.Scene();
    ThreeEngine.addLights(mainScene);
    mainMesh = ThreeEngine.makeMesh(correct, mainColor);
    mainScene.add(mainMesh);
    mainCam = new T.PerspectiveCamera(40, mainSlot.width() / mainSlot.height(), 0.1, 50);
    mainCam.position.set(0, 0.4, 3.6);
    mainCam.lookAt(0, 0, 0);

    // Wire choices
    container.querySelectorAll('.shapes3d-choice').forEach(btn => {
      btn.addEventListener('click', () => handleChoice(parseInt(btn.dataset.idx, 10), btn));
    });

    // Animation loop — bounded to ~60 FPS by rAF.
    let lastT = performance.now();
    function tick(now) {
      if (!mainMesh || !mainSlot) return;
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      mainMesh.rotation.y += dt * 0.9;
      mainMesh.rotation.x += dt * 0.5;
      // Resize-aware camera
      const w = mainSlot.width(), h = mainSlot.height();
      if (mainCam.aspect !== w / h) {
        mainCam.aspect = w / h;
        mainCam.updateProjectionMatrix();
      }
      mainSlot.renderer.render(mainScene, mainCam);
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    ThreeEngine.registerActive(cleanup);
    return cleanup;
  }

  // 2D SVG icon used inside the choice buttons. Cheap, no extra WebGL
  // contexts. Faces a 3/4 view so cubes/cones look 3-D-ish.
  function shapeIconHtml(type, color) {
    const fill = '#' + color.toString(16).padStart(6, '0');
    const dark = '#' + ((color >> 1) & 0x7F7F7F).toString(16).padStart(6, '0');
    switch (type) {
      case 'cube':
        return `<svg viewBox="0 0 60 60" class="s3d-icon">
          <polygon points="10,20 30,8 50,20 30,32" fill="${fill}" stroke="${dark}" stroke-width="1.5"/>
          <polygon points="10,20 30,32 30,55 10,42" fill="${dark}" stroke="${dark}" stroke-width="1.5"/>
          <polygon points="50,20 30,32 30,55 50,42" fill="${fill}" stroke="${dark}" stroke-width="1.5" opacity="0.85"/>
        </svg>`;
      case 'sphere':
        return `<svg viewBox="0 0 60 60" class="s3d-icon">
          <defs><radialGradient id="g${color}" cx="35%" cy="30%"><stop offset="0%" stop-color="white" stop-opacity="0.7"/><stop offset="60%" stop-color="${fill}"/><stop offset="100%" stop-color="${dark}"/></radialGradient></defs>
          <circle cx="30" cy="30" r="22" fill="url(#g${color})" stroke="${dark}" stroke-width="1.5"/>
        </svg>`;
      case 'cone':
        return `<svg viewBox="0 0 60 60" class="s3d-icon">
          <polygon points="30,8 12,46 48,46" fill="${fill}" stroke="${dark}" stroke-width="1.5"/>
          <ellipse cx="30" cy="46" rx="18" ry="5" fill="${dark}"/>
        </svg>`;
      case 'cylinder':
        return `<svg viewBox="0 0 60 60" class="s3d-icon">
          <rect x="12" y="14" width="36" height="32" fill="${fill}" stroke="${dark}" stroke-width="1.5"/>
          <ellipse cx="30" cy="14" rx="18" ry="6" fill="${fill}" stroke="${dark}" stroke-width="1.5"/>
          <ellipse cx="30" cy="46" rx="18" ry="6" fill="${dark}" stroke="${dark}" stroke-width="1.5"/>
        </svg>`;
      case 'torus':
        return `<svg viewBox="0 0 60 60" class="s3d-icon">
          <ellipse cx="30" cy="32" rx="22" ry="14" fill="none" stroke="${fill}" stroke-width="9"/>
          <ellipse cx="30" cy="32" rx="22" ry="14" fill="none" stroke="${dark}" stroke-width="1.5"/>
          <ellipse cx="30" cy="32" rx="10" ry="5" fill="none" stroke="${dark}" stroke-width="1.5"/>
        </svg>`;
      case 'pyramid':
        return `<svg viewBox="0 0 60 60" class="s3d-icon">
          <polygon points="30,6 10,48 30,40" fill="${fill}" stroke="${dark}" stroke-width="1.5"/>
          <polygon points="30,6 50,48 30,40" fill="${dark}" stroke="${dark}" stroke-width="1.5"/>
          <polygon points="10,48 30,40 50,48 30,55" fill="${dark}" opacity="0.7"/>
        </svg>`;
    }
    return '';
  }

  function handleChoice(idx, btn) {
    if (blocked) return;
    if (idx === correctIdx) {
      blocked = true;
      btn.classList.add('correct');
      callbacks.onCorrect();
      // Make the main shape happy
      if (mainMesh) {
        const start = mainMesh.scale.x;
        const since = performance.now();
        function pulse(now) {
          const t = Math.min(1, (now - since) / 500);
          const s = start + Math.sin(t * Math.PI) * 0.25;
          mainMesh.scale.set(s, s, s);
          if (t < 1) requestAnimationFrame(pulse);
        }
        requestAnimationFrame(pulse);
      }
      setTimeout(() => callbacks.onComplete(1), 900);
    } else {
      btn.classList.add('wrong');
      callbacks.onWrong();
      setTimeout(() => btn.classList.remove('wrong'), 700);
    }
  }

  function cleanup() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (mainSlot) {
      mainSlot.detach();
      mainSlot = null;
    }
    if (mainScene) {
      ThreeEngine.disposeScene(mainScene);
      mainScene = null;
    }
    mainMesh = null;
    mainCam  = null;
  }

  return { start, cleanup };
})();
