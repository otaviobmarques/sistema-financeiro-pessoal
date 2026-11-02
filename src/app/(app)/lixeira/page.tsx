import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { purgeTrash } from "@/lib/finance";
import { dateBR } from "@/lib/money";
import { Money } from "@/components/ui";
import { TrashActions } from "./client";

export default async function Lixeira() {
  const user = await requireUser();
  await purgeTrash(user.id);
  const items = await db.transaction.findMany({ where: { userId: user.id, deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } });
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold">Lixeira</h1>
      <p className="muted mb-4 text-sm">Nada se perde: itens excluídos ficam aqui por 30 dias.</p>
      {!items.length && <p className="card muted">A lixeira está vazia.</p>}
      <ul className="card divide-y p-0">{items.map((t) => (
        <li key={t.id} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "var(--line)" }}>
          <div className="flex-1"><p>{t.description}</p><p className="muted text-xs">{dateBR(t.date)} · excluído em {dateBR(t.deletedAt!)}</p></div>
          <Money cents={t.amountCents} /><TrashActions id={t.id} />
        </li>))}</ul>
    </div>
  );
}
