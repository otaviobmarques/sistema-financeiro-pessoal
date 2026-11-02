import { db } from "@/lib/db";
import { getPlans } from "@/lib/plans";
import { getProvider } from "@/lib/billing";
import { generatedSecrets } from "@/lib/secrets";
import { brl, dateBR } from "@/lib/money";
import Link from "next/link";
import { PlanEditor, NewPlan } from "./client";

const ST: Record<string, string> = { pending: "aguardando pagamento", active: "ativa", past_due: "em atraso", canceled: "cancelada" };

export default async function Planos() {
  const [plans, subs, events, secrets, gwp, pc, counts] = await Promise.all([
    getPlans(),
    db.subscription.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { name: true, email: true } } } }),
    db.billingEvent.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    generatedSecrets(),
    getProvider(),
    db.paymentConfig.findUnique({ where: { id: "default" } }),
    db.user.groupBy({ by: ["plan"], _count: true }),
  ]);
  const nUsers = (c: string) => counts.find((x) => x.plan === c)?._count ?? 0;
  const active = gwp;
  const mrr = subs.filter((s) => s.status === "active").reduce((t, s) => t + (s.cycle === "yearly" ? Math.round(s.priceCents / 12) : s.priceCents), 0);
  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold">Planos e preços</h1><p className="muted text-sm">O que você vende, por quanto e o que cada plano libera.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card"><p className="muted text-sm">Gateway</p><p className={`text-lg font-bold ${active && pc?.testOk !== false ? "text-sobbra" : "text-coral"}`}>{active ? active.label : "Não configurado"}</p><p className="muted text-xs">{!active ? "Clientes veem “assinatura em breve”" : pc?.testOk === false ? "Último teste de conexão falhou: veja em Pagamentos" : pc && pc.testOk == null ? "Configurado, falta testar a conexão" : "Clientes já podem assinar"}</p></div>
        <div className="card"><p className="muted text-sm">Receita recorrente (MRR)</p><p className="text-2xl font-bold">{brl(mrr)}</p></div>
        <div className="card"><p className="muted text-sm">Assinaturas ativas</p><p className="text-2xl font-bold">{subs.filter((s) => s.status === "active").length}</p></div>
      </div>

      <p className="soft rounded-xl p-3 text-sm">O gateway que cobra as assinaturas é configurado em <Link href="/admin/pagamentos" className="font-bold underline">Pagamentos</Link>.</p>

      <section className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Planos</h2><p className="muted text-sm">Crie quantos quiser. Planos com clientes não podem ser excluídos, só pausados.</p></div><NewPlan /></div>
        <div className="grid gap-3 lg:grid-cols-3">{Object.values(plans).map((p) => <PlanEditor key={p.code} plan={p} subscribers={nUsers(p.code)} />)}</div>
      </section>

      <section className="card overflow-x-auto p-0">
        <h2 className="p-4 pb-2 font-semibold">Assinaturas</h2>
        <table className="w-full min-w-[640px] text-sm"><thead><tr className="muted line border-b text-left text-xs"><th className="p-3">Cliente</th><th>Plano</th><th>Valor</th><th>Situação</th><th>Próxima cobrança</th><th>Desde</th></tr></thead>
          <tbody>{subs.map((s) => <tr key={s.id} className="line border-b last:border-0"><td className="p-3">{s.user.name}<span className="muted block text-xs">{s.user.email}</span></td><td>{plans[s.plan]?.name ?? s.plan} {s.cycle === "yearly" ? "anual" : "mensal"}</td><td>{brl(s.priceCents)}</td><td>{ST[s.status] ?? s.status}</td><td>{s.currentPeriodEnd ? dateBR(s.currentPeriodEnd) : "—"}</td><td>{dateBR(s.createdAt)}</td></tr>)}
            {!subs.length && <tr><td colSpan={6} className="muted p-6 text-center">Nenhuma assinatura ainda.</td></tr>}</tbody></table>
        {events.length > 0 && <p className="muted p-4 text-xs">Últimos eventos do gateway: {events.map((e) => `${e.type} (${e.createdAt.toLocaleString("pt-BR")})`).join(" · ")}</p>}
      </section>

      {secrets.length > 0 && <p className="rounded-xl bg-ambar/10 p-3 text-sm">Segurança: {secrets.join(", ")} foram gerados automaticamente e estão guardados no banco. Para separar as chaves dos dados, crie essas variáveis na Vercel com novos valores. Atenção: trocar a FILE_ENC_KEY torna ilegíveis os comprovantes já enviados.</p>}
    </div>
  );
}
