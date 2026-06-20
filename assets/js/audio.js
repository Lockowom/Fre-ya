// =====================================================================
//  Audio ambiental espacial, generado en tiempo real (Web Audio API).
//  Sin archivos: un "pad" cálido (acorde con osciladores) a través de un
//  filtro con LFO lento y reverb, más campanas suaves en cada transición.
//  Debe arrancar tras un gesto del usuario (toque en 🎵 o en el viaje).
// =====================================================================
window.FreyaAudio = (() => {
  let ctx = null, master = null, filter = null;
  let enabled = false, built = false;

  function impulse(seconds, decay) {
    const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function build() {
    if (built) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // reverb (cola larga, espacial)
    const conv = ctx.createConvolver();
    conv.buffer = impulse(3.5, 2.2);
    const wet = ctx.createGain(); wet.gain.value = 0.55; conv.connect(wet); wet.connect(master);
    const dry = ctx.createGain(); dry.gain.value = 0.65; dry.connect(master);

    // pad: acorde cálido a través de un filtro paso-bajo
    filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 650;
    filter.Q.value = 0.7;
    filter.connect(dry); filter.connect(conv);

    const freqs = [110.0, 164.81, 220.0, 277.18, 329.63]; // La mayor, cálido
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? "triangle" : "sine";
      o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 9;
      const g = ctx.createGain();
      g.gain.value = 0.14 / freqs.length;
      o.connect(g); g.connect(filter);
      o.start();
      // leve vibrato de amplitud por voz
      const alfo = ctx.createOscillator(); alfo.frequency.value = 0.06 + Math.random() * 0.05;
      const ag = ctx.createGain(); ag.gain.value = 0.03 / freqs.length;
      alfo.connect(ag); ag.connect(g.gain); alfo.start();
    });

    // LFO lento del filtro (sensación de respiración)
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05;
    const lg = ctx.createGain(); lg.gain.value = 280;
    lfo.connect(lg); lg.connect(filter.frequency); lfo.start();

    built = true;
  }

  function start() {
    build();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    enabled = true;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.5, now + 2.5);
  }

  function stop() {
    if (!ctx) return;
    enabled = false;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0.0, now + 1.5);
  }

  // Campana suave para las transiciones entre capítulos.
  function transition() {
    if (!ctx || !enabled) return;
    const base = [523.25, 659.25, 783.99][Math.floor(Math.random() * 3)];
    [base, base * 1.5].forEach((f, k) => {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0;
      o.connect(g); g.connect(master);
      const now = ctx.currentTime + k * 0.06;
      g.gain.linearRampToValueAtTime(0.16, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);
      o.start(now); o.stop(now + 3.1);
    });
  }

  return {
    start, stop, transition,
    toggle: () => (enabled ? stop() : start()),
    isEnabled: () => enabled,
  };
})();
