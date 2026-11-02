"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount, deleteRule, saveCategory, updatePrefs } from "@/app/actions";
import { startCheckout, cancelSubscription } from "@/app/actions-f2";
import { SkinSwitch } from "@/components/SkinSwitch";

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
      <div><span className="label">Estilo de cores</span><SkinSwitch /><p className="muted mt-1 text-xs">Vibrante: cores fortes e menu escuro. Sutil: tons neutros e menu claro.</p></div>
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

type PlanOpt = { code: string; name: string; description: string; price: number; yearly: number | null; trialDays: number };
const brlc = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Assinar pelo gateway e cancelar em 2 toques, sem retencao forcada (RF-145). */
export function PlanBox({ plan, plans, gateway, needsCpf, cpf, renewsAt, canceled, cycles = "both" }: { plan: string; plans: PlanOpt[]; gateway: boolean; needsCpf: boolean; cpf: string | null; renewsAt: string | null; canceled: boolean; cycles?: "both" | "monthly" | "yearly" }) {
  const [confirming, setConfirming] = useState(false);
  const [cycle, setCycle] = useState<"monthly" | "yearly">(cycles === "yearly" ? "yearly" : "monthly");
  const [choice, setChoice] = useState<PlanOpt | null>(null);
  const [doc, setDoc] = useState(cpf ?? "");
  const [msg, setMsg] = useState<string>();
  const [p, start] = useTransition();
  const r = useRouter();
  if (plan !== "FREE") {
    if (canceled) return <p className="soft rounded-xl p-3 text-sm">Assinatura cancelada. {renewsAt ? `Você continua com o plano até ${new Date(renewsAt).toLocaleDateString("pt-BR")} e depois volta para o Grátis, sem perder nada.` : ""}</p>;
    return confirming ? (
      <div className="space-y-2"><p className="text-sm">Cancelar? {renewsAt ? `O plano continua valendo até ${new Date(renewsAt).toLocaleDateString("pt-BR")}.` : ""} Seus dados ficam guardados.</p>
        <div className="flex gap-2"><button className="btn flex-1 bg-coral text-white" disabled={p} onClick={() => start(async () => { const x = await cancelSubscription(); if (x.error) setMsg(x.error); setConfirming(false); r.refresh(); })}>Confirmar cancelamento</button><button className="btn-ghost" onClick={() => setConfirming(false)}>Voltar</button></div>
        </div>
    ) : <div className="space-y-2"><button className="btn-ghost w-full" onClick={() => setConfirming(true)}>Cancelar assinatura</button>{msg && <p className="text-sm text-coral">{msg}</p>}</div>;
  }
  if (!gateway) return <p className="soft rounded-xl p-3 text-sm">A assinatura pelo app chega em breve. Enquanto isso, o plano Grátis tem tudo para você começar.</p>;
  const hasYearly = cycles === "both" && plans.some((x) => x.yearly);
  return (
    <div className="space-y-3">
      {hasYearly && <div className="inline-flex rounded-xl p-1" style={{ background: "var(--line)" }}>{(["monthly", "yearly"] as const).map((c) => <button key={c} className={`min-h-[40px] rounded-lg px-4 text-sm font-semibold ${cycle === c ? "bg-sobbra text-white" : ""}`} onClick={() => setCycle(c)}>{c === "monthly" ? "Mensal" : "Anual"}</button>)}</div>}
      <div className="grid gap-2 sm:grid-cols-2">{plans.map((x) => { const price = cycle === "yearly" ? x.yearly : x.price; if (!price) return null; return (
        <button key={x.code} className={`card text-left ${choice?.code === x.code ? "ring-2 ring-sobbra" : ""}`} onClick={() => { setChoice(x); setMsg(undefined); }}>
          <b>{x.name}</b> · {brlc(price)}/{cycle === "yearly" ? "ano" : "mês"}{cycle === "yearly" && x.yearly ? <span className="ml-1 text-xs text-sobbra">economize {Math.round((1 - x.yearly / (x.price * 12)) * 100)}%</span> : null}
          <span className="muted block text-sm">{x.description}</span>{x.trialDays > 0 && <span className="mt-1 block text-xs font-bold text-sobbra">{x.trialDays} dias grátis para testar</span>}</button>); })}</div>
      {choice && (
        <div className="flex flex-wrap items-end gap-2">
          {needsCpf && <div><label className="label" htmlFor="cpf">CPF (para emitir a cobrança)</label><input id="cpf" className="input" inputMode="numeric" value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="000.000.000-00" /></div>}
          <button className="btn-primary" disabled={p} onClick={() => start(async () => { const x = await startCheckout(choice.code, cycle, doc); if (x.error) setMsg(x.error); else if (x.url) window.location.href = x.url; })}>{p ? "Abrindo pagamento…" : `Assinar ${choice.name}`}</button>
        </div>
      )}
      {msg && <p className="text-sm text-coral">{msg}</p>}
      <p className="muted text-xs">Pagamento seguro pelo gateway. Avisamos 3 dias antes de cada renovação. Cancele quando quiser, aqui mesmo.</p>
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
