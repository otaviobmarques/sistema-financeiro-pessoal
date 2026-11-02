"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { adjustBalance, saveAccount, payInvoice } from "@/app/actions";

export function AccountForm() {
  const [state, action, pending] = useActionState(saveAccount, undefined);
  const [type, setType] = useState("CHECKING");
  const [open, setOpen] = useState(false);
  if (!open) return <button className="btn-dark w-full" onClick={() => setOpen(true)}>+ Nova conta ou cartão</button>;
  return (
    <form action={action} className="card fill-in space-y-3">
      <h2 className="font-semibold">Nova conta ou cartão</h2>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Tipo</label><select name="type" value={type} onChange={(e) => setType(e.target.value)} className="input">
          <option value="CHECKING">Conta corrente</option><option value="SAVINGS">Poupança</option><option value="WALLET">Dinheiro/carteira</option>
          <option value="MEAL">Vale-refeição/alimentação</option><option value="INVESTMENT">Investimento</option><option value="CREDIT_CARD">Cartão de crédito</option></select></div>
        <div><label className="label">Nome</label><input name="name" required className="input" placeholder="Ex.: Nubank" /></div>
      </div>
      {type === "CREDIT_CARD" ? (
        <div className="grid grid-cols-3 gap-3">
          <div><label className="label">Limite</label><input name="limit" inputMode="decimal" className="input" /></div>
          <div><label className="label">Fecha dia</label><input name="closing" type="number" min={1} max={31} defaultValue={3} className="input" /></div>
          <div><label className="label">Vence dia</label><input name="due" type="number" min={1} max={31} defaultValue={10} className="input" /></div>
        </div>
      ) : <div><label className="label">Saldo inicial</label><input name="initial" inputMode="decimal" className="input" placeholder="0,00" /></div>}
      <div><label className="label">Cor</label><input name="color" type="color" defaultValue="#19C37D" className="h-12 w-20 rounded-xl" /></div>
      {state?.error && <p className="text-sm text-coral">{state.error}</p>}
      {state?.ok && <p className="text-sm text-sobbra">{state.ok}</p>}
      <div className="flex gap-2"><button className="btn-primary flex-1" disabled={pending}>Salvar</button><button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Fechar</button></div>
    </form>
  );
}

/** Ajuste de saldo com lancamento de diferenca (RF-013). */
export function AdjustButton({ id, current }: { id: string; current: number }) {
  const router = useRouter();
  return (
    <button className="muted mt-2 text-xs underline" onClick={async () => {
      const v = prompt("Qual é o saldo real desta conta hoje? (ex.: 1.250,00)");
      if (!v) return;
      const s = v.replace(/[R$\s]/g, ""); const n = Math.round(Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s) * 100);
      if (Number.isFinite(n)) { await adjustBalance(id, current, n); router.refresh(); }
    }}>Ajustar saldo</button>
  );
}

export function PayInvoice({ cardId, amount, accounts }: { cardId: string; amount: number; accounts: { id: string; name: string }[] }) {
  const router = useRouter();
  const [from, setFrom] = useState(accounts[0]?.id);
  if (amount <= 0 || !accounts.length) return null;
  return (
    <div className="mt-3 flex gap-2">
      <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>Pagar com {a.name}</option>)}</select>
      <button className="btn-primary" onClick={async () => { await payInvoice(cardId, from!, amount); router.refresh(); }}>Paguei</button>
    </div>
  );
}
