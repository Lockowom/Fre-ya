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
  const drawCanvas = document.getElementById("drawCanvas");
  const skyToggle = document.getElementById("skyToggle");
  const letterMin = document.getElementById("letterMin");
  const tourBtn = document.getElementById("tourBtn");
  const musicBtn = document.getElementById("musicBtn");
  let drawCtl = null;
  let hasReal = false;     // ¿hay mensajes reales (no de respaldo)?
  let letterShown = true;  // ¿se está mostrando la carta?

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
  let blooms = [];
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
  // --- Flores ocasionales: rosas y girasoles ---
  function makeBloom() {
    return {
      type: Math.random() < 0.5 ? "rose" : "sun",
      x: Math.random() * canvas.width,
      y: canvas.height + 40,
      s: 0.9 + Math.random() * 0.8,
      sp: 0.25 + Math.random() * 0.5,
      sway: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.01,
      a: 0.55 + Math.random() * 0.35,
    };
  }
  function drawRose(b) {
    ctx.globalAlpha = b.a;
    // pétalos en espiral
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(ang) * 9, Math.sin(ang) * 9, 11, 7, ang, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? "#ff7aa8" : "#ff5d8f";
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#d63b6e";
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  function drawSun(b) {
    ctx.globalAlpha = b.a;
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(ang) * 13, Math.sin(ang) * 13, 9, 4.5, ang, 0, Math.PI * 2);
      ctx.fillStyle = "#ffce4d";
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#7a4a22";
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  function drawBloom(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.scale(b.s, b.s);
    b.type === "rose" ? drawRose(b) : drawSun(b);
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

    // de vez en cuando, una flor
    if (blooms.length < 9 && Math.random() > 0.992) blooms.push(makeBloom());
    blooms.forEach((b) => {
      b.y -= b.sp;
      b.sway += 0.015;
      b.x += Math.sin(b.sway) * 0.5;
      b.rot += b.spin;
      drawBloom(b);
    });
    blooms = blooms.filter((b) => b.y > -60);

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

    // Dibujo (si lo hay): se forma con partículas.
    if (drawCtl) { drawCtl.stop(); drawCtl = null; }
    const strokes = window.FreyaDraw && window.FreyaDraw.normalize(messages[index].drawing);
    if (strokes) {
      drawCanvas.hidden = false;
      drawCtl = window.FreyaDraw.render(drawCanvas, strokes);
    } else {
      drawCanvas.hidden = true;
    }

    typeMessage(messages[index].body || messages[index]);
    hintEl.style.display = messages.length > 1 ? "" : "none";
  }

  function next() {
    if (!letterShown || typing || messages.length < 2) return;
    show(index + 1);
  }

  // Mostrar/ocultar la carta para disfrutar el fondo 3D.
  function setLetter(visible) {
    letterShown = visible;
    if (visible && window.FreyaCosmos && window.FreyaCosmos.isActive()) window.FreyaCosmos.stopTour();
    document.body.classList.toggle("letter-hidden", !visible);
    skyToggle.textContent = visible ? "✦" : "♥";
    skyToggle.setAttribute("aria-label", visible ? "Ver el cielo" : "Ver la carta");
    skyToggle.title = visible ? "Ver el cielo" : "Ver la carta";
    if (visible) {
      // al volver, re-renderiza el dibujo del mensaje actual si lo hay
      const strokes = messages.length && window.FreyaDraw && window.FreyaDraw.normalize(messages[index].drawing);
      if (strokes && drawCtl === null) { drawCanvas.hidden = false; drawCtl = window.FreyaDraw.render(drawCanvas, strokes); }
    } else if (drawCtl) {
      // al ocultar, detén la animación del dibujo para ahorrar recursos
      drawCtl.stop();
      drawCtl = null;
    }
  }

  // ---------------- Carga de datos ----------------
  async function load() {
    try {
      if (window.FreyaDB && window.FreyaDB.ready) {
        const data = await window.FreyaDB.list();
        hasReal = data.length > 0;
        messages = hasReal ? data : FALLBACK.map((b) => ({ body: b }));
      } else {
        hasReal = false;
        messages = FALLBACK.map((b) => ({ body: b }));
      }
    } catch (e) {
      hasReal = false;
      messages = FALLBACK.map((b) => ({ body: b }));
    }
    show(0);
    // Sin mensajes reales: arranca disfrutando del cosmos (carta oculta).
    if (!hasReal) setLetter(false);
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
      hasReal = true;
      if (grew) {
        showToast();
        // Lleva la atención al recuerdo recién llegado (revela la carta si estaba oculta).
        setTimeout(() => { setLetter(true); show(messages.length - 1); }, 800);
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
      skyToggle.hidden = false;
      tourBtn.hidden = false;
      musicBtn.hidden = false;
      load();
      subscribe();
    }, 850);
  }

  intro.addEventListener("click", begin);
  experience.addEventListener("click", next);
  skyToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    setLetter(!letterShown);
  });
  letterMin.addEventListener("click", (e) => {
    e.stopPropagation();
    setLetter(false);
  });
  tourBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!window.FreyaCosmos) return;
    if (window.FreyaCosmos.isActive()) {
      window.FreyaCosmos.stopTour();
    } else {
      setLetter(false);          // minimiza la carta para disfrutar el viaje
      window.FreyaCosmos.startTour();
    }
    setTimeout(syncMusicBtn, 50);
  });
  // Al terminar (o salir de) el viaje, vuelve la carta.
  window.addEventListener("freya-tour-end", () => setLetter(true));

  // Música ambiental (on/off).
  function syncMusicBtn() {
    const on = window.FreyaAudio && window.FreyaAudio.isEnabled();
    musicBtn.textContent = on ? "🎵" : "🔇";
    musicBtn.classList.toggle("off", !on);
  }
  musicBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (window.FreyaAudio) window.FreyaAudio.toggle();
    syncMusicBtn();
  });
  // Si el viaje arranca la música, refleja el estado en el botón.
  window.addEventListener("freya-tour-end", syncMusicBtn);
  syncMusicBtn();
})();
