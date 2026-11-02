"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AccountType, TxType } from "@prisma/client";
import { db } from "@/lib/db";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { createDefaultCategories } from "@/lib/setup-user";
import { createTransaction, softDelete } from "@/lib/finance";
import { classify, learn } from "@/lib/classify";
import { parseMoney } from "@/lib/money";
import { keyOf, normalizeMerchant } from "@/lib/normalize";

export type FormState = { error?: string; ok?: string } | undefined;

// ---------- Conta e onboarding (M1) ----------
const signupSchema = z.object({
  name: z.string().min(2, "Diga como podemos te chamar"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres"),
});

export async function signup(_: FormState, fd: FormData): Promise<FormState> {
  const p = signupSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const email = p.data.email.toLowerCase().trim();
  if (await db.user.findUnique({ where: { email } })) return { error: "Já existe uma conta com esse e-mail" };
  const user = await db.user.create({ data: { name: p.data.name.trim(), email, passwordHash: await bcrypt.hash(p.data.password, 12) } });
  await createDefaultCategories(user.id);
  await createSession(user.id);
  redirect("/onboarding");
}

// Protecao simples contra forca bruta (RNF-03); em producao usar Redis
const attempts = new Map<string, { n: number; until: number }>();

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") || "").toLowerCase().trim();
  const a = attempts.get(email);
  if (a && a.until > Date.now()) return { error: "Muitas tentativas. Aguarde alguns minutos." };
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(String(fd.get("password") || ""), user.passwordHash))) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(email, { n, until: n >= 5 ? Date.now() + 5 * 60000 : 0 });
    return { error: "E-mail ou senha incorretos" };
  }
  attempts.delete(email);
  await createSession(user.id);
  redirect(user.onboarded ? "/inicio" : "/onboarding");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function finishOnboarding(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const income = parseMoney(String(fd.get("income") || ""));
  const goal = String(fd.get("goal") || "guardar");
  const bank = String(fd.get("bank") || "").trim();
  const initial = parseMoney(String(fd.get("initial") || "")) ?? 0;
  const card = String(fd.get("card") || "").trim();
  if (!(await db.account.count({ where: { userId: user.id } }))) {
    await db.account.create({ data: { userId: user.id, name: "Carteira", type: "WALLET", color: "#FFB020" } });
    if (bank) await db.account.create({ data: { userId: user.id, name: bank, type: "CHECKING", institution: bank, initialCents: initial } });
    if (card) await db.account.create({ data: { userId: user.id, name: card, type: "CREDIT_CARD", institution: card, color: "#8B5CF6",
      limitCents: parseMoney(String(fd.get("limit") || "")) ?? 0, closingDay: Number(fd.get("closing") || 1), dueDay: Number(fd.get("due") || 10) } });
  }
  await db.user.update({ where: { id: user.id }, data: { monthlyIncome: income, goal, onboarded: true } });
  redirect("/inicio");
}

// ---------- Contas e cartoes (M2) ----------
export async function saveAccount(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(fd.get("id") || "");
  const type = String(fd.get("type")) as AccountType;
  if (!Object.values(AccountType).includes(type)) return { error: "Tipo inválido" };
  const name = String(fd.get("name") || "").trim();
  if (!name) return { error: "Dê um nome para a conta" };
  const data = {
    name, type, institution: String(fd.get("institution") || "") || null, color: String(fd.get("color") || "#19C37D"),
    initialCents: parseMoney(String(fd.get("initial") || "0")) ?? 0,
    limitCents: type === "CREDIT_CARD" ? parseMoney(String(fd.get("limit") || "0")) : null,
    closingDay: type === "CREDIT_CARD" ? Number(fd.get("closing") || 1) : null,
    dueDay: type === "CREDIT_CARD" ? Number(fd.get("due") || 10) : null,
  };
  if (id) await db.account.updateMany({ where: { id, userId: user.id }, data });
  else await db.account.create({ data: { ...data, userId: user.id } });
  revalidatePath("/contas");
  return { ok: "Conta salva" };
}

