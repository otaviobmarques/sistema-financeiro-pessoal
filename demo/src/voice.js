// ---------- Interpretador de voz + consultor (mesma logica do sistema) ----------
function voice(text, pending) {
  const names = S.accounts.map((a) => a.name);
  let action = SB.parseVoice(text, names, TODAY);
  if (pending) {
    const item = { ...pending.item, date: new Date(pending.item.date) };
    const e = SB.parseVoice(text, names, TODAY); const x = e.kind === "create" ? e.items[0] : null;
    if (pending.ask === "descricao") item.description = x?.description || text.trim();
    if (pending.ask === "valor" && x?.amountCents) item.amountCents = x.amountCents;
    item.missing = item.missing.filter((m) => m !== pending.ask); action = { kind: "create", items: [item] };
  }
  if (action.kind === "query") return { say: advisor(text).text };
  const lastVoice = () => [...live()].reverse().find((t) => t.origin === "VOICE" && t.mine);
  if (action.kind === "undo") { const l = lastVoice(); if (!l) return { say: "Não encontrei nenhum lançamento por voz para mexer." }; S.tx.forEach((t) => { if (t.id === l.id || (l.group && t.group === l.group)) t.deleted = true; }); save(); return { say: `Apaguei "${l.desc}" de ${brl(l.amount)}.` }; }
  if (action.kind === "fix_amount") { const l = lastVoice(); if (!l) return { say: "Não encontrei nenhum lançamento por voz para mexer." }; l.amount = action.amountCents; save(); return { say: `Corrigi "${l.desc}" para ${brl(l.amountCents ?? l.amount)}.` }; }
  const out = [], ids = [];
  for (const it of action.items) {
    if (it.missing.includes("valor")) return { say: `Qual foi o valor${it.description ? ` de ${it.description}` : ""}?`, pending: { item: it, ask: "valor" } };
    if (it.missing.includes("descricao")) return { say: `Com o que foi esse gasto de ${brl(it.amountCents)}?`, pending: { item: it, ask: "descricao" } };
    let a = S.accounts.find((x) => x.name === it.accountName);
    if (!a && it.payment === "credito") a = S.accounts.find((x) => x.type === "CREDIT_CARD");
    if (!a && it.payment === "dinheiro") a = S.accounts.find((x) => x.type === "WALLET");
    if (!a && it.installments) a = S.accounts.find((x) => x.type === "CREDIT_CARD");
    if (!a) a = S.accounts.find((x) => x.type === "CHECKING") || S.accounts[0];
    const desc = it.description.charAt(0).toUpperCase() + it.description.slice(1);
    const c = classify(desc, it.type);
    ids.push(...createTx({ type: it.type, amount: it.amountCents, desc, merchant: SB.normalizeMerchant(desc), cat: c.cat, conf: c.conf, acc: a.id, date: iso(it.date), insts: it.installments, origin: "VOICE", mine: true }));
    const dd = Math.round((TODAY - new Date(it.date.getFullYear(), it.date.getMonth(), it.date.getDate(), 12)) / 864e5);
    const how = a.type === "CREDIT_CARD" ? `na fatura do ${a.name}` : a.type === "WALLET" ? "no dinheiro" : `no ${a.name}`;
    out.push(`${brl(it.amountCents)} em ${catLabel(c.cat).replace(" › ", " > ")}, ${dd === 0 ? "hoje" : dd === 1 ? "ontem" : it.date.toLocaleDateString("pt-BR")}, ${how}${it.installments ? ` em ${it.installments}x` : ""}`);
  }
  return { say: out.length === 1 ? `Pronto! ${out[0]}.` : `Lancei ${out.length}: ${out.join("; ")}.`, ids };
}
function advisor(q) {
  const t = SB.keyOf(q); const d = dashboard(mk(TODAY)); const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : 0);
  const mName = MONTHS[TODAY.getMonth()];
  if (/(posso|consigo) gastar|ainda posso/.test(t)) return { text: d.previsto > 0 ? `Você pode gastar cerca de ${brl(d.porDia)} por dia ${d.days === 1 ? "até amanhã" : `nos próximos ${d.days} dias`}, sem ficar no vermelho.` : `Pelas contas já agendadas, o mês fecha em ${brl(d.previsto)}. O ideal agora é segurar o que dá para adiar.`, facts: [["Saldo atual", brl(d.atual)], ["Previsto no fim do mês", brl(d.previsto)]] };
  if (/sobrar|sobra/.test(t)) return { text: `Se você mantiver o ritmo atual, devem sobrar ${brl(d.projecao)} no fim do mês.`, facts: [["Contas agendadas", brl(d.previsto)], ["Pelo ritmo de gasto", brl(d.projecao)]] };
  if (/(errado|melhorar|economizar|cortar)/.test(t)) {
    const rising = d.categories.filter((c) => c.avg3 > 0 && c.total > c.avg3 * 1.15).slice(0, 3); const pts = [];
    for (const c of rising) pts.push(`${c.icon} ${c.name} está ${pct(c.total, c.avg3)}% acima da sua média (${brl(c.total)} contra ${brl(c.avg3)}).`);
    const subs = d.categories.find((c) => c.slug === "assinaturas"); if (subs) pts.push(`📺 São ${brl(subs.total)} em assinaturas este mês. Vale conferir se você usa todas.`);
    const del = live().filter((x) => x.cat === "alimentacao.delivery" && x.date.slice(0, 7) === mk(TODAY)); if (del.length >= 2) pts.push(`🛵 ${del.length} pedidos de delivery este mês, somando ${brl(del.reduce((s, x) => s + x.amount, 0))}.`);
    if (d.expense > d.income && d.income) pts.push(`⚠️ Os gastos (${brl(d.expense)}) passaram do que entrou (${brl(d.income)}).`);
    return { text: pts.length ? `Separei alguns pontos de atenção, sem julgamento:\n• ${pts.join("\n• ")}` : "Não encontrei nada fora do padrão este mês. Continue assim!", facts: rising.map((c) => [c.name, `+${pct(c.total, c.avg3)}%`]) };
  }
  if (/quanto (gastei|paguei)|gastei com|gasto com/.test(t)) {
    const passado = /mes passado/.test(t); const k = passado ? mk(new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 1)) : mk(TODAY);
    const term = t.replace(/.*(gastei|paguei|gasto)\s*(com|de|no|na|em)?\s*/, "").replace(/\b(em|no mes|este mes|esse mes|neste mes|mes passado)\b.*$/, "").replace(/\?/g, "").trim();
    const hit = live().filter((x) => x.type === "EXPENSE" && x.date.slice(0, 7) === k && (!term || SB.keyOf([x.desc, x.merchant, catLabel(x.cat)].join(" ")).includes(term)));
    const tot = hit.reduce((s, x) => s + x.amount, 0);
    return { text: `Em ${MONTHS[Number(k.slice(5)) - 1]} você gastou ${brl(tot)}${term ? ` com "${term}"` : ""}, em ${hit.length} lançamento${hit.length === 1 ? "" : "s"}.`, facts: [["Total", brl(tot)], ["Lançamentos", String(hit.length)]] };
  }
  const tp = d.categories.slice(0, 5);
  return { text: tp.length ? `Em ${mName}, onde mais foi dinheiro: ${tp.slice(0, 3).map((c) => `${c.name} (${brl(c.total)}, ${Math.round(c.pct * 100)}%)`).join(", ")}.` : "Ainda não há gastos neste mês. Diga, por exemplo: “gastei 30 no mercado”.", facts: [["Entrou", brl(d.income)], ["Saiu", brl(d.expense)]], bars: tp.map((c) => ({ name: c.name, value: c.total, color: c.color })) };
}

