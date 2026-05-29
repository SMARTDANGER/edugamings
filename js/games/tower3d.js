/* ═══════════════════════════════════════
   TOWER 3D — build the target structure by dropping the right
   shape in the right order
   ═══════════════════════════════════════ */

const Tower3DGame = (function () {

  const SHAPE_TYPES  = ['cube', 'sphere', 'cylinder', 'cone'];
  const BLOCK_COLORS = [0xFF6B6B, 0x4ECDC4, 0xFFD93D, 0xAA96DA, 0x95E1D3, 0xFFB6E1, 0x6BCF7F, 0xFF8E53];
  const DIFF_WAVE = ['easy', 'medium', 'hard', 'medium'];
  const HEIGHT_BY_DIFF = { easy: 3, medium: 4, hard: 5 };

  // Height of one stacked layer. Blocks are scaled to roughly this tall so
  // they look like solid 3D objects sitting on each other — not flat discs.
  const LAYER_H = 0.92;

  // Per-shape scale that keeps each block ~LAYER_H tall WITHOUT squashing it.
  // (Geometry native heights: cube 1, sphere ⌀1.3, cylinder 1.15, cone 1.3.)
  function blockScale(type) {
    switch (type) {
      case 'sphere':   return [0.70, 0.70, 0.70]; // round ball, ⌀≈0.9
      case 'cylinder': return [0.84, 0.80, 0.84]; // upright cylinder
      case 'cone':     return [0.72, 0.72, 0.72]; // proper cone
      case 'cube':
      default:         return [0.92, 0.92, 0.92]; // solid cube
    }
  }

  let callbacks  = null;
  let blocked    = false;
  let rafId      = null;
  let slot       = null;
  let scene      = null;
  let camera     = null;
  let blocks     = [];     // meshes already placed
  let pending    = null;   // { mesh, targetY, vy, vx, wrong, settled }
  let target     = [];     // [{ type, color }] bottom → top
  let nextIdx    = 0;
  let host       = null;

  function pickN(arr, n) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, n);
  }

  function buildTarget(height) {
    const t = [];
    for (let i = 0; i < height; i++) {
      // Mix shapes so the tower is varied. Two adjacent blocks may
      // share a type — that's fine, it forces the child to look at
      // the whole tower instead of guessing alternations.
      t.push({
        type:  SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)],
        color: BLOCK_COLORS[i % BLOCK_COLORS.length],
      });
    }
    return t;
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  function start(container, opts, cbs) {
    cleanup();

    callbacks = cbs;
    blocked   = false;
    blocks    = [];
    pending   = null;
    nextIdx   = 0;

    const round  = opts.round || 0;
    const diff   = DIFF_WAVE[round % 4];
    const height = HEIGHT_BY_DIFF[diff];
    target = buildTarget(height);

    // Build the choice set: every shape type that's in the target,
    // plus one extra distractor if there's room, so the child can't
    // win by spamming a single button.
    const usedShapes = [...new Set(target.map(t => t.type))];
    const choices    = usedShapes.slice();
    SHAPE_TYPES.forEach(s => {
      if (!choices.includes(s) && choices.length < Math.min(4, usedShapes.length + 1)) {
        choices.push(s);
      }
    });
    // Shuffle so the correct first shape isn't always button #1
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    container.innerHTML = `
      <div class="tower3d-game">
        <div class="tower3d-target" id="tower3d-target">
          ${renderTargetPreview()}
        </div>
        <div class="tower3d-stage" id="tower3d-stage"></div>
        <div class="tower3d-shape-choices">
          ${choices.map(s => `
            <button class="tower3d-choice" data-shape="${s}" aria-label="${s}">
              ${shapeIconSvg(s)}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    const T = window.THREE;
    host  = document.getElementById('tower3d-stage');
    slot  = ThreeEngine.mount(host);
    scene = new T.Scene();
    ThreeEngine.addLights(scene);

    // Ground — cached geometry
    const ground = ThreeEngine.makeMesh('ground', 0x6f86b9);
    ground.material.opacity     = 0.35;
    ground.material.transparent = true;
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    scene.add(ground);

    camera = new T.PerspectiveCamera(38, slot.width() / slot.height(), 0.1, 50);
    camera.position.set(3.0, 3.0, 5.2);
    camera.lookAt(0, 1, 0);

    container.querySelectorAll('.tower3d-choice').forEach(btn => {
      btn.addEventListener('click', () => attemptDrop(btn.dataset.shape, btn));
    });

    let lastT = performance.now();
    function tick(now) {
      if (!slot) return;
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      stepPhysics(dt);

      // Slow orbit so the tower can be inspected from all sides. Pull the
      // camera back and up as the tower grows so it always stays framed.
      const orbitAngle = (now / 7000);
      const stackH = blocks.length * LAYER_H;
      const radius = 4.6 + Math.max(0, stackH - 1.5) * 0.55;
      camera.position.x = Math.sin(orbitAngle) * radius;
      camera.position.z = Math.cos(orbitAngle) * radius;
      camera.position.y = 2.6 + stackH * 0.5;
      camera.lookAt(0, Math.max(0.8, stackH * 0.5), 0);

      const w = slot.width(), h = slot.height();
      if (camera.aspect !== w / h) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      slot.renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    ThreeEngine.registerActive(cleanup);
    return cleanup;
  }

  function renderTargetPreview() {
    // Bottom of tower listed last → reverse for display so the icon
    // closest to the stage is the next expected slot.
    return target.map((t, i) => {
      const isNext = i === nextIdx;
      const isDone = i < nextIdx;
      const cls    = ['tower3d-target-slot'];
      if (isNext) cls.push('is-next');
      if (isDone) cls.push('is-done');
      return `
        <div class="${cls.join(' ')}" data-idx="${i}">
          ${shapeIconSvg(t.type, t.color)}
        </div>
      `;
    }).reverse().join('');
  }

  function refreshTargetPreview() {
    const el = document.getElementById('tower3d-target');
    if (el) el.innerHTML = renderTargetPreview();
  }

  function attemptDrop(shape, btn) {
    if (blocked || pending) return;
    if (nextIdx >= target.length) return;

    const expected = target[nextIdx];
    const correct  = (shape === expected.type);

    spawnBlock(shape, correct ? expected.color : 0xb0b0b0, correct);

    if (correct) {
      callbacks.onCorrect();
    } else {
      callbacks.onWrong();
      btn.classList.add('shake');
      setTimeout(() => btn.classList.remove('shake'), 350);
    }
  }

  function spawnBlock(type, color, isCorrect) {
    const mesh   = ThreeEngine.makeMesh(type, color);
    const stackY = blocks.length * LAYER_H + LAYER_H / 2;  // centre of next slot

    mesh.position.set(0, stackY + 4, 0);
    mesh.rotation.y = (Math.random() - 0.5) * 0.5;

    // Scale to a full-height block so shapes look solid, not squashed.
    const [sx, sy, sz] = blockScale(type);
    mesh.scale.set(sx, sy, sz);

    scene.add(mesh);

    pending = {
      mesh,
      targetY: stackY,
      vy: 0,
      vx: isCorrect ? 0 : (Math.random() > 0.5 ? 2.2 : -2.2),
      wrong: !isCorrect,
      settled: false,
    };
  }

  function stepPhysics(dt) {
    if (!pending) return;

    pending.vy += 9.8 * dt;
    pending.mesh.position.y -= pending.vy * dt;
    pending.mesh.position.x += pending.vx * dt;

    if (pending.wrong) {
      // Wrong shape falls off the side and disappears
      pending.mesh.rotation.z += dt * 3;
      if (pending.mesh.position.y < -2 || Math.abs(pending.mesh.position.x) > 4) {
        scene.remove(pending.mesh);
        ThreeEngine.disposeMesh(pending.mesh);
        pending = null;
      }
      return;
    }

    // Correct shape lands on the stack
    if (pending.mesh.position.y <= pending.targetY) {
      pending.mesh.position.y = pending.targetY;
      if (!pending.settled) {
        pending.settled = true;
        const m = pending.mesh;
        const t0 = performance.now();
        function bounce(now) {
          const t = (now - t0) / 320;
          if (t >= 1) { restoreScale(m); finishCorrect(); return; }
          const k = Math.sin(t * Math.PI) * 0.15;
          const baseY = m.userData.baseScaleY != null ? m.userData.baseScaleY : 0.5;
          m.scale.y = baseY * (1 - k);
          requestAnimationFrame(bounce);
        }
        // remember the per-shape Y scale for the bounce
        m.userData.baseScaleY = m.scale.y;
        requestAnimationFrame(bounce);
      }
    }
  }

  function restoreScale(m) {
    const y = m.userData.baseScaleY != null ? m.userData.baseScaleY : 0.5;
    m.scale.y = y;
  }

  function finishCorrect() {
    blocks.push(pending.mesh);
    pending = null;
    nextIdx += 1;
    refreshTargetPreview();

    if (nextIdx >= target.length) {
      blocked = true;
      // Light up each block as a celebration
      blocks.forEach((b, i) => {
        setTimeout(() => {
          b.material.emissive = new window.THREE.Color(0xffffaa);
          b.material.emissiveIntensity = 0.55;
        }, i * 90);
      });
      setTimeout(() => callbacks.onComplete(1), 900);
    }
  }

  // ── 2D SVG icons used in the target preview and choice buttons ──

  function shapeIconSvg(type, color) {
    const fill = color != null
      ? '#' + color.toString(16).padStart(6, '0')
      : '#b8b8b8';
    const dark = '#' + (((color != null ? color : 0xb8b8b8) >> 1) & 0x7F7F7F)
      .toString(16).padStart(6, '0');
    switch (type) {
      case 'cube':
        return `<svg viewBox="0 0 60 60" class="s3d-icon">
          <polygon points="10,20 30,8 50,20 30,32" fill="${fill}" stroke="${dark}" stroke-width="1.5"/>
          <polygon points="10,20 30,32 30,55 10,42" fill="${dark}" stroke="${dark}" stroke-width="1.5"/>
          <polygon points="50,20 30,32 30,55 50,42" fill="${fill}" stroke="${dark}" stroke-width="1.5" opacity="0.85"/>
        </svg>`;
      case 'sphere':
        return `<svg viewBox="0 0 60 60" class="s3d-icon">
          <circle cx="30" cy="30" r="22" fill="${fill}" stroke="${dark}" stroke-width="1.5"/>
          <ellipse cx="22" cy="22" rx="8" ry="5" fill="white" opacity="0.45"/>
        </svg>`;
      case 'cylinder':
        return `<svg viewBox="0 0 60 60" class="s3d-icon">
          <rect x="12" y="14" width="36" height="32" fill="${fill}" stroke="${dark}" stroke-width="1.5"/>
          <ellipse cx="30" cy="14" rx="18" ry="6" fill="${fill}" stroke="${dark}" stroke-width="1.5"/>
          <ellipse cx="30" cy="46" rx="18" ry="6" fill="${dark}" stroke="${dark}" stroke-width="1.5"/>
        </svg>`;
      case 'cone':
        return `<svg viewBox="0 0 60 60" class="s3d-icon">
          <polygon points="30,8 12,46 48,46" fill="${fill}" stroke="${dark}" stroke-width="1.5"/>
          <ellipse cx="30" cy="46" rx="18" ry="5" fill="${dark}"/>
        </svg>`;
    }
    return '';
  }

  function cleanup() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (slot)  { slot.detach(); slot = null; }
    if (scene) { ThreeEngine.disposeScene(scene); scene = null; }
    blocks  = [];
    pending = null;
    camera  = null;
    host    = null;
    target  = [];
    nextIdx = 0;
    blocked = false;
  }

  return { start, cleanup };
})();
