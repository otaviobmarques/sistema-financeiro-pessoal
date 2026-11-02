"use client";
import { useActionState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createEvent, deleteEvent, payAgendaItem } from "@/app/actions";

export function EventForm({ date }: { date: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createEvent, undefined);
  useEffect(() => { if (state?.ok) router.replace(`/agenda?mes=${date.slice(0, 7)}&dia=${date}`); }, [state, router, date]);
  return (
    <form action={action} className="card fill-in grid gap-3 sm:grid-cols-4">
      <h2 className="font-semibold sm:col-span-4">Novo na agenda</h2>
      <div className="sm:col-span-4"><label className="label" htmlFor="title">O que é?</label><input id="title" name="title" required autoFocus className="input" placeholder="Ex.: Dentista, conta de água, ligar para o banco" /></div>
      <div><label className="label" htmlFor="type">Tipo</label><select id="type" name="type" className="input"><option value="compromisso">Compromisso</option><option value="lembrete">Lembrete</option><option value="conta">Conta a pagar</option></select></div>
      <div><label className="label" htmlFor="date">Dia</label><input id="date" name="date" type="date" defaultValue={date} className="input" /></div>
      <div><label className="label" htmlFor="time">Horário (opcional)</label><input id="time" name="time" type="time" className="input" /></div>
      <div><label className="label" htmlFor="amount">Valor (contas)</label><input id="amount" name="amount" inputMode="decimal" placeholder="0,00" className="input" /></div>
      {state?.error && <p className="text-sm text-coral sm:col-span-4">{state.error}</p>}
      <div className="flex gap-2 sm:col-span-4"><button className="btn-primary" disabled={pending}>Salvar</button><Link href={`/agenda?mes=${date.slice(0, 7)}&dia=${date}`} className="btn-ghost">Cancelar</Link></div>
    </form>
  );
}

export function ItemActions({ eventId, txId, canPay, canDelete }: { eventId?: string; txId?: string; canPay: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-1">
      {canPay && <button className="btn-ghost min-h-[38px] text-sm" disabled={pending} onClick={() => start(async () => { await payAgendaItem({ eventId, txId }); router.refresh(); })}>Paguei</button>}
      {canDelete && eventId && <button className="btn-ghost min-h-[38px] text-sm" disabled={pending} onClick={() => start(async () => { await deleteEvent(eventId); router.refresh(); })}>Remover</button>}
    </div>
  );
}
