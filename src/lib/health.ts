// Indice de saude financeira (0 a 100) do painel inicial. Regras simples e explicadas a pessoa.
export type HealthInput = { income: number; expense: number; budgetsOk: number; budgetsTotal: number; debtInterestMonthly: number; reserveCents: number; avgExpense: number };
export type HealthFactor = { name: string; points: number; max: number; desc: string };

export function healthScore(h: HealthInput) {
  const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const rate = h.income > 0 ? (h.income - h.expense) / h.income : 0;
  const save = Math.round(Math.max(0, Math.min(1, rate / 0.2)) * 40);
  const bud = h.budgetsTotal ? Math.round((h.budgetsOk / h.budgetsTotal) * 20) : 10;
  const debt = h.debtInterestMonthly <= 0 ? 20 : Math.max(0, Math.round(20 - (h.debtInterestMonthly / Math.max(1, h.income)) * 200));
  const months = h.avgExpense > 0 ? h.reserveCents / h.avgExpense : 0;
  const reserve = Math.round(Math.min(1, months / 6) * 20);
  const factors: HealthFactor[] = [
    { name: "Taxa de poupança", points: save, max: 40, desc: h.income > 0 ? `${Math.round(rate * 100)}% do que entra sobra` : "Registre suas entradas para calcular" },
    { name: "Orçamentos", points: bud, max: 20, desc: h.budgetsTotal ? `${h.budgetsOk} de ${h.budgetsTotal} dentro do limite` : "Crie orçamentos para medir" },
    { name: "Juros de dívidas", points: debt, max: 20, desc: h.debtInterestMonthly > 0 ? `${brl(h.debtInterestMonthly)} por mês em juros` : "Sem juros de dívidas" },
    { name: "Reserva", points: reserve, max: 20, desc: h.avgExpense > 0 ? `${months.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} meses de gastos guardados` : "Guarde em metas para formar a reserva" },
  ];
  const score = factors.reduce((s, f) => s + f.points, 0);
  const label: [string, string] = score >= 80 ? ["Ótima", "#12B76A"] : score >= 60 ? ["Boa", "#2E9BFF"] : score >= 40 ? ["Atenção", "#FFB31F"] : ["Cuidado", "#F2545B"];
  return { score, factors, label };
}
