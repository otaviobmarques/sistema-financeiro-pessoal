import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { monthLabel, monthKey } from "@/lib/money";
import { Money } from "@/components/ui";
import { StopButton } from "./client";

export default async function Recorrentes() {
  const user = await requireUser();
  const txs = await db.transaction.findMany({ where: { userId: user.id, deletedAt: null, recurrence: "monthly", groupId: { not: null } }, include: { category: { include: { parent: true } }, account: true }, orderBy: { date: "asc" } });
  const now = new Date();
  const groups = new Map<string, typeof txs>();
  for (const t of txs) groups.set(t.groupId!, [...(groups.get(t.groupId!) ?? []), t]);
  const list = [...groups.entries()].map(([id, items]) => {
    const last = items[items.length - 1]; const next = items.find((t) => t.date > now || t.status === "PENDING");
    return { id, t: last, next, until: last.date, future: items.filter((t) => t.date > now && t.status === "PENDING").length };
  }).sort((a, b) => b.t.amountCents - a.t.amountCents);
  const out = list.filter((g) => g.t.type === "EXPENSE"), inc = list.filter((g) => g.t.type === "INCOME");
  const sum = (l: typeof list) => l.filter((g) => g.future > 0 || g.next).reduce((s, g) => s + g.t.amountCents, 0);
  const Row = ({ g }: { g: (typeof list)[number] }) => (
    <li className="line flex flex-wrap items-center gap-3 border-t py-3 first:border-0">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg" style={{ background: (g.t.category?.color ?? "#94A3B8") + "22" }}>{g.t.category?.icon ?? "🔁"}</span>
      <div className="min-w-[160px] flex-1">
        <p className="font-semibold">{g.t.description} <span className="soft ml-1 rounded-full px-2 py-0.5 text-xs">todo dia {g.t.date.getDate()}</span></p>
        <p className="muted text-xs">{g.t.category ? `${g.t.category.parent?.name ?? ""}${g.t.category.parent ? " › " : ""}${g.t.category.name}` : "Sem categoria"} · {g.t.account.name} · {g.next ? `próxima em ${g.next.date.toLocaleDateString("pt-BR")}` : "sem próximas"}{g.future ? ` · agendada até ${monthLabel(monthKey(g.until))}` : ""}</p>
      </div>
      <Money cents={g.t.amountCents} className={`font-semibold ${g.t.type === "INCOME" ? "text-sobbra" : ""}`} />
      {g.future > 0 && <StopButton groupId={g.id} />}
    </li>
  );
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold">Fixas e recorrentes</h1><p className="muted text-sm">Lance uma vez e o Sobbra agenda os próximos meses.</p></div>
        <Link href="/lancamentos/novo?recorrente=1" className="btn-primary">+ Nova despesa fixa</Link>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="card"><p className="muted text-sm">Saem todo mês</p><p className="text-2xl font-bold text-coral"><Money cents={sum(out)} /></p></div>
        <div className="card"><p className="muted text-sm">Entram todo mês</p><p className="text-2xl font-bold text-sobbra"><Money cents={sum(inc)} /></p></div>
        <div className="card"><p className="muted text-sm">Sobra depois das fixas</p><p className="text-2xl font-bold"><Money cents={sum(inc) - sum(out)} /></p></div>
      </div>
      <section className="card"><h2 className="font-semibold">Despesas fixas</h2>{out.length ? <ul>{out.map((g) => <Row key={g.id} g={g} />)}</ul> : <p className="muted mt-2 text-sm">Nenhuma ainda. Use “Nova despesa fixa” ou diga no 🎙️ “aluguel 1.400 todo mês dia 8”.</p>}</section>
      <section className="card mt-4"><h2 className="font-semibold">Receitas fixas</h2>{inc.length ? <ul>{inc.map((g) => <Row key={g.id} g={g} />)}</ul> : <p className="muted mt-2 text-sm">Nenhuma ainda.</p>}</section>
    </div>
  );
}
