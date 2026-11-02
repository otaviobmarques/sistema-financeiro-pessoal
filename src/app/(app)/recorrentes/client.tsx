"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { stopRecurrence } from "@/app/actions";

export function StopButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [pending, start] = useTransition();
  if (!ask) return <button className="btn-ghost min-h-[38px] text-sm" onClick={() => setAsk(true)}>Parar de repetir</button>;
  return (
    <span className="flex gap-1">
      <button className="btn min-h-[38px] bg-coral text-sm text-white" disabled={pending} onClick={() => start(async () => { await stopRecurrence(groupId); router.refresh(); })}>Confirmar</button>
      <button className="btn-ghost min-h-[38px] text-sm" onClick={() => setAsk(false)}>Cancelar</button>
    </span>
  );
}
