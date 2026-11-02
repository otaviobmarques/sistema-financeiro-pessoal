import { db } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { readEncrypted } from "@/lib/crypto";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  const { id } = await params;
  const r = userId ? await db.receipt.findFirst({ where: { id, userId } }) : null;
  if (!r) return new Response("não encontrado", { status: 404 });
  const buf = await readEncrypted(r.filePath);
  return new Response(new Uint8Array(buf), { headers: { "content-type": r.mimeType, "cache-control": "private, max-age=3600" } });
}
