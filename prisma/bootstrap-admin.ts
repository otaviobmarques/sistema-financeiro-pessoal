// Cria a conta do primeiro administrador durante a publicacao, se ainda nao existir.
// Usa o primeiro e-mail de ADMIN_EMAILS e a senha temporaria de ADMIN_INITIAL_PASSWORD.
// A senha precisa ser trocada no primeiro acesso. Nunca altera uma conta que ja existe (so garante o papel ADMIN).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createDefaultCategories } from "../src/lib/setup-user";

async function main() {
  const email = (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim().toLowerCase();
  const pw = process.env.ADMIN_INITIAL_PASSWORD || "";
  if (!email || !process.env.DATABASE_URL) return console.log("[admin] sem ADMIN_EMAILS ou banco: nada a fazer");
  const db = new PrismaClient();
  try {
    const u = await db.user.findUnique({ where: { email } });
    if (u) {
      if (u.role !== "ADMIN") await db.user.update({ where: { id: u.id }, data: { role: "ADMIN" } });
      return console.log("[admin] conta já existe; senha mantida");
    }
    if (pw.length < 8) return console.log("[admin] ADMIN_INITIAL_PASSWORD ausente ou curta: conta não criada");
    const user = await db.user.create({ data: { name: "Administrador", email, passwordHash: await bcrypt.hash(pw, 12), role: "ADMIN", mustChangePassword: true, onboarded: false } });
    await createDefaultCategories(user.id);
    await db.account.create({ data: { userId: user.id, name: "Carteira", type: "WALLET" } });
    console.log("[admin] conta de administrador criada para", email);
  } finally { await db.$disconnect(); }
}
main().catch((e) => { console.error("[admin] não foi possível criar a conta:", e?.message || e); });
