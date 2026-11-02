import { cfg, loadBillingConfig } from "./config";
// Aplica eventos do gateway nas assinaturas e no plano do usuario.
import { db } from "../db";
import type { BillingUpdate } from "./index";

export async function applyBillingUpdate(provider: string, u: BillingUpdate) {
  const dup = await db.billingEvent.findUnique({ where: { provider_eventId: { provider, eventId: u.eventId } } });
  if (dup) return "duplicado";
  await db.billingEvent.create({ data: { provider, eventId: u.eventId, type: u.type, payload: u.raw as any } });
  if (!u.status) return "ignorado";
  let sub = u.externalId ? await db.subscription.findUnique({ where: { externalId: u.externalId } }) : null;
  if (!sub && u.userId) sub = await db.subscription.findFirst({ where: { userId: u.userId, provider, status: { in: ["pending", "active", "past_due"] } }, orderBy: { createdAt: "desc" } });
  if (!sub) return "sem assinatura";
  const periodEnd = u.periodEnd ?? sub.currentPeriodEnd;
  await db.subscription.update({ where: { id: sub.id }, data: { status: u.status, ...(u.externalId && !sub.externalId ? { externalId: u.externalId } : {}), ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}), ...(u.status === "canceled" ? { canceledAt: new Date() } : {}) } });
  if (u.status === "active") await db.user.update({ where: { id: sub.userId }, data: { plan: sub.plan, planRenewsAt: periodEnd, planCanceledAt: null } });
  if (u.status === "canceled") await db.user.update({ where: { id: sub.userId }, data: { planCanceledAt: new Date(), planRenewsAt: periodEnd } });
  await expireSubscriptions(sub.userId);
  return "ok";
}

/** Fim do periodo pago apos cancelamento, ou atraso alem da tolerancia (Backoffice > Pagamentos): volta para o Gratis. */
export async function expireSubscriptions(userId?: string) {
  await loadBillingConfig();
  const now = new Date(); const grace = new Date(Date.now() - Number(cfg("BILLING_GRACE_DAYS") || 5) * 86400000);
  const r1 = await db.user.updateMany({ where: { ...(userId ? { id: userId } : {}), plan: { not: "FREE" }, planCanceledAt: { not: null }, planRenewsAt: { lt: now } }, data: { plan: "FREE", planRenewsAt: null } });
  const late = await db.subscription.findMany({ where: { ...(userId ? { userId } : {}), status: "past_due", currentPeriodEnd: { lt: grace } }, select: { userId: true } });
  if (late.length) await db.user.updateMany({ where: { id: { in: late.map((l) => l.userId) }, plan: { not: "FREE" } }, data: { plan: "FREE", planRenewsAt: null } });
  return r1.count + late.length;
}
