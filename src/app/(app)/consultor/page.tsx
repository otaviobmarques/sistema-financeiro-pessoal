import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { usage, PLANS } from "@/lib/plans";
import { Chat } from "./chat";

export default async function Consultor() {
  const user = await requireUser();
  const [history, u] = await Promise.all([db.chatMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" }, take: 40 }), usage(user.id)]);
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold">Pergunte ao Sobbra</h1>
      <p className="muted mb-4 text-sm">Os números vêm dos seus lançamentos; a IA só explica. {user.plan === "FREE" && `${Math.max(0, PLANS.FREE.chat - u.chat)} de ${PLANS.FREE.chat} perguntas restantes este mês.`}</p>
      <Chat history={history.map((h) => ({ role: h.role as "user" | "assistant", text: h.content, data: h.data as any }))} />
      <p className="muted mt-4 text-xs">O Sobbra não recomenda produtos de investimento e não substitui um profissional. Em caso de dívidas graves, procure os canais oficiais de renegociação do seu credor.</p>
    </div>
  );
}
