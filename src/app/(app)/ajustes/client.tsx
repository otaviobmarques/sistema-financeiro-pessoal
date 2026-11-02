"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changePlan, deleteAccount, deleteRule, saveCategory, updatePrefs } from "@/app/actions";

type Prefs = { theme?: "system" | "light" | "dark"; size?: number; contrast?: boolean; noMotion?: boolean };
const read = (): Prefs => { try { return JSON.parse(localStorage.getItem("sobbra-prefs") || "{}"); } catch { return {}; } };

export function Appearance() {
  const [p, setP] = useState<Prefs>({});
  useEffect(() => { setP(read()); }, []);
  const set = (patch: Prefs) => {
    const n = { ...p, ...patch }; setP(n);
    try { localStorage.setItem("sobbra-prefs", JSON.stringify(n)); } catch {}
    const c = document.documentElement.classList;
    const dark = n.theme === "dark" || ((n.theme ?? "system") === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    c.toggle("dark", dark); c.toggle("contrast", !!n.contrast); c.toggle("no-motion", !!n.noMotion);
    document.documentElement.style.fontSize = (n.size ?? 100) + "%";
  };
  return (
    <div className="space-y-3">
      <div><label className="label">Tema</label><div className="grid grid-cols-3 gap-2">{(["system", "light", "dark"] as const).map((t) => (
        <button key={t} onClick={() => set({ theme: t })} className={`btn-ghost ${(p.theme ?? "system") === t ? "ring-2 ring-sobbra" : ""}`}>{t === "system" ? "Automático" : t === "light" ? "Claro" : "Escuro"}</button>))}</div></div>
      <div><label className="label">Tamanho do texto</label><div className="grid grid-cols-4 gap-2">{[100, 125, 150, 200].map((s) => (
        <button key={s} onClick={() => set({ size: s })} className={`btn-ghost ${(p.size ?? 100) === s ? "ring-2 ring-sobbra" : ""}`}>{s}%</button>))}</div></div>
      <label className="flex min-h-[44px] items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={!!p.contrast} onChange={(e) => set({ contrast: e.target.checked })} /> Alto contraste</label>
      <label className="flex min-h-[44px] items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={!!p.noMotion} onChange={(e) => set({ noMotion: e.target.checked })} /> Desativar animações</label>
    </div>
  );
}

export function ServerPrefs({ simple, hide, reminder }: { simple: boolean; hide: boolean; reminder: string | null }) {
  const [, start] = useTransition();
  return (
    <div className="space-y-3">
      <label className="flex min-h-[44px] items-center gap-3"><input type="checkbox" className="h-5 w-5" defaultChecked={simple} onChange={(e) => start(() => updatePrefs({ simpleMode: e.target.checked }))} /> Modo Simples na tela inicial</label>
      <label className="flex min-h-[44px] items-center gap-3"><input type="checkbox" className="h-5 w-5" defaultChecked={hide} onChange={(e) => start(() => updatePrefs({ hideValues: e.target.checked }))} /> Ocultar valores na tela</label>
      <label className="flex min-h-[44px] items-center gap-3">Lembrete diário para revisar gastos
        <input type="time" className="input w-32" defaultValue={reminder ?? ""} onChange={(e) => start(() => updatePrefs({ dailyReminder: e.target.value || null }))} /></label>
    </div>
  );
}

/** Cancelamento em 2 toques, sem retencao forcada (RF-145). */
export function PlanBox({ plan, prices }: { plan: string; prices: { PRO: string; FAMILY: string } }) {
  const [confirming, setConfirming] = useState(false);
  const [p, start] = useTransition();
  const r = useRouter();
  if (plan !== "FREE") return confirming ? (
    <div className="flex gap-2"><button className="btn flex-1 bg-coral text-white" disabled={p} onClick={() => start(async () => { await changePlan("FREE"); setConfirming(false); r.refresh(); })}>Confirmar cancelamento</button><button className="btn-ghost" onClick={() => setConfirming(false)}>Voltar</button></div>
  ) : <button className="btn-ghost w-full" onClick={() => setConfirming(true)}>Cancelar assinatura</button>;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <button className="btn-primary" disabled={p} onClick={() => start(async () => { await changePlan("PRO"); r.refresh(); })}>Assinar Pro · {prices.PRO}/mês</button>
      <button className="btn-dark" disabled={p} onClick={() => start(async () => { await changePlan("FAMILY"); r.refresh(); })}>Família · {prices.FAMILY}/mês</button>
      <p className="muted text-xs sm:col-span-2">Ambiente de testes: a troca é imediata. A cobrança por cartão/Pix entra com o gateway de pagamento.</p>
    </div>
  );
}

export function CategoryForm({ parents }: { parents: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(saveCategory, undefined);
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-4">
      <select name="parentId" className="input sm:col-span-2">{parents.map((p) => <option key={p.id} value={p.id}>Dentro de {p.name}</option>)}</select>
      <input name="name" placeholder="Nova subcategoria" className="input" required />
      <button className="btn-dark" disabled={pending}>Adicionar</button>
      {state?.ok && <p className="text-sm text-sobbra sm:col-span-4">{state.ok}</p>}
    </form>
  );
}

export function RuleDelete({ id }: { id: string }) {
  const [, start] = useTransition();
  return <button className="muted px-2 hover:text-coral" onClick={() => start(() => deleteRule(id))} aria-label="Remover regra">×</button>;
}

export function DeleteAccount() {
  const [state, action, pending] = useActionState(deleteAccount, undefined);
  const [open, setOpen] = useState(false);
  if (!open) return <button className="text-sm text-coral underline" onClick={() => setOpen(true)}>Excluir minha conta e todos os dados</button>;
  return (
    <form action={action} className="rounded-xl border border-coral/40 p-3">
      <p className="text-sm">Isso apaga tudo para sempre: lançamentos, comprovantes e contas. Digite <b>EXCLUIR</b> para confirmar.</p>
      <div className="mt-2 flex gap-2"><input name="confirm" className="input" /><button className="btn bg-coral text-white" disabled={pending}>Excluir</button></div>
      {state?.error && <p className="mt-1 text-sm text-coral">{state.error}</p>}
    </form>
  );
}
