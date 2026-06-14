// =====================================================================
//  Capa de datos. Crea el cliente de Supabase y expone helpers simples.
//  Requiere que config.js y el SDK @supabase/supabase-js estén cargados.
// =====================================================================
(function () {
  const cfg = window.FREYA_CONFIG || {};
  const ready =
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.startsWith("REEMPLAZAR") &&
    window.supabase;

  const client = ready
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  window.FreyaDB = {
    ready: !!client,
    client,

    // Lee todos los mensajes, del más antiguo al más nuevo.
    async list() {
      if (!client) return [];
      const { data, error } = await client
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },

    // Suscripción en tiempo real a cualquier cambio en los mensajes.
    onChange(callback) {
      if (!client) return () => {};
      const channel = client
        .channel("tamara-messages")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" },
          (payload) => callback(payload)
        )
        .subscribe();
      return () => client.removeChannel(channel);
    },

    // --- Operaciones protegidas por la clave secreta (página privada) ---
    async post(secret, body, drawing) {
      const { data, error } = await client.rpc("post_message", {
        p_secret: secret,
        p_body: body,
        p_drawing: drawing || null,
      });
      if (error) throw error;
      return data;
    },
    async edit(secret, id, body) {
      const { data, error } = await client.rpc("edit_message", {
        p_secret: secret,
        p_id: id,
        p_body: body,
      });
      if (error) throw error;
      return data;
    },
    async remove(secret, id) {
      const { error } = await client.rpc("remove_message", {
        p_secret: secret,
        p_id: id,
      });
      if (error) throw error;
    },
  };
})();
