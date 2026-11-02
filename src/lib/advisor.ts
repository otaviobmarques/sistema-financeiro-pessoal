// Consultor "Pergunte ao Sobbra" (M11). Regra RF-116: os NUMEROS vem do banco de dados;
// a IA (quando ligada) apenas reescreve a explicacao a partir desses fatos.
import { db } from "./db";
import { dashboard } from "./finance";
import { brl, monthKey, MONTHS } from "./money";
import { keyOf } from "./normalize";
import { aiEnabled, aiText } from "./ai";
import { parseCut, parsePurchase, parseHorizon } from "./advisor-sim";
import { simulate } from "./debts";

export type AdvisorAnswer = { text: string; facts: { label: string; value: string }[]; bars?: { name: string; value: number; color: string }[]; link?: string; actions?: { label: string; action: "apply_plan" }[] };

/** Medias dos ultimos 3 meses fechados: o que entra, o que sai e o que sobra. */
async function averages(userId: string, now = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth() - 3, 1), to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const txs = await db.transaction.findMany({ where: { userId, deletedAt: null, type: { in: ["INCOME", "EXPENSE"] }, date: { gte: from, lte: to } }, include: { category: { include: { parent: true } } } });
  const sum = (f: (t: (typeof txs)[number]) => boolean) => Math.round(txs.filter(f).reduce((s, t) => s + t.amountCents, 0) / 3);
  const income = sum((t) => t.type === "INCOME"), expense = sum((t) => t.type === "EXPENSE");
  const matching = (term: string) => { const k = keyOf(term); return sum((t) => t.type === "EXPENSE" && keyOf([t.description, t.merchant, t.category?.name, t.category?.parent?.name, ...t.tags].join(" ")).includes(k)); };
  return { income, expense, sobra: income - expense, matching };
}

const MONTH_WORDS: Record<string, number> = { janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5, julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11 };

function monthFromText(t: string): string {
  const now = new Date();
  if (/mes passado/.test(t)) { const d = new Date(now.getFullYear(), now.getMonth() - 1, 1); return monthKey(d); }
  for (const [w, i] of Object.entries(MONTH_WORDS)) if (t.includes(w)) {
    const y = i > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear();
    return `${y}-${String(i + 1).padStart(2, "0")}`;
  }
  return monthKey(now);
}
const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0);
const mName = (k: string) => MONTHS[Number(k.split("-")[1]) - 1];

