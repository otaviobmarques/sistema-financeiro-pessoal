import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { dateBR } from "@/lib/money";

type SP = { q?: string; papel?: string; plano?: string; status?: string; excluido?: string };

export default async function Usuarios({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const where: Prisma.UserWhereInput = {};
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q } }];
  if (sp.papel === "CLIENT" || sp.papel === "ADMIN") where.role = sp.papel;
  if (sp.plano === "FREE" || sp.plano === "PRO" || sp.plano === "FAMILY") where.plan = sp.plano;
  if (sp.status === "ativo") where.active = true;
  if (sp.status === "bloqueado") where.active = false;
  const [users, totals] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { _count: { select: { transactions: true } } } }),
    db.user.groupBy({ by: ["role", "active"], _count: true }),
  ]);
  const count = (role?: string, active?: boolean) => totals.filter((t) => (!role || t.role === role) && (active === undefined || t.active === active)).reduce((s, t) => s + t._count, 0);
  const tiles = [["Clientes", count("CLIENT")], ["Administradores", count("ADMIN")], ["Ativos", count(undefined, true)], ["Bloqueados", count(undefined, false)]] as const;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold">Usuários</h1><p className="muted text-sm">Clientes que usam o app e administradores do backoffice.</p></div>
        <Link href="/admin/usuarios/novo" className="btn-primary">+ Novo usuário</Link>
      </div>
      {sp.excluido && <p className="soft mb-3 rounded-xl p-3 text-sm">Usuário excluído, junto com todos os dados dele.</p>}
      <div className="mb-4 grid gap-3 sm:grid-cols-4">{tiles.map(([l, v]) => <div key={l} className="card"><p className="muted text-sm">{l}</p><p className="text-2xl font-bold">{v}</p></div>)}</div>
      <form className="card mb-4 grid gap-2 sm:grid-cols-5">
        <input name="q" defaultValue={sp.q} placeholder="Buscar por nome, e-mail ou telefone" className="input sm:col-span-2" aria-label="Buscar" />
        <select name="papel" defaultValue={sp.papel ?? ""} className="input" aria-label="Papel"><option value="">Todos os papéis</option><option value="CLIENT">Clientes</option><option value="ADMIN">Administradores</option></select>
        <select name="plano" defaultValue={sp.plano ?? ""} className="input" aria-label="Plano"><option value="">Todos os planos</option>{(["FREE", "PRO", "FAMILY"] as const).map((p) => <option key={p} value={p}>{PLANS[p].name}</option>)}</select>
        <div className="flex gap-2"><select name="status" defaultValue={sp.status ?? ""} className="input" aria-label="Situação"><option value="">Todos</option><option value="ativo">Ativos</option><option value="bloqueado">Bloqueados</option></select><button className="btn-dark">Filtrar</button></div>
      </form>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="line muted border-b text-left text-xs"><th className="p-3">Nome</th><th>Papel</th><th>Plano</th><th>Situação</th><th>Último acesso</th><th>Lançamentos</th><th>Cadastro</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="line border-b last:border-0">
                <td className="p-3"><Link href={`/admin/usuarios/${u.id}`} className="font-medium hover:underline">{u.name}</Link><span className="muted block text-xs">{u.email}</span></td>
                <td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.role === "ADMIN" ? "bg-floresta text-white" : "soft"}`}>{u.role === "ADMIN" ? "Administrador" : "Cliente"}</span></td>
                <td>{PLANS[u.plan].name}</td>
                <td>{u.active ? <span className="text-sobbra">● Ativo</span> : <span className="text-coral">● Bloqueado</span>}{u.mustChangePassword && <span className="muted block text-xs">senha provisória</span>}</td>
                <td>{u.lastLoginAt ? dateBR(u.lastLoginAt) : <span className="muted">nunca</span>}</td>
                <td>{u._count.transactions}</td>
                <td>{dateBR(u.createdAt)}</td>
              </tr>
            ))}
            {!users.length && <tr><td colSpan={7} className="muted p-6 text-center">Nenhum usuário encontrado com esses filtros.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
