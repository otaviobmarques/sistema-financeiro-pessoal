import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEBT_TYPES, simulate } from "@/lib/debts";
import { Money } from "@/components/ui";
import { DebtForm, DebtRow, Planner } from "./client";

export default async function Dividas() {
  const user = await requireUser();
  const debts = await db.debt.findMany({ where: { userId: user.id }, orderBy: [{ paidOffAt: "asc" }, { monthlyRate: "desc" }] });
  const open = debts.filter((d) => d.balanceCents > 0);
  const total = open.reduce((s, d) => s + d.balanceCents, 0);
  const interestMonth = open.reduce((s, d) => s + Math.round(d.balanceCents * d.monthlyRate / 100), 0);
  const priciest = [...open].sort((a, b) => b.monthlyRate - a.monthlyRate)[0];
  const input = open.map((d) => ({ id: d.id, creditor: d.creditor, balanceCents: d.balanceCents, monthlyRate: d.monthlyRate, paymentCents: d.paymentCents }));
  const base = simulate(input, 0, "avalanche");
  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold">Minhas dívidas</h1><p className="muted text-sm">Organize o que deve, veja quanto vai para juros e o caminho mais rápido para sair do vermelho.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card"><p className="muted text-sm">Total devido</p><p className="text-2xl font-bold text-coral"><Money cents={total} /></p><p className="muted text-xs">{open.length} dívida{open.length === 1 ? "" : "s"} em aberto</p></div>
        <div className="card"><p className="muted text-sm">Vai para juros por mês</p><p className="text-2xl font-bold"><Money cents={interestMonth} /></p><p className="muted text-xs">dinheiro que não abate a dívida</p></div>
        <div className="card"><p className="muted text-sm">Livre das dívidas em</p><p className="text-2xl font-bold">{!open.length ? "—" : base.months ? `${base.months} meses` : "não quita"}</p><p className="muted text-xs">{base.months ? `pagando só as parcelas atuais` : open.length ? "as parcelas não cobrem os juros" : ""}</p></div>
      </div>
      {priciest && priciest.monthlyRate >= 5 && (
        <div className="card border-coral/40 bg-coral/5 text-sm">
          <b>Atenção a {priciest.creditor}:</b> {priciest.monthlyRate.toLocaleString("pt-BR")}% ao mês é muito caro ({DEBT_TYPES[priciest.type]}). Vale procurar os canais oficiais de renegociação do credor e comparar com uma opção de juros menores, como o consignado. O Sobbra não indica instituições.
        </div>
      )}
      <section className="card space-y-2">
        <h2 className="font-semibold">Dívidas</h2>
        {!debts.length && <p className="muted text-sm">Nenhuma dívida cadastrada. Que bom! Se tiver alguma, cadastre abaixo para montar o plano.</p>}
        <ul>{debts.map((d) => <DebtRow key={d.id} debt={{ id: d.id, type: d.type, typeLabel: DEBT_TYPES[d.type], creditor: d.creditor, balance: d.balanceCents, rate: d.monthlyRate, payment: d.paymentCents, dueDay: d.dueDay, paidOff: !!d.paidOffAt }} />)}</ul>
        <DebtForm />
      </section>
      {open.length > 0 && <Planner debts={input} />}
      {user.goal === "sair_do_vermelho" && <p className="muted text-sm">Você escolheu “Sair do vermelho” no início. Cada dívida quitada aqui ganha uma comemoração. 🪙</p>}
    </div>
  );
}
