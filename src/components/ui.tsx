"use client";
import { useEffect, useRef, useState } from "react";

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Contador animado (RF-151). Respeita "reduzir movimento". */
export function CountUp({ cents, className = "" }: { cents: number; className?: string }) {
  const [v, setV] = useState(cents);
  const from = useRef(0);
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("no-motion");
    if (reduce) { setV(cents); return; }
    const start = performance.now(), a = from.current, dur = 700;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(a + (cents - a) * e));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = cents;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cents]);
  return <span className={`money tabular-nums ${className}`}>{fmt.format(v / 100)}</span>;
}

export function Money({ cents, className = "", sign = false }: { cents: number; className?: string; sign?: boolean }) {
  return <span className={`money tabular-nums ${className}`}>{sign && cents > 0 ? "+" : ""}{fmt.format(cents / 100)}</span>;
}

export function Logo({ size = 32, word = true }: { size?: number; word?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1A7A55" /><stop offset="1" stopColor="#0B4F3A" /></linearGradient></defs>
        <rect width="64" height="64" rx="16" fill="url(#lg)" />
        <rect x="14" y="34" width="8" height="12" rx="3" fill="#7FB89F" />
        <rect x="26" y="27" width="8" height="19" rx="3" fill="#B5DCC9" />
        <rect x="38" y="18" width="8" height="28" rx="3" fill="#fff" />
        <circle cx="42" cy="11" r="5" fill="#FFB020" stroke="#FFD46B" strokeWidth="1.5" />
        <rect x="13" y="50" width="34" height="2.5" rx="1.2" fill="#19C37D" />
      </svg>
      {word && <span className="font-marca text-xl font-bold tracking-tight">sobbra<span className="text-ambar">.</span></span>}
    </span>
  );
}

/** Toast com botao Desfazer (RF-163/RF-174). */
export function UndoToast({ message, seconds, onUndo, onClose }: { message: string; seconds: number; onUndo?: () => void; onClose: () => void }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => { const i = setInterval(() => setLeft((l) => l - 1), 1000); return () => clearInterval(i); }, []);
  useEffect(() => { if (left <= 0) onClose(); }, [left, onClose]);
  return (
    <div role="status" className="fill-in fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-grafite p-3 text-white shadow-xl md:bottom-6">
      <span className="flex-1 text-sm">{message}</span>
      {onUndo && <button className="rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold" onClick={() => { onUndo(); onClose(); }}>Desfazer ({left})</button>}
    </div>
  );
}

/** Termo com explicacao curta ao tocar (RF-161). */
export function Term({ children, tip }: { children: React.ReactNode; tip: string }) {
  const [o, setO] = useState(false);
  return (
    <span className="relative">
      <button type="button" onClick={() => setO(!o)} className="underline decoration-dotted underline-offset-4">{children}</button>
      {o && <span className="fill-in absolute left-0 top-7 z-20 w-60 rounded-xl bg-grafite p-3 text-xs font-normal text-white shadow-lg">{tip}</span>}
    </span>
  );
}
