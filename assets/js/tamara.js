// =====================================================================
//  Experiencia de Tamara: cielo de corazones + carta que se escribe sola.
//  Sin ninguna pista de que se pueda escribir.
// =====================================================================
(() => {
  const intro = document.getElementById("intro");
  const experience = document.getElementById("experience");
  const messageEl = document.getElementById("message");
  const dotsEl = document.getElementById("dots");
  const hintEl = document.getElementById("hint");
  const toast = document.getElementById("toast");

  // Mensajes de respaldo si aún no hay base de datos / mensajes.
  const FALLBACK = [
    "Hola, mi amor. Hice este pequeño rincón del universo solo para ti.",
    "Cada vez que entres aquí, recuerda lo mucho que te amo, Tamara.",
  ];

  let messages = [];
  let index = 0;
  let typing = false;

  // ---------------- Cielo de corazones (canvas) ----------------
  const canvas = document.getElementById("sky");
  const ctx = canvas.getContext("2d");
  let hearts = [];
  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }
  function makeHeart() {
    return {
      x: Math.random() * canvas.width,
      y: canvas.height + 20,
      s: 6 + Math.random() * 16,
      sp: 0.3 + Math.random() * 0.9,
      sway: Math.random() * Math.PI * 2,
      a: 0.2 + Math.random() * 0.5,
    };
  }
  function drawHeart(h) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.scale(h.s / 16, h.s / 16);
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(-8, -4, -16, 4, 0, 16);
    ctx.bezierCurveTo(16, 4, 8, -4, 0, 4);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, -4, 0, 16);
    grad.addColorStop(0, `rgba(255,93,143,${h.a})`);
    grad.addColorStop(1, `rgba(255,217,160,${h.a * 0.6})`);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }
  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (hearts.length < 40 && Math.random() > 0.85) hearts.push(makeHeart());
    hearts.forEach((h) => {
      h.y -= h.sp;
      h.sway += 0.02;
      h.x += Math.sin(h.sway) * 0.4;
      drawHeart(h);
    });
    hearts = hearts.filter((h) => h.y > -30);
    requestAnimationFrame(loop);
  }
  addEventListener("resize", resize);
  resize();
  loop();

  // ---------------- Máquina de escribir ----------------
  function typeMessage(text) {
    typing = true;
    messageEl.textContent = "";
    const caret = document.createElement("span");
    caret.className = "caret";
    messageEl.appendChild(caret);
    let i = 0;
    const speed = 38;
    (function step() {
      if (i <= text.length) {
        caret.insertAdjacentText("beforebegin", text[i - 1] || "");
        i++;
        setTimeout(step, text[i - 2] === "." ? speed * 6 : speed);
      } else {
        typing = false;
      }
    })();
  }

  function renderDots() {
    dotsEl.innerHTML = "";
    messages.forEach((_, i) => {
      const d = document.createElement("i");
      if (i === index) d.classList.add("on");
      dotsEl.appendChild(d);
    });
  }

  function show(i) {
    if (!messages.length) return;
    index = (i + messages.length) % messages.length;
    renderDots();
    typeMessage(messages[index].body || messages[index]);
    hintEl.style.display = messages.length > 1 ? "" : "none";
  }

  function next() {
    if (typing || messages.length < 2) return;
    show(index + 1);
  }

  // ---------------- Carga de datos ----------------
  async function load() {
    try {
      if (window.FreyaDB && window.FreyaDB.ready) {
        const data = await window.FreyaDB.list();
        messages = data.length ? data : FALLBACK.map((b) => ({ body: b }));
      } else {
        messages = FALLBACK.map((b) => ({ body: b }));
      }
    } catch (e) {
      messages = FALLBACK.map((b) => ({ body: b }));
    }
    show(0);
  }

  function showToast() {
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => (toast.hidden = true), 600);
    }, 3500);
  }

  // Tiempo real: nuevos mensajes aparecen sin que ella haga nada.
  function subscribe() {
    if (!window.FreyaDB || !window.FreyaDB.ready) return;
    window.FreyaDB.onChange(async () => {
      const data = await window.FreyaDB.list();
      if (!data.length) return;
      const wasLast = index === messages.length - 1;
      const grew = data.length > messages.length;
      messages = data;
      if (grew) {
        showToast();
        // Lleva la atención al recuerdo recién llegado.
        setTimeout(() => show(messages.length - 1), 800);
      } else if (wasLast) {
        renderDots();
      }
    });
  }

  // ---------------- Arranque ----------------
  function begin() {
    intro.classList.add("fade");
    setTimeout(() => {
      intro.style.display = "none";
      experience.hidden = false;
      load();
      subscribe();
    }, 850);
  }

  intro.addEventListener("click", begin);
  experience.addEventListener("click", next);
})();
