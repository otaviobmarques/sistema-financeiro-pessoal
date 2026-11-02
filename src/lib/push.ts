import webpush from "web-push";
import { db } from "./db";

let ready = false;
function setup() {
  if (ready) return true;
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:suporte@sobbra.app", pub, priv);
  return (ready = true);
}
export const pushEnabled = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

export async function sendPush(userId: string, payload: { title: string; body: string; url: string }) {
  if (!setup()) return;
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  for (const s of subs) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 * 12 }); }
    catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {}); }
  }
}
