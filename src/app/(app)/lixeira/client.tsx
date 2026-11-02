"use client";
import { useRouter } from "next/navigation";
import { restoreTransactions, purgeTransaction } from "@/app/actions";
export function TrashActions({ id }: { id: string }) {
  const r = useRouter();
  return (<div className="flex gap-1">
    <button className="btn-ghost min-h-[40px] text-sm" onClick={async () => { await restoreTransactions([id]); r.refresh(); }}>Recuperar</button>
    <button className="btn-ghost min-h-[40px] text-sm text-coral" onClick={async () => { if (confirm("Apagar de vez? Não dá para desfazer.")) { await purgeTransaction(id); r.refresh(); } }}>Apagar</button>
  </div>);
}
