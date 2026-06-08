// Flashlight reveal for the 404 scene, driven by GSAP.
(() => {
  const stage = document.getElementById("stage");
  const veil = document.getElementById("veil");
  if (!stage || !veil || !window.gsap) return;

  const scene = stage.querySelector(".scene");
  let on = false;

  function lightAt(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    veil.style.setProperty("--x", x + "%");
    veil.style.setProperty("--y", y + "%");
    if (!on) {
      on = true;
      gsap.to(veil, { "--r": "170px", duration: 0.25, ease: "power2.out" });
      gsap.to(scene, { opacity: 1, duration: 0.4 });
    }
  }

  function goDark() {
    on = false;
    gsap.to(veil, { "--r": "0px", duration: 0.4, ease: "power2.in" });
    gsap.to(scene, { opacity: 0.05, duration: 0.5 });
  }

  stage.addEventListener("mousemove", (e) => lightAt(e.clientX, e.clientY));
  stage.addEventListener("mouseleave", goDark);
  stage.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    lightAt(t.clientX, t.clientY);
  }, { passive: true });
  stage.addEventListener("touchend", goDark);

  // start in the dark
  gsap.set(scene, { opacity: 0.05 });
  gsap.set(veil, { "--r": "0px" });
})();
