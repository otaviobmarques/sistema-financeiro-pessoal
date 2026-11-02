"use server";
// Acoes da Fase 2: orcamentos, metas, dividas, boletos, importacao e notificacoes.
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseMoney } from "@/lib/money";
import { budgetStatus } from "@/lib/budgets";
import type { FormState } from "./actions";
import { getProvider, billingPrefs, appUrl, type Cycle } from "@/lib/billing";
import { getPlans } from "@/lib/plans";

import { readLayout } from "@/lib/dashboard-layout";

import { parseNfceInput, fetchNfce } from "@/lib/nfce";
import { keywordSlug } from "@/lib/classify";

import { ALERT_KINDS, readPrefs, type AlertKind } from "@/lib/notify-prefs";

import { parseBoleto } from "@/lib/boleto";

import { classify } from "@/lib/classify";
import { normalizeMerchant } from "@/lib/normalize";
import type { ImportRow } from "@/lib/importer";

import { DebtType } from "@prisma/client";
import { createTransaction } from "@/lib/finance";
import { ensureCategory } from "@/lib/ensure-category";


// ---------- Orcamentos ----------
export async function saveBudget(categoryId: string, limitText: string): Promise<FormState> {
  const user = await requireUser();
  const limit = parseMoney(limitText);
  if (!limit || limit <= 0) return { error: "Informe um valor maior que zero" };
  const cat = await db.category.findFirst({ where: { id: categoryId, userId: user.id, parentId: null, kind: "EXPENSE" } });
  if (!cat) return { error: "Categoria inválida" };
  await db.budget.upsert({ where: { userId_categoryId: { userId: user.id, categoryId } }, update: { limitCents: limit }, create: { userId: user.id, categoryId, limitCents: limit } });
  revalidatePath("/orcamentos"); revalidatePath("/inicio");
  return { ok: "Orçamento salvo" };
}

export async function deleteBudget(id: string) {
  const user = await requireUser();
  await db.budget.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/orcamentos");
}

/** Cria orcamentos a partir da media dos ultimos 3 meses (RF-081). */
export async function applySuggestedBudgets() {
  const user = await requireUser();
  const { suggestions } = await budgetStatus(user.id);
  for (const s of suggestions) await db.budget.create({ data: { userId: user.id, categoryId: s.categoryId, limitCents: s.suggested } });
  revalidatePath("/orcamentos");
  return suggestions.length;
}

// ---------- Metas ----------
export async function saveGoal(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(fd.get("name") || "").trim();
  const target = parseMoney(String(fd.get("target") || ""));
  if (!name) return { error: "Dê um nome para a meta" };
  if (!target || target <= 0) return { error: "Quanto você quer juntar?" };
  const deadline = String(fd.get("deadline") || "");
  await db.goal.create({ data: { userId: user.id, name, icon: String(fd.get("icon") || "🎯"), targetCents: target, savedCents: parseMoney(String(fd.get("saved") || "")) ?? 0,
    deadline: /^\d{4}-\d{2}$/.test(deadline) ? new Date(deadline + "-01T12:00:00") : null } });
  revalidatePath("/orcamentos");
  return { ok: "Meta criada" };
}

/** Aporte na meta; devolve true quando a meta foi alcancada agora (para comemorar, RF-155). */
export async function contributeGoal(id: string, amountText: string): Promise<{ error?: string; achieved?: boolean }> {
  const user = await requireUser();
  const v = parseMoney(amountText);
  if (!v) return { error: "Valor inválido" };
  const g = await db.goal.findFirst({ where: { id, userId: user.id } });
  if (!g) return { error: "Meta não encontrada" };
  const saved = Math.max(0, g.savedCents + v);
  const achieved = !g.achievedAt && saved >= g.targetCents;
  await db.goal.update({ where: { id }, data: { savedCents: saved, ...(achieved ? { achievedAt: new Date() } : {}) } });
  revalidatePath("/orcamentos");
  return { achieved };
}

export async function deleteGoal(id: string) {
  const user = await requireUser();
  await db.goal.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/orcamentos");
}

// ---------- Dividas ----------

