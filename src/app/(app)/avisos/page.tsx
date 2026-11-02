import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { runAlerts } from "@/lib/alerts";
import { MarkAll, MarkOne } from "./client";

const ICON: Record<string, string> = { conta: "🧾", fatura: "💳", saldo: "⚠️", orcamento: "🎯", padrao: "🔎", resumo: "📊" };

export default async function Avisos() {
  const user = await requireUser();
  await runAlerts(user.id, { force: true });
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 60 });
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-xl font-bold">Avisos</h1><p className="muted text-sm">Contas a vencer, fatura fechando, orçamento e mais. <Link href="/ajustes#avisos" className="text-sobbra">Escolher o que receber</Link></p></div>
        {unread > 0 && <MarkAll />}
      </div>
      {!items.length && <div className="card muted text-center">Nenhum aviso por enquanto. Quando uma conta estiver perto de vencer, ela aparece aqui.</div>}
      <ul className="card divide-y p-0">{items.map((n) => (
        <li key={n.id} className={`flex items-start gap-3 px-4 py-3 ${n.readAt ? "opacity-70" : ""}`} style={{ borderColor: "var(--line)" }}>
          <span className="text-xl" aria-hidden>{ICON[n.kind] ?? "🔔"}</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{!n.readAt && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-sobbra" aria-label="não lido" />}{n.title}</p>
            <p className="muted text-sm">{n.body}</p>
            <p className="muted mt-1 text-xs">{n.createdAt.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <MarkOne id={n.id} href={n.href} read={!!n.readAt} />
        </li>
      ))}</ul>
    </div>
  );
}
