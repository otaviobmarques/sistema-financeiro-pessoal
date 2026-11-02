"use client";
// Chuva de moedas discreta (RF-155): no maximo uma por evento, respeita "reduzir movimento".
export function celebrate(n = 28) {
  if (typeof window === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("no-motion")) return;
  const cv = document.createElement("canvas"); cv.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:60"; document.body.appendChild(cv);
  const dpr = devicePixelRatio || 1; cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; const ctx = cv.getContext("2d")!; ctx.scale(dpr, dpr);
  const P = Array.from({ length: n }, () => ({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.4, r: 6 + Math.random() * 6, vy: 2.5 + Math.random() * 3, vx: -1 + Math.random() * 2, a: Math.random() * 6, va: 0.08 + Math.random() * 0.12, c: Math.random() < 0.7 ? "#F0D875" : "#123E32" }));
  const t0 = performance.now();
  const frame = (t: number) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight); let alive = false;
    for (const p of P) { p.y += p.vy; p.x += p.vx; p.a += p.va; p.vy += 0.05; if (p.y < innerHeight + 30) alive = true;
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(Math.max(0.15, Math.abs(Math.cos(p.a))), 1); ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fillStyle = p.c; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, p.r * 0.6, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); }
    if (alive && t - t0 < 4000) requestAnimationFrame(frame); else cv.remove();
  };
  requestAnimationFrame(frame);
}