export async function saveDebt(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const type = String(fd.get("type")) as DebtType;
  if (!Object.values(DebtType).includes(type)) return { error: "Escolha o tipo" };
  const creditor = String(fd.get("creditor") || "").trim();
  const balance = parseMoney(String(fd.get("balance") || ""));
  const payment = parseMoney(String(fd.get("payment") || ""));
  const rate = Number(String(fd.get("rate") || "0").replace(",", "."));
  const dueDay = Number(fd.get("dueDay") || 10);
  if (!creditor) return { error: "Com quem é a dívida?" };
  if (!balance || balance <= 0) return { error: "Informe quanto ainda deve" };
  if (!payment || payment <= 0) return { error: "Informe quanto paga por mês" };
  if (!Number.isFinite(rate) || rate < 0 || rate > 50) return { error: "Juros ao mês entre 0% e 50%" };
  const id = String(fd.get("id") || "");
  const data = { type, creditor, balanceCents: balance, paymentCents: payment, monthlyRate: rate, dueDay: Math.min(31, Math.max(1, dueDay)) };
  if (id) await db.debt.updateMany({ where: { id, userId: user.id }, data });
  else await db.debt.create({ data: { ...data, userId: user.id } });
  revalidatePath("/dividas"); revalidatePath("/agenda");
  return { ok: "Dívida salva" };
}

export async function deleteDebt(id: string) {
  const user = await requireUser();
  await db.debt.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dividas"); revalidatePath("/agenda");
}

/** Registra um pagamento: abate o saldo e lanca a despesa (RF-184). Devolve true se quitou. */
export async function payDebt(id: string, amountText: string): Promise<{ error?: string; paidOff?: boolean }> {
  const user = await requireUser();
  const v = parseMoney(amountText);
  if (!v || v <= 0) return { error: "Valor inválido" };
  const d = await db.debt.findFirst({ where: { id, userId: user.id } });
  if (!d) return { error: "Dívida não encontrada" };
  const account = await db.account.findFirst({ where: { userId: user.id, archived: false, type: { in: ["CHECKING", "SAVINGS", "WALLET"] } }, orderBy: { createdAt: "asc" } });
  if (!account) return { error: "Cadastre uma conta para registrar o pagamento" };
  const cat = await ensureCategory(user.id, "dividas.pagamento");
  await createTransaction(user.id, { type: "EXPENSE", amountCents: v, description: `Pagamento ${d.creditor}`, accountId: account.id, categoryId: cat.id, date: new Date(), tags: ["divida"] });
  const balance = Math.max(0, d.balanceCents - v);
  await db.debt.update({ where: { id }, data: { balanceCents: balance, ...(balance === 0 ? { paidOffAt: new Date() } : {}) } });
  revalidatePath("/dividas"); revalidatePath("/inicio"); revalidatePath("/lancamentos");
  return { paidOff: balance === 0 };
}

// ---------- Importacao de extratos (RF-060/062) ----------

export type PreviewRow = ImportRow & { duplicate: "id" | "similar" | null; categoryId: string | null; categoryLabel: string };

/** Pre-visualiza: marca duplicados (mesmo FITID/linha ou mesmo valor e data com descricao parecida) e sugere categoria. */
export async function previewImport(accountId: string, rows: ImportRow[]): Promise<{ error?: string; rows?: PreviewRow[] }> {
  const user = await requireUser();
  const account = await db.account.findFirst({ where: { id: accountId, userId: user.id } });
  if (!account) return { error: "Escolha a conta do extrato" };
  if (!rows.length) return { error: "Não encontrei lançamentos no arquivo. Confira as colunas." };
  if (rows.length > 2000) return { error: "Arquivo grande demais: importe até 2.000 linhas por vez" };
  const dates = rows.map((r) => r.date).sort();
  const existing = await db.transaction.findMany({ where: { userId: user.id, accountId, deletedAt: null, date: { gte: new Date(dates[0] + "T00:00:00"), lte: new Date(dates[dates.length - 1] + "T23:59:59") } }, select: { externalId: true, amountCents: true, type: true, date: true, description: true, merchant: true } });
  const ids = new Set(existing.map((e) => e.externalId).filter(Boolean));
  const cats = new Map((await db.category.findMany({ where: { userId: user.id }, include: { parent: true } })).map((c) => [c.id, `${c.parent ? c.parent.name + " › " : ""}${c.name}`]));
  const out: PreviewRow[] = [];
  for (const r of rows) {
    const d = new Date(r.date + "T12:00:00"); const abs = Math.abs(r.amountCents); const kind = r.amountCents < 0 ? "EXPENSE" : "INCOME";
    const similar = existing.find((e) => e.amountCents === abs && e.type === kind && Math.abs(+e.date - +d) <= 1.5 * 86400000);
    const c = await classify(user.id, { text: r.description, merchant: r.description, kind, useAi: false });
    out.push({ ...r, duplicate: ids.has(r.externalId) ? "id" : similar ? "similar" : null, categoryId: c.categoryId, categoryLabel: c.categoryId ? cats.get(c.categoryId) ?? "" : "Sem categoria" });
  }
  return { rows: out };
}

