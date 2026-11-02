"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { previewImport, confirmImport, type PreviewRow } from "@/app/actions-f2";
import { parseOFX, parseCSV, readCSV, guessMapping, type CsvMapping } from "@/lib/importer";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const MKEY = "sobbra-csv-mapping"; // mapeamento de colunas lembrado por formato de arquivo (cabecalho)

export function Importer({ accounts, categories }: { accounts: { id: string; name: string; type: string }[]; categories: { id: string; label: string; kind: string }[] }) {
  const [accountId, setAccountId] = useState(accounts.find((a) => a.type === "CHECKING")?.id ?? accounts[0]?.id ?? "");
  const [file, setFile] = useState<{ name: string; text: string; kind: "ofx" | "csv" } | null>(null);
  const [csv, setCsv] = useState<{ header: string[]; sample: string[][]; mapping: CsvMapping } | null>(null);
  const [rows, setRows] = useState<(PreviewRow & { on: boolean })[] | null>(null);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const isCard = accounts.find((a) => a.id === accountId)?.type === "CREDIT_CARD";

  async function onFile(f: File) {
    setError(undefined); setRows(null); setDone(null);
    const buf = await f.arrayBuffer();
    let text = new TextDecoder("utf-8").decode(buf);
    if (text.includes("�")) text = new TextDecoder("windows-1252").decode(buf); // bancos que exportam em Latin-1
    const kind = /\.ofx$/i.test(f.name) || /<OFX>|OFXHEADER/i.test(text) ? "ofx" : "csv";
    setFile({ name: f.name, text, kind });
    if (kind === "csv") {
      const { header, body } = readCSV(text);
      let saved: CsvMapping | null = null; try { saved = JSON.parse(localStorage.getItem(MKEY) || "{}")[header.join("|")] ?? null; } catch {}
      setCsv({ header, sample: body.slice(0, 3), mapping: saved ?? guessMapping(header) ?? { date: 0, description: 1, amount: 2 } });
    } else setCsv(null);
  }

  function preview() {
    if (!file) return;
    const parsed = file.kind === "ofx" ? parseOFX(file.text) : parseCSV(file.text, { ...csv!.mapping, invert: isCard && csv!.mapping.invert });
    if (file.kind === "csv") try { const all = JSON.parse(localStorage.getItem(MKEY) || "{}"); all[csv!.header.join("|")] = csv!.mapping; localStorage.setItem(MKEY, JSON.stringify(all)); } catch {}
    start(async () => {
      const r = await previewImport(accountId, parsed);
      if (r.error) { setError(r.error); return; }
      setError(undefined); setRows(r.rows!.map((x) => ({ ...x, on: !x.duplicate })));
    });
  }

  const chosen = useMemo(() => rows?.filter((r) => r.on) ?? [], [rows]);
  const sumIn = chosen.filter((r) => r.amountCents > 0).reduce((s, r) => s + r.amountCents, 0), sumOut = chosen.filter((r) => r.amountCents < 0).reduce((s, r) => s - r.amountCents, 0);

  if (done !== null) return (
    <div className="card space-y-3 text-center"><p className="text-4xl">✅</p><p className="text-lg font-semibold">{done} lançamento{done === 1 ? "" : "s"} importado{done === 1 ? "" : "s"}</p>
      <div className="flex justify-center gap-2"><Link href={`/lancamentos?conta=${accountId}&mes=todos`} className="btn-primary">Ver lançamentos</Link><button className="btn-ghost" onClick={() => { setDone(null); setFile(null); setRows(null); }}>Importar outro</button></div></div>
  );

  return (
    <div className="space-y-4">
      <div className="card grid gap-3 sm:grid-cols-2">
        <div><label className="label" htmlFor="acc">Este extrato é de</label><select id="acc" className="input" value={accountId} onChange={(e) => { setAccountId(e.target.value); setRows(null); }}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        <div><label className="label" htmlFor="file">Arquivo OFX ou CSV</label><input id="file" type="file" accept=".ofx,.csv,.txt,text/csv,application/x-ofx" className="input py-2" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} /></div>
        <p className="muted text-xs sm:col-span-2">No app ou site do banco, procure “Exportar extrato” e escolha OFX (Money) ou CSV/Excel.</p>
      </div>

      {file?.kind === "csv" && csv && (
        <div className="card space-y-3">
          <h2 className="font-semibold">Quais colunas são o quê?</h2>
          <div className="grid gap-2 sm:grid-cols-4">
            {([["date", "Data"], ["description", "Descrição"], ["amount", "Valor (+/−)"], ["debit", "ou Débito"]] as const).map(([k, l]) => (
              <div key={k}><label className="label" htmlFor={"m-" + k}>{l}</label>
                <select id={"m-" + k} className="input" value={csv.mapping[k] ?? -1} onChange={(e) => { const v = Number(e.target.value); const m = { ...csv.mapping, [k]: v < 0 ? undefined : v }; if (k === "amount" && v >= 0) { m.debit = undefined; m.credit = undefined; } if (k === "debit" && v >= 0) m.amount = undefined; setCsv({ ...csv, mapping: m }); }}>
                  {(k === "amount" || k === "debit") && <option value={-1}>—</option>}{csv.header.map((h, i) => <option key={i} value={i}>{h}</option>)}</select></div>
            ))}
            {csv.mapping.debit !== undefined && <div><label className="label" htmlFor="m-credit">Crédito</label><select id="m-credit" className="input" value={csv.mapping.credit ?? -1} onChange={(e) => setCsv({ ...csv, mapping: { ...csv.mapping, credit: Number(e.target.value) < 0 ? undefined : Number(e.target.value) } })}><option value={-1}>—</option>{csv.header.map((h, i) => <option key={i} value={i}>{h}</option>)}</select></div>}
          </div>
          {isCard && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={!!csv.mapping.invert} onChange={(e) => setCsv({ ...csv, mapping: { ...csv.mapping, invert: e.target.checked } })} /> Na fatura os gastos vêm positivos (inverter sinal)</label>}
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr>{csv.header.map((h, i) => <th key={i} className="muted p-1 text-left">{h}</th>)}</tr></thead><tbody>{csv.sample.map((r, i) => <tr key={i} className="line border-t">{r.map((c, j) => <td key={j} className="p-1">{c}</td>)}</tr>)}</tbody></table></div>
        </div>
      )}
      {file && !rows && <button className="btn-primary" disabled={pending || !accountId} onClick={preview}>{pending ? "Lendo…" : "Pré-visualizar"}</button>}
      {error && <p role="alert" className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{error}</p>}

      {rows && (
        <div className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Confira antes de importar</h2>
            <p className="text-sm">{chosen.length} de {rows.length} · entra <b className="text-sobbra">{brl(sumIn)}</b> · sai <b className="text-coral">{brl(sumOut)}</b></p>
          </div>
          {rows.some((r) => r.duplicate) && <p className="soft rounded-xl p-3 text-sm">{rows.filter((r) => r.duplicate === "id").length} já tinham sido importados e {rows.filter((r) => r.duplicate === "similar").length} parecem já existir (mesmo valor e data). Deixei desmarcados, mas você pode marcar.</p>}
          <div className="max-h-[60vh] overflow-auto"><table className="w-full min-w-[640px] text-sm">
            <thead className="sticky top-0" style={{ background: "var(--card)" }}><tr className="muted text-left text-xs"><th className="p-2"><input type="checkbox" aria-label="Marcar todos" checked={chosen.length === rows.length} onChange={(e) => setRows(rows.map((r) => ({ ...r, on: e.target.checked && r.duplicate !== "id" })))} /></th><th>Data</th><th>Descrição</th><th>Categoria</th><th className="text-right">Valor</th></tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={r.externalId} className={`line border-t ${r.on ? "" : "opacity-50"}`}>
                <td className="p-2"><input type="checkbox" checked={r.on} disabled={r.duplicate === "id"} aria-label={`Importar ${r.description}`} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} /></td>
                <td className="whitespace-nowrap">{new Date(r.date + "T12:00").toLocaleDateString("pt-BR")}</td>
                <td>{r.description}{r.duplicate && <span className="ml-1 rounded-full bg-ambar/20 px-2 text-xs">{r.duplicate === "id" ? "já importado" : "parece repetido"}</span>}</td>
                <td><select className="input h-9 min-h-0 py-0 text-xs" value={r.categoryId ?? ""} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, categoryId: e.target.value || null } : x)))}>
                  <option value="">Sem categoria</option>{categories.filter((c) => c.kind === (r.amountCents < 0 ? "EXPENSE" : "INCOME")).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></td>
                <td className={`text-right font-medium ${r.amountCents > 0 ? "text-sobbra" : ""}`}>{brl(r.amountCents)}</td>
              </tr>))}</tbody></table></div>
          <div className="flex gap-2"><button className="btn-primary" disabled={pending || !chosen.length} onClick={() => start(async () => { const r = await confirmImport(accountId, chosen); if (r.error) setError(r.error); else setDone(r.created ?? 0); })}>{pending ? "Importando…" : `Importar ${chosen.length}`}</button><button className="btn-ghost" onClick={() => setRows(null)}>Voltar</button></div>
        </div>
      )}
    </div>
  );
}
