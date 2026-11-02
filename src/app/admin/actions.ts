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
import { clearPlansCache } from "@/lib/plans";


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
  plan: z.enum(["FREE", "PRO", "FAMILY"]),
});

export async function createUser(_: AdminState, fd: FormData): Promise<AdminState> {
  const me = await requireAdmin();
  const p = userSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
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
  const code = String(fd.get("code")) as "FREE" | "PRO" | "FAMILY";
  if (!["FREE", "PRO", "FAMILY"].includes(code)) return { error: "Plano inválido" };
  const money = (k: string) => { const s = String(fd.get(k) || "").replace(/[R$\s.]/g, "").replace(",", "."); if (!s) return null; const n = Math.round(Number(s) * 100); return Number.isFinite(n) && n >= 0 ? n : NaN; };
  const int = (k: string) => { const n = Number(fd.get(k)); return Number.isInteger(n) && n >= 0 ? n : NaN; };
  const data = { name: String(fd.get("name") || "").trim(), description: String(fd.get("description") || "").trim(), priceMonthlyCents: money("price") ?? 0, priceYearlyCents: money("yearly"),
    receiptsLimit: int("receipts"), chatLimit: int("chat"), members: int("members") || 1, active: fd.get("active") === "on" || code === "FREE" };
  if (!data.name) return { error: "Informe o nome do plano" };
  if ([data.priceMonthlyCents, data.priceYearlyCents ?? 0, data.receiptsLimit, data.chatLimit].some((n) => Number.isNaN(n))) return { error: "Confira os valores: use números positivos" };
  if (code === "FREE" && data.priceMonthlyCents > 0) return { error: "O plano Grátis não pode ter preço" };
  if (code !== "FREE" && data.priceMonthlyCents < 500) return { error: "Preço mensal mínimo de R$ 5,00 (limite dos gateways)" };
  await db.planConfig.upsert({ where: { code }, update: data, create: { code, ...data } });
  clearPlansCache();
  await audit(me.id, "plan.update", null, `${data.name}: R$ ${(data.priceMonthlyCents / 100).toFixed(2)}/mês, ${data.receiptsLimit} comprovantes, ${data.chatLimit} perguntas`);
  revalidatePath("/admin/planos"); revalidatePath("/");
  return { ok: `Plano ${data.name} salvo. Vale para novas assinaturas; quem já assina mantém o preço até você reajustar no gateway.` };
}
