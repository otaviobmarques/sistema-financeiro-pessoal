import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyStripeSignature } from "./stripe";
import { asaas } from "./asaas";

test("assinatura do webhook da Stripe", () => {
  const body = '{"id":"evt_1"}', secret = "whsec_test", t = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  assert.equal(verifyStripeSignature(body, `t=${t},v1=${sig}`, secret), true);
  assert.equal(verifyStripeSignature(body + " ", `t=${t},v1=${sig}`, secret), false);
  assert.equal(verifyStripeSignature(body, `t=${t - 1000},v1=${sig}`, secret), false);
});

test("webhook do Asaas", async () => {
  process.env.ASAAS_WEBHOOK_TOKEN = "tok";
  const body = JSON.stringify({ id: "evt_9", event: "PAYMENT_CONFIRMED", payment: { id: "pay_1", subscription: "sub_1", dueDate: "2026-11-02", externalReference: "user1:PRO:monthly" } });
  const ok = await asaas.parseWebhook(new Request("http://x", { method: "POST", headers: { "asaas-access-token": "tok" } }), body);
  assert.equal(ok!.status, "active"); assert.equal(ok!.userId, "user1"); assert.equal(ok!.externalId, "sub_1"); assert.equal(ok!.periodEnd!.getMonth(), 11);
  assert.equal(await asaas.parseWebhook(new Request("http://x", { method: "POST", headers: { "asaas-access-token": "errado" } }), body), null);
});
