import webpush from "web-push";
import { db } from "./db";
import { getSecret } from "./secrets";

/** Par de chaves VAPID: das variaveis de ambiente ou gerado uma vez e guardado no banco. */
export async function vapidKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  const pair = await getSecret("VAPID_KEYPAIR", () => JSON.stringify(webpush.generateVAPIDKeys()));
  return JSON.parse(pair) as { publicKey: string; privateKey: string };
}

export async function sendPush(userId: string, payload: { title: string; body: string; url: string }) {
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return;
  const k = await vapidKeys();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:suporte@sobbra.com.br", k.publicKey, k.privateKey);
  for (const s of subs) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 * 12 }); }
    catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {}); }
  }
}
