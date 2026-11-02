"use client";
import { useActionState } from "react";
import { savePlanConfig, type AdminState } from "../actions";
import type { PlanInfo } from "@/lib/plans";

const money = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));

export function PlanEditor({ plan }: { plan: PlanInfo }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(savePlanConfig, undefined);
  const free = plan.code === "FREE";
  return (
    <form action={action} className="card space-y-2">
      <input type="hidden" name="code" value={plan.code} />
      <div className="flex items-center justify-between"><span className="muted text-xs font-semibold uppercase tracking-wide">{plan.code}</span>{!free && <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="active" defaultChecked={plan.active} className="h-4 w-4" /> à venda</label>}</div>
      <div><label className="label" htmlFor={`n-${plan.code}`}>Nome</label><input id={`n-${plan.code}`} name="name" defaultValue={plan.name} className="input" /></div>
      <div><label className="label" htmlFor={`d-${plan.code}`}>Descrição curta</label><input id={`d-${plan.code}`} name="description" defaultValue={plan.description} className="input" /></div>
      {!free && <div className="grid grid-cols-2 gap-2">
        <div><label className="label" htmlFor={`p-${plan.code}`}>Mensal (R$)</label><input id={`p-${plan.code}`} name="price" inputMode="decimal" defaultValue={money(plan.price)} className="input" /></div>
        <div><label className="label" htmlFor={`y-${plan.code}`}>Anual (R$)</label><input id={`y-${plan.code}`} name="yearly" inputMode="decimal" defaultValue={money(plan.yearly)} className="input" placeholder="sem anual" /></div></div>}
      {free && <input type="hidden" name="price" value="0" />}
      <div className="grid grid-cols-3 gap-2">
        <div><label className="label" htmlFor={`r-${plan.code}`}>Comprov./mês</label><input id={`r-${plan.code}`} name="receipts" type="number" min={0} defaultValue={plan.receipts} className="input" /></div>
        <div><label className="label" htmlFor={`c-${plan.code}`}>Perguntas/mês</label><input id={`c-${plan.code}`} name="chat" type="number" min={0} defaultValue={plan.chat} className="input" /></div>
        <div><label className="label" htmlFor={`m-${plan.code}`}>Pessoas</label><input id={`m-${plan.code}`} name="members" type="number" min={1} defaultValue={plan.members} className="input" /></div>
      </div>
      {state?.error && <p className="text-sm text-coral">{state.error}</p>}
      {state?.ok && <p className="text-sm text-sobbra">{state.ok}</p>}
      <button className="btn-dark w-full" disabled={pending}>Salvar plano</button>
    </form>
  );
}
