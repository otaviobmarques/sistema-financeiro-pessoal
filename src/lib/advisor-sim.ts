// Interpretacao das perguntas de simulacao do consultor (RF-114). Puro e testavel.
import { wordsToDigits } from "./voice-parser";

const strip = (s: string) => wordsToDigits(s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase());

function money(t: string): number | null {
  const m = t.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(mil\b)?/);
  if (!m) return null;
  let n = m[1]; n = /^\d{1,3}(\.\d{3})+/.test(n) ? n.replace(/\./g, "").replace(",", ".") : n.replace(",", ".");
  return Math.round(Number(n) * (m[2] ? 1000 : 1) * 100);
}

/** "se eu cortar delivery pela metade", "e se eu gastar 30% menos com uber", "parar de pedir ifood" */
export function parseCut(q: string): { term: string; fraction: number } | null {
  const t = strip(q);
  const VERB = /\b(cortar|corto|reduzir|reduzo|diminuir|diminuo|gastar(?: \d{1,3}\s*(?:%|por cento))? menos|parar de|parasse de|economizar)\b/;
  if (!VERB.test(t)) return null;
  let fraction = 0.5;
  const pct = t.match(/(\d{1,3})\s*(%|por cento)/);
  if (pct) fraction = Math.min(1, Number(pct[1]) / 100);
  else if (/\bpela metade|metade\b/.test(t)) fraction = 0.5;
  else if (/\bum terco\b/.test(t)) fraction = 1 / 3;
  else if (/\bparar de|parasse de|cortar tudo|zerar\b/.test(t)) fraction = 1;
  const term = t.split(/[,?]/)[0]
    .replace(new RegExp(".*" + VERB.source + "\\s*(?:(?:com|de|do|da|o|a|os|as|no|na|em)\\s+)?"), "")
    .replace(/\b(pela metade|metade|em \d{1,3}\s*(%|por cento)|\d{1,3}\s*(%|por cento)|um terco|quanto\b.*|o que\b.*)\s*$/, "")
    .replace(/\b(pedir|pedido de|pedidos de|gastos? com|gastar com|comprar)\b/g, "").replace(/\s+/g, " ").trim();
  return term ? { term, fraction } : null;
}

/** "consigo comprar um celular de R$ 2.000 em 10 vezes?", "da pra comprar uma tv de 3 mil a vista?" */
export function parsePurchase(q: string): { item: string; amountCents: number; installments: number } | null {
  const t = strip(q);
  if (!/\b(consigo|posso|da pra|daria pra|cabe|caberia)\b.*\b(comprar|pagar|parcelar|financiar)\b/.test(t)) return null;
  const amount = money(t.replace(/\bem \d{1,2}\s*(x|vezes|parcelas)\b/, ""));
  if (!amount) return null;
  const inst = t.match(/\bem (\d{1,2})\s*(x|vezes|parcelas)\b/);
  const item = t.replace(/.*\b(comprar|pagar|parcelar|financiar)\b\s*(?:(?:uma|um|o|a)\s+)?/, "").replace(/\s*(de|por)?\s*(r\$\s*)?\d.*$/, "").trim();
  return { item: item || "essa compra", amountCents: amount, installments: inst ? Number(inst[1]) : 1 };
}

/** "quanto sobra em 6 meses", "quanto vou ter guardado em 1 ano" */
export function parseHorizon(q: string): number | null {
  const t = strip(q);
  if (!/\b(sobra|sobrar|guardar|guardado|juntar|junto)\b/.test(t)) return null;
  const m = t.match(/\bem (\d{1,2})\s*(mes|meses|ano|anos)\b/);
  if (!m) return null;
  return Number(m[1]) * (m[2].startsWith("ano") ? 12 : 1);
}
