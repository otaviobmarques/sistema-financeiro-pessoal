import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Money } from "@/components/ui";
import { NfceReader } from "./client";

const ST: Record<string, string> = { pendente: "buscando", lida: "pronta para lançar", lancada: "lançada", falhou: "sem itens" };

export default async function Nfce() {
  const user = await requireUser();
  const notes = await db.nfce.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 30, include: { _count: { select: { items: true } } } });
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div><h1 className="text-xl font-bold">Nota fiscal (NFC-e)</h1><p className="muted text-sm">Leia o QR Code do cupom e o Sobbra traz cada item da compra, separando mercado, limpeza, bebidas e o resto.</p></div>
      <NfceReader />
      <ul className="card divide-y p-0">{notes.map((n) => (
        <li key={n.id} style={{ borderColor: "var(--line)" }}><Link href={`/nfce/${n.id}`} className="flex items-center gap-3 px-4 py-3">
          <span className="text-2xl">🧾</span>
          <span className="min-w-0 flex-1"><b className="block truncate">{n.merchant ?? `CNPJ ${n.cnpj}`}</b><span className="muted text-xs">NFC-e {n.number} · {n.uf} · {n._count.items} itens · {ST[n.status]}</span></span>
          {n.totalCents ? <Money cents={n.totalCents} className="font-semibold" /> : null}
        </Link></li>
      ))}{!notes.length && <li className="muted px-4 py-6 text-center text-sm">Nenhuma nota lida ainda.</li>}</ul>
    </div>
  );
}
