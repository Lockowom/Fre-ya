-- =====================================================================
--  PARA TAMARA  ·  Configuración de base de datos (Supabase)
-- ---------------------------------------------------------------------
--  Cómo usarlo:
--   1. Entra a tu proyecto de Supabase  ->  SQL Editor  ->  New query
--   2. Pega TODO este archivo y pulsa  RUN.
--   3. Listo. Luego dame la URL del proyecto y la clave "anon public".
--
--  Seguridad:
--   - Cualquiera puede LEER los mensajes (la web de Tamara solo lee).
--   - ESCRIBIR/EDITAR/BORRAR solo es posible con la clave secreta, que
--     vive únicamente en tu página privada. Nadie más puede escribir,
--     aunque tenga la clave pública del proyecto.
-- =====================================================================

-- Tabla de mensajes -----------------------------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Lectura pública (solo SELECT). Sin políticas de escritura => anon no
-- puede insertar/editar/borrar directamente.
drop policy if exists "tamara_public_read" on public.messages;
create policy "tamara_public_read"
  on public.messages for select
  using (true);

-- Tiempo real: que los nuevos mensajes le lleguen a Tamara al instante.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

-- =====================================================================
--  Funciones seguras de escritura (validan la clave secreta)
-- =====================================================================
-- NOTA: la clave secreta de abajo es la misma que está en tu página
-- privada. Si la cambias aquí, cámbiala también allí.

create or replace function public.post_message(p_secret text, p_body text)
returns public.messages
language plpgsql security definer set search_path = public as $$
declare result public.messages;
begin
  if p_secret is distinct from '82dacfbfa0e526f3827be627517818ce18c90f1c4e377f18' then
    raise exception 'no autorizado';
  end if;
  insert into public.messages (body) values (p_body) returning * into result;
  return result;
end $$;

create or replace function public.edit_message(p_secret text, p_id uuid, p_body text)
returns public.messages
language plpgsql security definer set search_path = public as $$
declare result public.messages;
begin
  if p_secret is distinct from '82dacfbfa0e526f3827be627517818ce18c90f1c4e377f18' then
    raise exception 'no autorizado';
  end if;
  update public.messages set body = p_body where id = p_id returning * into result;
  return result;
end $$;

create or replace function public.remove_message(p_secret text, p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_secret is distinct from '82dacfbfa0e526f3827be627517818ce18c90f1c4e377f18' then
    raise exception 'no autorizado';
  end if;
  delete from public.messages where id = p_id;
end $$;

-- Permitir ejecutar las funciones desde el cliente (validan el secreto).
grant execute on function public.post_message(text, text)        to anon, authenticated;
grant execute on function public.edit_message(text, uuid, text)  to anon, authenticated;
grant execute on function public.remove_message(text, uuid)      to anon, authenticated;

-- (Opcional) Un primer mensaje de bienvenida para que la web no salga vacía.
insert into public.messages (body)
select 'Hola, mi amor. Hice algo solo para ti. Cada palabra que veas aquí salió de mi corazón. Te amo, Tamara.'
where not exists (select 1 from public.messages);
