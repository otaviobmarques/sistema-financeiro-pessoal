// Exportacao completa dos dados pelo proprio usuario (RF-006, LGPD).
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";

export async function GET(req: Request) {
  const userId = await currentUserId();
  if (!userId) return new Response("não autenticado", { status: 401 });
  const format = new URL(req.url).searchParams.get("formato");
  const [user, accounts, categories, transactions, receipts, rules] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true, email: true, plan: true, createdAt: true, monthlyIncome: true, goal: true } }),
    db.account.findMany({ where: { userId } }), db.category.findMany({ where: { userId } }),
    db.transaction.findMany({ where: { userId }, include: { category: true, account: true }, orderBy: { date: "asc" } }),
    db.receipt.findMany({ where: { userId }, select: { id: true, docType: true, status: true, extracted: true, createdAt: true } }),
    db.rule.findMany({ where: { userId } }),
  ]);
  if (format === "csv") {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["data", "tipo", "descricao", "valor", "categoria", "conta", "status", "tags"].join(";"),
      ...transactions.filter((t) => !t.deletedAt).map((t) => [t.date.toISOString().slice(0, 10), t.type, t.description, (t.amountCents / 100).toFixed(2).replace(".", ","), t.category?.name, t.account.name, t.status, t.tags.join(" ")].map(esc).join(";"))];
    return new Response("﻿" + rows.join("\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=sobbra-lancamentos.csv" } });
  }
  return new Response(JSON.stringify({ exportadoEm: new Date(), user, accounts, categories, transactions, receipts, rules }, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": "attachment; filename=sobbra-meus-dados.json" },
  });
}
