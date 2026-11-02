"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsRead } from "@/app/actions-f2";

export function MarkAll() {
  const router = useRouter(); const [p, start] = useTransition();
  return <button className="btn-ghost min-h-[40px] text-sm" disabled={p} onClick={() => start(async () => { await markNotificationsRead(); router.refresh(); })}>Marcar todos como lidos</button>;
}
export function MarkOne({ id, href, read }: { id: string; href: string | null; read: boolean }) {
  const router = useRouter(); const [p, start] = useTransition();
  return <button className="btn-ghost min-h-[38px] shrink-0 text-sm" disabled={p} onClick={() => start(async () => { if (!read) await markNotificationsRead([id]); router.push(href ?? "/avisos"); })}>{href ? "Ver" : "Ok"}</button>;
}
