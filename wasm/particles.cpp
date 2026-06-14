// =====================================================================
//  particles.cpp  —  Kernel de partículas para Tamara (C++ -> WebAssembly)
//  Simula una galaxia de polvo estelar: rotación diferencial (el centro
//  gira más rápido), brazos espirales y ondulación vertical. Se compila
//  freestanding (sin libc) a wasm32 y JavaScript lee el buffer cada frame.
//
//  Build:
//   clang --target=wasm32 -O3 -nostdlib -ffreestanding -fno-exceptions \
//         -fno-rtti -Wl,--no-entry -Wl,--export-all \
//         -o assets/wasm/particles.wasm wasm/particles.cpp
// =====================================================================

#define MAXP 16000

static float P[MAXP * 3];     // posiciones (x,y,z) que lee JS
static float COL[MAXP * 3];   // color por partícula (se fija al iniciar)
static float rad[MAXP];       // radio orbital
static float ang[MAXP];       // ángulo actual
static float avel[MAXP];      // velocidad angular (rotación diferencial)
static float vamp[MAXP];      // amplitud de ondulación vertical
static float vph[MAXP];       // fase vertical
static int   N = 0;

// --- PRNG (xorshift32) ---
static unsigned g_rng = 1u;
static inline unsigned xs() {
  g_rng ^= g_rng << 13; g_rng ^= g_rng >> 17; g_rng ^= g_rng << 5;
  return g_rng;
}
static inline float frand() { return (xs() >> 8) * (1.0f / 16777216.0f); } // 0..1

// --- trig sin libc: reducción de rango con f32.floor + aprox. polinómica ---
static inline float msin(float x) {
  const float TPI = 6.28318530718f, PI = 3.14159265359f;
  x = x - TPI * __builtin_floorf(x * (1.0f / TPI) + 0.5f); // -> [-PI, PI]
  float s = 1.27323954f * x - 0.405284735f * x * __builtin_fabsf(x);
  s = 0.225f * (s * __builtin_fabsf(s) - s) + s;           // refinado
  return s;
}
static inline float mcos(float x) { return msin(x + 1.57079632679f); }

extern "C" {

// Inicializa la galaxia con `count` partículas entre radios rmin..rmax.
void init(int count, float rmin, float rmax, unsigned seed) {
  if (count > MAXP) count = MAXP;
  if (count < 0) count = 0;
  N = count;
  g_rng = seed ? seed : 1u;
  const float arms = 3.0f;
  for (int i = 0; i < N; i++) {
    int arm = (int)(xs() % 3);
    float t = frand();
    float r = rmin + (rmax - rmin) * (t * t);             // concentra hacia el centro
    float armAng = (float)arm * (6.28318530718f / arms);
    float a = armAng + r * 0.13f + (frand() - 0.5f) * 0.7f; // brazo espiral + dispersión
    rad[i]  = r;
    ang[i]  = a;
    avel[i] = 0.65f / (0.6f + r * 0.03f);                  // el centro gira más rápido
    vamp[i] = 1.5f + frand() * 3.0f;
    vph[i]  = frand() * 6.28318530718f;
    // color: núcleo cálido -> bordes rosados/azulados
    float m = r / rmax;
    COL[i * 3 + 0] = 1.0f - m * 0.45f;
    COL[i * 3 + 1] = (0.55f + 0.25f * frand()) * (1.0f - m * 0.25f);
    COL[i * 3 + 2] = 0.55f + m * 0.45f;
  }
}

// Avanza la simulación dt segundos (time = tiempo total para la onda).
void step(float dt, float time) {
  for (int i = 0; i < N; i++) {
    ang[i] += avel[i] * dt;
    float r = rad[i];
    float c = mcos(ang[i]);
    float s = msin(ang[i]);
    float y = vamp[i] * msin(time * 0.4f + vph[i]) * (1.0f / (1.0f + r * 0.04f));
    P[i * 3 + 0] = c * r;
    P[i * 3 + 1] = y;
    P[i * 3 + 2] = s * r;
  }
}

float* getPositions() { return P; }
float* getColors()    { return COL; }
int    getCount()     { return N; }

} // extern "C"
