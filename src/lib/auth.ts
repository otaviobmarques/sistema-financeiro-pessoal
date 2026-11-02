import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "./db";

import { authSecret } from "./secrets";

const secret = async () => new TextEncoder().encode(await authSecret());
const COOKIE = "sobbra_session";

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(await secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try { const { payload } = await jwtVerify(token, await secret()); return payload.sub ?? null; } catch { return null; }
}

/** Usuario logado ou redireciona para /entrar. Todo acesso a dados filtra por userId (isolamento por usuario, RNF-02). */
export async function requireUser() {
  const id = await currentUserId();
  const user = id ? await db.user.findUnique({ where: { id } }) : null;
  if (!user || !user.active) redirect("/entrar");
  return user;
}

/** Administrador: papel ADMIN no banco, ou e-mail em ADMIN_EMAILS (usado para criar o primeiro admin). */
export const isAdmin = (u: { email: string; role?: string }) =>
  u.role === "ADMIN" || (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).includes(u.email.toLowerCase());

/** Garante que quem chama e administrador; caso contrario, 404 (nao revela que a area existe). */
export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdmin(user)) notFound();
  return user;
}
