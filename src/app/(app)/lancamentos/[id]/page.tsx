import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TxForm } from "@/components/TxForm";
import { formData } from "../data";

export default async function Editar({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const t = await db.transaction.findFirst({ where: { id, userId: user.id }, include: { receipt: true } });
  if (!t) notFound();
  const f = await formData(user.id);
  return (
    <>
      <h1 className="mb-4 text-center text-xl font-bold">Editar lançamento</h1>
      <TxForm {...f} tx={{ id: t.id, type: t.type, amount: (t.amountCents / 100).toFixed(2).replace(".", ","), description: t.description, accountId: t.accountId, toAccountId: t.toAccountId, categoryId: t.categoryId, date: t.date.toISOString().slice(0, 10), status: t.status, tags: t.tags.map((x) => "#" + x).join(" "), notes: t.notes ?? "" }} />
      <div className="mx-auto mt-4 max-w-md text-sm muted space-y-1">
        <p>Origem: {({ MANUAL: "digitado", VOICE: "voz", RECEIPT: "comprovante", IMPORT: "importação", OPEN_FINANCE: "Open Finance", RECURRENCE: "recorrência" } as const)[t.origin]}{t.confidence != null && ` · confiança da categoria ${Math.round(t.confidence * 100)}%`}</p>
        {t.installments && <p>Parcela {t.installment} de {t.installments}</p>}
        {t.receipt && <p><Link className="text-sobbra" href={`/api/receipts/${t.receipt.id}/file`} target="_blank">Ver comprovante original</Link></p>}
      </div>
    </>
  );
}
