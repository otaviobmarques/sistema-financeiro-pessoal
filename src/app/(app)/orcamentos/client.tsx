"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBudget, deleteBudget, applySuggestedBudgets, saveGoal, contributeGoal, deleteGoal } from "@/app/actions-f2";
import { celebrate } from "@/components/Celebrate";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function BudgetLimit({ id, categoryId, limit }: { id: string; categoryId: string; limit: number }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  if (!edit) return <button className="underline decoration-dotted underline-offset-4" onClick={() => { setEdit(true); setTimeout(() => ref.current?.select(), 0); }} aria-label="Mudar limite">{brl(limit)}</button>;
  const commit = () => start(async () => { await saveBudget(categoryId, ref.current!.value); setEdit(false); router.refresh(); });
  return (
    <span className="inline-flex items-center gap-1">
      <input ref={ref} defaultValue={(limit / 100).toFixed(2).replace(".", ",")} inputMode="decimal" className="input h-9 min-h-0 !w-28 py-0" aria-label="Novo limite" onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEdit(false); }} />
      <button className="btn-primary min-h-[36px] px-3 text-xs" disabled={pending} onClick={commit}>OK</button>
      <button className="btn-ghost min-h-[36px] px-3 text-xs" disabled={pending} onClick={() => start(async () => { await deleteBudget(id); router.refresh(); })}>Remover</button>
    </span>
  );
}

export function AddBudget({ categories }: { categories: { id: string; name: string; icon: string }[] }) {
  const router = useRouter();
  const [cat, setCat] = useState("");
  const [val, setVal] = useState("");
  const [err, setErr] = useState<string>();
  const [pending, start] = useTransition();
  if (!categories.length) return null;
  return (
    <div className="line flex flex-wrap items-end gap-2 border-t pt-4">
      <div className="min-w-[180px] flex-1"><label className="label" htmlFor="b-cat">Adicionar orçamento</label><select id="b-cat" className="input" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Escolha a categoria</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>
      <div className="w-36"><label className="label" htmlFor="b-val">Limite no mês</label><input id="b-val" className="input" inputMode="decimal" placeholder="0,00" value={val} onChange={(e) => setVal(e.target.value)} /></div>
      <button className="btn-dark" disabled={pending || !cat} onClick={() => start(async () => { const r = await saveBudget(cat, val); if (r?.error) setErr(r.error); else { setCat(""); setVal(""); setErr(undefined); router.refresh(); } })}>Adicionar</button>
      {err && <p className="w-full text-sm text-coral">{err}</p>}
    </div>
  );
}

export function SuggestButton({ count }: { count: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <button className="btn-primary" disabled={pending} onClick={() => start(async () => { await applySuggestedBudgets(); router.refresh(); })}>Usar sugestão ({count})</button>;
}

export function GoalForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveGoal, undefined);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (state?.ok) { setOpen(false); router.refresh(); } }, [state, router]);
  if (!open) return <button className="card grid min-h-[160px] place-items-center border-2 border-dashed text-center font-semibold" onClick={() => setOpen(true)}>+ Nova meta</button>;
  return (
    <form action={action} className="card fill-in space-y-3">
      <h3 className="font-semibold">Nova meta</h3>
      <div className="grid grid-cols-[80px_1fr] gap-2"><div><label className="label" htmlFor="g-icon">Ícone</label><select id="g-icon" name="icon" className="input">{["🎯", "🛟", "✈️", "🚗", "🏠", "🎓", "💍", "📱", "🐷"].map((i) => <option key={i}>{i}</option>)}</select></div>
        <div><label className="label" htmlFor="g-name">Nome</label><input id="g-name" name="name" required className="input" placeholder="Ex.: Reserva de emergência" /></div></div>
      <div className="grid grid-cols-2 gap-2"><div><label className="label" htmlFor="g-target">Quanto juntar</label><input id="g-target" name="target" inputMode="decimal" required className="input" placeholder="0,00" /></div>
        <div><label className="label" htmlFor="g-saved">Já tenho</label><input id="g-saved" name="saved" inputMode="decimal" className="input" placeholder="0,00" /></div></div>
      <div><label className="label" htmlFor="g-deadline">Até quando (mês)</label><input id="g-deadline" name="deadline" type="month" className="input" /></div>
      {state?.error && <p className="text-sm text-coral">{state.error}</p>}
      <div className="flex gap-2"><button className="btn-primary" disabled={pending}>Criar meta</button><button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button></div>
    </form>
  );
}

export function GoalCard({ goal, plan }: { goal: { id: string; name: string; icon: string; target: number; saved: number; deadline: string | null; achieved: boolean }; plan: { left: number; months: number | null; monthly: number | null; pct: number } }) {
  const router = useRouter();
  const [val, setVal] = useState("");
  const [err, setErr] = useState<string>();
  const [pending, start] = useTransition();
  const R = 34, C = 2 * Math.PI * R;
  return (
    <div className={`card space-y-3 ${goal.achieved ? "ring-2 ring-ambar" : ""}`}>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 84 84" className="h-20 w-20 shrink-0" role="img" aria-label={`${Math.round(plan.pct * 100)}% da meta`}>
          <circle cx="42" cy="42" r={R} fill="none" stroke="var(--line)" strokeWidth="9" />
          <circle cx="42" cy="42" r={R} fill="none" stroke={goal.achieved ? "#FFB020" : "#19C37D"} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${C * plan.pct} ${C}`} transform="rotate(-90 42 42)" style={{ transition: "stroke-dasharray .9s" }} />
          <text x="42" y="47" textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">{Math.round(plan.pct * 100)}%</text>
        </svg>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{goal.icon} {goal.name}</p>
          <p className="text-sm"><span className="money font-semibold">{brl(goal.saved)}</span> <span className="muted">de {brl(goal.target)}</span></p>
          <p className="muted text-xs">{goal.achieved ? "Meta alcançada! 🎉" : plan.monthly ? `Guarde ${brl(plan.monthly)} por mês por ${plan.months} ${plan.months === 1 ? "mês" : "meses"}` : `Faltam ${brl(plan.left)}`}{goal.deadline && !goal.achieved ? ` · até ${new Date(goal.deadline).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}` : ""}</p>
        </div>
      </div>
      {!goal.achieved && (
        <div className="flex flex-wrap gap-2">
          <input className="input h-10 min-h-0 !w-32" inputMode="decimal" placeholder="Valor" value={val} onChange={(e) => setVal(e.target.value)} aria-label={`Guardar na meta ${goal.name}`} />
          <button className="btn-primary min-h-[40px] text-sm" disabled={pending || !val} onClick={() => start(async () => { const r = await contributeGoal(goal.id, val); if (r.error) setErr(r.error); else { setVal(""); setErr(undefined); if (r.achieved) celebrate(); router.refresh(); } })}>Guardei</button>
          <button className="btn-ghost min-h-[40px] text-sm" disabled={pending || !val} onClick={() => start(async () => { await contributeGoal(goal.id, "-" + val); setVal(""); router.refresh(); })}>Tirei</button>
        </div>
      )}
      {err && <p className="text-sm text-coral">{err}</p>}
      <button className="muted text-xs underline" disabled={pending} onClick={() => start(async () => { await deleteGoal(goal.id); router.refresh(); })}>Excluir meta</button>
    </div>
  );
}
