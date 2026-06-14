// =====================================================================
//  Renderiza un dibujo (trazos normalizados 0..1) como partículas que
//  se reúnen para formarlo. Inspirado en la demo de la esfera de
//  partículas. Devuelve un controlador con .stop().
// =====================================================================
window.FreyaDraw = (() => {
  const PALETTE = ["#ff5d8f", "#ffa6c1", "#ffd9a0", "#ff89b3"];

  function buildTargets(strokes, W, H) {
    const pts = [];
    for (const stroke of strokes) {
      if (!stroke.length) continue;
      if (stroke.length === 1) {
        pts.push([stroke[0][0] * W, stroke[0][1] * H]);
        continue;
      }
      for (let i = 1; i < stroke.length; i++) {
        const [x0, y0] = stroke[i - 1];
        const [x1, y1] = stroke[i];
        const dx = (x1 - x0) * W;
        const dy = (y1 - y0) * H;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.round(dist / 5));
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          pts.push([(x0 + (x1 - x0) * t) * W, (y0 + (y1 - y0) * t) * H]);
        }
      }
    }
    return pts;
  }

  function render(canvas, strokes) {
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W, H, particles, raf, t0 = performance.now();

    function setup() {
      const rect = canvas.getBoundingClientRect();
      W = canvas.width = Math.max(1, rect.width * dpr);
      H = canvas.height = Math.max(1, rect.height * dpr);
      const targets = buildTargets(strokes, W, H);
      particles = targets.map(([tx, ty]) => ({
        x: W / 2 + (Math.random() - 0.5) * W,
        y: H / 2 + (Math.random() - 0.5) * H,
        tx, ty,
        vx: 0, vy: 0,
        c: PALETTE[(Math.random() * PALETTE.length) | 0],
        r: (1.1 + Math.random() * 1.3) * dpr,
        ph: Math.random() * Math.PI * 2,
      }));
    }

    function frame(now) {
      const time = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (const p of particles) {
        // resorte hacia el objetivo
        p.vx += (p.tx - p.x) * 0.012;
        p.vy += (p.ty - p.y) * 0.012;
        p.vx *= 0.86;
        p.vy *= 0.86;
        p.x += p.vx;
        p.y += p.vy;
        const tw = 0.6 + 0.4 * Math.sin(time * 2 + p.ph);
        ctx.beginPath();
        ctx.arc(p.x + Math.sin(time + p.ph) * 0.6 * dpr, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = tw;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    }

    setup();
    raf = requestAnimationFrame(frame);
    const onResize = () => setup();
    window.addEventListener("resize", onResize);

    return {
      stop() {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        ctx.clearRect(0, 0, W, H);
      },
    };
  }

  // Normaliza trazos guardados en distintos formatos a [[ [x,y], ... ], ...].
  function normalize(drawing) {
    if (!drawing) return null;
    const strokes = Array.isArray(drawing) ? drawing : drawing.strokes;
    if (!Array.isArray(strokes) || !strokes.length) return null;
    return strokes;
  }

  return { render, normalize };
})();
