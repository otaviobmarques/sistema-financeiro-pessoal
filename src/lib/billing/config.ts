// Configuracao do gateway feita pelo Backoffice (tabela PaymentConfig), com as chaves criptografadas.
// Prioridade: o que foi salvo no Backoffice; sem isso, as variaveis de ambiente.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { db } from "../db";
import { fileKey } from "../secrets";

const runtime: Record<string, string> = {};
let loadedAt = 0;
/** Le uma configuracao de cobranca (ex.: ASAAS_API_KEY). */
export const cfg = (k: string) => runtime[k] ?? process.env[k] ?? "";

export const SECRET_FIELDS: Record<string, { key: string; label: string; placeholder: string; required: boolean }[]> = {
  asaas: [
    { key: "ASAAS_API_KEY", label: "Chave de API", placeholder: "$aact_...", required: true },
    { key: "ASAAS_WEBHOOK_TOKEN", label: "Token do webhook (você escolhe)", placeholder: "um texto longo e secreto", required: true },
  ],
  stripe: [
    { key: "STRIPE_SECRET_KEY", label: "Chave secreta", placeholder: "sk_test_... ou sk_live_...", required: true },
    { key: "STRIPE_WEBHOOK_SECRET", label: "Segredo do webhook", placeholder: "whsec_...", required: true },
  ],
};

async function aes() { return Buffer.from((await fileKey()).slice(0, 64), "hex"); }
export async function encryptJson(o: Record<string, string>) {
  const iv = randomBytes(12); const c = createCipheriv("aes-256-gcm", await aes(), iv);
  const data = Buffer.concat([c.update(JSON.stringify(o), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}
export async function decryptJson(s: string | null | undefined): Promise<Record<string, string>> {
  if (!s) return {};
  try { const [iv, tag, data] = s.split(".").map((x) => Buffer.from(x, "base64")); const d = createDecipheriv("aes-256-gcm", await aes(), iv); d.setAuthTag(tag); return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString("utf8")); }
  catch { return {}; }
}

/** Carrega a configuracao do banco para a memoria (cache de 5 s). Chamar antes de usar o gateway. */
export async function loadBillingConfig(force = false) {
  if (!force && Date.now() - loadedAt < 5000) return;
  loadedAt = Date.now();
  for (const k of Object.keys(runtime)) delete runtime[k];
  const c = await db.paymentConfig.findUnique({ where: { id: "default" } }).catch(() => null);
  if (!c?.provider) return;
  const secrets = await decryptJson(c.secretsEnc);
  runtime.PAYMENT_PROVIDER = c.provider;
  runtime.ASAAS_ENV = c.env === "production" ? "production" : "sandbox";
  for (const [k, v] of Object.entries(secrets)) if (v) runtime[k] = v;
  runtime.BILLING_METHODS = c.methods.join(",");
  runtime.BILLING_CYCLES = c.cycles;
  runtime.BILLING_GRACE_DAYS = String(c.graceDays);
}

export const mask = (v?: string) => (v ? `••••${v.slice(-4)}` : "");
