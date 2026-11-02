import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatLine } from "@/lib/boleto";
import { Money } from "@/components/ui";
import { BillForm, BillActions, ScheduleButton } from "./client";

export default async function ContasAPagar() {
  const user = await requireUser();
  const now = new Date(); const today = new Date(now); today.setHours(0, 0, 0, 0);
  const [bills, accounts, hist, recurring] = await Promise.all([
    db.bill.findMany({ where: { userId: user.id }, orderBy: { dueDate: "asc" } }),
    db.account.findMany({ where: { userId: user.id, archived: false, type: { not: "CREDIT_CARD" } } }),
    db.transaction.findMany({ where: { userId: user.id, deletedAt: null, type: "EXPENSE", recurrence: null, installments: null, date: { gte: new Date(now.getFullYear(), now.getMonth() - 3, 1) }, category: { OR: [{ slug: { startsWith: "moradia." } }, { slug: { startsWith: "saude.plano" } }, { slug: { startsWith: "educacao." } }] } } }),
    db.transaction.findMany({ where: { userId: user.id, deletedAt: null, recurrence: "monthly" }, select: { merchant: true, description: true }, distinct: ["merchant"] }),
  ]);
  const open = bills.filter((b) => !b.paidAt), paid = bills.filter((b) => b.paidAt).slice(-10).reverse();
  const late = open.filter((b) => b.dueDate < today), soon = open.filter((b) => b.dueDate >= today);
  // RF-196: contas que aparecem em 2+ meses e ainda nao sao fixas
  const byM = new Map<string, { months: Set<string>; total: number; n: number; days: number[] }>();
  for (const t of hist) { const k = t.merchant || t.description; const g = byM.get(k) ?? { months: new Set(), total: 0, n: 0, days: [] }; g.months.add(`${t.date.getFullYear()}-${t.date.getMonth()}`); g.total += t.amountCents; g.n++; g.days.push(t.date.getDate()); byM.set(k, g); }
  const fixedNames = new Set(recurring.map((r) => r.merchant || r.description));
  const suggestions = [...byM.entries()].filter(([k, g]) => g.months.size >= 2 && !fixedNames.has(k)).map(([k, g]) => ({ name: k, avg: Math.round(g.total / g.n), day: Math.round(g.days.reduce((s, d) => s + d, 0) / g.days.length) })).slice(0, 5);
  const Row = ({ b }: { b: (typeof bills)[number] }) => {
    const days = Math.round((+b.dueDate - +today) / 86400000);
    return (
      <li className="line flex flex-wrap items-center gap-3 border-t py-3 first:border-0">
        <div className="min-w-[180px] flex-1">
          <p className="font-semibold">{b.payee} {!b.paidAt && <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${days < 0 ? "bg-coral/15 text-coral" : days <= 3 ? "bg-ambar/20 text-amber-700 dark:text-ambar" : "soft"}`}>{days < 0 ? `venceu há ${-days} dia${days === -1 ? "" : "s"}` : days === 0 ? "vence hoje" : `vence em ${days} dia${days === 1 ? "" : "s"}`}</span>}</p>
          <p className="muted text-xs">{b.paidAt ? `paga em ${b.paidAt.toLocaleDateString("pt-BR")}` : `vencimento ${b.dueDate.toLocaleDateString("pt-BR")}`}{b.digitableLine ? ` · ${formatLine(b.digitableLine)}` : ""}</p>
        </div>
        <Money cents={b.amountCents} className="font-semibold" />
        {!b.paidAt && <BillActions id={b.id} line={b.digitableLine ? formatLine(b.digitableLine) : null} pix={b.pixCode} accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} />}
      </li>
    );
  };
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold">Contas a pagar</h1><p className="muted text-sm">Leia o boleto pela câmera ou cole a linha digitável. O Sobbra te lembra antes de vencer. Ele não faz pagamentos: você copia a linha e paga no app do banco.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card"><p className="muted text-sm">A vencer</p><p className="text-2xl font-bold"><Money cents={soon.reduce((s, b) => s + b.amountCents, 0)} /></p><p className="muted text-xs">{soon.length} contas</p></div>
        <div className="card"><p className="muted text-sm">Vencidas</p><p className={`text-2xl font-bold ${late.length ? "text-coral" : ""}`}><Money cents={late.reduce((s, b) => s + b.amountCents, 0)} /></p><p className="muted text-xs">{late.length} contas</p></div>
        <div className="card"><p className="muted text-sm">Próximos 7 dias</p><p className="text-2xl font-bold"><Money cents={soon.filter((b) => +b.dueDate - +today <= 7 * 86400000).reduce((s, b) => s + b.amountCents, 0)} /></p></div>
      </div>
      <BillForm />
      {(late.length > 0 || soon.length > 0) && <section className="card"><h2 className="font-semibold">Em aberto</h2><ul>{[...late, ...soon].map((b) => <Row key={b.id} b={b} />)}</ul></section>}
      {suggestions.length > 0 && (
        <section className="card space-y-2"><h2 className="font-semibold">Contas que se repetem</h2><p className="muted text-sm">Elas apareceram em mais de um mês. Quer que entrem sozinhas todo mês?</p>
          <ul>{suggestions.map((s) => <li key={s.name} className="line flex flex-wrap items-center gap-3 border-t py-2 first:border-0"><span className="flex-1">{s.name} <span className="muted text-xs">· perto do dia {s.day}</span></span><Money cents={s.avg} /><ScheduleButton name={s.name} amount={s.avg} day={s.day} /></li>)}</ul></section>
      )}
      {paid.length > 0 && <section className="card"><h2 className="font-semibold">Pagas recentemente</h2><ul>{paid.map((b) => <Row key={b.id} b={b} />)}</ul></section>}
    </div>
  );
}
