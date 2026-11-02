// Dados de demonstracao: demo@sobbra.app / sobbra123 (e admin@sobbra.app / sobbra123)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createDefaultCategories } from "../src/lib/setup-user";
import { createTransaction } from "../src/lib/finance";

const db = new PrismaClient();

async function main() {
  for (const email of ["demo@sobbra.app", "admin@sobbra.app"]) await db.user.deleteMany({ where: { email } });
  const hash = await bcrypt.hash("sobbra123", 12);
  await db.user.create({ data: { name: "Admin", email: "admin@sobbra.app", passwordHash: hash, onboarded: true, role: "ADMIN" } }).then((u) => createDefaultCategories(u.id).then(() => db.account.create({ data: { userId: u.id, name: "Carteira", type: "WALLET" } })));
  const u = await db.user.create({ data: { name: "Ana Souza", email: "demo@sobbra.app", passwordHash: hash, onboarded: true, monthlyIncome: 420000, goal: "guardar", simpleMode: false } });
  await createDefaultCategories(u.id);
  const nu = await db.account.create({ data: { userId: u.id, name: "Itaú", type: "CHECKING", institution: "Itaú", initialCents: 150000 } });
  const wallet = await db.account.create({ data: { userId: u.id, name: "Carteira", type: "WALLET", color: "#FFB020", initialCents: 8000 } });
  const vr = await db.account.create({ data: { userId: u.id, name: "VR", type: "MEAL", color: "#F97316", initialCents: 0 } });
  const card = await db.account.create({ data: { userId: u.id, name: "Nubank", type: "CREDIT_CARD", color: "#8B5CF6", limitCents: 500000, closingDay: 3, dueDay: 10, lastDigits: "4321" } });
  const cat = async (slug: string) => (await db.category.findUniqueOrThrow({ where: { userId_slug: { userId: u.id, slug } } })).id;

  const now = new Date();
  const d = (monthsAgo: number, day: number) => new Date(now.getFullYear(), now.getMonth() - monthsAgo, day, 12);
  // Recorrencias: salario e aluguel (geram meses futuros como pendentes)
  await createTransaction(u.id, { type: "INCOME", amountCents: 420000, description: "Salário", accountId: nu.id, categoryId: await cat("receita.salario"), date: d(3, 5), recurrence: "monthly" });
  await createTransaction(u.id, { type: "EXPENSE", amountCents: 140000, description: "Aluguel", accountId: nu.id, categoryId: await cat("moradia.aluguel"), date: d(3, 8), recurrence: "monthly" });
  await createTransaction(u.id, { type: "EXPENSE", amountCents: 5590, description: "Netflix", merchant: "Netflix", accountId: card.id, categoryId: await cat("assinaturas.streaming"), date: d(3, 12), recurrence: "monthly" });
  await createTransaction(u.id, { type: "EXPENSE", amountCents: 11990, description: "Smart Fit", merchant: "Smart Fit", accountId: card.id, categoryId: await cat("assinaturas.academia"), date: d(3, 15), recurrence: "monthly" });
  await createTransaction(u.id, { type: "INCOME", amountCents: 80000, description: "VR mensal", accountId: vr.id, categoryId: await cat("receita.outros"), date: d(3, 1), recurrence: "monthly" });
  // Recorrencias geram 12 meses: remove o que passou de hoje+60 dias para manter a demo limpa
  await db.transaction.deleteMany({ where: { userId: u.id, date: { gt: new Date(+now + 60 * 86400000) } } });

  const variable: [string, string, number, string][] = [
    ["iFood", "alimentacao.delivery", 4590, "card"], ["Carrefour", "alimentacao.mercado", 38720, "card"], ["Posto Shell", "transporte.combustivel", 20000, "nu"],
    ["Uber", "transporte.app", 2380, "card"], ["Padaria Pão Quente", "alimentacao.padaria", 1850, "wallet"], ["Drogasil", "saude.farmacia", 6790, "nu"],
    ["Restaurante Sabor", "alimentacao.restaurante", 5400, "vr"], ["iFood", "alimentacao.delivery", 6230, "card"], ["Shopee", "compras.online", 8990, "card"],
    ["Enel", "moradia.contas", 18700, "nu"], ["Vivo", "moradia.internet", 9990, "nu"], ["Cinema", "lazer.passeios", 6400, "card"], ["Petz", "pets.geral", 15900, "card"],
  ];
  const acc: Record<string, string> = { card: card.id, nu: nu.id, wallet: wallet.id, vr: vr.id };
  for (let m = 3; m >= 0; m--) {
    for (let i = 0; i < variable.length; i++) {
      const [desc, slug, cents, a] = variable[i];
      const day = 2 + ((i * 7 + m * 3) % 26);
      const date = d(m, day);
      if (date > now) continue;
      const factor = desc === "iFood" ? 1 + (3 - m) * 0.25 : 0.85 + ((i + m) % 4) * 0.1; // delivery subindo, para o consultor notar
      await createTransaction(u.id, { type: "EXPENSE", amountCents: Math.round(cents * factor), description: desc, merchant: desc, accountId: acc[a], categoryId: await cat(slug), date, origin: i % 3 === 0 ? "VOICE" : i % 3 === 1 ? "RECEIPT" : "MANUAL" });
    }
  }
  await createTransaction(u.id, { type: "EXPENSE", amountCents: 240000, description: "Celular novo", merchant: "Magalu", accountId: card.id, categoryId: await cat("compras.eletronicos"), date: d(1, 20), installments: 10 });
  await createTransaction(u.id, { type: "INCOME", amountCents: 120000, description: "Freela site", accountId: nu.id, categoryId: await cat("receita.freela"), date: d(0, Math.min(now.getDate(), 2)) });
  // Faturas ja vencidas: pagas no vencimento
  const { cardInvoices } = await import("../src/lib/finance");
  const inv = await cardInvoices(u.id, card.id);
  for (const i of inv.invoices.filter((x) => x.due < now && x.total > x.paid))
    await createTransaction(u.id, { type: "TRANSFER", amountCents: i.total - i.paid, description: "Pagamento de fatura", accountId: nu.id, toAccountId: card.id, date: i.due });
  const day = (n: number) => { const x = new Date(now); x.setDate(x.getDate() + n); x.setHours(12, 0, 0, 0); return x; };
  await db.event.createMany({ data: [
    { userId: u.id, title: "Dentista", type: "compromisso", date: day(1), time: "15:00" },
    { userId: u.id, title: "Reunião com cliente do freela", type: "compromisso", date: day(3), time: "10:30" },
    { userId: u.id, title: "IPVA 3ª parcela", type: "conta", date: day(6), amountCents: 41200 },
    { userId: u.id, title: "Revisar gastos da semana", type: "lembrete", date: day(4), time: "20:00" },
  ] });
  console.log("Seed ok: demo@sobbra.app / sobbra123");
}
main().finally(() => db.$disconnect());
