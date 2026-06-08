# Fre-ya · Creative Code Lab

Portfolio de experimentos creativos en **HTML, CSS y JavaScript** puro.
Cada demo se muestra junto a un fragmento de su código fuente en una ventana
estilo macOS, sobre un fondo de "lluvia de código".

## Demos

| Demo | Técnica | Archivo |
|------|---------|---------|
| ♥ **Te Amo** — corazón que se dibuja, late y brilla | SVG `stroke-dasharray` + animaciones CSS | `demos/heart.html` |
| 🔦 **You hate darkness** — página 404 a oscuras con linterna | GSAP + máscara radial CSS | `demos/darkness.html` |
| ✨ **Particle Sphere** — 9 000 partículas en esfera Fibonacci | Three.js (WebGL) | `demos/particles.html` |

## Estructura

```
.
├── index.html            # Portada con navegación y tarjetas
├── assets/
│   ├── css/main.css      # Estilos compartidos (portada + demos)
│   └── js/
│       ├── main.js       # Lluvia de código de la portada
│       ├── bg.js         # Fondo de código de las demos
│       ├── darkness.js   # Lógica de la linterna (GSAP)
│       └── particles.js  # Esfera de partículas (Three.js)
└── demos/
    ├── heart.html
    ├── darkness.html
    └── particles.html
```

## Cómo verlo

No necesita build. Abre `index.html` en el navegador, o sirve la carpeta:

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```

> GSAP y Three.js se cargan por CDN, así que las demos 404 y de partículas
> necesitan conexión a internet la primera vez.

## Stack

- HTML5 + CSS3 (custom properties, grid, animaciones, máscaras)
- JavaScript vanilla + Canvas 2D
- [GSAP 3](https://gsap.com/) para la animación de la linterna
- [Three.js r128](https://threejs.org/) para la esfera de partículas
- Tipografías: Poppins, JetBrains Mono, Dancing Script
