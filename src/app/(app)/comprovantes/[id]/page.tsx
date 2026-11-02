import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Confirm } from "./confirm";
import { formData } from "../../lancamentos/data";

export default async function Revisar({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const r = await db.receipt.findFirst({ where: { id, userId: user.id } });
  if (!r) notFound();
  if (r.status === "CONFIRMED") redirect("/comprovantes");
  const f = await formData(user.id);
  const ex = (r.extracted ?? {}) as any;
  // Escolhe a conta pelo meio de pagamento / final do cartao lido
  const accounts = await db.account.findMany({ where: { userId: user.id, archived: false } });
  const byDigits = ex.cardLast4 && accounts.find((a) => a.lastDigits === ex.cardLast4);
  const byMethod = ex.paymentMethod === "credito" ? accounts.find((a) => a.type === "CREDIT_CARD") : ex.paymentMethod === "dinheiro" ? accounts.find((a) => a.type === "WALLET") : undefined;
  return <Confirm receipt={{ id: r.id, mimeType: r.mimeType, error: r.error, docType: r.docType }} ex={ex} {...f} defaultAccountId={(byDigits || byMethod)?.id ?? f.defaultAccountId} />;
}
