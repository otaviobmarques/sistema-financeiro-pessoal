import { db } from "@/lib/db";

export async function formData(userId: string) {
  const [accounts, categories, most] = await Promise.all([
    db.account.findMany({ where: { userId, archived: false }, orderBy: { createdAt: "asc" } }),
    db.category.findMany({ where: { userId }, include: { parent: true }, orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    db.transaction.groupBy({ by: ["accountId"], where: { userId, type: "EXPENSE" }, _count: true, orderBy: { _count: { accountId: "desc" } }, take: 1 }),
  ]);
  return {
    accounts: accounts.map((a) => ({ id: a.id, name: a.name, type: a.type })),
    categories: categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon, kind: c.kind, parent: c.parent?.name ?? null })),
    defaultAccountId: most[0]?.accountId ?? (accounts.find((a) => a.type === "CHECKING") ?? accounts.find((a) => a.type !== "CREDIT_CARD"))?.id,
  };
}
