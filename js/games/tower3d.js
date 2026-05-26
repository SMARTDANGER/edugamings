/* ═══════════════════════════════════════
   TOWER 3D — stack falling 3D blocks until you hit the target
   ═══════════════════════════════════════ */

const Tower3DGame = (function () {

  const BLOCK_COLORS = [0xFF6B6B, 0x4ECDC4, 0xFFD93D, 0x95E1D3, 0xAA96DA, 0xFFB6E1, 0x6BCF7F, 0xFF8E53];
  const DIFF_WAVE = ['easy', 'medium', 'hard', 'medium'];
  const TARGET_BY_DIFF = { easy: 3, medium: 5, hard: 7 };

  let callbacks  = null;
  let blocked    = false;
  let rafId      = null;
  let slot       = null;
  let scene      = null;
  let camera     = null;
  let blocks     = [];     // { mesh, y, targetY, vy }
  let pending    = null;   // mesh currently falling
  let target     = 3;
  let added      = 0;
  let host       = null;

  // ── Lifecycle ────────────────────────────────────────────────────

  function start(container, opts, cbs) {
    // Defensive: clean any leftover state from a previous round before
    // we rebuild the scene.
    cleanup();

    callbacks = cbs;
    blocked   = false;
    blocks    = [];
    pending   = null;
    added     = 0;

    const round = opts.round || 0;
    const diff  = DIFF_WAVE[round % 4];
    target = TARGET_BY_DIFF[diff];

    container.innerHTML = `
      <div class="tower3d-game">
        <div class="tower3d-target">
          <span class="tower3d-target-label">🎯</span>
          <span class="tower3d-target-num" id="tower3d-target-num">${target}</span>
        </div>
        <div class="tower3d-stage" id="tower3d-stage"></div>
        <button class="tower3d-drop" id="tower3d-drop" aria-label="Bloku bırak">
          <span class="tower3d-drop-icon">⬇️</span>
        </button>
        <div class="tower3d-counter" id="tower3d-counter">0 / ${target}</div>
      </div>
    `;

    const T = window.THREE;
    host  = document.getElementById('tower3d-stage');
    slot  = ThreeEngine.mount(host);
    scene = new T.Scene();
    ThreeEngine.addLights(scene);

    // Ground (subtle dark plane so blocks have a place to land) —
    // geometry comes from the cache so it isn't re-allocated per round.
    const ground = ThreeEngine.makeMesh('ground', 0x6f86b9);
    ground.material.opacity     = 0.35;
    ground.material.transparent = true;
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    scene.add(ground);

    camera = new T.PerspectiveCamera(38, slot.width() / slot.height(), 0.1, 50);
    camera.position.set(2.8, 3.0, 5.2);
    camera.lookAt(0, 1, 0);

    document.getElementById('tower3d-drop').addEventListener('click', dropBlock);

    // Animation loop
    let lastT = performance.now();
    function tick(now) {
      if (!slot) return;
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      stepPhysics(dt);
      // Slowly orbit the camera for a "showy" 3D feel
      const orbitAngle = (now / 6000);
      camera.position.x = Math.sin(orbitAngle) * 4.2;
      camera.position.z = Math.cos(orbitAngle) * 4.2;
      camera.position.y = 3.0 + Math.max(0, (blocks.length - 2) * 0.3);
      camera.lookAt(0, Math.max(0.6, blocks.length * 0.25), 0);
      // Resize
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

  function dropBlock() {
    if (blocked) return;
    if (pending) return;             // already one falling
    const color = BLOCK_COLORS[added % BLOCK_COLORS.length];
    const mesh  = ThreeEngine.makeMesh('block', color);
    const stackY = blocks.length * 0.5;       // each block half a unit tall
    mesh.position.set(0, stackY + 4, 0);      // start high
    // Slight random rotation around y so the stack looks playful
    mesh.rotation.y = (Math.random() - 0.5) * 0.4;
    scene.add(mesh);

    pending = { mesh, targetY: stackY, vy: 0, settled: false };
    callbacks.onCorrect();              // each successful drop is a "click reward"
  }

  function stepPhysics(dt) {
    if (!pending) return;
    // Simple gravity → land on target Y → bounce once.
    pending.vy += 9.8 * dt;
    pending.mesh.position.y -= pending.vy * dt;
    if (pending.mesh.position.y <= pending.targetY) {
      pending.mesh.position.y = pending.targetY;
      if (!pending.settled) {
        pending.settled = true;
        // Bounce animation
        const m = pending.mesh;
        const t0 = performance.now();
        function bounce(now) {
          const t = (now - t0) / 350;
          if (t >= 1) { m.scale.set(1, 1, 1); finishDrop(); return; }
          const sx = 1 + Math.sin(t * Math.PI) * 0.18;
          const sy = 1 - Math.sin(t * Math.PI) * 0.18;
          m.scale.set(sx, sy, sx);
          requestAnimationFrame(bounce);
        }
        requestAnimationFrame(bounce);
      }
    }
  }

  function finishDrop() {
    blocks.push(pending.mesh);
    pending = null;
    added += 1;
    const counter = document.getElementById('tower3d-counter');
    if (counter) counter.textContent = added + ' / ' + target;
    if (added >= target) {
      blocked = true;
      // Celebrate the whole stack — light up each block briefly
      blocks.forEach((b, i) => {
        setTimeout(() => {
          b.material.emissive = new window.THREE.Color(0xffffaa);
          b.material.emissiveIntensity = 0.6;
        }, i * 80);
      });
      setTimeout(() => callbacks.onComplete(1), 900);
    }
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
  }

  return { start, cleanup };
})();
