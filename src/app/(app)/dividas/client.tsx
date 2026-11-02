"use client";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDebt, deleteDebt, payDebt } from "@/app/actions-f2";
import { simulate, DEBT_TYPES, type DebtIn } from "@/lib/debts";
import { celebrate } from "@/components/Celebrate";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const when = (m: number | null) => { if (m === null) return "não quita"; const d = new Date(); d.setMonth(d.getMonth() + m); return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }); };

export function DebtForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveDebt, undefined);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (state?.ok) { setOpen(false); router.refresh(); } }, [state, router]);
  if (!open) return <button className="btn-dark mt-2" onClick={() => setOpen(true)}>+ Cadastrar dívida</button>;
  return (
    <form action={action} className="card fill-in mt-2 grid gap-3 sm:grid-cols-3">
      <div><label className="label" htmlFor="d-type">Tipo</label><select id="d-type" name="type" className="input">{Object.entries(DEBT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="d-cred">Credor</label><input id="d-cred" name="creditor" required className="input" placeholder="Ex.: Banco X, loja Y" /></div>
      <div><label className="label" htmlFor="d-bal">Quanto ainda deve</label><input id="d-bal" name="balance" inputMode="decimal" required className="input" placeholder="0,00" /></div>
      <div><label className="label" htmlFor="d-rate">Juros ao mês (%)</label><input id="d-rate" name="rate" inputMode="decimal" required className="input" placeholder="Ex.: 3,5" /></div>
      <div><label className="label" htmlFor="d-pay">Paga por mês</label><input id="d-pay" name="payment" inputMode="decimal" required className="input" placeholder="0,00" /></div>
      <div><label className="label" htmlFor="d-day">Dia do vencimento</label><input id="d-day" name="dueDay" type="number" min={1} max={31} defaultValue={10} className="input" /></div>
      <p className="muted self-end text-xs sm:col-span-2">Não sabe os juros? Estão no contrato ou no app do banco (CET mensal). Rotativo e cheque especial costumam passar de 8% ao mês.</p>
      {state?.error && <p className="text-sm text-coral sm:col-span-3">{state.error}</p>}
      <div className="flex gap-2 sm:col-span-3"><button className="btn-primary" disabled={pending}>Salvar</button><button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button></div>
    </form>
  );
}

export function DebtRow({ debt }: { debt: { id: string; type: string; typeLabel: string; creditor: string; balance: number; rate: number; payment: number; dueDay: number; paidOff: boolean } }) {
  const router = useRouter();
  const [val, setVal] = useState((debt.payment / 100).toFixed(2).replace(".", ","));
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string>();
  const interest = Math.round(debt.balance * debt.rate / 100);
  return (
    <li className="line flex flex-wrap items-center gap-3 border-t py-3 first:border-0">
      <div className="min-w-[180px] flex-1">
        <p className="font-semibold">{debt.creditor} <span className={`ml-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${debt.rate >= 5 ? "bg-coral/15 text-coral" : "soft"}`}>{debt.rate.toLocaleString("pt-BR")}% a.m.</span>{debt.paidOff && <span className="ml-1 rounded-full bg-ambar/20 px-2 py-0.5 text-xs font-semibold">quitada 🎉</span>}</p>
        <p className="muted text-xs">{debt.typeLabel} · parcela {brl(debt.payment)} todo dia {debt.dueDay}{!debt.paidOff && ` · ${brl(interest)} de juros por mês`}</p>
      </div>
      <b className="money">{brl(debt.balance)}</b>
      {!debt.paidOff && (
        <span className="flex gap-1">
          <input className="input h-10 min-h-0 !w-28" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} aria-label={`Valor pago a ${debt.creditor}`} />
          <button className="btn-primary min-h-[40px] text-sm" disabled={pending} onClick={() => start(async () => { const r = await payDebt(debt.id, val); if (r.error) setErr(r.error); else { setErr(undefined); if (r.paidOff) celebrate(); router.refresh(); } })}>Paguei</button>
        </span>
      )}
      <button className="muted text-xs underline" disabled={pending} onClick={() => start(async () => { await deleteDebt(debt.id); router.refresh(); })}>Excluir</button>
      {err && <p className="w-full text-sm text-coral">{err}</p>}
    </li>
  );
}

