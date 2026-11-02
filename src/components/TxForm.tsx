"use client";
// Adicionar em uma unica tela (RF-163): teclado numerico abre direto, categoria sugerida, data "hoje", Desfazer 5 s.
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveTransaction, suggestCategory, deleteTransactions } from "@/app/actions";
import { UndoToast } from "./ui";

type Acc = { id: string; name: string; type: string };
type Cat = { id: string; name: string; icon: string; kind: string; parent: string | null };
type Tx = { id: string; type: string; amount: string; description: string; accountId: string; toAccountId: string | null; categoryId: string | null; date: string; status: string; tags: string; notes: string };

const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function TxForm({ accounts, categories, defaultAccountId, tx, recurring = false }: { accounts: Acc[]; categories: Cat[]; defaultAccountId?: string; tx?: Tx; recurring?: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveTransaction, undefined);
  const [type, setType] = useState(tx?.type ?? "EXPENSE");
  const [desc, setDesc] = useState(tx?.description ?? "");
  const [cat, setCat] = useState<string>(tx?.categoryId ?? "");
  const [touchedCat, setTouchedCat] = useState(Boolean(tx));
  const [more, setMore] = useState(Boolean(tx));
  const [rec, setRec] = useState(recurring);
  const [toast, setToast] = useState<{ ids: string[] } | null>(null);
  const [accountId, setAccountId] = useState(tx?.accountId ?? defaultAccountId ?? accounts[0]?.id);
  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const isCard = accounts.find((a) => a.id === accountId)?.type === "CREDIT_CARD";

  useEffect(() => {
    if (touchedCat || type === "TRANSFER") return;
    const t = setTimeout(async () => { const id = await suggestCategory(desc, type as any); if (id) setCat(id); }, 300);
    return () => clearTimeout(t);
  }, [desc, type, touchedCat]);

  useEffect(() => {
    if (!state?.ok) return;
    if (tx) { router.push("/lancamentos"); return; }
    setToast({ ids: state.ids ?? [] });
    formRef.current?.reset(); setDesc(""); setCat(""); setTouchedCat(false);
    amountRef.current?.focus();
    if (navigator.vibrate) navigator.vibrate(20);
  }, [state, tx, router]);

  const cats = categories.filter((c) => c.kind === (type === "INCOME" ? "INCOME" : "EXPENSE") && c.parent);

  return (
    <form ref={formRef} action={action} className="mx-auto max-w-md space-y-4">
      {tx && <input type="hidden" name="id" value={tx.id} />}
      <div className="grid grid-cols-3 gap-1 rounded-xl p-1" style={{ background: "var(--line)" }}>
        {[["EXPENSE", "Saiu"], ["INCOME", "Entrou"], ["TRANSFER", "Transferir"]].map(([v, l]) => (
          <button type="button" key={v} onClick={() => { setType(v); setCat(""); setTouchedCat(false); }} className={`min-h-[44px] rounded-lg font-semibold ${type === v ? (v === "INCOME" ? "bg-sobbra text-white" : v === "EXPENSE" ? "bg-coral text-white" : "bg-floresta text-white") : ""}`}>{l}</button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />
      <div>
        <label className="label" htmlFor="amount">Valor</label>
        <input ref={amountRef} id="amount" name="amount" inputMode="decimal" autoFocus required defaultValue={tx?.amount} placeholder="0,00" className="input h-16 text-center text-3xl font-bold" />
      </div>
      <div>
        <label className="label" htmlFor="description">{type === "TRANSFER" ? "Descrição" : type === "INCOME" ? "De onde veio?" : "Com o que foi?"}</label>
        <input id="description" name="description" value={desc} onChange={(e) => setDesc(e.target.value)} className="input" placeholder={type === "INCOME" ? "Ex.: salário, freela" : "Ex.: mercado, gasolina, iFood"} />
      </div>
      {type !== "TRANSFER" && (
        <div>
          <label className="label" htmlFor="categoryId">Categoria {cat && !touchedCat && <span className="muted text-xs">(sugerida)</span>}</label>
          <select id="categoryId" name="categoryId" value={cat} onChange={(e) => { setCat(e.target.value); setTouchedCat(true); }} className="input">
            <option value="">Escolher automaticamente</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.parent} › {c.name}</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="accountId">{type === "TRANSFER" ? "De" : "Conta ou cartão"}</label>
          <select id="accountId" name="accountId" value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input">
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        {type === "TRANSFER" ? (
          <div><label className="label" htmlFor="toAccountId">Para</label>
            <select id="toAccountId" name="toAccountId" defaultValue={tx?.toAccountId ?? ""} className="input"><option value="">Escolha</option>{accounts.filter((a) => a.id !== accountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        ) : (
          <div><label className="label" htmlFor="date">Data</label><input id="date" name="date" type="date" defaultValue={tx?.date ?? today()} className="input" /></div>
        )}
      </div>
      {type === "TRANSFER" && <div><label className="label" htmlFor="date">Data</label><input id="date" name="date" type="date" defaultValue={tx?.date ?? today()} className="input" /></div>}

      {!tx && type !== "TRANSFER" && (
        <div className={`card space-y-2 ${rec ? "ring-2 ring-sobbra" : ""}`}>
          <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" name="recurrence" value="monthly" checked={rec} onChange={(e) => setRec(e.target.checked)} className="mt-0.5 h-5 w-5" />
            <span><b>Repete todo mês</b><span className="muted block text-sm">Aluguel, salário, escola, assinatura. Os próximos meses ficam agendados como pendentes.</span></span></label>
          {rec && <div><label className="label" htmlFor="recurrenceMonths">Por quantos meses</label><select id="recurrenceMonths" name="recurrenceMonths" defaultValue="12" className="input"><option value="6">6 meses</option><option value="12">12 meses</option><option value="24">24 meses</option><option value="36">36 meses</option></select></div>}
        </div>
      )}
      <button type="button" className="muted text-sm font-semibold" onClick={() => setMore(!more)}>{more ? "− Menos opções" : "+ Mais opções"}</button>
      {more && (
        <div className="card fill-in space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="status">Situação</label><select id="status" name="status" defaultValue={tx?.status ?? "PAID"} className="input"><option value="PAID">{type === "INCOME" ? "Recebido" : "Pago"}</option><option value="PENDING">Pendente</option></select></div>
            {!tx && type === "EXPENSE" && !rec && <div><label className="label" htmlFor="installments">Parcelas</label><select id="installments" name="installments" className="input" defaultValue={1}>{Array.from({ length: 24 }, (_, i) => <option key={i} value={i + 1}>{i === 0 ? "À vista" : `${i + 1}x`}</option>)}</select></div>}
          </div>
          <div><label className="label" htmlFor="tags">Tags</label><input id="tags" name="tags" defaultValue={tx?.tags} className="input" placeholder="#trabalho #viagem" /></div>
          <div><label className="label" htmlFor="notes">Observação</label><textarea id="notes" name="notes" defaultValue={tx?.notes} className="input min-h-[80px] py-2" /></div>
          {isCard && <p className="muted text-xs">💳 Compras no cartão caem automaticamente na fatura certa, conforme o dia de fechamento.</p>}
        </div>
      )}
      {!more && <input type="hidden" name="status" value="PAID" />}
      {state?.error && <p role="alert" className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{state.error}</p>}
      <button className="btn-primary h-14 w-full text-lg" disabled={pending}>{pending ? "Salvando…" : tx ? "Salvar alterações" : "Lançar"}</button>
      {toast && <UndoToast message="Pronto! Lançado." seconds={5} onUndo={() => { deleteTransactions(toast.ids); router.refresh(); }} onClose={() => setToast(null)} />}
    </form>
  );
}
