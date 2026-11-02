"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MiniBars } from "@/components/Charts";
import { applyPlan } from "@/app/actions-f2";

type A = { text: string; facts: { label: string; value: string }[]; bars?: { name: string; value: number; color: string }[]; link?: string; actions?: { label: string; action: "apply_plan" }[] };
type M = { role: "user" | "assistant"; text: string; data?: A };

const SUGGESTIONS = ["Com o que estou gastando mais?", "O que estou fazendo de errado?", "Me ajuda a me organizar", "Se eu cortar delivery pela metade?", "Consigo comprar um celular de R$ 2.000 em 10 vezes?", "Quanto sobra em 6 meses?", "Quanto ainda posso gastar?"];

export function Chat({ history }: { history: M[] }) {
  const [msgs, setMsgs] = useState<M[]>(history);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setMsgs((m) => [...m, { role: "user", text: question }]); setQ(""); setBusy(true);
    try {
      const r = await fetch("/api/advisor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question }) });
      const j = await r.json();
      setMsgs((m) => [...m, { role: "assistant", text: j.answer?.text ?? j.error ?? "Não consegui responder agora.", data: j.answer }]);
    } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="space-y-3">
        {msgs.length === 0 && <div className="soft rounded-2xl p-4 text-sm">Oi! Eu olho seus lançamentos e te respondo em segundos. Escolha uma pergunta abaixo ou escreva a sua.</div>}
        {msgs.map((m, i) => (
          <div key={i} className={`fill-in rounded-2xl p-3 ${m.role === "user" ? "ml-12 bg-floresta text-white" : "card mr-6"}`}>
            <p className="whitespace-pre-line">{m.text}</p>
            {m.data?.facts?.length ? <div className="mt-2 flex flex-wrap gap-2">{m.data.facts.map((f) => <span key={f.label} className="soft rounded-lg px-2 py-1 text-xs"><span className="muted">{f.label}:</span> <b className="money">{f.value}</b></span>)}</div> : null}
            {m.data?.bars?.length ? <div className="mt-3"><MiniBars data={m.data.bars} /></div> : null}
            {m.data?.actions?.map((x) => <button key={x.action} className="btn-primary mr-2 mt-3 min-h-[40px] text-sm" disabled={busy} onClick={async () => { setBusy(true); try { const r = await applyPlan(); setMsgs((ms) => [...ms, { role: "assistant", text: `Pronto! Criei ${r.budgets} orçamento${r.budgets === 1 ? "" : "s"}${r.goal ? " e a meta de reserva de emergência" : ""}. Você acompanha tudo em Orçamentos e metas.`, data: { text: "", facts: [], link: "/orcamentos" } }]); } finally { setBusy(false); } }}>{x.label}</button>)}
            {m.data?.link && <Link href={m.data.link} className="mt-2 inline-block text-sm font-semibold text-sobbra">{m.data.link.startsWith("/orcamentos") ? "Abrir orçamentos e metas ›" : "Ver lançamentos ›"}</Link>}
          </div>
        ))}
        {busy && <div className="card mr-6 w-20 animate-pulse">…</div>}
        <div ref={end} />
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">{SUGGESTIONS.map((s) => <button key={s} onClick={() => ask(s)} className="btn-ghost min-h-[40px] shrink-0 text-sm font-medium">{s}</button>)}</div>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escreva sua pergunta" aria-label="Pergunta" />
        <button className="btn-primary" disabled={busy}>Perguntar</button>
      </form>
    </div>
  );
}
