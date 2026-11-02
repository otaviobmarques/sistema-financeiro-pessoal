import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { agendaItems, type AgendaItem } from "@/lib/agenda";
import { monthKey, brl } from "@/lib/money";
import { Money } from "@/components/ui";
import { EventForm, ItemActions } from "./client";

const COLOR: Record<AgendaItem["kind"], string> = { compromisso: "#3B82F6", lembrete: "#8B5CF6", conta: "#E5484D", receber: "#19C37D" };
const LABEL: Record<AgendaItem["kind"], string> = { compromisso: "Compromisso", lembrete: "Lembrete", conta: "Conta a pagar", receber: "Dinheiro a receber" };
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function Item({ e }: { e: AgendaItem }) {
  const label = e.source === "fatura" ? "Fatura do cartão" : LABEL[e.kind];
  return (
    <li className="line flex flex-wrap items-center gap-3 border-t py-3 first:border-0">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xs font-bold" style={{ background: COLOR[e.kind] + "22", color: COLOR[e.kind] }}>{e.time ?? e.date.getDate()}</span>
      <div className="min-w-[150px] flex-1">
        {e.href ? <Link href={e.href} className="font-semibold hover:underline">{e.title}</Link> : <p className="font-semibold">{e.title}</p>}
        <p className="muted text-xs">{label} · {e.date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}{e.time ? ` às ${e.time}` : ""}</p>
      </div>
      {e.amountCents ? <Money cents={e.amountCents} className={`font-semibold ${e.kind === "receber" ? "text-sobbra" : ""}`} /> : null}
      <ItemActions eventId={e.eventId} txId={e.txId} canPay={(e.kind === "conta" && e.source !== "fatura" && (e.source === "lancamento" || !!e.amountCents))} canDelete={e.source === "evento"} />
    </li>
  );
}

export default async function Agenda({ searchParams }: { searchParams: Promise<{ mes?: string; dia?: string; novo?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const now = new Date();
  const month = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : monthKey(now);
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1), last = new Date(y, m, 0, 23, 59, 59);
  const sel = /^\d{4}-\d{2}-\d{2}$/.test(sp.dia ?? "") ? sp.dia! : ymd(now).slice(0, 7) === month ? ymd(now) : `${month}-01`;
  const today0 = new Date(now); today0.setHours(0, 0, 0, 0);
  const week = new Date(today0); week.setDate(week.getDate() + 7); week.setHours(23, 59, 59);
  const [items, next7] = await Promise.all([agendaItems(user.id, first, last), agendaItems(user.id, today0, week)]);
  const byDay = new Map<string, AgendaItem[]>();
  for (const e of items) byDay.set(ymd(e.date), [...(byDay.get(ymd(e.date)) ?? []), e]);
  const dayItems = byDay.get(sel) ?? [];
  const dueWeek = next7.filter((e) => e.kind === "conta").reduce((s, e) => s + (e.amountCents ?? 0), 0);
  const title = first.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const prev = monthKey(new Date(y, m - 2, 1)), nxt = monthKey(new Date(y, m, 1));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold">Agenda</h1><p className="muted text-sm">Compromissos, lembretes e contas a vencer. Faturas e contas agendadas entram sozinhas.</p></div>
        <Link href={`/agenda?mes=${month}&dia=${sel}&novo=1`} className="btn-primary">+ Novo na agenda</Link>
      </div>
      {sp.novo && <div className="mb-4"><EventForm date={sel} /></div>}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="card"><p className="muted text-sm">Próximos 7 dias</p><p className="text-2xl font-bold">{next7.length}</p><p className="muted text-xs">itens na agenda</p></div>
        <div className="card"><p className="muted text-sm">Contas a vencer (7 dias)</p><p className="text-2xl font-bold text-coral"><Money cents={dueWeek} /></p></div>
        <div className="card"><p className="muted text-sm">Hoje</p><p className="text-2xl font-bold">{(byDay.get(ymd(now)) ?? []).length}</p><p className="muted text-xs">{now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{title.charAt(0).toUpperCase() + title.slice(1)}</h2>
            <div className="flex gap-1"><Link href={`/agenda?mes=${prev}`} className="btn-ghost min-h-[40px] px-3" aria-label="Mês anterior">‹</Link><Link href="/agenda" className="btn-ghost min-h-[40px] px-3 text-sm">Hoje</Link><Link href={`/agenda?mes=${nxt}`} className="btn-ghost min-h-[40px] px-3" aria-label="Próximo mês">›</Link></div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <span key={d} className="muted text-xs font-semibold">{d}</span>)}
            {Array.from({ length: first.getDay() }, (_, i) => <span key={"b" + i} />)}
            {Array.from({ length: last.getDate() }, (_, i) => {
              const key = `${month}-${String(i + 1).padStart(2, "0")}`; const evs = byDay.get(key) ?? []; const isToday = key === ymd(now); const isSel = key === sel;
              return (
                <Link key={key} href={`/agenda?mes=${month}&dia=${key}`} aria-label={`Dia ${i + 1}, ${evs.length} itens`}
                  className={`flex aspect-square min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border transition ${isSel ? "border-sobbra soft" : "line hover:border-sobbra"}`} style={{ background: isSel ? undefined : "var(--card)" }}>
                  <span className={`grid h-7 min-w-7 place-items-center rounded-full text-sm font-semibold ${isToday ? "bg-sobbra text-white" : ""}`}>{i + 1}</span>
                  <span className="flex h-1.5 gap-0.5">{evs.slice(0, 4).map((e) => <i key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR[e.kind] }} />)}</span>
                </Link>
              );
            })}
          </div>
          <div className="muted mt-3 flex flex-wrap gap-4 text-xs">{(Object.keys(COLOR) as AgendaItem["kind"][]).map((k) => <span key={k} className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR[k] }} />{LABEL[k]}</span>)}</div>
        </section>
        <section className="card">
          <h2 className="font-semibold">{sel === ymd(now) ? "Hoje" : new Date(sel + "T12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</h2>
          {dayItems.length ? <ul>{dayItems.map((e) => <Item key={e.id} e={e} />)}</ul> : <p className="muted mt-2 text-sm">Nada marcado. <Link className="text-sobbra" href={`/agenda?mes=${month}&dia=${sel}&novo=1`}>Adicionar</Link></p>}
          <h2 className="mt-5 font-semibold">Próximos 7 dias</h2>
          {next7.length ? <ul>{next7.map((e) => <Item key={e.id} e={e} />)}</ul> : <p className="muted mt-2 text-sm">Semana livre.</p>}
          <p className="muted mt-4 text-xs">Dica: no botão 🎙️ diga “marcar dentista amanhã às 15h” ou “lembrar de pagar a escola dia 10 450 reais”. Total da semana: {brl(dueWeek)}.</p>
        </section>
      </div>
    </div>
  );
}
