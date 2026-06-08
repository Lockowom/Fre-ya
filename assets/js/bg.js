// Shared subtle code-rain background for demo pages.
(() => {
  const canvas = document.getElementById("demo-bg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const glyphs = "01<>/{}();=const let function λ#".split("");
  let cols, drops;
  const size = 15;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cols = Math.floor(canvas.width / size);
    drops = new Array(cols).fill(0).map(() => Math.random() * -40);
  }
  function draw() {
    ctx.fillStyle = "rgba(5,6,10,0.12)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${size}px "JetBrains Mono", monospace`;
    for (let i = 0; i < cols; i++) {
      ctx.fillStyle = Math.random() > 0.95 ? "#ff2d9b" : "#1c5f78";
      ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], i * size, drops[i] * size);
      if (drops[i] * size > canvas.height && Math.random() > 0.97) drops[i] = 0;
      drops[i]++;
    }
    requestAnimationFrame(draw);
  }
  window.addEventListener("resize", resize);
  resize();
  draw();
})();