export async function archiveAccount(id: string) {
  const user = await requireUser();
  await db.account.updateMany({ where: { id, userId: user.id }, data: { archived: true } });
  revalidatePath("/contas");
}

/** Ajuste de saldo (RF-013): cria lancamento de diferenca. */
export async function adjustBalance(accountId: string, currentCents: number, desiredCents: number) {
  const user = await requireUser();
  const diff = desiredCents - currentCents;
  if (!diff) return;
  await createTransaction(user.id, { type: diff > 0 ? "INCOME" : "EXPENSE", amountCents: Math.abs(diff), description: "Ajuste de saldo", accountId, date: new Date(), origin: "MANUAL", tags: ["ajuste"] });
  revalidatePath("/contas"); revalidatePath("/inicio");
}

/** Pagamento de fatura = transferencia da conta para o cartao (RF-012). */
export async function payInvoice(cardId: string, fromAccountId: string, amountCents: number) {
  const user = await requireUser();
  await createTransaction(user.id, { type: "TRANSFER", amountCents, description: "Pagamento de fatura", accountId: fromAccountId, toAccountId: cardId, date: new Date() });
  revalidatePath(`/contas/${cardId}`); revalidatePath("/inicio");
}

// ---------- Lancamentos (M3) ----------
const txSchema = z.object({
  type: z.nativeEnum(TxType), amount: z.string().min(1, "Informe o valor"), description: z.string().default(""),
  accountId: z.string().min(1, "Escolha a conta"), toAccountId: z.string().optional(), categoryId: z.string().optional(),
  date: z.string().min(1), status: z.enum(["PAID", "PENDING"]).default("PAID"), installments: z.string().optional(),
  recurrence: z.string().optional(), tags: z.string().optional(), notes: z.string().optional(), merchant: z.string().optional(),
});

