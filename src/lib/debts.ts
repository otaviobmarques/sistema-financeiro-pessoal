// Plano de quitacao (RF-182/183): avalanche (maior juro primeiro) ou bola de neve (menor saldo primeiro).
// Pura: roda no servidor e no navegador (simulacao ao vivo).
export type DebtIn = { id: string; creditor: string; balanceCents: number; monthlyRate: number; paymentCents: number };
export type Strategy = "avalanche" | "bola_de_neve";
export type PlanResult = {
  months: number | null;           // null = nao quita (pagamento nao cobre os juros)
  totalInterest: number;
  payoff: { id: string; creditor: string; month: number | null }[];
  timeline: number[];              // saldo total ao fim de cada mes
  stuck: string[];                 // dividas cujo pagamento nao cobre os juros
};

export function simulate(debts: DebtIn[], extraCents: number, strategy: Strategy, maxMonths = 360): PlanResult {
  const ds = debts.filter((d) => d.balanceCents > 0).map((d) => ({ ...d, bal: d.balanceCents, paidAt: null as number | null }));
  const budget = ds.reduce((s, d) => s + d.paymentCents, 0) + Math.max(0, extraCents);
  const order = () => ds.filter((d) => d.bal > 0).sort((a, b) => strategy === "avalanche" ? b.monthlyRate - a.monthlyRate || a.bal - b.bal : a.bal - b.bal || b.monthlyRate - a.monthlyRate);
  let totalInterest = 0; const timeline: number[] = [];
  const stuck = ds.filter((d) => d.paymentCents + (extraCents > 0 ? extraCents : 0) <= Math.round(d.bal * d.monthlyRate / 100)).map((d) => d.creditor);
  for (let m = 1; m <= maxMonths && ds.some((d) => d.bal > 0); m++) {
    for (const d of ds) if (d.bal > 0) { const i = Math.round(d.bal * d.monthlyRate / 100); d.bal += i; totalInterest += i; }
    let money = budget;
    // pagamentos minimos
    for (const d of ds) if (d.bal > 0) { const p = Math.min(d.paymentCents, d.bal, money); d.bal -= p; money -= p; }
    // o que sobrar (extra + parcelas de dividas ja quitadas) vai para a prioridade
    for (const d of order()) { if (money <= 0) break; const p = Math.min(d.bal, money); d.bal -= p; money -= p; }
    for (const d of ds) if (d.bal <= 0 && d.paidAt === null) d.paidAt = m;
    timeline.push(ds.reduce((s, d) => s + Math.max(0, d.bal), 0));
    if (m > 24 && timeline[m - 1] >= timeline[m - 13]) break; // nao esta diminuindo: nao quita
  }
  const done = ds.every((d) => d.bal <= 0);
  return { months: done ? Math.max(0, ...ds.map((d) => d.paidAt ?? 0)) : null, totalInterest, payoff: ds.map((d) => ({ id: d.id, creditor: d.creditor, month: d.paidAt })), timeline, stuck };
}

export const DEBT_TYPES = {
  CARTAO_ROTATIVO: "Rotativo do cartão", CHEQUE_ESPECIAL: "Cheque especial", EMPRESTIMO_PESSOAL: "Empréstimo pessoal",
  CONSIGNADO: "Consignado", FINANCIAMENTO: "Financiamento", ACORDO: "Acordo de renegociação", OUTRA: "Outra dívida",
} as const;
