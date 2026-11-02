import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { budgetStatus, goalPlan } from "@/lib/budgets";
import { agendaItems } from "@/lib/agenda";
import { Money } from "@/components/ui";
import { brl } from "@/lib/money";

/** Plano (Design System, p. 8 e 12): compromissos e escolhas do mes num lugar so. */
export default async function Plano() {
  const user = await requireUser();
  const now = new Date();
  const [goals, budget, upcoming, fixed, debts, bills] = await Promise.all([
    db.goal.findMany({ where: { userId: user.id }, orderBy: [{ achievedAt: "asc" }, { createdAt: "asc" }], take: 3 }),
    budgetStatus(user.id),
    agendaItems(user.id, new Date(new Date().setHours(0, 0, 0, 0)), new Date(Date.now() + 14 * 86400000)),
    db.transaction.count({ where: { userId: user.id, deletedAt: null, recurrence: "monthly", status: "PENDING", date: { gt: now } } }),
    db.debt.aggregate({ where: { userId: user.id, balanceCents: { gt: 0 } }, _sum: { balanceCents: true }, _count: true }),
    db.bill.aggregate({ where: { userId: user.id, paidAt: null }, _sum: { amountCents: true }, _count: true }),
  ]);
  const main = goals.find((g) => !g.achievedAt) ?? goals[0];
  const p = main ? goalPlan(main) : null;
  const tools = [
    { href: "/recorrentes", title: "Fixas e recorrentes", desc: fixed ? `${fixed} pagamentos agendados` : "Aluguel, salário, assinaturas" },
    { href: "/agenda", title: "Agenda", desc: upcoming.length ? `${upcoming.length} itens nos próximos 14 dias` : "Compromissos e lembretes" },
    { href: "/contas-a-pagar", title: "Contas a pagar", desc: bills._count ? `${bills._count} em aberto · ${brl(bills._sum.amountCents ?? 0)}` : "Boletos e contas" },
    { href: "/dividas", title: "Dívidas", desc: debts._count ? `${debts._count} em aberto · ${brl(debts._sum.balanceCents ?? 0)}` : "Plano para quitar" },
    { href: "/ajustes", title: "Categorias", desc: "Criar e organizar categorias" },
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="space-y-2"><p className="eyebrow">Seu plano</p><h1 className="text-[34px] leading-[1.1] md:text-[44px]">Espaço para <i>o que importa.</i></h1></div>

      {main && p ? (
        <section className="hero" aria-labelledby="meta-t">
          <p className="inline-block rounded-full bg-white px-3 py-1 text-xs font-bold">Sua meta</p>
          <p id="meta-t" className="serif mt-3 text-2xl">{main.name}</p>
          <p className="serif mt-1 text-4xl"><Money cents={main.savedCents} /></p>
          <p className="text-sm">de {brl(main.targetCents)} definidos por você</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70" role="progressbar" aria-valuenow={Math.round(p.pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${Math.round(p.pct * 100)}% da meta`}><div className="h-full rounded-full bg-forest" style={{ width: `${p.pct * 100}%` }} /></div>
          <div className="mt-2 flex justify-between text-xs"><span>{Math.round(p.pct * 100)}% da meta</span><span>{main.deadline ? `até ${main.deadline.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}` : "Sem prazo definido"}</span></div>
          {p.monthly ? <p className="mt-3 rounded-xl bg-white/60 p-3 text-xs">Para chegar no prazo, guarde {brl(p.monthly)} por mês. Esse valor ainda não foi adicionado à meta.</p> : null}
        </section>
      ) : (
        <section className="card"><p className="h1 text-2xl">Criar uma reserva</p><p className="muted mt-1 text-sm">Uma meta com nome, valor e prazo ajuda a separar o dinheiro do dia a dia.</p><Link href="/orcamentos" className="btn-primary mt-3">Criar meta <span aria-hidden>+</span></Link></section>
      )}

      <section className="card space-y-3" aria-labelledby="orc-t">
        <div className="flex items-center justify-between"><h2 id="orc-t" className="h1 text-2xl">Orçamento do mês</h2><Link href="/orcamentos" className="text-sm font-bold text-floresta underline-offset-4 hover:underline dark:text-[#ECEFE6]">Editar</Link></div>
        {!budget.rows.length ? <p className="muted text-sm">Nenhum limite definido. <Link href="/orcamentos" className="font-bold underline">Definir limites pela sua média</Link></p> : budget.rows.slice(0, 4).map((r) => {
          const over = r.spent - r.limit;
          return (
            <div key={r.id}>
              <div className="flex justify-between text-sm"><b>{r.name}</b><span><Money cents={r.spent} /> / {brl(r.limit)}</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-sage" role="progressbar" aria-valuenow={Math.round(r.pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.name}: ${Math.round(r.pct * 100)}% do limite`}><div className={`h-full rounded-full ${over > 0 ? "bg-terracotta" : "bg-forest"}`} style={{ width: `${Math.min(100, r.pct * 100)}%` }} /></div>
              <p className={`mt-1 text-xs ${over > 0 ? "text-terracotta" : "muted"}`}>{over > 0 ? `Você registrou ${brl(over)} acima do plano de ${r.name.toLowerCase()}.` : `${brl(r.limit - r.spent)} até o limite que você definiu.`}</p>
            </div>
          );
        })}
        <Link href="/orcamentos" className="btn-ghost w-full justify-between">Criar outra meta <span aria-hidden>+</span></Link>
      </section>

      <section className="card" aria-labelledby="ferr-t">
        <h2 id="ferr-t" className="eyebrow mb-1">Organizar o mês</h2>
        <ul>{tools.map((t) => <li key={t.href} className="line border-t first:border-0"><Link href={t.href} className="flex min-h-[60px] items-center justify-between gap-3 py-2"><span><b className="block">{t.title}</b><span className="muted text-sm">{t.desc}</span></span><span aria-hidden>›</span></Link></li>)}</ul>
      </section>
    </div>
  );
}
