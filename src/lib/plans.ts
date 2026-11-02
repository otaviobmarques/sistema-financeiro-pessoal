// Planos do SaaS (secao 9.1). Os valores padrao valem ate o administrador editar em Backoffice > Planos.
import { Plan } from "@prisma/client";
import { db } from "./db";

export const PLANS = {
  FREE: { name: "Grátis", price: 0, yearly: null as number | null, receipts: 15, chat: 10, members: 1, description: "Para começar a organizar" },
  PRO: { name: "Pro", price: 1990, yearly: 17900 as number | null, receipts: 1000, chat: 300, members: 1, description: "Leitura de comprovantes e consultor à vontade" },
  FAMILY: { name: "Família", price: 2990, yearly: 26900 as number | null, receipts: 1500, chat: 500, members: 5, description: "Até 5 pessoas" },
};
export type PlanInfo = { code: Plan; name: string; description: string; price: number; yearly: number | null; receipts: number; chat: number; members: number; active: boolean };

let cache: { at: number; plans: Record<Plan, PlanInfo> } | null = null;

export async function getPlans(): Promise<Record<Plan, PlanInfo>> {
  if (cache && Date.now() - cache.at < 3_000) return cache.plans; // cache curto: cada parte do app tem sua copia
  const rows = await db.planConfig.findMany();
  const out = {} as Record<Plan, PlanInfo>;
  for (const code of Object.keys(PLANS) as Plan[]) {
    const r = rows.find((x) => x.code === code), d = PLANS[code];
    out[code] = r ? { code, name: r.name, description: r.description, price: r.priceMonthlyCents, yearly: r.priceYearlyCents, receipts: r.receiptsLimit, chat: r.chatLimit, members: r.members, active: r.active }
      : { code, name: d.name, description: d.description, price: d.price, yearly: d.yearly, receipts: d.receipts, chat: d.chat, members: d.members, active: true };
  }
  cache = { at: Date.now(), plans: out };
  return out;
}
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

export async function canUse(userId: string, plan: Plan, what: "receipts" | "chat") {
  const [u, plans] = await Promise.all([usage(userId), getPlans()]);
  return u[what] < plans[plan][what];
}
