const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const brl = (cents: number) => fmt.format(cents / 100);

/** Converte "1.234,56", "1234.56", "50" em centavos. */
export function parseMoney(input: string): number | null {
  let s = input.replace(/[R$\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); // "1.000" = mil
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]}/${String(y).slice(2)}`;
};
export const dateBR = (d: Date | string) => new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
