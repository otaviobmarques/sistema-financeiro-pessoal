// Interpretador local de comandos em portugues (RF-171, RF-172, RF-176).
// Funciona sem IA e sem custo; a IA so entra quando a confianca for baixa.
// Exemplos: "Lançar gasolina 50,00", "gastei cinquenta no posto",
// "paguei 12 de pão ontem", "recebi 1.200 do freela", "paguei 120 no mercado no cartão",
// "comprei um celular de 2 mil no Nubank em 3 vezes", "gasolina 50 e pão 12".

export type PaymentHint = "credito" | "debito" | "pix" | "dinheiro" | null;

export type ParsedCommand = {
  type: "EXPENSE" | "INCOME";
  amountCents: number | null;
  description: string;
  date: Date;
  dateWasSaid: boolean;
  payment: PaymentHint;
  accountName: string | null; // nome de conta/cartao do usuario citado na frase
  installments: number | null;
  missing: ("valor" | "descricao")[];
  confidence: number;
};

export type VoiceAction =
  | { kind: "create"; items: ParsedCommand[] }
  | { kind: "undo" }
  | { kind: "fix_amount"; amountCents: number }
  | { kind: "query"; text: string };

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const UNITS: Record<string, number> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
  dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17,
  dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70,
  oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, quatrocentos: 400,
  quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900,
};

/** Converte sequencias de numeros por extenso em digitos: "mil e duzentos" -> "1200". */
export function wordsToDigits(text: string): string {
  text = text.replace(/(\d+(?:,\d+)?)\s*mil\b/gi, (_, n) => String(Math.round(Number(n.replace(",", ".")) * 1000)));
  const tokens = text.split(/(\s+)/);
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const w = strip(tokens[i]);
    if (!(w in UNITS) && w !== "mil") { out.push(tokens[i]); i++; continue; }
    // "um"/"uma" isolados costumam ser artigo ("um café") — so contam seguidos de numero/mil
    if ((w === "um" || w === "uma")) {
      const next = strip(tokens[i + 2] ?? "");
      if (next !== "mil") { out.push(tokens[i]); i++; continue; }
    }
    let total = 0, current = 0, j = i, consumed = i;
    while (j < tokens.length) {
      const t = strip(tokens[j]);
      if (/^\s+$/.test(tokens[j])) { j++; continue; }
      if (t in UNITS) { current += UNITS[t]; consumed = j; j++; continue; }
      if (t === "mil") { total += (current || 1) * 1000; current = 0; consumed = j; j++; continue; }
      if (t === "e") {
        const next = strip(tokens[j + 2] ?? "");
        if (next in UNITS || next === "mil") { j++; continue; }
      }
      break;
    }
    out.push(String(total + current));
    i = consumed + 1;
  }
  return out.join("");
}

const VERBS = /\b(lancar|lanca|lance|lancei|registrar|registra|registre|anotar|anota|anote|adicionar|adiciona|gastei|gasto|gastar|paguei|pagar|pago|comprei|compra|comprar|recebi|receber|ganhei|ganhar|entrou|caiu|coloca|coloque|bota|botar|foi|foram)\b/g;
const INCOME = /\b(recebi|receber|ganhei|ganhar|entrou|caiu|salario|freela|reembolso|recebido|recebimento|renda|pix recebido)\b/;

function parseAmount(t: string): { cents: number | null; rest: string } {
  // "R$ 1.234,56", "1.200", "50,00", "12,5", "50 reais e 30 centavos", "50 conto"
  const re = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(\s*mil\b)?(?:\s*(?:reais|real|conto|contos|pila|pilas))?(?:\s*e\s*(\d{1,2})\s*centavos)?/;
  const m = t.match(re);
  if (!m) return { cents: null, rest: t };
  let num = m[1];
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(num)) num = num.replace(/\./g, "").replace(",", ".");
  else num = num.replace(",", ".");
  let value = Number(num);
  if (m[2]) value *= 1000;
  let cents = Math.round(value * 100);
  if (m[3]) cents += Number(m[3]);
  return { cents, rest: t.replace(m[0], " ") };
}

function parseDate(t: string, now: Date): { date: Date; said: boolean; rest: string } {
  const d = new Date(now); d.setHours(12, 0, 0, 0);
  const rules: [RegExp, (m: RegExpMatchArray) => Date][] = [
    [/\banteontem\b/, () => { const x = new Date(d); x.setDate(x.getDate() - 2); return x; }],
    [/\bontem\b/, () => { const x = new Date(d); x.setDate(x.getDate() - 1); return x; }],
    [/\bhoje\b/, () => d],
    [/\bdia (\d{1,2})\b/, (m) => { const x = new Date(d); x.setDate(Number(m[1])); if (x > d) x.setMonth(x.getMonth() - 1); return x; }],
    [/\b(?:na |no )?(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira| feira)?(?: passad[ao])?\b/, (m) => {
      const idx = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"].indexOf(m[1]);
      const x = new Date(d); let diff = (x.getDay() - idx + 7) % 7; if (diff === 0) diff = 7; x.setDate(x.getDate() - diff); return x;
    }],
  ];
  for (const [re, fn] of rules) {
    const m = t.match(re);
    if (m) return { date: fn(m), said: true, rest: t.replace(m[0], " ") };
  }
  return { date: d, said: false, rest: t };
}

