// Comprovantes criptografados em repouso com AES-256-GCM (RNF-01, RF-037).
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { fileKey } from "./secrets";

const key = async () => Buffer.from(await fileKey(), "hex");
const root = () => path.resolve(process.env.STORAGE_DIR || "storage");

export const sha256 = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");

// Na Vercel (BLOB_READ_WRITE_TOKEN definido) os arquivos vao para o Vercel Blob; localmente, para a pasta storage/.
// Em ambos os casos o conteudo ja sai daqui criptografado: o arquivo guardado e ilegivel sem a FILE_ENC_KEY.
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function saveEncrypted(userId: string, buf: Buffer): Promise<string> {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", await key(), iv);
  const enc = Buffer.concat([c.update(buf), c.final()]);
  const out = Buffer.concat([iv, c.getAuthTag(), enc]);
  if (useBlob()) {
    const { put } = await import("@vercel/blob");
    const r = await put(`comprovantes/${userId}/${Date.now()}-${randomBytes(16).toString("hex")}.bin`, out, { access: "public", contentType: "application/octet-stream", addRandomSuffix: true });
    return r.url;
  }
  const rel = path.join(userId, `${Date.now()}-${randomBytes(6).toString("hex")}.bin`);
  await mkdir(path.join(root(), userId), { recursive: true });
  await writeFile(path.join(root(), rel), out);
  return rel;
}

export async function readEncrypted(rel: string): Promise<Buffer> {
  let data: Buffer;
  if (/^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//i.test(rel)) {
    const r = await fetch(rel); if (!r.ok) throw new Error(`blob ${r.status}`);
    data = Buffer.from(await r.arrayBuffer());
  } else {
    const full = path.join(root(), rel);
    if (!full.startsWith(root())) throw new Error("caminho invalido");
    data = await readFile(full);
  }
  const d = createDecipheriv("aes-256-gcm", await key(), data.subarray(0, 12));
  d.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([d.update(data.subarray(28)), d.final()]);
}
