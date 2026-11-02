"use server";
// Cadastro de usuarios do sistema (Clientes e Administradores) — somente administradores.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createDefaultCategories } from "@/lib/setup-user";
import { clearPlansCache, getPlans } from "@/lib/plans";
import { SECRET_FIELDS, encryptJson, decryptJson, loadBillingConfig } from "@/lib/billing/config";
import { provider } from "@/lib/billing";


export type AdminState = { error?: string; ok?: string; tempPassword?: string; id?: string; email?: string } | undefined;

/** Senha provisoria legivel (sem 0/O/1/l), trocada no primeiro acesso. */
function tempPassword() {
  const abc = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 10 }, () => abc[randomInt(abc.length)]).join("");
}

async function audit(actorId: string, action: string, targetId: string | null, detail?: string) {
  await db.auditLog.create({ data: { actorId, action, targetId, detail } });
}

async function activeAdmins(exceptId?: string) {
  return db.user.count({ where: { role: "ADMIN", active: true, ...(exceptId ? { id: { not: exceptId } } : {}) } });
}

const userSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  phone: z.string().trim().max(20).optional().transform((v) => v || null),
  role: z.enum(["CLIENT", "ADMIN"]),
  plan: z.string().trim().min(1, "Escolha um plano"),
});

export async function createUser(_: AdminState, fd: FormData): Promise<AdminState> {
  const me = await requireAdmin();
  const p = userSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  if (!(p.data.plan in (await getPlans()))) return { error: "Plano inválido" };
  if (await db.user.findUnique({ where: { email: p.data.email } })) return { error: "Já existe um usuário com esse e-mail" };
  const manual = String(fd.get("password") || "");
  if (manual && manual.length < 8) return { error: "A senha precisa de pelo menos 8 caracteres" };
  const password = manual || tempPassword();
  const user = await db.user.create({ data: { ...p.data, passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true } });
  await createDefaultCategories(user.id);
  await audit(me.id, "user.create", user.id, `${p.data.role === "ADMIN" ? "Administrador" : "Cliente"} ${p.data.email}`);
  revalidatePath("/admin/usuarios");
  return { ok: "Usuário criado", tempPassword: password, id: user.id, email: user.email };
}

export async function updateUser(_: AdminState, fd: FormData): Promise<AdminState> {
  const me = await requireAdmin();
  const id = String(fd.get("id"));
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return { error: "Usuário não encontrado" };
  const p = userSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  if (!(p.data.plan in (await getPlans()))) return { error: "Plano inválido" };
  if (p.data.email !== target.email && (await db.user.findUnique({ where: { email: p.data.email } }))) return { error: "Já existe um usuário com esse e-mail" };
  if (target.role === "ADMIN" && p.data.role !== "ADMIN") {
    if (target.id === me.id) return { error: "Você não pode tirar o seu próprio acesso de administrador" };
    if ((await activeAdmins(target.id)) === 0) return { error: "O sistema precisa de pelo menos um administrador ativo" };
  }
  const changes = (["name", "email", "phone", "role", "plan"] as const).filter((k) => (target as any)[k] !== (p.data as any)[k]);
  await db.user.update({ where: { id }, data: { ...p.data, ...(p.data.plan !== target.plan ? { planRenewsAt: p.data.plan === "FREE" ? null : new Date(Date.now() + 30 * 86400000) } : {}) } });
  const LABEL = { name: "nome", email: "e-mail", phone: "telefone", role: "papel", plan: "plano" } as const;
  if (changes.length) await audit(me.id, "user.update", id, `Alterou: ${changes.map((k) => LABEL[k]).join(", ")}`);
  revalidatePath("/admin/usuarios"); revalidatePath(`/admin/usuarios/${id}`);
  return { ok: changes.length ? "Alterações salvas" : "Nada mudou" };
}

