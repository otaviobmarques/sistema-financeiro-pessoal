import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cardInvoices } from "@/lib/finance";
import { dateBR, monthLabel } from "@/lib/money";
import { Money } from "@/components/ui";
import { PayInvoice } from "../client";

const ST: Record<string, string> = { aberta: "bg-sobbra/15 text-sobbra", fechada: "bg-coral/15 text-coral", paga: "bg-black/10", futura: "bg-ambar/15 text-ambar" };

export default async function Cartao({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const data = await cardInvoices(user.id, id).catch(() => null);
  if (!data) notFound();
  const payFrom = await db.account.findMany({ where: { userId: user.id, archived: false, type: { in: ["CHECKING", "SAVINGS", "WALLET"] } } });
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/contas" className="muted text-sm">‹ Contas</Link>
      <h1 className="mb-4 text-xl font-bold">💳 {data.card.name}</h1>
      {!data.invoices.length && <p className="card muted">Nenhuma compra neste cartão ainda.</p>}
      <div className="space-y-3">
        {data.invoices.map((inv) => (
          <details key={inv.month} className="card" open={inv.status === "aberta" || inv.status === "fechada"}>
            <summary className="flex cursor-pointer items-center justify-between gap-2">
              <span><b className="capitalize">Fatura {monthLabel(inv.month)}</b><span className="muted block text-xs">vence {dateBR(inv.due)}</span></span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ST[inv.status]}`}>{inv.status}</span>
              <Money cents={inv.total} className="text-lg font-bold" />
            </summary>
            <ul className="mt-3 divide-y text-sm">
              {inv.items.map((t) => (
                <li key={t.id} className="flex justify-between py-2" style={{ borderColor: "var(--line)" }}>
                  <Link href={`/lancamentos/${t.id}`}>{t.category?.icon} {t.description} <span className="muted text-xs">{dateBR(t.date)}</span></Link>
                  <Money cents={t.type === "INCOME" ? -t.amountCents : t.amountCents} />
                </li>
              ))}
            </ul>
            {inv.status !== "paga" && inv.status !== "futura" && <PayInvoice cardId={data.card.id} amount={inv.total - inv.paid} accounts={payFrom.map((a) => ({ id: a.id, name: a.name }))} />}
          </details>
        ))}
      </div>
    </div>
  );
}
