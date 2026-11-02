"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setNfceItemCategory, launchNfce } from "@/app/actions-f2";

export function ItemCategory({ id, value, options }: { id: string; value: string | null; options: { id: string; label: string }[] }) {
  const router = useRouter(); const [p, start] = useTransition();
  return <select className="input h-9 min-h-0 py-0 text-xs" defaultValue={value ?? ""} disabled={p} aria-label="Categoria do item" onChange={(e) => start(async () => { await setNfceItemCategory(id, e.target.value || null); router.refresh(); })}><option value="">Sem categoria</option>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>;
}

export function Launch({ id, accounts, manual, merchant, groups }: { id: string; accounts: { id: string; name: string }[]; manual: boolean; merchant: string; groups: number }) {
  const router = useRouter();
  const [acc, setAcc] = useState(accounts[0]?.id ?? "");
  const [m, setM] = useState({ merchant, amount: "", date: new Date().toISOString().slice(0, 10) });
  const [err, setErr] = useState<string>();
  const [p, start] = useTransition();
  return (
    <div className="card space-y-3">
      {manual && <div className="grid gap-2 sm:grid-cols-3">
        <div><label className="label" htmlFor="n-m">Estabelecimento</label><input id="n-m" className="input" value={m.merchant} onChange={(e) => setM({ ...m, merchant: e.target.value })} /></div>
        <div><label className="label" htmlFor="n-a">Total da nota</label><input id="n-a" className="input" inputMode="decimal" value={m.amount} onChange={(e) => setM({ ...m, amount: e.target.value })} placeholder="0,00" /></div>
        <div><label className="label" htmlFor="n-d">Data</label><input id="n-d" type="date" className="input" value={m.date} onChange={(e) => setM({ ...m, date: e.target.value })} /></div></div>}
      <div className="flex flex-wrap items-end gap-2">
        <div><label className="label" htmlFor="n-acc">Pago com</label><select id="n-acc" className="input" value={acc} onChange={(e) => setAcc(e.target.value)}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        <button className="btn-primary" disabled={p} onClick={() => start(async () => { const r = await launchNfce(id, acc, manual ? m : undefined); if (r.error) setErr(r.error); else router.refresh(); })}>{p ? "Lançando…" : groups > 1 ? `Lançar separado em ${groups} categorias` : "Lançar"}</button>
      </div>
      {err && <p className="text-sm text-coral">{err}</p>}
    </div>
  );
}
