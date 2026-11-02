import { monthKey } from "./money";

/** Mes da fatura de uma compra no cartao (RF-011): apos o fechamento cai na fatura seguinte. */
export function invoiceMonthFor(date: Date, closingDay: number): string {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  if (date.getDate() > closingDay) d.setMonth(d.getMonth() + 1);
  return monthKey(d);
}

/** Vencimento de uma fatura "YYYY-MM" (mes de fechamento). */
export function invoiceDueDate(invoiceMonth: string, closingDay: number, dueDay: number): Date {
  const [y, m] = invoiceMonth.split("-").map(Number);
  const due = new Date(y, m - 1, dueDay, 12);
  if (dueDay <= closingDay) due.setMonth(due.getMonth() + 1);
  return due;
}