export async function saveTransaction(_: FormState, fd: FormData): Promise<FormState & { ids?: string[] }> {
  const user = await requireUser();
  const p = txSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const amountCents = parseMoney(p.data.amount);
  if (!amountCents || amountCents <= 0) return { error: "Valor inválido" };
  if (p.data.type === "TRANSFER" && (!p.data.toAccountId || p.data.toAccountId === p.data.accountId)) return { error: "Escolha a conta de destino" };
  let categoryId = p.data.categoryId || null;
  let confidence: number | null = null;
  if (!categoryId && p.data.type !== "TRANSFER") {
    const c = await classify(user.id, { text: p.data.description, merchant: p.data.merchant, kind: p.data.type as "INCOME" | "EXPENSE" });
    categoryId = c.categoryId; confidence = c.confidence;
  }
  const editId = String(fd.get("id") || "");
  const tags = (p.data.tags || "").split(/[\s,]+/).map((s) => s.replace(/^#/, "").trim()).filter(Boolean);
  const date = new Date(p.data.date + "T12:00:00");
  if (editId) {
    const old = await db.transaction.findFirst({ where: { id: editId, userId: user.id } });
    if (!old) return { error: "Lançamento não encontrado" };
    await db.transaction.update({ where: { id: editId }, data: { type: p.data.type, amountCents, description: p.data.description || old.description, accountId: p.data.accountId,
      toAccountId: p.data.type === "TRANSFER" ? p.data.toAccountId : null, categoryId, date, status: p.data.status, paidAt: p.data.status === "PAID" ? old.paidAt ?? date : null, tags, notes: p.data.notes || null } });
    if (categoryId && old.categoryId !== categoryId) await learn(user.id, old.merchant || old.description, categoryId);
    revalidatePath("/lancamentos"); revalidatePath("/inicio");
    return { ok: "Lançamento atualizado", ids: [editId] };
  }
  const ids = await createTransaction(user.id, {
    type: p.data.type, amountCents, description: p.data.description ? normalizeMerchant(p.data.description) : (p.data.type === "INCOME" ? "Entrada" : "Gasto"),
    accountId: p.data.accountId, toAccountId: p.data.toAccountId || null, categoryId, date, status: p.data.status,
    installments: p.data.installments ? Number(p.data.installments) : null, recurrence: p.data.recurrence === "monthly" ? "monthly" : null,
    merchant: p.data.merchant ? normalizeMerchant(p.data.merchant) : p.data.description && p.data.type !== "TRANSFER" ? normalizeMerchant(p.data.description) : null, tags, notes: p.data.notes || null, confidence,
  });
  revalidatePath("/lancamentos"); revalidatePath("/inicio");
  return { ok: "Pronto! Lançado.", ids };
}

export async function deleteTransactions(ids: string[]) {
  const user = await requireUser();
  await softDelete(user.id, ids);
  revalidatePath("/lancamentos"); revalidatePath("/inicio");
}

export async function restoreTransactions(ids: string[]) {
  const user = await requireUser();
  await db.transaction.updateMany({ where: { userId: user.id, id: { in: ids } }, data: { deletedAt: null } });
  revalidatePath("/lancamentos"); revalidatePath("/inicio"); revalidatePath("/lixeira");
}

export async function purgeTransaction(id: string) {
  const user = await requireUser();
  await db.transaction.deleteMany({ where: { userId: user.id, id, deletedAt: { not: null } } });
  revalidatePath("/lixeira");
}

export async function toggleStatus(id: string) {
  const user = await requireUser();
  const t = await db.transaction.findFirst({ where: { id, userId: user.id } });
  if (!t) return;
  await db.transaction.update({ where: { id }, data: { status: t.status === "PAID" ? "PENDING" : "PAID", paidAt: t.status === "PAID" ? null : new Date() } });
  revalidatePath("/lancamentos"); revalidatePath("/inicio");
}

/** Edicao em massa de categoria (RF-027) + opcao de criar regra (RF-042). */
export async function bulkCategorize(ids: string[], categoryId: string, makeRuleFor?: string) {
  const user = await requireUser();
  const cat = await db.category.findFirst({ where: { id: categoryId, userId: user.id } });
  if (!cat) return;
  const txs = await db.transaction.findMany({ where: { userId: user.id, id: { in: ids } } });
  await db.transaction.updateMany({ where: { userId: user.id, id: { in: ids } }, data: { categoryId, confidence: 1 } });
  for (const t of txs) await learn(user.id, t.merchant || t.description.replace(/\s*\(\d+\/\d+\)$/, ""), categoryId);
  if (makeRuleFor) {
    const matchText = keyOf(makeRuleFor);
    await db.rule.create({ data: { userId: user.id, matchText, categoryId } });
    await db.transaction.updateMany({ where: { userId: user.id, deletedAt: null, OR: [{ merchant: { contains: makeRuleFor, mode: "insensitive" } }, { description: { contains: makeRuleFor, mode: "insensitive" } }] }, data: { categoryId } });
  }
  revalidatePath("/lancamentos"); revalidatePath("/inicio");
}

export async function deleteRule(id: string) {
  const user = await requireUser();
  await db.rule.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/ajustes");
}

export async function saveCategory(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(fd.get("name") || "").trim();
  if (!name) return { error: "Informe o nome" };
  const id = String(fd.get("id") || "");
  const parentId = String(fd.get("parentId") || "") || null;
  const parent = parentId ? await db.category.findFirst({ where: { id: parentId, userId: user.id } }) : null;
  const data = { name, icon: String(fd.get("icon") || parent?.icon || "🏷️"), color: String(fd.get("color") || parent?.color || "#19C37D") };
  if (id) await db.category.updateMany({ where: { id, userId: user.id }, data });
  else await db.category.create({ data: { ...data, userId: user.id, kind: (parent?.kind ?? String(fd.get("kind") ?? "EXPENSE")) as TxType, parentId, slug: `custom.${Date.now()}` } });
  revalidatePath("/ajustes");
  return { ok: "Categoria salva" };
}

// ---------- Comprovantes (M4) ----------
export async function confirmReceipt(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const receiptId = String(fd.get("receiptId"));
  const r = await db.receipt.findFirst({ where: { id: receiptId, userId: user.id }, include: { transaction: true } });
  if (!r) return { error: "Comprovante não encontrado" };
  if (r.transaction) redirect("/comprovantes");
  const amountCents = parseMoney(String(fd.get("amount") || ""));
  if (!amountCents) return { error: "Confira o valor" };
  const type = String(fd.get("type")) === "INCOME" ? "INCOME" : "EXPENSE";
  const merchant = String(fd.get("merchant") || "").trim();
  const ex = (r.extracted ?? {}) as any;
  const categoryId = String(fd.get("categoryId") || "") || (await classify(user.id, { text: merchant, merchant, cnpj: ex.cnpj, kind: type })).categoryId;
  await createTransaction(user.id, {
    type, amountCents, description: merchant || "Comprovante", merchant: merchant || null, cnpj: ex.cnpj ?? null,
    accountId: String(fd.get("accountId")), categoryId, date: new Date(String(fd.get("date")) + "T12:00:00"),
    installments: Number(fd.get("installments") || 1), origin: "RECEIPT", receiptId: r.id,
    confidence: ex.categoryConfidence ?? null, notes: ex.items?.length ? ex.items.map((i: any) => `${i.quantity ?? 1}x ${i.description}`).join("\n").slice(0, 2000) : null,
  });
  // Aprendizado: se o usuario mudou a categoria sugerida, reforca a escolha dele
  if (categoryId && merchant) await learn(user.id, ex.cnpj || merchant, categoryId);
  await db.receipt.update({ where: { id: r.id }, data: { status: "CONFIRMED" } });
  revalidatePath("/comprovantes"); revalidatePath("/inicio");
  redirect("/comprovantes?ok=1");
}

export async function discardReceipt(id: string) {
  const user = await requireUser();
  await db.receipt.deleteMany({ where: { id, userId: user.id, status: { not: "CONFIRMED" } } });
  revalidatePath("/comprovantes");
}

// ---------- Preferencias, plano e LGPD ----------
export async function updatePrefs(data: { simpleMode?: boolean; hideValues?: boolean; reduceMotion?: boolean; dailyReminder?: string | null }) {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data });
  revalidatePath("/", "layout");
}

