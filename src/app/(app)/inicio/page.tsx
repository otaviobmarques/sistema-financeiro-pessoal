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

  const header = (
    <div className="mb-4 flex items-center justify-between gap-2">
      <div>
        <p className="muted text-sm">Olá, {first} 👋</p>
        <div className="flex items-center gap-1">
          <Link href={`/inicio?mes=${prev}`} className="muted px-2 text-xl" aria-label="Mês anterior">‹</Link>
          <h1 className="text-xl font-bold capitalize">{monthLabel(month)}</h1>
          <Link href={`/inicio?mes=${next}`} className="muted px-2 text-xl" aria-label="Próximo mês">›</Link>
        </div>
      </div>
      <ModeToggle simple={user.simpleMode} hide={user.hideValues} />
    </div>
  );

  // Estado vazio que ensina o proximo passo (RF-168)
  const empty = txCount === 0 && (
    <div className="card soft mb-4 text-center">
      <p className="text-4xl">🪙</p>
      <p className="mt-2 font-semibold">Vamos lançar seu primeiro gasto?</p>
      <p className="muted text-sm">Toque em “Falar” e diga, por exemplo: “gastei 30 no mercado”. Ou tire a foto de um comprovante.</p>
    </div>
  );

  // Modo Simples (RF-160): tres numeros e tres botoes grandes
  if (user.simpleMode) {
    return (
      <div className="mx-auto max-w-md">
        {header}
        {empty}
        <div className="card mb-3 text-center">
          <p className="muted"><Term tip="É o que dá para gastar por dia até o próximo dinheiro entrar, já descontando as contas que você agendou.">Quanto ainda posso gastar</Term></p>
          <p className={`mt-1 text-5xl font-bold ${d.saldoPrevisto < 0 ? "text-coral" : "text-sobbra"}`}><CountUp cents={d.porDia} /></p>
          <p className="muted mt-1 text-sm">por dia, {d.daysUntilIncome === 1 ? "até amanhã" : `nos próximos ${d.daysUntilIncome} dias`}</p>
        </div>
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="card"><p className="muted text-sm">💚 Dinheiro que entrou</p><p className="mt-1 text-xl font-bold"><CountUp cents={d.income} /></p></div>
          <div className="card"><p className="muted text-sm">❤️ Dinheiro que saiu</p><p className="mt-1 text-xl font-bold text-coral"><CountUp cents={d.expense} /></p></div>
        </div>
        <div className="flex gap-3">
          <VoiceButton variant="big" />
          <Link href="/lancamentos/novo" className="btn-dark h-24 flex-1 flex-col text-base"><span className="text-3xl">➕</span>Adicionar</Link>
          <Link href="/comprovantes" className="btn-ghost h-24 flex-1 flex-col text-base"><span className="text-3xl">📷</span>Foto do comprovante</Link>
        </div>
        {d.sobra > 0 && d.income > 0 && <p className="fill-in mt-6 rounded-2xl bg-ambar/15 p-4 text-center">🪙 Até agora sobraram <Money cents={d.sobra} className="font-bold" /> este mês.</p>}
        {d.categories[0] && <p className="muted mt-4 text-center text-sm">Onde mais foi dinheiro: {d.categories[0].icon} {d.categories[0].name} (<Money cents={d.categories[0].total} />). <Link className="font-semibold text-sobbra" href="/relatorios">Ver mais</Link></p>}
        {daysSince > 7 && <p className="muted mt-6 text-center text-xs">Quer ver gráficos e previsões? Toque em “Modo Completo” lá em cima.</p>}
        {showUpsell && <Upsell />}
      </div>
    );
  }

  // Painel personalizavel (RF-059): cada bloco e um widget; ordem e visibilidade salvas por usuario
  const [budget, goals, upcoming] = await Promise.all([budgetStatus(user.id), db.goal.findMany({ where: { userId: user.id, achievedAt: null }, take: 3, orderBy: { createdAt: "asc" } }),
    agendaItems(user.id, new Date(new Date().setHours(0, 0, 0, 0)), new Date(Date.now() + 7 * 86400000))]);
  const widgets: Record<WidgetKey, React.ReactNode> = {
    resumo: (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card"><p className="muted text-sm">Receitas</p><p className="text-2xl font-bold text-sobbra"><CountUp cents={d.income} /></p></div>
          <div className="card"><p className="muted text-sm">Despesas</p><p className="text-2xl font-bold text-coral"><CountUp cents={d.expense} /></p></div>
          <div className="card"><p className="muted text-sm"><Term tip="Só o que já aconteceu: soma das suas contas hoje (sem cartão de crédito e investimentos).">Saldo atual</Term></p><p className="text-2xl font-bold"><CountUp cents={d.saldoAtual} /></p></div>
          <div className="card"><p className="muted text-sm"><Term tip="Saldo atual + o que ainda vai entrar − contas e faturas que vencem até o fim do mês.">Saldo previsto</Term></p><p className={`text-2xl font-bold ${d.saldoPrevisto < 0 ? "text-coral" : ""}`}><CountUp cents={d.saldoPrevisto} /></p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="card flex items-center gap-4"><span className="text-3xl">🧮</span><div><p className="muted text-sm">Pode gastar por dia até o próximo dinheiro</p><p className="text-xl font-bold"><Money cents={d.porDia} /></p></div></div>
          <div className="card flex items-center gap-4"><span className="text-3xl">🔮</span><div><p className="muted text-sm">Projeção de fim de mês pelo seu ritmo</p><p className={`text-xl font-bold ${d.projecao < 0 ? "text-coral" : "text-sobbra"}`}><Money cents={d.projecao} /></p></div></div>
        </div>
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
        <h2 className="mb-2 font-semibold">Mês a mês</h2>
        <MonthBars data={d.monthly} />
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
        {!goals.length ? <p className="muted text-sm">Nenhuma meta em andamento. <Link href="/orcamentos" className="text-sobbra">Criar uma meta</Link></p> : (
          <ul className="space-y-3">{goals.map((g) => { const p = goalPlan(g); return (
            <li key={g.id}><div className="mb-1 flex justify-between text-sm"><span>{g.icon} {g.name}</span><span className="muted">{Math.round(p.pct * 100)}%</span></div>
              <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--line)" }}><div className="growx h-full rounded-full bg-sobbra" style={{ width: `${p.pct * 100}%` }} /></div>
              <p className="muted mt-1 text-xs">{brl(g.savedCents)} de {brl(g.targetCents)}{p.monthly ? ` · guarde ${brl(p.monthly)}/mês` : ""}</p></li>); })}</ul>
        )}
      </section>
    ),
    agenda: (
      <section className="card h-full">
        <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Próximos 7 dias</h2><Link href="/agenda" className="text-sm text-sobbra">Agenda ›</Link></div>
        {!upcoming.length ? <p className="muted text-sm">Semana livre de contas e compromissos.</p> : (
          <ul>{upcoming.slice(0, 6).map((e) => (
            <li key={e.id} className="line flex items-center justify-between gap-2 border-t py-2 text-sm first:border-0"><span className="min-w-0 truncate"><span className="muted mr-2 text-xs">{e.date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}</span>{e.title}</span>{e.amountCents ? <Money cents={e.amountCents} className={e.kind === "receber" ? "text-sobbra" : ""} /> : null}</li>
          ))}</ul>
        )}
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
