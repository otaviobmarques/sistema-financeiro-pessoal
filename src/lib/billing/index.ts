// Camada de cobranca do SaaS. O gateway e escolhido por PAYMENT_PROVIDER ("asaas" ou "stripe").
// Sem configuracao, o app mostra "assinatura em breve" e so o administrador muda planos.
import { asaas } from "./asaas";
import { stripe } from "./stripe";
import { cfg, loadBillingConfig } from "./config";

export type Cycle = "monthly" | "yearly";
export type CheckoutInput = { userId: string; name: string; email: string; cpfCnpj?: string | null; plan: string; planName: string; trialDays?: number; methods?: string[]; cycle: Cycle; priceCents: number; successUrl: string; cancelUrl: string; webhookUrl: string };
export type CheckoutResult = { url: string; externalId: string | null; customerId: string | null };
/** Evento normalizado do gateway. */
export type BillingUpdate = { eventId: string; type: string; status: "active" | "past_due" | "canceled" | null; externalId: string | null; userId: string | null; periodEnd: Date | null; raw: unknown };

export interface Provider {
  id: "asaas" | "stripe";
  label: string;
  needsCpf: boolean;
  envVars: string[];
  configured(): boolean;
  createCheckout(i: CheckoutInput): Promise<CheckoutResult>;
  test(): Promise<string>;
  cancel(externalId: string): Promise<void>;
  parseWebhook(req: Request, body: string): Promise<BillingUpdate | null>;
}

export const PROVIDERS: Record<string, Provider> = { asaas, stripe };

export function provider(): Provider | null {
  const p = PROVIDERS[cfg("PAYMENT_PROVIDER").toLowerCase()];
  return p && p.configured() ? p : null;
}
export function providerStatus() {
  const chosen = cfg("PAYMENT_PROVIDER").toLowerCase();
  return Object.values(PROVIDERS).map((p) => ({ id: p.id, label: p.label, chosen: chosen === p.id, configured: p.configured(), envVars: p.envVars, missing: p.envVars.filter((v) => !cfg(v) && !v.includes("(")) }));
}
/** Gateway em uso, lendo antes a configuracao salva no Backoffice. */
export async function getProvider(): Promise<Provider | null> { await loadBillingConfig(); return provider(); }
export async function billingPrefs() {
  await loadBillingConfig();
  return { methods: (cfg("BILLING_METHODS") || "pix,boleto,card").split(",").filter(Boolean), cycles: (cfg("BILLING_CYCLES") || "both") as "both" | "monthly" | "yearly", graceDays: Number(cfg("BILLING_GRACE_DAYS") || 5) };
}
export const appUrl = () => (process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")).replace(/\/$/, "");
