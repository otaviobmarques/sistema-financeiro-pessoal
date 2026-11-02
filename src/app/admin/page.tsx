// Painel administrativo (RF-143): usuarios, planos, metricas e custo de IA por usuario.
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { brl, dateBR } from "@/lib/money";

export default async function Admin() {
  await requireAdmin();
  const since = new Date(Date.now() - 30 * 86400000);
  const [users, byPlan, txCount, auto, receipts, ai] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { _count: { select: { transactions: true, receipts: true } } } }),
    db.user.groupBy({ by: ["plan"], _count: true }),
    db.transaction.count({ where: { createdAt: { gte: since } } }),
    db.transaction.count({ where: { createdAt: { gte: since }, origin: { in: ["VOICE", "RECEIPT", "IMPORT", "OPEN_FINANCE"] } } }),
    db.receipt.groupBy({ by: ["status"], _count: true }),
    db.aiUsage.groupBy({ by: ["userId", "kind"], where: { createdAt: { gte: since } }, _sum: { tokens: true }, _count: true }),
  ]);
  const mrr = byPlan.reduce((s, p) => s + PLANS[p.plan].price * p._count, 0);
  const aiByUser = new Map<string, { calls: number; tokens: number }>();
  for (const a of ai) { const v = aiByUser.get(a.userId) ?? { calls: 0, tokens: 0 }; v.calls += a._count; v.tokens += a._sum.tokens ?? 0; aiByUser.set(a.userId, v); }
  const kpi = [["Usuários", users.length], ["MRR estimado", brl(mrr)], ["Lançamentos (30d)", txCount], ["Captura automática", txCount ? `${Math.round((auto / txCount) * 100)}%` : "—"]];
  return (
    <div>
      <div className="mb-4 flex items-center justify-between"><h1 className="text-xl font-bold">Visão geral</h1><Link href="/admin/usuarios/novo" className="btn-primary">+ Novo usuário</Link></div>
      <div className="mb-4 grid gap-3 sm:grid-cols-4">{kpi.map(([l, v]) => <div key={String(l)} className="card"><p className="muted text-sm">{l}</p><p className="text-2xl font-bold">{v}</p></div>)}</div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="card"><h2 className="mb-2 font-semibold">Por plano</h2>{byPlan.map((p) => <p key={p.plan}>{PLANS[p.plan].name}: <b>{p._count}</b></p>)}</div>
        <div className="card"><h2 className="mb-2 font-semibold">Comprovantes</h2>{receipts.map((r) => <p key={r.status}>{r.status}: <b>{r._count}</b></p>)}</div>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[700px] text-sm">
          <thead><tr className="line border-b text-left"><th className="p-3">Usuário</th><th>Plano</th><th>Desde</th><th>Lançamentos</th><th>Comprovantes</th><th>IA (30d) chamadas / tokens</th></tr></thead>
          <tbody>{users.map((u) => { const a = aiByUser.get(u.id); return (
            <tr key={u.id} className="line border-b"><td className="p-3"><Link className="font-medium hover:underline" href={`/admin/usuarios/${u.id}`}>{u.name}</Link><span className="muted block text-xs">{u.email}</span></td><td>{PLANS[u.plan].name}</td><td>{dateBR(u.createdAt)}</td><td>{u._count.transactions}</td><td>{u._count.receipts}</td><td>{a ? `${a.calls} / ${a.tokens.toLocaleString("pt-BR")}` : "—"}</td></tr>); })}</tbody>
        </table>
      </div>
    </div>
  );
}
