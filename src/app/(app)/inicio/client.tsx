"use client";
import { useTransition, useState } from "react";
import Link from "next/link";
import { updatePrefs, dismissUpsell } from "@/app/actions";

export function ModeToggle({ simple, hide }: { simple: boolean; hide: boolean }) {
  const [p, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button disabled={p} onClick={() => start(() => updatePrefs({ hideValues: !hide }))} className="btn-ghost min-h-[44px] px-3" aria-label={hide ? "Mostrar valores" : "Ocultar valores"}>{hide ? "🙈" : "👁️"}</button>
      <button disabled={p} onClick={() => start(() => updatePrefs({ simpleMode: !simple }))} className="btn-ghost min-h-[44px] px-3 text-sm">{simple ? "Modo Completo" : "Modo Simples"}</button>
    </div>
  );
}

/** Politica anti-incomodo (RF-147): no maximo 1x por semana, nunca durante lancamento. */
export function Upsell() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="card mt-6 flex items-center gap-3 border-ambar/40">
      <span className="text-2xl">✨</span>
      <p className="flex-1 text-sm">Com o Pro, leitura de comprovantes e perguntas ao consultor ficam ilimitadas.</p>
      <Link href="/ajustes#plano" className="btn-primary min-h-[40px] text-sm">Ver</Link>
      <button className="muted px-2" aria-label="Dispensar" onClick={() => { setOpen(false); dismissUpsell(); }}>×</button>
    </div>
  );
}
