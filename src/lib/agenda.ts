import { db } from "./db";
import { cardInvoices } from "./finance";

export type AgendaItem = { id: string; title: string; kind: "compromisso" | "lembrete" | "conta" | "receber"; source: "evento" | "fatura" | "lancamento" | "divida" | "boleto";
  date: Date; time: string | null; amountCents: number | null; href?: string; txId?: string; eventId?: string };

/** Junta compromissos da pessoa com o que o dinheiro ja sabe: faturas a vencer e lancamentos pendentes. */
export async function agendaItems(userId: string, from: Date, to: Date): Promise<AgendaItem[]> {
  const [events, pending, cards] = await Promise.all([
    db.event.findMany({ where: { userId, date: { gte: from, lte: to } } }),
    db.transaction.findMany({ where: { userId, deletedAt: null, status: "PENDING", type: { in: ["INCOME", "EXPENSE"] }, date: { gte: from, lte: to }, account: { type: { not: "CREDIT_CARD" } } } }),
    db.account.findMany({ where: { userId, archived: false, type: "CREDIT_CARD" } }),
  ]);
  const out: AgendaItem[] = events.map((e) => ({ id: "e" + e.id, eventId: e.id, title: e.title, kind: e.type as AgendaItem["kind"], source: "evento", date: e.date, time: e.time, amountCents: e.amountCents }));
  for (const t of pending) out.push({ id: "t" + t.id, txId: t.id, title: t.description, kind: t.type === "INCOME" ? "receber" : "conta", source: "lancamento", date: t.date, time: null, amountCents: t.amountCents, href: `/lancamentos/${t.id}` });
  for (const c of cards) {
    const inv = await cardInvoices(userId, c.id);
    for (const i of inv.invoices) if (i.due >= from && i.due <= to && i.total > i.paid)
      out.push({ id: `f${c.id}${i.month}`, title: `Fatura ${c.name}`, kind: "conta", source: "fatura", date: i.due, time: null, amountCents: i.total - i.paid, href: `/contas/${c.id}` });
  }
  const bills = await db.bill.findMany({ where: { userId, paidAt: null, dueDate: { gte: from, lte: to } } });
  for (const b of bills) out.push({ id: "b" + b.id, title: b.payee, kind: "conta", source: "boleto", date: b.dueDate, time: null, amountCents: b.amountCents, href: "/contas-a-pagar" });
  const debts = await db.debt.findMany({ where: { userId, balanceCents: { gt: 0 } } });
  for (const d of debts) for (let m = new Date(from.getFullYear(), from.getMonth(), 1); m <= to; m.setMonth(m.getMonth() + 1)) {
    const due = new Date(m.getFullYear(), m.getMonth(), Math.min(d.dueDay, new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()), 12);
    if (due >= from && due <= to) out.push({ id: `d${d.id}${due.getMonth()}`, title: `Parcela ${d.creditor}`, kind: "conta", source: "divida", date: due, time: null, amountCents: Math.min(d.paymentCents, d.balanceCents), href: "/dividas" });
  }
    return out.sort((a, b) => +a.date - +b.date || (a.time ?? "99").localeCompare(b.time ?? "99"));
}
