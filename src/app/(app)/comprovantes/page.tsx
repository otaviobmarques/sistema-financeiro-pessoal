import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, dateBR } from "@/lib/money";
import { usage, PLANS } from "@/lib/plans";
import { aiEnabled } from "@/lib/ai";
import { Uploader } from "./uploader";

const DOC: Record<string, string> = { cupom: "Cupom fiscal", nfce: "NFC-e", pix: "Pix", ted: "TED", boleto: "Boleto", maquininha: "Maquininha", manuscrito: "Recibo", delivery: "Delivery", outro: "Comprovante" };

export default async function Comprovantes({ searchParams }: { searchParams: Promise<{ ok?: string; compartilhado?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [inbox, done, u] = await Promise.all([
    db.receipt.findMany({ where: { userId: user.id, status: { in: ["QUEUED", "PROCESSING", "READY"] } }, orderBy: { createdAt: "desc" } }),
    db.receipt.findMany({ where: { userId: user.id, status: "CONFIRMED" }, include: { transaction: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    usage(user.id),
  ]);
  const limit = PLANS[user.plan].receipts;
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-bold">Comprovantes</h1>
      <p className="muted mb-4 text-sm">Tire a foto, envie da galeria ou compartilhe de qualquer app. Pode mandar vários e revisar depois.</p>
      {sp.ok && <p className="soft fill-in mb-3 rounded-xl p-3 text-sm">✅ Lançado! O comprovante ficou guardado junto do lançamento.</p>}
      {sp.compartilhado && <p className="soft fill-in mb-3 rounded-xl p-3 text-sm">📥 Recebemos {sp.compartilhado} arquivo(s) compartilhado(s).</p>}
      {!aiEnabled() && <p className="mb-3 rounded-xl bg-ambar/15 p-3 text-sm">A leitura automática está desligada neste servidor (sem chave de IA). Os comprovantes ficam guardados e você preenche os campos na confirmação.</p>}
      <Uploader />
      <p className="muted mt-2 text-xs">{u.receipts} de {user.plan === "FREE" ? limit : "∞"} leituras este mês · Plano {PLANS[user.plan].name}</p>

      <h2 className="mb-2 mt-6 font-semibold">Caixa de entrada {inbox.length > 0 && <span className="rounded-full bg-sobbra px-2 text-xs text-white">{inbox.length}</span>}</h2>
      {!inbox.length && <p className="card muted text-sm">Nada para revisar. 🎉</p>}
      <ul className="space-y-2">
        {inbox.map((r) => {
          const ex = (r.extracted ?? {}) as any;
          const busy = r.status !== "READY";
          return (
            <li key={r.id}>
              <Link href={busy ? "/comprovantes" : `/comprovantes/${r.id}`} className="card flex items-center gap-3">
                <div className={`relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-black/10 ${busy ? "scanner" : ""}`}>
                  {r.mimeType.startsWith("image/") ? <img src={`/api/receipts/${r.id}/file`} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-2xl">📄</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{busy ? "Lendo comprovante…" : ex.merchant || DOC[r.docType ?? "outro"] || "Comprovante"}</p>
                  <p className="muted text-sm">{busy ? "Pode continuar usando o app" : ex.amount ? `${brl(Math.round(ex.amount * 100))}${ex.date ? " · " + dateBR(ex.date + "T12:00") : ""}` : r.error ?? "Toque para preencher"}</p>
                  {ex.duplicateOf && <p className="text-xs text-ambar">⚠️ Parece já ter sido lançado</p>}
                </div>
                {!busy && <span className="btn-primary min-h-[40px] text-sm">Revisar</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      {inbox.some((r) => r.status !== "READY") && <meta httpEquiv="refresh" content="3" />}

      {done.length > 0 && (<>
        <h2 className="mb-2 mt-6 font-semibold">Lançados recentemente</h2>
        <ul className="card divide-y p-0">{done.map((r) => r.transaction && (
          <li key={r.id} style={{ borderColor: "var(--line)" }}><Link href={`/lancamentos/${r.transaction.id}`} className="flex justify-between px-4 py-3"><span>{r.transaction.description}</span><span className="money">{brl(r.transaction.amountCents)}</span></Link></li>
        ))}</ul>
      </>)}
    </div>
  );
}