export async function confirmImport(accountId: string, rows: PreviewRow[]): Promise<{ error?: string; created?: number }> {
  const user = await requireUser();
  const account = await db.account.findFirst({ where: { id: accountId, userId: user.id } });
  if (!account) return { error: "Conta inválida" };
  const already = new Set((await db.transaction.findMany({ where: { userId: user.id, externalId: { in: rows.map((r) => r.externalId) } }, select: { externalId: true } })).map((x) => x.externalId));
  let created = 0;
  for (const r of rows) {
    if (already.has(r.externalId)) continue; // nunca duplica o mesmo extrato
    const merchant = normalizeMerchant(r.description);
    const [id] = await createTransaction(user.id, { type: r.amountCents < 0 ? "EXPENSE" : "INCOME", amountCents: Math.abs(r.amountCents), description: merchant || r.description, merchant,
      accountId, categoryId: r.categoryId, date: new Date(r.date + "T12:00:00"), status: "PAID", origin: "IMPORT" });
    await db.transaction.update({ where: { id }, data: { externalId: r.externalId } });
    created++;
  }
  revalidatePath("/lancamentos"); revalidatePath("/inicio");
  return { created };
}

// ---------- Contas a pagar e boletos (RF-190..196) ----------

export async function readBoleto(line: string) {
  await requireUser();
  const r = parseBoleto(line);
  if ("error" in r) return { error: r.error };
  return { ...r, dueDate: r.dueDate?.toISOString().slice(0, 10) ?? null };
}

export async function saveBill(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const payee = String(fd.get("payee") || "").trim();
  const amount = parseMoney(String(fd.get("amount") || ""));
  const due = String(fd.get("dueDate") || "");
  if (!payee) return { error: "Para quem é o pagamento?" };
  if (!amount || amount <= 0) return { error: "Informe o valor" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: "Informe o vencimento" };
  const line = String(fd.get("line") || "").replace(/\D/g, "");
  const parsed = line ? parseBoleto(line) : null;
  if (parsed && "error" in parsed) return { error: parsed.error };
  await db.bill.create({ data: { userId: user.id, payee, amountCents: amount, dueDate: new Date(due + "T12:00:00"), remindDays: Number(fd.get("remindDays") || 3),
    barcode: parsed?.barcode ?? null, digitableLine: parsed?.digitableLine ?? null, kind: parsed?.kind ?? "manual", pixCode: String(fd.get("pix") || "").trim() || null } });
  revalidatePath("/contas-a-pagar"); revalidatePath("/agenda");
  return { ok: "Conta salva. Vamos te lembrar antes do vencimento." };
}

/** "Paguei": gera a despesa (o Sobbra nao faz pagamentos, RF-195) e marca a conta como paga. */
export async function payBill(id: string, accountId?: string) {
  const user = await requireUser();
  const b = await db.bill.findFirst({ where: { id, userId: user.id, paidAt: null } });
  if (!b) return;
  const account = accountId ? await db.account.findFirst({ where: { id: accountId, userId: user.id } }) : await db.account.findFirst({ where: { userId: user.id, archived: false, type: { in: ["CHECKING", "SAVINGS", "WALLET"] } }, orderBy: { createdAt: "asc" } });
  if (!account) return;
  const c = await classify(user.id, { text: b.payee, merchant: b.payee, kind: "EXPENSE" });
  const [txId] = await createTransaction(user.id, { type: "EXPENSE", amountCents: b.amountCents, description: b.payee, merchant: b.payee, accountId: account.id, categoryId: c.categoryId, date: new Date(), tags: ["boleto"] });
  await db.bill.update({ where: { id }, data: { paidAt: new Date(), transactionId: txId } });
  revalidatePath("/contas-a-pagar"); revalidatePath("/agenda"); revalidatePath("/inicio");
}

