// Gera avisos (RF-090/091/092) a partir dos dados da pessoa. Cada aviso tem uma chave unica: nunca repete.
import { db } from "./db";
import { brl, monthKey } from "./money";
import { dashboard, cardInvoices } from "./finance";
import { budgetStatus } from "./budgets";
import { readPrefs, inQuietHours, type AlertKind } from "./notify-prefs";
import { sendPush } from "./push";

type NewAlert = { kind: AlertKind; dedupKey: string; title: string; body: string; href?: string };
const day = 86400000;
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const inDays = (d: Date, now: Date) => Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / day);
const when = (n: number) => (n < 0 ? `venceu há ${-n} dia${n === -1 ? "" : "s"}` : n === 0 ? "vence hoje" : n === 1 ? "vence amanhã" : `vence em ${n} dias`);

export async function collectAlerts(userId: string, now = new Date()): Promise<NewAlert[]> {
  const out: NewAlert[] = [];
  const soon = new Date(+now + 7 * day);
  // Contas e boletos (RF-090)
  const [bills, pending, events] = await Promise.all([
    db.bill.findMany({ where: { userId, paidAt: null, dueDate: { lte: soon } } }),
    db.transaction.findMany({ where: { userId, deletedAt: null, status: "PENDING", type: "EXPENSE", date: { gte: new Date(+now - 10 * day), lte: new Date(+now + 3 * day) }, account: { type: { not: "CREDIT_CARD" } } } }),
    db.event.findMany({ where: { userId, type: "conta", date: { gte: new Date(+now - day), lte: new Date(+now + 3 * day) } } }),
  ]);
  for (const b of bills) { const n = inDays(b.dueDate, now); if (n <= b.remindDays) out.push({ kind: "conta", dedupKey: `bill:${b.id}:${n < 0 ? "late" : n === 0 ? "today" : "soon"}`, title: `${b.payee} ${when(n)}`, body: `${brl(b.amountCents)}. Copie a linha digitável e pague no app do banco.`, href: "/contas-a-pagar" }); }
  for (const t of pending) { const n = inDays(t.date, now); if (n <= 3) out.push({ kind: "conta", dedupKey: `tx:${t.id}:${n < 0 ? "late" : n === 0 ? "today" : "soon"}`, title: `${t.description} ${when(n)}`, body: `${brl(t.amountCents)} agendado. Marque como pago quando pagar.`, href: "/agenda" }); }
  for (const e of events) { const n = inDays(e.date, now); out.push({ kind: "conta", dedupKey: `ev:${e.id}:${n <= 0 ? "today" : "soon"}`, title: `${e.title} ${when(n)}`, body: e.amountCents ? brl(e.amountCents) : "Está na sua agenda.", href: "/agenda" }); }
  // Renovacao da assinatura do Sobbra: aviso 3 dias antes (RF-145)
  for (const s of await db.subscription.findMany({ where: { userId, status: "active", currentPeriodEnd: { gte: now, lte: new Date(+now + 3 * day) } } })) {
    out.push({ kind: "conta", dedupKey: `renew:${s.id}:${ymd(s.currentPeriodEnd!)}`, title: `Sua assinatura renova ${when(inDays(s.currentPeriodEnd!, now)).replace("vence", "").trim()}`, body: `${brl(s.priceCents)} no plano ${s.plan === "PRO" ? "Pro" : "Família"}. Se não quiser continuar, cancele em Ajustes, em 2 toques.`, href: "/ajustes#plano" });
  }
  // Fatura fechando e vencendo
  for (const c of await db.account.findMany({ where: { userId, archived: false, type: "CREDIT_CARD" } })) {
    const inv = await cardInvoices(userId, c.id);
    const open = inv.invoices.find((i) => i.month === inv.currentOpen);
    if (open && c.closingDay) { const close = new Date(now.getFullYear(), now.getMonth(), c.closingDay, 12); if (close < now) close.setMonth(close.getMonth() + 1);
      const n = inDays(close, now); if (n <= 2 && open.total > 0) out.push({ kind: "fatura", dedupKey: `close:${c.id}:${open.month}`, title: `Fatura ${c.name} fecha ${n === 0 ? "hoje" : n === 1 ? "amanhã" : `em ${n} dias`}`, body: `Até agora: ${brl(open.total)}. Compras depois do fechamento ficam para o mês seguinte.`, href: `/contas/${c.id}` }); }
    for (const i of inv.invoices.filter((x) => x.status === "fechada" || x.status === "aberta")) { const n = inDays(i.due, now); if (n >= 0 && n <= 3 && i.total > i.paid) out.push({ kind: "fatura", dedupKey: `due:${c.id}:${i.month}`, title: `Fatura ${c.name} ${when(n)}`, body: `${brl(i.total - i.paid)} a pagar.`, href: `/contas/${c.id}` }); }
  }
  // Saldo previsto negativo
  const d = await dashboard(userId, monthKey(now));
  if (d.saldoPrevisto < 0) out.push({ kind: "saldo", dedupKey: `saldo:${monthKey(now)}`, title: "Seu saldo previsto ficou negativo", body: `Com as contas agendadas, o mês fecha em ${brl(d.saldoPrevisto)}. Vale segurar o que dá para adiar.`, href: "/inicio" });
  // Orcamento 80% e 100% (RF-091)
  for (const r of (await budgetStatus(userId, now)).rows) {
    if (r.pct >= 1) out.push({ kind: "orcamento", dedupKey: `budget:${r.categoryId}:${monthKey(now)}:100`, title: `${r.icon} ${r.name} passou do limite`, body: `${brl(r.spent)} de ${brl(r.limit)} neste mês.`, href: "/orcamentos" });
    else if (r.pct >= 0.8) out.push({ kind: "orcamento", dedupKey: `budget:${r.categoryId}:${monthKey(now)}:80`, title: `${r.icon} ${r.name} chegou a ${Math.round(r.pct * 100)}% do limite`, body: `Restam ${brl(r.limit - r.spent)} para o mês.`, href: "/orcamentos" });
  }
  // Gasto fora do padrao: bem acima do habitual daquela categoria nos ultimos 3 meses
  const recent = await db.transaction.findMany({ where: { userId, deletedAt: null, type: "EXPENSE", createdAt: { gte: new Date(+now - 2 * day) }, recurrence: null, installments: null, categoryId: { not: null } } });
  for (const t of recent) {
    const agg = await db.transaction.aggregate({ where: { userId, deletedAt: null, type: "EXPENSE", categoryId: t.categoryId, id: { not: t.id }, date: { gte: new Date(+now - 90 * day) } }, _avg: { amountCents: true }, _count: true });
    const avg = agg._avg.amountCents ?? 0;
    if (agg._count >= 3 && t.amountCents >= Math.max(3 * avg, 20000)) out.push({ kind: "padrao", dedupKey: `odd:${t.id}`, title: "Gasto acima do seu normal", body: `${t.description}: ${brl(t.amountCents)}. Nessa categoria você costuma gastar ${brl(Math.round(avg))} por vez. Foi isso mesmo?`, href: `/lancamentos/${t.id}` });
  }
  // Resumo da semana (segunda-feira)
  if (now.getDay() === 1) {
    const from = new Date(now); from.setDate(from.getDate() - 7); from.setHours(0, 0, 0, 0); const to = new Date(now); to.setHours(0, 0, 0, 0);
    const week = await db.transaction.findMany({ where: { userId, deletedAt: null, type: { in: ["INCOME", "EXPENSE"] }, status: "PAID", date: { gte: from, lt: to } }, include: { category: { include: { parent: true } } } });
    const exp = week.filter((t) => t.type === "EXPENSE"); const total = exp.reduce((s, t) => s + t.amountCents, 0);
    const byCat = new Map<string, number>(); for (const t of exp) { const n = t.category?.parent?.name ?? t.category?.name ?? "Outros"; byCat.set(n, (byCat.get(n) ?? 0) + t.amountCents); }
    const topCat = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
    if (week.length) out.push({ kind: "resumo", dedupKey: `week:${ymd(to)}`, title: "Resumo da sua semana", body: `Você gastou ${brl(total)} em ${exp.length} lançamentos${topCat ? `. Onde mais foi: ${topCat[0]} (${brl(topCat[1])})` : ""}.`, href: "/relatorios/despesas" });
  }
  return out;
}

