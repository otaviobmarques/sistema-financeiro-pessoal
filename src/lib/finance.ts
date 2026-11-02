// Regras financeiras: faturas, parcelas, recorrencias, saldos e agregacoes do painel.
import { Prisma, TxOrigin, TxStatus, TxType } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { monthKey } from "./money";
import { learn } from "./classify";

const NOT_DELETED = { deletedAt: null } as const;

import { invoiceMonthFor, invoiceDueDate } from "./finance-dates";
export { invoiceMonthFor, invoiceDueDate };

const addMonths = (d: Date, n: number) => { const x = new Date(d); const day = x.getDate(); x.setDate(1); x.setMonth(x.getMonth() + n); x.setDate(Math.min(day, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate())); return x; };

export type NewTx = {
  type: TxType; amountCents: number; description: string; accountId: string; toAccountId?: string | null;
  categoryId?: string | null; date: Date; status?: TxStatus; installments?: number | null; recurrence?: "monthly" | null;
  merchant?: string | null; cnpj?: string | null; tags?: string[]; notes?: string | null; origin?: TxOrigin; confidence?: number | null; receiptId?: string | null;
};

/** Cria um lancamento, gerando parcelas futuras (RF-022) ou recorrencias (RF-023). Retorna os ids criados. */
export async function createTransaction(userId: string, t: NewTx): Promise<string[]> {
  const account = await db.account.findFirstOrThrow({ where: { id: t.accountId, userId } });
  if (t.toAccountId) await db.account.findFirstOrThrow({ where: { id: t.toAccountId, userId } });
  const isCard = account.type === "CREDIT_CARD";
  const n = t.installments && t.installments > 1 ? Math.min(t.installments, 48) : 1;
  const groupId = n > 1 || t.recurrence ? randomUUID() : null;
  const today = new Date(); today.setHours(23, 59, 59);
  const rows: Prisma.TransactionCreateManyInput[] = [];

  const base = {
    userId, type: t.type, description: t.description.trim() || "Sem descrição", accountId: t.accountId, toAccountId: t.toAccountId ?? null,
    categoryId: t.type === "TRANSFER" ? null : t.categoryId ?? null, merchant: t.merchant ?? null, cnpj: t.cnpj ?? null,
    tags: t.tags ?? [], notes: t.notes ?? null, origin: t.origin ?? "MANUAL", confidence: t.confidence ?? null, groupId,
  };

  if (n > 1) {
    const each = Math.floor(t.amountCents / n), rest = t.amountCents - each * n;
    for (let i = 0; i < n; i++) {
      const date = addMonths(t.date, i);
      rows.push({ ...base, amountCents: each + (i === 0 ? rest : 0), date, installment: i + 1, installments: n,
        description: `${base.description} (${i + 1}/${n})`,
        status: isCard ? "PAID" : date <= today ? t.status ?? "PAID" : "PENDING",
        invoiceMonth: isCard ? invoiceMonthFor(isCard ? addMonths(t.date, i) : date, account.closingDay ?? 1) : null,
        receiptId: i === 0 ? t.receiptId ?? null : null });
    }
  } else if (t.recurrence === "monthly") {
    for (let i = 0; i < 12; i++) {
      const date = addMonths(t.date, i);
      rows.push({ ...base, amountCents: t.amountCents, date, recurrence: "monthly", origin: i === 0 ? base.origin : "RECURRENCE",
        status: date <= today ? t.status ?? "PAID" : "PENDING",
        invoiceMonth: isCard ? invoiceMonthFor(date, account.closingDay ?? 1) : null, receiptId: i === 0 ? t.receiptId ?? null : null });
    }
  } else {
    rows.push({ ...base, amountCents: t.amountCents, date: t.date, status: t.status ?? (t.date <= today ? "PAID" : "PENDING"),
      paidAt: (t.status ?? "PAID") === "PAID" ? t.date : null,
      invoiceMonth: isCard ? invoiceMonthFor(t.date, account.closingDay ?? 1) : null, receiptId: t.receiptId ?? null });
  }
  const created = await db.$transaction(rows.map((data) => db.transaction.create({ data, select: { id: true } })));
  if (t.categoryId && (t.merchant || t.cnpj)) await learn(userId, t.cnpj || t.merchant!, t.categoryId);
  return created.map((c) => c.id);
}