export async function deleteBill(id: string) {
  const user = await requireUser();
  await db.bill.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/contas-a-pagar"); revalidatePath("/agenda");
}

/** RF-196: transforma uma conta que se repete (ex.: luz todo dia 10) em despesa fixa agendada. */
export async function scheduleMonthly(merchant: string, amountCents: number, day: number) {
  const user = await requireUser();
  const account = await db.account.findFirst({ where: { userId: user.id, archived: false, type: { in: ["CHECKING", "SAVINGS", "WALLET"] } }, orderBy: { createdAt: "asc" } });
  if (!account) return;
  const now = new Date(); const date = new Date(now.getFullYear(), now.getMonth(), day, 12); if (date <= now) date.setMonth(date.getMonth() + 1);
  const c = await classify(user.id, { text: merchant, merchant, kind: "EXPENSE" });
  await createTransaction(user.id, { type: "EXPENSE", amountCents: amountCents, description: merchant, merchant, accountId: account.id, categoryId: c.categoryId, date, status: "PENDING", recurrence: "monthly", recurrenceMonths: 12 });
  revalidatePath("/contas-a-pagar"); revalidatePath("/recorrentes"); revalidatePath("/agenda");
}

// ---------- Avisos (RF-090..093) ----------

export async function markNotificationsRead(ids?: string[]) {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null, ...(ids ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } });
  revalidatePath("/avisos"); revalidatePath("/", "layout");
}

export async function saveNotifyPrefs(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const cur = readPrefs(user.notifyPrefs);
  const kinds = Object.fromEntries((Object.keys(ALERT_KINDS) as AlertKind[]).map((k) => [k, fd.get(`k_${k}`) === "on"])) as Record<AlertKind, boolean>;
  const t = (v: FormDataEntryValue | null, d: string) => (/^\d{2}:\d{2}$/.test(String(v)) ? String(v) : d);
  await db.user.update({ where: { id: user.id }, data: { notifyPrefs: { kinds, push: fd.get("push") === "on", quietStart: t(fd.get("quietStart"), cur.quietStart), quietEnd: t(fd.get("quietEnd"), cur.quietEnd) } } });
  revalidatePath("/ajustes");
  return { ok: "Preferências de avisos salvas" };
}

// ---------- Consultor: aplicar o plano de organizacao (RF-113) ----------
export async function applyPlan(): Promise<{ budgets: number; goal: boolean }> {
  const user = await requireUser();
  const budgets = await applySuggestedBudgets();
  const has = await db.goal.findFirst({ where: { userId: user.id, name: { contains: "reserva", mode: "insensitive" } } });
  let goal = false;
  if (!has) {
    const from = new Date(); from.setMonth(from.getMonth() - 3, 1); const to = new Date(); to.setDate(0);
    const exp = await db.transaction.aggregate({ where: { userId: user.id, deletedAt: null, type: "EXPENSE", date: { gte: from, lte: to } }, _sum: { amountCents: true } });
    const target = Math.max(100000, Math.round((exp._sum.amountCents ?? 0) / 3) * 3);
    const deadline = new Date(); deadline.setMonth(deadline.getMonth() + 12, 1);
    await db.goal.create({ data: { userId: user.id, name: "Reserva de emergência", icon: "🛟", targetCents: target, deadline } });
    goal = true;
  }
  revalidatePath("/orcamentos");
  return { budgets, goal };
}

// ---------- NFC-e (RF-070..072) ----------

