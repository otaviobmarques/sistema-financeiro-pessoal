import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { sendPush } from "@/lib/push";

export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
}

/** Salva (POST) ou remove (DELETE) a assinatura push deste aparelho; ?teste=1 envia um aviso de teste. */
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const sub = await req.json();
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return NextResponse.json({ error: "assinatura inválida" }, { status: 400 });
  await db.pushSubscription.upsert({ where: { endpoint: sub.endpoint }, update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
  if (new URL(req.url).searchParams.get("teste")) await sendPush(userId, { title: "Avisos ligados ✅", body: "É assim que o Sobbra vai te lembrar das contas.", url: "/avisos" });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const { endpoint } = await req.json();
  await db.pushSubscription.deleteMany({ where: { userId, endpoint } });
  return NextResponse.json({ ok: true });
}
