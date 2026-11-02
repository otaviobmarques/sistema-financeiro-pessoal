import { after } from "next/server";
import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { saveEncrypted, sha256 } from "@/lib/crypto";
import { processReceipt } from "@/lib/receipts";
import { canUse, getPlans, planOf } from "@/lib/plans";

const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

export async function handleUpload(userId: string, files: File[]) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const PLANS = await getPlans();
  const results: { id?: string; name: string; status: string }[] = [];
  for (const f of files) {
    if (!OK_TYPES.includes(f.type)) { results.push({ name: f.name, status: "formato não suportado" }); continue; }
    if (f.size > 10 * 1024 * 1024) { results.push({ name: f.name, status: "arquivo maior que 10 MB" }); continue; }
    if (!(await canUse(userId, user.plan, "receipts"))) { results.push({ name: f.name, status: `limite de ${planOf(PLANS, user.plan).receipts} leituras/mês do plano ${planOf(PLANS, user.plan).name}` }); continue; }
    const buf = Buffer.from(await f.arrayBuffer());
    const hash = sha256(buf);
    const dup = await db.receipt.findFirst({ where: { userId, fileHash: hash } });
    if (dup) { results.push({ id: dup.id, name: f.name, status: "foto repetida — já está na caixa de entrada" }); continue; }
    const filePath = await saveEncrypted(userId, buf);
    const r = await db.receipt.create({ data: { userId, filePath, mimeType: f.type, fileHash: hash } });
    // Processamento assincrono: a pessoa pode fotografar varios e revisar depois (RF-034)
    after(() => processReceipt(r.id));
    results.push({ id: r.id, name: f.name, status: "na fila" });
  }
  return results;
}