const lastRun = new Map<string, number>();

/** Grava os avisos novos (sem repetir) e manda push fora do horario de silencio. */
export async function runAlerts(userId: string, { force = false } = {}) {
  if (!force && Date.now() - (lastRun.get(userId) ?? 0) < 10 * 60 * 1000) return 0;
  lastRun.set(userId, Date.now());
  const user = await db.user.findUnique({ where: { id: userId }, select: { notifyPrefs: true } });
  const prefs = readPrefs(user?.notifyPrefs);
  const alerts = (await collectAlerts(userId)).filter((a) => prefs.kinds[a.kind]);
  if (!alerts.length) return 0;
  const existing = new Set((await db.notification.findMany({ where: { userId, dedupKey: { in: alerts.map((a) => a.dedupKey) } }, select: { dedupKey: true } })).map((n) => n.dedupKey));
  const fresh = alerts.filter((a) => !existing.has(a.dedupKey));
  if (!fresh.length) return 0;
  await db.notification.createMany({ data: fresh.map((a) => ({ userId, ...a })), skipDuplicates: true });
  if (prefs.push && !inQuietHours(prefs)) for (const a of fresh.slice(0, 3)) await sendPush(userId, { title: a.title, body: a.body, url: a.href ?? "/avisos" });
  return fresh.length;
}
