# 🌌 Fre-ya · Un universo hecho con amor para Tamara

Una experiencia web **inmersiva en 3D** creada como regalo: un universo navegable
(sol, planetas detallados, agujero negro, púlsar, galaxias de partículas) con una
**carta que se escribe sola**, **mensajes en tiempo real** y **dibujos** que tú
envías desde un panel secreto y a ella le aparecen al instante.

> Hecho con **C++ (WebAssembly) + JavaScript + Three.js (WebGL/GLSL)** y **Supabase**.

---

## ✨ Qué incluye

### La experiencia de Tamara (`index.html`)
- **Intro** elegante → toca para entrar.
- **Carta romántica** que se escribe sola (efecto máquina de escribir).
- **Mensajes en tiempo real**: cuando tú escribes desde tu panel, a ella le
  aparece solo, sin recargar.
- **Dibujos**: los que dibujas a mano se **forman con partículas** ante sus ojos.
- **Cielo 2D** de corazones, rosas y girasoles (fondo de respaldo).
- Botones para **minimizar la carta** (‒ / ✦) y disfrutar el fondo completo.
- **🚀 Viaje por el universo**: recorrido cinematográfico que vuela y se detiene
  en cada objeto con una frase romántica.

### El universo 3D (`assets/js/cosmos.js`)
- ☀️ **Sol** con granulación, manchas, corona que late y fulguraciones.
- 🪐 **5 planetas** con *shaders* procedurales: relieve por normales, nubes,
  casquetes polares, luces de ciudades nocturnas, océanos especulares,
  atmósferas con dispersión del lado iluminado, tormentas y anillos con hueco
  de Cassini.
- 🌕 **Lunas**, ☄️ **cometa con cola**, 🪨 **cinturón de asteroides**.
- 🕳️ **Agujero negro** con anillo de fotones y disco de acreción.
- 📡 **Púlsar** con haces giratorios.
- 🌌 **3 sistemas de partículas simulados en C++**: galaxia espiral interactiva,
  disco de acreción (Kepleriano) y cúmulo estelar 3D.
- ⭐ Campo de estrellas que titila, **nebulosas**, **galaxia espiral lejana**,
  **constelación con el nombre** y **polvo brillante** flotando.
- 🎬 **Post-procesado**: bloom (resplandor de cine), grano de película,
  aberración cromática, viñeta y realce de color.
- 👆 **Interacción**: arrastra el dedo y la **galaxia C++ reacciona** atrayendo
  el polvo; cámara con parallax al tacto/inclinación del móvil.
- 📱 **Responsive** y **calidad adaptativa** (baja efectos si el dispositivo va justo).

### El panel secreto (`para-cris-9ec6caa04a.html`)
- Escribe mensajes y dibuja a mano para Tamara.
- Lista de mensajes con **editar / borrar**.
- Todo protegido por una **clave de escritura** (RLS en Supabase).

---

## 🧠 Tecnología

| Capa | Tecnología |
|------|------------|
| Render 3D | **Three.js r128** (WebGL) + **shaders GLSL** propios |
| Física de partículas | **C++** compilado a **WebAssembly** (clang → wasm32) |
| Post-procesado | UnrealBloomPass + shader de grano/viñeta/aberración |
| Datos / tiempo real | **Supabase** (PostgreSQL + Realtime + RLS) |
| Hosting | **Vercel** (estático) |

### ¿Por qué C++/WebAssembly?
El navegador no ejecuta C++ directamente; **WebAssembly es C++ compilado** que
corre casi a velocidad nativa. El kernel `wasm/particles.cpp` calcula la física
de **miles de partículas por frame** (rotación diferencial, órbitas Keplerianas,
inspiral, resorte amortiguado hacia un atractor) y JavaScript solo lee el buffer
y lo dibuja. Un mismo módulo se **instancia 3 veces**, cada una con su memoria,
para simular objetos distintos.

---

## 📁 Estructura del proyecto

```
Fre-ya/
├── index.html                     # Experiencia de Tamara (universo + carta)
├── para-cris-9ec6caa04a.html      # Panel secreto para escribir/dibujar
├── vercel.json                    # Config de hosting y cabeceras de caché
├── assets/
│   ├── css/  tamara.css, write.css, main.css
│   ├── js/
│   │   ├── cosmos.js              # El universo 3D (Three.js + GLSL)
│   │   ├── particle-draw.js       # Dibujos formados con partículas
│   │   ├── tamara.js              # Carta, tiempo real, botones, viaje
│   │   ├── write.js, secret.js    # Lógica del panel secreto
│   │   ├── db.js, config.js       # Conexión a Supabase
│   ├── wasm/particles.wasm        # Kernel C++ compilado
│   ├── vendor/three/              # Three.js + post-procesado (local, sin CDN)
│   └── og.png                     # Imagen de previsualización
├── wasm/particles.cpp             # Fuente C++ del kernel de partículas
└── db/
    ├── setup.sql                  # Crea tabla, funciones y seguridad (RLS)
    └── migration_drawing.sql      # Añade soporte de dibujos
```

---

## 🚀 Puesta en marcha

### 1) Base de datos (Supabase)
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor → New query**, pega `db/setup.sql` y pulsa **RUN**.
3. Pega también `db/migration_drawing.sql` y **RUN** (soporte de dibujos).
4. Copia tu **Project URL** y tu **anon/publishable key**
   (*Settings → API*) en `assets/js/config.js`:

```js
window.FREYA_CONFIG = {
  SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_...."
};
```

### 2) Probar en local
```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

### 3) Desplegar en Vercel
- Importa el repositorio en [vercel.com](https://vercel.com) y listo (es estático).

### 4) (Opcional) Recompilar el C++
```bash
clang --target=wasm32 -O3 -nostdlib -ffreestanding -fno-exceptions -fno-rtti \
  -Wl,--no-entry -Wl,--export-all \
  -o assets/wasm/particles.wasm wasm/particles.cpp
```

---

## 🔐 Seguridad
- La **clave anon/publishable** es pública por diseño (va en el navegador).
- La protección real está en la **RLS** y en la **clave secreta de escritura**
  exigida por las funciones de Supabase: solo quien la conoce puede publicar.
- Recomendado: mantén el **repositorio privado** (la URL secreta va en el código).

---

## 💡 Ideas para seguir
- 🎵 Música suave que arranque con el viaje 🚀.
- 💝 "Razones por las que te amo" que se revelan una a una.
- 🖼️ Galería de fotos / recuerdos.
- ⏳ Contador de tiempo juntos.

---

Hecho con cariño. 💖