function parsePayment(t: string): { payment: PaymentHint; rest: string } {
  const rules: [RegExp, PaymentHint][] = [
    [/\b(?:no |na |pelo |via |com )?(?:cartao de credito|credito|cartao)\b/, "credito"],
    [/\b(?:no |na |pelo |via |com )?(?:cartao de debito|debito)\b/, "debito"],
    [/\b(?:no |na |pelo |via |com |de )?pix\b/, "pix"],
    [/\b(?:no |em |com )?(?:dinheiro|especie|vivo)\b/, "dinheiro"],
  ];
  for (const [re, p] of rules) {
    const m = t.match(re);
    if (m) return { payment: p, rest: t.replace(m[0], " ") };
  }
  return { payment: null, rest: t };
}

function parseInstallments(t: string): { n: number | null; rest: string } {
  const m = t.match(/\b(?:em |parcelad[oa] em )?(\d{1,2})\s*(?:x|vezes|parcelas)\b/);
  if (!m) return { n: null, rest: t };
  return { n: Number(m[1]), rest: t.replace(m[0], " ") };
}

function parseAccount(t: string, accountNames: string[]): { name: string | null; rest: string } {
  const sorted = [...accountNames].sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    const k = strip(name);
    const re = new RegExp(`\\b(?:no |na |do |da |pelo |pela )?${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    const m = t.match(re);
    if (m) return { name, rest: t.replace(m[0], " ") };
  }
  return { name: null, rest: t };
}

function cleanDescription(t: string): string {
  return t
    .replace(VERBS, " ")
    .replace(/\b(reais|real|conto|contos|centavos|r\$)\b/g, " ")
    .replace(/[.,;!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^((de|do|da|dos|das|no|na|nos|nas|em|com|pro|pra|para|o|a|os|as|um|uma|e)\s+)+/g, "")
    .replace(/(\s+(de|do|da|no|na|em|com|pro|pra|para|o|a|e))+$/g, "")
    .trim();
}

/** Devolve acentos/maiusculas originais: "pao" -> "pão". */
function restoreAccents(desc: string, raw: string): string {
  const map = new Map<string, string>();
  for (const w of raw.split(/[\s.,;!?]+/)) if (w) map.set(strip(w), w.toLowerCase());
  return desc.split(" ").map((w) => map.get(w) ?? w).join(" ");
}

export function parseSingle(raw: string, accountNames: string[] = [], now = new Date(), original = raw): ParsedCommand {
  let t = " " + wordsToDigits(strip(raw)) + " ";
  const type = INCOME.test(t) ? "INCOME" : "EXPENSE";
  const inst = parseInstallments(t); t = inst.rest;
  const date = parseDate(t, now); t = date.rest;
  const amt = parseAmount(t); t = amt.rest;
  const acc = parseAccount(t, accountNames); t = acc.rest;
  const pay = parsePayment(t); t = pay.rest;
  const description = restoreAccents(cleanDescription(t), original);
  const missing: ParsedCommand["missing"] = [];
  if (amt.cents == null || amt.cents <= 0) missing.push("valor");
  if (!description) missing.push("descricao");
  const confidence = 1 - missing.length * 0.4;
  return {
    type, amountCents: amt.cents, description, date: date.date, dateWasSaid: date.said,
    payment: pay.payment, accountName: acc.name, installments: inst.n && inst.n > 1 ? inst.n : null,
    missing, confidence,
  };
}

export function parseVoice(raw: string, accountNames: string[] = [], now = new Date()): VoiceAction {
  const t = strip(raw).trim();
  if (/\b(apaga|apague|desfaz|desfazer|cancela|cancelar|exclui|excluir)\b.*\b(ultimo|ultima|isso)\b/.test(t)) return { kind: "undo" };
  const fix = t.match(/\bcorrig\w*\b.*\b(?:para|pra|por)\s+(.+)$/);
  if (fix) {
    const a = parseAmount(" " + wordsToDigits(fix[1]) + " ");
    if (a.cents) return { kind: "fix_amount", amountCents: a.cents };
  }
  if (/^(quanto|qual|quais|onde|com o que|o que|como|me ajuda|me ajude|estou|to |tô |se eu|e se|consigo|da pra|dá pra|posso comprar|monta|faz um plano)/.test(t) || t.endsWith("?")) return { kind: "query", text: raw };

  // Varios lancamentos: "gasolina 50 e pão 12" — divide quando cada parte tem valor
  const withDigits = wordsToDigits(t);
  const parts = withDigits.split(/\s+(?:e|mais|,)\s+(?=\D*\d)/).filter(Boolean);
  if (parts.length > 1 && parts.every((p) => /\d/.test(p) && !/^\s*\d+\s*centavos/.test(p) && /[a-z]{3,}/.test(p.replace(/\b(reais|real)\b/g, "")))) {
    const shared = parseSingle(withDigits, accountNames, now);
    const items = parts.map((p) => {
      const c = parseSingle(p, accountNames, now, raw);
      if (!c.dateWasSaid && shared.dateWasSaid) { c.date = shared.date; c.dateWasSaid = true; }
      c.payment ??= shared.payment; c.accountName ??= shared.accountName;
      return c;
    });
    return { kind: "create", items };
  }
  return { kind: "create", items: [parseSingle(raw, accountNames, now)] };
}
