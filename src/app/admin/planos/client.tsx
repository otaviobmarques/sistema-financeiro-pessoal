"use client";
import { startTransition, useActionState, useState, useTransition } from "react";
import { savePlanConfig, deletePlan, type AdminState } from "../actions";
import type { PlanInfo } from "@/lib/plans";

const money = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));

/** Formulario de plano: editar um existente ou criar um novo (plan ausente). */
export function PlanEditor({ plan, subscribers = 0, onDone }: { plan?: PlanInfo; subscribers?: number; onDone?: () => void }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(async (s, fd) => { const r = await savePlanConfig(s, fd); if (r?.ok && !plan) onDone?.(); return r; }, undefined);
  const [del, setDel] = useState<AdminState>(); const [asking, setAsking] = useState(false); const [p2, start] = useTransition();
  const id = plan?.code ?? "novo"; const free = plan?.code === "FREE";
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); }} className={`card space-y-2 ${plan?.featured ? "ring-2 ring-sobbra" : ""}`}>
      {plan ? <input type="hidden" name="code" value={plan.code} /> : <input type="hidden" name="new" value="1" />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="muted text-xs font-semibold uppercase tracking-wide">{plan ? `${plan.code} · ${subscribers} ${subscribers === 1 ? "cliente" : "clientes"}` : "Novo plano"}</span>
        {!free && <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="active" defaultChecked={plan?.active ?? true} className="h-4 w-4" /> à venda</label>}
      </div>
      <div><label className="label" htmlFor={`n-${id}`}>Nome</label><input id={`n-${id}`} name="name" defaultValue={plan?.name} className="input" required placeholder="Ex.: Premium" /></div>
      <div><label className="label" htmlFor={`d-${id}`}>Descrição curta</label><input id={`d-${id}`} name="description" defaultValue={plan?.description} className="input" placeholder="Ex.: Para quem quer tudo" /></div>
      {!free && <div className="grid grid-cols-2 gap-2">
        <div><label className="label" htmlFor={`p-${id}`}>Mensal (R$)</label><input id={`p-${id}`} name="price" inputMode="decimal" defaultValue={money(plan?.price ?? null)} className="input" required /></div>
        <div><label className="label" htmlFor={`y-${id}`}>Anual (R$)</label><input id={`y-${id}`} name="yearly" inputMode="decimal" defaultValue={money(plan?.yearly ?? null)} className="input" placeholder="sem anual" /></div></div>}
      {free && <input type="hidden" name="price" value="0" />}
      <div className="grid grid-cols-3 gap-2">
        <div><label className="label" htmlFor={`r-${id}`}>Comprov./mês</label><input id={`r-${id}`} name="receipts" type="number" min={0} defaultValue={plan?.receipts ?? 100} className="input" /></div>
        <div><label className="label" htmlFor={`c-${id}`}>Perguntas/mês</label><input id={`c-${id}`} name="chat" type="number" min={0} defaultValue={plan?.chat ?? 50} className="input" /></div>
        <div><label className="label" htmlFor={`m-${id}`}>Pessoas</label><input id={`m-${id}`} name="members" type="number" min={1} defaultValue={plan?.members ?? 1} className="input" /></div>
      </div>
      {!free && <div className="grid grid-cols-2 gap-2">
        <div><label className="label" htmlFor={`t-${id}`}>Dias de teste grátis</label><input id={`t-${id}`} name="trial" type="number" min={0} max={30} defaultValue={plan?.trialDays ?? 7} className="input" /></div>
        <div><label className="label" htmlFor={`o-${id}`}>Ordem no site</label><input id={`o-${id}`} name="sort" type="number" min={0} defaultValue={plan?.sortOrder ?? ""} className="input" /></div></div>}
      <div><label className="label" htmlFor={`f-${id}`}>Itens extras no site (um por linha)</label><textarea id={`f-${id}`} name="features" rows={3} defaultValue={plan?.features.join("\n")} className="input min-h-[84px] py-2" placeholder="Ex.: Suporte prioritário" /></div>
      {!free && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={plan?.featured} className="h-4 w-4" /> Destacar como “Mais escolhido” no site</label>}
      {state?.error && <p role="alert" className="text-sm text-coral">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-sobbra">{state.ok}</p>}
      {del?.error && <p role="alert" className="text-sm text-coral">{del.error}</p>}
      {del?.ok && <p role="status" className="text-sm text-sobbra">{del.ok}</p>}
      <div className="flex gap-2">
        <button className="btn-dark flex-1" disabled={pending}>{pending ? "Salvando…" : plan ? "Salvar plano" : "Criar plano"}</button>
        {plan && !free && (asking
          ? <><button type="button" className="btn bg-coral text-white" disabled={p2} onClick={() => start(async () => { setDel(await deletePlan(plan.code)); setAsking(false); })}>Excluir</button><button type="button" className="btn-ghost" onClick={() => setAsking(false)}>Voltar</button></>
          : <button type="button" className="btn-ghost" onClick={() => { setAsking(true); setDel(undefined); }} aria-label={`Excluir o plano ${plan.name}`}>Excluir</button>)}
      </div>
    </form>
  );
}

export function NewPlan() {
  const [open, setOpen] = useState(false);
  if (!open) return <button className="btn-primary" onClick={() => setOpen(true)}>+ Novo plano</button>;
  return <div className="w-full max-w-md"><PlanEditor onDone={() => setOpen(false)} /><button className="btn-ghost mt-2 w-full" onClick={() => setOpen(false)}>Cancelar</button></div>;
}
