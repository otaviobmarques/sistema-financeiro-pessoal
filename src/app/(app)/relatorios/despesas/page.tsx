import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { buildReport, PRESETS, type Preset, type ReportGroup } from "@/lib/report";
import { Money } from "@/components/ui";
import { CategoryDonut, MonthBars } from "@/components/Charts";
import { ReportDownload } from "./download";

const GROUPS: Record<ReportGroup, string> = { categoria: "Categoria", estabelecimento: "Estabelecimento", conta: "Conta ou cartão", mes: "Mês" };

export default async function RelatorioDespesas({ searchParams }: { searchParams: Promise<{ p?: string; g?: string; de?: string; ate?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const preset = (sp.p && sp.p in PRESETS ? sp.p : "mes") as Preset;
  const group = (sp.g && sp.g in GROUPS ? sp.g : "categoria") as ReportGroup;
  const r = await buildReport(user.id, preset, group, sp.de, sp.ate);
  const q = (patch: Record<string, string>) => "?" + new URLSearchParams({ p: preset, g: group, ...(sp.de ? { de: sp.de } : {}), ...(sp.ate ? { ate: sp.ate } : {}), ...patch }).toString();
  const fmt = (s: string) => new Date(s).toLocaleDateString("pt-BR");
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold">Relatório de despesas</h1><p className="muted text-sm">{fmt(r.from)} a {fmt(r.to)} · só o que já foi pago</p></div>
        <ReportDownload report={r} groupLabel={GROUPS[group]} />
      </div>
      <div className="card mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">{(Object.keys(PRESETS) as Preset[]).map((k) => <Link key={k} href={q({ p: k })} className={`rounded-full border px-4 py-2 text-sm font-medium ${preset === k ? "border-floresta bg-floresta text-white" : "line"}`}>{k === "livre" ? "Escolher datas" : PRESETS[k]}</Link>)}</div>
        {preset === "livre" && (
          <form className="flex flex-wrap items-end gap-2"><input type="hidden" name="p" value="livre" /><input type="hidden" name="g" value={group} />
            <div><label className="label" htmlFor="de">De</label><input id="de" name="de" type="date" defaultValue={sp.de} className="input" required /></div>
            <div><label className="label" htmlFor="ate">Até</label><input id="ate" name="ate" type="date" defaultValue={sp.ate} className="input" required /></div>
            <button className="btn-dark">Aplicar</button></form>
        )}
        <div className="flex flex-wrap items-center gap-2 text-sm"><span className="muted">Agrupar por</span>{(Object.keys(GROUPS) as ReportGroup[]).map((g) => <Link key={g} href={q({ g })} className={`rounded-full px-3 py-1.5 font-medium ${group === g ? "soft text-floresta dark:text-sobbra" : "muted"}`}>{GROUPS[g]}</Link>)}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card"><p className="muted text-sm">Total gasto</p><p className="text-2xl font-bold text-coral"><Money cents={r.total} /></p><p className="muted text-xs">{r.items.length} lançamentos</p></div>
        <div className="card"><p className="muted text-sm">Média por dia</p><p className="text-2xl font-bold"><Money cents={r.perDay} /></p></div>
        <div className="card"><p className="muted text-sm">Fixos e parcelas</p><p className="text-2xl font-bold"><Money cents={r.fixed} /></p><p className="muted text-xs">{r.total ? Math.round((r.fixed / r.total) * 100) : 0}% do total</p></div>
        <div className="card"><p className="muted text-sm">Maior grupo</p><p className="truncate text-lg font-bold">{r.rows[0]?.name ?? "—"}</p><p className="muted text-xs">{r.rows[0] ? `${Math.round(r.rows[0].pct * 100)}% do total` : ""}</p></div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card"><h2 className="mb-2 font-semibold">Por {GROUPS[group].toLowerCase()}</h2>
          {group === "mes" ? <MonthBars data={r.rows.map((x) => ({ month: x.key, income: 0, expense: x.total }))} />
            : <CategoryDonut data={r.rows.map((x) => ({ id: group === "categoria" ? x.key : "", name: x.name, total: x.total, color: x.color, icon: "" }))} month={r.from.slice(0, 7)} />}
        </section>
        <section className="card overflow-x-auto"><h2 className="mb-2 font-semibold">Ranking</h2>
          <table className="w-full text-sm"><thead><tr className="muted text-left text-xs"><th className="py-1">{GROUPS[group]}</th><th>Qtd.</th><th>%</th><th className="text-right">Total</th></tr></thead>
            <tbody>{r.rows.map((x) => (
              <tr key={x.key} className="line border-t"><td className="py-2"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: x.color }} />{x.name}{x.subs.length > 0 && <span className="muted block pl-5 text-xs">{x.subs.map((s) => s.name).join(" · ")}</span>}</td><td>{x.count}</td><td>{Math.round(x.pct * 100)}%</td><td className="text-right"><Money cents={x.total} /></td></tr>
            ))}{!r.rows.length && <tr><td colSpan={4} className="muted py-4">Nenhuma despesa paga neste período.</td></tr>}</tbody></table>
        </section>
        <section className="card lg:col-span-2"><h2 className="mb-2 font-semibold">Maiores despesas</h2>
          <ul>{r.biggest.map((t) => <li key={t.id} className="line flex justify-between gap-3 border-t py-2 first:border-0"><Link href={`/lancamentos/${t.id}`} className="min-w-0"><b className="block truncate">{t.description}</b><span className="muted text-xs">{t.category} · {fmt(t.date)}</span></Link><Money cents={t.amountCents} className="font-semibold" /></li>)}</ul>
        </section>
      </div>
    </div>
  );
}