/** Lancamentos "valem" para saldo atual quando pagos e com data ate hoje. */
const endOfToday = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; };

export async function accountBalances(userId: string, asOf = endOfToday()) {
  const accounts = await db.account.findMany({ where: { userId, archived: false }, orderBy: { createdAt: "asc" } });
  const sums = await db.transaction.groupBy({
    by: ["accountId", "type"], where: { userId, ...NOT_DELETED, status: "PAID", date: { lte: asOf } }, _sum: { amountCents: true },
  });
  const ins = await db.transaction.groupBy({
    by: ["toAccountId"], where: { userId, ...NOT_DELETED, type: "TRANSFER", status: "PAID", date: { lte: asOf } }, _sum: { amountCents: true },
  });
  return accounts.map((a) => {
    const get = (type: TxType) => sums.find((s) => s.accountId === a.id && s.type === type)?._sum.amountCents ?? 0;
    const tin = ins.find((s) => s.toAccountId === a.id)?._sum.amountCents ?? 0;
    const balance = a.initialCents + get("INCOME") - get("EXPENSE") - get("TRANSFER") + tin;
    return { ...a, balance };
  });
}

/** Faturas de um cartao (RF-012): aberta, fechada, paga. */
export async function cardInvoices(userId: string, cardId: string) {
  const card = await db.account.findFirstOrThrow({ where: { id: cardId, userId, type: "CREDIT_CARD" } });
  const txs = await db.transaction.findMany({ where: { userId, accountId: cardId, ...NOT_DELETED, invoiceMonth: { not: null } }, include: { category: true }, orderBy: { date: "desc" } });
  const payments = await db.transaction.aggregate({ where: { userId, toAccountId: cardId, type: "TRANSFER", ...NOT_DELETED, status: "PAID" }, _sum: { amountCents: true } });
  let paidPool = (payments._sum.amountCents ?? 0) + card.initialCents;
  const byMonth = new Map<string, typeof txs>();
  for (const t of txs) { const k = t.invoiceMonth!; byMonth.set(k, [...(byMonth.get(k) ?? []), t]); }
  const now = new Date();
  const currentOpen = invoiceMonthFor(now, card.closingDay ?? 1);
  const months = [...byMonth.keys()].sort();
  const invoices = months.map((m) => {
    const items = byMonth.get(m)!;
    const total = items.reduce((s, t) => s + (t.type === "EXPENSE" ? t.amountCents : t.type === "INCOME" ? -t.amountCents : 0), 0);
    const paid = Math.min(Math.max(paidPool, 0), total); paidPool -= total;
    const status = paid >= total && total > 0 ? "paga" : m < currentOpen ? "fechada" : m === currentOpen ? "aberta" : "futura";
    return { month: m, total, paid, status, due: invoiceDueDate(m, card.closingDay ?? 1, card.dueDay ?? 10), items };
  });
  // Ordem: aberta/fechadas mais recentes primeiro; futuras (parcelas) por ultimo
  invoices.sort((a, b) => (a.status === "futura") !== (b.status === "futura") ? (a.status === "futura" ? 1 : -1) : a.status === "futura" ? a.month.localeCompare(b.month) : b.month.localeCompare(a.month));
  const used = invoices.reduce((s, i) => s + (i.total - i.paid), 0);
  return { card, invoices, used, available: (card.limitCents ?? 0) - used, currentOpen };
}

const monthRange = (key: string) => { const [y, m] = key.split("-").map(Number); return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59, 999) }; };

