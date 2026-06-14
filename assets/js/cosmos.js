// =====================================================================
//  Cosmos 3D inmersivo para Tamara — Three.js (r128, THREE global) + GLSL.
//  Versión detallista: planetas con nubes, casquetes polares, luces
//  nocturnas, especular y atmósfera; lunas, cinturón de asteroides,
//  corona y fulguraciones solares, galaxia espiral, cometa con cola y
//  estrellas que titilan. Cámara con auto-órbita + parallax.
//
//  Degrada con elegancia: si WebGL/THREE no están, queda el fondo 2D.
// =====================================================================
(() => {
  const canvas = document.getElementById("cosmos");
  if (!canvas) return;
  if (!window.THREE) { console.warn("[cosmos] THREE no cargó: se muestra el fondo 2D."); return; }
  console.log("[cosmos] THREE", THREE.REVISION, "— iniciando universo 3D");

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return; }
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x120516, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 4000);
  camera.position.set(0, 6, 46);
  let camDist = 46; // distancia base de cámara (responsiva, ver resize)

  // ---------- texturas radiales utilitarias ----------
  function radialTexture(stops, size = 256) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const t = new THREE.Texture(c);
    t.needsUpdate = true;
    return t;
  }

  // ---------- ruido GLSL (hash + fbm) ----------
  const NOISE = `
    vec3 hash3(vec3 p){
      p = vec3(dot(p,vec3(127.1,311.7,74.7)),
               dot(p,vec3(269.5,183.3,246.1)),
               dot(p,vec3(113.5,271.9,124.6)));
      return -1.0 + 2.0*fract(sin(p)*43758.5453123);
    }
    float noise(vec3 p){
      vec3 i = floor(p); vec3 f = fract(p);
      vec3 u = f*f*(3.0-2.0*f);
      return mix(mix(mix(dot(hash3(i+vec3(0,0,0)),f-vec3(0,0,0)),
                         dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),
                     mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)),
                         dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
                 mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)),
                         dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),
                     mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)),
                         dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);
    }
    float fbm(vec3 p){ float v=0.0,a=0.5; for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
    float ridged(vec3 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*(1.0-abs(noise(p))); p*=2.05; a*=0.5; } return v; }
  `;

  // ===================== CIELO DE FONDO (domo con degradado) =====================
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1800, 32, 32),
    new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: NOISE + `
        varying vec3 vP;
        void main(){
          vec3 d = normalize(vP);
          float h = d.y*0.5 + 0.5;
          vec3 top = vec3(0.05,0.015,0.07);
          vec3 horizon = vec3(0.21,0.05,0.20);
          vec3 col = mix(horizon, top, smoothstep(0.1,0.7,h));
          col += vec3(0.35,0.07,0.26) * pow(max(0.0, dot(d, normalize(vec3(0.6,-0.5,0.3)))), 3.0) * 0.6;
          col += vec3(0.10,0.05,0.20) * pow(max(0.0, dot(d, normalize(vec3(-0.5,0.4,-0.4)))), 4.0);
          // polvo estelar muy tenue
          col += vec3(0.04) * smoothstep(0.6,0.9, fbm(d*40.0));
          gl_FragColor = vec4(col, 1.0);
        }`,
      side: THREE.BackSide, depthWrite: false,
    })
  );
  scene.add(sky);

  // ===================== SOL =====================
  const sunUniforms = { uTime: { value: 0 } };
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 96, 96),
    new THREE.ShaderMaterial({
      uniforms: sunUniforms,
      vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: NOISE + `
        uniform float uTime; varying vec3 vP;
        void main(){
          vec3 p = normalize(vP);
          float gran = fbm(p*7.0 + vec3(uTime*0.3));
          float cells = ridged(p*4.0 - vec3(uTime*0.18));
          float h = gran*0.5 + cells*0.5;
          vec3 hot=vec3(1.0,0.96,0.78), mid=vec3(1.0,0.55,0.18), low=vec3(0.85,0.15,0.22);
          vec3 col = mix(low, mid, smoothstep(0.15,0.5,h));
          col = mix(col, hot, smoothstep(0.5,0.9,h));
          // manchas solares
          float spot = smoothstep(0.62,0.5, fbm(p*5.0+10.0));
          col *= mix(1.0, 0.55, spot);
          gl_FragColor = vec4(col*1.45, 1.0);
        }`,
    })
  );
  scene.add(sun);

  // corona + halo
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture([[0, "rgba(255,225,160,0.85)"], [0.22, "rgba(255,150,70,0.5)"], [0.5, "rgba(255,90,80,0.18)"], [1, "rgba(255,80,80,0)"]]),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  corona.scale.set(30, 30, 1);
  scene.add(corona);

  // fulguraciones (flares) que laten cerca de la superficie
  const flareTex = radialTexture([[0, "rgba(255,230,180,0.9)"], [0.5, "rgba(255,140,60,0.4)"], [1, "rgba(255,120,60,0)"]]);
  const flares = [];
  for (let i = 0; i < 4; i++) {
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    const a = Math.random() * Math.PI * 2, el = (Math.random() - 0.5) * 1.2;
    fl.userData = { a, el, ph: Math.random() * Math.PI * 2, base: 5 + Math.random() * 3 };
    scene.add(fl);
    flares.push(fl);
  }

  // ===================== PLANETAS =====================
  const planetVert = `
    varying vec3 vWN; varying vec3 vP; varying vec3 vWP;
    void main(){
      vP = position;
      vWN = normalize(mat3(modelMatrix) * normal);
      vec4 wp = modelMatrix * vec4(position,1.0);
      vWP = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`;

  const planetFrag = NOISE + `
    uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
    uniform float uTime; uniform float uSeed; uniform float uBands;
    uniform float uNight; uniform float uIce; uniform float uWater;
    varying vec3 vWN; varying vec3 vP; varying vec3 vWP;
    void main(){
      vec3 p = normalize(vP);
      float n = fbm(p*2.6 + uSeed);
      float detail = ridged(p*7.0 + uSeed);
      float band = uBands>0.5 ? fbm(vec3(p.y*7.0, uTime*0.03, uSeed)) : fbm(p*4.5 + n + uSeed);
      vec3 col = mix(uA, uB, smoothstep(0.25,0.65,n));
      col = mix(col, uC, clamp(band*0.6,0.0,1.0));
      col *= 0.85 + 0.3*detail;
      // tormentas en gigantes gaseosos
      if(uBands>0.5){
        float storm = smoothstep(0.78,0.9, fbm(p*5.0+uSeed*2.0));
        col = mix(col, vec3(0.9,0.4,0.3), storm*0.6);
      }
      // casquetes polares
      if(uIce>0.5){
        float lat = abs(p.y);
        float ice = smoothstep(0.70,0.86, lat + fbm(p*6.0)*0.06);
        col = mix(col, vec3(0.95,0.98,1.0), ice);
      }
      // relieve: perturbar la normal con el gradiente de altura (montañas que sombrean)
      float e = 0.015;
      float h0 = fbm(p*6.0 + uSeed);
      vec3 grad = vec3(
        fbm((p+vec3(e,0.0,0.0))*6.0 + uSeed) - h0,
        fbm((p+vec3(0.0,e,0.0))*6.0 + uSeed) - h0,
        fbm((p+vec3(0.0,0.0,e))*6.0 + uSeed) - h0) / e;
      float relief = (uBands>0.5) ? 0.04 : 0.14;
      vec3 N = normalize(vWN - grad*relief);
      vec3 L = normalize(-vWP);                 // el sol está en el origen
      vec3 V = normalize(cameraPosition - vWP);
      vec3 H = normalize(L + V);
      float diff = clamp(dot(N,L),0.0,1.0);
      // brillo especular: fuerte en el agua, nulo en gigantes gaseosos
      float water = (uWater>0.5) ? (1.0 - smoothstep(0.42,0.52,n)) : (uBands>0.5 ? 0.0 : 0.4);
      float spec = water * pow(max(dot(N,H),0.0), 45.0) * diff * 0.9;
      float term = smoothstep(0.0,0.3,diff);
      vec3 lit = col*(0.05 + diff) + vec3(1.0)*spec + vec3(1.0,0.5,0.3)*pow(1.0-term,3.0)*0.18;
      // luces nocturnas (ciudades)
      if(uNight>0.5){
        float dark = smoothstep(0.18,0.0,diff);
        float city = smoothstep(0.58,0.74, fbm(p*10.0+uSeed*1.7));
        lit += vec3(1.0,0.82,0.45)*city*dark*0.9;
      }
      gl_FragColor = vec4(lit,1.0);
    }`;

  const cloudFrag = NOISE + `
    uniform float uTime; uniform float uSeed; varying vec3 vWN; varying vec3 vP; varying vec3 vWP;
    void main(){
      vec3 p = normalize(vP);
      float c = fbm(p*3.2 + vec3(uTime*0.02,0.0,uSeed));
      float c2 = fbm(p*6.5 - vec3(uTime*0.035));
      float a = smoothstep(0.52,0.8, c*0.65 + c2*0.35);
      vec3 N=normalize(vWN); vec3 L=normalize(-vWP);
      float diff = clamp(dot(N,L),0.0,1.0);
      gl_FragColor = vec4(vec3(1.0)*(0.15+diff), a*(0.2+diff*0.8));
    }`;

  function atmosphere(radius, color) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.2, 48, 48),
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(color) } },
        vertexShader: `varying vec3 vN; varying vec3 vV;
          void main(){ vN=normalize(normalMatrix*normal);
            vec4 mv=modelViewMatrix*vec4(position,1.0); vV=normalize(-mv.xyz);
            gl_Position=projectionMatrix*mv; }`,
        fragmentShader: `uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
          void main(){ float r=pow(1.0-max(dot(vN,vV),0.0),2.5); gl_FragColor=vec4(uColor,r*0.9); }`,
        side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
      })
    );
  }

  function makePlanetMaterial(cfg) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uA: { value: new THREE.Color(cfg.a) }, uB: { value: new THREE.Color(cfg.b) }, uC: { value: new THREE.Color(cfg.c) },
        uTime: { value: 0 }, uSeed: { value: Math.random() * 10 }, uBands: { value: cfg.bands || 0 },
        uNight: { value: cfg.night ? 1 : 0 }, uIce: { value: cfg.ice ? 1 : 0 }, uWater: { value: cfg.water ? 1 : 0 },
      },
      vertexShader: planetVert, fragmentShader: planetFrag,
    });
  }

  const PLANETS = [
    { r: 0.9, dist: 9,  speed: 0.55, tilt: 0.15, a: 0x8a5a3c, b: 0xd9a066, c: 0xffe0b0, atm: 0xffb070 },
    { r: 1.5, dist: 14, speed: 0.34, tilt: 0.40, a: 0x16407a, b: 0x2f8f5a, c: 0x9be7ff, atm: 0x6fc8ff, clouds: true, night: true, ice: true, water: true, moons: 1 }, // tierra
    { r: 1.1, dist: 18, speed: 0.27, tilt: 0.50, a: 0x8f2f23, b: 0xc9603a, c: 0xffc28a, atm: 0xff8a6a, ice: true }, // marte
    { r: 2.6, dist: 25, speed: 0.16, tilt: 0.20, a: 0xb98f5a, b: 0xe8c896, c: 0xfff0d0, atm: 0xf6dca0, bands: 1, moons: 2 }, // júpiter
    { r: 2.0, dist: 34, speed: 0.11, tilt: 0.55, a: 0xc7b07a, b: 0xe6d6a8, c: 0xfff4d8, atm: 0xe9dcae, bands: 1, ring: true }, // saturno
  ];

  const planets = PLANETS.map((cfg) => {
    const pivot = new THREE.Object3D();
    pivot.rotation.x = cfg.tilt;
    scene.add(pivot);

    const mat = makePlanetMaterial(cfg);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(cfg.r, 64, 64), mat);
    mesh.rotation.z = cfg.tilt * 0.5;
    const group = new THREE.Group();
    group.add(mesh, atmosphere(cfg.r, cfg.atm));

    let cloudMat = null;
    if (cfg.clouds) {
      cloudMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uSeed: { value: Math.random() * 10 } },
        vertexShader: planetVert, fragmentShader: cloudFrag, transparent: true, depthWrite: false,
      });
      group.add(new THREE.Mesh(new THREE.SphereGeometry(cfg.r * 1.03, 48, 48), cloudMat));
    }

    if (cfg.ring) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(cfg.r * 1.35, cfg.r * 2.3, 96),
        new THREE.MeshBasicMaterial({
          map: radialTexture([[0, "rgba(0,0,0,0)"], [0.5, "rgba(255,235,200,0)"], [0.56, "rgba(255,228,192,0.9)"], [0.66, "rgba(210,180,140,0.3)"], [0.72, "rgba(255,235,205,0.85)"], [0.85, "rgba(220,190,150,0.45)"], [1, "rgba(0,0,0,0)"]]),
          side: THREE.DoubleSide, transparent: true, depthWrite: false,
        })
      );
      ring.rotation.x = Math.PI / 2 - 0.35;
      group.add(ring);
    }

    // lunas
    const moons = [];
    for (let m = 0; m < (cfg.moons || 0); m++) {
      const mr = cfg.r * (0.22 + Math.random() * 0.12);
      const mMat = makePlanetMaterial({ a: 0x888888, b: 0xb0b0b0, c: 0xe0e0e0 });
      const moon = new THREE.Mesh(new THREE.SphereGeometry(mr, 24, 24), mMat);
      const mp = new THREE.Object3D();
      mp.rotation.x = (Math.random() - 0.5) * 0.8;
      moon.position.x = cfg.r * (1.8 + m * 0.9);
      mp.add(moon);
      group.add(mp);
      moons.push({ pivot: mp, mat: mMat, speed: 0.6 + Math.random() * 0.6, angle: Math.random() * 6.28 });
    }

    group.position.x = cfg.dist;
    pivot.add(group);

    // órbita tenue
    const orbit = new THREE.Mesh(
      new THREE.RingGeometry(cfg.dist - 0.02, cfg.dist + 0.02, 160),
      new THREE.MeshBasicMaterial({ color: 0xff9ec4, transparent: true, opacity: 0.06, side: THREE.DoubleSide })
    );
    orbit.rotation.x = Math.PI / 2;
    pivot.add(orbit);

    return { cfg, group, mesh, mat, cloudMat, moons, angle: Math.random() * Math.PI * 2 };
  });

  // ===================== CINTURÓN DE ASTEROIDES =====================
  let asteroidBelt;
  (() => {
    const N = 900, inner = 20.5, outer = 23.5;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = inner + Math.random() * (outer - inner);
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
      pos[i * 3 + 2] = Math.sin(a) * r;
      const sh = 0.4 + Math.random() * 0.4;
      col.set([sh, sh * 0.85, sh * 0.7], i * 3);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const belt = new THREE.Points(g, new THREE.PointsMaterial({
      size: 0.35, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false,
      map: radialTexture([[0, "rgba(255,255,255,1)"], [0.5, "rgba(200,180,160,0.6)"], [1, "rgba(0,0,0,0)"]]),
    }));
    belt.userData.spin = 0.05;
    scene.add(belt);
    asteroidBelt = belt;
  })();

  // ===================== ESTRELLAS QUE TITILAN =====================
  const starTex = radialTexture([[0, "rgba(255,255,255,1)"], [0.4, "rgba(255,255,255,0.7)"], [1, "rgba(255,255,255,0)"]]);
  function makeStars(count, spread, baseSize) {
    const tints = [[1, 1, 1], [1, 0.85, 0.92], [0.81, 0.89, 1], [1, 0.94, 0.78]];
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
    const siz = new Float32Array(count), pha = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = spread * (0.4 + Math.random() * 0.6);
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph) * 0.7;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const c = tints[(Math.random() * tints.length) | 0];
      col.set(c, i * 3);
      siz[i] = baseSize * (0.5 + Math.random() * 1.2);
      pha[i] = Math.random() * Math.PI * 2;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(siz, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(pha, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uTex: { value: starTex } },
      vertexShader: `
        attribute vec3 aColor; attribute float aSize; attribute float aPhase;
        varying vec3 vColor; varying float vTw; uniform float uTime;
        void main(){
          vColor = aColor;
          vTw = 0.5 + 0.5*sin(uTime*2.2 + aPhase);
          vec4 mv = modelViewMatrix*vec4(position,1.0);
          gl_PointSize = aSize * (0.6+0.8*vTw) * (300.0/-mv.z);
          gl_Position = projectionMatrix*mv;
        }`,
      fragmentShader: `
        uniform sampler2D uTex; varying vec3 vColor; varying float vTw;
        void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vColor, t.a*(0.4+0.6*vTw)); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    return { points: new THREE.Points(g, mat), mat };
  }
  const starsFar = makeStars(2400, 1100, 3.0);
  const starsNear = makeStars(800, 420, 5.0);
  scene.add(starsFar.points, starsNear.points);

  // ===================== GALAXIA ESPIRAL LEJANA =====================
  function galaxyTexture() {
    const s = 512, c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, s, s);
    const cx = s / 2, cy = s / 2;
    // núcleo
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.18);
    core.addColorStop(0, "rgba(255,240,210,0.95)");
    core.addColorStop(1, "rgba(255,210,160,0)");
    ctx.fillStyle = core; ctx.fillRect(0, 0, s, s);
    // brazos espirales
    ctx.globalCompositeOperation = "lighter";
    const arms = 2;
    for (let a = 0; a < arms; a++) {
      for (let i = 0; i < 2600; i++) {
        const t = i / 2600;
        const ang = a * Math.PI + t * 6.0 + (Math.random() - 0.5) * 0.5;
        const rad = t * s * 0.46;
        const x = cx + Math.cos(ang) * rad;
        const y = cy + Math.sin(ang) * rad * 0.62;
        const tint = Math.random();
        ctx.fillStyle = tint < 0.5 ? "rgba(255,200,230,0.5)" : tint < 0.8 ? "rgba(180,200,255,0.5)" : "rgba(255,235,200,0.6)";
        const sz = (1 - t) * 2.4 + 0.3;
        ctx.beginPath(); ctx.arc(x, y, sz, 0, 6.28); ctx.fill();
      }
    }
    const t = new THREE.Texture(c); t.needsUpdate = true; return t;
  }
  const galaxy = new THREE.Sprite(new THREE.SpriteMaterial({
    map: galaxyTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55,
  }));
  galaxy.scale.set(520, 520, 1);
  galaxy.position.set(-520, 180, -1100);
  scene.add(galaxy);

  // ===================== NEBULOSAS =====================
  const nebTex = radialTexture([[0, "rgba(255,150,205,0.55)"], [0.4, "rgba(150,90,220,0.22)"], [1, "rgba(60,30,90,0)"]]);
  const nebGroup = new THREE.Group();
  const nebColors = ["#ff6fb5", "#9a6bff", "#5fb0ff", "#ff9a6f"];
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: nebTex, color: new THREE.Color(nebColors[i % nebColors.length]),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5,
    }));
    const sc = 90 + Math.random() * 160;
    s.scale.set(sc, sc, 1);
    s.position.set((Math.random() - 0.5) * 700, (Math.random() - 0.5) * 300, -250 - Math.random() * 500);
    nebGroup.add(s);
  }
  scene.add(nebGroup);

  // ===================== COMETA CON COLA =====================
  const comet = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture([[0, "rgba(220,245,255,1)"], [0.35, "rgba(150,210,255,0.6)"], [1, "rgba(120,180,255,0)"]]),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  comet.scale.set(5, 5, 1);
  scene.add(comet);
  const TAIL = 70;
  const tailGeo = new THREE.BufferGeometry();
  const tailPos = new Float32Array(TAIL * 3);
  const tailAlpha = new Float32Array(TAIL);
  tailGeo.setAttribute("position", new THREE.BufferAttribute(tailPos, 3));
  tailGeo.setAttribute("aAlpha", new THREE.BufferAttribute(tailAlpha, 1));
  const tail = new THREE.Points(tailGeo, new THREE.ShaderMaterial({
    uniforms: { uTex: { value: starTex } },
    vertexShader: `attribute float aAlpha; varying float vA; void main(){ vA=aAlpha;
      vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=aAlpha*9.0*(300.0/-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform sampler2D uTex; varying float vA; void main(){ vec4 t=texture2D(uTex,gl_PointCoord); gl_FragColor=vec4(0.75,0.9,1.0,t.a*vA); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(tail);
  let cometAngle = Math.random() * 6.28;
  const cometTrail = [];

  // ===================== ESTRELLAS FUGACES =====================
  const shooters = [];
  function spawnShooter() {
    const geo = new THREE.BufferGeometry();
    const start = new THREE.Vector3((Math.random() - 0.5) * 220, 45 + Math.random() * 40, -60 - Math.random() * 90);
    const dir = new THREE.Vector3(-1 - Math.random(), -0.6 - Math.random() * 0.5, 0).normalize();
    const pts = [];
    for (let i = 0; i < 14; i++) pts.push(start.clone().add(dir.clone().multiplyScalar(i * 2.2)));
    geo.setFromPoints(pts);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffd9f0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
    scene.add(line);
    shooters.push({ line, dir, life: 0, ttl: 1.1 + Math.random() * 0.6, speed: 95 + Math.random() * 60 });
  }

  // ===================== CORAZÓN DE PARTÍCULAS =====================
  const heartGeo = new THREE.BufferGeometry();
  const HC = 1600, hpos = new Float32Array(HC * 3);
  for (let i = 0; i < HC; i++) {
    const t = Math.random() * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    hpos[i * 3] = x * 0.45 + (Math.random() - 0.5) * 0.6;
    hpos[i * 3 + 1] = y * 0.45 + (Math.random() - 0.5) * 0.6;
    hpos[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
  }
  heartGeo.setAttribute("position", new THREE.BufferAttribute(hpos, 3));
  const heart = new THREE.Points(heartGeo, new THREE.PointsMaterial({
    color: 0xff5d8f, size: 0.5, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
    map: radialTexture([[0, "rgba(255,255,255,1)"], [0.5, "rgba(255,120,170,0.7)"], [1, "rgba(255,90,140,0)"]]),
  }));
  heart.position.set(-30, 16, -42);
  scene.add(heart);

  // ===================== CONSTELACIÓN "TAMARA" =====================
  let constMat = null;
  (() => {
    const cw = 512, ch = 160, c = document.createElement("canvas");
    c.width = cw; c.height = ch;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 120px Georgia, 'Times New Roman', serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Tamara", cw / 2, ch / 2);
    const img = ctx.getImageData(0, 0, cw, ch).data;
    const pts = [];
    const step = 7, scale = 0.72;
    for (let y = 0; y < ch; y += step) {
      for (let x = 0; x < cw; x += step) {
        if (img[(y * cw + x) * 4] > 130 && Math.random() < 0.55) {
          pts.push(new THREE.Vector3((x - cw / 2) * scale, -(y - ch / 2) * scale, (Math.random() - 0.5) * 6));
        }
      }
    }
    // estrellas del nombre
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(pts.length * 3), col = new Float32Array(pts.length * 3);
    const siz = new Float32Array(pts.length), pha = new Float32Array(pts.length);
    pts.forEach((p, i) => {
      pos.set([p.x, p.y, p.z], i * 3);
      col.set([1.0, 0.78, 0.9], i * 3);
      siz[i] = 5 + Math.random() * 4;
      pha[i] = Math.random() * 6.28;
    });
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(siz, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(pha, 1));
    constMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uTex: { value: starTex } },
      vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aPhase;
        varying vec3 vColor; varying float vTw; uniform float uTime;
        void main(){ vColor=aColor; vTw=0.5+0.5*sin(uTime*2.0+aPhase);
          vec4 mv=modelViewMatrix*vec4(position,1.0);
          gl_PointSize=aSize*(0.5+0.9*vTw)*(300.0/-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D uTex; varying vec3 vColor; varying float vTw;
        void main(){ vec4 t=texture2D(uTex,gl_PointCoord); gl_FragColor=vec4(vColor,t.a*(0.4+0.6*vTw)); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const cloud = new THREE.Points(g, constMat);

    // líneas de constelación entre estrellas cercanas
    const segs = [];
    const maxD = step * scale * 2.0;
    for (let i = 0; i < pts.length; i++) {
      let links = 0;
      for (let j = i + 1; j < pts.length && links < 2; j++) {
        if (pts[i].distanceTo(pts[j]) < maxD) { segs.push(pts[i], pts[j]); links++; }
      }
    }
    const lg = new THREE.BufferGeometry().setFromPoints(segs);
    const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({
      color: 0xff9ec4, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending,
    }));

    const group = new THREE.Group();
    group.add(cloud, lines);
    group.position.set(0, 150, -640);
    scene.add(group);
    constMat.userData.group = group;
  })();

  // ===================== DESTELLOS ANAMÓRFICOS DEL SOL =====================
  function streakTexture(horizontal) {
    const s = 256, c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d");
    const g = horizontal
      ? ctx.createLinearGradient(0, 0, s, 0)
      : ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, "rgba(255,220,180,0)");
    g.addColorStop(0.5, "rgba(255,235,210,0.9)");
    g.addColorStop(1, "rgba(255,220,180,0)");
    ctx.fillStyle = g;
    if (horizontal) ctx.fillRect(0, s * 0.46, s, s * 0.08);
    else ctx.fillRect(s * 0.46, 0, s * 0.08, s);
    const t = new THREE.Texture(c); t.needsUpdate = true; return t;
  }
  const streaks = [];
  [[true, 50, 4], [false, 4, 30]].forEach(([h, sx, sy]) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: streakTexture(h), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7,
    }));
    sp.scale.set(sx, sy, 1);
    scene.add(sp);
    streaks.push(sp);
  });

  // ===================== AURORAS POLARES (planeta tierra) =====================
  const auroraMats = [];
  (() => {
    const earth = planets[1];
    if (!earth) return;
    const r = earth.cfg.r;
    function cap(flip) {
      const geo = new THREE.SphereGeometry(r * 1.12, 40, 16, 0, Math.PI * 2, 0, 0.5);
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uC1: { value: new THREE.Color(0x66ffcc) }, uC2: { value: new THREE.Color(0xff88dd) } },
        vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: NOISE + `
          uniform float uTime; uniform vec3 uC1; uniform vec3 uC2; varying vec3 vP;
          void main(){
            vec3 p = normalize(vP);
            float lon = atan(p.z, p.x);
            float curtain = fbm(vec3(lon*3.5, p.y*5.0 - uTime*0.4, uTime*0.12));
            float band = smoothstep(0.15,0.6, curtain);
            float lat = smoothstep(0.55,0.95, p.y);
            vec3 col = mix(uC1, uC2, curtain);
            gl_FragColor = vec4(col, band*lat*0.6);
          }`,
        side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const m = new THREE.Mesh(geo, mat);
      if (flip) m.rotation.x = Math.PI;
      earth.group.add(m);
      auroraMats.push(mat);
    }
    cap(false); cap(true);
  })();

  // ===================== POLVO EN LOS ANILLOS (Saturno) =====================
  (() => {
    const sat = planets[4];
    if (!sat) return;
    const N = 1200, inner = sat.cfg.r * 1.35, outer = sat.cfg.r * 2.3;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const rr = inner + Math.random() * (outer - inner);
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * rr;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.06;
      pos[i * 3 + 2] = Math.sin(a) * rr;
      const sh = 0.7 + Math.random() * 0.3;
      col.set([sh, sh * 0.92, sh * 0.78], i * 3);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const dust = new THREE.Points(g, new THREE.PointsMaterial({
      size: 0.12, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: radialTexture([[0, "rgba(255,255,255,1)"], [0.5, "rgba(240,225,190,0.6)"], [1, "rgba(0,0,0,0)"]]),
    }));
    dust.rotation.x = Math.PI / 2 - 0.35;
    sat.group.add(dust);
    sat.ringDust = dust;
  })();

  // ===================== GALAXIA DE POLVO (C++ -> WebAssembly) =====================
  // La física de miles de partículas se calcula en C++ compilado a WASM.
  let wasm = null, wGeo = null, wGalaxy = null;
  (function loadWasm() {
    if (!window.WebAssembly) return;
    const coarse = (window.matchMedia && window.matchMedia("(pointer:coarse)").matches) || window.innerWidth < 820;
    const count = coarse ? 7000 : 14000;
    fetch("assets/wasm/particles.wasm?v=3")
      .then((r) => r.arrayBuffer())
      .then((b) => WebAssembly.instantiate(b, {}))
      .then(({ instance }) => {
        const e = instance.exports;
        e.init(count, 30.0, 130.0, (Math.random() * 1e9) >>> 0);
        e.step(0.016, 0.0);
        const n = e.getCount();
        const pos = new Float32Array(e.memory.buffer, e.getPositions(), n * 3);
        const col = new Float32Array(e.memory.buffer, e.getColors(), n * 3);
        wGeo = new THREE.BufferGeometry();
        wGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        wGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
        wGalaxy = new THREE.Points(wGeo, new THREE.PointsMaterial({
          size: 0.7, vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false,
          blending: THREE.AdditiveBlending, sizeAttenuation: true,
          map: radialTexture([[0, "rgba(255,255,255,1)"], [0.5, "rgba(255,210,235,0.6)"], [1, "rgba(0,0,0,0)"]]),
        }));
        wGalaxy.rotation.set(1.12, 0.0, 0.22);
        scene.add(wGalaxy);
        wasm = e;
        console.log("[cosmos] galaxia C++/WASM activa:", n, "partículas");
      })
      .catch(() => { /* sin WASM: la escena 3D sigue funcionando igual */ });
  })();

  // ===================== INTERACCIÓN =====================
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  });
  window.addEventListener("deviceorientation", (e) => {
    if (e.gamma == null) return;
    pointer.tx = Math.max(-1, Math.min(1, e.gamma / 35));
    pointer.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 35));
  });

  // ===================== POST-PROCESADO (bloom + grade) =====================
  let composer = null;
  if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    const bloom = new THREE.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.85,  // fuerza
      0.55,  // radio
      0.78   // umbral (solo brilla lo más luminoso)
    );
    composer.addPass(bloom);

    if (THREE.ShaderPass) {
      const grade = new THREE.ShaderPass({
        uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `
          uniform sampler2D tDiffuse; varying vec2 vUv;
          void main(){
            vec3 c = texture2D(tDiffuse, vUv).rgb;
            // realce de saturación
            float l = dot(c, vec3(0.299,0.587,0.114));
            c = mix(vec3(l), c, 1.18);
            // viñeta suave
            vec2 q = vUv - 0.5;
            float vig = smoothstep(0.85, 0.35, length(q));
            c *= mix(0.78, 1.0, vig);
            gl_FragColor = vec4(c, 1.0);
          }`,
      });
      composer.addPass(grade);
    }
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const aspect = w / h;
    renderer.setSize(w, h, false);
    // En vertical (móvil) ampliamos el campo de visión.
    camera.fov = aspect < 0.8 ? 74 : aspect < 1.2 ? 64 : 55;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    if (composer) composer.setSize(w, h);
    // Distancia que encuadra todo el sistema (radio ~38) en ambos ejes.
    const R = 38;
    const tan = Math.tan((camera.fov * Math.PI) / 180 / 2);
    const fitW = R / (tan * Math.min(aspect, 3));
    const fitH = R / tan;
    camDist = Math.min(Math.max(fitW, fitH) + 6, 170);
  }
  window.addEventListener("resize", resize);
  resize();

  // ===================== BUCLE =====================
  const clock = new THREE.Clock();
  let camAngle = 0;
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    sunUniforms.uTime.value = t;
    sun.rotation.y += dt * 0.05;
    corona.material.rotation += dt * 0.02;
    const pulse = 30 + Math.sin(t * 1.3) * 1.5;
    corona.scale.set(pulse, pulse, 1);
    flares.forEach((fl) => {
      const d = 4.4 + Math.sin(t * 2 + fl.userData.ph) * 0.5;
      fl.position.set(Math.cos(fl.userData.a + t * 0.05) * d, fl.userData.el * d, Math.sin(fl.userData.a + t * 0.05) * d);
      const s = fl.userData.base * (0.7 + 0.3 * Math.sin(t * 3 + fl.userData.ph));
      fl.scale.set(s, s, 1);
    });

    planets.forEach((p) => {
      p.angle += dt * p.cfg.speed;
      p.group.position.set(Math.cos(p.angle) * p.cfg.dist, 0, Math.sin(p.angle) * p.cfg.dist);
      p.mesh.rotation.y += dt * 0.3;
      p.mat.uniforms.uTime.value = t;
      if (p.cloudMat) { p.cloudMat.uniforms.uTime.value = t; }
      p.moons.forEach((m) => { m.angle += dt * m.speed; m.pivot.rotation.y = m.angle; m.mat.uniforms.uTime.value = t; });
    });

    if (asteroidBelt) asteroidBelt.rotation.y += dt * asteroidBelt.userData.spin;
    starsFar.mat.uniforms.uTime.value = t;
    starsNear.mat.uniforms.uTime.value = t;
    starsFar.points.rotation.y += dt * 0.004;
    starsNear.points.rotation.y += dt * 0.01;
    nebGroup.rotation.z += dt * 0.003;
    galaxy.material.rotation += dt * 0.01;
    heart.rotation.y += dt * 0.1;
    heart.position.y = 16 + Math.sin(t * 0.5) * 1.5;

    if (constMat) {
      constMat.uniforms.uTime.value = t;
      constMat.userData.group.position.y = 150 + Math.sin(t * 0.3) * 4;
    }
    auroraMats.forEach((m) => { m.uniforms.uTime.value = t; });
    streaks.forEach((sp) => {
      sp.position.copy(sun.position);
      const k = 0.85 + Math.sin(t * 1.3) * 0.15;
      sp.material.opacity = 0.55 * k;
    });
    if (planets[4] && planets[4].ringDust) planets[4].ringDust.rotation.z += dt * 0.05;

    // galaxia de polvo simulada en C++/WASM
    if (wasm && wGeo) {
      wasm.step(dt, t);
      wGeo.attributes.position.needsUpdate = true;
    }

    // cometa en órbita elíptica inclinada + cola apuntando lejos del sol
    cometAngle += dt * 0.18;
    const cx = Math.cos(cometAngle) * 70, cz = Math.sin(cometAngle) * 48, cy = Math.sin(cometAngle * 0.7) * 22;
    comet.position.set(cx, cy, cz);
    cometTrail.unshift(new THREE.Vector3(cx, cy, cz));
    if (cometTrail.length > TAIL) cometTrail.pop();
    const away = comet.position.clone().normalize();
    for (let i = 0; i < TAIL; i++) {
      const base = cometTrail[Math.min(i, cometTrail.length - 1)] || comet.position;
      const pos = base.clone().add(away.clone().multiplyScalar(i * 0.25));
      tailPos[i * 3] = pos.x; tailPos[i * 3 + 1] = pos.y; tailPos[i * 3 + 2] = pos.z;
      tailAlpha[i] = 1 - i / TAIL;
    }
    tailGeo.attributes.position.needsUpdate = true;
    tailGeo.attributes.aAlpha.needsUpdate = true;

    // estrellas fugaces
    if (Math.random() < 0.01 && shooters.length < 3) spawnShooter();
    for (let i = shooters.length - 1; i >= 0; i--) {
      const s = shooters[i];
      s.life += dt;
      s.line.position.add(s.dir.clone().multiplyScalar(s.speed * dt));
      s.line.material.opacity = 0.9 * (1 - s.life / s.ttl);
      if (s.life >= s.ttl) { scene.remove(s.line); s.line.geometry.dispose(); shooters.splice(i, 1); }
    }

    // cámara
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    camAngle += dt * 0.02;
    camera.position.x = Math.sin(camAngle) * camDist * 0.12 + pointer.x * camDist * 0.16;
    camera.position.y = camDist * 0.13 + pointer.y * -camDist * 0.09;
    camera.position.z = camDist + Math.cos(camAngle) * camDist * 0.08;
    camera.lookAt(0, 0, 0);

    if (composer) composer.render();
    else renderer.render(scene, camera);
  }
  animate();
})();
