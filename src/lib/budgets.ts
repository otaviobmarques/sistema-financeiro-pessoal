// Orcamentos por categoria (RF-080/081) e metas (RF-082).
import { db } from "./db";

export const budgetColor = (p: number) => (p >= 1 ? "#E5484D" : p >= 0.8 ? "#F0803C" : p >= 0.6 ? "#FFB020" : "#19C37D");

export async function budgetStatus(userId: string, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1), end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const dim = end.getDate(), day = now.getDate();
  const [budgets, parents, txs, hist] = await Promise.all([
    db.budget.findMany({ where: { userId } }),
    db.category.findMany({ where: { userId, parentId: null, kind: "EXPENSE" }, orderBy: { name: "asc" } }),
    db.transaction.findMany({ where: { userId, deletedAt: null, type: "EXPENSE", date: { gte: start, lte: end } }, include: { category: true } }),
    db.transaction.findMany({ where: { userId, deletedAt: null, type: "EXPENSE", date: { gte: new Date(now.getFullYear(), now.getMonth() - 3, 1), lt: start } }, include: { category: true } }),
  ]);
  const parentOf = (t: { category: { id: string; parentId: string | null } | null }) => t.category?.parentId ?? t.category?.id ?? null;
  const spent = new Map<string, number>(), spentToday = new Map<string, number>(), avg = new Map<string, number>();
  for (const t of txs) { const k = parentOf(t); if (!k) continue; spent.set(k, (spent.get(k) ?? 0) + t.amountCents); if (t.date <= now) spentToday.set(k, (spentToday.get(k) ?? 0) + t.amountCents); }
  for (const t of hist) { const k = parentOf(t); if (k) avg.set(k, (avg.get(k) ?? 0) + t.amountCents); }
  const rows = budgets.map((b) => {
    const c = parents.find((p) => p.id === b.categoryId);
    const s = spent.get(b.categoryId) ?? 0, sToday = spentToday.get(b.categoryId) ?? 0;
    const scheduled = s - sToday; // contas ja agendadas no mes
    const proj = Math.round((sToday / Math.max(1, day)) * dim) + scheduled;
    const pct = b.limitCents ? s / b.limitCents : 0;
    return { id: b.id, categoryId: b.categoryId, name: c?.name ?? "Categoria", icon: c?.icon ?? "🏷️", color: c?.color ?? "#94A3B8", limit: b.limitCents, spent: s, pct, proj,
      status: pct >= 1 ? "estourou" : day >= 7 && proj > b.limitCents ? "vai estourar" : "no ritmo", avg3: Math.round((avg.get(b.categoryId) ?? 0) / 3) };
  }).sort((a, b) => b.pct - a.pct);
  const suggestions = parents.filter((p) => !budgets.some((b) => b.categoryId === p.id) && (avg.get(p.id) ?? 0) > 0)
    .map((p) => ({ categoryId: p.id, name: p.name, icon: p.icon, suggested: Math.max(5000, Math.round(((avg.get(p.id) ?? 0) / 3) / 5000) * 5000) }))
    .sort((a, b) => b.suggested - a.suggested);
  return { rows, suggestions, parents: parents.map((p) => ({ id: p.id, name: p.name, icon: p.icon, budgeted: budgets.some((b) => b.categoryId === p.id) })), day, dim,
    totalLimit: rows.reduce((s, r) => s + r.limit, 0), totalSpent: rows.reduce((s, r) => s + r.spent, 0) };
}

/** Quanto guardar por mes para chegar na meta a tempo. */
export function goalPlan(g: { targetCents: number; savedCents: number; deadline: Date | null }, now = new Date()) {
  const left = Math.max(0, g.targetCents - g.savedCents);
  if (!g.deadline) return { left, months: null as number | null, monthly: null as number | null, pct: g.targetCents ? Math.min(1, g.savedCents / g.targetCents) : 0 };
  const months = Math.max(1, (g.deadline.getFullYear() - now.getFullYear()) * 12 + g.deadline.getMonth() - now.getMonth());
  return { left, months, monthly: Math.ceil(left / months), pct: g.targetCents ? Math.min(1, g.savedCents / g.targetCents) : 0 };
}
