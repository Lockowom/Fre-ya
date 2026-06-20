# 🌌 Fre-ya · Un universo cinematográfico hecho con amor para Tamara

Una experiencia web **inmersiva en 3D** creada como regalo: un cosmos navegable y
**cinematográfico** (sol, 3 planetas muy detallados, nebulosa, galaxia de partículas)
con una **carta holográfica**, **mensajes en tiempo real**, **dibujos** y un
**viaje narrado** que cuenta vuestra historia de amor estrella por estrella.

> Hecho con **C++ (WebAssembly) + JavaScript + Three.js (WebGL/GLSL)** y **Supabase**.

---

## ✨ Qué incluye

### La experiencia de Tamara (`index.html`)
- **Intro** elegante → toca para entrar.
- **Carta holográfica**: se **materializa** desde un destello, con líneas de escaneo,
  bordes que brillan y flotación suave (interfaz futurista, tono romántico).
- **Carta que se escribe sola** (efecto máquina de escribir).
- **Mensajes en tiempo real**: lo que tú escribes desde el panel le aparece al instante.
- **Dibujos** que se **forman con partículas** ante sus ojos.
- Botones para **minimizar** la carta (‒ / ✦) y disfrutar el universo completo.
- **🚀 Viaje por el universo**: recorrido narrado que cuenta vuestra historia.

### El universo 3D cinematográfico (`assets/js/cosmos.js`)
**Dirección artística: menos objetos, más detalle.**
- ☀️ **1 sol** con granulación, manchas, corona que late, fulguraciones y **god rays**.
- 🪐 **3 planetas protagonistas** con *shaders* procedurales: relieve por normales,
  nubes en capa propia, casquetes polares, luces de ciudades nocturnas, **océano que
  refleja el cosmos** (reflejos PBR/HDRI), atmósferas con dispersión del lado iluminado,
  tormentas, anillos con hueco de Cassini y lunas.
- 🌌 **1 gran nebulosa** (capas que forman un cuerpo) + **1 galaxia** de partículas.
- ⭐ Campo de estrellas que titila, **destellos en cruz** y **polvo espacial**
  flotando frente a la cámara.
- 🎬 **Post-procesado**: bloom (resplandor de cine), grano de película, aberración
  cromática, viñeta y realce de color.
- 🌫️ **Escala y profundidad**: *depth haze* (los cuerpos lejanos pierden contraste),
  *space dust*, *god rays*.
- 🎥 **Cámara cinematográfica**: respiración, micro-drift, inercia y leve balanceo,
  como grabada desde una nave. Parallax al tacto / inclinación del móvil.
- 👆 **Interacción**: arrastra el dedo y la **galaxia C++ reacciona** atrayendo el polvo.
- 📱 **Responsive** (objetos reordenados en vertical) + **resolución dinámica**
  (ajusta el pixelRatio según los FPS para ir siempre fluido).

### 🚀 El viaje narrado (la historia)
Recorrido en **5 paradas**; en cada una la cámara orbita el objeto y aparece un
**panel holográfico legible** con el texto. Se avanza a ritmo propio (**Continuar →**):
1. ☀️ **Cómo empezó todo**
2. 🌎 **Nuestros primeros recuerdos**
3. 🪐 **Superar nuestras diferencias**
4. 🌍 **El presente, aquí y ahora**
5. ✨ **Nuestro futuro entre las estrellas**

### El panel secreto (`para-cris-9ec6caa04a.html`)
- Escribe mensajes y dibuja a mano para Tamara.
- Lista con **editar / borrar**.
- Protegido por una **clave de escritura** (RLS en Supabase).

---

## 🧠 Tecnología

| Capa | Tecnología |
|------|------------|
| Render 3D | **Three.js r128** (WebGL) + **shaders GLSL** propios |
| Física de partículas | **C++** compilado a **WebAssembly** (clang → wasm32) |
| Reflejos | Environment map (cubemap) capturado del propio espacio (estilo HDRI) |
| Post-procesado | UnrealBloomPass + shader de grano/viñeta/aberración |
| Datos / tiempo real | **Supabase** (PostgreSQL + Realtime + RLS) |
| Hosting | **Vercel** (estático) |

### ¿Por qué C++/WebAssembly?
El navegador no ejecuta C++ directamente; **WebAssembly es C++ compilado** que corre
casi a velocidad nativa. El kernel `wasm/particles.cpp` calcula la física de miles de
partículas por frame (rotación diferencial, atractor con resorte amortiguado) y
JavaScript solo lee el buffer y lo dibuja.

---

## 📁 Estructura del proyecto

```
Fre-ya/
├── index.html                     # Experiencia de Tamara (universo + carta + viaje)
├── para-cris-9ec6caa04a.html      # Panel secreto para escribir/dibujar
├── vercel.json                    # Hosting + cabeceras de caché (revalidación)
├── assets/
│   ├── css/  tamara.css, write.css, main.css
│   ├── js/
│   │   ├── cosmos.js              # El universo 3D (Three.js + GLSL + viaje + PBR)
│   │   ├── particle-draw.js       # Dibujos formados con partículas
│   │   ├── tamara.js              # Carta, tiempo real, botones, viaje
│   │   ├── write.js, secret.js    # Lógica del panel secreto
│   │   ├── db.js, config.js       # Conexión a Supabase
│   ├── wasm/particles.wasm        # Kernel C++ compilado
│   ├── vendor/three/              # Three.js + post-procesado (local, sin CDN)
│   └── og.png                     # Imagen de previsualización
├── wasm/particles.cpp             # Fuente C++ del kernel de partículas
└── db/
    ├── setup.sql                  # Tabla, funciones y seguridad (RLS)
    └── migration_drawing.sql      # Soporte de dibujos
```

---

## 🚀 Puesta en marcha

### 1) Base de datos (Supabase)
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → pega `db/setup.sql` → **RUN**.
3. Pega también `db/migration_drawing.sql` → **RUN**.
4. Copia tu **Project URL** y tu **anon/publishable key** (*Settings → API*) en
   `assets/js/config.js`:

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
- Importa el repositorio en [vercel.com](https://vercel.com) (es estático).

### 4) (Opcional) Recompilar el C++
```bash
clang --target=wasm32 -O3 -nostdlib -ffreestanding -fno-exceptions -fno-rtti \
  -Wl,--no-entry -Wl,--export-all \
  -o assets/wasm/particles.wasm wasm/particles.cpp
```

> **Caché:** las rutas de `assets` llevan `?v=N`. Si cambias un archivo, **sube ese
> número** en `index.html` para forzar que el navegador descargue la versión nueva.

---

## 🔐 Seguridad
- La **clave anon/publishable** es pública por diseño (va en el navegador).
- La protección real está en la **RLS** y en la **clave secreta de escritura** que
  exigen las funciones de Supabase: solo quien la conoce puede publicar.
- Recomendado: mantén el **repositorio privado** (la URL secreta va en el código).

---

## 🛠️ Decisiones de diseño (resumen del proceso)
- Se pasó de "muchos objetos" (agujero negro, púlsar, asteroides, cúmulo, cometa…) a
  una **dirección cinematográfica**: pocos objetos, más calidad, más escala.
- Three.js se **aloja localmente** (no depende de CDN) para que cargue en cualquier red.
- **Resolución dinámica** y **calidad adaptativa** para mantener 60fps en móvil.

---

Hecho con cariño. 💖
