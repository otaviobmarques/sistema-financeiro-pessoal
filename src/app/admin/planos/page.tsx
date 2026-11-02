import { db } from "@/lib/db";
import { getPlans } from "@/lib/plans";
import { providerStatus, appUrl } from "@/lib/billing";
import { generatedSecrets } from "@/lib/secrets";
import { brl, dateBR } from "@/lib/money";
import { PlanEditor } from "./client";

const ST: Record<string, string> = { pending: "aguardando pagamento", active: "ativa", past_due: "em atraso", canceled: "cancelada" };

export default async function Planos() {
  const [plans, subs, events, secrets] = await Promise.all([
    getPlans(),
    db.subscription.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { name: true, email: true } } } }),
    db.billingEvent.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    generatedSecrets(),
  ]);
  const gw = providerStatus(); const active = gw.find((g) => g.chosen && g.configured);
  const mrr = subs.filter((s) => s.status === "active").reduce((t, s) => t + (s.cycle === "yearly" ? Math.round(s.priceCents / 12) : s.priceCents), 0);
  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold">Planos e cobrança</h1><p className="muted text-sm">Preços, limites de cada plano e o gateway de pagamento do Sobbra.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card"><p className="muted text-sm">Gateway</p><p className={`text-lg font-bold ${active ? "text-sobbra" : "text-coral"}`}>{active ? active.label : "Não configurado"}</p><p className="muted text-xs">{active ? "Clientes já podem assinar" : "Clientes veem “assinatura em breve”"}</p></div>
        <div className="card"><p className="muted text-sm">Receita recorrente (MRR)</p><p className="text-2xl font-bold">{brl(mrr)}</p></div>
        <div className="card"><p className="muted text-sm">Assinaturas ativas</p><p className="text-2xl font-bold">{subs.filter((s) => s.status === "active").length}</p></div>
      </div>

      <section className="card space-y-3">
        <h2 className="font-semibold">Gateway de pagamento</h2>
        <p className="text-sm">Escolha um e preencha as variáveis na Vercel (Projeto → Settings → Environment Variables). Depois de salvar, faça um novo deploy.</p>
        <div className="grid gap-3 md:grid-cols-2">{gw.map((g) => (
          <div key={g.id} className={`rounded-xl border p-3 text-sm ${g.chosen ? "border-sobbra" : "line"}`}>
            <p className="font-semibold">{g.label} {g.configured && g.chosen ? "✅" : ""}</p>
            <ul className="mt-2 space-y-1 font-mono text-xs"><li>PAYMENT_PROVIDER = {g.id}</li>{g.envVars.map((v) => <li key={v}>{v} {g.missing.includes(v) ? <span className="text-coral">(falta)</span> : <span className="text-sobbra">(ok)</span>}</li>)}</ul>
            <p className="muted mt-2 text-xs">URL do webhook para cadastrar no {g.id === "asaas" ? "Asaas (Integrações → Webhooks; use o mesmo token de ASAAS_WEBHOOK_TOKEN)" : "Stripe (Developers → Webhooks; eventos checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.deleted)"}:</p>
            <code className="mt-1 block break-all rounded bg-black/5 p-2 text-xs">{appUrl()}/api/billing/webhook/{g.id}</code>
          </div>
        ))}</div>
        <p className="muted text-xs">Recomendação para o Brasil: Asaas, que aceita Pix, boleto e cartão na mesma assinatura. Teste primeiro com ASAAS_ENV=sandbox.</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Planos</h2>
        <div className="grid gap-3 lg:grid-cols-3">{(["FREE", "PRO", "FAMILY"] as const).map((c) => <PlanEditor key={c} plan={plans[c]} />)}</div>
      </section>

      <section className="card overflow-x-auto p-0">
        <h2 className="p-4 pb-2 font-semibold">Assinaturas</h2>
        <table className="w-full min-w-[640px] text-sm"><thead><tr className="muted line border-b text-left text-xs"><th className="p-3">Cliente</th><th>Plano</th><th>Valor</th><th>Situação</th><th>Próxima cobrança</th><th>Desde</th></tr></thead>
          <tbody>{subs.map((s) => <tr key={s.id} className="line border-b last:border-0"><td className="p-3">{s.user.name}<span className="muted block text-xs">{s.user.email}</span></td><td>{plans[s.plan].name} {s.cycle === "yearly" ? "anual" : "mensal"}</td><td>{brl(s.priceCents)}</td><td>{ST[s.status] ?? s.status}</td><td>{s.currentPeriodEnd ? dateBR(s.currentPeriodEnd) : "—"}</td><td>{dateBR(s.createdAt)}</td></tr>)}
            {!subs.length && <tr><td colSpan={6} className="muted p-6 text-center">Nenhuma assinatura ainda.</td></tr>}</tbody></table>
        {events.length > 0 && <p className="muted p-4 text-xs">Últimos eventos do gateway: {events.map((e) => `${e.type} (${e.createdAt.toLocaleString("pt-BR")})`).join(" · ")}</p>}
      </section>

      {secrets.length > 0 && <p className="rounded-xl bg-ambar/10 p-3 text-sm">Segurança: {secrets.join(", ")} foram gerados automaticamente e estão guardados no banco. Para separar as chaves dos dados, crie essas variáveis na Vercel com novos valores. Atenção: trocar a FILE_ENC_KEY torna ilegíveis os comprovantes já enviados.</p>}
    </div>
  );
}
