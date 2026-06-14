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
      await window.FreyaDB.post(SECRET, v);
      bodyEl.value = "";
      countEl.textContent = "0";
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