export async function readNfce(input: string): Promise<{ error?: string; id?: string }> {
  const user = await requireUser();
  const r = parseNfceInput(input);
  if ("error" in r) return { error: r.error };
  const existing = await db.nfce.findUnique({ where: { userId_accessKey: { userId: user.id, accessKey: r.key.key } } });
  if (existing) return { id: existing.id };
  const n = await db.nfce.create({ data: { userId: user.id, accessKey: r.key.key, url: r.url, uf: r.key.uf, cnpj: r.key.cnpj, number: r.key.number } });
  try {
    const data = await fetchNfce(r.key, r.url);
    const merchant = data.merchant ? normalizeMerchant(data.merchant) : null;
    const store = merchant ? await classify(user.id, { text: merchant, merchant, cnpj: r.key.cnpj, kind: "EXPENSE", useAi: false }) : null;
    const items = [];
    for (const it of data.items) {
      // Categoria por item (RF-072): palavra-chave do item; se nao achar, a categoria da loja
      const slug = keywordSlug(it.description, "EXPENSE");
      const cat = slug ? await ensureCategory(user.id, slug) : null;
      items.push({ ...it, categoryId: cat?.id ?? store?.categoryId ?? null });
    }
    await db.nfce.update({ where: { id: n.id }, data: { status: "lida", merchant, totalCents: data.totalCents, issuedAt: data.issuedAt, items: { create: items } } });
  } catch (e: any) {
    await db.nfce.update({ where: { id: n.id }, data: { status: "falhou", error: `Não consegui buscar os itens na SEFAZ (${e?.message ?? "erro"}). Você pode informar o total e lançar assim mesmo.` } });
  }
  revalidatePath("/nfce");
  return { id: n.id };
}

export async function setNfceItemCategory(itemId: string, categoryId: string | null) {
  const user = await requireUser();
  const it = await db.nfceItem.findFirst({ where: { id: itemId, nfce: { userId: user.id } } });
  if (!it) return;
  await db.nfceItem.update({ where: { id: itemId }, data: { categoryId } });
}

/** Lanca a nota: um lancamento por categoria (mercado, limpeza, bebidas...), com os itens na observacao. */
export async function launchNfce(id: string, accountId: string, manual?: { merchant: string; amount: string; date: string }): Promise<{ error?: string; created?: number }> {
  const user = await requireUser();
  const n = await db.nfce.findFirst({ where: { id, userId: user.id }, include: { items: true } });
  if (!n) return { error: "Nota não encontrada" };
  if (n.status === "lancada") return { error: "Esta nota já foi lançada" };
  const account = await db.account.findFirst({ where: { id: accountId, userId: user.id } });
  if (!account) return { error: "Escolha a conta" };
  const merchant = manual?.merchant?.trim() || n.merchant || `CNPJ ${n.cnpj}`;
  const date = manual?.date ? new Date(manual.date + "T12:00:00") : n.issuedAt ?? new Date();
  let created = 0;
  if (!n.items.length) {
    const v = parseMoney(manual?.amount ?? "") ?? n.totalCents;
    if (!v) return { error: "Informe o total da nota" };
    const c = await classify(user.id, { text: merchant, merchant, cnpj: n.cnpj, kind: "EXPENSE" });
    await createTransaction(user.id, { type: "EXPENSE", amountCents: v, description: merchant, merchant, cnpj: n.cnpj, accountId, categoryId: c.categoryId, date, tags: ["nfce"] });
    created = 1;
  } else {
    const groups = new Map<string, typeof n.items>();
    for (const it of n.items) groups.set(it.categoryId ?? "", [...(groups.get(it.categoryId ?? "") ?? []), it]);
    const cats = new Map((await db.category.findMany({ where: { userId: user.id, id: { in: [...groups.keys()].filter(Boolean) } } })).map((c) => [c.id, c.name]));
    // desconto/acrescimo da nota distribuido proporcionalmente
    const itemsSum = n.items.reduce((s, i) => s + i.totalCents, 0); const factor = n.totalCents && itemsSum ? n.totalCents / itemsSum : 1;
    let rest = n.totalCents ?? itemsSum;
    const entries = [...groups.entries()];
    for (const [i, [catId, its]] of entries.entries()) {
      const raw = its.reduce((s, x) => s + x.totalCents, 0); const v = i === entries.length - 1 ? rest : Math.round(raw * factor); rest -= v;
      await createTransaction(user.id, { type: "EXPENSE", amountCents: v, description: groups.size > 1 ? `${merchant} (${cats.get(catId) ?? "Outros"})` : merchant, merchant, cnpj: n.cnpj, accountId, categoryId: catId || null, date, tags: ["nfce"],
        notes: its.map((x) => `${x.quantity.toLocaleString("pt-BR")} ${x.unit ?? "un"} ${x.description}: ${(x.totalCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`).join("\n").slice(0, 2000) });
      created++;
    }
  }
  await db.nfce.update({ where: { id }, data: { status: "lancada", ...(manual?.merchant ? { merchant } : {}) } });
  revalidatePath("/nfce"); revalidatePath("/lancamentos"); revalidatePath("/inicio");
  return { created };
}

