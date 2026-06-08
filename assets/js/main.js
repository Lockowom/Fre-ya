// Matrix-style code rain for the landing background.
(() => {
  const canvas = document.getElementById("code-rain");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const glyphs = "01{}[]()<>=+-*/;:.const let=>function ƒ∆λ#@$%".split("");
  let cols, drops, fontSize;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    fontSize = 16;
    cols = Math.floor(canvas.width / fontSize);
    drops = new Array(cols).fill(0).map(() => Math.random() * -50);
  }

  function draw() {
    ctx.fillStyle = "rgba(5, 6, 10, 0.10)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

    for (let i = 0; i < cols; i++) {
      const char = glyphs[Math.floor(Math.random() * glyphs.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;
      ctx.fillStyle = Math.random() > 0.94 ? "#ff2d9b" : "#1e6f8c";
      ctx.fillText(char, x, y);
      if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  draw();
})();

// Tabs scroll to demos with a subtle highlight.
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
  });
});
