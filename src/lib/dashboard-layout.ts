// Blocos do painel inicial (RF-059): ordem e visibilidade por usuario.
export const WIDGETS = {
  resumo: "Resumo, compromissos e movimentos", categorias: "Para onde foi o dinheiro", mesames: "Mês a mês e saldo", orcamentos: "Orçamento do mês",
  metas: "Metas", mapa: "Mapa de gastos", ritmo: "Ritmo de gastos", estabelecimentos: "Onde você mais gastou", semana: "Gasto por dia da semana",
} as const;
export type WidgetKey = keyof typeof WIDGETS;
export const WIDE: WidgetKey[] = ["resumo", "mesames"];
export const DEFAULT_ORDER = Object.keys(WIDGETS) as WidgetKey[];
export type Layout = { order: WidgetKey[]; hidden: WidgetKey[] };

export function readLayout(raw: unknown): Layout {
  const r = (raw ?? {}) as Partial<Layout>;
  const known = (xs: unknown) => (Array.isArray(xs) ? xs.filter((x): x is WidgetKey => typeof x === "string" && x in WIDGETS) : []);
  const order = known(r.order); for (const k of DEFAULT_ORDER) if (!order.includes(k)) order.push(k); // blocos novos entram no fim
  return { order, hidden: known(r.hidden) };
}
