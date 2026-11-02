// Consultor "Pergunte ao Sobbra" (M11). Regra RF-116: os NUMEROS vem do banco de dados;
// a IA (quando ligada) apenas reescreve a explicacao a partir desses fatos.
import { db } from "./db";
import { dashboard } from "./finance";
import { brl, monthKey, MONTHS } from "./money";
import { keyOf } from "./normalize";
import { aiEnabled, aiText } from "./ai";

export type AdvisorAnswer = { text: string; facts: { label: string; value: string }[]; bars?: { name: string; value: number; color: string }[]; link?: string };

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

  if (/(quanto|o que).*(posso|consigo) gastar|ainda posso/.test(t)) {
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
