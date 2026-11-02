"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkCategorize, deleteTransactions, restoreTransactions, toggleStatus } from "@/app/actions";
import { Money, UndoToast } from "@/components/ui";

type T = { id: string; type: string; amountCents: number; description: string; merchant: string | null; date: string; status: string; account: string; toAccount: string | null;
  category: { name: string; parent: string | null; icon: string; color: string } | null; tags: string[]; origin: string; lowConfidence: boolean };

const ORIGIN: Record<string, string> = { VOICE: "🎙️", RECEIPT: "📷", IMPORT: "📥", OPEN_FINANCE: "🏦", RECURRENCE: "🔁", MANUAL: "" };

export function TxList({ txs, categories }: { txs: T[]; categories: { id: string; label: string; kind: string }[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ids: string[] } | null>(null);
  const [rulePrompt, setRulePrompt] = useState<{ ids: string[]; cat: string; merchant: string } | null>(null);
  const groups = new Map<string, T[]>();
  for (const t of txs) { const k = new Date(t.date).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }); groups.set(k, [...(groups.get(k) ?? []), t]); }
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const remove = (ids: string[]) => start(async () => {
    if (!confirm(ids.length > 1 ? `Mover ${ids.length} lançamentos para a lixeira?` : "Mover para a lixeira? Você pode recuperar por 30 dias.")) return;
    await deleteTransactions(ids); setSel(new Set()); setToast({ msg: "Movido para a lixeira.", ids }); router.refresh();
  });

  const recat = (catId: string) => {
    const ids = [...sel];
    const first = txs.find((t) => t.id === ids[0]);
    const merchant = first?.merchant || first?.description.replace(/\s*\(\d+\/\d+\)$/, "") || "";
    // Aprendizado (RF-042): pergunta se aplica a todos daquele estabelecimento
    setRulePrompt({ ids, cat: catId, merchant });
  };

  if (!txs.length) return <div className="card muted text-center">Nenhum lançamento encontrado. Tente outro filtro ou <Link className="text-sobbra" href="/lancamentos/novo">adicione um</Link>.</div>;

  return (
    <div className="space-y-4">
      {sel.size > 0 && (
        <div className="card fill-in sticky top-14 z-20 flex flex-wrap items-center gap-2">
          <b>{sel.size} selecionado{sel.size > 1 ? "s" : ""}</b>
          <select className="input max-w-xs flex-1" defaultValue="" onChange={(e) => e.target.value && recat(e.target.value)}>
            <option value="">Mudar categoria para…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <button className="btn-ghost text-coral" onClick={() => remove([...sel])} disabled={pending}>Excluir</button>
          <button className="btn-ghost" onClick={() => setSel(new Set())}>Cancelar</button>
        </div>
      )}
      {[...groups.entries()].map(([day, items]) => (
        <section key={day}>
          <h2 className="muted mb-1 px-1 text-xs font-semibold uppercase">{day}</h2>
          <ul className="card divide-y p-0" style={{ borderColor: "var(--line)" }}>
            {items.map((t) => <Row key={t.id} t={t} selected={sel.has(t.id)} onSelect={() => toggle(t.id)} onDelete={() => remove([t.id])} onToggle={() => start(async () => { await toggleStatus(t.id); router.refresh(); })} />)}
          </ul>
        </section>
      ))}
      {rulePrompt && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="card fill-in max-w-sm">
            <p className="font-semibold">Aplicar a todos de “{rulePrompt.merchant}”?</p>
            <p className="muted mt-1 text-sm">Assim o Sobbra aprende e, daqui pra frente, classifica sozinho.</p>
            <div className="mt-4 flex gap-2">
              <button className="btn-primary flex-1" onClick={() => start(async () => { await bulkCategorize(rulePrompt.ids, rulePrompt.cat, rulePrompt.merchant); setRulePrompt(null); setSel(new Set()); router.refresh(); })}>Sim, sempre</button>
              <button className="btn-ghost flex-1" onClick={() => start(async () => { await bulkCategorize(rulePrompt.ids, rulePrompt.cat); setRulePrompt(null); setSel(new Set()); router.refresh(); })}>Só estes</button>
            </div>
          </div>
        </div>
      )}
      {toast && <UndoToast message={toast.msg} seconds={6} onUndo={() => { restoreTransactions(toast.ids); router.refresh(); }} onClose={() => setToast(null)} />}
    </div>
  );
}

/** Linha com deslizar: direita = marcar pago, esquerda = excluir (RF-154). */
function Row({ t, selected, onSelect, onDelete, onToggle }: { t: T; selected: boolean; onSelect: () => void; onDelete: () => void; onToggle: () => void }) {
  const [dx, setDx] = useState(0);
  const x0 = useRef<number | null>(null);
  const sign = t.type === "INCOME" ? 1 : t.type === "EXPENSE" ? -1 : 0;
  return (
    <li className="relative overflow-hidden" style={{ borderColor: "var(--line)" }}>
      <div className="absolute inset-0 flex items-center justify-between px-4 text-sm font-semibold text-white" style={{ background: dx > 0 ? "#19C37D" : "#E5484D" }}>
        <span>{t.status === "PAID" ? "Marcar pendente" : "Marcar pago"}</span><span>Excluir</span>
      </div>
      <div
        className="relative flex min-h-[60px] items-center gap-3 px-3 py-2 transition-transform"
        style={{ transform: `translateX(${dx}px)`, background: "var(--card)", transitionDuration: x0.current === null ? "200ms" : "0ms" }}
        onTouchStart={(e) => (x0.current = e.touches[0].clientX)}
        onTouchMove={(e) => x0.current !== null && setDx(Math.max(-120, Math.min(120, e.touches[0].clientX - x0.current)))}
        onTouchEnd={() => { if (dx > 90) onToggle(); if (dx < -90) onDelete(); if ((dx > 90 || dx < -90) && navigator.vibrate) navigator.vibrate(15); x0.current = null; setDx(0); }}
      >
        <input type="checkbox" checked={selected} onChange={onSelect} className="h-5 w-5 shrink-0" aria-label="Selecionar" />
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg" style={{ background: (t.category?.color ?? "#94A3B8") + "22" }}>{t.type === "TRANSFER" ? "🔄" : t.category?.icon ?? "❔"}</span>
        <Link href={`/lancamentos/${t.id}`} className="min-w-0 flex-1">
          <p className="truncate font-medium">{t.description} <span className="text-xs">{ORIGIN[t.origin]}</span></p>
          <p className="muted truncate text-xs">
            {t.type === "TRANSFER" ? `${t.account} → ${t.toAccount}` : <>{t.category ? `${t.category.parent ?? ""}${t.category.parent ? " › " : ""}${t.category.name}` : "Sem categoria"} · {t.account}</>}
            {t.lowConfidence && <span className="ml-1 text-ambar">· confira a categoria</span>}
            {t.tags.map((g) => <span key={g} className="ml-1">#{g}</span>)}
          </p>
        </Link>
        <div className="text-right">
          <Money cents={sign * t.amountCents || t.amountCents} sign={sign > 0} className={`font-semibold ${sign > 0 ? "text-sobbra" : sign < 0 ? "" : "muted"}`} />
          <button onClick={onToggle} className={`block w-full text-right text-xs ${t.status === "PAID" ? "muted" : "font-semibold text-ambar"}`}>{t.status === "PAID" ? (t.type === "INCOME" ? "recebido" : "pago") : "pendente"}</button>
        </div>
        <button onClick={onDelete} className="muted hidden px-1 text-lg hover:text-coral md:block" aria-label="Excluir">🗑️</button>
      </div>
    </li>
  );
}
