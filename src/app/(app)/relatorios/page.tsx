import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { dashboard } from "@/lib/finance";
import { monthKey, monthLabel } from "@/lib/money";
import { Money } from "@/components/ui";
import { CategoryDonut, MonthBars, WeekHeat } from "@/components/Charts";

const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null);

export default async function Relatorios({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : monthKey(new Date());
  const d = await dashboard(user.id, month);
  const [y, m] = month.split("-").map(Number);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Onde estou gastando mais</h1>
        <div className="flex items-center gap-2"><Link href={`?mes=${monthKey(new Date(y, m - 2, 1))}`} className="btn-ghost min-h-[40px] px-3">‹</Link><b className="capitalize">{monthLabel(month)}</b><Link href={`?mes=${monthKey(new Date(y, m, 1))}`} className="btn-ghost min-h-[40px] px-3">›</Link></div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <section className="card"><h2 className="font-semibold">Por categoria</h2><p className="muted text-xs">Toque numa fatia para ver os lançamentos</p><CategoryDonut data={d.categories} month={month} /></section>
        <section className="card overflow-x-auto">
          <h2 className="mb-2 font-semibold">Ranking de categorias</h2>
          <table className="w-full text-sm"><thead><tr className="muted text-left text-xs"><th className="py-1">Categoria</th><th>%</th><th>vs mês ant.</th><th>vs média 3m</th><th className="text-right">Total</th></tr></thead>
            <tbody>{d.categories.map((c) => { const a = pct(c.total, c.prev), b = pct(c.total, c.avg3); return (
              <tr key={c.id} className="line border-t"><td className="py-2"><Link href={`/lancamentos?mes=${month}&cat=${c.id}`}>{c.icon} {c.name}</Link></td><td>{Math.round(c.pct * 100)}%</td>
                <td className={a == null ? "muted" : a > 0 ? "text-coral" : "text-sobbra"}>{a == null ? "—" : `${a > 0 ? "+" : ""}${a}%`}</td>
                <td className={b == null ? "muted" : b > 0 ? "text-coral" : "text-sobbra"}>{b == null ? "—" : `${b > 0 ? "+" : ""}${b}%`}</td>
                <td className="text-right"><Money cents={c.total} /></td></tr>); })}</tbody></table>
        </section>
        <section className="card"><h2 className="mb-2 font-semibold">Estabelecimentos</h2>
          <ul>{d.merchants.map((x) => <li key={x.name}><Link href={`/lancamentos?mes=${month}&q=${encodeURIComponent(x.name)}`} className="flex min-h-[40px] items-center justify-between"><span>{x.name} <span className="muted text-xs">{Math.round(x.pct * 100)}%</span></span><Money cents={x.total} /></Link></li>)}</ul></section>
        <section className="card"><h2 className="mb-2 font-semibold">Últimos 6 meses</h2><MonthBars data={d.monthly} /><h2 className="mb-2 mt-4 font-semibold">Dia da semana</h2><WeekHeat data={d.weekday} /></section>
      </div>
      <div className="mt-4 flex gap-2"><a className="btn-ghost" href="/api/export?formato=csv">⬇️ Exportar CSV</a></div>
    </div>
  );
}
