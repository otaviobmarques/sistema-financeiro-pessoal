// Normalizacao de nomes de estabelecimento (RF-043): "IFD*IFOOD COM AGENCIA" -> "iFood"
const KNOWN: [RegExp, string][] = [
  [/ifood|ifd\*/i, "iFood"], [/uber\s*\*?\s*eats/i, "Uber Eats"], [/uber/i, "Uber"], [/\b99\s*(pop|app|taxi)?\b/i, "99"],
  [/netflix/i, "Netflix"], [/spotify/i, "Spotify"], [/amazon\s*prime|prime\s*video/i, "Amazon Prime"], [/amazon|amzn/i, "Amazon"],
  [/mercado\s*livre|mercadolivre|meli/i, "Mercado Livre"], [/mercado\s*pago/i, "Mercado Pago"], [/rappi/i, "Rappi"],
  [/carrefour/i, "Carrefour"], [/assa[ií]/i, "Assaí"], [/p[aã]o\s*de\s*a[cç][uú]car/i, "Pão de Açúcar"],
  [/drogasil/i, "Drogasil"], [/droga\s*raia|raia\s*drogasil/i, "Droga Raia"], [/smart\s*fit/i, "Smart Fit"],
  [/shell/i, "Shell"], [/ipiranga/i, "Ipiranga"], [/petrobras|posto\s*br\b/i, "Petrobras"], [/shopee/i, "Shopee"],
  [/disney/i, "Disney+"], [/hbo|\bmax\b/i, "Max"], [/apple\.com|itunes/i, "Apple"], [/google\s*\*?/i, "Google"],
];

export function normalizeMerchant(raw: string): string {
  const s = raw.trim();
  for (const [re, name] of KNOWN) if (re.test(s)) return name;
  const cleaned = s
    .replace(/^[A-Z]{2,5}\*\s*/i, "")       // prefixos de adquirente "PAG*", "MP*"
    .replace(/\b(ltda|me|eireli|s\.?a\.?|epp|comercio|com[eé]rcio)\b\.?/gi, "")
    .replace(/\d{2,}/g, "").replace(/[*_#]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return s;
  return cleaned.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

/** Forma usada como chave de comparacao (sem acento, minusculo). */
export const keyOf = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
