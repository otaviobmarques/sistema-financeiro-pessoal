// Comandos de agenda em portugues: "marcar dentista amanhã às 15h", "lembrar de pagar a escola dia 10 450 reais".
const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const WEEK = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

export type AgendaCommand = { title: string; type: "compromisso" | "lembrete" | "conta"; date: Date; time: string | null; amountCents: number | null };

export function parseAgenda(text: string, now = new Date()): AgendaCommand | null {
  const t = strip(text).trim();
  if (!/^(me\s+)?(marcar|marca|marque|agendar|agenda|agende|lembrar|lembra|lembre)\b/.test(t)) return null;
  const d = new Date(now); d.setHours(12, 0, 0, 0);
  let said = false;
  if (/depois de amanha/.test(t)) { d.setDate(d.getDate() + 2); said = true; }
  else if (/\bamanha\b/.test(t)) { d.setDate(d.getDate() + 1); said = true; }
  const dm = t.match(/\bdia (\d{1,2})\b/);
  if (dm) { d.setDate(Number(dm[1])); const today = new Date(now); today.setHours(0, 0, 0, 0); if (d < today) d.setMonth(d.getMonth() + 1); said = true; }
  const wd = t.match(/\b(domingo|segunda|terca|quarta|quinta|sexta|sabado)\b/);
  if (wd && !said) { const diff = (WEEK.indexOf(wd[1]) - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + diff); }
  const hm = t.match(/\b(?:as|a|para as)\s*(\d{1,2})(?:h|:)?(\d{2})?\s*(?:h|horas)?(?=\s|$)/);
  const time = hm ? `${String(Math.min(23, Number(hm[1]))).padStart(2, "0")}:${hm[2] ?? "00"}` : null;
  const amt = t.match(/\b(\d+(?:[.,]\d{1,2})?)\s*reais\b/) ?? t.match(/\br\$\s*(\d+(?:[.,]\d{1,2})?)/);
  const isLembrete = /^(me\s+)?(lembrar|lembra|lembre)/.test(t);
  const isConta = /\b(pagar|conta|boleto|fatura)\b/.test(t);
  const W = (s: string) => new RegExp(`(^|\\s)${s}(?=\\s|$|[,.!?])`, "gi");
  let title = text
    .replace(/^\s*(me\s+)?(marcar|marca|marque|agendar|agenda|agende|lembrar|lembra|lembre)\s+(de\s+|que\s+)?/i, "")
    .replace(W("(depois de amanhã|depois de amanha|amanhã|amanha|hoje)"), " ")
    .replace(W("(às|as|para as)\\s*\\d{1,2}(h|:)?(\\d{2})?\\s*(h|horas)?"), " ")
    .replace(W("(na |no )?(domingo|segunda|terça|terca|quarta|quinta|sexta|sábado|sabado)(-feira)?"), " ")
    .replace(/\bdia \d{1,2}\b/gi, " ").replace(/(r\$\s*)?\d+(?:[.,]\d{1,2})?\s*reais/gi, " ").replace(/r\$\s*\d+(?:[.,]\d{1,2})?/gi, " ")
    .replace(/\s+/g, " ").trim();
  title = title ? title.charAt(0).toUpperCase() + title.slice(1) : "Compromisso";
  return { title, type: isConta ? "conta" : isLembrete ? "lembrete" : "compromisso", date: d, time, amountCents: amt ? Math.round(Number(amt[1].replace(",", ".")) * 100) : null };
}