/** Dados do painel do mes (RF-050 a RF-053). */
export async function dashboard(userId: string, month = monthKey(new Date())) {
  const { start, end } = monthRange(month);
  const now = endOfToday();
  const isCurrent = month === monthKey(now);
  const sixAgo = new Date(start); sixAgo.setMonth(sixAgo.getMonth() - 5);

  const txs = await db.transaction.findMany({
    where: { userId, ...NOT_DELETED, type: { in: ["INCOME", "EXPENSE"] }, date: { gte: sixAgo, lte: end } },
    include: { category: { include: { parent: true } } },
  });
  const inMonth = txs.filter((t) => t.date >= start && t.date <= end);
  const income = inMonth.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amountCents, 0);
  const expense = inMonth.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amountCents, 0);
  const incomeRealized = inMonth.filter((t) => t.type === "INCOME" && t.status === "PAID" && t.date <= now).reduce((s, t) => s + t.amountCents, 0);
  const expenseRealized = inMonth.filter((t) => t.type === "EXPENSE" && (t.status === "PAID" && t.date <= now)).reduce((s, t) => s + t.amountCents, 0);

  // Saldo atual x previsto (RF-015)
  const balances = await accountBalances(userId);
  const cash = balances.filter((a) => a.type !== "CREDIT_CARD" && a.type !== "INVESTMENT");
  const saldoAtual = cash.reduce((s, a) => s + a.balance, 0);
  const pendingCash = await db.transaction.findMany({
    where: { userId, ...NOT_DELETED, date: { lte: end }, OR: [{ status: "PENDING" }, { date: { gt: now } }], account: { type: { not: "CREDIT_CARD" } }, type: { in: ["INCOME", "EXPENSE"] } },
  });
  const pendIn = pendingCash.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amountCents, 0);
  const pendOut = pendingCash.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amountCents, 0);
  // Faturas de cartao que vencem ate o fim do mes e ainda nao foram pagas
  let cardsDue = 0;
  for (const c of balances.filter((a) => a.type === "CREDIT_CARD")) {
    const inv = await cardInvoices(userId, c.id);
    cardsDue += inv.invoices.filter((i) => i.due <= end && i.due >= (isCurrent ? new Date(now.getFullYear(), now.getMonth(), 1) : start)).reduce((s, i) => s + (i.total - i.paid), 0);
  }
  const saldoPrevisto = saldoAtual + pendIn - pendOut - cardsDue;

  // Ritmo de gasto (RF-053): media diaria de gastos variaveis ja feitos
  const daysInMonth = end.getDate();
  const dayToday = isCurrent ? now.getDate() : daysInMonth;
  const variable = inMonth.filter((t) => t.type === "EXPENSE" && !t.recurrence && !t.installments && t.date <= now).reduce((s, t) => s + t.amountCents, 0);
  const daysLeft = Math.max(0, daysInMonth - dayToday);
  const pace = dayToday > 0 ? variable / dayToday : 0;
  const projecao = saldoPrevisto - Math.round(pace * daysLeft);
  const nextIncome = pendingCash.filter((t) => t.type === "INCOME" && t.date > now).sort((a, b) => +a.date - +b.date)[0];
  const daysUntilIncome = nextIncome ? Math.max(1, Math.ceil((+nextIncome.date - +now) / 86400000)) : Math.max(1, daysLeft + 1);
  const porDia = Math.max(0, Math.floor(saldoPrevisto / daysUntilIncome));

  // Ranking por categoria-mae com comparativos (RF-051)
  const parentOf = (t: (typeof txs)[number]) => t.category?.parent ?? t.category;
  const sumBy = (list: typeof txs, keyFn: (t: (typeof txs)[number]) => string | undefined) => {
    const m = new Map<string, number>();
    for (const t of list) { const k = keyFn(t); if (k) m.set(k, (m.get(k) ?? 0) + t.amountCents); }
    return m;
  };
  const exp = txs.filter((t) => t.type === "EXPENSE");
  const prevKey = (() => { const d = new Date(start); d.setMonth(d.getMonth() - 1); return monthKey(d); })();
  const last3 = [1, 2, 3].map((i) => { const d = new Date(start); d.setMonth(d.getMonth() - i); return monthKey(d); });
  const cur = sumBy(exp.filter((t) => monthKey(t.date) === month), (t) => parentOf(t)?.id ?? "sem");
  const prev = sumBy(exp.filter((t) => monthKey(t.date) === prevKey), (t) => parentOf(t)?.id ?? "sem");
  const avg3 = sumBy(exp.filter((t) => last3.includes(monthKey(t.date))), (t) => parentOf(t)?.id ?? "sem");
  const catInfo = new Map(exp.map((t) => [parentOf(t)?.id ?? "sem", parentOf(t)]));
  const categories = [...cur.entries()].map(([id, total]) => {
    const c = catInfo.get(id);
    return { id, name: c?.name ?? "Sem categoria", icon: c?.icon ?? "❔", color: c?.color ?? "#94A3B8", total,
      pct: expense ? total / expense : 0, prev: prev.get(id) ?? 0, avg3: Math.round((avg3.get(id) ?? 0) / 3) };
  }).sort((a, b) => b.total - a.total);

  const merchants = [...sumBy(exp.filter((t) => monthKey(t.date) === month), (t) => t.merchant || t.description.replace(/\s*\(\d+\/\d+\)$/, "")).entries()]
    .map(([name, total]) => ({ name, total, pct: expense ? total / expense : 0 })).sort((a, b) => b.total - a.total).slice(0, 8);

  // Barras mes a mes (6 meses)
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(start); d.setMonth(d.getMonth() - (5 - i)); return monthKey(d); });
  const monthly = months.map((m) => ({
    month: m,
    income: txs.filter((t) => t.type === "INCOME" && monthKey(t.date) === m).reduce((s, t) => s + t.amountCents, 0),
    expense: txs.filter((t) => t.type === "EXPENSE" && monthKey(t.date) === m).reduce((s, t) => s + t.amountCents, 0),
  }));

  // Linha do saldo dentro do mes: saldo do inicio do mes + movimentos diarios (contas de caixa)
  const startBalance = (await accountBalances(userId, new Date(start.getTime() - 1))).filter((a) => a.type !== "CREDIT_CARD" && a.type !== "INVESTMENT").reduce((s, a) => s + a.balance, 0);
  const cashIds = new Set(cash.map((a) => a.id));
  const daily = new Array(daysInMonth).fill(0);
  for (const t of inMonth) if (cashIds.has(t.accountId)) daily[t.date.getDate() - 1] += t.type === "INCOME" ? t.amountCents : -t.amountCents;
  let run = startBalance;
  const balanceLine = daily.map((v, i) => { run += v; return { day: i + 1, balance: run, future: isCurrent && i + 1 > dayToday }; });

  // Mapa de calor por dia da semana (gasto do mes)
  const weekday = [0, 0, 0, 0, 0, 0, 0];
  for (const t of inMonth) if (t.type === "EXPENSE") weekday[t.date.getDay()] += t.amountCents;

  return {
    month, income, expense, incomeRealized, expenseRealized, saldoAtual, saldoPrevisto, projecao, porDia, daysUntilIncome,
    sobra: income - expense, categories, merchants, monthly, balanceLine, weekday, accounts: balances,
  };
}

export async function softDelete(userId: string, ids: string[]) {
  await db.transaction.updateMany({ where: { userId, id: { in: ids } }, data: { deletedAt: new Date() } });
}

/** Esvazia itens da lixeira com mais de 30 dias (RF-166). */
export async function purgeTrash(userId: string) {
  const limit = new Date(Date.now() - 30 * 86400000);
  await db.transaction.deleteMany({ where: { userId, deletedAt: { lt: limit } } });
}