function Line({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const W = 600, H = 140, max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * W},${H - (v / max) * (H - 10)}`).join(" ");
  return <polyline points={pts} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />;
}

/** Simulador: estrategia e "se eu pagar R$ X a mais por mes" (RF-182/183). */
export function Planner({ debts }: { debts: DebtIn[] }) {
  const [extra, setExtra] = useState(0);
  const [strategy, setStrategy] = useState<"avalanche" | "bola_de_neve">("avalanche");
  const base = useMemo(() => simulate(debts, 0, strategy), [debts, strategy]);
  const plan = useMemo(() => simulate(debts, extra * 100, strategy), [debts, extra, strategy]);
  const other = useMemo(() => simulate(debts, extra * 100, strategy === "avalanche" ? "bola_de_neve" : "avalanche"), [debts, extra, strategy]);
  const saved = base.totalInterest - plan.totalInterest;
  return (
    <section className="card space-y-4">
      <h2 className="font-semibold">Plano de quitação</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {([["avalanche", "Avalanche", "Paga primeiro a de maior juro. Economiza mais dinheiro."], ["bola_de_neve", "Bola de neve", "Paga primeiro a menor dívida. Você vê vitórias mais rápido."]] as const).map(([k, t, d]) => (
          <button key={k} onClick={() => setStrategy(k)} className={`card text-left ${strategy === k ? "ring-2 ring-sobbra" : ""}`}><b>{t}</b><span className="muted block text-sm">{d}</span></button>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="extra">Se eu pagar a mais por mês: <b className="money">{brl(extra * 100)}</b></label>
        <input id="extra" type="range" min={0} max={2000} step={50} value={extra} onChange={(e) => setExtra(Number(e.target.value))} className="w-full accent-[#19C37D]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="soft rounded-xl p-3"><p className="muted text-xs">Livre das dívidas</p><p className="text-xl font-bold">{plan.months ? `${plan.months} meses` : "não quita"}</p><p className="muted text-xs">{plan.months ? `em ${when(plan.months)}` : "aumente o valor por mês"}</p></div>
        <div className="soft rounded-xl p-3"><p className="muted text-xs">Juros até quitar</p><p className="text-xl font-bold">{brl(plan.totalInterest)}</p></div>
        <div className="soft rounded-xl p-3"><p className="muted text-xs">Economia com o valor a mais</p><p className="text-xl font-bold text-sobbra">{plan.months && base.months ? brl(Math.max(0, saved)) : "—"}</p><p className="muted text-xs">{plan.months && base.months ? `${base.months - plan.months} meses mais cedo` : ""}</p></div>
      </div>
      {plan.stuck.length > 0 && <p className="rounded-xl bg-coral/10 p-3 text-sm text-coral">O pagamento de {plan.stuck.join(", ")} não cobre nem os juros: a dívida cresce todo mês. Priorize renegociar essa.</p>}
      <div>
        <p className="muted mb-1 text-xs">Saldo devedor ao longo do tempo</p>
        <svg viewBox="0 0 600 140" className="h-36 w-full" preserveAspectRatio="none" role="img" aria-label="Evolução do saldo devedor"><Line data={[debts.reduce((s, d) => s + d.balanceCents, 0), ...plan.timeline]} color="#19C37D" /></svg>
      </div>
      <ol className="space-y-1 text-sm">{[...plan.payoff].sort((a, b) => (a.month ?? 9999) - (b.month ?? 9999)).map((p, i) => <li key={p.id}><b>{i + 1}.</b> {p.creditor}: quitada {p.month ? `no mês ${p.month} (${when(p.month)})` : "— não quita com esse valor"}</li>)}</ol>
      {other.months && plan.months && <p className="muted text-xs">Com {strategy === "avalanche" ? "bola de neve" : "avalanche"}: {other.months} meses e {brl(other.totalInterest)} de juros.</p>}
    </section>
  );
}
