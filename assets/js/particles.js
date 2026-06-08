// Interactive particle sphere using Three.js (r128, global THREE).
(() => {
  const canvas = document.getElementById("three-canvas");
  const stage = document.getElementById("stage");
  const followBtn = document.getElementById("follow");
  const status = document.getElementById("status");
  if (!canvas || !window.THREE) return;

  const COUNT = 9000;
  const RADIUS = 8;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 22;

  // Build particles on a Fibonacci sphere with a magenta→cyan gradient.
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const c1 = new THREE.Color(0xff2d9b);
  const c2 = new THREE.Color(0x18c6ff);

  for (let i = 0; i < COUNT; i++) {
    const phi = Math.acos(-1 + (2 * i) / COUNT);
    const theta = Math.sqrt(COUNT * Math.PI) * phi;
    const x = RADIUS * Math.cos(theta) * Math.sin(phi);
    const y = RADIUS * Math.sin(theta) * Math.sin(phi);
    const z = RADIUS * Math.cos(phi);
    positions.set([x, y, z], i * 3);
    const mix = (z / RADIUS + 1) / 2;
    const col = c1.clone().lerp(c2, mix);
    colors.set([col.r, col.g, col.b], i * 3);
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.09,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // Interaction state
  let follow = false;
  const mouse = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };

  stage.addEventListener("pointermove", (e) => {
    const rect = stage.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  });

  followBtn.addEventListener("click", () => {
    follow = !follow;
    followBtn.classList.toggle("on", follow);
    followBtn.textContent = follow ? "Following" : "Follow";
    status.textContent = follow ? "Sigue el cursor" : "Auto rotación";
  });

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  function animate() {
    requestAnimationFrame(animate);
    if (follow) {
      target.x = mouse.y * 0.6;
      target.y = mouse.x * 0.6;
    } else {
      target.y += 0.0025;
    }
    points.rotation.x += (target.x - points.rotation.x) * 0.05;
    points.rotation.y += follow ? (target.y - points.rotation.y) * 0.05 : 0.0025;
    renderer.render(scene, camera);
  }
  animate();
})();
