import confetti from "canvas-confetti";

// Short two-tone chime when the rest timer hits zero. Best-effort: silently
// no-ops if the browser blocks audio (e.g. no prior user gesture).
export function restChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.16;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
    setTimeout(() => ctx.close(), 700);
  } catch {
    /* audio unavailable — vibration + toast still fire */
  }
}

export function fmtClock(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function celebrate() {
  const colors = ["#FF7A1F", "#F7C948", "#3FCE8F", "#8FA3B8"];
  const fire = (ratio: number, opts: confetti.Options) =>
    confetti({
      origin: { y: 0.7 },
      colors,
      particleCount: Math.floor(220 * ratio),
      ...opts,
    });
  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.9 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

// Gold burst for personal records — fired on top of the normal celebration
// when a finished session beat a previous best.
export function celebratePR() {
  const colors = ["#ffd25f", "#f5c451", "#ffffff", "#18a9ff"];
  confetti({
    particleCount: 90,
    spread: 80,
    startVelocity: 48,
    origin: { y: 0.6 },
    colors,
    scalar: 1.1,
  });
  confetti({
    particleCount: 50,
    spread: 110,
    decay: 0.92,
    scalar: 1.35,
    origin: { y: 0.55 },
    colors,
  });
}

export function celebrateWeek() {
  const colors = ["#FF7A1F", "#F7C948", "#3FCE8F", "#8FA3B8", "#E9B44C"];
  const end = Date.now() + 1400;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0 }, colors });
    confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 }, colors });
}

export function celebrateProgram() {
  const colors = ["#FF7A1F", "#F7C948", "#3FCE8F", "#8FA3B8", "#E9B44C", "#FF6B5E"];
  const end = Date.now() + 4000;
  (function frame() {
    confetti({ particleCount: 9, angle: 60, spread: 80, origin: { x: 0 }, colors });
    confetti({ particleCount: 9, angle: 120, spread: 80, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({ particleCount: 260, spread: 130, startVelocity: 55, origin: { y: 0.6 }, colors });
  confetti({ particleCount: 120, spread: 120, scalar: 1.3, origin: { y: 0.5 }, colors });
}