export async function answer(userId: string, question: string): Promise<AdvisorAnswer> {
  const t = keyOf(question);
  const month = monthFromText(t);
  const d = await dashboard(userId, month);
  let a: AdvisorAnswer;

  const cut = parseCut(question), buy = parsePurchase(question), horizon = parseHorizon(question);
  if (/(me ajud|ajude|monta|montar|faz|fazer).*(organiz|plano)|plano de organiza/.test(t)) {
    // Plano de organizacao (RF-113): reserva, cortes e orcamentos — e cria tudo se a pessoa aceitar
    const avg = await averages(userId);
    const rising = d.categories.filter((c) => c.avg3 > 0 && c.total > c.avg3 * 1.1).slice(0, 2);
    const reserve = avg.expense * 3;
    const debts = await db.debt.findMany({ where: { userId, balanceCents: { gt: 0 } }, orderBy: { monthlyRate: "desc" } });
    const steps = [
      debts.length ? `Dívidas primeiro: comece por ${debts[0].creditor} (${debts[0].monthlyRate.toLocaleString("pt-BR")}% ao mês). Veja o plano em Dívidas.` : null,
      `Reserva de emergência: junte ${brl(reserve)} (3 meses do seu gasto médio). ${avg.sobra > 0 ? `Guardando ${brl(Math.round(avg.sobra * 0.5))} por mês (metade do que costuma sobrar), chega lá em ${Math.ceil(reserve / Math.max(1, Math.round(avg.sobra * 0.5)))} meses.` : "Primeiro, vamos fazer sobrar algo todo mês."}`,
      rising.length ? `Cortes: ${rising.map((c) => `${c.name} está ${pct(c.total, c.avg3)}% acima da média`).join(" e ")}. Um limite por categoria ajuda a segurar.` : "Cortes: seus gastos estão dentro da média. Ótimo sinal.",
      "Orçamentos: crio limites por categoria pela sua média dos últimos 3 meses. Você pode mudar depois.",
    ].filter(Boolean) as string[];
    a = { text: `Montei um plano em ${steps.length} passos:\n${steps.map((x, i) => `${i + 1}. ${x}`).join("\n")}`, facts: [{ label: "Entra por mês (média)", value: brl(avg.income) }, { label: "Sai por mês (média)", value: brl(avg.expense) }, { label: "Costuma sobrar", value: brl(avg.sobra) }],
      actions: [{ label: "Criar os orçamentos e a meta de reserva", action: "apply_plan" }], link: "/orcamentos" };
  } else if (cut) {
    const avg = await averages(userId);
    const spend = avg.matching(cut.term), save = Math.round(spend * cut.fraction), months = horizon ?? 6;
    a = spend ? { text: `Você gasta em média ${brl(spend)} por mês com "${cut.term}". ${cut.fraction === 1 ? "Parando" : `Cortando ${Math.round(cut.fraction * 100)}%`}, sobram ${brl(save)} a mais por mês: ${brl(save * months)} em ${months} meses e ${brl(save * 12)} em um ano.`,
        facts: [{ label: "Gasto médio por mês", value: brl(spend) }, { label: "Economia por mês", value: brl(save) }, { label: `Em ${months} meses`, value: brl(save * months) }, { label: "Sobra média + economia", value: brl(avg.sobra + save) }], link: `/lancamentos?mes=todos&q=${encodeURIComponent(cut.term)}` }
      : { text: `Não encontrei gastos com "${cut.term}" nos últimos 3 meses. Tente o nome de uma categoria (ex.: delivery, mercado) ou de um estabelecimento.`, facts: [] };
  } else if (buy) {
    const avg = await averages(userId);
    const now = new Date(); const end = new Date(now.getFullYear(), now.getMonth() + buy.installments, 0);
    const committed = await db.transaction.aggregate({ where: { userId, deletedAt: null, type: "EXPENSE", installments: { not: null }, date: { gt: now, lte: end } }, _sum: { amountCents: true } });
    const perMonthCommitted = Math.round((committed._sum.amountCents ?? 0) / buy.installments);
    const parcel = Math.ceil(buy.amountCents / buy.installments);
    const room = avg.sobra - perMonthCommitted;
    const fits = room >= parcel * 1.2; // folga de 20%
    const tight = !fits && room >= parcel;
    const months = room > 0 ? Math.ceil(buy.amountCents / room) : null;
    a = { text: fits ? `Cabe, sim. ${buy.installments > 1 ? `A parcela de ${brl(parcel)}` : `Os ${brl(buy.amountCents)}`} ${buy.installments > 1 ? "fica" : "ficam"} dentro do que costuma sobrar (${brl(room)} por mês, já descontando as parcelas que você tem).`
        : tight ? `Cabe, mas fica apertado: a parcela de ${brl(parcel)} usa quase tudo o que sobra (${brl(room)}). Qualquer imprevisto vira dívida. Dá para esperar uns meses ou parcelar em mais vezes sem juros?`
        : room > 0 ? `Hoje não cabe com folga: a ${buy.installments > 1 ? `parcela de ${brl(parcel)}` : "compra"} passa do que costuma sobrar (${brl(room)} por mês). Guardando essa sobra, você junta o valor em ${months} meses.`
        : `Hoje não cabe: nos últimos meses não tem sobrado dinheiro depois das contas. Vale primeiro fazer sobrar todo mês.`,
      facts: [{ label: buy.installments > 1 ? `Parcela (${buy.installments}x)` : "Valor", value: brl(parcel) }, { label: "Costuma sobrar", value: brl(avg.sobra) }, { label: "Parcelas já assumidas", value: brl(perMonthCommitted) }] };
  } else if (horizon) {
    const avg = await averages(userId);
    a = { text: avg.sobra > 0 ? `No ritmo dos últimos 3 meses, sobram em média ${brl(avg.sobra)} por mês: ${brl(avg.sobra * horizon)} em ${horizon} meses.` : `No ritmo dos últimos 3 meses, está saindo mais do que entra (${brl(avg.sobra)} por mês). Em ${horizon} meses seriam ${brl(avg.sobra * horizon)}.`,
      facts: [{ label: "Sobra média por mês", value: brl(avg.sobra) }, { label: `Em ${horizon} meses`, value: brl(avg.sobra * horizon) }] };
  } else if (/(quanto|o que).*(posso|consigo) gastar|ainda posso/.test(t)) {
    a = { text: d.saldoPrevisto > 0
      ? `Você pode gastar cerca de ${brl(d.porDia)} por dia ${d.daysUntilIncome === 1 ? "até amanhã" : `nos próximos ${d.daysUntilIncome} dias`}, sem ficar no vermelho.`
      : `Pelas contas já agendadas, o mês fecha ${brl(d.saldoPrevisto)}. O ideal agora é segurar os gastos que dá pra adiar.`,
      facts: [{ label: "Saldo atual", value: brl(d.saldoAtual) }, { label: "Saldo previsto no fim do mês", value: brl(d.saldoPrevisto) }, { label: "Por dia", value: brl(d.porDia) }] };
  } else if (/sobrar|vai sobrar|sobra/.test(t)) {
    a = { text: `Se você mantiver o ritmo atual, devem sobrar ${brl(d.projecao)} no fim do mês.`,
      facts: [{ label: "Saldo previsto (contas agendadas)", value: brl(d.saldoPrevisto) }, { label: "Projeção pelo ritmo de gasto", value: brl(d.projecao) }] };
  } else if (/(errado|melhorar|economizar|diagnostico|onde.*cortar)/.test(t)) {
    const rising = d.categories.filter((c) => c.avg3 > 0 && c.total > c.avg3 * 1.15).slice(0, 3);
    const fees = d.categories.find((c) => c.name.startsWith("Impostos"));
    const subs = d.categories.find((c) => c.name === "Assinaturas");
    const points: string[] = [];
    for (const c of rising) points.push(`${c.icon} ${c.name} está ${pct(c.total, c.avg3)}% acima da sua média (${brl(c.total)} contra ${brl(c.avg3)}).`);
    if (subs && subs.total > 0) points.push(`📺 Você tem ${brl(subs.total)} em assinaturas este mês. Vale conferir se usa todas.`);
    if (fees && fees.total > 0) points.push(`🧾 ${brl(fees.total)} foram para tarifas, juros e impostos.`);
    const dearDebt = await db.debt.findFirst({ where: { userId, balanceCents: { gt: 0 }, monthlyRate: { gte: 5 } }, orderBy: { monthlyRate: "desc" } });
    if (dearDebt) points.push(`🧯 ${dearDebt.creditor} cobra ${dearDebt.monthlyRate.toLocaleString("pt-BR")}% ao mês: são ${brl(Math.round(dearDebt.balanceCents * dearDebt.monthlyRate / 100))} de juros por mês. Vale priorizar e procurar renegociar.`);
    if (d.expense > d.income && d.income > 0) points.push(`⚠️ Os gastos (${brl(d.expense)}) passaram do que entrou (${brl(d.income)}).`);
    a = { text: points.length ? `Separei alguns pontos de atenção, sem julgamento:\n• ${points.join("\n• ")}` : "Não encontrei nada fora do padrão este mês. Continue assim! 👏",
      facts: rising.map((c) => ({ label: c.name, value: `+${pct(c.total, c.avg3)}%` })) };
  } else if (/quanto (gastei|paguei|foi)|gastei com|gasto com/.test(t)) {
    const term = t.replace(/.*(gastei|paguei|gasto|foi)\s*(com|de|no|na|em)?\s*/, "").replace(/\b(em|no mes|este mes|esse mes|neste mes|mes passado|janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b.*$/, "").replace(/\?/g, "").trim();
    const [y, m] = month.split("-").map(Number);
    const txs = await db.transaction.findMany({ where: { userId, deletedAt: null, type: "EXPENSE", date: { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59) } }, include: { category: { include: { parent: true } } } });
    const hit = term ? txs.filter((x) => keyOf([x.description, x.merchant, x.category?.name, x.category?.parent?.name, ...x.tags].join(" ")).includes(term)) : txs;
    const total = hit.reduce((s, x) => s + x.amountCents, 0);
    a = { text: term ? `Em ${mName(month)} você gastou ${brl(total)} com "${term}", em ${hit.length} lançamento${hit.length === 1 ? "" : "s"}.` : `Em ${mName(month)} você gastou ${brl(total)} no total.`,
      facts: [{ label: "Total", value: brl(total) }, { label: "Lançamentos", value: String(hit.length) }], link: `/lancamentos?mes=${month}&q=${encodeURIComponent(term)}` };
  } else {
    // "Com o que estou gastando mais?" e perguntas gerais
    const top = d.categories.slice(0, 5);
    a = { text: top.length
      ? `Em ${mName(month)}, onde mais foi dinheiro: ${top.slice(0, 3).map((c) => `${c.name} (${brl(c.total)}, ${Math.round(c.pct * 100)}%)`).join(", ")}.${top[0].prev ? ` ${top[0].name} ${top[0].total >= top[0].prev ? "subiu" : "caiu"} ${Math.abs(pct(top[0].total, top[0].prev))}% em relação ao mês anterior.` : ""}`
      : "Ainda não tem gastos neste mês. Que tal lançar o primeiro? Diga, por exemplo: \"gastei 30 no mercado\".",
      facts: [{ label: "Entrou", value: brl(d.income) }, { label: "Saiu", value: brl(d.expense) }],
      bars: top.map((c) => ({ name: c.name, value: c.total, color: c.color })), link: "/relatorios" };
  }

  if (aiEnabled()) {
    try {
      const txt = await aiText(userId, "chat", [
        { role: "system", content: `Você é o Sobbra, um amigo que entende de dinheiro. Fale português do Brasil, frases curtas, sem jargão e sem julgamento.
Use APENAS os números fornecidos nos FATOS; nunca invente valores. Não recomende produtos de investimento específicos, não prometa resultados.
Se houver sinais de endividamento grave, sugira procurar ajuda profissional e os canais oficiais de renegociação do credor. Máximo 4 frases.` },
        { role: "user", content: `PERGUNTA: ${question}\nFATOS: ${a.text}\n${a.facts.map((f) => `${f.label}: ${f.value}`).join("\n")}\nResponda à pergunta usando os fatos.` },
      ]);
      if (txt) a.text = txt.trim();
    } catch (e) { console.error("advisor ia", e); }
  }
  return a;
}
