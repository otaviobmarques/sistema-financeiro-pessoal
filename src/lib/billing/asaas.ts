// Asaas (Pix, boleto e cartao). Docs: https://docs.asaas.com — teste primeiro com ASAAS_ENV=sandbox.
import type { Provider } from "./index";

const base = () => (process.env.ASAAS_ENV === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3");
async function call(path: string, init: RequestInit = {}) {
  const r = await fetch(base() + path, { ...init, headers: { "content-type": "application/json", access_token: process.env.ASAAS_API_KEY ?? "", "user-agent": "Sobbra", ...(init.headers ?? {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Asaas ${r.status}: ${j?.errors?.[0]?.description ?? JSON.stringify(j).slice(0, 200)}`);
  return j;
}
const today = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10); // data de Brasilia

export const asaas: Provider = {
  id: "asaas", label: "Asaas (Pix, boleto e cartão)", needsCpf: true,
  envVars: ["ASAAS_API_KEY", "ASAAS_WEBHOOK_TOKEN", "ASAAS_ENV (sandbox ou production)"],
  configured: () => Boolean(process.env.ASAAS_API_KEY && process.env.ASAAS_WEBHOOK_TOKEN),
  async createCheckout(i) {
    if (!i.cpfCnpj) throw new Error("CPF obrigatório para emitir a cobrança");
    const customer = await call("/customers", { method: "POST", body: JSON.stringify({ name: i.name, email: i.email, cpfCnpj: i.cpfCnpj, externalReference: i.userId, notificationDisabled: false }) });
    const sub = await call("/subscriptions", { method: "POST", body: JSON.stringify({
      customer: customer.id, billingType: "UNDEFINED", value: i.priceCents / 100, nextDueDate: today(), cycle: i.cycle === "yearly" ? "YEARLY" : "MONTHLY",
      description: `Sobbra ${i.planName} (${i.cycle === "yearly" ? "anual" : "mensal"})`, externalReference: `${i.userId}:${i.plan}:${i.cycle}`,
      callback: { successUrl: i.successUrl, autoRedirect: true } }) });
    const pays = await call(`/subscriptions/${sub.id}/payments`);
    const url = pays?.data?.[0]?.invoiceUrl;
    if (!url) throw new Error("Asaas não retornou o link de pagamento");
    return { url, externalId: sub.id, customerId: customer.id };
  },
  async cancel(id) { await call(`/subscriptions/${id}`, { method: "DELETE" }); },
  async parseWebhook(req, body) {
    if (req.headers.get("asaas-access-token") !== process.env.ASAAS_WEBHOOK_TOKEN) return null;
    const j = JSON.parse(body); const p = j.payment ?? {}; const s = j.subscription ?? {};
    const ref = String(p.externalReference ?? s.externalReference ?? "");
    const map: Record<string, "active" | "past_due" | "canceled"> = { PAYMENT_CONFIRMED: "active", PAYMENT_RECEIVED: "active", PAYMENT_OVERDUE: "past_due", SUBSCRIPTION_DELETED: "canceled", SUBSCRIPTION_INACTIVATED: "canceled", PAYMENT_REFUNDED: "canceled" };
    const next = p.dueDate ? new Date(p.dueDate + "T23:59:59-03:00") : null;
    if (next && (j.event === "PAYMENT_CONFIRMED" || j.event === "PAYMENT_RECEIVED")) next.setMonth(next.getMonth() + (String(ref).endsWith(":yearly") ? 12 : 1));
    return { eventId: String(j.id ?? `${j.event}:${p.id ?? s.id}`), type: String(j.event), status: map[j.event] ?? null, externalId: p.subscription ?? s.id ?? null, userId: ref.split(":")[0] || null, periodEnd: next, raw: j };
  },
};