// ---------- Painel personalizavel (RF-059) ----------

export async function saveDashboardLayout(layout: unknown) {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { dashboardLayout: readLayout(layout) } });
  revalidatePath("/inicio");
}

// ---------- Assinatura do SaaS ----------

const onlyDigits = (s: string) => s.replace(/\D/g, "");
function validCpf(c: string) {
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const dv = (n: number) => { let s = 0; for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

export async function startCheckout(plan: string, cycle: Cycle, cpf?: string): Promise<{ error?: string; url?: string }> {
  const user = await requireUser();
  const p = await getProvider();
  if (!p) return { error: "O pagamento online ainda não está disponível." };
  const plans = await getPlans(); const info = plans[plan]; const prefs = await billingPrefs();
  if (!info?.active || !info.price || plan === "FREE") return { error: "Este plano não está disponível." };
  if ((prefs.cycles === "monthly" && cycle === "yearly") || (prefs.cycles === "yearly" && cycle === "monthly")) return { error: "Esse ciclo de cobrança não está disponível." };
  const price = cycle === "yearly" ? info.yearly : info.price;
  if (!price) return { error: "Este plano não tem cobrança anual." };
  let cpfCnpj = user.cpfCnpj;
  if (p.needsCpf) {
    const c = onlyDigits(cpf || user.cpfCnpj || "");
    if (!(validCpf(c) || c.length === 14)) return { error: "Informe um CPF válido para emitir a cobrança." };
    cpfCnpj = c; if (c !== user.cpfCnpj) await db.user.update({ where: { id: user.id }, data: { cpfCnpj: c } });
  }
  const sub = await db.subscription.create({ data: { userId: user.id, provider: p.id, plan, cycle, priceCents: price } });
  try {
    const r = await p.createCheckout({ userId: user.id, name: user.name, email: user.email, cpfCnpj, plan, planName: info.name, cycle, priceCents: price, trialDays: info.trialDays, methods: prefs.methods,
      successUrl: `${appUrl()}/ajustes?assinatura=ok#plano`, cancelUrl: `${appUrl()}/ajustes#plano`, webhookUrl: `${appUrl()}/api/billing/webhook/${p.id}` });
    await db.subscription.update({ where: { id: sub.id }, data: { checkoutUrl: r.url, externalId: r.externalId, externalCustomerId: r.customerId } });
    return { url: r.url };
  } catch (e: any) {
    await db.subscription.update({ where: { id: sub.id }, data: { status: "canceled", canceledAt: new Date() } });
    console.error("checkout", e);
    return { error: "Não consegui abrir o pagamento agora. Tente de novo em alguns minutos." };
  }
}

/** Cancelamento em 2 toques, sem retencao (RF-145): o plano vale ate o fim do periodo pago. */
export async function cancelSubscription(): Promise<{ error?: string; until?: string | null }> {
  const user = await requireUser();
  const sub = await db.subscription.findFirst({ where: { userId: user.id, status: { in: ["active", "past_due", "pending"] } }, orderBy: { createdAt: "desc" } });
  if (sub?.externalId) {
    const p = await getProvider();
    try { await p?.cancel(sub.externalId); }
    catch (e: any) { if (!/ 404/.test(String(e?.message))) { console.error("cancel", e); return { error: "Não consegui cancelar no gateway agora. Tente de novo; se persistir, fale com o suporte." }; } } // 404: ja nao existe no gateway
  }
  if (sub) await db.subscription.update({ where: { id: sub.id }, data: { status: "canceled", canceledAt: new Date() } });
  const until = user.planRenewsAt && user.planRenewsAt > new Date() ? user.planRenewsAt : null;
  await db.user.update({ where: { id: user.id }, data: until ? { planCanceledAt: new Date() } : { plan: "FREE", planRenewsAt: null, planCanceledAt: new Date() } });
  revalidatePath("/ajustes");
  return { until: until?.toISOString() ?? null };
}
