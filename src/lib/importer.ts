// Leitura de extratos OFX e CSV (RF-060). Puro: sem banco, testavel.
export type ImportRow = { externalId: string; date: string; description: string; amountCents: number }; // amount > 0 entrada, < 0 saida

function hash(s: string) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

/** Converte "1.234,56", "-1234.56", "(12,30)", "R$ 50" em centavos. */
export function parseAmount(raw: string): number | null {
  let s = raw.trim().replace(/R\$|\s/g, "");
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (s.endsWith("-")) { neg = true; s = s.slice(0, -1); }
  if (s.startsWith("-")) { neg = !neg; s = s.slice(1); } else if (s.startsWith("+")) s = s.slice(1);
  const lastComma = s.lastIndexOf(","), lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma && lastComma >= 0) s = s.replace(/,/g, "");
  else if (lastComma < 0 && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) * (neg ? -1 : 1) : null;
}

/** "31/12/2026", "2026-12-31", "20261231", "31/12/26" -> "2026-12-31". */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-?(\d{2})-?(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`; }
  return null;
}

export function parseOFX(text: string): ImportRow[] {
  const rows: ImportRow[] = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  const tag = (b: string, t: string) => b.match(new RegExp(`<${t}>([^<\\r\\n]*)`, "i"))?.[1]?.trim() ?? "";
  for (const b of blocks) {
    const date = parseDate(tag(b, "DTPOSTED")); const amt = parseAmount(tag(b, "TRNAMT").replace(",", "."));
    if (!date || amt === null || amt === 0) continue;
    const description = (tag(b, "MEMO") || tag(b, "NAME") || "Lançamento").replace(/\s+/g, " ");
    const fitid = tag(b, "FITID");
    rows.push({ externalId: "ofx:" + (fitid || hash(date + amt + description)), date, description, amountCents: amt });
  }
  return rows;
}

function splitCSVLine(line: string, sep: string) {
  const out: string[] = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === sep && !q) { out.push(cur); cur = ""; } else cur += c;
  }
  out.push(cur); return out.map((x) => x.trim());
}

export type CsvMapping = { date: number; description: number; amount?: number; debit?: number; credit?: number; invert?: boolean };
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function readCSV(text: string) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const first = lines[0] ?? "";
  const sep = [";", ",", "\t"].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = lines.map((l) => splitCSVLine(l, sep));
  const header = rows[0] ?? [];
  const hasHeader = header.some((h) => /[a-z]/i.test(h) && !parseDate(h) && parseAmount(h) === null);
  return { sep, header: hasHeader ? header : header.map((_, i) => `Coluna ${i + 1}`), body: hasHeader ? rows.slice(1) : rows };
}

/** Adivinha as colunas pelo cabecalho (data, historico, valor ou debito/credito). */
export function guessMapping(header: string[]): CsvMapping | null {
  const h = header.map(norm);
  const find = (re: RegExp) => h.findIndex((x) => re.test(x));
  const date = find(/^data|date|dt\b/); const description = find(/descri|historico|lancamento|memo|estabelecimento|title|detalhe/);
  const amount = find(/^valor|amount|value|quantia/); const debit = find(/debito|saida|debit/); const credit = find(/credito|entrada|credit/);
  if (date < 0 || description < 0 || (amount < 0 && debit < 0)) return null;
  return { date, description, ...(amount >= 0 ? { amount } : { debit, credit: credit >= 0 ? credit : undefined }) };
}

export function parseCSV(text: string, mapping: CsvMapping): ImportRow[] {
  const { body } = readCSV(text);
  const rows: ImportRow[] = [];
  for (const r of body) {
    const date = parseDate(r[mapping.date] ?? ""); const description = (r[mapping.description] ?? "").replace(/\s+/g, " ").trim();
    let amt: number | null = null;
    if (mapping.amount !== undefined) amt = parseAmount(r[mapping.amount] ?? "");
    else { const d = parseAmount(r[mapping.debit!] ?? "") ?? 0, c = mapping.credit !== undefined ? parseAmount(r[mapping.credit] ?? "") ?? 0 : 0; amt = c - Math.abs(d); }
    if (!date || amt === null || amt === 0 || !description) continue;
    if (mapping.invert) amt = -amt; // faturas de cartao costumam vir com gasto positivo
    rows.push({ externalId: "csv:" + hash(`${date}|${amt}|${description}`), date, description, amountCents: amt });
  }
  // linhas identicas no mesmo arquivo (ex.: dois cafes iguais) recebem sufixo para nao serem descartadas
  const seen = new Map<string, number>();
  return rows.map((r) => { const n = seen.get(r.externalId) ?? 0; seen.set(r.externalId, n + 1); return n ? { ...r, externalId: `${r.externalId}:${n}` } : r; });
}
