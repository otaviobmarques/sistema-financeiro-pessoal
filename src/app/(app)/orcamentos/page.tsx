import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { budgetStatus, budgetColor, goalPlan } from "@/lib/budgets";
import { Money } from "@/components/ui";
import { BudgetLimit, AddBudget, SuggestButton, GoalForm, GoalCard } from "./client";

export default async function Orcamentos() {
  const user = await requireUser();
  const [b, goals] = await Promise.all([budgetStatus(user.id), db.goal.findMany({ where: { userId: user.id }, orderBy: [{ achievedAt: "asc" }, { createdAt: "asc" }] })]);
  const usedPct = b.totalLimit ? b.totalSpent / b.totalLimit : 0;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Orçamentos e metas</h1>
        <p className="muted text-sm">Quanto você combinou gastar em cada categoria este mês, e para onde está guardando dinheiro.</p>
      </div>

      <section className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card"><p className="muted text-sm">Usado do orçamento</p><p className="text-2xl font-bold" style={{ color: budgetColor(usedPct) }}>{Math.round(usedPct * 100)}%</p><p className="muted text-xs"><Money cents={b.totalSpent} /> de <Money cents={b.totalLimit} /></p></div>
          <div className="card"><p className="muted text-sm">Passaram do limite</p><p className={`text-2xl font-bold ${b.rows.some((r) => r.pct >= 1) ? "text-coral" : "text-sobbra"}`}>{b.rows.filter((r) => r.pct >= 1).length}</p></div>
          <div className="card"><p className="muted text-sm">Dia do mês</p><p className="text-2xl font-bold">{b.day} de {b.dim}</p><p className="muted text-xs">a projeção começa a valer depois do dia 7</p></div>
        </div>
        {b.suggestions.length > 0 && (
          <div className="card soft flex flex-wrap items-center gap-3">
            <p className="flex-1 text-sm">Sugestão pela sua média dos últimos 3 meses: {b.suggestions.slice(0, 4).map((s) => `${s.icon} ${s.name} ${(s.suggested / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`).join(" · ")}{b.suggestions.length > 4 ? "…" : ""}</p>
            <SuggestButton count={b.suggestions.length} />
          </div>
        )}
        <div className="card space-y-4">
          {!b.rows.length && <p className="muted text-sm">Nenhum orçamento ainda. Use a sugestão acima ou adicione uma categoria abaixo.</p>}
          {b.rows.map((r) => (
            <div key={r.id} className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: r.color + "22" }}>{r.icon}</span>{r.name}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.status === "estourou" ? "bg-coral/15 text-coral" : r.status === "vai estourar" ? "bg-ambar/20 text-amber-700 dark:text-ambar" : "bg-sobbra/15 text-sobbra"}`}>{r.status}</span></span>
                <span className="text-sm"><Money cents={r.spent} /> <span className="muted">de</span> <BudgetLimit id={r.id} categoryId={r.categoryId} limit={r.limit} /></span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
                <div className={`h-full rounded-full ${r.pct >= 0.8 ? "pulse-bar" : "growx"}`} style={{ width: `${Math.min(100, r.pct * 100)}%`, background: `linear-gradient(90deg, #19C37D, ${budgetColor(r.pct)})`, color: budgetColor(r.pct) }} />
              </div>
              <p className="muted text-xs">{r.pct >= 1 ? `Passou ${((r.spent - r.limit) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} do limite.` : `Restam ${((r.limit - r.spent) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`}{b.day >= 7 && ` Pelo ritmo, o mês fecha em ${(r.proj / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`}{r.avg3 ? ` Média de 3 meses: ${(r.avg3 / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.` : ""}</p>
            </div>
          ))}
          <AddBudget categories={b.parents.filter((p) => !p.budgeted)} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-lg font-bold">Metas</h2><p className="muted text-sm">Reserva de emergência, viagem, carro: o Sobbra calcula quanto guardar por mês.</p></div></div>
        <div className="grid gap-3 md:grid-cols-2">
          {goals.map((g) => { const p = goalPlan(g); return <GoalCard key={g.id} goal={{ id: g.id, name: g.name, icon: g.icon, target: g.targetCents, saved: g.savedCents, deadline: g.deadline?.toISOString() ?? null, achieved: !!g.achievedAt }} plan={p} />; })}
          <GoalForm />
        </div>
      </section>
    </div>
  );
}
