/* ═══════════════════════════════════════
   THREE-ENGINE — shared WebGL renderer + helpers
   ═══════════════════════════════════════ */

const ThreeEngine = (function () {

  let renderer = null;
  let activeCleanup = null;

  // Cached low-poly geometries — created once and reused across rounds.
  const geometries = {};
  function getGeometry(type) {
    if (geometries[type]) return geometries[type];
    const T = window.THREE;
    let g;
    switch (type) {
      case 'cube':     g = new T.BoxGeometry(1, 1, 1); break;
      case 'sphere':   g = new T.SphereGeometry(0.65, 24, 18); break;
      case 'cone':     g = new T.ConeGeometry(0.65, 1.3, 24); break;
      case 'cylinder': g = new T.CylinderGeometry(0.55, 0.55, 1.15, 24); break;
      case 'torus':    g = new T.TorusGeometry(0.55, 0.22, 16, 36); break;
      case 'pyramid':  g = new T.ConeGeometry(0.75, 1.3, 4); break;
      case 'prism':       g = new T.CylinderGeometry(0.82, 0.82, 1.2, 3); break; // triangular prism
      case 'hexprism':    g = new T.CylinderGeometry(0.72, 0.72, 1.1, 6); break; // hexagonal prism
      case 'octahedron':  g = new T.OctahedronGeometry(0.85); break;
      case 'tetrahedron': g = new T.TetrahedronGeometry(0.95); break;
      case 'block':    g = new T.BoxGeometry(1.4, 0.5, 1.4); break;
      case 'ground':   g = new T.CircleGeometry(2.6, 32); break;
      default:         g = new T.BoxGeometry(1, 1, 1);
    }
    geometries[type] = g;
    return g;
  }

  const SHAPE_TYPES = ['cube', 'sphere', 'cone', 'cylinder', 'torus', 'pyramid',
                       'prism', 'hexprism', 'octahedron', 'tetrahedron'];

  function ensureRenderer() {
    if (renderer) return renderer;
    const T = window.THREE;
    renderer = new T.WebGLRenderer({
      alpha: true,
      antialias: window.devicePixelRatio <= 1.5,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = T.SRGBColorSpace || renderer.outputColorSpace;

    // The browser may yank our WebGL context (tab backgrounded for a
    // long time, GPU memory pressure, etc.). When that happens, stop
    // the current game so we don't try to draw into a dead context.
    const c = renderer.domElement;
    c.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      stopActive();
    });
    return renderer;
  }

  // Mount the shared renderer's canvas into a host element and size it
  // to fit. Returns the canvas + a sizing helper.
  function mount(host) {
    const r = ensureRenderer();
    const canvas = r.domElement;
    canvas.style.display    = 'block';
    canvas.style.width      = '100%';
    canvas.style.height     = '100%';
    canvas.style.touchAction = 'manipulation';
    host.appendChild(canvas);

    let width = 0, height = 0;
    function fit() {
      const rect = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      if (w === width && h === height) return false;
      width = w; height = h;
      r.setSize(w, h, false);
      return true;
    }
    fit();

    let resizeObs = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObs = new ResizeObserver(fit);
      resizeObs.observe(host);
    }

    return {
      canvas,
      renderer: r,
      width:  () => width,
      height: () => height,
      fit,
      detach() {
        if (resizeObs) resizeObs.disconnect();
        if (canvas.parentNode === host) host.removeChild(canvas);
      },
    };
  }

  // Standard lighting: ambient + single soft directional. Cheap and
  // produces nice flat-shaded faces.
  function addLights(scene) {
    const T = window.THREE;
    scene.add(new T.AmbientLight(0xffffff, 0.65));
    const dir = new T.DirectionalLight(0xffffff, 0.85);
    dir.position.set(2.5, 4, 3);
    scene.add(dir);
    const rim = new T.DirectionalLight(0xa9d6ff, 0.35);
    rim.position.set(-3, -2, -2);
    scene.add(rim);
  }

  function makeMesh(type, color) {
    const T = window.THREE;
    const mat = new T.MeshPhongMaterial({
      color,
      flatShading: type !== 'sphere' && type !== 'torus' && type !== 'cylinder',
      shininess: 50,
      specular: 0x222222,
    });
    const mesh = new T.Mesh(getGeometry(type), mat);
    mesh.userData.type  = type;
    mesh.userData.color = color;
    return mesh;
  }

  function disposeMesh(mesh) {
    // Geometries are cached and shared — DON'T dispose them.
    if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
    else if (mesh.material) mesh.material.dispose();
  }

  function disposeScene(scene) {
    scene.traverse(o => { if (o.isMesh) disposeMesh(o); });
    while (scene.children.length) scene.remove(scene.children[0]);
  }

  // Register the active game's cleanup so Router can call it on screen change.
  function registerActive(cleanupFn) {
    activeCleanup = cleanupFn;
  }

  function stopActive() {
    if (activeCleanup) {
      try { activeCleanup(); } catch (_) {}
      activeCleanup = null;
    }
  }

  return {
    SHAPE_TYPES,
    mount,
    addLights,
    makeMesh,
    disposeMesh,
    disposeScene,
    registerActive,
    stopActive,
  };
})();
