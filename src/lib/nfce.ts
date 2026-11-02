// NFC-e (RF-070/071): le o QR Code (URL da SEFAZ) ou a chave de acesso e busca os itens no portal publico.
import { mod11Bank } from "./boleto";

const UF: Record<string, string> = { "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO", "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR", "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF" };

export type AccessKey = { key: string; uf: string; yearMonth: string; cnpj: string; model: string; series: string; number: string; valid: boolean };

/** DV da chave: modulo 11 com pesos 2..9 (0 quando o resto da 0 ou 1). */
export function keyDV(first43: string) {
  let sum = 0, w = 2;
  for (let i = first43.length - 1; i >= 0; i--) { sum += Number(first43[i]) * w; w = w === 9 ? 2 : w + 1; }
  const r = sum % 11; return r < 2 ? 0 : 11 - r;
}

export function parseAccessKey(key: string): AccessKey | null {
  const k = key.replace(/\D/g, "");
  if (k.length !== 44) return null;
  return { key: k, uf: UF[k.slice(0, 2)] ?? k.slice(0, 2), yearMonth: `20${k.slice(2, 4)}-${k.slice(4, 6)}`, cnpj: k.slice(6, 20), model: k.slice(20, 22), series: k.slice(22, 25), number: String(Number(k.slice(25, 34))), valid: keyDV(k.slice(0, 43)) === Number(k[43]) };
}

/** Aceita o texto do QR Code (URL com ?p=CHAVE|...), a URL da consulta ou a chave digitada. */
export function parseNfceInput(input: string): { key: AccessKey; url: string | null } | { error: string } {
  const s = input.trim();
  let url: string | null = null, raw = s;
  if (/^https?:\/\//i.test(s)) {
    url = s;
    try { const u = new URL(s); raw = u.searchParams.get("p") ?? u.searchParams.get("chNFe") ?? s; } catch {}
  }
  const m = raw.replace(/\s/g, "").match(/\d{44}/);
  if (!m) return { error: "Não encontrei a chave de acesso (44 números). Leia o QR Code da nota ou digite a chave que fica embaixo dele." };
  const key = parseAccessKey(m[0])!;
  if (!key.valid) return { error: "A chave de acesso não confere. Confira os números." };
  if (key.model !== "65") return { error: "Essa chave não é de uma NFC-e (nota de consumidor). Notas de modelo 55 não trazem itens pela consulta pública." };
  return { key, url };
}

export type NfceData = { merchant: string | null; totalCents: number | null; issuedAt: Date | null; items: { description: string; quantity: number; unit: string | null; unitCents: number; totalCents: number }[] };

const txt = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\s+/g, " ").trim();
const money = (s: string) => { const m = s.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+\.\d{2})/); if (!m) return null; const n = m[1].includes(",") ? m[1].replace(/\./g, "").replace(",", ".") : m[1]; return Math.round(Number(n) * 100); };

/** Le a pagina de consulta publica no layout usado pela maioria das SEFAZ (portal "NFC-e - Consulta"). */
export function parseSefazHtml(html: string): NfceData {
  const items: NfceData["items"] = [];
  const rows = html.split(/<tr[^>]*id="Item\s*\+?\s*\d+"[^>]*>/i).slice(1);
  for (const r of rows) {
    const name = r.match(/class="txtTit2?"[^>]*>([\s\S]*?)<\/span>/i)?.[1];
    if (!name) continue;
    const qty = r.match(/class="Rqtd"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "";
    const un = r.match(/class="RUN"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "";
    const unit = r.match(/class="RvlUnit"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "";
    const total = r.match(/class="valor"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "";
    const q = Number((txt(qty).match(/\d+(?:[.,]\d+)?/)?.[0] ?? "1").replace(",", "."));
    const t = money(txt(total)) ?? 0;
    items.push({ description: txt(name), quantity: q || 1, unit: txt(un).replace(/^UN:\s*/i, "") || null, unitCents: money(txt(unit)) ?? Math.round(t / (q || 1)), totalCents: t });
  }
  const merchant = html.match(/id="u20"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? html.match(/class="txtTopo"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? null;
  const totalPay = html.match(/Valor a pagar[\s\S]*?class="totalNumb[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? html.match(/class="totalNumb txtMax"[^>]*>([\s\S]*?)<\/span>/i)?.[1];
  const date = txt(html).match(/Emiss[aã]o:?\s*(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}):(\d{2})/i);
  return { merchant: merchant ? txt(merchant) : null, totalCents: totalPay ? money(txt(totalPay)) : items.reduce((s, i) => s + i.totalCents, 0) || null,
    issuedAt: date ? new Date(Number(date[3]), Number(date[2]) - 1, Number(date[1]), Number(date[4]), Number(date[5])) : null, items };
}

/** Busca os itens: provedor contratado (NFCE_API_URL) ou a propria URL do QR Code no portal da SEFAZ. */
export async function fetchNfce(key: AccessKey, url: string | null): Promise<NfceData> {
  if (process.env.NFCE_API_URL) {
    const r = await fetch(`${process.env.NFCE_API_URL.replace(/\/$/, "")}/${key.key}`, { headers: { authorization: `Bearer ${process.env.NFCE_API_KEY ?? ""}` }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`provedor respondeu ${r.status}`);
    const j = await r.json();
    return { merchant: j.merchant ?? j.emitente?.nome ?? null, totalCents: j.totalCents ?? (j.total ? Math.round(j.total * 100) : null), issuedAt: j.issuedAt ? new Date(j.issuedAt) : null,
      items: (j.items ?? j.itens ?? []).map((i: any) => ({ description: i.description ?? i.descricao, quantity: i.quantity ?? i.quantidade ?? 1, unit: i.unit ?? i.unidade ?? null, unitCents: i.unitCents ?? Math.round((i.valorUnitario ?? 0) * 100), totalCents: i.totalCents ?? Math.round((i.valorTotal ?? 0) * 100) })) };
  }
  if (!url) throw new Error("sem URL de consulta");
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 Sobbra", accept: "text/html" }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`SEFAZ respondeu ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  let html = buf.toString("utf8"); if (html.includes("�")) html = buf.toString("latin1");
  const data = parseSefazHtml(html);
  if (!data.items.length) throw new Error("a página da SEFAZ não trouxe os itens (pode exigir captcha neste estado)");
  return data;
}
