import { db } from "@/lib/db";
import { appUrl } from "@/lib/billing";
import { SECRET_FIELDS, decryptJson, mask } from "@/lib/billing/config";
import { PaymentForm } from "./client";

export default async function Pagamentos() {
  const c = await db.paymentConfig.findUnique({ where: { id: "default" } });
  const secrets = await decryptJson(c?.secretsEnc);
  const fromEnv = !c?.provider && Boolean(process.env.PAYMENT_PROVIDER);
  const saved: Record<string, string> = Object.fromEntries(Object.values(SECRET_FIELDS).flat().map((f) => [f.key, mask(secrets[f.key])]));
  const status = c?.testOk ? "ok" : c?.testOk === false ? "err" : c?.provider ? "pending" : fromEnv ? "env" : "off";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl font-bold">Pagamentos</h1><p className="muted text-sm">Gateway que cobra as assinaturas dos planos. Escolha o provedor, cole as chaves e teste a conexão.</p></div>
        <span className={`rounded-full px-3 py-1.5 text-sm font-bold ${status === "ok" ? "bg-sobbra/15 text-sobbra" : status === "err" ? "bg-coral/15 text-coral" : "soft"}`}>
          {status === "ok" ? `● Conectado (${c?.env === "production" ? "produção" : "teste"})` : status === "err" ? "● Falhou no último teste" : status === "pending" ? "● Salvo, falta testar" : status === "env" ? "● Configurado pelas variáveis da Vercel" : "● Não configurado"}
        </span>
      </div>
      <PaymentForm initial={{ provider: c?.provider ?? "", env: c?.env ?? "sandbox", methods: c?.methods ?? ["pix", "boleto", "card"], cycles: c?.cycles ?? "both", grace: c?.graceDays ?? 5 }}
        saved={saved} fields={SECRET_FIELDS} webhookBase={`${appUrl()}/api/billing/webhook`} lastTest={c?.testedAt ? { at: c.testedAt.toISOString(), ok: !!c.testOk, msg: c.testMsg ?? "" } : null} />
      <section className="card space-y-2 text-sm">
        <h2 className="font-semibold">Segurança</h2>
        <p>As chaves ficam criptografadas no banco (AES-256-GCM) e só aparecem mascaradas aqui. Ninguém consegue lê-las pelo painel, nem administradores.</p>
        <p className="muted">Comece pelo ambiente de <b>Teste</b>, faça uma assinatura de teste e só depois mude para <b>Produção</b>. Toda alteração fica registrada na Auditoria.</p>
      </section>
    </div>
  );
}
