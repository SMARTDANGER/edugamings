/* ═══════════════════════════════════════
   PARTICLES — canvas-based phase particles
   ═══════════════════════════════════════ */

const Particles = (function () {
  const MAX = 18;
  let canvas, ctx, particles = [], rafId, currentType = 'bubble';

  // ── Particle class ──────────────────────────────────────────────

  function Particle() { this.reset(true); }

  Particle.prototype.reset = function (scatter) {
    this.x    = Math.random() * (canvas ? canvas.width : 400);
    this.y    = scatter ? Math.random() * (canvas ? canvas.height : 700) : -24;
    this.size = 10 + Math.random() * 18;
    this.opacity = 0.25 + Math.random() * 0.45;
    this.vx   = (Math.random() - 0.5) * 0.7;
    this.vy   = currentType === 'star' ? 0.4 + Math.random() * 0.9
                                       : -(0.4 + Math.random() * 0.8);
    this.phase = Math.random() * Math.PI * 2;
    this.rot   = Math.random() * Math.PI * 2;
    this.rotV  = (Math.random() - 0.5) * 0.04;
    this.hue   = Spectrum ? Spectrum.hue : 210;
  };

  Particle.prototype.update = function () {
    this.phase += 0.018;
    this.rot   += this.rotV;
    this.x += this.vx + Math.sin(this.phase) * 0.4;
    this.y += this.vy;

    const offTop    = this.y < -this.size * 2;
    const offBottom = this.y > canvas.height + this.size * 2;
    if (offTop || offBottom) {
      this.reset(false);
      if (currentType === 'star') {
        this.y = -24;      // fall from top for stars
      } else {
        this.y = canvas.height + 24; // rise from bottom for others
        this.vy = -(0.4 + Math.random() * 0.8);
      }
    }
  };

  Particle.prototype.draw = function () {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    drawShape(ctx, currentType, this.size, this.hue);
    ctx.restore();
  };

  // ── Shape drawing ───────────────────────────────────────────────

  function drawShape(c, type, size, hue) {
    const r = size / 2;
    switch (type) {
      case 'bubble':
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.strokeStyle = `hsla(${hue}, 70%, 70%, 0.9)`;
        c.lineWidth = 2;
        c.stroke();
        c.beginPath();
        c.arc(-r * 0.3, -r * 0.3, r * 0.25, 0, Math.PI * 2);
        c.fillStyle = 'rgba(255,255,255,0.5)';
        c.fill();
        break;

      case 'star':
        drawStar(c, 0, 0, 5, r, r * 0.45);
        c.fillStyle = `hsla(${hue + 60}, 85%, 80%, 0.85)`;
        c.fill();
        break;

      case 'cloud':
        c.fillStyle = 'rgba(255,255,255,0.75)';
        [
          [0,    0,    r * 0.9],
          [r,    r*0.2, r * 0.65],
          [-r,   r*0.2, r * 0.65],
          [r*0.4, r*0.4, r * 0.55],
        ].forEach(([cx, cy, cr]) => {
          c.beginPath();
          c.arc(cx, cy, cr, 0, Math.PI * 2);
          c.fill();
        });
        break;

      case 'sparkle':
        c.strokeStyle = `hsla(${hue + 30}, 90%, 80%, 0.9)`;
        c.lineWidth = 2.5;
        c.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
          c.save();
          c.rotate((i * Math.PI) / 2);
          c.beginPath();
          c.moveTo(0, 0);
          c.lineTo(0, r);
          c.stroke();
          c.restore();
        }
        // Centre dot
        c.beginPath();
        c.arc(0, 0, r * 0.2, 0, Math.PI * 2);
        c.fillStyle = `hsla(${hue + 30}, 90%, 80%, 0.9)`;
        c.fill();
        break;

      case 'flower':
        // Petals
        c.fillStyle = `hsla(${hue + 120}, 80%, 72%, 0.85)`;
        for (let i = 0; i < 5; i++) {
          c.save();
          c.rotate((i * Math.PI * 2) / 5);
          c.beginPath();
          c.ellipse(0, -r * 0.55, r * 0.28, r * 0.45, 0, 0, Math.PI * 2);
          c.fill();
          c.restore();
        }
        // Centre
        c.beginPath();
        c.arc(0, 0, r * 0.28, 0, Math.PI * 2);
        c.fillStyle = `hsla(${hue + 60}, 90%, 80%, 0.9)`;
        c.fill();
        break;

      case 'leaf':
        c.save();
        c.rotate(Math.PI / 5);
        c.beginPath();
        c.ellipse(0, 0, r * 0.4, r * 0.8, 0, 0, Math.PI * 2);
        c.fillStyle = `hsla(${hue + 160}, 65%, 52%, 0.85)`;
        c.fill();
        c.strokeStyle = `hsla(${hue + 180}, 50%, 30%, 0.3)`;
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(0, -r * 0.8);
        c.lineTo(0, r * 0.8);
        c.stroke();
        c.restore();
        break;
    }
  }

  function drawStar(c, cx, cy, spikes, outer, inner) {
    let angle = -Math.PI / 2;
    const step = Math.PI / spikes;
    c.beginPath();
    c.moveTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    for (let i = 0; i < spikes; i++) {
      angle += step;
      c.lineTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      angle += step;
      c.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    }
    c.closePath();
  }

  // ── Animation loop ──────────────────────────────────────────────

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.hue = Spectrum ? Spectrum.hue : 210;
      p.update();
      p.draw();
    });
    rafId = requestAnimationFrame(animate);
  }

  // ── Public API ──────────────────────────────────────────────────

  function init() {
    canvas = document.getElementById('particle-canvas');
    ctx    = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    particles = [];
    for (let i = 0; i < MAX; i++) particles.push(new Particle());

    if (rafId) cancelAnimationFrame(rafId);
    animate();
  }

  function resize() {
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function setType(type) {
    if (type === currentType) return;
    currentType = type;
    // Gradually repopulate so the transition is seamless
    particles.forEach((p, i) => {
      setTimeout(() => p.reset(false), i * 80);
    });
  }

  return { init, setType };
})();
