# Para Tamara 💖

Una web animada y única, hecha con amor. Tú escribes mensajes desde una
página **secreta** y ella los ve aparecer en una experiencia romántica
**en tiempo real** — sin que ella sepa que la escritura existe.

Construida sobre la base de tres experimentos creativos (corazón animado,
efecto linterna 404 y esfera de partículas), que siguen disponibles en `/demos`.

## Cómo funciona

| Página | Para quién | Qué hace |
|--------|-----------|----------|
| `index.html` | **Tamara** | Carta que se escribe sola + cielo de corazones. Solo lee mensajes. Sin rastro de escritura. |
| `para-cris-9ec6caa04a.html` | **Tú (secreto)** | Panel oculto para escribir, editar y borrar mensajes. |
| `demos/*` | — | Los 3 experimentos base. |

Datos en **Supabase**: cualquiera puede *leer*, pero *escribir* exige una
clave secreta que solo vive en tu página privada (funciones `SECURITY DEFINER`).

## Puesta en marcha (3 pasos)

1. **Base de datos** — en tu proyecto de Supabase abre *SQL Editor* y ejecuta
   el contenido de [`db/setup.sql`](db/setup.sql).
2. **Conexión** — copia en `assets/js/config.js`:
   - `SUPABASE_URL` → *Project Settings → Data API → Project URL*
   - `SUPABASE_ANON_KEY` → *Project Settings → API Keys → anon/public*
3. **Despliega** (Vercel) y comparte con Tamara **solo** la URL principal.

## Tu página secreta

- URL: `/para-cris-9ec6caa04a`
- La clave secreta está en `assets/js/secret.js` y debe coincidir con la de
  `db/setup.sql`. Si cambias una, cambia la otra.
- ⚠️ Mantén el repositorio **privado**: el archivo `secret.js` y el nombre de
  la página secreta están en el código.

## Local

No necesita build:

```bash
python3 -m http.server 8000   # http://localhost:8000
```

## Stack

HTML/CSS/JS puro · Canvas 2D · [Supabase](https://supabase.com) (datos + tiempo real)
· GSAP y Three.js (en las demos) · Vercel (hosting).
