import { parseVoice, parseSingle } from "../../src/lib/voice-parser";
import { DEFAULT_CATEGORIES } from "../../src/lib/categories";
import { normalizeMerchant, keyOf } from "../../src/lib/normalize";
import { invoiceMonthFor, invoiceDueDate } from "../../src/lib/finance-dates";
import { parseMoney } from "../../src/lib/money";
const KEYWORDS = DEFAULT_CATEGORIES.flatMap((c) => (c.subs ?? []).flatMap((s) => s.keywords.map((kw) => ({ slug: s.slug, kw: keyOf(kw), kind: c.kind })))).sort((a, b) => b.kw.length - a.kw.length);
export function keywordSlug(text: string, kind: string) {
  const t = ` ${keyOf(text)} `;
  for (const k of KEYWORDS) { if (k.kind !== kind) continue; const kw = k.kw.trim();
    if (new RegExp(`(^|[^a-z0-9])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(t)) return k.slug; }
  return null;
}
export { parseVoice, parseSingle, DEFAULT_CATEGORIES, normalizeMerchant, keyOf, invoiceMonthFor, invoiceDueDate, parseMoney };