export async function setUserActive(id: string, active: boolean): Promise<AdminState> {
  const me = await requireAdmin();
  if (id === me.id) return { error: "Você não pode bloquear o seu próprio acesso" };
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return { error: "Usuário não encontrado" };
  if (!active && target.role === "ADMIN" && (await activeAdmins(id)) === 0) return { error: "O sistema precisa de pelo menos um administrador ativo" };
  await db.user.update({ where: { id }, data: { active } });
  await audit(me.id, active ? "user.unblock" : "user.block", id, target.email);
  revalidatePath("/admin/usuarios"); revalidatePath(`/admin/usuarios/${id}`);
  return { ok: active ? "Acesso liberado" : "Acesso bloqueado. A pessoa não consegue mais entrar." };
}

export async function resetPassword(id: string): Promise<AdminState> {
  const me = await requireAdmin();
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return { error: "Usuário não encontrado" };
  const password = tempPassword();
  await db.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true } });
  await audit(me.id, "user.reset_password", id, target.email);
  return { ok: "Senha provisória gerada", tempPassword: password };
}

export async function deleteUser(_: AdminState, fd: FormData): Promise<AdminState> {
  const me = await requireAdmin();
  const id = String(fd.get("id"));
  if (id === me.id) return { error: "Para excluir a sua própria conta, use Ajustes > Privacidade" };
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return { error: "Usuário não encontrado" };
  if (String(fd.get("confirm") || "").trim().toLowerCase() !== target.email) return { error: "Digite o e-mail do usuário para confirmar" };
  if (target.role === "ADMIN" && (await activeAdmins(id)) === 0) return { error: "O sistema precisa de pelo menos um administrador ativo" };
  await db.user.delete({ where: { id } }); // apaga lancamentos, contas e comprovantes (cascade)
  await audit(me.id, "user.delete", null, `${target.role === "ADMIN" ? "Administrador" : "Cliente"} ${target.email}`);
  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios?excluido=1");
}

// ---------- Planos e cobranca ----------

