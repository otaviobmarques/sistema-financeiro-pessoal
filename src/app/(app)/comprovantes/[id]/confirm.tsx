"use client";
// Tela de confirmacao (RF-033): campos pre-preenchidos, baixa confianca destacada, preenchimento animado (RF-152).
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { confirmReceipt, discardReceipt } from "@/app/actions";

type Cat = { id: string; name: string; icon: string; kind: string; parent: string | null };

export function Confirm({ receipt, ex, accounts, categories, defaultAccountId }: { receipt: { id: string; mimeType: string; error: string | null; docType: string | null }; ex: any; accounts: { id: string; name: string }[]; categories: Cat[]; defaultAccountId?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(confirmReceipt, undefined);
  const conf = ex.confidence ?? {};
  const low = (k: string) => ex[k] != null && (conf[k] ?? 1) < 0.7;
  const hl = (k: string) => (low(k) || ex[k] == null ? "ring-2 ring-ambar" : "");
  const type = ex.type ?? "EXPENSE";
  const cats = categories.filter((c) => c.parent && c.kind === type);
  return (
    <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
      <div className="card p-2">
        {receipt.mimeType.startsWith("image/") ? <img src={`/api/receipts/${receipt.id}/file`} alt="Comprovante" className="max-h-[70vh] w-full rounded-xl object-contain" />
          : <iframe src={`/api/receipts/${receipt.id}/file`} className="h-[70vh] w-full rounded-xl" title="Comprovante PDF" />}
      </div>
      <form action={action} className="space-y-3">
        <h1 className="text-xl font-bold">Confere pra mim?</h1>
        {receipt.error ? <p className="rounded-xl bg-ambar/15 p-3 text-sm">{receipt.error}</p> : <p className="muted text-sm">Campos com borda amarela precisam da sua atenção.</p>}
        {ex.duplicateOf && <p className="rounded-xl bg-ambar/15 p-3 text-sm">⚠️ Já existe um lançamento com esse valor e data. Confirme só se for outro gasto.</p>}
        <input type="hidden" name="receiptId" value={receipt.id} />
        <input type="hidden" name="type" value={type} />
        <div className="fill-in" style={{ animationDelay: "0ms" }}><label className="label">Valor {type === "INCOME" && <span className="text-sobbra">(Pix recebido — vira entrada)</span>}</label>
          <input name="amount" inputMode="decimal" required defaultValue={ex.amount ? String(ex.amount.toFixed(2)).replace(".", ",") : ""} className={`input text-2xl font-bold ${hl("amount")}`} /></div>
        <div className="fill-in" style={{ animationDelay: "120ms" }}><label className="label">Estabelecimento</label>
          <input name="merchant" defaultValue={ex.merchant ?? ""} className={`input ${hl("merchant")}`} /></div>
        <div className="fill-in grid grid-cols-2 gap-3" style={{ animationDelay: "240ms" }}>
          <div><label className="label">Data</label><input name="date" type="date" required defaultValue={ex.date ?? new Date().toISOString().slice(0, 10)} className={`input ${hl("date")}`} /></div>
          <div><label className="label">Conta</label><select name="accountId" defaultValue={defaultAccountId} className="input">{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        </div>
        <div className="fill-in" style={{ animationDelay: "360ms" }}><label className="label">Categoria {ex.categoryConfidence != null && <span className="muted text-xs">({Math.round(ex.categoryConfidence * 100)}% de certeza)</span>}</label>
          <select name="categoryId" defaultValue={ex.categoryId ?? ""} className={`input ${(ex.categoryConfidence ?? 0) < 0.6 ? "ring-2 ring-ambar" : ""}`}>
            <option value="">Escolher automaticamente</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.parent} › {c.name}</option>)}
          </select></div>
        <div className="fill-in" style={{ animationDelay: "420ms" }}><label className="label">Parcelas</label>
          <select name="installments" className="input" defaultValue={1}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i === 0 ? "À vista" : `${i + 1}x`}</option>)}</select></div>
        {ex.items?.length > 0 && (
          <details className="card text-sm"><summary className="cursor-pointer font-medium">{ex.items.length} itens lidos</summary>
            <ul className="mt-2 space-y-1">{ex.items.map((i: any, k: number) => <li key={k} className="flex justify-between"><span>{i.quantity ?? 1}× {i.description}</span><span>{i.total != null ? Number(i.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : ""}</span></li>)}</ul></details>
        )}
        {state?.error && <p className="text-sm text-coral">{state.error}</p>}
        <button className="btn-primary h-14 w-full text-lg" disabled={pending}>{pending ? "Lançando…" : "Está certo, lançar"}</button>
        <button type="button" className="btn-ghost w-full text-coral" onClick={async () => { if (confirm("Descartar este comprovante?")) { await discardReceipt(receipt.id); router.push("/comprovantes"); } }}>Descartar</button>
      </form>
    </div>
  );
}
