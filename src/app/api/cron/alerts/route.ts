// Rodada de avisos para todos os usuarios ativos. Chame a cada hora (ex.: Vercel Cron) com o cabecalho
// Authorization: Bearer <CRON_SECRET>. Assim os avisos chegam mesmo com o app fechado.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runAlerts } from "@/lib/alerts";
import { expireSubscriptions } from "@/lib/billing/apply";

let lastRun = 0;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) { if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "não autorizado" }, { status: 401 }); }
  else {
    // Sem CRON_SECRET: aceita so o agendador da Vercel e no maximo uma rodada a cada 30 min (a rota so gera avisos, nao expoe dados)
    if (!(req.headers.get("user-agent") ?? "").startsWith("vercel-cron")) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
    if (Date.now() - lastRun < 30 * 60 * 1000) return NextResponse.json({ skipped: true });
  }
  lastRun = Date.now();
  const expired = await expireSubscriptions();
  const users = await db.user.findMany({ where: { active: true, onboarded: true }, select: { id: true } });
  let created = 0;
  for (const u of users) { try { created += await runAlerts(u.id, { force: true }); } catch (e) { console.error("alerts", u.id, e); } }
  return NextResponse.json({ users: users.length, created, expired });
}
