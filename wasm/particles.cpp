// =====================================================================
//  particles.cpp  —  Kernel de partículas para Tamara (C++ -> WebAssembly)
//  Galaxia de polvo estelar: rotación diferencial, brazos espirales y
//  ondulación vertical. Además, un ATRACTOR interactivo: las partículas
//  son atraídas hacia el punto que toca el usuario y vuelven con un
//  resorte amortiguado (física de velocidades integrada en C++).
//
//  Build:
//   clang --target=wasm32 -O3 -nostdlib -ffreestanding -fno-exceptions \
//         -fno-rtti -Wl,--no-entry -Wl,--export-all \
//         -o assets/wasm/particles.wasm wasm/particles.cpp
// =====================================================================

#define MAXP 16000

static float P[MAXP * 3];     // posiciones finales (las lee JS)
static float COL[MAXP * 3];   // color por partícula (fijado al iniciar)
static float rad[MAXP];       // radio orbital base
static float ang[MAXP];       // ángulo actual
static float avel[MAXP];      // velocidad angular (rotación diferencial)
static float vamp[MAXP];      // amplitud de ondulación vertical
static float vph[MAXP];       // fase vertical
static float ox[MAXP], oy[MAXP], oz[MAXP];     // desplazamiento por interacción
static float ovx[MAXP], ovy[MAXP], ovz[MAXP];  // velocidad del desplazamiento
static int   N = 0;

// Atractor (posición + fuerza). fuerza 0 = inactivo (las partículas vuelven).
static float gAx = 0, gAy = 0, gAz = 0, gAs = 0;

// --- PRNG (xorshift32) ---
static unsigned g_rng = 1u;
static inline unsigned xs() {
  g_rng ^= g_rng << 13; g_rng ^= g_rng >> 17; g_rng ^= g_rng << 5;
  return g_rng;
}
static inline float frand() { return (xs() >> 8) * (1.0f / 16777216.0f); }

// --- sin/cos sin libc: reducción de rango (f32.floor) + aprox. polinómica ---
static inline float msin(float x) {
  const float TPI = 6.28318530718f;
  x = x - TPI * __builtin_floorf(x * (1.0f / TPI) + 0.5f);
  float s = 1.27323954f * x - 0.405284735f * x * __builtin_fabsf(x);
  s = 0.225f * (s * __builtin_fabsf(s) - s) + s;
  return s;
}
static inline float mcos(float x) { return msin(x + 1.57079632679f); }

extern "C" {

void init(int count, float rmin, float rmax, unsigned seed) {
  if (count > MAXP) count = MAXP;
  if (count < 0) count = 0;
  N = count;
  g_rng = seed ? seed : 1u;
  const float arms = 3.0f;
  for (int i = 0; i < N; i++) {
    int arm = (int)(xs() % 3);
    float t = frand();
    float r = rmin + (rmax - rmin) * (t * t);
    float armAng = (float)arm * (6.28318530718f / arms);
    float a = armAng + r * 0.13f + (frand() - 0.5f) * 0.7f;
    rad[i]  = r;
    ang[i]  = a;
    avel[i] = 0.65f / (0.6f + r * 0.03f);
    vamp[i] = 1.5f + frand() * 3.0f;
    vph[i]  = frand() * 6.28318530718f;
    ox[i] = oy[i] = oz[i] = 0.0f;
    ovx[i] = ovy[i] = ovz[i] = 0.0f;
    float m = r / rmax;
    COL[i * 3 + 0] = 1.0f - m * 0.45f;
    COL[i * 3 + 1] = (0.55f + 0.25f * frand()) * (1.0f - m * 0.25f);
    COL[i * 3 + 2] = 0.55f + m * 0.45f;
  }
}

// Define el atractor (en el espacio local de la galaxia). s=0 lo desactiva.
void setAttractor(float x, float y, float z, float s) {
  gAx = x; gAy = y; gAz = z; gAs = s;
}

void step(float dt, float time) {
  for (int i = 0; i < N; i++) {
    ang[i] += avel[i] * dt;
    float r  = rad[i];
    float bx = mcos(ang[i]) * r;
    float bz = msin(ang[i]) * r;
    float by = vamp[i] * msin(time * 0.4f + vph[i]) * (1.0f / (1.0f + r * 0.04f));

    float px = bx + ox[i], py = by + oy[i], pz = bz + oz[i];

    // atracción hacia el puntero (ley inversa al cuadrado suavizada)
    if (gAs > 0.0f) {
      float dx = gAx - px, dy = gAy - py, dz = gAz - pz;
      float d2 = dx * dx + dy * dy + dz * dz + 1.0f;
      float inv = 1.0f / __builtin_sqrtf(d2);
      float f = gAs * 60.0f / d2;
      ovx[i] += dx * inv * f * dt;
      ovy[i] += dy * inv * f * dt;
      ovz[i] += dz * inv * f * dt;
    }
    // resorte de retorno + amortiguación
    ovx[i] += -ox[i] * 4.0f * dt;
    ovy[i] += -oy[i] * 4.0f * dt;
    ovz[i] += -oz[i] * 4.0f * dt;
    ovx[i] *= 0.92f; ovy[i] *= 0.92f; ovz[i] *= 0.92f;
    ox[i] += ovx[i] * dt;
    oy[i] += ovy[i] * dt;
    oz[i] += ovz[i] * dt;

    P[i * 3 + 0] = bx + ox[i];
    P[i * 3 + 1] = by + oy[i];
    P[i * 3 + 2] = bz + oz[i];
  }
}

float* getPositions() { return P; }
float* getColors()    { return COL; }
int    getCount()     { return N; }

} // extern "C"
