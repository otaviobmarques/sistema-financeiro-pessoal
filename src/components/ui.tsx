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

/** Valor no formato brasileiro com sinal semantico: "+ R$ 250,00" e "− R$ 80,00" (Design System, p. 6). */
export function Money({ cents, className = "", sign = false }: { cents: number; className?: string; sign?: boolean }) {
  const prefix = cents < 0 ? "− " : sign && cents > 0 ? "+ " : "";
  return <span className={`money tabular-nums whitespace-nowrap ${className}`}>{prefix}{fmt.format(Math.abs(cents) / 100)}</span>;
}

/** Simbolo S (duas curvas, centro aberto). Opcional: preferir o wordmark no topo e na entrada. */
export function SymbolS({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill="#F0D875" />
      <path d="M43.5 21.5c-2.2-5.3-21.5-6.4-22.3 2.3-.8 8.4 22.6 6.6 22.3 17.1-.3 9.3-19.8 8.6-23.3 2.6" fill="none" stroke="#123E32" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

/** Wordmark: nome em caixa baixa com o ponto amarelo (nao usar o ponto como notificacao). */
export function Logo({ size = 32, word = true, symbol = false }: { size?: number; word?: boolean; symbol?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label="sobbra">
      {(symbol || !word) && <SymbolS size={size} />}
      {word && <span className="text-[22px] font-bold tracking-tight text-floresta dark:text-[#ECEFE6]" style={{ fontSize: size * 0.72 }}>sobbra<span style={{ color: "#E2C04E" }}>.</span></span>}
    </span>
  );
}

/** Toast com botao Desfazer (RF-163/RF-174). */
export function UndoToast({ message, seconds, onUndo, onClose }: { message: string; seconds: number; onUndo?: () => void; onClose: () => void }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => { const i = setInterval(() => setLeft((l) => l - 1), 1000); return () => clearInterval(i); }, []);
  useEffect(() => { if (left <= 0) onClose(); }, [left, onClose]);
  return (
    <div role="status" className="fill-in fixed inset-x-3 bottom-28 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-grafite p-3 text-white shadow-lg md:bottom-6">
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
      {o && <span className="fill-in absolute left-0 top-7 z-20 w-64 rounded-xl bg-grafite p-3 text-xs font-normal normal-case tracking-normal text-white shadow-lg">{tip}</span>}
    </span>
  );
}
