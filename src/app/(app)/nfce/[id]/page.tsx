import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Money } from "@/components/ui";
import { ItemCategory, Launch } from "./client";

export default async function NfceDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const n = await db.nfce.findFirst({ where: { id, userId: user.id }, include: { items: true } });
  if (!n) notFound();
  const [cats, accounts] = await Promise.all([
    db.category.findMany({ where: { userId: user.id, kind: "EXPENSE", parentId: { not: null } }, include: { parent: true }, orderBy: { name: "asc" } }),
    db.account.findMany({ where: { userId: user.id, archived: false }, orderBy: { createdAt: "asc" } }),
  ]);
  const options = cats.map((c) => ({ id: c.id, label: `${c.icon} ${c.parent?.name} › ${c.name}` }));
  const byCat = new Map<string, number>();
  for (const it of n.items) { const l = options.find((o) => o.id === it.categoryId)?.label ?? "Sem categoria"; byCat.set(l, (byCat.get(l) ?? 0) + it.totalCents); }
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div><h1 className="text-xl font-bold">{n.merchant ?? `CNPJ ${n.cnpj}`}</h1><p className="muted text-sm">NFC-e {n.number} · {n.uf} · {n.issuedAt ? n.issuedAt.toLocaleString("pt-BR") : "data não informada"} · chave {n.accessKey.replace(/(\d{4})/g, "$1 ").trim()}</p></div>
      {n.error && <p className="rounded-xl bg-ambar/15 p-3 text-sm">{n.error}{n.url && <> <a href={n.url} target="_blank" rel="noreferrer" className="font-semibold text-sobbra">Abrir na SEFAZ</a></>}</p>}
      {n.items.length > 0 && (
        <>
          <div className="card"><h2 className="mb-2 font-semibold">Por categoria</h2>{[...byCat.entries()].map(([l, v]) => <div key={l} className="flex justify-between py-1 text-sm"><span>{l}</span><Money cents={v} /></div>)}<div className="line mt-2 flex justify-between border-t pt-2 font-bold"><span>Total da nota</span><Money cents={n.totalCents ?? 0} /></div></div>
          <div className="card overflow-x-auto p-0"><table className="w-full min-w-[560px] text-sm">
            <thead><tr className="muted text-left text-xs"><th className="p-3">Item</th><th>Qtd.</th><th>Unit.</th><th>Total</th><th>Categoria</th></tr></thead>
            <tbody>{n.items.map((it) => (
              <tr key={it.id} className="line border-t"><td className="p-3">{it.description}</td><td>{it.quantity.toLocaleString("pt-BR")} {it.unit ?? ""}</td><td><Money cents={it.unitCents} /></td><td><Money cents={it.totalCents} /></td>
                <td>{n.status === "lancada" ? options.find((o) => o.id === it.categoryId)?.label ?? "—" : <ItemCategory id={it.id} value={it.categoryId} options={options} />}</td></tr>
            ))}</tbody></table></div>
        </>
      )}
      {n.status !== "lancada" ? <Launch id={n.id} accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} manual={!n.items.length} merchant={n.merchant ?? ""} groups={byCat.size} /> : <p className="soft rounded-xl p-3 text-sm">✅ Nota lançada{byCat.size > 1 ? `, separada em ${byCat.size} categorias` : ""}.</p>}
    </div>
  );
}
