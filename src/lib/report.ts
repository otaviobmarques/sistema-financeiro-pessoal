// Relatorio de despesas por periodo (pagas ate hoje), agrupado por categoria, estabelecimento, conta ou mes.
import { db } from "./db";
import { monthKey, monthLabel } from "./money";

export type ReportGroup = "categoria" | "estabelecimento" | "conta" | "mes";
export const PRESETS = { mes: "Este mês", passado: "Mês passado", "3m": "Últimos 3 meses", "12m": "Últimos 12 meses", ano: "Este ano", livre: "Período escolhido" } as const;
export type Preset = keyof typeof PRESETS;

export function reportRange(preset: Preset, from?: string, to?: string, now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth();
  const r: Record<Exclude<Preset, "livre">, [Date, Date]> = {
    mes: [new Date(y, m, 1), new Date(y, m + 1, 0)], passado: [new Date(y, m - 1, 1), new Date(y, m, 0)],
    "3m": [new Date(y, m - 2, 1), new Date(y, m + 1, 0)], "12m": [new Date(y, m - 11, 1), new Date(y, m + 1, 0)], ano: [new Date(y, 0, 1), new Date(y, 11, 31)],
  };
  let [a, b] = preset === "livre" && from && to ? [new Date(from + "T00:00:00"), new Date(to + "T00:00:00")] : r[preset === "livre" ? "mes" : preset];
  if (a > b) [a, b] = [b, a];
  b = new Date(b.getFullYear(), b.getMonth(), b.getDate(), 23, 59, 59, 999);
  return { from: a, to: b };
}

export async function buildReport(userId: string, preset: Preset, group: ReportGroup, fromStr?: string, toStr?: string) {
  const { from, to } = reportRange(preset, fromStr, toStr);
  const endToday = new Date(); endToday.setHours(23, 59, 59, 999);
  const until = to < endToday ? to : endToday;
  const txs = await db.transaction.findMany({
    where: { userId, deletedAt: null, type: "EXPENSE", status: "PAID", date: { gte: from, lte: until } },
    include: { category: { include: { parent: true } }, account: true }, orderBy: { date: "desc" },
  });
  const total = txs.reduce((s, t) => s + t.amountCents, 0);
  const days = Math.max(1, Math.round((+until - +from) / 86400000));
  const PAL = ["#0B4F3A", "#19C37D", "#3B82F6", "#8B5CF6", "#F97316", "#EC4899", "#FFB020", "#64748B"];
  const map = new Map<string, { key: string; name: string; color: string; total: number; count: number; subs: Map<string, number> }>();
  for (const t of txs) {
    const parent = t.category?.parent ?? t.category;
    const key = group === "categoria" ? parent?.id ?? "sem" : group === "conta" ? t.accountId : group === "mes" ? monthKey(t.date) : t.merchant || t.description.replace(/\s*\(\d+\/\d+\)$/, "");
    const name = group === "categoria" ? `${parent?.icon ?? ""} ${parent?.name ?? "Sem categoria"}`.trim() : group === "conta" ? t.account.name : group === "mes" ? monthLabel(key) : key;
    const color = group === "categoria" ? parent?.color ?? "#94A3B8" : group === "conta" ? t.account.color : "";
    const g = map.get(key) ?? { key, name, color, total: 0, count: 0, subs: new Map() };
    g.total += t.amountCents; g.count++;
    if (group === "categoria" && t.category) g.subs.set(t.category.name, (g.subs.get(t.category.name) ?? 0) + t.amountCents);
    map.set(key, g);
  }
  const rows = [...map.values()].sort((a, b) => (group === "mes" ? a.key.localeCompare(b.key) : b.total - a.total))
    .map((g, i) => ({ key: g.key, name: g.name, color: g.color || PAL[i % PAL.length], total: g.total, count: g.count, pct: total ? g.total / total : 0,
      subs: [...g.subs.entries()].sort((a, b) => b[1] - a[1]).map(([name, v]) => ({ name, total: v })) }));
  const fixed = txs.filter((t) => t.recurrence || t.installments).reduce((s, t) => s + t.amountCents, 0);
  return {
    preset, group, title: PRESETS[preset], from: from.toISOString(), to: until.toISOString(), total, perDay: Math.round(total / days), fixed, rows,
    biggest: [...txs].sort((a, b) => b.amountCents - a.amountCents).slice(0, 5).map((t) => ({ id: t.id, description: t.description, amountCents: t.amountCents, date: t.date.toISOString(), category: t.category ? `${t.category.parent ? t.category.parent.name + " › " : ""}${t.category.name}` : "Sem categoria" })),
    items: txs.map((t) => ({ date: t.date.toISOString(), description: t.description, category: t.category ? `${t.category.parent ? t.category.parent.name + " › " : ""}${t.category.name}` : "Sem categoria", account: t.account.name, amountCents: t.amountCents })),
  };
}
export type Report = Awaited<ReturnType<typeof buildReport>>;
