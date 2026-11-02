// Planos do SaaS (secao 9.1). Os valores padrao valem ate o administrador editar em Backoffice > Planos.
import { db } from "./db";

/** Planos de fabrica. O administrador edita, cria novos e pausa em Backoffice > Planos e cobranca. */
export const PLANS: Record<string, { name: string; price: number; yearly: number | null; receipts: number; chat: number; members: number; description: string; trialDays: number; featured: boolean; features: string[]; sortOrder: number }> = {
  FREE: { name: "Grátis", price: 0, yearly: null, receipts: 15, chat: 10, members: 1, description: "Para começar a organizar", trialDays: 0, featured: false, features: [], sortOrder: 0 },
  PRO: { name: "Pro", price: 1990, yearly: 17900, receipts: 1000, chat: 300, members: 1, description: "Leitura de comprovantes e consultor à vontade", trialDays: 7, featured: true, features: [], sortOrder: 1 },
  FAMILY: { name: "Família", price: 2990, yearly: 26900, receipts: 1500, chat: 500, members: 5, description: "Até 5 pessoas", trialDays: 7, featured: false, features: [], sortOrder: 2 },
};
export type PlanInfo = { code: string; name: string; description: string; price: number; yearly: number | null; receipts: number; chat: number; members: number; active: boolean; trialDays: number; featured: boolean; features: string[]; sortOrder: number };

let cache: { at: number; plans: Record<string, PlanInfo> } | null = null;

/** Todos os planos (de fabrica + criados), em ordem de exibicao. Codigo desconhecido cai no Gratis com planOf(). */
export async function getPlans(): Promise<Record<string, PlanInfo>> {
  if (cache && Date.now() - cache.at < 3_000) return cache.plans; // cache curto: cada parte do app tem sua copia
  const rows = await db.planConfig.findMany();
  const list: PlanInfo[] = Object.entries(PLANS).filter(([code]) => !rows.some((r) => r.code === code)).map(([code, d]) => ({ code, ...d, active: true }));
  for (const r of rows) list.push({ code: r.code, name: r.name, description: r.description, price: r.priceMonthlyCents, yearly: r.priceYearlyCents, receipts: r.receiptsLimit, chat: r.chatLimit, members: r.members, active: r.active, trialDays: r.trialDays, featured: r.featured, features: r.features, sortOrder: r.sortOrder });
  list.sort((a, b) => (a.code === "FREE" ? -1 : b.code === "FREE" ? 1 : a.sortOrder - b.sortOrder || a.price - b.price));
  const out = Object.fromEntries(list.map((p) => [p.code, p]));
  cache = { at: Date.now(), plans: out };
  return out;
}
export const planOf = (plans: Record<string, PlanInfo>, code: string) => plans[code] ?? plans.FREE;
export const clearPlansCache = () => { cache = null; };

const startOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); };

export async function usage(userId: string) {
  const since = startOfMonth();
  const [receipts, chat] = await Promise.all([
    db.receipt.count({ where: { userId, createdAt: { gte: since } } }),
    db.chatMessage.count({ where: { userId, role: "user", createdAt: { gte: since } } }),
  ]);
  return { receipts, chat };
}

export async function canUse(userId: string, plan: string, what: "receipts" | "chat") {
  const [u, plans] = await Promise.all([usage(userId), getPlans()]);
  return u[what] < planOf(plans, plan)[what];
}
