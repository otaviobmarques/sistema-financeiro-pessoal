"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { readBoleto, saveBill, payBill, deleteBill, scheduleMonthly } from "@/app/actions-f2";

type Read = Awaited<ReturnType<typeof readBoleto>>;

/** Camera com BarcodeDetector (Chrome/Android) para o codigo de barras ITF do boleto. */
function Scanner({ onCode, onClose }: { onCode: (c: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [msg, setMsg] = useState("Aponte para o código de barras, com o boleto deitado.");
  useEffect(() => {
    let stream: MediaStream | null = null, alive = true;
    (async () => {
      const BD = (window as any).BarcodeDetector;
      if (!BD) { setMsg("Este navegador não lê código de barras pela câmera. Cole a linha digitável."); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.current!.srcObject = stream; await video.current!.play();
        const det = new BD({ formats: ["itf", "code_128"] });
        while (alive) {
          const codes = await det.detect(video.current!).catch(() => []);
          const hit = codes.map((c: any) => String(c.rawValue).replace(/\D/g, "")).find((v: string) => v.length === 44);
          if (hit) { if (navigator.vibrate) navigator.vibrate(40); onCode(hit); return; }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch { setMsg("Não consegui abrir a câmera. Libere o acesso ou cole a linha digitável."); }
    })();
    return () => { alive = false; stream?.getTracks().forEach((t) => t.stop()); };
  }, [onCode]);
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-4 text-white">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl scanner"><video ref={video} playsInline muted className="w-full" /></div>
      <p className="text-center text-sm">{msg}</p>
      <button className="btn bg-white/15 text-white" onClick={onClose}>Fechar</button>
    </div>
  );
}

export function BillForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveBill, undefined);
  const [line, setLine] = useState("");
  const [info, setInfo] = useState<Read | null>(null);
  const [scan, setScan] = useState(false);
  const [vals, setVals] = useState({ payee: "", amount: "", dueDate: "" });
  const [reading, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) { formRef.current?.reset(); setLine(""); setInfo(null); setVals({ payee: "", amount: "", dueDate: "" }); router.refresh(); } }, [state, router]);
  const read = (v: string) => start(async () => {
    const r = await readBoleto(v); setInfo(r);
    if (!("error" in r) || !r.error) {
      const b = r as Exclude<Read, { error: string }>;
      setLine(b.digitableLine);
      setVals((x) => ({ payee: x.payee || b.bank || b.segment || "", amount: b.amountCents ? (b.amountCents / 100).toFixed(2).replace(".", ",") : x.amount, dueDate: b.dueDate ?? x.dueDate }));
    }
  });
  const ok = info && !("error" in info && info.error) ? (info as Exclude<Read, { error: string }>) : null;
  return (
    <form ref={formRef} action={action} className="card space-y-3">
      <h2 className="font-semibold">Nova conta</h2>
      <div className="flex flex-wrap gap-2">
        <input name="line" value={line} onChange={(e) => { setLine(e.target.value); const d = e.target.value.replace(/\D/g, ""); if ([44, 47, 48].includes(d.length)) read(d); }} className="input min-w-[220px] flex-1 font-mono text-sm" placeholder="Cole ou digite a linha digitável do boleto" aria-label="Linha digitável" inputMode="numeric" />
        <button type="button" className="btn-dark" onClick={() => setScan(true)}>📷 Ler pela câmera</button>
      </div>
      {reading && <p className="muted text-sm">Lendo…</p>}
      {info && "error" in info && info.error && <p className="text-sm text-coral">{info.error}</p>}
      {ok && <p className={`rounded-xl p-3 text-sm ${ok.valid ? "soft" : "bg-coral/10 text-coral"}`}>{ok.valid ? `✅ ${ok.kind === "bancario" ? `Boleto ${ok.bank}` : `Conta de ${ok.segment}`}${ok.amountCents ? ` de ${(ok.amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""}${ok.dueDate ? `, vence ${new Date(ok.dueDate + "T12:00").toLocaleDateString("pt-BR")}` : ""}.${ok.kind === "arrecadacao" ? " Contas de consumo não trazem o vencimento no código: informe abaixo." : ""}` : ok.problem}</p>}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2"><label className="label" htmlFor="payee">Para quem</label><input id="payee" name="payee" required className="input" value={vals.payee} onChange={(e) => setVals({ ...vals, payee: e.target.value })} placeholder="Ex.: Conta de luz, escola" /></div>
        <div><label className="label" htmlFor="amount">Valor</label><input id="amount" name="amount" required inputMode="decimal" className="input" value={vals.amount} onChange={(e) => setVals({ ...vals, amount: e.target.value })} placeholder="0,00" /></div>
        <div><label className="label" htmlFor="dueDate">Vencimento</label><input id="dueDate" name="dueDate" type="date" required className="input" value={vals.dueDate} onChange={(e) => setVals({ ...vals, dueDate: e.target.value })} /></div>
        <div><label className="label" htmlFor="remindDays">Lembrar</label><select id="remindDays" name="remindDays" className="input" defaultValue="3"><option value="0">No dia</option><option value="1">1 dia antes</option><option value="3">3 dias antes</option><option value="7">7 dias antes</option></select></div>
        <div className="sm:col-span-3"><label className="label" htmlFor="pix">Código Pix copia e cola (opcional)</label><input id="pix" name="pix" className="input font-mono text-xs" placeholder="00020126…" /></div>
      </div>
      {state?.error && <p className="text-sm text-coral">{state.error}</p>}
      {state?.ok && <p className="soft rounded-xl p-3 text-sm">{state.ok}</p>}
      <button className="btn-primary" disabled={pending}>Salvar conta</button>
      {scan && <Scanner onClose={() => setScan(false)} onCode={(c) => { setScan(false); read(c); }} />}
    </form>
  );
}

export function BillActions({ id, line, pix, accounts }: { id: string; line: string | null; pix: string | null; accounts: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);
  const [acc, setAcc] = useState(accounts[0]?.id);
  const copy = async (v: string, what: string) => { try { await navigator.clipboard.writeText(v.replace(/[\s.-]/g, what === "linha" ? "" : "$&")); setCopied(what); setTimeout(() => setCopied(null), 2000); } catch {} };
  return (
    <span className="flex flex-wrap gap-1">
      {line && <button className="btn-ghost min-h-[38px] text-sm" onClick={() => copy(line, "linha")}>{copied === "linha" ? "Copiada!" : "Copiar linha"}</button>}
      {pix && <button className="btn-ghost min-h-[38px] text-sm" onClick={() => copy(pix, "pix")}>{copied === "pix" ? "Copiado!" : "Copiar Pix"}</button>}
      {accounts.length > 1 && <select className="input h-[38px] min-h-0 w-auto py-0 text-sm" value={acc} onChange={(e) => setAcc(e.target.value)} aria-label="Pago com">{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>}
      <button className="btn-primary min-h-[38px] text-sm" disabled={pending} onClick={() => start(async () => { await payBill(id, acc); router.refresh(); })}>Paguei</button>
      <button className="muted px-2 text-xs underline" disabled={pending} onClick={() => start(async () => { await deleteBill(id); router.refresh(); })}>Excluir</button>
    </span>
  );
}

export function ScheduleButton({ name, amount, day }: { name: string; amount: number; day: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <button className="btn-ghost min-h-[38px] text-sm" disabled={pending} onClick={() => start(async () => { await scheduleMonthly(name, amount, day); router.refresh(); })}>Agendar todo mês</button>;
}