export async function changePlan(plan: "FREE" | "PRO" | "FAMILY") {
  const user = await requireUser();
  // Integracao com gateway (Asaas/Pagar.me/Stripe) entra aqui. No MVP, troca direta para testes.
  const renews = new Date(); renews.setMonth(renews.getMonth() + 1);
  await db.user.update({ where: { id: user.id }, data: plan === "FREE" ? { plan, planRenewsAt: null, planCanceledAt: new Date() } : { plan, planRenewsAt: renews, planCanceledAt: null, lastUpsellAt: new Date() } });
  revalidatePath("/ajustes");
}

export async function dismissUpsell() {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { lastUpsellAt: new Date() } });
}

export async function deleteAccount(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (String(fd.get("confirm") || "").trim().toUpperCase() !== "EXCLUIR") return { error: "Digite EXCLUIR para confirmar" };
  await db.user.delete({ where: { id: user.id } }); // cascade apaga tudo (RF-006)
  await destroySession();
  redirect("/?excluida=1");
}

/** Sugestao de categoria enquanto a pessoa digita (RF-163). Sem IA, para ser instantaneo. */
export async function suggestCategory(text: string, kind: "INCOME" | "EXPENSE") {
  const user = await requireUser();
  if (!text.trim()) return null;
  const c = await classify(user.id, { text, merchant: text, kind, useAi: false });
  return c.source === "padrao" ? null : c.categoryId;
}
