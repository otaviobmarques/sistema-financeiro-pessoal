// Central de preferencias de avisos (RF-093).
export const ALERT_KINDS = {
  conta: "Contas e boletos a vencer",
  fatura: "Fatura do cartão fechando e vencendo",
  saldo: "Saldo previsto negativo",
  orcamento: "Orçamento chegando a 80% e 100%",
  padrao: "Gasto fora do padrão",
  resumo: "Resumo da semana (segunda-feira)",
} as const;
export type AlertKind = keyof typeof ALERT_KINDS;
export type NotifyPrefs = { kinds: Record<AlertKind, boolean>; push: boolean; quietStart: string; quietEnd: string };

export const DEFAULT_PREFS: NotifyPrefs = { kinds: { conta: true, fatura: true, saldo: true, orcamento: true, padrao: true, resumo: true }, push: true, quietStart: "22:00", quietEnd: "08:00" };

export function readPrefs(raw: unknown): NotifyPrefs {
  const r = (raw ?? {}) as Partial<NotifyPrefs>;
  return { ...DEFAULT_PREFS, ...r, kinds: { ...DEFAULT_PREFS.kinds, ...(r.kinds ?? {}) } };
}

/** Dentro do horario de silencio (ex.: 22:00 a 08:00, atravessando a meia-noite)? */
export function inQuietHours(p: NotifyPrefs, now = new Date()) {
  const m = now.getHours() * 60 + now.getMinutes();
  const [a, b] = [p.quietStart, p.quietEnd].map((s) => { const [h, mi] = s.split(":").map(Number); return h * 60 + mi; });
  return a === b ? false : a < b ? m >= a && m < b : m >= a || m < b;
}
