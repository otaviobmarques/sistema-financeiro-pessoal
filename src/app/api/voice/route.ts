// Agente de voz (M17): recebe a transcricao (feita no navegador, pt-BR) e lanca sozinho.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { parseVoice, ParsedCommand } from "@/lib/voice-parser";
import { classify } from "@/lib/classify";
import { createTransaction } from "@/lib/finance";
import { brl } from "@/lib/money";
import { aiEnabled, aiJson } from "@/lib/ai";
import { normalizeMerchant } from "@/lib/normalize";
import { answer } from "@/lib/advisor";
import { parseAgenda } from "@/lib/agenda-parser";

const dayWord = (d: Date) => {
  const t = new Date(); t.setHours(0, 0, 0, 0); const x = new Date(d); x.setHours(0, 0, 0, 0);
  const diff = Math.round((+t - +x) / 86400000);
  return diff === 0 ? "hoje" : diff === 1 ? "ontem" : x.toLocaleDateString("pt-BR");
};

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const { text, pending } = await req.json() as { text: string; pending?: { item: ParsedCommand & { date: string }; ask: string } };
  if (!text?.trim()) return NextResponse.json({ say: "Não ouvi nada. Pode repetir?" });

  // Agenda: "marcar dentista amanhã às 15h"
  const ag = !pending ? parseAgenda(text) : null;
  if (ag) {
    await db.event.create({ data: { userId, title: ag.title, type: ag.type, date: ag.date, time: ag.time, amountCents: ag.amountCents } });
    return NextResponse.json({ say: `Marquei na agenda: ${ag.title}, ${ag.date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}${ag.time ? ` às ${ag.time}` : ""}${ag.amountCents ? `, ${brl(ag.amountCents)}` : ""}.`, changed: true });
  }
  // Recorrente: "aluguel 1.400 todo mês dia 8"
  let recurring = false, recDay: number | null = null;
  let text2 = text;
  if (!pending && /\b(todo m[eê]s|todos os meses|mensalmente|mensal)\b/i.test(text)) {
    recurring = true;
    text2 = text.replace(/\b(todo m[eê]s|todos os meses|mensalmente|mensal)\b/gi, " ").replace(/\bdia (\d{1,2})\b/i, (_, d) => { recDay = Number(d); return " "; });
  }
  const accounts = await db.account.findMany({ where: { userId, archived: false }, orderBy: { createdAt: "asc" } });
  const names = accounts.map((a) => a.name);
  let action = parseVoice(text2, names);

  // Resposta a uma pergunta anterior ("Com o que foi esse gasto de R$ 30?" / "Foi no cartão ou no débito?")
  if (pending) {
    const item = { ...pending.item, date: new Date(pending.item.date) } as ParsedCommand;
    const extra = parseVoice(text, names);
    const e = extra.kind === "create" ? extra.items[0] : null;
    if (pending.ask === "descricao") item.description = e?.description || text.trim();
    if (pending.ask === "valor" && e?.amountCents) item.amountCents = e.amountCents;
    if (pending.ask === "pagamento") { item.payment = e?.payment ?? null; item.accountName = e?.accountName ?? item.accountName; }
    item.missing = item.missing.filter((m) => m !== pending.ask);
    action = { kind: "create", items: [item] };
  }

  if (action.kind === "query") {
    const a = await answer(userId, text);
    return NextResponse.json({ say: a.text, answer: a });
  }
  if (action.kind === "undo" || action.kind === "fix_amount") {
    const last = await db.transaction.findFirst({ where: { userId, origin: "VOICE", deletedAt: null }, orderBy: { createdAt: "desc" } });
    if (!last) return NextResponse.json({ say: "Não encontrei nenhum lançamento por voz para mexer." });
    if (action.kind === "undo") {
      await db.transaction.updateMany({ where: { userId, OR: [{ id: last.id }, ...(last.groupId ? [{ groupId: last.groupId }] : [])] }, data: { deletedAt: new Date() } });
      return NextResponse.json({ say: `Apaguei "${last.description}" de ${brl(last.amountCents)}.`, changed: true });
    }
    await db.transaction.update({ where: { id: last.id }, data: { amountCents: action.amountCents } });
    return NextResponse.json({ say: `Corrigi "${last.description}" para ${brl(action.amountCents)}.`, changed: true });
  }

  const created: { ids: string[]; say: string }[] = [];
  for (let item of action.items) {
    // Baixa confianca: a IA tenta completar (RF-175) antes de perguntar
    if (item.missing.length && aiEnabled() && !pending) {
      try {
        const r = await aiJson<{ amount?: number; description?: string; type?: string }>(userId, "voice",
          'Extraia de um comando de voz financeiro em pt-BR: {"amount": number em reais ou null, "description": string curta ou null, "type": "EXPENSE"|"INCOME"}. Só JSON.', text);
        if (r?.amount && !item.amountCents) item.amountCents = Math.round(r.amount * 100);
        if (r?.description && !item.description) item.description = r.description;
        item.missing = item.missing.filter((m) => (m === "valor" ? !item.amountCents : !item.description));
      } catch {}
    }
    if (item.missing.includes("valor")) return NextResponse.json({ say: `Qual foi o valor${item.description ? ` de ${item.description}` : ""}?`, pending: { item, ask: "valor" } });
    if (item.missing.includes("descricao")) return NextResponse.json({ say: `Com o que foi esse gasto de ${brl(item.amountCents!)}?`, pending: { item, ask: "descricao" } });

    // Conta: citada > pelo meio de pagamento > mais usada (RF-172)
    let account = accounts.find((a) => a.name === item.accountName);
    if (!account && item.payment === "credito") account = accounts.find((a) => a.type === "CREDIT_CARD");
    if (!account && item.payment === "dinheiro") account = accounts.find((a) => a.type === "WALLET");
    if (!account && (item.payment === "debito" || item.payment === "pix")) account = accounts.find((a) => a.type === "CHECKING") ?? accounts.find((a) => a.type !== "CREDIT_CARD");
    if (!account) {
      const most = await db.transaction.groupBy({ by: ["accountId"], where: { userId, type: item.type }, _count: true, orderBy: { _count: { accountId: "desc" } }, take: 1 });
      account = accounts.find((a) => a.id === most[0]?.accountId) ?? accounts.find((a) => a.type === "CHECKING") ?? accounts.find((a) => a.type !== "CREDIT_CARD") ?? accounts[0];
    }
    if (!account) return NextResponse.json({ say: "Antes, cadastre uma conta em Contas e cartões." });
    if (item.installments && account.type !== "CREDIT_CARD" && !item.accountName) {
      const card = accounts.find((a) => a.type === "CREDIT_CARD");
      if (card) account = card;
    }

    const desc = item.description.charAt(0).toUpperCase() + item.description.slice(1);
    const cls = await classify(userId, { text: desc, merchant: desc, kind: item.type });
    const cat = cls.categoryId ? await db.category.findUnique({ where: { id: cls.categoryId }, include: { parent: true } }) : null;
    const ids = await createTransaction(userId, {
      type: item.type, amountCents: item.amountCents!, description: desc, merchant: normalizeMerchant(desc), accountId: account.id,
      categoryId: cls.categoryId, date: recurring && recDay ? (() => { const x = new Date(); x.setHours(12, 0, 0, 0); x.setDate(recDay!); if (x < new Date() && item.type === "EXPENSE") x.setMonth(x.getMonth() + 1); return x; })() : item.date,
      installments: recurring ? null : item.installments, recurrence: recurring ? "monthly" : null, recurrenceMonths: 12, origin: "VOICE", confidence: cls.confidence,
    });
    if (recurring) { created.push({ ids, say: `${desc} de ${brl(item.amountCents!)} todo mês${recDay ? `, dia ${recDay}` : ""}, em ${cat ? `${cat.parent ? cat.parent.name + " > " : ""}${cat.name}` : "Sem categoria"}. Agendei os próximos 12 meses` }); continue; }
    const catName = cat ? `${cat.parent ? cat.parent.name + " > " : ""}${cat.name}` : "Sem categoria";
    const how = account.type === "CREDIT_CARD" ? `na fatura do ${account.name}` : account.type === "WALLET" ? "no dinheiro" : `no ${account.name}`;
    created.push({ ids, say: `${brl(item.amountCents!)} em ${catName}, ${dayWord(item.date)}, ${how}${item.installments ? ` em ${item.installments}x` : ""}` });
  }
  const say = created.length === 1 ? `Pronto! ${created[0].say}.` : `Lancei ${created.length}: ${created.map((c) => c.say).join("; ")}.`;
  return NextResponse.json({ say, ids: created.flatMap((c) => c.ids), changed: true });
}
