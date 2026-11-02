// Segredos do sistema: usa a variavel de ambiente quando existe; senao gera uma vez e guarda no banco.
// Assim a primeira publicacao funciona sem ninguem copiar chaves. Para separar as chaves do banco,
// defina AUTH_SECRET, FILE_ENC_KEY e VAPID_* nas variaveis da hospedagem (elas passam a valer).
import { randomBytes } from "node:crypto";
import { db } from "./db";

const cache = new Map<string, string>();

export async function getSecret(name: string, generate: () => string): Promise<string> {
  const env = process.env[name];
  if (env) return env;
  const hit = cache.get(name);
  if (hit) return hit;
  const found = await db.appSecret.findUnique({ where: { name } });
  if (found) { cache.set(name, found.value); return found.value; }
  // createMany + skipDuplicates evita corrida entre duas funcoes iniciando ao mesmo tempo
  await db.appSecret.createMany({ data: [{ name, value: generate() }], skipDuplicates: true });
  const v = (await db.appSecret.findUniqueOrThrow({ where: { name } })).value;
  cache.set(name, v);
  return v;
}

export const authSecret = () => getSecret("AUTH_SECRET", () => randomBytes(32).toString("base64"));
export const fileKey = () => getSecret("FILE_ENC_KEY", () => randomBytes(32).toString("hex"));

/** Quais segredos estao vindo do banco (para o aviso no backoffice). */
export async function generatedSecrets() {
  const names = ["AUTH_SECRET", "FILE_ENC_KEY", "VAPID_PUBLIC_KEY"].filter((n) => !process.env[n]);
  if (!names.length) return [];
  return (await db.appSecret.findMany({ where: { name: { in: names } }, select: { name: true } })).map((s) => s.name);
}
