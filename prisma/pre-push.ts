// Antes do "prisma db push": converte colunas que eram do enum Plan para texto, sem perder dados.
// Idempotente: so age se a coluna ainda for do tipo enum.
import { PrismaClient } from "@prisma/client";

async function main() {
  if (!process.env.DATABASE_URL) return;
  const db = new PrismaClient();
  try {
    const cols: { table_name: string; column_name: string }[] = await db.$queryRawUnsafe(
      `select table_name, column_name from information_schema.columns where table_schema = current_schema() and udt_name = 'Plan'`);
    for (const c of cols) {
      await db.$executeRawUnsafe(`ALTER TABLE "${c.table_name}" ALTER COLUMN "${c.column_name}" DROP DEFAULT`);
      await db.$executeRawUnsafe(`ALTER TABLE "${c.table_name}" ALTER COLUMN "${c.column_name}" TYPE TEXT USING "${c.column_name}"::text`);
      if (c.table_name === "User") await db.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "plan" SET DEFAULT 'FREE'`);
      console.log(`[pre-push] ${c.table_name}.${c.column_name} agora é texto`);
    }
    if (cols.length) await db.$executeRawUnsafe(`DROP TYPE IF EXISTS "Plan"`);
  } finally { await db.$disconnect(); }
}
main().catch((e) => { console.error("[pre-push]", e?.message || e); process.exit(1); });
