"use client";
import { useEffect, useTransition, useState } from "react";
import { saveDashboardLayout } from "@/app/actions-f2";
import { celebrate } from "@/components/Celebrate";
import type { Layout, WidgetKey } from "@/lib/dashboard-layout";
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


/** Personalizar painel (RF-059): mostrar/esconder e reordenar blocos. */
export function Customize({ layout, labels }: { layout: Layout; labels: Record<WidgetKey, string> }) {
  const [open, setOpen] = useState(false);
  const [l, setL] = useState(layout);
  const [p, start] = useTransition();
  const move = (i: number, d: number) => { const o = [...l.order]; const j = i + d; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; setL({ ...l, order: o }); };
  if (!open) return <button className="btn-ghost min-h-[40px] text-sm" onClick={() => setOpen(true)}>⚙️ Personalizar painel</button>;
  return (
    <div className="card fill-in w-full max-w-md space-y-2">
      <p className="font-semibold">Escolha e ordene os blocos</p>
      <ul className="space-y-1">{l.order.map((k, i) => (
        <li key={k} className="flex items-center gap-2">
          <label className="flex flex-1 items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={!l.hidden.includes(k)} onChange={(e) => setL({ ...l, hidden: e.target.checked ? l.hidden.filter((x) => x !== k) : [...l.hidden, k] })} />{labels[k]}</label>
          <button className="btn-ghost min-h-[36px] px-2" aria-label={`Subir ${labels[k]}`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
          <button className="btn-ghost min-h-[36px] px-2" aria-label={`Descer ${labels[k]}`} disabled={i === l.order.length - 1} onClick={() => move(i, 1)}>↓</button>
        </li>
      ))}</ul>
      <div className="flex gap-2"><button className="btn-primary" disabled={p} onClick={() => start(async () => { await saveDashboardLayout(l); setOpen(false); })}>Salvar</button>
        <button className="btn-ghost" onClick={() => { setL(layout); setOpen(false); }}>Cancelar</button>
        <button className="muted ml-auto text-sm underline" onClick={() => setL({ order: Object.keys(labels) as WidgetKey[], hidden: [] })}>Padrão</button></div>
    </div>
  );
}

/** RF-155: comemora uma vez quando o mes anterior fechou com sobra. */
export function MonthCelebration({ month, sobra }: { month: string; sobra: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (sobra <= 0) return;
    const k = `sobbra-fechou-${month}`;
    try { if (localStorage.getItem(k)) return; localStorage.setItem(k, "1"); } catch { return; }
    setShow(true); celebrate();
  }, [month, sobra]);
  if (!show) return null;
  return <div className="fill-in mb-3 rounded-2xl bg-ambar/15 p-4 text-center">🪙 O mês passado fechou com <b>{(sobra / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b> de sobra. Mandou bem! <button className="muted ml-2 text-sm underline" onClick={() => setShow(false)}>Fechar</button></div>;
}
