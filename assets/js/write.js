// =====================================================================
//  Panel privado: escribir, editar y borrar mensajes para Tamara.
// =====================================================================
(() => {
  const SECRET = window.FREYA_SECRET;
  const conn = document.getElementById("conn");
  const bodyEl = document.getElementById("body");
  const countEl = document.getElementById("count");
  const sendBtn = document.getElementById("send");
  const statusEl = document.getElementById("status");
  const listEl = document.getElementById("list");
  const totalEl = document.getElementById("total");

  const fmt = (iso) =>
    new Date(iso).toLocaleString("es", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });

  function setStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.className = "status" + (kind ? " " + kind : "");
    if (msg) setTimeout(() => { if (statusEl.textContent === msg) statusEl.textContent = ""; }, 4000);
  }

  if (!window.FreyaDB || !window.FreyaDB.ready) {
    conn.textContent = "Falta configurar Supabase (assets/js/config.js)";
    conn.className = "sub err";
    sendBtn.disabled = true;
  } else {
    conn.textContent = "Listo. Lo que escribas le llegará al instante.";
    conn.className = "sub ok";
  }

  bodyEl.addEventListener("input", () => {
    countEl.textContent = bodyEl.value.length;
  });

  // ---------------- Lienzo de dibujo ----------------
  const pad = document.getElementById("pad");
  const pctx = pad.getContext("2d");
  const padBox = document.getElementById("drawPad");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let strokes = [];   // [[ [x,y] normalizados 0..1, ... ], ...]
  let current = null;

  function sizePad() {
    const r = pad.getBoundingClientRect();
    pad.width = Math.max(1, r.width * dpr);
    pad.height = Math.max(1, r.height * dpr);
    redrawPad();
  }
  function redrawPad() {
    pctx.clearRect(0, 0, pad.width, pad.height);
    pctx.lineWidth = 3 * dpr;
    pctx.lineCap = "round";
    pctx.lineJoin = "round";
    pctx.strokeStyle = "#ff7aa8";
    pctx.fillStyle = "#ff7aa8";
    for (const s of strokes) {
      if (s.length === 1) {
        pctx.beginPath();
        pctx.arc(s[0][0] * pad.width, s[0][1] * pad.height, 2 * dpr, 0, Math.PI * 2);
        pctx.fill();
        continue;
      }
      pctx.beginPath();
      pctx.moveTo(s[0][0] * pad.width, s[0][1] * pad.height);
      for (let i = 1; i < s.length; i++) pctx.lineTo(s[i][0] * pad.width, s[i][1] * pad.height);
      pctx.stroke();
    }
  }
  function padPos(e) {
    const r = pad.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  }
  pad.addEventListener("pointerdown", (e) => {
    pad.setPointerCapture(e.pointerId);
    current = [padPos(e)];
    strokes.push(current);
    redrawPad();
  });
  pad.addEventListener("pointermove", (e) => {
    if (!current) return;
    current.push(padPos(e));
    redrawPad();
  });
  const endStroke = () => { current = null; };
  pad.addEventListener("pointerup", endStroke);
  pad.addEventListener("pointercancel", endStroke);
  document.getElementById("clear").onclick = () => { strokes = []; redrawPad(); };
  document.getElementById("undo").onclick = () => { strokes.pop(); redrawPad(); };
  padBox.addEventListener("toggle", () => { if (padBox.open) sizePad(); });
  window.addEventListener("resize", () => { if (padBox.open) sizePad(); });

  function getDrawing() {
    return strokes.length ? { strokes } : null;
  }
  function resetDrawing() {
    strokes = [];
    redrawPad();
  }

  async function refresh() {
    try {
      const data = await window.FreyaDB.list();
      totalEl.textContent = data.length ? `· ${data.length}` : "";
      render(data.slice().reverse());
    } catch (e) {
      setStatus("No pude cargar los mensajes: " + e.message, "err");
    }
  }

  function render(items) {
    listEl.innerHTML = "";
    if (!items.length) {
      listEl.innerHTML = '<li class="empty">Aún no hay mensajes. Escribe el primero ♥</li>';
      return;
    }
    for (const m of items) {
      const li = document.createElement("li");
      li.className = "item";
      li.innerHTML = `
        <p></p>
        <div class="meta">
          <time></time>
          <div class="item-actions">
            <button class="btn ghost" data-act="edit">Editar</button>
            <button class="btn ghost" data-act="del">Borrar</button>
          </div>
        </div>`;
      li.querySelector("p").textContent = m.body;
      li.querySelector("time").textContent = fmt(m.created_at);
      if (m.drawing) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = "🎨 con dibujo";
        li.querySelector("time").after(badge);
      }
      li.querySelector('[data-act="edit"]').onclick = () => startEdit(li, m);
      li.querySelector('[data-act="del"]').onclick = () => del(m);
      listEl.appendChild(li);
    }
  }

  function startEdit(li, m) {
    li.innerHTML = "";
    const ta = document.createElement("textarea");
    ta.rows = 3; ta.value = m.body; ta.maxLength = 2000;
    const row = document.createElement("div");
    row.className = "item-actions";
    const save = document.createElement("button");
    save.className = "btn"; save.textContent = "Guardar";
    const cancel = document.createElement("button");
    cancel.className = "btn ghost"; cancel.textContent = "Cancelar";
    row.append(cancel, save);
    li.append(ta, row);
    ta.focus();
    cancel.onclick = refresh;
    save.onclick = async () => {
      const v = ta.value.trim();
      if (!v) return;
      save.disabled = true;
      try {
        await window.FreyaDB.edit(SECRET, m.id, v);
        setStatus("Mensaje actualizado", "ok");
        refresh();
      } catch (e) {
        setStatus("Error: " + e.message, "err");
        save.disabled = false;
      }
    };
  }

  async function del(m) {
    if (!confirm("¿Borrar este mensaje?")) return;
    try {
      await window.FreyaDB.remove(SECRET, m.id);
      setStatus("Mensaje borrado", "ok");
      refresh();
    } catch (e) {
      setStatus("Error: " + e.message, "err");
    }
  }

  sendBtn.addEventListener("click", async () => {
    const v = bodyEl.value.trim();
    if (!v) { setStatus("Escribe algo primero ♥", "err"); return; }
    sendBtn.disabled = true;
    try {
      await window.FreyaDB.post(SECRET, v, getDrawing());
      bodyEl.value = "";
      countEl.textContent = "0";
      resetDrawing();
      setStatus("Enviado. Tamara ya puede verlo ♥", "ok");
      refresh();
    } catch (e) {
      setStatus("Error: " + e.message, "err");
    } finally {
      sendBtn.disabled = false;
    }
  });

  if (window.FreyaDB && window.FreyaDB.ready) refresh();
})();
