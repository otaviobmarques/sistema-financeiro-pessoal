import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PLANS, usage } from "@/lib/plans";
import { dateBR } from "@/lib/money";
import { UserForm, UserActions } from "../form";

const ACT: Record<string, string> = { "user.create": "Cadastro criado", "user.update": "Cadastro alterado", "user.block": "Acesso bloqueado", "user.unblock": "Acesso liberado", "user.reset_password": "Senha provisória gerada" };

export default async function EditarUsuario({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const { id } = await params;
  const u = await db.user.findUnique({ where: { id }, include: { _count: { select: { transactions: true, accounts: true, receipts: true } } } });
  if (!u) notFound();
  const [use, logs] = await Promise.all([usage(u.id), db.auditLog.findMany({ where: { targetId: u.id }, include: { actor: true }, orderBy: { createdAt: "desc" }, take: 10 })]);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div><h1 className="text-xl font-bold">{u.name}</h1><p className="muted text-sm">{u.role === "ADMIN" ? "Administrador" : "Cliente"} · cadastrado em {dateBR(u.createdAt)} · {u.active ? "ativo" : "bloqueado"}</p></div>
        <UserForm user={{ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, plan: u.plan }} />
      </div>
      <div className="space-y-4">
        <UserActions id={u.id} email={u.email} active={u.active} isSelf={u.id === me.id} />
        <div className="card space-y-2 text-sm">
          <h2 className="font-semibold">Uso</h2>
          <p>Plano {PLANS[u.plan].name}{u.planRenewsAt && ` · renova em ${dateBR(u.planRenewsAt)}`}</p>
          <p>{u._count.transactions} lançamentos · {u._count.accounts} contas · {u._count.receipts} comprovantes</p>
          <p>Este mês: {use.receipts} leituras de comprovante, {use.chat} perguntas ao consultor</p>
          <p>Último acesso: {u.lastLoginAt ? dateBR(u.lastLoginAt) : "nunca entrou"}</p>
          <p className="muted text-xs">Por privacidade, o backoffice mostra só números de uso, não os lançamentos da pessoa.</p>
        </div>
        <div className="card text-sm">
          <h2 className="mb-2 font-semibold">Histórico administrativo</h2>
          {!logs.length && <p className="muted">Nenhuma ação registrada.</p>}
          <ul className="space-y-1">{logs.map((l) => <li key={l.id}><b>{ACT[l.action] ?? l.action}</b>{l.detail && l.action === "user.update" ? ` (${l.detail.replace("Alterou: ", "")})` : ""} <span className="muted">· {l.actor?.name ?? "—"} · {l.createdAt.toLocaleString("pt-BR")}</span></li>)}</ul>
        </div>
      </div>
    </div>
  );
}
