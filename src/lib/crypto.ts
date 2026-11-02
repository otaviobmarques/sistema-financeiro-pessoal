// Comprovantes criptografados em repouso com AES-256-GCM (RNF-01, RF-037).
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const key = () => Buffer.from(process.env.FILE_ENC_KEY || "", "hex");
const root = () => path.resolve(process.env.STORAGE_DIR || "storage");

export const sha256 = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");

export async function saveEncrypted(userId: string, buf: Buffer): Promise<string> {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(buf), c.final()]);
  const out = Buffer.concat([iv, c.getAuthTag(), enc]);
  const rel = path.join(userId, `${Date.now()}-${randomBytes(6).toString("hex")}.bin`);
  await mkdir(path.join(root(), userId), { recursive: true });
  await writeFile(path.join(root(), rel), out);
  return rel;
}

export async function readEncrypted(rel: string): Promise<Buffer> {
  const full = path.join(root(), rel);
  if (!full.startsWith(root())) throw new Error("caminho invalido");
  const data = await readFile(full);
  const d = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
  d.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([d.update(data.subarray(28)), d.final()]);
}
