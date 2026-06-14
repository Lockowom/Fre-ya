-- =====================================================================
--  MIGRACIÓN: soporte de dibujos
-- ---------------------------------------------------------------------
--  Ejecuta este script UNA VEZ en el SQL Editor de Supabase (después de
--  haber corrido setup.sql). Añade la capacidad de adjuntar un dibujo
--  hecho a mano a cada mensaje.
-- =====================================================================

-- Columna para guardar los trazos del dibujo (puntos normalizados 0..1).
alter table public.messages add column if not exists drawing jsonb;

-- Reemplazamos post_message para que acepte un dibujo opcional.
drop function if exists public.post_message(text, text);

create or replace function public.post_message(
  p_secret  text,
  p_body    text,
  p_drawing jsonb default null
)
returns public.messages
language plpgsql security definer set search_path = public as $$
declare result public.messages;
begin
  if p_secret is distinct from '82dacfbfa0e526f3827be627517818ce18c90f1c4e377f18' then
    raise exception 'no autorizado';
  end if;
  insert into public.messages (body, drawing)
  values (p_body, p_drawing)
  returning * into result;
  return result;
end $$;

grant execute on function public.post_message(text, text, jsonb) to anon, authenticated;
