// Limites por plano (secao 9.1). Precos sao hipotese do documento.
import { Plan } from "@prisma/client";
import { db } from "./db";

export const PLANS = {
  FREE: { name: "Grátis", price: 0, receipts: 15, chat: 10 },
  PRO: { name: "Pro", price: 1990, yearly: 17900, receipts: 1000, chat: 300 },
  FAMILY: { name: "Família", price: 2990, receipts: 1500, chat: 500 },
} as const;

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
  const u = await usage(userId);
  return u[what] < PLANS[plan][what];
}