export async function savePlanConfig(_: AdminState, fd: FormData): Promise<AdminState> {
  const me = await requireAdmin();
  const isNew = fd.get("new") === "1";
  const name = String(fd.get("name") || "").trim();
  const slug = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24);
  const code = isNew ? slug(name) : String(fd.get("code") || "");
  if (!name) return { error: "Informe o nome do plano" };
  if (!code) return { error: "Use letras ou números no nome do plano" };
  const plans = await getPlans();
  if (isNew && plans[code]) return { error: "Já existe um plano com esse nome" };
  if (!isNew && !plans[code]) return { error: "Plano não encontrado" };
  if (Object.values(plans).some((p) => p.code !== code && p.name.toLowerCase() === name.toLowerCase())) return { error: "Já existe um plano com esse nome" };
  const money = (k: string) => { const s = String(fd.get(k) || "").replace(/[R$\s.]/g, "").replace(",", "."); if (!s) return null; const n = Math.round(Number(s) * 100); return Number.isFinite(n) && n >= 0 ? n : NaN; };
  const int = (k: string, def = 0) => { const raw = fd.get(k); if (raw === null || raw === "") return def; const n = Number(raw); return Number.isInteger(n) && n >= 0 ? n : NaN; };
  const featured = fd.get("featured") === "on";
  const data = { name, description: String(fd.get("description") || "").trim(), priceMonthlyCents: money("price") ?? 0, priceYearlyCents: money("yearly"),
    receiptsLimit: int("receipts"), chatLimit: int("chat"), members: int("members", 1) || 1, active: fd.get("active") === "on" || code === "FREE",
    trialDays: int("trial"), featured, sortOrder: int("sort", plans[code]?.sortOrder ?? Object.keys(plans).length),
    features: String(fd.get("features") || "").split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 12) };
  if ([data.priceMonthlyCents, data.priceYearlyCents ?? 0, data.receiptsLimit, data.chatLimit, data.members, data.trialDays, data.sortOrder].some((n) => Number.isNaN(n))) return { error: "Confira os valores: use números positivos" };
  if (code === "FREE" && data.priceMonthlyCents > 0) return { error: "O plano Grátis não pode ter preço" };
  if (code !== "FREE" && data.priceMonthlyCents < 500) return { error: "Preço mensal mínimo de R$ 5,00 (limite dos gateways)" };
  if (data.priceYearlyCents && data.priceYearlyCents >= data.priceMonthlyCents * 12) return { error: "O anual precisa sair mais barato que 12 mensalidades" };
  if (data.trialDays > 30) return { error: "O teste grátis pode ter no máximo 30 dias" };
  if (code === "FREE") data.trialDays = 0;
  if (featured) await db.planConfig.updateMany({ where: { code: { not: code } }, data: { featured: false } });
  // Planos de fabrica ainda nao salvos: grava-los evita que voltem a aparecer como destaque
  if (featured) for (const p of Object.values(plans)) if (p.code !== code && p.featured && !(await db.planConfig.findUnique({ where: { code: p.code } })))
    await db.planConfig.create({ data: { code: p.code, name: p.name, description: p.description, priceMonthlyCents: p.price, priceYearlyCents: p.yearly, receiptsLimit: p.receipts, chatLimit: p.chat, members: p.members, active: p.active, trialDays: p.trialDays, featured: false, features: p.features, sortOrder: p.sortOrder } });
  await db.planConfig.upsert({ where: { code }, update: data, create: { code, ...data } });
  clearPlansCache();
  await audit(me.id, isNew ? "plan.create" : "plan.update", null, `${data.name}: R$ ${(data.priceMonthlyCents / 100).toFixed(2)}/mês, ${data.receiptsLimit} comprovantes, ${data.chatLimit} perguntas${data.trialDays ? `, ${data.trialDays} dias grátis` : ""}`);
  revalidatePath("/admin/planos"); revalidatePath("/");
  return { ok: isNew ? `Plano ${data.name} criado.` : `Plano ${data.name} salvo. Vale para novas assinaturas; quem já assina mantém o preço até você reajustar no gateway.` };
}

/** Exclui um plano criado. Os de fabrica e os que tem clientes so podem ser pausados. */
export async function deletePlan(code: string): Promise<AdminState> {
  const me = await requireAdmin();
  if (code === "FREE") return { error: "O plano Grátis não pode ser excluído" };
  const users = await db.user.count({ where: { plan: code } });
  if (users) return { error: `${users} ${users === 1 ? "cliente usa" : "clientes usam"} este plano. Pause as vendas em vez de excluir, ou mude os clientes de plano antes.` };
  const subs = await db.subscription.count({ where: { plan: code, status: { in: ["active", "pending", "past_due"] } } });
  if (subs) return { error: "Há assinaturas em andamento neste plano. Pause as vendas em vez de excluir." };
  const p = (await getPlans())[code];
  if (["PRO", "FAMILY"].includes(code)) await db.planConfig.upsert({ where: { code }, update: { active: false }, create: { code, name: p.name, description: p.description, priceMonthlyCents: p.price, priceYearlyCents: p.yearly, receiptsLimit: p.receipts, chatLimit: p.chat, members: p.members, active: false } });
  else await db.planConfig.delete({ where: { code } }).catch(() => null);
  clearPlansCache();
  await audit(me.id, "plan.delete", null, `${p?.name ?? code}${["PRO", "FAMILY"].includes(code) ? " (plano de fábrica: vendas pausadas)" : ""}`);
  revalidatePath("/admin/planos"); revalidatePath("/");
  return { ok: ["PRO", "FAMILY"].includes(code) ? "Planos de fábrica não são apagados: as vendas foram pausadas." : "Plano excluído." };
}

