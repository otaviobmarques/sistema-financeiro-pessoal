// Leitura de boletos (RF-190/191): linha digitavel (47 bancario / 48 arrecadacao) ou codigo de barras (44).
// Regras Febraban: DVs por modulo 10/11; vencimento pelo fator (com o reinicio do fator em 22/02/2025).
export type Boleto = {
  kind: "bancario" | "arrecadacao";
  barcode: string; digitableLine: string; amountCents: number | null; dueDate: Date | null;
  bank?: string; segment?: string; valid: boolean; problem?: string;
};

const BANKS: Record<string, string> = { "001": "Banco do Brasil", "033": "Santander", "104": "Caixa", "237": "Bradesco", "341": "Itaú", "260": "Nubank", "077": "Inter", "336": "C6 Bank", "748": "Sicredi", "756": "Sicoob", "212": "Original", "422": "Safra", "290": "PagBank", "323": "Mercado Pago", "380": "PicPay" };
const SEGMENTS: Record<string, string> = { "1": "Prefeitura", "2": "Água e saneamento", "3": "Energia ou gás", "4": "Telefone e internet", "5": "Órgão do governo", "6": "Carnê ou outra empresa", "7": "Multa de trânsito", "9": "Uso do banco" };

export function mod10(num: string) {
  let sum = 0, w = 2;
  for (let i = num.length - 1; i >= 0; i--) { let p = Number(num[i]) * w; if (p > 9) p = Math.floor(p / 10) + (p % 10); sum += p; w = w === 2 ? 1 : 2; }
  const r = sum % 10; return r === 0 ? 0 : 10 - r;
}
/** Modulo 11 do boleto bancario (pesos 2..9; resultado 0, 10 ou 11 vira 1). */
export function mod11Bank(num: string) {
  let sum = 0, w = 2;
  for (let i = num.length - 1; i >= 0; i--) { sum += Number(num[i]) * w; w = w === 9 ? 2 : w + 1; }
  const r = 11 - (sum % 11); return r === 0 || r === 10 || r === 11 ? 1 : r;
}
/** Modulo 11 da arrecadacao (resto 0 ou 1 vira 0; resto 10 vira 1). */
export function mod11Arrec(num: string) {
  let sum = 0, w = 2;
  for (let i = num.length - 1; i >= 0; i--) { sum += Number(num[i]) * w; w = w === 9 ? 2 : w + 1; }
  const r = sum % 11; return r === 0 || r === 1 ? 0 : r === 10 ? 1 : 11 - r;
}

/** Fator de vencimento -> data. Desde 22/02/2025 o fator recomecou em 1000; escolhe a data mais perto de hoje. */
export function dueFromFactor(factor: number, now = new Date()): Date | null {
  if (!factor) return null;
  const day = 86400000;
  const oldBase = Date.UTC(1997, 9, 7), newBase = Date.UTC(2025, 1, 22) - 1000 * day;
  const cands = [oldBase + factor * day, newBase + factor * day].map((t) => new Date(t + 12 * 3600000));
  return cands.sort((a, b) => Math.abs(+a - +now) - Math.abs(+b - +now))[0];
}

function bankFromBarcode(bar: string, now: Date): Omit<Boleto, "digitableLine"> & { digitableLine: string } {
  const dvOk = mod11Bank(bar.slice(0, 4) + bar.slice(5)) === Number(bar[4]);
  const free = bar.slice(19);
  const f1 = bar.slice(0, 4) + free.slice(0, 5), f2 = free.slice(5, 15), f3 = free.slice(15, 25);
  const line = f1 + mod10(f1) + f2 + mod10(f2) + f3 + mod10(f3) + bar[4] + bar.slice(5, 19);
  const amount = Number(bar.slice(9, 19));
  return { kind: "bancario", barcode: bar, digitableLine: line, amountCents: amount || null, dueDate: dueFromFactor(Number(bar.slice(5, 9)), now),
    bank: BANKS[bar.slice(0, 3)] ?? `Banco ${bar.slice(0, 3)}`, valid: dvOk, problem: dvOk ? undefined : "O dígito verificador não confere. Confira os números." };
}

function arrecFromBarcode(bar: string): Boleto {
  const ref = bar[2]; const useMod10 = ref === "6" || ref === "7";
  const body = bar.slice(0, 3) + bar.slice(4);
  const valid = (useMod10 ? mod10(body) : mod11Arrec(body)) === Number(bar[3]);
  const dv = (s: string) => String(useMod10 ? mod10(s) : mod11Arrec(s));
  const parts = [0, 11, 22, 33].map((i) => bar.slice(i, i + 11));
  const amount = ref === "6" || ref === "8" ? Number(bar.slice(4, 15)) : 0; // 7 e 9: valor de referencia, nao em reais
  return { kind: "arrecadacao", barcode: bar, digitableLine: parts.map((p) => p + dv(p)).join(""), amountCents: amount || null, dueDate: null,
    segment: SEGMENTS[bar[1]] ?? "Conta de consumo", valid, problem: valid ? undefined : "O dígito verificador não confere. Confira os números." };
}

export function parseBoleto(input: string, now = new Date()): Boleto | { error: string } {
  const d = input.replace(/\D/g, "");
  if (d.length === 44) return d[0] === "8" ? arrecFromBarcode(d) : bankFromBarcode(d, now);
  if (d.length === 47) {
    const fields = [d.slice(0, 9), d.slice(10, 20), d.slice(21, 31)], dvs = [d[9], d[20], d[31]];
    const fieldsOk = fields.every((f, i) => mod10(f) === Number(dvs[i]));
    const bar = d.slice(0, 4) + d[32] + d.slice(33, 47) + d.slice(4, 9) + d.slice(10, 20) + d.slice(21, 31);
    const b = bankFromBarcode(bar, now);
    return fieldsOk ? b : { ...b, valid: false, problem: "Algum número da linha digitável parece errado. Confira os campos." };
  }
  if (d.length === 48 && d[0] === "8") {
    const blocks = [0, 12, 24, 36].map((i) => d.slice(i, i + 12));
    const b = arrecFromBarcode(blocks.map((x) => x.slice(0, 11)).join(""));
    const useMod10 = d[2] === "6" || d[2] === "7";
    const blocksOk = blocks.every((x) => (useMod10 ? mod10(x.slice(0, 11)) : mod11Arrec(x.slice(0, 11))) === Number(x[11]));
    return blocksOk ? b : { ...b, valid: false, problem: "Algum bloco da linha digitável parece errado. Confira os números." };
  }
  return { error: d.length ? `Encontrei ${d.length} números. Boletos têm 47 ou 48 (linha digitável) ou 44 (código de barras).` : "Cole ou digite a linha digitável do boleto." };
}

/** Linha digitavel no formato impresso, para copiar e conferir. */
export function formatLine(line: string) {
  if (line.length === 47) return `${line.slice(0, 5)}.${line.slice(5, 10)} ${line.slice(10, 15)}.${line.slice(15, 21)} ${line.slice(21, 26)}.${line.slice(26, 32)} ${line[32]} ${line.slice(33)}`;
  if (line.length === 48) return [0, 12, 24, 36].map((i) => `${line.slice(i, i + 11)}-${line[i + 11]}`).join(" ");
  return line;
}
