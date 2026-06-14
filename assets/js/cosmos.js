// =====================================================================
//  Cosmos 3D inmersivo para Tamara — Three.js (r128, THREE global) + GLSL.
//  Cada planeta usa un shader procedural (relieve por fbm, atmósfera con
//  fresnel). Sol con turbulencia, campo de estrellas, nebulosas y
//  estrellas fugaces. Cámara con auto-órbita y parallax al tacto/ratón.
//
//  Degrada con elegancia: si WebGL/THREE no están, no hace nada y queda
//  el fondo 2D de corazones.
// =====================================================================
(() => {
  const canvas = document.getElementById("cosmos");
  if (!canvas || !window.THREE) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    return; // sin WebGL
  }
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0); // transparente: usamos el degradado del body

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
  camera.position.set(0, 6, 46);

  // -------- ruido GLSL compartido (hash + fbm de 3 octavas) ----------
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
    float fbm(vec3 p){
      float v = 0.0, a = 0.5;
      for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.02; a *= 0.5; }
      return v;
    }
  `;

  // =============== SOL ===============
  const sunUniforms = { uTime: { value: 0 } };
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 64, 64),
    new THREE.ShaderMaterial({
      uniforms: sunUniforms,
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: NOISE + `
        uniform float uTime; varying vec3 vP;
        void main(){
          vec3 p = normalize(vP);
          float n = fbm(p*3.0 + vec3(uTime*0.25));
          float n2 = fbm(p*6.0 - vec3(uTime*0.15));
          float h = n*0.6 + n2*0.4;
          vec3 hot = vec3(1.0,0.95,0.7);
          vec3 mid = vec3(1.0,0.55,0.2);
          vec3 low = vec3(0.9,0.2,0.25);
          vec3 col = mix(low, mid, smoothstep(0.1,0.5,h));
          col = mix(col, hot, smoothstep(0.5,0.85,h));
          gl_FragColor = vec4(col*1.4, 1.0);
        }`,
    })
  );
  scene.add(sun);

  // Glow del sol (sprite radial aditivo)
  function radialTexture(stops) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d").createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    const ctx = c.getContext("2d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.Texture(c);
    t.needsUpdate = true;
    return t;
  }
  const sunGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: radialTexture([[0, "rgba(255,220,150,0.9)"], [0.25, "rgba(255,140,60,0.5)"], [1, "rgba(255,80,80,0)"]]),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
  );
  sunGlow.scale.set(26, 26, 1);
  scene.add(sunGlow);

  // =============== PLANETAS ===============
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
    uniform vec3 uLight; uniform float uTime; uniform float uSeed; uniform float uBands;
    varying vec3 vWN; varying vec3 vP; varying vec3 vWP;
    void main(){
      vec3 p = normalize(vP);
      float n = fbm(p*2.5 + uSeed);
      // bandas tipo gaseoso si uBands>0.5, si no, continentes
      float band = uBands>0.5 ? fbm(vec3(p.y*6.0, uTime*0.02, uSeed)) : fbm(p*4.0 + n + uSeed);
      vec3 col = mix(uA, uB, smoothstep(0.25,0.65,n));
      col = mix(col, uC, clamp(band*0.6,0.0,1.0));
      vec3 N = normalize(vWN);
      vec3 L = normalize(uLight - vWP);
      float diff = clamp(dot(N,L),0.0,1.0);
      float terminator = smoothstep(0.0,0.25,diff);
      vec3 lit = col*(0.06 + diff) + vec3(1.0,0.5,0.3)*pow(1.0-terminator,3.0)*0.15;
      gl_FragColor = vec4(lit,1.0);
    }`;

  function atmosphere(radius, color) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.18, 48, 48),
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(color) } },
        vertexShader: `varying vec3 vN; varying vec3 vV;
          void main(){ vN = normalize(normalMatrix*normal);
            vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix*mv; }`,
        fragmentShader: `uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
          void main(){ float r = pow(1.0 - max(dot(vN,vV),0.0), 2.5);
            gl_FragColor = vec4(uColor, r*0.9); }`,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      })
    );
  }

  const PLANETS = [
    { r: 0.9, dist: 9,  speed: 0.55, tilt: 0.2,  a: 0x8a5a3c, b: 0xd9a066, c: 0xffe0b0, bands: 0, atm: 0xffb070, ring: false },
    { r: 1.5, dist: 14, speed: 0.34, tilt: 0.35, a: 0x1f5fa8, b: 0x3aa0d9, c: 0x9be7ff, bands: 0, atm: 0x6fc8ff, ring: false }, // "tierra"
    { r: 1.1, dist: 18, speed: 0.27, tilt: 0.5,  a: 0xa83a3a, b: 0xd96a4a, c: 0xffc28a, bands: 0, atm: 0xff8a6a, ring: false }, // "marte"
    { r: 2.6, dist: 25, speed: 0.16, tilt: 0.25, a: 0xc9a36a, b: 0xe8c896, c: 0xfff0d0, bands: 1, atm: 0xf6dca0, ring: true },  // "júpiter"
    { r: 2.0, dist: 33, speed: 0.11, tilt: 0.6,  a: 0xc7b07a, b: 0xe6d6a8, c: 0xfff4d8, bands: 1, atm: 0xe9dcae, ring: true },  // "saturno"
  ];

  const planets = PLANETS.map((cfg) => {
    const pivot = new THREE.Object3D();
    pivot.rotation.x = cfg.tilt;
    scene.add(pivot);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uA: { value: new THREE.Color(cfg.a) },
        uB: { value: new THREE.Color(cfg.b) },
        uC: { value: new THREE.Color(cfg.c) },
        uLight: { value: new THREE.Vector3(0, 0, 0) },
        uTime: { value: 0 },
        uSeed: { value: Math.random() * 10 },
        uBands: { value: cfg.bands },
      },
      vertexShader: planetVert,
      fragmentShader: planetFrag,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(cfg.r, 48, 48), mat);
    const group = new THREE.Group();
    group.add(mesh);
    group.add(atmosphere(cfg.r, cfg.atm));

    if (cfg.ring) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(cfg.r * 1.4, cfg.r * 2.2, 64),
        new THREE.MeshBasicMaterial({
          map: radialTexture([[0, "rgba(0,0,0,0)"], [0.55, "rgba(255,235,200,0.0)"], [0.6, "rgba(255,225,190,0.85)"], [0.8, "rgba(230,200,150,0.5)"], [1, "rgba(0,0,0,0)"]]),
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
        })
      );
      ring.rotation.x = Math.PI / 2 - 0.35;
      group.add(ring);
    }

    group.position.x = cfg.dist;
    pivot.add(group);

    // órbita visible (anillo tenue)
    const orbit = new THREE.Mesh(
      new THREE.RingGeometry(cfg.dist - 0.02, cfg.dist + 0.02, 128),
      new THREE.MeshBasicMaterial({ color: 0xff9ec4, transparent: true, opacity: 0.06, side: THREE.DoubleSide })
    );
    orbit.rotation.x = Math.PI / 2;
    pivot.add(orbit);

    return { cfg, pivot, group, mesh, mat, angle: Math.random() * Math.PI * 2 };
  });

  // =============== CAMPO DE ESTRELLAS ===============
  function makeStars(count, spread, size, colorFn) {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = spread * (0.4 + Math.random() * 0.6);
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph) * 0.6;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const c = colorFn();
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({
      size, vertexColors: true, transparent: true, opacity: 0.9,
      depthWrite: false, blending: THREE.AdditiveBlending,
      map: radialTexture([[0, "rgba(255,255,255,1)"], [0.4, "rgba(255,255,255,0.6)"], [1, "rgba(255,255,255,0)"]]),
    });
    return new THREE.Points(g, m);
  }
  const tints = [0xffffff, 0xffd9e6, 0xcfe2ff, 0xfff0c8];
  const colorFn = () => new THREE.Color(tints[(Math.random() * tints.length) | 0]);
  const starsFar = makeStars(2200, 900, 2.6, colorFn);
  const starsNear = makeStars(700, 380, 4.5, colorFn);
  scene.add(starsFar, starsNear);

  // =============== NEBULOSAS ===============
  const nebTex = radialTexture([[0, "rgba(255,140,200,0.55)"], [0.4, "rgba(150,90,220,0.25)"], [1, "rgba(60,30,90,0)"]]);
  const nebGroup = new THREE.Group();
  const nebColors = ["#ff6fb5", "#9a6bff", "#5fb0ff", "#ff9a6f"];
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: nebTex, color: new THREE.Color(nebColors[i % nebColors.length]),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5,
    }));
    const sc = 80 + Math.random() * 140;
    s.scale.set(sc, sc, 1);
    s.position.set((Math.random() - 0.5) * 600, (Math.random() - 0.5) * 260, -200 - Math.random() * 400);
    nebGroup.add(s);
  }
  scene.add(nebGroup);

  // =============== ESTRELLAS FUGACES ===============
  const shooters = [];
  function spawnShooter() {
    const geo = new THREE.BufferGeometry();
    const start = new THREE.Vector3((Math.random() - 0.5) * 200, 40 + Math.random() * 40, -60 - Math.random() * 80);
    const dir = new THREE.Vector3(-1 - Math.random(), -0.6 - Math.random() * 0.5, 0).normalize();
    const pts = [];
    for (let i = 0; i < 12; i++) pts.push(start.clone().add(dir.clone().multiplyScalar(i * 2.2)));
    geo.setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0xffd9f0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    shooters.push({ line, dir, life: 0, ttl: 1.1 + Math.random() * 0.6, speed: 90 + Math.random() * 60 });
  }

  // =============== CORAZÓN DE PARTÍCULAS (orbita lejana) ===============
  const heartGeo = new THREE.BufferGeometry();
  const HC = 1400;
  const hpos = new Float32Array(HC * 3);
  for (let i = 0; i < HC; i++) {
    const t = Math.random() * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const jitter = 0.6;
    hpos[i * 3] = x * 0.45 + (Math.random() - 0.5) * jitter;
    hpos[i * 3 + 1] = y * 0.45 + (Math.random() - 0.5) * jitter;
    hpos[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
  }
  heartGeo.setAttribute("position", new THREE.BufferAttribute(hpos, 3));
  const heart = new THREE.Points(heartGeo, new THREE.PointsMaterial({
    color: 0xff5d8f, size: 0.5, transparent: true, opacity: 0.9, depthWrite: false,
    blending: THREE.AdditiveBlending,
    map: radialTexture([[0, "rgba(255,255,255,1)"], [0.5, "rgba(255,120,170,0.7)"], [1, "rgba(255,90,140,0)"]]),
  }));
  heart.position.set(-30, 16, -40);
  scene.add(heart);

  // =============== INTERACCIÓN ===============
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

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // =============== BUCLE ===============
  const clock = new THREE.Clock();
  let camAngle = 0;
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    sunUniforms.uTime.value = t;
    sun.rotation.y += dt * 0.05;
    sunGlow.material.rotation += dt * 0.02;

    planets.forEach((p) => {
      p.angle += dt * p.cfg.speed;
      p.group.position.set(Math.cos(p.angle) * p.cfg.dist, 0, Math.sin(p.angle) * p.cfg.dist);
      p.mesh.rotation.y += dt * 0.3;
      p.mat.uniforms.uTime.value = t;
      // El sol está en el origen, así que la luz apunta hacia (0,0,0).
    });

    starsFar.rotation.y += dt * 0.005;
    starsNear.rotation.y += dt * 0.012;
    nebGroup.rotation.z += dt * 0.003;
    heart.rotation.y += dt * 0.1;
    heart.position.y = 16 + Math.sin(t * 0.5) * 1.5;

    // estrellas fugaces
    if (Math.random() < 0.008 && shooters.length < 3) spawnShooter();
    for (let i = shooters.length - 1; i >= 0; i--) {
      const s = shooters[i];
      s.life += dt;
      s.line.position.add(s.dir.clone().multiplyScalar(s.speed * dt));
      s.line.material.opacity = 0.9 * (1 - s.life / s.ttl);
      if (s.life >= s.ttl) { scene.remove(s.line); s.line.geometry.dispose(); shooters.splice(i, 1); }
    }

    // cámara: auto-órbita suave + parallax
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    camAngle += dt * 0.02;
    const radius = 46;
    camera.position.x = Math.sin(camAngle) * 6 + pointer.x * 8;
    camera.position.y = 6 + pointer.y * -4;
    camera.position.z = radius + Math.cos(camAngle) * 4;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();
})();