// ---------- Gateway de pagamento (Backoffice > Pagamentos) ----------
export type PayState = { ok?: string; error?: string } | undefined;
export async function savePaymentConfig(_: PayState, fd: FormData): Promise<PayState> {
  const me = await requireAdmin();
  const provider = String(fd.get("provider") || "");
  if (!SECRET_FIELDS[provider]) return { error: "Escolha o provedor" };
  const env = fd.get("env") === "production" ? "production" : "sandbox";
  const cur = await db.paymentConfig.findUnique({ where: { id: "default" } });
  const secrets = await decryptJson(cur?.secretsEnc);
  let changed = 0;
  for (const f of SECRET_FIELDS[provider]) { const v = String(fd.get(f.key) || "").trim(); if (v) { secrets[f.key] = v; changed++; } }
  if (provider === "stripe" && secrets.STRIPE_SECRET_KEY && !/^sk_(test|live)_/.test(secrets.STRIPE_SECRET_KEY)) return { error: "A chave secreta da Stripe começa com sk_test_ ou sk_live_" };
  if (provider === "stripe" && secrets.STRIPE_WEBHOOK_SECRET && !secrets.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) return { error: "O segredo do webhook da Stripe começa com whsec_" };
  if (provider === "asaas" && secrets.ASAAS_API_KEY && !secrets.ASAAS_API_KEY.startsWith("$aact_")) return { error: "A chave de API do Asaas começa com $aact_" };
  if (provider === "asaas" && secrets.ASAAS_WEBHOOK_TOKEN && secrets.ASAAS_WEBHOOK_TOKEN.length < 16) return { error: "Use um token de webhook com pelo menos 16 caracteres" };
  const methods = ["pix", "boleto", "card"].filter((m) => fd.get(`m_${m}`) === "on");
  if (!methods.length) return { error: "Marque pelo menos uma forma de pagamento" };
  const cycles = ["both", "monthly", "yearly"].includes(String(fd.get("cycles"))) ? String(fd.get("cycles")) : "both";
  const graceDays = Math.max(0, Math.min(30, Number(fd.get("grace")) || 0));
  const data = { provider, env, secretsEnc: await encryptJson(secrets), methods, cycles, graceDays, ...(changed || cur?.provider !== provider || cur?.env !== env ? { testedAt: null, testOk: null, testMsg: null } : {}) };
  await db.paymentConfig.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } });
  await loadBillingConfig(true);
  await audit(me.id, "billing.config", null, `Gateway ${provider} (${env === "production" ? "produção" : "teste"})${changed ? `, ${changed} chave(s) atualizada(s)` : ""}`);
  revalidatePath("/admin/pagamentos"); revalidatePath("/admin/planos");
  return { ok: changed ? "Configuração salva. Agora clique em Testar conexão." : "Configuração salva." };
}

export async function testPaymentConfig(): Promise<PayState> {
  const me = await requireAdmin();
  await loadBillingConfig(true);
  const p = provider();
  let ok = false, msg = "";
  if (!p) msg = "Faltam chaves: preencha todos os campos do provedor e salve.";
  else { try { msg = await p.test(); ok = true; } catch (e: any) { msg = `Não conectou: ${String(e?.message || e).slice(0, 180)}`; } }
  await db.paymentConfig.update({ where: { id: "default" }, data: { testedAt: new Date(), testOk: ok, testMsg: msg } }).catch(() => null);
  await audit(me.id, "billing.test", null, ok ? "Conexão com o gateway ok" : "Falha no teste do gateway");
  revalidatePath("/admin/pagamentos");
  return ok ? { ok: msg } : { error: msg };
}

export async function clearPaymentKeys(): Promise<PayState> {
  const me = await requireAdmin();
  await db.paymentConfig.update({ where: { id: "default" }, data: { secretsEnc: null, testOk: null, testMsg: null, testedAt: null } }).catch(() => null);
  await loadBillingConfig(true);
  await audit(me.id, "billing.config", null, "Chaves do gateway apagadas");
  revalidatePath("/admin/pagamentos");
  return { ok: "Chaves apagadas." };
}
