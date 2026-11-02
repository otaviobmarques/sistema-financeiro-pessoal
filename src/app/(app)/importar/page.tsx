import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Importer } from "./client";

export default async function Importar() {
  const user = await requireUser();
  const [accounts, categories] = await Promise.all([
    db.account.findMany({ where: { userId: user.id, archived: false }, orderBy: { createdAt: "asc" } }),
    db.category.findMany({ where: { userId: user.id, parentId: { not: null } }, include: { parent: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-xl font-bold">Importar extrato</h1>
      <p className="muted mb-4 text-sm">Traga o extrato do banco ou a fatura do cartão em OFX ou CSV. Você confere tudo antes de entrar, e o que já existe não é lançado de novo.</p>
      <Importer accounts={accounts.map((a) => ({ id: a.id, name: a.name, type: a.type }))} categories={categories.map((c) => ({ id: c.id, label: `${c.icon} ${c.parent?.name} › ${c.name}`, kind: c.kind }))} />
    </div>
  );
}
