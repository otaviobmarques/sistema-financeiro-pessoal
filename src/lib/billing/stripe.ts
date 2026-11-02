// Stripe (cartao, recorrencia). Usa a API REST diretamente; webhook com verificacao de assinatura.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Provider } from "./index";

async function call(path: string, params?: Record<string, string>, method = "POST") {
  const r = await fetch("https://api.stripe.com/v1" + path, { method, headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" }, body: params ? new URLSearchParams(params) : undefined });
  const j = await r.json();
  if (!r.ok) throw new Error(`Stripe ${r.status}: ${j?.error?.message ?? ""}`);
  return j;
}

/** Valida o cabecalho Stripe-Signature (t=...,v1=...) com tolerancia de 5 minutos. */
export function verifyStripeSignature(body: string, header: string | null, secret: string, now = Date.now()) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((x) => x.split("=") as [string, string]));
  const t = Number(parts.t); if (!t || Math.abs(now / 1000 - t) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  const got = header.split(",").filter((x) => x.startsWith("v1=")).map((x) => x.slice(3));
  return got.some((g) => g.length === expected.length && timingSafeEqual(Buffer.from(g), Buffer.from(expected)));
}

export const stripe: Provider = {
  id: "stripe", label: "Stripe (cartão)", needsCpf: false,
  envVars: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  configured: () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
  async createCheckout(i) {
    const ref = `${i.userId}:${i.plan}:${i.cycle}`;
    const s = await call("/checkout/sessions", {
      mode: "subscription", success_url: i.successUrl, cancel_url: i.cancelUrl, customer_email: i.email, client_reference_id: ref, locale: "pt-BR",
      "line_items[0][quantity]": "1", "line_items[0][price_data][currency]": "brl", "line_items[0][price_data][unit_amount]": String(i.priceCents),
      "line_items[0][price_data][recurring][interval]": i.cycle === "yearly" ? "year" : "month", "line_items[0][price_data][product_data][name]": `Sobbra ${i.planName}`,
      "subscription_data[metadata][ref]": ref,
    });
    return { url: s.url, externalId: null, customerId: null };
  },
  async cancel(id) { await call(`/subscriptions/${id}`, undefined, "DELETE"); },
  async parseWebhook(req, body) {
    if (!verifyStripeSignature(body, req.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET ?? "")) return null;
    const e = JSON.parse(body); const o = e.data?.object ?? {};
    const ref = String(o.client_reference_id ?? o.metadata?.ref ?? o.subscription_details?.metadata?.ref ?? o.parent?.subscription_details?.metadata?.ref ?? "");
    const map: Record<string, "active" | "past_due" | "canceled"> = { "checkout.session.completed": "active", "invoice.paid": "active", "invoice.payment_failed": "past_due", "customer.subscription.deleted": "canceled" };
    const periodEnd = o.lines?.data?.[0]?.period?.end ? new Date(o.lines.data[0].period.end * 1000) : o.current_period_end ? new Date(o.current_period_end * 1000) : null;
    const sub = o.object === "subscription" ? o.id : o.subscription ?? o.parent?.subscription_details?.subscription ?? null;
    return { eventId: String(e.id), type: String(e.type), status: map[e.type] ?? null, externalId: sub, userId: ref.split(":")[0] || null, periodEnd, raw: e };
  },
};
