import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");
const COOKIE = "sobbra_session";

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try { const { payload } = await jwtVerify(token, secret()); return payload.sub ?? null; } catch { return null; }
}

/** Usuario logado ou redireciona para /entrar. Todo acesso a dados filtra por userId (isolamento por usuario, RNF-02). */
export async function requireUser() {
  const id = await currentUserId();
  const user = id ? await db.user.findUnique({ where: { id } }) : null;
  if (!user) redirect("/entrar");
  return user;
}

export const isAdmin = (email: string) => (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim()).includes(email);
