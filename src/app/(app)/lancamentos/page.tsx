import Link from "next/link";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { monthKey, monthLabel } from "@/lib/money";
import { Money } from "@/components/ui";
import { TxList } from "./list";

type SP = { mes?: string; q?: string; cat?: string; conta?: string; tipo?: string; tag?: string };

export default async function Lancamentos({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : sp.mes === "todos" ? null : monthKey(new Date());
  const where: Prisma.TransactionWhereInput = { userId: user.id, deletedAt: null };
  if (month) { const [y, m] = month.split("-").map(Number); where.date = { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59, 59) }; }
  if (sp.cat) where.OR = [{ categoryId: sp.cat }, { category: { parentId: sp.cat } }];
  const and: Prisma.TransactionWhereInput[] = [];
  if (sp.conta) and.push({ OR: [{ accountId: sp.conta }, { toAccountId: sp.conta }] });
  if (sp.tipo && ["INCOME", "EXPENSE", "TRANSFER"].includes(sp.tipo)) where.type = sp.tipo as any;
  if (sp.tag) where.tags = { has: sp.tag.replace(/^#/, "") };
  if (sp.q) {
    const q = sp.q.trim(); const num = Number(q.replace(",", "."));
    and.push({ OR: [
      { description: { contains: q, mode: "insensitive" } }, { merchant: { contains: q, mode: "insensitive" } }, { notes: { contains: q, mode: "insensitive" } },
      ...(Number.isFinite(num) && num > 0 ? [{ amountCents: Math.round(num * 100) }] : []),
    ] });
  }
  if (and.length) where.AND = and;
  const [txs, accounts, categories] = await Promise.all([
    db.transaction.findMany({ where, include: { category: { include: { parent: true } }, account: true, toAccount: true }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 500 }),
    db.account.findMany({ where: { userId: user.id, archived: false } }),
    db.category.findMany({ where: { userId: user.id }, include: { parent: true }, orderBy: { name: "asc" } }),
  ]);
  const income = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amountCents, 0);
  const expense = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amountCents, 0);
  const [y, m] = (month ?? monthKey(new Date())).split("-").map(Number);
  const link = (patch: Partial<SP>) => "/lancamentos?" + new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div><p className="eyebrow">Movimentos</p><h1 className="text-[30px] leading-tight md:text-[38px]">Cada movimento, <i>mais clareza.</i></h1></div>
        <div className="flex gap-2"><Link href="/importar" className="btn-ghost min-h-[44px]">Importar extrato</Link><Link href="/lancamentos/novo" className="btn-primary min-h-[44px]">+ Adicionar</Link></div>
      </div>
      <form className="card mb-3 grid gap-2 sm:grid-cols-6">
        <input name="q" defaultValue={sp.q} placeholder="Buscar (texto ou valor)" className="input sm:col-span-2" />
        <select name="mes" defaultValue={month ?? "todos"} className="input">
          <option value="todos">Todos os meses</option>
          {Array.from({ length: 18 }, (_, i) => monthKey(new Date(new Date().getFullYear(), new Date().getMonth() + 3 - i, 1))).map((k) => <option key={k} value={k}>{monthLabel(k)}</option>)}
        </select>
        <select name="cat" defaultValue={sp.cat ?? ""} className="input"><option value="">Todas as categorias</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.parent ? `${c.parent.name} › ` : ""}{c.name}</option>)}</select>
        <select name="conta" defaultValue={sp.conta ?? ""} className="input"><option value="">Todas as contas</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <div className="flex gap-2"><select name="tipo" defaultValue={sp.tipo ?? ""} className="input"><option value="">Tudo</option><option value="EXPENSE">Saídas</option><option value="INCOME">Entradas</option><option value="TRANSFER">Transferências</option></select><button className="btn-dark">Filtrar</button></div>
      </form>
      {/* Total sempre visivel em qualquer filtro (RF-027) */}
      <div className="soft sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl px-4 py-3 text-sm">
        <span>{txs.length} movimento{txs.length === 1 ? "" : "s"}</span>
        <span>Entradas <b>+ <Money cents={income} /></b></span>
        <span>Saídas <b>− <Money cents={expense} /></b></span>
        <span>Resultado <Money cents={income - expense} className="font-bold" /></span>
        {month && <span className="ml-auto flex gap-2"><Link href={link({ mes: monthKey(new Date(y, m - 2, 1)) })}>‹ anterior</Link><Link href={link({ mes: monthKey(new Date(y, m, 1)) })}>próximo ›</Link></span>}
      </div>
      <TxList
        txs={txs.map((t) => ({ id: t.id, type: t.type, amountCents: t.amountCents, description: t.description, merchant: t.merchant, date: t.date.toISOString(), status: t.status,
          account: t.account.name, toAccount: t.toAccount?.name ?? null, category: t.category ? { name: t.category.name, parent: t.category.parent?.name ?? null, icon: t.category.icon, color: t.category.color } : null,
          tags: t.tags, origin: t.origin, lowConfidence: (t.confidence ?? 1) < 0.6 }))}
        categories={categories.filter((c) => c.parentId).map((c) => ({ id: c.id, label: `${c.icon} ${c.parent?.name} › ${c.name}`, kind: c.kind }))}
      />
    </div>
  );
}
