import { db } from "@/lib/db";

const ACT: Record<string, string> = { "user.create": "Criou usuário", "user.update": "Alterou usuário", "user.block": "Bloqueou acesso", "user.unblock": "Liberou acesso", "user.reset_password": "Gerou senha provisória", "user.delete": "Excluiu usuário" };

export default async function Auditoria() {
  const logs = await db.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: "desc" }, take: 200 });
  const targets = await db.user.findMany({ where: { id: { in: logs.map((l) => l.targetId).filter(Boolean) as string[] } }, select: { id: true, email: true } });
  const email = (id: string | null) => targets.find((t) => t.id === id)?.email;
  return (
    <div>
      <h1 className="text-xl font-bold">Auditoria</h1>
      <p className="muted mb-4 text-sm">Quem fez o quê no cadastro de usuários. Os registros não podem ser editados.</p>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="line muted border-b text-left text-xs"><th className="p-3">Quando</th><th>Quem</th><th>Ação</th><th>Usuário afetado</th><th>Detalhe</th></tr></thead>
          <tbody>{logs.map((l) => (
            <tr key={l.id} className="line border-b last:border-0"><td className="p-3 whitespace-nowrap">{l.createdAt.toLocaleString("pt-BR")}</td><td>{l.actor?.name ?? "—"}</td><td>{ACT[l.action] ?? l.action}</td><td>{email(l.targetId) ?? "—"}</td><td className="muted">{l.detail}</td></tr>
          ))}{!logs.length && <tr><td colSpan={5} className="muted p-6 text-center">Nenhuma ação registrada ainda.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}
