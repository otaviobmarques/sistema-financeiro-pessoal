// ---------- Regras financeiras (portadas do sistema) ----------
const live = () => S.tx.filter((t) => !t.deleted);
const acc = (id) => S.accounts.find((a) => a.id === id);
function invMonth(t) { const a = acc(t.acc); return a && a.type === "CREDIT_CARD" ? SB.invoiceMonthFor(parseD(t.date), a.closing) : null; }
function balance(a, asOf = todayIso) {
  let b = a.initial;
  for (const t of live()) {
    if (t.status !== "PAID" || t.date > asOf) continue;
    if (t.acc === a.id) b += t.type === "INCOME" ? t.amount : -t.amount;
    if (t.to === a.id) b += t.amount;
  }
  return b;
}
function invoices(cardId) {
  const card = acc(cardId);
  const by = {};
  for (const t of live()) if (t.acc === cardId && t.type !== "TRANSFER") { const k = invMonth(t); (by[k] = by[k] || []).push(t); }
  let pool = live().filter((t) => t.to === cardId && t.type === "TRANSFER").reduce((s, t) => s + t.amount, 0);
  const open = SB.invoiceMonthFor(TODAY, card.closing);
  const list = Object.keys(by).sort().map((k) => {
    const items = by[k].sort((a, b) => b.date.localeCompare(a.date));
    const total = items.reduce((s, t) => s + (t.type === "EXPENSE" ? t.amount : -t.amount), 0);
    const paid = Math.min(Math.max(pool, 0), total); pool -= total;
    const status = paid >= total && total > 0 ? "paga" : k < open ? "fechada" : k === open ? "aberta" : "futura";
    return { month: k, items, total, paid, status, dueDate: SB.invoiceDueDate(k, card.closing, card.due) };
  });
  list.sort((a, b) => (a.status === "futura") !== (b.status === "futura") ? (a.status === "futura" ? 1 : -1) : a.status === "futura" ? a.month.localeCompare(b.month) : b.month.localeCompare(a.month));
  const used = list.reduce((s, i) => s + i.total - i.paid, 0);
  return { card, list, used, open };
}
function classify(text, kind) {
  const k = SB.keyOf(text);
  const rule = S.rules.find((r) => CATS[r.cat]?.kind === kind && k.includes(r.match));
  if (rule) return { cat: rule.cat, conf: 0.99 };
  const mem = S.memory[SB.keyOf(SB.normalizeMerchant(text))];
  if (mem && CATS[mem]?.kind === kind) return { cat: mem, conf: 0.9 };
  const slug = SB.keywordSlug(text, kind);
  if (slug) return { cat: slug, conf: 0.85 };
  return { cat: kind === "INCOME" ? "receita.outros" : "outros.geral", conf: 0.3 };
}
function addMonths(s, n) { const d = parseD(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return iso(d); }
function createTx(t) {
  const n = t.insts > 1 ? Math.min(t.insts, 48) : 1;
  const ids = [];
  const isCard = acc(t.acc)?.type === "CREDIT_CARD";
  if (t.cat && t.merchant) S.memory[SB.keyOf(t.merchant)] = t.cat;
  if (t.rec && n <= 1) {
    const g = uid(), N = t.recN || 12;
    for (let i = 0; i < N; i++) { const date = addMonths(t.date, i); const id = uid(); ids.push(id);
      S.tx.push({ tags: [], origin: i ? "RECURRENCE" : "MANUAL", ...t, origin: i ? "RECURRENCE" : t.origin || "MANUAL", id, date, rec: true, group: g, status: isCard || date <= todayIso ? "PAID" : "PENDING" }); }
    save(); return ids;
  }
  if (n > 1) {
    const each = Math.floor(t.amount / n), rest = t.amount - each * n, g = uid();
    for (let i = 0; i < n; i++) { const date = addMonths(t.date, i); const id = uid(); ids.push(id);
      S.tx.push({ ...t, id, amount: each + (i ? 0 : rest), date, desc: `${t.desc} (${i + 1}/${n})`, inst: i + 1, insts: n, group: g, status: isCard || date <= todayIso ? "PAID" : "PENDING" }); }
  } else { const id = uid(); ids.push(id); S.tx.push({ status: t.date > todayIso ? "PENDING" : "PAID", tags: [], origin: "MANUAL", ...t, id }); }
  save(); return ids;
}
function dashboard(month) {
  const [y, m] = month.split("-").map(Number);
  const start = iso(new Date(y, m - 1, 1)), end = iso(new Date(y, m, 0));
  const isCur = month === mk(TODAY);
  const T = live().filter((t) => t.type !== "TRANSFER");
  const inM = T.filter((t) => t.date >= start && t.date <= end);
  const income = inM.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const expense = inM.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const cash = S.accounts.filter((a) => a.type !== "CREDIT_CARD" && a.type !== "INVESTMENT");
  const cashIds = new Set(cash.map((a) => a.id));
  const atual = cash.reduce((s, a) => s + balance(a), 0);
  const pend = T.filter((t) => cashIds.has(t.acc) && t.date <= end && (t.status === "PENDING" || t.date > todayIso));
  const pin = pend.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const pout = pend.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const monthStart = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  let cardsDue = 0;
  for (const c of S.accounts.filter((a) => a.type === "CREDIT_CARD")) for (const i of invoices(c.id).list) if (i.dueDate <= parseD(end) && i.dueDate >= (isCur ? monthStart : parseD(start))) cardsDue += i.total - i.paid;
  const previsto = atual + pin - pout - cardsDue;
  const dim = Number(end.slice(8)), dayNow = isCur ? TODAY.getDate() : dim, left = Math.max(0, dim - dayNow);
  const variable = inM.filter((t) => t.type === "EXPENSE" && !t.rec && !t.insts && t.date <= todayIso).reduce((s, t) => s + t.amount, 0);
  const projecao = previsto - Math.round((dayNow ? variable / dayNow : 0) * left);
  const next = pend.filter((t) => t.type === "INCOME" && t.date > todayIso).sort((a, b) => a.date.localeCompare(b.date))[0];
  const days = next ? Math.max(1, Math.round((parseD(next.date) - TODAY) / 864e5)) : Math.max(1, left + 1);
  const porDia = Math.max(0, Math.floor(previsto / days));
  const exp = T.filter((t) => t.type === "EXPENSE");
  const sumBy = (list) => { const o = {}; for (const t of list) { const k = top(t.cat)?.slug || "sem"; o[k] = (o[k] || 0) + t.amount; } return o; };
  const mOf = (t) => t.date.slice(0, 7);
  const prevK = mk(new Date(y, m - 2, 1)), last3 = [1, 2, 3].map((i) => mk(new Date(y, m - 1 - i, 1)));
  const cur = sumBy(exp.filter((t) => mOf(t) === month)), prev = sumBy(exp.filter((t) => mOf(t) === prevK)), avg = sumBy(exp.filter((t) => last3.includes(mOf(t))));
  const categories = Object.entries(cur).map(([k, total]) => ({ slug: k, name: CATS[k]?.name || "Sem categoria", icon: CATS[k]?.icon || "❔", color: CATS[k]?.color || "#94A3B8", total, pct: expense ? total / expense : 0, prev: prev[k] || 0, avg3: Math.round((avg[k] || 0) / 3) })).sort((a, b) => b.total - a.total);
  const mer = {}; for (const t of exp.filter((t) => mOf(t) === month)) { const k = t.merchant || t.desc.replace(/\s*\(\d+\/\d+\)$/, ""); mer[k] = (mer[k] || 0) + t.amount; }
  const merchants = Object.entries(mer).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 6);
  const monthly = Array.from({ length: 6 }, (_, i) => { const k = mk(new Date(y, m - 6 + i, 1)); return { k, inc: T.filter((t) => t.type === "INCOME" && mOf(t) === k).reduce((s, t) => s + t.amount, 0), exp: exp.filter((t) => mOf(t) === k).reduce((s, t) => s + t.amount, 0) }; });
  let run = cash.reduce((s, a) => s + balance(a, iso(new Date(y, m - 1, 0))), 0);
  const daily = new Array(dim).fill(0);
  for (const t of inM) if (cashIds.has(t.acc)) daily[Number(t.date.slice(8)) - 1] += t.type === "INCOME" ? t.amount : -t.amount;
  for (const t of live()) if (t.type === "TRANSFER" && t.date >= start && t.date <= end) { const di = Number(t.date.slice(8)) - 1; if (cashIds.has(t.acc)) daily[di] -= t.amount; if (cashIds.has(t.to)) daily[di] += t.amount; }
  const line = daily.map((v, i) => { run += v; return { day: i + 1, v: run, fut: isCur && i + 1 > dayNow }; });
  const week = [0, 0, 0, 0, 0, 0, 0]; for (const t of inM) if (t.type === "EXPENSE") week[parseD(t.date).getDay()] += t.amount;
  return { month, income, expense, atual, previsto, projecao, porDia, days, categories, merchants, monthly, line, week, pin, pout, cardsDue };
}

