"use client";
import { useActionState } from "react";
import { saveNotifyPrefs } from "@/app/actions-f2";
import { ALERT_KINDS, type NotifyPrefs, type AlertKind } from "@/lib/notify-prefs";
import { PushToggle } from "@/components/PushToggle";

export function AlertPrefs({ prefs }: { prefs: NotifyPrefs }) {
  const [state, action, pending] = useActionState(saveNotifyPrefs, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-1 sm:grid-cols-2">{(Object.keys(ALERT_KINDS) as AlertKind[]).map((k) => (
        <label key={k} className="flex min-h-[44px] items-center gap-3"><input type="checkbox" name={`k_${k}`} defaultChecked={prefs.kinds[k]} className="h-5 w-5" />{ALERT_KINDS[k]}</label>
      ))}</div>
      <label className="flex min-h-[44px] items-center gap-3"><input type="checkbox" name="push" defaultChecked={prefs.push} className="h-5 w-5" /> Mandar também como notificação no celular</label>
      <div className="flex flex-wrap items-center gap-2 text-sm">Horário de silêncio: das <input type="time" name="quietStart" defaultValue={prefs.quietStart} className="input w-28" aria-label="Início do silêncio" /> às <input type="time" name="quietEnd" defaultValue={prefs.quietEnd} className="input w-28" aria-label="Fim do silêncio" /></div>
      <PushToggle />
      {state?.ok && <p className="text-sm text-sobbra">{state.ok}</p>}
      <button className="btn-dark" disabled={pending}>Salvar avisos</button>
    </form>
  );
}
