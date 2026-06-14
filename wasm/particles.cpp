// =====================================================================
//  particles.cpp  —  Kernel de partículas para Tamara (C++ -> WebAssembly)
//  Un mismo módulo, instanciado varias veces desde JS (cada instancia con
//  su propia memoria), simula distintos objetos del universo según `mode`:
//    mode 0: galaxia espiral (rotación diferencial)
//    mode 1: disco de acreción de un agujero negro (inspiral, Kepler)
//    mode 2: cúmulo estelar 3D (órbitas inclinadas)
//  Más un ATRACTOR interactivo (atracción + resorte amortiguado).
//
//  Build:
//   clang --target=wasm32 -O3 -nostdlib -ffreestanding -fno-exceptions \
//         -fno-rtti -Wl,--no-entry -Wl,--export-all \
//         -o assets/wasm/particles.wasm wasm/particles.cpp
// =====================================================================

#define MAXP 16000

static float P[MAXP * 3];
static float COL[MAXP * 3];
static float rad[MAXP];
static float ang[MAXP];
static float avel[MAXP];
static float vamp[MAXP];
static float vph[MAXP];
static float incl[MAXP];                        // inclinación (cúmulo 3D)
static float ox[MAXP], oy[MAXP], oz[MAXP];
static float ovx[MAXP], ovy[MAXP], ovz[MAXP];
static int   N = 0;
static int   gMode = 0;
static float gRmin = 1, gRmax = 100;

static float gAx = 0, gAy = 0, gAz = 0, gAs = 0; // atractor

static unsigned g_rng = 1u;
static inline unsigned xs() { g_rng ^= g_rng << 13; g_rng ^= g_rng >> 17; g_rng ^= g_rng << 5; return g_rng; }
static inline float frand() { return (xs() >> 8) * (1.0f / 16777216.0f); }

static inline float msin(float x) {
  const float TPI = 6.28318530718f;
  x = x - TPI * __builtin_floorf(x * (1.0f / TPI) + 0.5f);
  float s = 1.27323954f * x - 0.405284735f * x * __builtin_fabsf(x);
  s = 0.225f * (s * __builtin_fabsf(s) - s) + s;
  return s;
}
static inline float mcos(float x) { return msin(x + 1.57079632679f); }

extern "C" {

void init(int count, float rmin, float rmax, unsigned seed, int mode) {
  if (count > MAXP) count = MAXP;
  if (count < 0) count = 0;
  N = count; gMode = mode; gRmin = rmin; gRmax = rmax;
  g_rng = seed ? seed : 1u;
  for (int i = 0; i < N; i++) {
    float t = frand();
    float r;
    if (mode == 1) r = rmin + (rmax - rmin) * t;            // disco uniforme
    else if (mode == 2) r = rmin + (rmax - rmin) * (0.3f + 0.7f * t); // cáscara
    else r = rmin + (rmax - rmin) * (t * t);                 // galaxia: concentra centro

    float a;
    if (mode == 0) {
      int arm = (int)(xs() % 3);
      a = (float)arm * (6.28318530718f / 3.0f) + r * 0.13f + (frand() - 0.5f) * 0.7f;
      avel[i] = 0.65f / (0.6f + r * 0.03f);
      vamp[i] = 1.5f + frand() * 3.0f;
    } else if (mode == 1) {
      a = frand() * 6.28318530718f;
      avel[i] = 0.0f;                                         // se calcula dinámico
      vamp[i] = 0.2f + frand() * 0.4f;
    } else { // cúmulo
      a = frand() * 6.28318530718f;
      avel[i] = 0.12f + frand() * 0.10f;
      vamp[i] = 0.0f;
    }
    rad[i] = r;
    ang[i] = a;
    vph[i] = frand() * 6.28318530718f;
    incl[i] = frand() * 6.28318530718f;
    ox[i] = oy[i] = oz[i] = 0.0f;
    ovx[i] = ovy[i] = ovz[i] = 0.0f;

    float m = r / rmax;
    if (mode == 1) {                  // disco de acreción: interior azul-blanco, exterior naranja
      COL[i * 3 + 0] = 0.7f + 0.3f * m;
      COL[i * 3 + 1] = 0.55f + 0.15f * (1.0f - m);
      COL[i * 3 + 2] = 1.0f - 0.8f * m;
    } else if (mode == 2) {           // cúmulo: blanco cálido/dorado
      float w = 0.8f + 0.2f * frand();
      COL[i * 3 + 0] = w;
      COL[i * 3 + 1] = w * (0.85f + 0.1f * frand());
      COL[i * 3 + 2] = w * (0.7f + 0.2f * frand());
    } else {                          // galaxia
      COL[i * 3 + 0] = 1.0f - m * 0.45f;
      COL[i * 3 + 1] = (0.55f + 0.25f * frand()) * (1.0f - m * 0.25f);
      COL[i * 3 + 2] = 0.55f + m * 0.45f;
    }
  }
}

void setAttractor(float x, float y, float z, float s) { gAx = x; gAy = y; gAz = z; gAs = s; }

void step(float dt, float time) {
  for (int i = 0; i < N; i++) {
    float r = rad[i];
    float av;
    if (gMode == 1) {
      r -= (10.0f / (r + 1.0f)) * dt;                        // inspiral (más rápido cerca)
      if (r < gRmin) r = gRmax;                              // reaparece fuera
      rad[i] = r;
      av = 4.5f / (r * __builtin_sqrtf(r) * 0.15f + 0.4f);   // Kepleriano ~ r^-1.5
    } else {
      av = avel[i];
    }
    ang[i] += av * dt;

    float bx, by, bz;
    if (gMode == 2) {                                        // cúmulo 3D: órbita inclinada
      float x = mcos(ang[i]) * r, z = msin(ang[i]) * r;
      float si = msin(incl[i]), ci = mcos(incl[i]);
      bx = x; by = z * si; bz = z * ci;
    } else {
      bx = mcos(ang[i]) * r;
      bz = msin(ang[i]) * r;
      by = vamp[i] * msin(time * 0.4f + vph[i]) * (1.0f / (1.0f + r * 0.04f));
      if (gMode == 1) by *= 0.18f;                           // disco fino
    }

    float px = bx + ox[i], py = by + oy[i], pz = bz + oz[i];
    if (gAs > 0.0f) {
      float dx = gAx - px, dy = gAy - py, dz = gAz - pz;
      float d2 = dx * dx + dy * dy + dz * dz + 1.0f;
      float inv = 1.0f / __builtin_sqrtf(d2);
      float f = gAs * 60.0f / d2;
      ovx[i] += dx * inv * f * dt; ovy[i] += dy * inv * f * dt; ovz[i] += dz * inv * f * dt;
    }
    ovx[i] += -ox[i] * 4.0f * dt; ovy[i] += -oy[i] * 4.0f * dt; ovz[i] += -oz[i] * 4.0f * dt;
    ovx[i] *= 0.92f; ovy[i] *= 0.92f; ovz[i] *= 0.92f;
    ox[i] += ovx[i] * dt; oy[i] += ovy[i] * dt; oz[i] += ovz[i] * dt;

    P[i * 3 + 0] = bx + ox[i];
    P[i * 3 + 1] = by + oy[i];
    P[i * 3 + 2] = bz + oz[i];
  }
}

float* getPositions() { return P; }
float* getColors()    { return COL; }
int    getCount()     { return N; }

} // extern "C"
