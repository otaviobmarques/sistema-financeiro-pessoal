import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { dashboard } from "@/lib/finance";
import { db } from "@/lib/db";
import { monthKey, monthLabel } from "@/lib/money";
import { CountUp, Money, Term } from "@/components/ui";
import { CategoryDonut, MonthBars, BalanceLine, WeekHeat } from "@/components/Charts";
import { VoiceButton } from "@/components/VoiceButton";
import { ModeToggle, Upsell, Customize, MonthCelebration } from "./client";
import { budgetStatus, budgetColor, goalPlan } from "@/lib/budgets";
import { agendaItems } from "@/lib/agenda";
import { brl } from "@/lib/money";
import { WIDGETS, WIDE, readLayout, type WidgetKey } from "@/lib/dashboard-layout";
import { Gauge, Kpi, FlowBars, Treemap, HeatCalendar } from "@/components/Vibe";
import { healthScore } from "@/lib/health";

const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null);

export default async function Inicio({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : monthKey(new Date());
  const d = await dashboard(user.id, month);
  const txCount = await db.transaction.count({ where: { userId: user.id, deletedAt: null } });
  const [y, m] = month.split("-").map(Number);
  const prev = monthKey(new Date(y, m - 2, 1)), next = monthKey(new Date(y, m, 1));
  const prevData = month === monthKey(new Date()) ? await dashboard(user.id, prev) : null;
  const prevSobra = prevData ? prevData.income - prevData.expense : 0;
  const first = user.name.split(" ")[0];
  const daysSince = (Date.now() - +user.createdAt) / 86400000;
  const showUpsell = user.plan === "FREE" && txCount >= 10 && (!user.lastUpsellAt || Date.now() - +user.lastUpsellAt > 7 * 86400000);

  // Definicoes financeiras transparentes (Design System, p. 10)
  const goals = await db.goal.findMany({ where: { userId: user.id, achievedAt: null } });
  const reserva = goals.reduce((s, g) => s + (goalPlan(g).monthly ?? 0), 0); // alocacao futura planejada, nao transferida
  const guardado = goals.reduce((s, g) => s + g.savedCents, 0);
  const compromissos = d.pendOut + d.cardsDue;
  const livre = d.saldoAtual - compromissos - reserva;
  const fim = d.monthEnd.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  const isCurrent = month === monthKey(new Date());
  const monthName = (() => { const t = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }); return t.charAt(0).toUpperCase() + t.slice(1); })();
  const [upcoming, recent] = await Promise.all([
    agendaItems(user.id, new Date(new Date().setHours(0, 0, 0, 0)), new Date(Date.now() + 7 * 86400000)),
    db.transaction.findMany({ where: { userId: user.id, deletedAt: null, date: { lte: new Date() } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 5, include: { category: { include: { parent: true } } } }),
  ]);

  const header = (
    <div className="mb-5 space-y-3">
      <p className="eyebrow">Olá, {first}</p>
      <h1 className="text-[34px] leading-[1.1] md:text-[46px]">Seu dinheiro, <i>sob controle.</i></h1>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="line inline-flex items-center rounded-full border" style={{ background: "var(--card)" }}>
          <Link href={`/inicio?mes=${prev}`} className="grid h-11 w-11 place-items-center" aria-label="Mês anterior">‹</Link>
          <span className="px-1 text-sm font-bold">{monthName}</span>
          <Link href={`/inicio?mes=${next}`} className="grid h-11 w-11 place-items-center" aria-label="Próximo mês">›</Link>
        </div>
        <ModeToggle simple={user.simpleMode} hide={user.hideValues} />
      </div>
    </div>
  );

  // Estado vazio que ensina o proximo passo (RF-168)
  const empty = txCount === 0 && (
    <div className="card mb-4">
      <p className="h1 text-2xl">Seu primeiro movimento</p>
      <p className="muted mt-1 text-sm">Adicione uma entrada ou saída para começar. Toque em <b>Registrar</b> e escolha digitar, falar ou fotografar o comprovante.</p>
    </div>
  );

  // Resumo principal: valor livre no plano com explicacao e composicao (p. 9)
  const hero = (
    <section className="hero flex flex-col" aria-labelledby="livre-t">
      <p id="livre-t" className="text-sm font-bold">{livre >= 0 ? "No seu plano, ainda há" : "Para cobrir seu plano, faltam"}</p>
      <p className="serif mt-1 text-[40px] leading-tight md:text-[48px]"><Money cents={Math.abs(livre)} /></p>
      <p className="mt-1 text-sm">{isCurrent ? `Até ${fim}` : `Em ${monthName}`} · Estimativa após contas pendentes{reserva ? " e reserva planejada" : ""}.</p>
      <details className="group my-4">
        <summary className="btn-dark w-full cursor-pointer list-none justify-between [&::-webkit-details-marker]:hidden">Entender meu plano <span aria-hidden className="transition-transform group-open:rotate-90">→</span></summary>
        <div className="mt-3 rounded-2xl bg-white p-4 text-ink">
          <p className="eyebrow mb-2">Como o plano é calculado</p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Saldo do dia a dia</dt><dd><Money cents={d.saldoAtual} className="font-bold" /></dd></div>
            <div className="flex justify-between"><dt>Contas ainda a pagar{d.cardsDue ? " (inclui faturas)" : ""}</dt><dd><Money cents={-compromissos} className="font-bold" /></dd></div>
            {reserva > 0 && <div className="flex justify-between"><dt>Reserva planejada para as metas</dt><dd><Money cents={-reserva} className="font-bold" /></dd></div>}
            <div className="line flex justify-between border-t pt-2"><dt className="font-bold text-floresta">Valor livre no plano</dt><dd><Money cents={livre} className="serif text-xl text-floresta" /></dd></div>
          </dl>
          <p className="mt-3 rounded-xl bg-sage p-3 text-xs">{guardado > 0 ? `Os ${brl(guardado)} já guardados nas metas estão separados deste saldo. ` : ""}{reserva > 0 ? `A reserva planejada é uma intenção futura, não um aporte realizado. ` : ""}Recebimentos futuros não entram no cálculo.</p>
          <p className="muted mt-2 text-xs">Não é saldo bancário nem garantia de sobra. Se faltar um movimento, o valor pode mudar.</p>
        </div>
      </details>
      <div className="mt-auto flex justify-between border-t border-forest/20 pt-3 text-sm"><span>Saldo do dia a dia</span><Money cents={d.saldoAtual} className="font-bold" /></div>
    </section>
  );

  const month3 = (
    <section className="card" aria-labelledby="mes-t">
      <p id="mes-t" className="eyebrow mb-3">Um olhar para o mês</p>
      <div className="grid grid-cols-2 gap-3">
        <div><p className="muted text-sm">Entradas do mês</p><p className="text-xl font-bold"><Money cents={d.income} sign /></p></div>
        <div><p className="muted text-sm">Saídas do mês</p><p className="text-xl font-bold"><Money cents={-d.expense} /></p></div>
      </div>
      <p className="muted mt-3 text-sm">Resultado do mês: <b className="text-ink dark:text-[#ECEFE6]"><Money cents={d.income - d.expense} /></b></p>
    </section>
  );

  const nextUp = (
    <section className="card" aria-labelledby="prox-t">
      <div className="mb-2 flex items-center justify-between"><p id="prox-t" className="eyebrow">Próximos compromissos</p><Link href="/agenda" className="text-sm font-bold text-floresta underline-offset-4 hover:underline dark:text-[#ECEFE6]">Agenda</Link></div>
      {!upcoming.length ? <p className="muted text-sm">Nenhum compromisso nos próximos 7 dias.</p> : (
        <ul>{upcoming.slice(0, 4).map((e) => (
          <li key={e.id} className="line flex items-center justify-between gap-2 border-t py-2.5 text-sm first:border-0"><span className="min-w-0 truncate"><span className="muted mr-2">{e.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>{e.title}</span>{e.amountCents ? <Money cents={e.kind === "receber" ? e.amountCents : -e.amountCents} sign={e.kind === "receber"} className="font-bold" /> : null}</li>
        ))}</ul>
      )}
    </section>
  );

  const recentList = (
    <section className="card" aria-labelledby="rec-t">
      <div className="mb-2 flex items-center justify-between"><p id="rec-t" className="eyebrow">Movimentos recentes</p><Link href="/lancamentos" className="text-sm font-bold text-floresta underline-offset-4 hover:underline dark:text-[#ECEFE6]">Ver todos</Link></div>
      {!recent.length ? <p className="muted text-sm">Nenhum movimento ainda.</p> : (
        <ul>{recent.map((t) => (
          <li key={t.id} className="line border-t first:border-0"><Link href={`/lancamentos/${t.id}`} className="flex min-h-[52px] items-center gap-3 py-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sage text-lg" aria-hidden>{t.category?.icon ?? (t.type === "TRANSFER" ? "⇄" : "•")}</span>
            <span className="min-w-0 flex-1"><b className="block truncate text-sm">{t.description}</b><span className="muted text-xs">{t.category ? t.category.name : t.type === "TRANSFER" ? "Transferência" : "Sem categoria"} · {t.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span></span>
            <Money cents={t.type === "INCOME" ? t.amountCents : -t.amountCents} sign={t.type === "INCOME"} className="text-sm font-bold" />
          </Link></li>
        ))}</ul>
      )}
    </section>
  );

  // Modo Simples (RF-160): o resumo, o mes e duas acoes; sem esconder compromissos
  if (user.simpleMode) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        {header}
        {empty}
        {hero}
        {month3}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/lancamentos/novo" className="btn-primary h-14">Registrar <span aria-hidden>+</span></Link>
          <VoiceButton variant="big" />
        </div>
        {nextUp}
        {showUpsell && <Upsell />}
      </div>
    );
  }

  // Painel personalizavel (RF-059): cada bloco e um widget; ordem e visibilidade salvas por usuario
  const budget = await budgetStatus(user.id);
  // Painel vibrante: saude financeira, KPIs com tendencia, mapa de gastos e ritmo diario
  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - 7 * 18 + 1 - since.getDay());
  const [debts, dayExp] = await Promise.all([
    db.debt.findMany({ where: { userId: user.id, paidOffAt: null } }),
    db.transaction.findMany({ where: { userId: user.id, deletedAt: null, type: "EXPENSE", date: { gte: since, lte: new Date() } }, select: { date: true, amountCents: true } }),
  ]);
  const withExp = d.monthly.filter((x) => x.expense > 0);
  const avgExpense = withExp.length ? withExp.reduce((s, x) => s + x.expense, 0) / withExp.length : 0;
  const h = healthScore({ income: d.income, expense: d.expense, budgetsOk: budget.rows.filter((r) => r.pct < 1).length, budgetsTotal: budget.rows.length,
    debtInterestMonthly: Math.round(debts.reduce((s, x) => s + (x.balanceCents * x.monthlyRate) / 100, 0)), reserveCents: guardado, avgExpense });
  const mm = d.monthly; const last = mm[mm.length - 1], before = mm[mm.length - 2];
  const dpct = (a: number, b?: number) => (b ? Math.round(((a - b) / b) * 100) : null);
  const MON = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const flow = mm.map((x) => ({ label: MON[Number(x.month.slice(5)) - 1], income: x.income, expense: x.expense, hl: x.month === month }));
  const heat: { date: string; v: number }[] = []; const byDay = new Map<string, number>();
  for (const t of dayExp) { const k = t.date.toISOString().slice(0, 10); byDay.set(k, (byDay.get(k) ?? 0) + t.amountCents); }
  for (let x = new Date(since); x <= new Date(); x.setDate(x.getDate() + 1)) { const k = x.toISOString().slice(0, 10); heat.push({ date: k, v: byDay.get(k) ?? 0 }); }
  const healthCard = (
    <section className="card rise h-full" style={{ ["--i" as string]: 1 }} aria-labelledby="saude-t">
      <div className="mb-1 flex items-center justify-between"><h2 id="saude-t" className="font-bold">Saúde financeira</h2><span className="rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide" style={{ background: `${h.label[1]}22`, color: h.label[1] }}>{h.label[0]}</span></div>
      <Gauge score={h.score} color={h.label[1]} />
      <ul className="mt-1 space-y-2">{h.factors.map((f, i) => (
        <li key={f.name}><div className="flex justify-between text-sm"><b>{f.name}</b><span className="muted">{f.points}/{f.max}</span></div>
          <div className="h-[7px] overflow-hidden rounded-full" style={{ background: "var(--line)" }}><div className="growx h-full rounded-full" style={{ width: `${(f.points / f.max) * 100}%`, background: "linear-gradient(90deg,#7C5CFF,#12B76A)", animationDelay: `${i * 80}ms` }} /></div>
          <p className="muted mt-0.5 text-xs">{f.desc}</p></li>))}</ul>
    </section>
  );
  const kpis = (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi i={2} label="Entradas do mês" cents={d.income} color="#12B76A" icon="↗" series={mm.map((x) => x.income)} delta={dpct(last?.income ?? 0, before?.income)} goodUp sign />
      <Kpi i={3} label="Saídas do mês" cents={-d.expense} color="#F2545B" icon="↘" series={mm.map((x) => x.expense)} delta={dpct(last?.expense ?? 0, before?.expense)} goodUp={false} />
      <Kpi i={4} label="Resultado do mês" cents={d.income - d.expense} color="#7C5CFF" icon="≈" series={mm.map((x) => x.income - x.expense)} delta={null} goodUp sign />
      <Kpi i={5} label="Saldo do dia a dia" cents={d.saldoAtual} color="#2E9BFF" icon="◎" series={d.balanceLine.filter((_, i) => i % 3 === 0).map((x) => x.balance)} delta={null} goodUp />
    </div>
  );
  const goalsTop = goals.slice(0, 3);
  const widgets: Record<WidgetKey, React.ReactNode> = {
    resumo: (
      <div className="space-y-3">
        <div className="grid items-stretch gap-3 lg:grid-cols-[1.35fr_1fr]">{hero}{healthCard}</div>
        {kpis}
        <div className="grid items-start gap-3 lg:grid-cols-2">{nextUp}{recentList}</div>
      </div>
    ),
    categorias: (
      <section className="card h-full">
        <h2 className="mb-2 font-semibold">Para onde foi o dinheiro</h2>
        <CategoryDonut data={d.categories} month={month} />
        <ul className="mt-2 space-y-1">
          {d.categories.slice(0, 6).map((c) => {
            const v = pct(c.total, c.prev);
            return (
              <li key={c.id}><Link href={`/lancamentos?mes=${month}&cat=${c.id}`} className="flex min-h-[40px] items-center gap-2 rounded-lg px-1 hover:bg-black/5">
                <span className="h-3 w-3 rounded-full" style={{ background: c.color }} /><span className="flex-1">{c.icon} {c.name}</span>
                <span className="muted text-xs">{Math.round(c.pct * 100)}%</span>
                {v !== null && <span className={`text-xs ${v > 0 ? "text-coral" : "text-sobbra"}`}>{v > 0 ? "▲" : "▼"}{Math.abs(v)}%</span>}
                <Money cents={c.total} className="w-24 text-right font-medium" />
              </Link></li>
            );
          })}
        </ul>
      </section>
    ),
    mesames: (
      <section className="card h-full">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Fluxo dos últimos 6 meses</h2><span className="muted flex gap-3 text-xs"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#12B76A]" />Entradas</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#F2545B]" />Saídas</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#7C5CFF]" />Resultado</span></span></div>
        <FlowBars data={flow} />
        <h2 className="mb-2 mt-4 font-semibold">Saldo ao longo do mês</h2>
        <BalanceLine data={d.balanceLine} />
      </section>
    ),
    orcamentos: (
      <section className="card h-full">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Orçamentos</h2><Link href="/orcamentos" className="text-sm text-sobbra">Ver todos ›</Link></div>
        {!budget.rows.length ? <p className="muted text-sm">Sem orçamentos. <Link href="/orcamentos" className="text-sobbra">Criar pela sua média</Link></p> : (
          <ul className="space-y-3">{budget.rows.slice(0, 5).map((r) => (
            <li key={r.id}><div className="mb-1 flex justify-between text-sm"><span>{r.icon} {r.name}</span><span><Money cents={r.spent} /> <span className="muted">/ {brl(r.limit)}</span></span></div>
              <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--line)" }}><div className={`h-full rounded-full ${r.pct >= 0.8 ? "pulse-bar" : "growx"}`} style={{ width: `${Math.min(100, r.pct * 100)}%`, background: budgetColor(r.pct), color: budgetColor(r.pct) }} /></div></li>
          ))}</ul>
        )}
      </section>
    ),
    metas: (
      <section className="card h-full">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Metas</h2><Link href="/orcamentos" className="text-sm text-sobbra">Ver todas ›</Link></div>
        {!goalsTop.length ? <p className="muted text-sm">Nenhuma meta em andamento. <Link href="/orcamentos" className="text-sobbra">Criar uma meta</Link></p> : (
          <ul className="space-y-3">{goalsTop.map((g) => { const p = goalPlan(g); return (
            <li key={g.id}><div className="mb-1 flex justify-between text-sm"><span>{g.icon} {g.name}</span><span className="muted">{Math.round(p.pct * 100)}%</span></div>
              <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--line)" }}><div className="growx h-full rounded-full bg-sobbra" style={{ width: `${p.pct * 100}%` }} /></div>
              <p className="muted mt-1 text-xs">{brl(g.savedCents)} de {brl(g.targetCents)}{p.monthly ? ` · guarde ${brl(p.monthly)}/mês` : ""}</p></li>); })}</ul>
        )}
      </section>
    ),
    mapa: (
      <section className="card h-full">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Mapa de gastos</h2><span className="muted text-xs">por estabelecimento</span></div>
        {d.merchants.length ? <Treemap items={d.merchants} month={month} /> : <p className="muted text-sm">Nada por aqui ainda.</p>}
      </section>
    ),
    ritmo: (
      <section className="card h-full">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Ritmo de gastos</h2><span className="muted text-xs">últimas 18 semanas</span></div>
        <HeatCalendar days={heat} />
      </section>
    ),
    estabelecimentos: (
      <section className="card h-full">
        <h2 className="mb-3 font-semibold">Onde você mais gastou</h2>
        <ul className="space-y-1">{d.merchants.map((mm) => (
          <li key={mm.name}><Link href={`/lancamentos?mes=${month}&q=${encodeURIComponent(mm.name)}`} className="flex min-h-[40px] items-center justify-between rounded-lg px-1 hover:bg-black/5"><span>{mm.name}</span><Money cents={mm.total} className="font-medium" /></Link></li>
        ))}{!d.merchants.length && <li className="muted text-sm">Nada por aqui ainda.</li>}</ul>
      </section>
    ),
    semana: (
      <section className="card h-full">
        <h2 className="mb-3 font-semibold">Gasto por dia da semana</h2>
        <WeekHeat data={d.weekday} />
      </section>
    ),
  };
  const layout = readLayout(user.dashboardLayout);
  const visible = layout.order.filter((k) => !layout.hidden.includes(k));
  return (
    <div>
      {header}
      {empty}
      <MonthCelebration month={prev} sobra={prevSobra} />
      <div className="mb-3 flex justify-end"><Customize layout={layout} labels={WIDGETS} /></div>
      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((k) => <div key={k} className={WIDE.includes(k) ? "lg:col-span-2" : ""}>{widgets[k]}</div>)}
      </div>
      {!visible.length && <p className="card muted text-center">Todos os blocos estão escondidos. Use “Personalizar painel” para mostrar.</p>}
      {showUpsell && <Upsell />}
    </div>
  );
}
