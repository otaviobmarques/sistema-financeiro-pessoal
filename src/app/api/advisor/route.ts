import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { answer } from "@/lib/advisor";
import { canUse, PLANS } from "@/lib/plans";

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const { question } = await req.json();
  if (!question?.trim()) return NextResponse.json({ error: "pergunta vazia" }, { status: 400 });
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await canUse(userId, user.plan, "chat"))) {
    return NextResponse.json({ answer: { text: `Você usou as ${PLANS[user.plan].chat} perguntas do mês no plano ${PLANS[user.plan].name}. Elas voltam no dia 1º, ou você pode ampliar no plano Pro.`, facts: [] } });
  }
  const a = await answer(userId, question);
  await db.chatMessage.createMany({ data: [{ userId, role: "user", content: question }, { userId, role: "assistant", content: a.text, data: a as any }] });
  return NextResponse.json({ answer: a });
}
